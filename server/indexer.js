// Such-Index für Dateien (PDF, Word, Excel, PowerPoint, Text, später auch Bilder).
//
// Für jede Datei, die in den Notizen eines Benutzers vorkommt, wird im
// Hintergrund der Text ausgelesen und unter data/users/<name>/index/<datei>.json
// abgelegt. Hochgeladene Dateien ändern sich nie (jede hat einen eigenen,
// zufälligen Namen) - der Text muss deshalb pro Datei nur ein einziges Mal
// ermittelt werden. Die Suche (GET /api/search) liest dann nur noch diese
// kleinen Text-Dateien.
//
// Benötigte Programme (alle optional - fehlt eines, wird die jeweilige
// Dateiart einfach übersprungen und später automatisch nachgeholt):
//   - pdftotext (Paket poppler-utils): Text aus PDF-Dateien
//   - LibreOffice (soffice): Word/Excel/PowerPoint -> PDF, danach pdftotext
//   - tesseract (Pakete tesseract-ocr, tesseract-ocr-deu): Text in Bildern und in
//     gescannten PDFs (Texterkennung/OCR)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PDF_EXT = new Set(['.pdf']);
const OFFICE_EXT = new Set(['.doc', '.docx', '.odt', '.rtf', '.xls', '.xlsx', '.ods', '.ppt', '.pptx', '.odp']);
const TEXT_EXT = new Set(['.txt', '.md', '.csv']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
const MIN_IMAGE_BYTES = 8 * 1024; // winzige Bilder (Symbole) enthalten keinen lesbaren Text
const MAX_OCR_PAGES = 30;
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const RETRY_MISSING_TOOL_MS = 10 * 60 * 1000;
const RETRY_FAILED_MS = 24 * 60 * 60 * 1000;

// Kleinbuchstaben ohne Akzente (ä -> a), dabei bleibt die Länge des Textes
// gleich - so passen Fundstellen im umgewandelten Text zum Originaltext
// (wichtig für die Ausschnitte in den Suchergebnissen).
function foldAligned(s) {
  let out = '';
  for (const ch of s) {
    let f = ch;
    if (ch.length === 1) {
      const decomposed = ch.normalize('NFD');
      f = decomposed[0] || ch;
      const lower = f.toLowerCase();
      f = lower.length === 1 ? lower : f;
    }
    out += f;
  }
  return out;
}

function runCapture(bin, args, { timeoutMs, maxBytes, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: env || process.env });
    const chunks = [];
    let size = 0;
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Zeitüberschreitung'));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      size += d.length;
      if (size > maxBytes) {
        child.kill('SIGKILL');
        return;
      }
      chunks.push(d);
    });
    child.stderr.on('data', (d) => { stderr += d.toString().slice(0, 1000); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(`${bin} endete mit Code ${code}: ${stderr.trim()}`));
    });
  });
}

// Prüft, ob ein Programm vorhanden ist (nur "nicht gefunden" zählt als fehlend).
function toolExists(bin, args) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const child = spawn(bin, args, { stdio: 'ignore' });
      child.on('error', () => finish(false));
      child.on('close', () => finish(true));
      setTimeout(() => { child.kill('SIGKILL'); finish(true); }, 15000);
    } catch (e) {
      finish(false);
    }
  });
}

