'use strict';
const $ = (sel) => document.querySelector(sel);
const main = $('#main');
const crumbs = $('#crumbs');
const dlg = $('#dlg');

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Fehler ' + res.status);
  return data;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nameOf = (p) => p.name || p.code;
const pathText = (path) => path.map(nameOf).join(' › ') || 'Oberste Ebene';
const ICON = { place: '🗄️', box: '📦', article: '🔹' };
const KIND_LABEL = { place: 'Fester Lagerplatz', box: 'Variabler Lagerplatz (Box)' };
const MOVE_LABEL = { put: 'Eingelagert', move: 'Umgelagert', remove: 'Ausgebucht' };
const fmtTime = (ts) => new Date(ts.replace(' ', 'T') + 'Z').toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' });
const showError = (ex) => { main.innerHTML = `<div class="toast">${esc(ex.message)}</div><a href="#/">Zum Start</a>`; };

// ---- Fotos ----------------------------------------------------------------
// entity: 'places' | 'articles'
const photoUrl = (entity, it, size) => `/api/${entity}/${it.id}/photo?size=${size}&v=${it.photo_v}`;
const thumbHtml = (entity, it, icon) => it.has_photo
  ? `<img class="thumb" alt="" src="${photoUrl(entity, it, 'thumb')}">`
  : `<span class="thumb ph">${icon}</span>`;
const placeThumb = (p) => thumbHtml('places', p, ICON[p.kind]);
const articleThumb = (a) => thumbHtml('articles', a, ICON.article);

// Verkleinert ein Foto im Browser (Handyfotos sind sonst mehrere MB groß).
async function resizeJpeg(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
async function processPhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return { full: await resizeJpeg(bitmap, 900, 0.8), thumb: await resizeJpeg(bitmap, 160, 0.7) };
}

// Foto-Feld für Dialoge: html() liefert das Feld, bind() verdrahtet es, apply() speichert nach dem Anlegen.
function photoControl(entity, current) {
  let op = null; // null = unverändert, 'remove' = löschen, {full, thumb} = neues Foto
  return {
    html: () => `<label>Foto</label>
      <div class="photobox"><img id="pv" alt="" hidden>
        <button type="button" id="pcam">📷 Foto aufnehmen</button>
        <button type="button" id="pgal">🖼️ Aus Galerie</button>
        <button type="button" id="prm" hidden>Foto entfernen</button></div>
      <!-- capture="environment" startet direkt die hintere Kamera; ohne capture fragt das Handy nach der Quelle -->
      <input type="file" id="pfcam" accept="image/*" capture="environment" hidden>
      <input type="file" id="pfgal" accept="image/*" hidden>`,
    bind(err) {
      const pv = $('#pv'), prm = $('#prm');
      const show = (src) => { pv.hidden = !src; if (src) pv.src = src; prm.hidden = !src; };
      show(current && current.has_photo ? photoUrl(entity, current, 'thumb') : null);
      const take = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try { op = await processPhoto(file); show(op.thumb); } catch { err('Das Foto konnte nicht gelesen werden.'); }
        e.target.value = ''; // dasselbe Foto-Ziel darf erneut gewählt werden
      };
      $('#pcam').onclick = () => $('#pfcam').click();
      $('#pgal').onclick = () => $('#pfgal').click();
      $('#pfcam').onchange = take;
      $('#pfgal').onchange = take;
      prm.onclick = () => { op = 'remove'; show(null); };
    },
    async apply(id) {
      if (op === 'remove') { if (current && current.has_photo) await api('DELETE', `/api/${entity}/${id}/photo`); }
      else if (op) await api('PUT', `/api/${entity}/${id}/photo`, op);
    },
  };
}

// ---- Unteransicht im Dialog (Auswahllisten) ---------------------------------
// Blendet den aktuellen Dialoginhalt aus (Handler bleiben erhalten) und zeigt render(box, done).
function subview(render) {
  return new Promise((resolve) => {
    const hidden = [...dlg.children].filter((e) => !e.hidden);
    hidden.forEach((e) => { e.hidden = true; });
    const box = document.createElement('div');
    dlg.appendChild(box);
    render(box, (val) => { box.remove(); hidden.forEach((e) => { e.hidden = false; }); resolve(val); });
  });
}

// Kleine Texteingabe (z. B. Gruppenname). Funktioniert mit und ohne bereits offenen Dialog.
// Ergebnis: eingegebener Text oder undefined bei Abbruch.
function askText(title, value) {
  const wasOpen = dlg.open;
  if (!wasOpen) { dlg.innerHTML = ''; dlg.showModal(); }
  return subview((box, done) => {
    box.innerHTML = `<form id="askf"><h3>${esc(title)}</h3>
      <input type="text" id="askv" maxlength="40" value="${esc(value || '')}" autocomplete="off">
      <div class="bar"><button class="primary" type="submit">OK</button><button type="button" id="askno">Abbrechen</button></div></form>`;
    box.querySelector('#askf').onsubmit = (e) => { e.preventDefault(); done(box.querySelector('#askv').value); };
    box.querySelector('#askno').onclick = () => done(undefined);
    box.querySelector('#askv').focus();
  }).then((v) => { if (!wasOpen) dlg.close(); return v; });
}