function createIndexer({ usersDataDir, userStateFile, userFilesDir, userIndexDir, officeToPdf, officeAvailable }) {
  const queue = [];
  const queued = new Set();
  const cache = new Map(); // Index-Datei -> { mtimeMs, pages, folded }
  const refsCache = new Map(); // Benutzer -> { mtimeMs, refs }
  const scanTimers = new Map();
  let running = false;
  let toolCache = null;

  // Sprachpakete von tesseract: bevorzugt Deutsch + Englisch.
  async function findOcrLang() {
    try {
      const out = await runCapture('tesseract', ['--list-langs'], { timeoutMs: 15000, maxBytes: 100000 });
      const langs = out.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
      const wanted = ['deu', 'eng'].filter((l) => langs.includes(l));
      if (wanted.length) return wanted.join('+');
      const other = langs.find((l) => l !== 'osd');
      return other || null;
    } catch (e) {
      return null;
    }
  }

  async function tools() {
    if (toolCache && Date.now() - toolCache.at < 30000) return toolCache.value;
    const value = {
      pdftotext: await toolExists('pdftotext', ['-v']),
      pdftoppm: await toolExists('pdftoppm', ['-v']),
      office: await officeAvailable(),
      ocrLang: await findOcrLang(),
    };
    value.ocr = !!value.ocrLang;
    toolCache = { at: Date.now(), value };
    return value;
  }

  function kindOf(ext) {
    if (PDF_EXT.has(ext)) return 'pdf';
    if (OFFICE_EXT.has(ext)) return 'office';
    if (TEXT_EXT.has(ext)) return 'text';
    if (IMAGE_EXT.has(ext)) return 'image';
    return null;
  }

  function indexFile(username, basename) {
    return path.join(userIndexDir(username), `${basename}.json`);
  }

  // Alle Dateien, die in den Notizen vorkommen (nicht im Papierkorb).
  function collectRefs(state) {
    const refs = [];
    const urlRe = /^\/files\/([A-Za-z0-9._-]+)$/;
    for (const note of (state && state.notes) || []) {
      if (note.trashedAt) continue;
      const add = (url, fileName, holder) => {
        const m = typeof url === 'string' ? url.match(urlRe) : null;
        if (!m) return;
        refs.push({ basename: m[1], fileName: fileName || m[1], noteId: note.id, ...holder });
      };
      for (const o of note.objects || []) {
        if ((o.type === 'pdf' && o.fileData) || o.type === 'file') {
          add(o.fileData, o.fileName, { objId: o.id, kind: o.type });
        } else if (o.type === 'image') {
          add(o.src, o.fileName || 'Bild', { objId: o.id, kind: 'image' });
        }
        if (o.type === 'text' && typeof o.html === 'string') {
          for (const m of o.html.matchAll(/data-file-data="(\/files\/[A-Za-z0-9._-]+)"[\s\S]*?inline-pdf-chip-name">([^<]*)</g)) {
            add(m[1], m[2], { objId: o.id, kind: 'pdf' });
          }
          for (const m of o.html.matchAll(/<img[^>]+src="(\/files\/[A-Za-z0-9._-]+)"/g)) {
            add(m[1], 'Bild', { objId: o.id, kind: 'image' });
          }
        }
      }
      for (const e of note.entries || []) {
        for (const a of e.attachments || []) {
          add(a.url, a.name, { entryId: e.id, kind: a.type === 'image' ? 'image' : 'file' });
        }
      }
    }
    return refs;
  }

  function refsFor(username) {
    const file = userStateFile(username);
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (e) {
      return [];
    }
    const cached = refsCache.get(username);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.refs;
    let refs = [];
    try {
      refs = collectRefs(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (e) {
      refs = [];
    }
    refsCache.set(username, { mtimeMs: stat.mtimeMs, refs });
    return refs;
  }

  function readIndex(username, basename) {
    const file = indexFile(username, basename);
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (e) {
      return null;
    }
    const cached = cache.get(file);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;
    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed.pages)) parsed.folded = parsed.pages.map(foldAligned);
    } catch (e) {
      parsed = null;
    }
    cache.set(file, { mtimeMs: stat.mtimeMs, data: parsed });
    return parsed;
  }

  function needsIndexing(username, basename) {
    const ext = path.extname(basename).toLowerCase();
    if (!kindOf(ext)) return false;
    const idx = readIndex(username, basename);
    if (!idx) return true;
    if (idx.error && idx.retryAfter && Date.now() > idx.retryAfter) return true;
    return false;
  }

  function enqueue(username, basename) {
    const key = `${username}/${basename}`;
    if (queued.has(key)) return;
    queued.add(key);
    queue.push({ username, basename, key });
    kick();
  }

  async function kick() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const job = queue.shift();
        try {
          await processJob(job);
        } catch (err) {
          console.error('Indexierung fehlgeschlagen:', job.key, err.message);
        } finally {
          queued.delete(job.key);
        }
      }
    } finally {
      running = false;
    }
  }

  function writeIndex(username, basename, data) {
    const dir = userIndexDir(username);
    fs.mkdirSync(dir, { recursive: true });
    const file = indexFile(username, basename);
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }

  async function pdfPages(pdfPath) {
    const out = await runCapture('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], { timeoutMs: 120000, maxBytes: 50 * 1024 * 1024 });
    const pages = out.split('\f');
    if (pages.length && !pages[pages.length - 1].trim()) pages.pop();
    return pages;
  }

  async function ocrImage(imagePath, lang) {
    const env = { ...process.env, OMP_THREAD_LIMIT: '1' };
    return runCapture('tesseract', [imagePath, 'stdout', '-l', lang, '--psm', '3'], { timeoutMs: 240000, maxBytes: 5 * 1024 * 1024, env });
  }

  // Gescannte PDFs haben keinen Text: Seiten als Bilder ausgeben und per OCR lesen.
  async function ocrPdfPages(pdfPath, pageCount, lang) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krisnote-ocr-'));
    try {
      const last = Math.min(pageCount, MAX_OCR_PAGES);
      await runCapture('pdftoppm', ['-r', '150', '-png', '-f', '1', '-l', String(last), pdfPath, path.join(tmpDir, 'seite')], { timeoutMs: 240000, maxBytes: 1024 });
      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.png')).sort();
      const pages = [];
      for (const f of files) pages.push(await ocrImage(path.join(tmpDir, f), lang));
      return pages;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Ist (fast) kein Text vorhanden, handelt es sich vermutlich um einen Scan.
  function looksScanned(pages) {
    if (!pages.length) return true;
    const chars = pages.reduce((n, p) => n + p.replace(/\s+/g, '').length, 0);
    return chars < 15 * pages.length;
  }

  async function processJob({ username, basename }) {
    const ext = path.extname(basename).toLowerCase();
    const kind = kindOf(ext);
    if (!kind) return;
    const filePath = path.join(userFilesDir(username), basename);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      return; // Datei gibt es (noch) nicht
    }
    const now = Date.now();
    if (stat.size > MAX_FILE_BYTES) {
      writeIndex(username, basename, { v: 1, kind, error: 'too-large', retryAfter: now + 365 * 24 * 3600 * 1000 });
      return;
    }
    const available = await tools();
    try {
      let pages;
      if (kind === 'text') {
        const buf = fs.readFileSync(filePath).subarray(0, MAX_TEXT_BYTES);
        pages = [buf.toString('utf8')];
      } else if (kind === 'image') {
        if (stat.size < MIN_IMAGE_BYTES) {
          writeIndex(username, basename, { v: 1, kind, pages: [''], extractedAt: now });
          return;
        }
        if (!available.ocr) {
          writeIndex(username, basename, { v: 1, kind, error: 'tool-missing', tool: 'tesseract', retryAfter: now + RETRY_MISSING_TOOL_MS });
          return;
        }
        pages = [await ocrImage(filePath, available.ocrLang)];
      } else if (kind === 'pdf') {
        if (!available.pdftotext) {
          writeIndex(username, basename, { v: 1, kind, error: 'tool-missing', tool: 'pdftotext', retryAfter: now + RETRY_MISSING_TOOL_MS });
          return;
        }
        pages = await pdfPages(filePath);
        if (looksScanned(pages) && available.ocr && available.pdftoppm) {
          const ocrPages = await ocrPdfPages(filePath, Math.max(pages.length, 1), available.ocrLang);
          if (ocrPages.length) pages = ocrPages;
        }
      } else {
        if (!available.pdftotext || !available.office) {
          writeIndex(username, basename, { v: 1, kind, error: 'tool-missing', tool: available.office ? 'pdftotext' : 'libreoffice', retryAfter: now + RETRY_MISSING_TOOL_MS });
          return;
        }
        // Es wird nur eine Kopie umgewandelt; die Datei selbst bleibt unangetastet.
        const pdf = await officeToPdf(fs.readFileSync(filePath), ext);
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krisnote-index-'));
        try {
          const tmpPdf = path.join(tmpDir, 'dokument.pdf');
          fs.writeFileSync(tmpPdf, pdf);
          pages = await pdfPages(tmpPdf);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      }
      writeIndex(username, basename, { v: 1, kind, pages, extractedAt: now });
    } catch (err) {
      console.error('Text konnte nicht gelesen werden:', basename, err.message);
      writeIndex(username, basename, { v: 1, kind, error: 'failed', retryAfter: now + RETRY_FAILED_MS });
    }
  }

  // Prüft, welche Dateien eines Benutzers noch keinen Index haben, und
  // reiht sie ein. Gibt die Zahl der noch offenen Dateien zurück.
  function scanUser(username) {
    let pending = 0;
    const seen = new Set();
    for (const ref of refsFor(username)) {
      if (seen.has(ref.basename)) continue;
      seen.add(ref.basename);
      if (needsIndexing(username, ref.basename)) {
        pending++;
        enqueue(username, ref.basename);
      }
    }
    return pending;
  }

  function pendingCount(username) {
    let pending = 0;
    const seen = new Set();
    for (const ref of refsFor(username)) {
      if (seen.has(ref.basename)) continue;
      seen.add(ref.basename);
      const idx = readIndex(username, ref.basename);
      const ext = path.extname(ref.basename).toLowerCase();
      if (kindOf(ext) && (!idx || queued.has(`${username}/${ref.basename}`))) pending++;
    }
    return pending;
  }

  // Nach dem Speichern der Notizen kurz warten (der Benutzer arbeitet oft
  // gerade weiter) und dann nach neuen Dateien suchen.
  function onStateSaved(username) {
    clearTimeout(scanTimers.get(username));
    scanTimers.set(username, setTimeout(() => {
      scanTimers.delete(username);
      refsCache.delete(username);
      scanUser(username);
    }, 8000));
  }

  function scanAllUsers() {
    let names = [];
    try {
      names = fs.readdirSync(usersDataDir);
    } catch (e) {
      return;
    }
    for (const name of names) scanUser(name);
  }

  function search(username, words) {
    const hits = [];
    if (!words.length) return hits;
    for (const ref of refsFor(username)) {
      const idx = readIndex(username, ref.basename);
      if (!idx || !idx.folded) continue;
      const matched = new Set();
      let bestPage = -1;
      let bestCount = 0;
      let bestPos = 0;
      idx.folded.forEach((text, p) => {
        let count = 0;
        let firstPos = -1;
        words.forEach((w, i) => {
          const pos = text.indexOf(w);
          if (pos !== -1) {
            matched.add(i);
            count++;
            if (firstPos === -1 || pos < firstPos) firstPos = pos;
          }
        });
        if (count > bestCount) {
          bestCount = count;
          bestPage = p;
          bestPos = firstPos;
        }
      });
      if (bestPage === -1) continue;
      const original = idx.pages[bestPage] || '';
      const from = Math.max(0, bestPos - 60);
      const snippet = `${from > 0 ? '... ' : ''}${original.slice(from, bestPos + 120).replace(/\s+/g, ' ').trim()}${bestPos + 120 < original.length ? ' ...' : ''}`;
      hits.push({
        noteId: ref.noteId,
        kind: ref.kind,
        objId: ref.objId || null,
        entryId: ref.entryId || null,
        fileName: ref.fileName,
        page: idx.pages.length > 1 && idx.kind !== 'text' && idx.kind !== 'image' ? bestPage + 1 : null,
        matched: [...matched],
        snippet,
      });
      if (hits.length >= 300) break;
    }
    return hits;
  }

  async function status(username) {
    return { tools: await tools(), pending: pendingCount(username) };
  }

  return { onStateSaved, scanUser, scanAllUsers, search, status, foldAligned };
}

module.exports = { createIndexer, foldAligned };