// Lagerplatz auswählen. movingId: dieser Platz wird verschoben (er selbst und sein Inhalt sind gesperrt).
// onlyFixed: nur feste Lagerplätze (ein fester Platz liegt nie in einer Box).
// allowRoot: "oberste Ebene" ist erlaubt. Ergebnis: {id, kind, path} oder undefined.
function pickPlace({ movingId, startId, onlyFixed, allowRoot }) {
  return subview((box, done) => {
    async function browse(id) {
      const data = await api('GET', '/api/places' + (id ? '?parent=' + id : ''));
      const blocked = (movingId != null && data.path.some((p) => p.id === movingId))
        || (onlyFixed && data.place && data.place.kind === 'box');
      const list = data.children.filter((c) => c.id !== movingId && !(onlyFixed && c.kind === 'box'));
      const canHere = !blocked && (id || allowRoot);
      box.innerHTML = `<h3>Lagerplatz wählen</h3>
        <div class="where">📍 ${esc(pathText(data.path))}</div>
        <div class="found" id="list">${blocked ? '<div class="empty">Hier nicht möglich.</div>' :
          list.map((c) => `<div class="card"><a class="row" href="#" data-id="${c.id}">${placeThumb(c)}
            <span class="name">${esc(nameOf(c))}${c.name ? `<span class="sub">${esc(c.code)}</span>` : ''}</span>
            ${c.child_count ? `<span class="badge">${c.child_count}</span>` : ''}</a></div>`).join('') ||
          '<div class="empty">Keine weiteren Lagerplätze hier.</div>'}</div>
        <div class="bar">
          ${canHere ? `<button class="primary" id="here">${id ? 'Hier ablegen' : 'Oberste Ebene'}</button>` : ''}
          ${id ? '<button id="up">Ebene höher</button>' : ''}
          <button id="no">Abbrechen</button></div>`;
      box.querySelectorAll('#list a').forEach((a) => {
        a.onclick = (e) => { e.preventDefault(); browse(Number(a.dataset.id)); };
      });
      const here = box.querySelector('#here');
      if (here) here.onclick = () => done({ id: id || null, kind: data.place ? data.place.kind : null, path: data.path });
      const up = box.querySelector('#up');
      if (up) up.onclick = () => browse(data.path.length > 1 ? data.path[data.path.length - 2].id : null);
      box.querySelector('#no').onclick = () => done(undefined);
    }
    browse(startId || null).catch(() => done(undefined));
  });
}

// Artikel auswählen (mit Suche) oder direkt einen neuen anlegen. Ergebnis: Artikel oder undefined.
function pickArticle() {
  return subview((box, done) => {
    let timer;
    box.innerHTML = `<h3>Artikel wählen</h3>
      <input type="text" id="aq" placeholder="Name oder Nummer suchen…" autocomplete="off">
      <div class="found" id="alist"></div>
      <div class="bar"><button id="anew">+ Neuer Artikel</button><button id="no">Abbrechen</button></div>
      <div id="newform" hidden>
        <label>Name des neuen Artikels</label><input type="text" id="nn" maxlength="200">
        <label>Einheit</label><input type="text" id="nu" maxlength="12" value="Stk">
        <div class="err" id="nerr"></div>
        <div class="bar"><button class="primary" id="ncreate">Anlegen und wählen</button></div>
      </div>`;
    const list = box.querySelector('#alist');
    let items = [];
    async function load() {
      items = await api('GET', '/api/articles?q=' + encodeURIComponent(box.querySelector('#aq').value));
      list.innerHTML = items.map((a, i) => `<div class="card"><a class="row" href="#" data-i="${i}">${articleThumb(a)}
        <span class="name">${esc(a.name)}<span class="sub">${esc(a.code)}</span></span>
        <span class="qty">${a.total} ${esc(a.unit)}</span></a></div>`).join('') || '<div class="empty">Kein Artikel gefunden.</div>';
      list.querySelectorAll('a').forEach((a) => { a.onclick = (e) => { e.preventDefault(); done(items[Number(a.dataset.i)]); }; });
    }
    box.querySelector('#aq').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 200); };
    box.querySelector('#anew').onclick = () => {
      const f = box.querySelector('#newform');
      f.hidden = !f.hidden;
      box.querySelector('#nn').value = box.querySelector('#aq').value;
      box.querySelector('#nn').focus();
    };
    box.querySelector('#ncreate').onclick = async () => {
      try {
        done(await api('POST', '/api/articles', { name: box.querySelector('#nn').value, unit: box.querySelector('#nu').value }));
      } catch (ex) { box.querySelector('#nerr').textContent = ex.message; }
    };
    box.querySelector('#no').onclick = () => done(undefined);
    load();
  });
}

// ---- Navigation -------------------------------------------------------------
function renderCrumbs(path, last) {
  const parts = ['<a href="#/">Start</a>'];
  path.forEach((p) => parts.push(`<a href="#/p/${p.id}">${esc(nameOf(p))}</a>`));
  if (last) parts.push(esc(last));
  crumbs.innerHTML = parts.join('<span>›</span>');
}
function setTab(name) {
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === name));
}

// ---- Ansicht: Lagerplatz (Inhalt) ---------------------------------------------
async function showPlace(id) {
  setTab('places');
  const data = await api('GET', '/api/places' + (id ? '?parent=' + id : ''));
  const place = data.place;
  renderCrumbs(data.path.slice(0, -1), place ? nameOf(place) : '');
  let html = '';
  if (place) {
    html += `${place.has_photo ? `<img class="photo" alt="" src="${photoUrl('places', place, 'full')}">` : ''}
      <h2>${ICON[place.kind]} ${esc(nameOf(place))}</h2>
      <div class="where">${KIND_LABEL[place.kind]} · Nr. <span class="code">${esc(place.code)}</span></div>
      ${place.notes ? `<p>${esc(place.notes)}</p>` : ''}
      <div class="chips"><button data-act="edit">Bearbeiten / Verschieben</button>
        <button data-act="label">🏷️ Etikett</button>
        ${data.children.length ? '<button data-act="label-deep">🏷️ + Unterplätze</button>' : ''}</div>`;
  } else {
    html += '<h2>Alle Lagerplätze</h2>';
    if (data.children.length) html += '<div class="chips"><button data-act="label-all">🏷️ Alle Etiketten drucken</button></div>';
  }
  html += data.children.length
    ? data.children.map((c) => `<div class="card"><a class="row" href="#/p/${c.id}">${placeThumb(c)}
        <span class="name">${esc(nameOf(c))}<span class="sub">${c.name ? esc(c.code) : ''}${c.name && c.notes ? ' · ' : ''}${esc(c.notes.slice(0, 60))}</span></span>
        ${c.child_count ? `<span class="badge">${c.child_count} Plätze</span>` : ''}
        ${c.stock_count ? `<span class="badge">${c.stock_count} Artikel</span>` : ''}</a></div>`).join('')
    : (place ? '' : '<div class="empty">Noch nichts angelegt. Beginne mit einem festen Lagerplatz, zum Beispiel einem Raum („Schrankraum“) oder einem Regal.</div>');
  if (place) {
    html += '<h3 class="sec">Bestand an diesem Platz</h3>';
    html += data.stock.length
      ? data.stock.map((s, i) => `<div class="card"><div class="line">
          <a class="row" style="padding:0;flex:1" href="#/a/${s.article_id}">${articleThumb({ id: s.article_id, has_photo: s.has_photo, photo_v: s.photo_v })}
            <span class="name">${esc(s.name)}<span class="sub">${esc(s.code)}</span></span>
            <span class="qty">${s.quantity} ${esc(s.unit)}</span></a></div>
          <div class="chips" style="padding:0 14px 10px"><button data-act="move" data-i="${i}">↔ Umlagern</button>
            <button data-act="take" data-i="${i}">− Ausbuchen</button></div></div>`).join('')
      : '<div class="empty">Hier liegt noch kein Artikel.</div>';
  }
  html += `<div class="fabs"><button class="primary" data-act="add-place">+ Lagerplatz</button>
    ${place ? '<button class="primary" data-act="put">+ Einlagern</button>' : ''}</div>`;
  main.innerHTML = html;

  const on = (act, fn) => main.querySelectorAll(`[data-act=${act}]`).forEach((b) => { b.onclick = () => fn(b); });
  on('add-place', () => placeDialog(null, { parent_id: id || null, path: data.path, parentKind: place ? place.kind : null }));
  on('edit', async () => placeDialog(await api('GET', '/api/places/' + id)));
  on('label', () => { location.hash = `#/labels?place=${id}`; });
  on('label-deep', () => { location.hash = `#/labels?place=${id}&deep=1`; });
  on('label-all', () => { location.hash = '#/labels?all=1'; });
  on('put', () => stockDialog('put', { place }));
  const fromLine = (b) => {
    const s = data.stock[Number(b.dataset.i)];
    return { article: { id: s.article_id, name: s.name, unit: s.unit }, place, max: s.quantity };
  };
  on('move', (b) => stockDialog('move', fromLine(b)));
  on('take', (b) => stockDialog('remove', fromLine(b)));
}

// ---- Ansicht: Artikelliste -------------------------------------------------------
async function showArticles() {
  setTab('articles');
  renderCrumbs([], 'Artikel');
  const cats = await api('GET', '/api/categories');
  let filter = store.get('woiswos.catFilter') || '';
  if (filter && filter !== 'none' && !cats.some((c) => String(c.id) === filter)) filter = '';
  main.innerHTML = `<h2>Artikel</h2>
    <div class="filterrow">
      <select id="cf"><option value="">Alle Gruppen</option><option value="none">Ohne Gruppe</option>
        ${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
    </div>
    <input type="text" id="aq" placeholder="Artikel filtern…" autocomplete="off">
    <div id="alist" style="margin-top:10px"></div>
    <div class="fabs"><button class="primary" data-act="add">+ Neuer Artikel</button></div>`;
  $('#cf').value = filter;
  let timer;
  async function load() {
    const items = await api('GET', '/api/articles?q=' + encodeURIComponent($('#aq').value) + '&category=' + encodeURIComponent($('#cf').value));
    $('#alist').innerHTML = items.map((a) => `<div class="card"><a class="row" href="#/a/${a.id}">${articleThumb(a)}
      <span class="name">${esc(a.name)}<span class="sub">${esc(a.code)}${a.category ? ' · ' + esc(a.category) : ''}${a.lines > 1 ? ` · an ${a.lines} Plätzen` : ''}</span></span>
      <span class="qty">${a.total} ${esc(a.unit)}</span></a></div>`).join('')
      || '<div class="empty">Keine Artikel.</div>';
  }
  $('#aq').oninput = () => { clearTimeout(timer); timer = setTimeout(() => load().catch(showError), 200); };
  $('#cf').onchange = () => { store.set('woiswos.catFilter', $('#cf').value); load().catch(showError); };
  main.querySelector('[data-act=add]').onclick = () => articleDialog(null);
  await load();
}

// ---- Ansicht: Artikel ----------------------------------------------------------
async function showArticle(id) {
  setTab('articles');
  const a = await api('GET', '/api/articles/' + id);
  renderCrumbs([], a.name);
  main.innerHTML = `${a.has_photo ? `<img class="photo" alt="" src="${photoUrl('articles', a, 'full')}">` : ''}
    <h2>${ICON.article} ${esc(a.name)}</h2>
    <div class="where">Artikelnr. <span class="code">${esc(a.code)}</span> · Einheit ${esc(a.unit)}${a.category ? ' · Gruppe ' + esc(a.category) : ''}</div>
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}
    <div class="chips"><button data-act="edit">Bearbeiten</button><button data-act="label">🏷️ Etikett</button></div>
    <h3 class="sec">Bestand: ${a.total} ${esc(a.unit)}</h3>
    ${a.stock.length ? a.stock.map((s, i) => `<div class="card"><div class="line">
        <a class="row" style="padding:0;flex:1" href="#/p/${s.place_id}"><span>${ICON[s.kind]}</span>
          <span class="name">${esc(pathText([...s.path]))}${s.name ? `<span class="sub">${esc(s.code)}</span>` : ''}</span>
          <span class="qty">${s.quantity} ${esc(a.unit)}</span></a></div>
        <div class="chips" style="padding:0 14px 10px"><button data-act="move" data-i="${i}">↔ Umlagern</button>
          <button data-act="take" data-i="${i}">− Ausbuchen</button></div></div>`).join('')
      : '<div class="empty">Dieser Artikel ist nirgends eingelagert.</div>'}
    <h3 class="sec">Verlauf</h3>
    ${a.history.length ? a.history.map((h) => `<div class="hist">${esc(fmtTime(h.ts))} · ${MOVE_LABEL[h.type]} ${h.quantity} ${esc(a.unit)}
      ${h.from_place ? ' von ' + esc(h.from_place) : ''}${h.to_place ? ' nach ' + esc(h.to_place) : ''}${h.note ? ' (' + esc(h.note) + ')' : ''}</div>`).join('')
      : '<div class="hist">Noch keine Buchungen.</div>'}
    <div class="fabs"><button class="primary" data-act="put">+ Einlagern</button></div>`;
  const on = (act, fn) => main.querySelectorAll(`[data-act=${act}]`).forEach((b) => { b.onclick = () => fn(b); });
  on('edit', () => articleDialog(a));
  on('label', () => { location.hash = `#/labels?article=${id}`; });
  on('put', () => stockDialog('put', { article: a }));
  const fromLine = (b) => {
    const s = a.stock[Number(b.dataset.i)];
    return { article: a, place: { id: s.place_id, code: s.code, name: s.name, kind: s.kind }, max: s.quantity };
  };
  on('move', (b) => stockDialog('move', fromLine(b)));
  on('take', (b) => stockDialog('remove', fromLine(b)));
}

// ---- Ansicht: Suche -----------------------------------------------------------------
async function showSearch(text) {
  renderCrumbs([], 'Suche');
  const r = await api('GET', '/api/search?q=' + encodeURIComponent(text));
  let html = `<h2>Suche: „${esc(text)}“</h2>`;
  html += '<h3 class="sec">Lagerplätze</h3>' + (r.places.length
    ? r.places.map((p) => `<div class="card"><a class="row" href="#/p/${p.id}">${placeThumb(p)}
        <span class="name">${esc(nameOf(p))}<span class="sub">${p.name ? esc(p.code) + ' · ' : ''}📍 ${esc(pathText(p.path))}</span></span></a></div>`).join('')
    : '<div class="empty">Kein Lagerplatz gefunden.</div>');
  html += '<h3 class="sec">Artikel</h3>' + (r.articles.length
    ? r.articles.map((a) => `<div class="card"><a class="row" href="#/a/${a.id}">${articleThumb(a)}
        <span class="name">${esc(a.name)}<span class="sub">${esc(a.code)}${a.where.length ? ' · 📍 ' + esc(pathText(a.where[0].path)) : ' · nicht eingelagert'}${a.lines > 1 ? ` (+${a.lines - 1})` : ''}</span></span>
        <span class="qty">${a.total} ${esc(a.unit)}</span></a></div>`).join('')
    : '<div class="empty">Kein Artikel gefunden.</div>');
  main.innerHTML = html;
}

// ---- Ansicht: Einstellungen (Artikelgruppen) -----------------------------------------
async function showSettings() {
  setTab('');
  renderCrumbs([], 'Einstellungen');
  const cats = await api('GET', '/api/categories');
  main.innerHTML = `<h2>⚙️ Einstellungen</h2>
    <h3 class="sec">Artikelgruppen</h3>
    <p class="hint">Mit Gruppen ordnest du Artikel (z. B. Kleinteile, Lötzubehör, Handwerkzeug). Im Artikel ist die Gruppe
    freiwillig. Löschst du eine Gruppe, bleiben die Artikel erhalten und stehen danach „ohne Gruppe“.</p>
    ${cats.map((c) => `<div class="card"><div class="catrow"><span class="name">${esc(c.name)}
        <span class="sub">${c.article_count} Artikel</span></span>
        <button data-act="rename" data-id="${c.id}" aria-label="Umbenennen" title="Umbenennen">✏️</button>
        <button class="danger" data-act="del" data-id="${c.id}" aria-label="Löschen" title="Löschen">🗑️</button></div></div>`).join('')}
    <div class="addrow"><input type="text" id="newcat" maxlength="40" placeholder="Neue Gruppe, z. B. Pneumatik" autocomplete="off">
      <button class="primary" id="addcat">+ Hinzufügen</button></div>`;
  const byId = (b) => cats.find((c) => c.id === Number(b.dataset.id));
  const run = async (fn) => { try { await fn(); await showSettings(); } catch (ex) { alert(ex.message); } };
  main.querySelectorAll('[data-act=rename]').forEach((b) => { b.onclick = async () => {
    const c = byId(b);
    const n = await askText('Gruppe umbenennen', c.name);
    if (n !== undefined) run(() => api('PATCH', '/api/categories/' + c.id, { name: n }));
  }; });
  main.querySelectorAll('[data-act=del]').forEach((b) => { b.onclick = () => {
    const c = byId(b);
    const hint = c.article_count ? `\n${c.article_count} Artikel stehen danach ohne Gruppe (sie werden nicht gelöscht).` : '';
    if (confirm(`Gruppe „${c.name}“ wirklich löschen?${hint}`)) run(() => api('DELETE', '/api/categories/' + c.id));
  }; });
  const add = () => { const n = $('#newcat').value; if (n.trim()) run(() => api('POST', '/api/categories', { name: n })); };
  $('#addcat').onclick = add;
  $('#newcat').onkeydown = (e) => { if (e.key === 'Enter') add(); };
}

// ---- Ansicht: Etiketten drucken -------------------------------------------------------
const LABEL_FORMATS = {
  'l62x29': { name: '62 × 29 mm (Etikettendrucker)', w: 62, h: 29, roll: true },
  'l50x30': { name: '50 × 30 mm', w: 50, h: 30, roll: true },
  'l100x50': { name: '100 × 50 mm (groß)', w: 100, h: 50, roll: true },
  'a4-70x37': { name: 'A4-Bogen 70 × 37 mm (3 × 8)', w: 70, h: 37, cols: 3 },
  'a4-105x57': { name: 'A4-Bogen 105 × 57 mm (2 × 5)', w: 105, h: 57, cols: 2 },
};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ohne Speicher weiterarbeiten */ } },
};

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

async function showLabels(params) {
  setTab('places');
  const url = params.get('all') ? '/api/labels?all=1'
    : params.get('article') ? '/api/labels?article=' + Number(params.get('article'))
      : `/api/labels?place=${Number(params.get('place'))}&deep=${params.get('deep') === '1' ? 1 : 0}`;
  const labels = await api('GET', url);
  renderCrumbs([], 'Etiketten');
  const saved = store.get('woiswos.labelFormat');
  const fmtKey = LABEL_FORMATS[saved] ? saved : 'l62x29';
  main.innerHTML = `<div class="no-print"><h2>Etiketten drucken</h2>
    <div class="labels-ctl">
      <div><label>Format</label><select id="fmt">${Object.entries(LABEL_FORMATS).map(([k, f]) =>
        `<option value="${k}"${k === fmtKey ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>
      <button class="primary" id="print">🖨️ Drucken (${labels.length})</button>
    </div>
    <p class="hint">Im Druckdialog „Skalierung 100 %“ und „Ränder: keine“ wählen, damit die Etiketten genau passen.
    Der QR-Code enthält die Nummer, die Schrift darunter ist für Menschen lesbar.</p></div>
    <div class="sheet" id="sheet"></div><style id="pagestyle"></style>`;
  const sheet = $('#sheet');
  function render() {
    const key = $('#fmt').value;
    const f = LABEL_FORMATS[key];
    store.set('woiswos.labelFormat', key);
    const txtW = f.w - f.h - 3; // verfügbare Breite für den Text in mm (ohne QR und Rand)
    sheet.innerHTML = labels.map((l) => {
      const longest = Math.max(...l.code.split('\n').map((x) => x.length), 1);
      const fs = Math.max(2.6, Math.min(f.h * 0.3, txtW / (longest * 0.62)));
      return `<div class="label" style="width:${f.w}mm;height:${f.h}mm">
        <div class="qr">${qrSvg(l.payload)}</div>
        <div class="txt"><div class="big" style="font-size:${fs.toFixed(1)}mm">${esc(l.code)}</div>
          ${l.name ? `<div class="small">${esc(l.name)}</div>` : ''}
          ${l.path ? `<div class="path">${esc(l.path)}</div>` : ''}</div></div>`;
    }).join('');
    // Seiteneinstellungen für den Druck
    $('#pagestyle').textContent = f.roll
      ? `@page { size: ${f.w}mm ${f.h}mm; margin: 0 } @media print { .sheet { display: block !important } .label { page-break-after: always } }`
      : `@page { size: A4; margin: 0 } @media print { .sheet { display: grid !important; grid-template-columns: repeat(${f.cols}, ${f.w}mm); } }`;
  }
  $('#fmt').onchange = render;
  $('#print').onclick = () => window.print();
  render();
}

// ---- Dialog: Lagerplatz neu / bearbeiten ----------------------------------------------
function placeDialog(place, ctx) {
  const isNew = !place;
  const pathNow = isNew ? ctx.path : place.path;
  let parent = isNew ? ctx.parent_id : place.parent_id;
  let parentKind = pathNow.length ? pathNow[pathNow.length - 1].kind : null;
  const photo = photoControl('places', place);
  dlg.innerHTML = `<form method="dialog" id="f">
    <h3>${isNew ? 'Neuer Lagerplatz' : 'Lagerplatz bearbeiten'}</h3>
    <label>Art</label>
    <select name="kind">
      <option value="place">🗄️ Fester Lagerplatz (Raum, Regal, Fach, Schublade …)</option>
      <option value="box">📦 Variabler Lagerplatz (Box, Kiste, Schachtel …)</option>
    </select>
    <label>Nummer</label>
    <input type="text" name="code" maxlength="40" value="${esc(isNew ? '' : place.code)}" placeholder="leer = automatisch fortlaufend" autocomplete="off">
    <p class="hint">Frei wählbar, auch mit Leerzeichen, z. B. <b>100 01 03</b> (Regal 100, Ebene 01, Fach 03).
    ${isNew ? 'Leer lassen: Woiswos vergibt automatisch die nächste Nummer (LP-0001, BOX-0001 …).' : 'Achtung: Wird die Nummer geändert, passen bereits gedruckte Etiketten nicht mehr.'}</p>
    <label>Name (optional)</label><input type="text" name="name" maxlength="200" value="${esc(isNew ? '' : place.name)}" placeholder="z. B. Elektrowerkstatt, Regal links">
    ${photo.html()}
    <label>Notiz</label><textarea name="notes" rows="2">${esc(isNew ? '' : place.notes)}</textarea>
    <label>Liegt in</label>
    <div class="where" id="where">📍 ${esc(pathText(pathNow))}</div>
    <button type="button" id="move">Ort ändern…</button>
    <div class="err" id="err"></div>
    <div class="bar">
      <button class="primary" value="save">Speichern</button>
      ${isNew ? '' : '<button type="button" class="danger" id="del">Löschen</button>'}
      <button type="button" id="cancel">Abbrechen</button>
    </div></form>`;
  const err = (m) => { $('#err').textContent = m; };
  const kindSel = $('#f select[name=kind]');
  kindSel.value = isNew ? (parentKind === 'box' ? 'box' : 'place') : place.kind;
  const syncKind = () => {
    kindSel.querySelector('[value=place]').disabled = parentKind === 'box'; // fester Platz nie in einer Box
    if (parentKind === 'box' && kindSel.value === 'place') kindSel.value = 'box';
  };
  syncKind();
  photo.bind(err);
  $('#cancel').onclick = () => dlg.close();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { kind: fd.get('kind'), code: fd.get('code'), name: fd.get('name'), notes: fd.get('notes'), parent_id: parent };
    try {
      const saved = isNew ? await api('POST', '/api/places', body) : await api('PATCH', '/api/places/' + place.id, body);
      await photo.apply(saved.id);
      dlg.close();
      // Neu: dorthin springen, wo der Platz gelandet ist. Bearbeiten: beim Platz bleiben.
      const target = isNew ? (saved.parent_id ? '#/p/' + saved.parent_id : '#/') : '#/p/' + saved.id;
      if ((location.hash || '#/') === target) route(); else location.hash = target;
    } catch (ex) { err(ex.message); }
  };
  $('#move').onclick = async () => {
    const target = await pickPlace({ movingId: isNew ? null : place.id, startId: parent, onlyFixed: kindSel.value === 'place', allowRoot: true });
    if (target === undefined) return;
    parent = target.id;
    parentKind = target.kind;
    $('#where').textContent = '📍 ' + pathText(target.path);
    syncKind();
  };
  const del = $('#del');
  if (del) del.onclick = async () => {
    const parts = [];
    if (place.descendant_count) parts.push(`${place.descendant_count} Unterplätze`);
    if (place.stock_count) parts.push(`den Bestand von ${place.stock_count} Artikelzeilen`);
    const q = `„${nameOf(place)}“ wirklich löschen?` + (parts.length ? `\nDabei werden auch ${parts.join(' und ')} gelöscht (die Artikel selbst bleiben erhalten).` : '');
    if (!confirm(q)) return;
    try {
      await api('DELETE', '/api/places/' + place.id);
      dlg.close();
      location.hash = place.parent_id ? '#/p/' + place.parent_id : '#/';
    } catch (ex) { err(ex.message); }
  };
  dlg.showModal();
}

// ---- Dialog: Artikel neu / bearbeiten ------------------------------------------------------
async function articleDialog(article) {
  const isNew = !article;
  let cats;
  try { cats = await api('GET', '/api/categories'); } catch (ex) { alert(ex.message); return; }
  const photo = photoControl('articles', article);
  dlg.innerHTML = `<form method="dialog" id="f">
    <h3>${isNew ? 'Neuer Artikel' : 'Artikel bearbeiten'}</h3>
    <label>Name</label><input type="text" name="name" required maxlength="200" value="${esc(isNew ? '' : article.name)}">
    <label>Artikelnummer</label>
    <input type="text" name="code" maxlength="40" value="${esc(isNew ? '' : article.code)}" placeholder="leer = automatisch (ART-0001 …)" autocomplete="off">
    <label>Einheit</label><input type="text" name="unit" maxlength="12" value="${esc(isNew ? 'Stk' : article.unit)}">
    <label>Artikelgruppe (freiwillig)</label>
    <select name="category_id">
      <option value="">— keine Gruppe —</option>
      ${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      <option value="__new__">＋ Neue Gruppe anlegen…</option>
    </select>
    ${photo.html()}
    <label>Notiz</label><textarea name="notes" rows="2">${esc(isNew ? '' : article.notes)}</textarea>
    <div class="err" id="err"></div>
    <div class="bar">
      <button class="primary" value="save">Speichern</button>
      ${isNew ? '' : '<button type="button" class="danger" id="del">Löschen</button>'}
      <button type="button" id="cancel">Abbrechen</button>
    </div></form>`;
  const err = (m) => { $('#err').textContent = m; };
  photo.bind(err);
  // Gruppe: beim Bearbeiten die vorhandene, bei neuen Artikeln die zuletzt benutzte vorschlagen
  const catSel = $('#f select[name=category_id]');
  const wanted = isNew ? (store.get('woiswos.lastCategory') || '') : String(article.category_id ?? '');
  catSel.value = cats.some((c) => String(c.id) === wanted) ? wanted : '';
  let lastCat = catSel.value;
  catSel.onchange = async () => {
    if (catSel.value !== '__new__') { lastCat = catSel.value; return; }
    const name = await askText('Neue Artikelgruppe', '');
    if (name && name.trim()) {
      try {
        const c = await api('POST', '/api/categories', { name });
        const opt = new Option(c.name, c.id);
        catSel.insertBefore(opt, catSel.querySelector('[value=__new__]'));
        lastCat = String(c.id);
      } catch (ex) { err(ex.message); }
    }
    catSel.value = lastCat;
  };
  $('#cancel').onclick = () => dlg.close();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), code: fd.get('code'), unit: fd.get('unit'), notes: fd.get('notes'),
      category_id: catSel.value === '__new__' ? null : catSel.value };
    try {
      const saved = isNew ? await api('POST', '/api/articles', body) : await api('PATCH', '/api/articles/' + article.id, body);
      await photo.apply(saved.id);
      store.set('woiswos.lastCategory', body.category_id || '');
      dlg.close();
      const target = '#/a/' + saved.id;
      if (location.hash === target) route(); else location.hash = target;
      // Neuer Artikel: gleich weiter zum Einlagern (Abbrechen genügt, wenn er noch nicht eingelagert werden soll)
      if (isNew) stockDialog('put', { article: saved });
    } catch (ex) { err(ex.message); }
  };
  const del = $('#del');
  if (del) del.onclick = async () => {
    const n = article.stock.length;
    if (!confirm(`Artikel „${article.name}“ wirklich löschen?` + (n ? `\nSein Bestand an ${n} Lagerplätzen wird ebenfalls gelöscht.` : ''))) return;
    try {
      await api('DELETE', '/api/articles/' + article.id);
      dlg.close();
      location.hash = '#/articles';
    } catch (ex) { err(ex.message); }
  };
  dlg.showModal();
}

// ---- Dialog: Einlagern / Umlagern / Ausbuchen --------------------------------------------------
// mode 'put':    ctx.article (optional), ctx.place (optional Ziel)
// mode 'move':   ctx.article, ctx.place = Quelle, ctx.max = vorhandene Menge; Ziel wird gewählt
// mode 'remove': ctx.article, ctx.place = Quelle, ctx.max
function stockDialog(mode, ctx) {
  let article = ctx.article || null;
  let place = mode === 'move' ? null : (ctx.place || null); // 'put': Ziel, 'remove': Quelle
  if (mode === 'put' && !place) {
    // beim Einlagern mehrerer Artikel hintereinander: zuletzt verwendeten Lagerplatz vorschlagen
    try { place = JSON.parse(store.get('woiswos.lastPlace')) || null; } catch { place = null; }
  }
  const title = { put: 'Einlagern', move: 'Umlagern', remove: 'Ausbuchen' }[mode];
  dlg.innerHTML = `<form method="dialog" id="f">
    <h3>${title}</h3>
    <label>Artikel</label>
    <div class="where" id="aview"></div>
    ${mode === 'put' && !ctx.article ? '<button type="button" id="apick">Artikel wählen…</button>' : ''}
    ${mode !== 'put' ? `<label>Von</label><div class="where">📍 ${esc(ctx.place.name || ctx.place.code)} · vorhanden: ${ctx.max}</div>` : ''}
    ${mode !== 'remove' ? `<label>${mode === 'put' ? 'Auf Lagerplatz' : 'Nach'}</label>
      <div class="where" id="pview"></div><button type="button" id="ppick">Lagerplatz wählen…</button>` : ''}
    <label>Menge</label>
    <input type="number" name="quantity" min="1" max="${mode === 'put' ? 1000000 : ctx.max}" step="1" value="${mode === 'put' ? 1 : ctx.max}" required>
    <label>Notiz (optional)</label><input type="text" name="note" maxlength="200" placeholder="${mode === 'remove' ? 'z. B. verbraucht, verschenkt' : ''}">
    <div class="err" id="err"></div>
    <div class="bar"><button class="primary" value="save">${title}</button><button type="button" id="cancel">Abbrechen</button></div></form>`;
  const err = (m) => { $('#err').textContent = m; };
  const refresh = () => {
    $('#aview').textContent = article ? `${article.name} (${article.code || ''})`.replace(' ()', '') : '— noch nicht gewählt —';
    const pv = $('#pview');
    if (pv) pv.textContent = place ? '📍 ' + (place.path ? pathText(place.path) : (place.name || place.code)) : '— noch nicht gewählt —';
  };
  refresh();
  $('#cancel').onclick = () => dlg.close();
  const apick = $('#apick');
  if (apick) apick.onclick = async () => { const a = await pickArticle(); if (a) { article = a; refresh(); } };
  const ppick = $('#ppick');
  if (ppick) ppick.onclick = async () => {
    const p = await pickPlace({ allowRoot: false, startId: (place || ctx.place || {}).id });
    if (p && p.id) {
      const d = await api('GET', '/api/places/' + p.id);
      place = { id: p.id, code: d.code, name: d.name, path: p.path };
      refresh();
    }
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!article) return err('Bitte einen Artikel wählen.');
    if (!place) return err('Bitte einen Lagerplatz wählen.');
    const body = { article_id: article.id, quantity: fd.get('quantity'), note: fd.get('note') };
    try {
      if (mode === 'put') await api('POST', '/api/stock/put', { ...body, place_id: place.id });
      else if (mode === 'remove') await api('POST', '/api/stock/remove', { ...body, place_id: ctx.place.id });
      else await api('POST', '/api/stock/move', { ...body, from_place_id: ctx.place.id, to_place_id: place.id });
      if (mode === 'put') {
        const d = await api('GET', '/api/places/' + place.id);
        store.set('woiswos.lastPlace', JSON.stringify({ id: d.id, code: d.code, name: d.name, path: [...d.path, d] }));
      }
      dlg.close();
      route();
    } catch (ex) {
      if (mode === 'put' && /Lagerplatz nicht gefunden/.test(ex.message)) store.set('woiswos.lastPlace', '');
      err(ex.message);
    }
  };
  dlg.showModal();
}

// ---- Routing -------------------------------------------------------------------------
async function route() {
  const hash = location.hash || '#/';
  const [pathPart, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  let m;
  try {
    if ((m = pathPart.match(/^#\/p\/(\d+)$/))) await showPlace(Number(m[1]));
    else if (pathPart === '#/articles') await showArticles();
    else if ((m = pathPart.match(/^#\/a\/(\d+)$/))) await showArticle(Number(m[1]));
    else if (pathPart === '#/labels') await showLabels(params);
    else if (pathPart === '#/settings') await showSettings();
    else await showPlace(null);
  } catch (ex) {
    renderCrumbs([], '');
    showError(ex);
  }
}
window.addEventListener('hashchange', () => { $('#search').value = ''; route(); });

let timer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  const text = e.target.value.trim();
  timer = setTimeout(() => {
    if (text) showSearch(text).catch(showError);
    else route();
  }, 250);
});
route();
