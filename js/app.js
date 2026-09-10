(() => {
  'use strict';

  const STORAGE_KEY = 'appleNotesPwa.v1';
  const SURFACE_W = 1600;
  const SURFACE_H = 2200;
  const MIN_SIZES = { text: [140, 60], image: [60, 60], pdf: [60, 60] };
  // Muss zum Linien-Hintergrund (.canvas-surface[data-bg="lines"]) passen: Zeilenabstand
  // 28px, die sichtbare Linie liegt am unteren Rand jedes 28px-Bandes (bei 27px).
  const LINE_PITCH = 28;
  const LINE_PHASE = 27;
  const OBJ_BORDER = 2; // .canvas-object border-width

  const ICONS = {
    allNotes: '<svg viewBox="0 0 20 20"><path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.41a1 1 0 0 0-.29-.71l-2.41-2.41A1 1 0 0 0 13.59 3H4zm2 4h8v1.5H6V7zm0 3h8v1.5H6V10zm0 3h5v1.5H6V13z"/></svg>',
    folder: '<svg viewBox="0 0 20 20"><path d="M2 5.5C2 4.67 2.67 4 3.5 4h4.13c.36 0 .7.14.96.4l1.2 1.2c.26.26.6.4.96.4H16.5c.83 0 1.5.67 1.5 1.5v7.6c0 .83-.67 1.5-1.5 1.5h-13C2.67 16.6 2 15.93 2 15.1V5.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20"><path d="M6 2.5h8l.5 1.5H16v1.5H4V4h1.5L6 2.5zM5 7h10l-.7 10.1c-.05.7-.63 1.4-1.5 1.4H7.2c-.87 0-1.45-.7-1.5-1.4L5 7z"/></svg>',
    link: '<svg viewBox="0 0 20 20"><rect x="1" y="7" width="9" height="4.5" rx="2.25" transform="rotate(-45 5.5 9.25)" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="8.5" width="9" height="4.5" rx="2.25" transform="rotate(-45 14 10.75)" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    unlink: '<svg viewBox="0 0 20 20"><rect x="1" y="7" width="9" height="4.5" rx="2.25" transform="rotate(-45 5.5 9.25)" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="8.5" width="9" height="4.5" rx="2.25" transform="rotate(-45 14 10.75)" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="1.8"/></svg>',
    marker: '<svg viewBox="0 0 20 20"><path d="M4.4 12.6 11 3.3c.5-.7 1.5-.8 2.2-.3l2.1 1.5c.7.5.8 1.5.3 2.2l-6.6 9.3-5.2.9.6-4.3z"/><rect x="2" y="17.4" width="16" height="1.5" rx="0.75" opacity="0.45"/></svg>',
    bold: '<svg viewBox="0 0 20 20"><text x="4" y="15.5" font-size="14" font-weight="800" fill="currentColor">B</text></svg>',
    italic: '<svg viewBox="0 0 20 20"><text x="5.5" y="15.5" font-size="14" font-style="italic" font-weight="600" fill="currentColor">I</text></svg>',
    textColor: '<svg viewBox="0 0 20 20"><text x="2.5" y="14.5" font-size="13" font-weight="700" fill="currentColor">A</text><rect x="2" y="16.6" width="14" height="2.2" rx="1"/></svg>',
    fontSize: '<svg viewBox="0 0 20 20"><text x="1" y="15" font-size="13" font-weight="700" fill="currentColor">A</text><text x="10.5" y="15" font-size="8.5" font-weight="700" fill="currentColor">a</text></svg>',
    chevron: '<svg viewBox="0 0 20 20"><path d="M7 4.5 13 10l-6 5.5v-2.2L10.4 10 7 6.7z"/></svg>',
    plus: '<svg viewBox="0 0 20 20"><path d="M9.2 2.5h1.6v6.7h6.7v1.6h-6.7v6.7H9.2v-6.7H2.5V9.2h6.7z"/></svg>',
    heading: '<svg viewBox="0 0 20 20"><text x="1.5" y="15" font-size="13" font-weight="800" fill="currentColor">H</text></svg>',
  };

  const MARKER_COLORS = [
    { hex: '#ffd60a', name: 'Gelb' },
    { hex: '#34c759', name: 'Grün' },
    { hex: '#64d2ff', name: 'Blau' },
    { hex: '#ff375f', name: 'Pink' },
    { hex: '#ff9f0a', name: 'Orange' },
  ];
  const MARKER_STRENGTHS = [
    { alpha: 0.35, label: 'Leicht' },
    { alpha: 0.55, label: 'Mittel' },
    { alpha: 0.8, label: 'Stark' },
  ];

  const TEXT_COLORS = [
    { hex: '#1c1c1e', name: 'Schwarz' },
    { hex: '#6e6e73', name: 'Grau' },
    { hex: '#ff3b30', name: 'Rot' },
    { hex: '#ff9500', name: 'Orange' },
    { hex: '#ffcc00', name: 'Gelb' },
    { hex: '#34c759', name: 'Grün' },
    { hex: '#0a84ff', name: 'Blau' },
    { hex: '#af52de', name: 'Lila' },
  ];

  const FOLDER_COLORS = [
    { hex: '#ff9500', name: 'Orange' },
    { hex: '#ff3b30', name: 'Rot' },
    { hex: '#af52de', name: 'Lila' },
    { hex: '#0a84ff', name: 'Blau' },
    { hex: '#34c759', name: 'Grün' },
    { hex: '#ffcc00', name: 'Gelb' },
    { hex: '#6e6e73', name: 'Grau' },
  ];

  const FONT_SIZES = [
    { px: 12, label: 'Klein' },
    { px: null, label: 'Standard' },
    { px: 19, label: 'Groß' },
    { px: 26, label: 'Sehr groß' },
  ];

  const FONT_FAMILIES = [
    { css: null, label: 'Standard' },
    { css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif', label: 'Serifenlos' },
    { css: 'Georgia, "Times New Roman", Times, serif', label: 'Serif' },
    { css: '"Courier New", Courier, monospace', label: 'Monospace' },
    { css: '"Marker Felt", "Segoe Script", cursive', label: 'Handschrift' },
  ];

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * @typedef {{id:string, type:'text', x:number, y:number, w:number, h:number, z:number, text:string, html:string, parentId:?string, relX?:number, relY?:number, relW?:number, relH?:number}} TextObject
   * @typedef {{id:string, type:'image', x:number, y:number, w:number, h:number, z:number, src:string}} ImageObject
   * @typedef {{id:string, color:string, eraser:boolean, points:Array<{x:number,y:number,width:number}>, parentId:?string}} Stroke
   * @typedef {{id:string, title:string, objects:Array, ink:{strokes:Stroke[]}, background:'dots'|'lines'|'blank', folderId:?string, parentNoteId:?string, createdAt:number, updatedAt:number}} Note
   * @typedef {{id:string, name:string, color:?string}} Folder
   */

  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function migrateNote(note) {
    if (!Array.isArray(note.objects)) {
      const objects = [];
      if (note.content) {
        objects.push({
          id: uid(), type: 'text', x: 24, y: 24, w: 480, h: 260, z: 1,
          text: note.content, parentId: null,
        });
      }
      if (note.sketch) {
        objects.push({
          id: uid(), type: 'image', x: 24, y: note.content ? 300 : 24, w: 360, h: 260, z: 2,
          src: note.sketch,
        });
      }
      note.objects = objects;
      delete note.content;
      delete note.sketch;
    }
    if (!note.ink) note.ink = { strokes: [] };
    if (!note.background) note.background = 'dots';
    if (note.parentNoteId === undefined) note.parentNoteId = null;

    // Alte, auf ein Objekt begrenzte Zeichnungen (Vorversion) in die globale Tinten-Ebene übernehmen
    const oldDrawings = note.objects.filter((o) => o.type === 'drawing');
    for (const d of oldDrawings) {
      for (const stroke of d.strokes || []) {
        note.ink.strokes.push({
          id: uid(),
          color: stroke.color,
          eraser: stroke.eraser,
          parentId: null,
          points: (stroke.points || []).map((p) => ({
            x: d.x + p.x * d.w,
            y: d.y + p.y * d.h,
            width: p.width * d.w,
          })),
        });
      }
    }
    if (oldDrawings.length > 0) {
      note.objects = note.objects.filter((o) => o.type !== 'drawing');
    }
    // Striche ohne id/parentId (ältere Zwischenversion) ergänzen
    for (const stroke of note.ink.strokes) {
      if (!stroke.id) stroke.id = uid();
      if (stroke.parentId === undefined) stroke.parentId = null;
    }
    // Text-Objekte ohne Stil (ältere Version) auf "Textfeld" setzen; reinen Text
    // (ältere Version ohne HTML) für die neue formatierbare Anzeige übernehmen
    for (const obj of note.objects) {
      if (obj.type !== 'text') continue;
      if (!obj.style) obj.style = 'boxed';
      if (typeof obj.html !== 'string') obj.html = escapeHtml(obj.text || '');
    }
    return note;
  }

  // Hängende (Eltern-Notiz existiert nicht mehr) oder zyklische parentNoteId-Referenzen
  // kappen, damit der Notizbaum nicht in eine Endlosschleife läuft.
  function sanitizeNoteParents(notes) {
    const byId = new Map(notes.map((n) => [n.id, n]));
    for (const note of notes) {
      if (!note.parentNoteId) continue;
      if (!byId.has(note.parentNoteId)) {
        note.parentNoteId = null;
        continue;
      }
      const seen = new Set([note.id]);
      let cur = note.parentNoteId;
      while (cur) {
        if (seen.has(cur)) {
          note.parentNoteId = null;
          break;
        }
        seen.add(cur);
        const parent = byId.get(cur);
        cur = parent ? parent.parentNoteId : null;
      }
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.folders)) {
          parsed.notes.forEach(migrateNote);
          sanitizeNoteParents(parsed.notes);
          parsed.folders.forEach((f, i) => {
            if (!f.color) f.color = FOLDER_COLORS[i % FOLDER_COLORS.length].hex;
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Konnte gespeicherte Notizen nicht laden:', e);
    }
    return createDefaultState();
  }

  function createDefaultState() {
    const now = Date.now();
    const welcomeId = uid();
    const welcomeText =
      'Willkommen bei deiner neuen Notizen-App!\n\n' +
      '- Oben: Text, Bild oder PDF hinzufügen. Objekte per Ziehen verschieben, ' +
      'an der Ecke unten rechts in der Größe ändern.\n' +
      '- Text per Doppelklick bearbeiten. Beim Hinzufügen wählst du zwischen "Textfeld" ' +
      '(mit Rahmen) und "Freier Text" (ohne Rahmen, direkt auf der Fläche – z. B. auf Linien). ' +
      'Markiere einen Textabschnitt, um ihn über das Marker-Symbol in verschiedenen Farben und Stärken hervorzuheben.\n' +
      '- Stift-Symbol = Zeichnen-Modus: dann kannst du überall auf der Fläche zeichnen, ' +
      'auch direkt auf einem Bild.\n' +
      '- Ziehe einen Text auf ein Bild oder PDF, um ihn dort als Beschriftung anzuheften ' +
      '– er bewegt und skaliert sich dann mit.\n' +
      '- Über das Raster-Symbol kannst du den Hintergrund umstellen: Punkte, Linien oder leer.\n\n' +
      'Alle Notizen werden aktuell nur lokal auf diesem Gerät gespeichert.';
    return {
      folders: [],
      notes: [
        {
          id: welcomeId,
          title: 'Willkommen bei KrisNote',
          objects: [
            {
              id: uid(), type: 'text', x: 24, y: 24, w: 560, h: 360, z: 1, parentId: null, style: 'boxed',
              text: welcomeText,
              html: escapeHtml(welcomeText),
            },
          ],
          ink: { strokes: [] },
          background: 'dots',
          folderId: null,
          parentNoteId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  }

  let state = loadState();
  let selectedFolderId = null; // null = "Alle Notizen"
  let selectedNoteId = state.notes[0] ? state.notes[0].id : null;
  let searchQuery = '';
  let collapsedNoteIds = new Set();
  // Doppelklick-Erkennung für Ordner-Umbenennung: da jeder Klick renderFolders()
  // (kompletten DOM-Neuaufbau) auslöst, würde ein natives "dblclick"-Event nie
  // ankommen, weil das Eingabefeld zwischen den beiden Klicks ausgetauscht wird.
  // Daher zeitbasiert über die Ordner-id verfolgen statt über den DOM-Knoten.
  let lastFolderTapAt = 0;
  let lastFolderTapId = null;
  let saveTimer = null;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Speichern fehlgeschlagen:', e);
    }
  }

  function schedulePersist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }

  // ---------- DOM refs ----------
  const el = {
    app: document.getElementById('app'),
    sidebarResizer: document.getElementById('sidebarResizer'),
    listResizer: document.getElementById('listResizer'),
    folderList: document.getElementById('folderList'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    noteList: document.getElementById('noteList'),
    noteCount: document.getElementById('noteCount'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    searchInput: document.getElementById('searchInput'),
    editorEmpty: document.getElementById('editorEmpty'),
    editor: document.getElementById('editor'),
    titleInput: document.getElementById('titleInput'),
    editorDate: document.getElementById('editorDate'),
    moveNoteBtn: document.getElementById('moveNoteBtn'),
    popoverBackdrop: document.getElementById('popoverBackdrop'),
    movePopover: document.getElementById('movePopover'),
    movePopoverList: document.getElementById('movePopoverList'),
    addTextBtn: document.getElementById('addTextBtn'),
    headingBtn: document.getElementById('headingBtn'),
    boldBtn: document.getElementById('boldBtn'),
    italicBtn: document.getElementById('italicBtn'),
    underlineBtn: document.getElementById('underlineBtn'),
    strikeBtn: document.getElementById('strikeBtn'),
    superscriptBtn: document.getElementById('superscriptBtn'),
    subscriptBtn: document.getElementById('subscriptBtn'),
    bulletListBtn: document.getElementById('bulletListBtn'),
    numberedListBtn: document.getElementById('numberedListBtn'),
    ribbonColorBtn: document.getElementById('ribbonColorBtn'),
    ribbonMarkerBtn: document.getElementById('ribbonMarkerBtn'),
    ribbonFontSizeBtn: document.getElementById('ribbonFontSizeBtn'),
    ribbonFontFamilyBtn: document.getElementById('ribbonFontFamilyBtn'),
    fontFamilyPopoverBackdrop: document.getElementById('fontFamilyPopoverBackdrop'),
    fontFamilyPopover: document.getElementById('fontFamilyPopover'),
    fontFamilyList: document.getElementById('fontFamilyList'),
    textStylePopoverBackdrop: document.getElementById('textStylePopoverBackdrop'),
    textStylePopover: document.getElementById('textStylePopover'),
    folderColorPopoverBackdrop: document.getElementById('folderColorPopoverBackdrop'),
    folderColorPopover: document.getElementById('folderColorPopover'),
    folderColorGrid: document.getElementById('folderColorGrid'),
    markerPopoverBackdrop: document.getElementById('markerPopoverBackdrop'),
    markerPopover: document.getElementById('markerPopover'),
    markerGrid: document.getElementById('markerGrid'),
    markerRemoveBtn: document.getElementById('markerRemoveBtn'),
    colorPopoverBackdrop: document.getElementById('colorPopoverBackdrop'),
    colorPopover: document.getElementById('colorPopover'),
    colorGrid: document.getElementById('colorGrid'),
    colorResetBtn: document.getElementById('colorResetBtn'),
    fontSizePopoverBackdrop: document.getElementById('fontSizePopoverBackdrop'),
    fontSizePopover: document.getElementById('fontSizePopover'),
    fontSizeList: document.getElementById('fontSizeList'),
    headingPopoverBackdrop: document.getElementById('headingPopoverBackdrop'),
    headingPopover: document.getElementById('headingPopover'),
    headingList: document.getElementById('headingList'),
    drawModeBtn: document.getElementById('drawModeBtn'),
    addImageBtn: document.getElementById('addImageBtn'),
    imageFileInput: document.getElementById('imageFileInput'),
    addPdfBtn: document.getElementById('addPdfBtn'),
    pdfFileInput: document.getElementById('pdfFileInput'),
    backgroundBtn: document.getElementById('backgroundBtn'),
    backgroundPopoverBackdrop: document.getElementById('backgroundPopoverBackdrop'),
    backgroundPopover: document.getElementById('backgroundPopover'),
    canvasWorkspace: document.getElementById('canvasWorkspace'),
    canvasSurface: document.getElementById('canvasSurface'),
    inkLayer: document.getElementById('inkLayer'),
    drawToolbar: document.getElementById('drawToolbar'),
    drawPenToolBtn: document.getElementById('drawPenToolBtn'),
    drawSelectToolBtn: document.getElementById('drawSelectToolBtn'),
    drawColors: document.getElementById('drawColors'),
    drawEraserBtn: document.getElementById('drawEraserBtn'),
    drawUndoBtn: document.getElementById('drawUndoBtn'),
    drawClearBtn: document.getElementById('drawClearBtn'),
    drawDoneBtn: document.getElementById('drawDoneBtn'),
  };

  // ---------- Helpers ----------

  function notesInFolder(folderId) {
    return state.notes.filter((n) => (folderId === null ? true : n.folderId === folderId));
  }

  function noteSearchableText(note) {
    const objectText = note.objects
      .filter((o) => o.type === 'text')
      .map((o) => o.text || '')
      .join(' ');
    return `${note.title || ''} ${objectText}`;
  }

  function notePreviewText(note) {
    const firstText = note.objects.find((o) => o.type === 'text' && o.text && o.text.trim());
    if (firstText) return firstText.text.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (note.ink && note.ink.strokes && note.ink.strokes.length > 0) return 'Skizze';
    if (note.objects.some((o) => o.type === 'image')) return 'Bild';
    if (note.objects.some((o) => o.type === 'pdf')) return 'PDF';
    return '';
  }

  // Baut aus einer flachen Notizliste (z. B. eines Ordners) eine Tiefensuche-Reihenfolge
  // mit Einrückungstiefe je Notiz auf, sodass Unterseiten (und deren Unterseiten) direkt
  // unter ihrer übergeordneten Seite erscheinen. Eine Notiz, deren Eltern-Notiz nicht in
  // der übergebenen Liste ist (z. B. weil sie in einem anderen Ordner liegt), wird als
  // eigene Wurzel behandelt, damit sie nicht aus der Liste verschwindet.
  function buildNoteTree(notes) {
    const idsInList = new Set(notes.map((n) => n.id));
    const childrenOf = new Map();
    const roots = [];
    for (const note of notes) {
      const parentId = note.parentNoteId && idsInList.has(note.parentNoteId) ? note.parentNoteId : null;
      if (parentId) {
        if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
        childrenOf.get(parentId).push(note);
      } else {
        roots.push(note);
      }
    }
    const byUpdatedDesc = (a, b) => b.updatedAt - a.updatedAt;
    roots.sort(byUpdatedDesc);
    for (const list of childrenOf.values()) list.sort(byUpdatedDesc);

    const result = [];
    function visit(note, depth) {
      result.push({ note, depth, hasChildren: childrenOf.has(note.id) });
      if (collapsedNoteIds.has(note.id)) return;
      for (const kid of childrenOf.get(note.id) || []) visit(kid, depth + 1);
    }
    for (const root of roots) visit(root, 0);
    return result;
  }

  // Alle Nachfahren einer Notiz (Unterseiten, Unter-Unterseiten, …) über den
  // gesamten Notizbestand hinweg, unabhängig vom aktuell gewählten Ordner.
  function descendantNoteIds(id) {
    const ids = [];
    const stack = state.notes.filter((n) => n.parentNoteId === id).map((n) => n.id);
    while (stack.length > 0) {
      const nid = stack.pop();
      ids.push(nid);
      for (const child of state.notes.filter((n) => n.parentNoteId === nid)) stack.push(child.id);
    }
    return ids;
  }

  function getVisibleNotes() {
    const q = searchQuery.trim().toLowerCase();
    // Bei aktiver Suche werden bewusst ALLE Notizen durchsucht (nicht nur der
    // gerade geöffnete Ordner), damit man wirklich überall etwas findet.
    let list = q ? state.notes : notesInFolder(selectedFolderId);
    if (q) list = list.filter((n) => noteSearchableText(n).toLowerCase().includes(q));
    return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function findNote(id) {
    return state.notes.find((n) => n.id === id) || null;
  }

  function currentNote() {
    return findNote(selectedNoteId);
  }

  function getObj(note, id) {
    return note.objects.find((o) => o.id === id);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: sameYear ? undefined : '2-digit',
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Rendering: Sidebar ----------

  function renderFolders() {
    el.folderList.innerHTML = '';

    const allItem = document.createElement('div');
    allItem.className = 'folder-item' + (selectedFolderId === null ? ' active' : '');
    allItem.innerHTML = `
      <span class="folder-icon">${ICONS.allNotes}</span>
      <span class="folder-name">Alle Notizen</span>
      <span class="folder-count">${state.notes.length}</span>
    `;
    allItem.addEventListener('click', () => selectFolder(null));
    el.folderList.appendChild(allItem);

    if (state.folders.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'folder-divider';
      el.folderList.appendChild(divider);
    }

    for (const folder of state.folders) {
      const item = document.createElement('div');
      item.className = 'folder-item' + (selectedFolderId === folder.id ? ' active' : '');
      const count = notesInFolder(folder.id).length;
      item.innerHTML = `
        <button class="folder-color-dot" type="button" style="background:${folder.color || '#8e8e93'}" title="Ordnerfarbe ändern" aria-label="Ordnerfarbe ändern"></button>
        <input class="folder-name" value="${escapeHtml(folder.name)}" readonly />
        <span class="folder-count">${count}</span>
        <button class="folder-delete" type="button" aria-label="Ordner löschen" title="Ordner löschen">
          <svg viewBox="0 0 20 20" class="icon" style="width:14px;height:14px">${ICONS.trash}</svg>
        </button>
      `;
      const nameInput = item.querySelector('.folder-name');
      item.querySelector('.folder-color-dot').addEventListener('click', (e) => {
        e.stopPropagation();
        openFolderColorPopover(folder, e.currentTarget);
      });
      function enterFolderRename() {
        nameInput.readOnly = false;
        nameInput.focus();
        nameInput.select();
      }
      item.addEventListener('click', (e) => {
        if (e.target === nameInput && nameInput.readOnly === false) return;
        if (e.target.closest('.folder-delete') || e.target.closest('.folder-color-dot')) return;
        if (e.target === nameInput || e.target.closest('.folder-name')) {
          const now = Date.now();
          if (lastFolderTapId === folder.id && now - lastFolderTapAt < 400) {
            lastFolderTapAt = 0;
            lastFolderTapId = null;
            enterFolderRename();
            return;
          }
          lastFolderTapAt = now;
          lastFolderTapId = folder.id;
        }
        selectFolder(folder.id);
      });
      // Zusätzlich das native "dblclick" behalten (z. B. bei Maus-Doppelklicks, die
      // schnell genug sind, dass der DOM-Neuaufbau dazwischen nicht stört).
      nameInput.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        enterFolderRename();
      });
      nameInput.addEventListener('blur', () => {
        nameInput.readOnly = true;
        const newName = nameInput.value.trim() || 'Ohne Titel';
        if (newName !== folder.name) {
          folder.name = newName;
          schedulePersist();
        }
        nameInput.value = folder.name;
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameInput.blur();
        } else if (e.key === 'Escape') {
          nameInput.value = folder.name;
          nameInput.blur();
        }
      });
      item.querySelector('.folder-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFolder(folder.id);
      });
      el.folderList.appendChild(item);
    }
  }

  function selectFolder(folderId) {
    selectedFolderId = folderId;
    // Die offene Notiz gehört evtl. gar nicht zum neu gewählten Ordner – dann den
    // Editor leeren, statt eine Notiz aus einem anderen Ordner weiter anzuzeigen.
    const note = findNote(selectedNoteId);
    if (!note || (folderId !== null && note.folderId !== folderId)) {
      selectedNoteId = null;
    }
    renderFolders();
    renderNoteList();
    renderEditor();
    goToView('notes');
  }

  function createFolder() {
    const color = FOLDER_COLORS[state.folders.length % FOLDER_COLORS.length].hex;
    const folder = { id: uid(), name: 'Neuer Ordner', color };
    state.folders.push(folder);
    schedulePersist();
    renderFolders();
    requestAnimationFrame(() => {
      const items = el.folderList.querySelectorAll('.folder-item .folder-name');
      const input = items[items.length - 1];
      if (input) {
        input.readOnly = false;
        input.focus();
        input.select();
      }
    });
  }

  function deleteFolder(folderId) {
    const count = notesInFolder(folderId).length;
    const msg =
      count > 0
        ? `Ordner löschen? ${count} Notiz(en) darin werden zu "Alle Notizen" verschoben.`
        : 'Diesen Ordner löschen?';
    if (!confirm(msg)) return;
    state.notes.forEach((n) => {
      if (n.folderId === folderId) n.folderId = null;
    });
    state.folders = state.folders.filter((f) => f.id !== folderId);
    if (selectedFolderId === folderId) selectedFolderId = null;
    schedulePersist();
    renderFolders();
    renderNoteList();
  }

  // ---------- Ordnerfarbe-Popover ----------

  function buildFolderColorGrid() {
    el.folderColorGrid.innerHTML = '';
    for (const color of FOLDER_COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'format-swatch';
      btn.style.backgroundColor = color.hex;
      btn.title = color.name;
      btn.setAttribute('aria-label', `Ordner ${color.name} färben`);
      btn.dataset.hex = color.hex;
      el.folderColorGrid.appendChild(btn);
    }
  }

  function openFolderColorPopover(folder, anchorBtn) {
    buildFolderColorGrid();
    el.folderColorPopover.dataset.folderId = folder.id;
    const btnRect = anchorBtn.getBoundingClientRect();
    el.folderColorPopoverBackdrop.hidden = false;
    el.folderColorPopover.style.top = `${btnRect.bottom + 6}px`;
    el.folderColorPopover.style.left = `${Math.max(8, btnRect.left)}px`;
  }

  function closeFolderColorPopover() {
    el.folderColorPopoverBackdrop.hidden = true;
  }

  // ---------- Rendering: Note list ----------

  function renderNoteList() {
    const notes = getVisibleNotes();
    el.noteList.innerHTML = '';

    const label = selectedFolderId === null ? 'Alle Notizen' : (state.folders.find((f) => f.id === selectedFolderId) || {}).name || '';
    el.noteCount.textContent = notes.length > 0 ? `${label} (${notes.length})` : label;

    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'note-list-empty';
      empty.textContent = searchQuery ? 'Keine Ergebnisse' : 'Keine Notizen';
      el.noteList.appendChild(empty);
      return;
    }

    // Während der Suche flach anzeigen (Trefferrelevanz statt Hierarchie zählt hier),
    // sonst als Baum mit Unterseiten.
    const rows = searchQuery.trim()
      ? notes.map((note) => ({ note, depth: 0, hasChildren: false }))
      : buildNoteTree(notes);

    for (const { note, depth, hasChildren } of rows) {
      const item = document.createElement('div');
      item.className = 'note-item' + (note.id === selectedNoteId ? ' active' : '');
      item.style.paddingLeft = `${10 + depth * 16}px`;
      const preview = notePreviewText(note);

      if (hasChildren) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'note-toggle' + (collapsedNoteIds.has(note.id) ? '' : ' expanded');
        toggle.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.chevron}</svg>`;
        const label = collapsedNoteIds.has(note.id) ? 'Unterseiten einblenden' : 'Unterseiten ausblenden';
        toggle.title = label;
        toggle.setAttribute('aria-label', label);
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          if (collapsedNoteIds.has(note.id)) collapsedNoteIds.delete(note.id);
          else collapsedNoteIds.add(note.id);
          renderNoteList();
        });
        item.appendChild(toggle);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'note-toggle-spacer';
        item.appendChild(spacer);
      }

      const main = document.createElement('div');
      main.className = 'note-item-main';
      main.innerHTML = `
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-meta">
          <span>${formatDate(note.updatedAt)}</span>
          <span class="note-preview">${escapeHtml(preview)}</span>
        </div>
      `;
      item.appendChild(main);

      const addSubBtn = document.createElement('button');
      addSubBtn.type = 'button';
      addSubBtn.className = 'note-add-sub';
      addSubBtn.title = 'Unterseite hinzufügen';
      addSubBtn.setAttribute('aria-label', 'Unterseite hinzufügen');
      addSubBtn.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.plus}</svg>`;
      addSubBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        createNote(note.id);
      });
      item.appendChild(addSubBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'note-delete-btn';
      deleteBtn.title = 'Notiz löschen';
      deleteBtn.setAttribute('aria-label', 'Notiz löschen');
      deleteBtn.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.trash}</svg>`;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(note.id);
      });
      item.appendChild(deleteBtn);

      item.addEventListener('click', () => selectNote(note.id));
      el.noteList.appendChild(item);
    }
  }

  // ---------- Rendering: Editor ----------

  function selectNote(id) {
    selectedNoteId = id;
    goToView('editor');
    renderNoteList();
    renderEditor();
  }

  function renderEditor() {
    const note = findNote(selectedNoteId);
    if (!note) {
      el.editorEmpty.hidden = false;
      el.editor.hidden = true;
      return;
    }
    el.editorEmpty.hidden = true;
    el.editor.hidden = false;
    el.titleInput.value = note.title;
    el.editorDate.textContent = formatDate(note.updatedAt);
    autoGrow(el.titleInput);
    renderCanvas(note);
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function createNote(parentNoteId) {
    const now = Date.now();
    const parent = parentNoteId ? findNote(parentNoteId) : null;
    const note = {
      id: uid(),
      title: '',
      objects: [],
      ink: { strokes: [] },
      background: 'dots',
      folderId: parent ? parent.folderId : selectedFolderId,
      parentNoteId: parent ? parent.id : null,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(note);
    if (parent) collapsedNoteIds.delete(parent.id);
    schedulePersist();
    selectedNoteId = note.id;
    goToView('editor');
    renderFolders();
    renderNoteList();
    renderEditor();
    el.titleInput.focus();
  }

  function updateTitle() {
    const note = findNote(selectedNoteId);
    if (!note) return;
    note.title = el.titleInput.value.replace(/\n/g, ' ').trim();
    note.updatedAt = Date.now();
    schedulePersist();
    renderNoteList();
    el.editorDate.textContent = formatDate(note.updatedAt);
  }

  function deleteNote(id) {
    const note = findNote(id);
    if (!note) return;
    const descendants = descendantNoteIds(id);
    const msg =
      descendants.length > 0
        ? `Diese Notiz und ${descendants.length} Unterseite(n) löschen?`
        : 'Diese Notiz löschen?';
    if (!confirm(msg)) return;
    const toDelete = new Set([id, ...descendants]);
    state.notes = state.notes.filter((n) => !toDelete.has(n.id));
    schedulePersist();
    if (toDelete.has(selectedNoteId)) {
      selectedNoteId = null;
    }
    renderFolders();
    renderNoteList();
    renderEditor();
    goToView('notes');
  }

  // ---------- Freie Zeichenfläche: Objekte ----------

  let selectedObjectId = null;
  let dragState = null;
  let activeTextEdit = null; // { note, obj, objEl, body, overlay } – Formatierungs-Buttons sitzen global im Ribbon
  let lastSelectionRange = null;
  let headingTargetNode = null;
  let inkStrokeState = null;
  let drawColor = '#1c1c1e';
  let drawIsEraser = false;
  let drawModeActive = false;
  let drawTool = 'pen'; // 'pen' | 'select'
  let lassoPoints = null;
  let strokeSelection = null; // { ids: Set<string> }

  function bringToFront(note, obj) {
    const maxZ = note.objects.reduce((m, o) => Math.max(m, o.z || 0), 0);
    obj.z = maxZ + 1;
  }

  function nextPlacement(note, w, h) {
    const scrollLeft = el.canvasWorkspace.scrollLeft;
    const scrollTop = el.canvasWorkspace.scrollTop;
    const offset = (note.objects.length % 6) * 24;
    return {
      x: clamp(scrollLeft + 30 + offset, 0, Math.max(0, SURFACE_W - w)),
      y: clamp(scrollTop + 30 + offset, 0, Math.max(0, SURFACE_H - h)),
    };
  }

  function renderCanvas(note) {
    deactivateDrawMode();
    clearStrokeSelection();
    selectedObjectId = null;
    for (const child of [...el.canvasSurface.children]) {
      if (child !== el.inkLayer) child.remove();
    }
    if (!note) return;
    el.canvasSurface.dataset.bg = note.background || 'dots';
    const sorted = [...note.objects].sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const obj of sorted) {
      el.canvasSurface.insertBefore(buildObjectEl(note, obj), el.inkLayer);
    }
    sizeInkLayer();
    redrawInk(note);
  }

  function findObjEl(id) {
    return el.canvasSurface.querySelector(`[data-id="${id}"]`);
  }

  function applyObjRect(objEl, obj) {
    objEl.style.left = `${obj.x}px`;
    objEl.style.top = `${obj.y}px`;
    objEl.style.width = `${obj.w}px`;
    objEl.style.height = `${obj.h}px`;
    objEl.style.zIndex = obj.z || 1;
  }

  // Für bereits im HTML vorhandene Buttons (die globale Formatierungs-Ribbon-Leiste):
  // verhindert wie makeToolbarBtn, dass ein Klick den Fokus aus dem bearbeiteten
  // Text-Objekt entfernt und damit die gemerkte Textauswahl verliert.
  function wireRibbonBtn(btn, onClick) {
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', onClick);
  }

  function makeToolbarBtn(icon, danger, onClick, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'object-toolbar-btn' + (danger ? ' danger' : '');
    btn.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${icon}</svg>`;
    if (label) {
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }
    btn.addEventListener('pointerdown', (e) => {
      // Verhindert, dass ein Klick auf die Werkzeugleiste den Fokus (und damit die
      // gerade laufende Textauswahl) aus dem bearbeiteten Text-Objekt entfernt.
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function buildObjectEl(note, obj, autoFocusText) {
    const objEl = document.createElement('div');
    objEl.className = 'canvas-object';
    objEl.dataset.id = obj.id;
    objEl.dataset.type = obj.type;
    if (obj.type === 'text') objEl.dataset.style = obj.style || 'boxed';
    applyObjRect(objEl, obj);

    const mainToolbar = document.createElement('div');
    mainToolbar.className = 'object-toolbar object-toolbar-main';
    mainToolbar.appendChild(makeToolbarBtn(ICONS.trash, true, () => deleteObject(note, obj.id), 'Löschen'));
    objEl.appendChild(mainToolbar);

    if (obj.type === 'text') buildTextContent(note, obj, objEl, autoFocusText);
    else if (obj.type === 'image') buildImageContent(note, obj, objEl);
    else if (obj.type === 'pdf') buildPdfContent(note, obj, objEl);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startObjectResize(e, note, obj, objEl, handle);
    });
    objEl.appendChild(handle);

    return objEl;
  }

  // ----- Auswahl -----

  function selectObject(note, obj, objEl) {
    clearStrokeSelection();
    if (selectedObjectId !== obj.id) {
      const prev = el.canvasSurface.querySelector('.canvas-object.selected');
      if (prev && prev !== objEl) prev.classList.remove('selected');
      selectedObjectId = obj.id;
      objEl.classList.add('selected');
    }
    bringToFront(note, obj);
    objEl.style.zIndex = obj.z;
    schedulePersist();
  }

  function deselectAll() {
    const prev = el.canvasSurface.querySelector('.canvas-object.selected');
    if (prev) prev.classList.remove('selected');
    selectedObjectId = null;
    clearStrokeSelection();
  }

  // ----- Verschieben -----

  function startObjectDrag(e, note, obj, objEl) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    selectObject(note, obj, objEl);
    const children = note.objects
      .filter((o) => o.parentId === obj.id)
      .map((o) => ({ id: o.id, x: o.x, y: o.y }));
    dragState = {
      type: 'move',
      objId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      startObjX: obj.x,
      startObjY: obj.y,
      children,
      moved: false,
    };
    objEl.classList.add('dragging');
    try {
      objEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }
    objEl.addEventListener('pointermove', onObjectDragMove);
    objEl.addEventListener('pointerup', onObjectDragEnd);
    objEl.addEventListener('pointercancel', onObjectDragEnd);
  }

  function onObjectDragMove(e) {
    if (!dragState || dragState.type !== 'move') return;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    if (!note || !obj) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
    obj.x = clamp(dragState.startObjX + dx, -obj.w + 40, SURFACE_W - 40);
    obj.y = clamp(dragState.startObjY + dy, 0, SURFACE_H - 40);
    const objEl = findObjEl(obj.id);
    if (objEl) {
      objEl.style.left = `${obj.x}px`;
      objEl.style.top = `${obj.y}px`;
    }
    for (const child of dragState.children) {
      const childObj = getObj(note, child.id);
      if (!childObj) continue;
      childObj.x = child.x + dx;
      childObj.y = child.y + dy;
      const childEl = findObjEl(childObj.id);
      if (childEl) {
        childEl.style.left = `${childObj.x}px`;
        childEl.style.top = `${childObj.y}px`;
      }
    }
    redrawInk(note);
  }

  function onObjectDragEnd(e) {
    if (!dragState) return;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    const objEl = obj && findObjEl(obj.id);
    if (objEl) {
      objEl.classList.remove('dragging');
      objEl.removeEventListener('pointermove', onObjectDragMove);
      objEl.removeEventListener('pointerup', onObjectDragEnd);
      objEl.removeEventListener('pointercancel', onObjectDragEnd);
      try {
        objEl.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignorieren
      }
    }
    if (note && obj && obj.type === 'text' && dragState.moved) {
      updateAttachment(note, obj);
    }
    if (note && obj && dragState.moved) {
      const movedTextObjs = [obj, ...dragState.children.map((c) => getObj(note, c.id))]
        .filter((o) => o && o.type === 'text' && o.style === 'free');
      for (const textObj of movedTextObjs) {
        const textEl = findObjEl(textObj.id);
        const body = textEl && textEl.querySelector('.canvas-text-body');
        if (body) applyFreeLinesAlignment(note, textObj, body);
      }
    }
    dragState = null;
    if (note) schedulePersist();
  }

  function updateAttachment(note, textObj) {
    const centerX = textObj.x + textObj.w / 2;
    const centerY = textObj.y + textObj.h / 2;
    let target = null;
    for (const o of note.objects) {
      if (o.id === textObj.id) continue;
      if (o.type !== 'image' && o.type !== 'pdf') continue;
      if (centerX >= o.x && centerX <= o.x + o.w && centerY >= o.y && centerY <= o.y + o.h) {
        if (!target || (o.z || 0) > (target.z || 0)) target = o;
      }
    }
    if (target) {
      textObj.parentId = target.id;
      textObj.relX = (textObj.x - target.x) / target.w;
      textObj.relY = (textObj.y - target.y) / target.h;
      textObj.relW = textObj.w / target.w;
      textObj.relH = textObj.h / target.h;
    } else {
      textObj.parentId = null;
    }
  }

  // ----- Größe ändern -----

  function startObjectResize(e, note, obj, objEl, handle) {
    e.preventDefault();
    selectObject(note, obj, objEl);
    dragState = {
      type: 'resize',
      objId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      startW: obj.w,
      startH: obj.h,
    };
    objEl.classList.add('resizing');
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }
    handle.addEventListener('pointermove', onObjectResizeMove);
    handle.addEventListener('pointerup', onObjectResizeEnd);
    handle.addEventListener('pointercancel', onObjectResizeEnd);
  }

  function onObjectResizeMove(e) {
    if (!dragState || dragState.type !== 'resize') return;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    if (!note || !obj) return;
    const [minW, minH] = MIN_SIZES[obj.type] || [60, 60];
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    obj.w = clamp(dragState.startW + dx, minW, SURFACE_W - obj.x);
    obj.h = clamp(dragState.startH + dy, minH, SURFACE_H - obj.y);
    const objEl = findObjEl(obj.id);
    if (objEl) {
      objEl.style.width = `${obj.w}px`;
      objEl.style.height = `${obj.h}px`;
    }
    for (const child of note.objects) {
      if (child.parentId !== obj.id) continue;
      child.x = obj.x + child.relX * obj.w;
      child.y = obj.y + child.relY * obj.h;
      child.w = child.relW * obj.w;
      child.h = child.relH * obj.h;
      const childEl = findObjEl(child.id);
      if (childEl) {
        childEl.style.left = `${child.x}px`;
        childEl.style.top = `${child.y}px`;
        childEl.style.width = `${child.w}px`;
        childEl.style.height = `${child.h}px`;
      }
    }
    redrawInk(note);
  }

  function onObjectResizeEnd(e) {
    if (!dragState) return;
    const handle = e.currentTarget;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    const objEl = obj && findObjEl(obj.id);
    if (objEl) objEl.classList.remove('resizing');
    handle.removeEventListener('pointermove', onObjectResizeMove);
    handle.removeEventListener('pointerup', onObjectResizeEnd);
    handle.removeEventListener('pointercancel', onObjectResizeEnd);
    if (note && obj) {
      for (const child of note.objects) {
        if (child.parentId !== obj.id || child.type !== 'text' || child.style !== 'free') continue;
        const childEl = findObjEl(child.id);
        const body = childEl && childEl.querySelector('.canvas-text-body');
        if (body) applyFreeLinesAlignment(note, child, body);
      }
    }
    dragState = null;
    if (note) schedulePersist();
  }

  // ----- Text-Objekt -----

  const fontMetricsCache = new Map();
  const metricsCanvas = document.createElement('canvas');

  function measureFontMetrics(fontCss) {
    if (fontMetricsCache.has(fontCss)) return fontMetricsCache.get(fontCss);
    const ctx = metricsCanvas.getContext('2d');
    ctx.font = fontCss;
    const m = ctx.measureText('Hg');
    const metrics = {
      ascent: m.actualBoundingBoxAscent || m.fontBoundingBoxAscent || 12,
      descent: m.actualBoundingBoxDescent || m.fontBoundingBoxDescent || 4,
    };
    fontMetricsCache.set(fontCss, metrics);
    return metrics;
  }

  // Lässt "Freien Text" auf linierten Notizen wie handschriftlich auf den Linien
  // wirken: Zeilenabstand = Linienabstand, und die erste Zeile wird per
  // Innenabstand auf die nächste sichtbare Linie ausgerichtet.
  function applyFreeLinesAlignment(note, obj, body) {
    const useLines = obj.style === 'free' && note.background === 'lines';
    if (!useLines) {
      body.style.lineHeight = '';
      body.style.paddingTop = '';
      return;
    }
    const cs = getComputedStyle(body);
    const fontCss = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const { ascent, descent } = measureFontMetrics(fontCss);
    const baselineOffset = (LINE_PITCH - (ascent + descent)) / 2 + ascent;
    const bodyTopAbs = obj.y + OBJ_BORDER;
    const paddingTop = ((LINE_PHASE - bodyTopAbs - baselineOffset) % LINE_PITCH + LINE_PITCH) % LINE_PITCH;
    body.style.lineHeight = `${LINE_PITCH}px`;
    body.style.paddingTop = `${paddingTop}px`;
  }

  function realignFreeLinesForNote(note) {
    if (!note) return;
    for (const obj of note.objects) {
      if (obj.type !== 'text' || obj.style !== 'free') continue;
      const objEl = findObjEl(obj.id);
      const body = objEl && objEl.querySelector('.canvas-text-body');
      if (body) applyFreeLinesAlignment(note, obj, body);
    }
  }

  function buildTextContent(note, obj, objEl, autoFocus) {
    const body = document.createElement('div');
    body.className = 'canvas-text-body';
    body.dataset.placeholder = 'Text …';
    body.contentEditable = 'false';
    body.innerHTML = obj.html || '';
    updateTextEmptyState(body);
    applyFreeLinesAlignment(note, obj, body);
    objEl.appendChild(body);

    const overlay = document.createElement('div');
    overlay.className = 'text-drag-overlay';
    objEl.appendChild(overlay);

    // Eigene Doppelklick-Erkennung (zeitbasiert): Das native "dblclick"-Ereignis kann durch
    // die Pointer-Capture des Zieh-Handlers verschluckt werden, sobald der erste Klick bereits
    // ein Drag gestartet hat. Diese Variante ist davon unabhängig.
    let lastTapAt = 0;
    overlay.addEventListener('pointerdown', (e) => {
      const now = Date.now();
      if (now - lastTapAt < 400) {
        lastTapAt = 0;
        e.preventDefault();
        e.stopPropagation();
        enterTextEdit(note, obj, objEl, body, overlay);
        return;
      }
      lastTapAt = now;
      startObjectDrag(e, note, obj, objEl);
    });

    body.addEventListener('blur', () => exitTextEdit(obj, body, overlay));
    body.addEventListener('input', () => {
      stripInheritedHeadingOnFreshLine(body);
      saveTextObjContent(note, obj, body);
      updateTextEmptyState(body);
    });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') body.blur();
    });
    body.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      insertPlainTextAtCaret(text);
    });

    // Fokussieren funktioniert nur auf Elementen, die bereits im DOM hängen – zu
    // diesem Zeitpunkt ist objEl (bei Neuerstellung) meist noch nicht eingefügt.
    // Der Aufrufer muss daher nach dem Einfügen selbst enterTextEdit() aufrufen.
    if (autoFocus) queueMicrotask(() => { if (objEl.isConnected) enterTextEdit(note, obj, objEl, body, overlay); });
  }

  // contentEditable übernimmt beim Zeilenumbruch (Enter) die Klasse der aktuellen
  // Zeile 1:1 in die neue Zeile – eine Überschrift würde sich sonst auf jede
  // folgende Zeile "vererben". Direkt nach dem Split (Cursor steht am Anfang der
  // frisch erzeugten Zeile, deren vorherige Geschwister-Zeile dieselbe Überschrift
  // trägt) wird die geerbte Überschrift-Klasse daher wieder entfernt.
  function stripInheritedHeadingOnFreshLine(body) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!body.contains(range.startContainer)) return;
    const lineEl = lineBlockOf(range.startContainer, body);
    if (!isLineBlockEl(lineEl)) return;
    if (!lineEl.classList.contains('heading-1') && !lineEl.classList.contains('heading-2')) return;
    const atStart =
      (range.startContainer === lineEl && range.startOffset === 0) ||
      (range.startContainer.nodeType === Node.TEXT_NODE &&
        range.startContainer === lineEl.firstChild &&
        range.startOffset === 0);
    if (!atStart) return;
    const prev = lineEl.previousSibling;
    if (prev && prev.nodeType !== Node.TEXT_NODE && (prev.classList.contains('heading-1') || prev.classList.contains('heading-2'))) {
      lineEl.classList.remove('heading-1', 'heading-2');
      if (lineEl.classList.length === 0) lineEl.removeAttribute('class');
    }
  }

  function bodyToPlainText(body) {
    const clone = body.cloneNode(true);
    clone.querySelectorAll('div, p, br, li').forEach((el) => el.insertAdjacentText('beforebegin', '\n'));
    return clone.textContent.replace(/^\n/, '');
  }

  function saveTextObjContent(note, obj, body) {
    obj.html = body.innerHTML;
    obj.text = bodyToPlainText(body);
    note.updatedAt = Date.now();
    schedulePersist();
    renderNoteList();
  }

  function updateTextEmptyState(body) {
    body.classList.toggle('is-empty', body.textContent.trim() === '');
  }

  function insertPlainTextAtCaret(text) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Formatierungs-Buttons, die eine echte (nicht eingeklappte) Textauswahl brauchen –
  // sitzen fest in der oberen Werkzeugleiste (Ribbon), nicht mehr pro Text-Objekt.
  function selectionFormatBtns() {
    return [
      el.boldBtn, el.italicBtn, el.underlineBtn, el.strikeBtn, el.superscriptBtn, el.subscriptBtn,
      el.ribbonMarkerBtn, el.ribbonColorBtn, el.ribbonFontSizeBtn, el.ribbonFontFamilyBtn,
    ];
  }

  // Formatierungs-Buttons, die auf die ganze Zeile wirken und daher schon nutzbar
  // sind, sobald ein Text-Objekt bearbeitet wird – keine Auswahl nötig.
  function editingOnlyFormatBtns() {
    return [el.headingBtn, el.bulletListBtn, el.numberedListBtn];
  }

  function enterTextEdit(note, obj, objEl, body, overlay) {
    selectObject(note, obj, objEl);
    body.contentEditable = 'true';
    body.classList.add('editing');
    overlay.style.display = 'none';
    body.focus();
    activeTextEdit = { note, obj, objEl, body, overlay };
    lastSelectionRange = null;
    for (const btn of selectionFormatBtns()) btn.disabled = true;
    // Zeilen-weite Formatvorlagen (Überschrift, Listen) gelten für die ganze Zeile
    // und brauchen daher keine Textauswahl – sie sind während des ganzen
    // Bearbeitens nutzbar.
    for (const btn of editingOnlyFormatBtns()) btn.disabled = false;
  }

  function exitTextEdit(obj, body, overlay) {
    body.contentEditable = 'false';
    body.classList.remove('editing');
    overlay.style.display = '';
    const note = currentNote();
    if (note) saveTextObjContent(note, obj, body);
    for (const btn of selectionFormatBtns()) btn.disabled = true;
    for (const btn of editingOnlyFormatBtns()) btn.disabled = true;
    if (activeTextEdit && activeTextEdit.obj.id === obj.id) {
      activeTextEdit = null;
      lastSelectionRange = null;
    }
    closeAllFormatPopovers();
    // Ein leer gebliebenes Textobjekt (z. B. durch Klick auf die Fläche ohne
    // anschließende Eingabe) hinterlässt keine unsichtbare Karteileiche.
    if (note && !obj.text.trim() && !hasAttachedContent(note, obj.id)) {
      note.objects = note.objects.filter((o) => o.id !== obj.id);
      if (selectedObjectId === obj.id) selectedObjectId = null;
      const objEl = findObjEl(obj.id);
      if (objEl) objEl.remove();
      schedulePersist();
      renderNoteList();
    }
  }

  function hasAttachedContent(note, objId) {
    if (note.objects.some((o) => o.parentId === objId)) return true;
    if (note.ink.strokes.some((s) => s.parentId === objId)) return true;
    return false;
  }

  // Merkt sich die zuletzt markierte (nicht eingeklappte) Textauswahl im gerade
  // bearbeiteten Text-Objekt, damit die Formatierungs-Buttons auch nach einem Klick
  // in die Werkzeugleiste noch wissen, was formatiert werden soll.
  document.addEventListener('selectionchange', () => {
    if (!activeTextEdit) return;
    const sel = window.getSelection();
    const valid =
      sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      activeTextEdit.body.contains(sel.getRangeAt(0).commonAncestorContainer);
    lastSelectionRange = valid ? sel.getRangeAt(0).cloneRange() : null;
    for (const btn of selectionFormatBtns()) btn.disabled = !valid;
  });

  // Erweitert die Range-Grenzen nach außen auf die nächste Element-Ebene, solange sie
  // exakt am Rand eines umschließenden Elements liegen (z. B. ein komplett markiertes
  // Wort). Ohne das würde extractContents() nur den Text herauslösen und das
  // umschließende <mark>/<span> leer zurücklassen, statt es mitzunehmen – wodurch
  // "Markierung entfernen" oder erneutes Formatieren bei exakt getroffenen Wörtern
  // wirkungslos bliebe.
  function isLineBlockEl(node) {
    return node.nodeType !== Node.TEXT_NODE && (node.tagName === 'DIV' || node.tagName === 'P');
  }

  function expandRangeToElementBoundaries(range, root) {
    function climb(container, offset, isStart) {
      let node = container;
      let off = offset;
      while (node !== root) {
        // Ein Zeilen-Container (<div>/<p>, von contentEditable pro Zeile erzeugt) darf
        // nie als Ganzes erfasst werden – sonst landet ein Block-Element im neuen
        // <mark>/<span>, was beim Rendern einen ungewollten Zeilenumbruch verursacht.
        // Die Prüfung muss VOR dem Hochklettern greifen (auf dem aktuellen Knoten,
        // bevor er zur Einheit seines Elternelements befördert wird).
        if (isLineBlockEl(node)) break;
        const flush = isStart
          ? off === 0
          : node.nodeType === Node.TEXT_NODE
            ? off === node.textContent.length
            : off === node.childNodes.length;
        if (!flush) break;
        const parent = node.parentNode;
        if (!parent) break;
        const idx = Array.prototype.indexOf.call(parent.childNodes, node);
        node = parent;
        off = isStart ? idx : idx + 1;
      }
      return { node, off };
    }
    const s = climb(range.startContainer, range.startOffset, true);
    const e = climb(range.endContainer, range.endOffset, false);
    range.setStart(s.node, s.off);
    range.setEnd(e.node, e.off);
  }

  // Findet den Zeilen-Block (direktes Kind von root, das den Knoten enthält – bei
  // der ersten, unumhüllten Zeile ist das ggf. ein reiner Textknoten).
  function lineBlockOf(node, root) {
    let n = node;
    while (n.parentNode !== root && n !== root) n = n.parentNode;
    return n;
  }

  // Zerlegt eine Range, die über mehrere Zeilen (<div>-Blöcke) hinweggeht, in je
  // einen Teilbereich pro betroffener Zeile. Ein <mark>/<span> darf nie mehrere
  // Zeilen gleichzeitig umschließen, sonst landet ein Block-Element im Inline-
  // Wrapper und erzeugt einen ungewollten Zeilenumbruch.
  function splitRangeByLine(range, root) {
    const children = Array.prototype.slice.call(root.childNodes);
    // Liegt eine Grenze direkt auf root (z. B. durch selectNodeContents(root)), ist
    // der Offset dort bereits ein Kindindex von root – sonst über den umschließenden
    // Zeilen-Block auflösen.
    const startIdx =
      range.startContainer === root ? range.startOffset : children.indexOf(lineBlockOf(range.startContainer, root));
    const endIdx =
      range.endContainer === root ? range.endOffset - 1 : children.indexOf(lineBlockOf(range.endContainer, root));
    if (startIdx === endIdx) return [range];
    const fullEnd = (child) => (child.nodeType === Node.TEXT_NODE ? child.textContent.length : child.childNodes.length);
    const ranges = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const child = children[i];
      const subRange = document.createRange();
      // Grenzen von root (z. B. selectNodeContents) bedeuten "voller Block" – nur eine
      // Grenze, die bereits INNERHALB des Blocks liegt, behält ihre genaue Teil-Position.
      if (i === startIdx && range.startContainer !== root) subRange.setStart(range.startContainer, range.startOffset);
      else subRange.setStart(child, 0);
      if (i === endIdx && range.endContainer !== root) subRange.setEnd(range.endContainer, range.endOffset);
      else subRange.setEnd(child, fullEnd(child));
      if (!subRange.collapsed) ranges.push(subRange);
    }
    return ranges;
  }

  function withActiveSelection(fn) {
    if (!activeTextEdit || !lastSelectionRange) {
      closeAllFormatPopovers();
      return;
    }
    const { note, obj, body } = activeTextEdit;
    const ranges = splitRangeByLine(lastSelectionRange, body);
    for (const range of ranges) {
      expandRangeToElementBoundaries(range, body);
      fn(range, note, obj, body);
    }
    saveTextObjContent(note, obj, body);
    updateTextEmptyState(body);
    lastSelectionRange = null;
    for (const btn of selectionFormatBtns()) btn.disabled = true;
    closeAllFormatPopovers();
    body.focus();
  }

  function applyInlineCommand(command) {
    if (!activeTextEdit) return;
    const { body } = activeTextEdit;
    body.focus();
    if (lastSelectionRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastSelectionRange);
    }
    document.execCommand(command);
    saveTextObjContent(activeTextEdit.note, activeTextEdit.obj, body);
  }

  function applyListCommand(command) {
    if (!activeTextEdit) return;
    const { body } = activeTextEdit;
    body.focus();
    if (lastSelectionRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastSelectionRange);
    }
    document.execCommand(command);
    updateTextEmptyState(body);
    saveTextObjContent(activeTextEdit.note, activeTextEdit.obj, body);
  }

  function wrapSelectionWithStyle(range, styleProp, styleValue) {
    const span = document.createElement('span');
    span.style[styleProp] = styleValue;
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }

  function unwrapStyleFromRange(range, styleProp) {
    const frag = range.extractContents();
    frag.querySelectorAll('span').forEach((spanEl) => {
      spanEl.style[styleProp] = '';
      if (!spanEl.getAttribute('style')) {
        const parent = spanEl.parentNode;
        while (spanEl.firstChild) parent.insertBefore(spanEl.firstChild, spanEl);
        parent.removeChild(spanEl);
      }
    });
    range.insertNode(frag);
  }

  function applyHighlightToRange(range, hex, alpha) {
    const mark = document.createElement('mark');
    mark.className = 'marker';
    mark.style.backgroundColor = hexToRgba(hex, alpha);
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }

  function removeHighlightFromRange(range) {
    const frag = range.extractContents();
    frag.querySelectorAll('mark.marker').forEach((markEl) => {
      const parent = markEl.parentNode;
      while (markEl.firstChild) parent.insertBefore(markEl.firstChild, markEl);
      parent.removeChild(markEl);
    });
    range.insertNode(frag);
  }

  function buildMarkerGrid() {
    if (el.markerGrid.childElementCount > 0) return;
    for (const strength of MARKER_STRENGTHS) {
      for (const color of MARKER_COLORS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'format-swatch';
        btn.style.backgroundColor = hexToRgba(color.hex, strength.alpha);
        btn.title = `${color.name} · ${strength.label}`;
        btn.setAttribute('aria-label', `${color.name}, ${strength.label} markieren`);
        btn.dataset.hex = color.hex;
        btn.dataset.alpha = String(strength.alpha);
        el.markerGrid.appendChild(btn);
      }
    }
  }

  function buildColorGrid() {
    if (el.colorGrid.childElementCount > 0) return;
    for (const color of TEXT_COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'format-swatch';
      btn.style.backgroundColor = color.hex;
      btn.title = color.name;
      btn.setAttribute('aria-label', `Text in ${color.name} färben`);
      btn.dataset.hex = color.hex;
      el.colorGrid.appendChild(btn);
    }
  }

  function buildFontSizeList() {
    if (el.fontSizeList.childElementCount > 0) return;
    for (const size of FONT_SIZES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popover-item';
      btn.textContent = size.px ? `${size.label} (${size.px}px)` : size.label;
      if (size.px) btn.dataset.px = String(size.px);
      el.fontSizeList.appendChild(btn);
    }
  }

  function buildFontFamilyList() {
    if (el.fontFamilyList.childElementCount > 0) return;
    for (const font of FONT_FAMILIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popover-item';
      btn.textContent = font.label;
      if (font.css) {
        btn.dataset.family = font.css;
        btn.style.fontFamily = font.css;
      }
      el.fontFamilyList.appendChild(btn);
    }
  }

  function openFormatPopover(backdropEl, popoverEl, anchorBtn) {
    if (!activeTextEdit || !lastSelectionRange) return;
    buildMarkerGrid();
    buildColorGrid();
    buildFontSizeList();
    buildFontFamilyList();
    closeAllFormatPopovers();
    const btnRect = anchorBtn.getBoundingClientRect();
    backdropEl.hidden = false;
    const popoverWidth = 320; // entspricht max-width in .popover-wide
    const left = Math.min(Math.max(8, btnRect.left), window.innerWidth - popoverWidth - 8);
    popoverEl.style.top = `${btnRect.bottom + 6}px`;
    popoverEl.style.left = `${Math.max(8, left)}px`;
  }

  function closeAllFormatPopovers() {
    el.markerPopoverBackdrop.hidden = true;
    el.colorPopoverBackdrop.hidden = true;
    el.fontSizePopoverBackdrop.hidden = true;
    el.headingPopoverBackdrop.hidden = true;
    el.fontFamilyPopoverBackdrop.hidden = true;
  }

  // Sammelt alle Top-Level-Knoten (direkte Kinder von root), die zur "Zeile" des
  // übergebenen Knotens gehören. Bei einer bereits umhüllten Zeile (<div>/<p>,
  // von contentEditable pro Enter erzeugt) ist das genau dieser eine Block. Bei der
  // ersten, noch unumhüllten Zeile können es mehrere Geschwister-Knoten sein (z. B.
  // "<b>Fett</b> Rest" ohne umschließendes <div>), daher werden alle Nachbarn bis
  // zum nächsten Zeilen-Block gesammelt.
  function getCurrentLineNodes(caretNode, root) {
    const anchor = lineBlockOf(caretNode, root);
    if (isLineBlockEl(anchor)) return [anchor];
    const children = Array.prototype.slice.call(root.childNodes);
    const idx = children.indexOf(anchor);
    if (idx === -1) return [anchor];
    let start = idx;
    let end = idx;
    while (start > 0 && !isLineBlockEl(children[start - 1])) start--;
    while (end < children.length - 1 && !isLineBlockEl(children[end + 1])) end++;
    return children.slice(start, end + 1);
  }

  // Stellt sicher, dass die aktuelle Zeile ein eigenes Element (<div>) ist, das eine
  // CSS-Klasse (z. B. für eine Überschrift-Formatvorlage) tragen kann, und gibt es
  // zurück. Eine noch unumhüllte erste Zeile wird dafür einmalig in ein <div> verpackt.
  function ensureLineWrapper(caretNode, root) {
    const nodes = getCurrentLineNodes(caretNode, root);
    if (nodes.length === 1 && isLineBlockEl(nodes[0])) return nodes[0];
    const div = document.createElement('div');
    nodes[0].parentNode.insertBefore(div, nodes[0]);
    for (const n of nodes) div.appendChild(n);
    return div;
  }

  function buildHeadingList() {
    if (el.headingList.childElementCount > 0) return;
    const options = [
      { level: null, label: 'Normal' },
      { level: 1, label: 'Überschrift 1' },
      { level: 2, label: 'Überschrift 2' },
    ];
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popover-item heading-option' + (opt.level ? ` heading-${opt.level}` : '');
      btn.textContent = opt.label;
      if (opt.level) btn.dataset.level = String(opt.level);
      el.headingList.appendChild(btn);
    }
  }

  function openHeadingPopover(headingBtn) {
    if (!activeTextEdit) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !activeTextEdit.body.contains(sel.getRangeAt(0).startContainer)) return;
    headingTargetNode = sel.getRangeAt(0).startContainer;
    buildHeadingList();
    closeAllFormatPopovers();
    const btnRect = headingBtn.getBoundingClientRect();
    el.headingPopoverBackdrop.hidden = false;
    el.headingPopover.style.top = `${btnRect.bottom + 6}px`;
    el.headingPopover.style.left = `${Math.max(8, btnRect.left)}px`;
  }

  function applyHeadingLevel(level) {
    if (!activeTextEdit || !headingTargetNode) {
      closeAllFormatPopovers();
      return;
    }
    const { note, obj, body } = activeTextEdit;
    if (body.contains(headingTargetNode)) {
      const lineEl = ensureLineWrapper(headingTargetNode, body);
      lineEl.classList.remove('heading-1', 'heading-2');
      if (level) lineEl.classList.add(`heading-${level}`);
      else if (lineEl.classList.length === 0) lineEl.removeAttribute('class');
      saveTextObjContent(note, obj, body);
      updateTextEmptyState(body);
    }
    headingTargetNode = null;
    closeAllFormatPopovers();
    body.focus();
  }

  function applyMarkerChoice(hex, alpha) {
    withActiveSelection((range) => applyHighlightToRange(range, hex, alpha));
  }

  function removeMarkerFromSelection() {
    withActiveSelection((range) => removeHighlightFromRange(range));
  }

  function applyColorChoice(hex) {
    withActiveSelection((range) => {
      if (hex) wrapSelectionWithStyle(range, 'color', hex);
      else unwrapStyleFromRange(range, 'color');
    });
  }

  function applyFontSizeChoice(px) {
    withActiveSelection((range) => {
      if (px) wrapSelectionWithStyle(range, 'fontSize', `${px}px`);
      else unwrapStyleFromRange(range, 'fontSize');
    });
  }

  function applyFontFamilyChoice(css) {
    withActiveSelection((range) => {
      if (css) wrapSelectionWithStyle(range, 'fontFamily', css);
      else unwrapStyleFromRange(range, 'fontFamily');
    });
  }

  // ----- Zeichnen (globale Tinten-Ebene über der ganzen Fläche) -----

  function widthForPointer(pointerType, pressure, eraser) {
    if (eraser) return 20;
    if (pointerType === 'pen') {
      const p = pressure > 0 ? pressure : 0.5;
      return 1.5 + p * 3.5;
    }
    if (pointerType === 'touch') return 5;
    return 2.5;
  }

  function sizeInkLayer() {
    const dpr = window.devicePixelRatio || 1;
    el.inkLayer.width = Math.round(SURFACE_W * dpr);
    el.inkLayer.height = Math.round(SURFACE_H * dpr);
    el.inkLayer.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function strokeAbsolutePoints(note, stroke) {
    if (!stroke.parentId) return stroke.points;
    const parent = getObj(note, stroke.parentId);
    if (!parent) return stroke.points;
    return stroke.points.map((p) => ({
      x: parent.x + p.x * parent.w,
      y: parent.y + p.y * parent.h,
      width: p.width * parent.w,
    }));
  }

  function drawStrokeAbs(ctx, stroke, pts) {
    if (!pts || pts.length === 0) return;
    ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) {
      ctx.lineWidth = pts[0].width;
      ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      ctx.stroke();
      return;
    }
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = pts[i].width;
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawLassoPath(ctx, points) {
    if (points.length < 2) return;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function redrawInk(note) {
    const ctx = el.inkLayer.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, SURFACE_W, SURFACE_H);
    for (const stroke of (note.ink && note.ink.strokes) || []) {
      drawStrokeAbs(ctx, stroke, strokeAbsolutePoints(note, stroke));
    }
    if (lassoPoints && lassoPoints.length > 1) drawLassoPath(ctx, lassoPoints);
    ctx.restore();
  }

  function startInkStroke(e) {
    const note = currentNote();
    if (!note || !drawModeActive) return;
    e.preventDefault();
    const rect = el.canvasSurface.getBoundingClientRect();
    const widthPx = widthForPointer(e.pointerType, e.pressure, drawIsEraser);
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top, width: widthPx };
    const stroke = { id: uid(), color: drawColor, eraser: drawIsEraser, parentId: null, points: [point] };
    note.ink.strokes.push(stroke);
    inkStrokeState = { note };
    try {
      el.inkLayer.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }
    el.inkLayer.addEventListener('pointermove', onInkMove);
    el.inkLayer.addEventListener('pointerup', onInkEnd);
    el.inkLayer.addEventListener('pointercancel', onInkEnd);
    redrawInk(note);
  }

  function onInkMove(e) {
    if (!inkStrokeState) return;
    const { note } = inkStrokeState;
    const rect = el.canvasSurface.getBoundingClientRect();
    const widthPx = widthForPointer(e.pointerType, e.pressure, drawIsEraser);
    const stroke = note.ink.strokes[note.ink.strokes.length - 1];
    stroke.points.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: widthPx });
    redrawInk(note);
  }

  function onInkEnd() {
    if (!inkStrokeState) return;
    el.inkLayer.removeEventListener('pointermove', onInkMove);
    el.inkLayer.removeEventListener('pointerup', onInkEnd);
    el.inkLayer.removeEventListener('pointercancel', onInkEnd);
    inkStrokeState = null;
    schedulePersist();
  }

  function activateDrawMode() {
    const note = currentNote();
    if (!note) return;
    deselectAll();
    drawModeActive = true;
    el.canvasSurface.classList.add('draw-mode');
    el.drawModeBtn.classList.add('active');
    el.drawToolbar.hidden = false;
    setDrawTool('pen');
  }

  function deactivateDrawMode() {
    if (!drawModeActive) return;
    drawModeActive = false;
    el.canvasSurface.classList.remove('draw-mode');
    el.drawModeBtn.classList.remove('active');
    el.drawToolbar.hidden = true;
    clearStrokeSelection();
  }

  function toggleDrawMode() {
    if (drawModeActive) deactivateDrawMode();
    else activateDrawMode();
  }

  function setDrawTool(tool) {
    drawTool = tool;
    clearStrokeSelection();
    el.drawPenToolBtn.classList.toggle('active', tool === 'pen');
    el.drawSelectToolBtn.classList.toggle('active', tool === 'select');
  }

  function setDrawColor(color) {
    drawColor = color;
    drawIsEraser = false;
    el.drawEraserBtn.classList.remove('active');
    for (const btn of el.drawColors.querySelectorAll('.draw-color')) {
      btn.classList.toggle('active', btn.dataset.color === color);
    }
  }

  function toggleDrawEraser() {
    drawIsEraser = !drawIsEraser;
    el.drawEraserBtn.classList.toggle('active', drawIsEraser);
  }

  function undoInk() {
    const note = currentNote();
    if (!note) return;
    note.ink.strokes.pop();
    redrawInk(note);
    schedulePersist();
    renderNoteList();
  }

  function clearInk() {
    const note = currentNote();
    if (!note) return;
    if (!confirm('Alle Zeichnungen auf dieser Fläche löschen?')) return;
    note.ink.strokes = [];
    clearStrokeSelection();
    redrawInk(note);
    schedulePersist();
    renderNoteList();
  }

  // ----- Striche direkt anklicken (auch außerhalb des Zeichnen-Modus) -----

  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    return Math.hypot(p.x - cx, p.y - cy);
  }

  function hitTestStroke(note, point) {
    const tolerance = 10;
    for (let i = note.ink.strokes.length - 1; i >= 0; i--) {
      const stroke = note.ink.strokes[i];
      const pts = strokeAbsolutePoints(note, stroke);
      if (pts.length === 0) continue;
      if (pts.length === 1) {
        if (Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= pts[0].width / 2 + tolerance) {
          return stroke.id;
        }
        continue;
      }
      for (let j = 1; j < pts.length; j++) {
        const w = pts[j].width / 2 + tolerance;
        if (distanceToSegment(point, pts[j - 1], pts[j]) <= w) return stroke.id;
      }
    }
    return null;
  }

  function selectSingleStroke(note, id) {
    deselectAll();
    strokeSelection = { ids: new Set([id]) };
    renderStrokeSelectionBox(note);
  }

  // ----- Lasso-Auswahl einzelner Striche -----

  function pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function startLasso(e) {
    const note = currentNote();
    if (!note || !drawModeActive) return;
    e.preventDefault();
    clearStrokeSelection();
    const rect = el.canvasSurface.getBoundingClientRect();
    lassoPoints = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    try {
      el.inkLayer.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }
    el.inkLayer.addEventListener('pointermove', onLassoMove);
    el.inkLayer.addEventListener('pointerup', onLassoEnd);
    el.inkLayer.addEventListener('pointercancel', onLassoCancel);
    redrawInk(note);
  }

  function onLassoMove(e) {
    if (!lassoPoints) return;
    const rect = el.canvasSurface.getBoundingClientRect();
    lassoPoints.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    redrawInk(currentNote());
  }

  function onLassoEnd() {
    if (!lassoPoints) return;
    el.inkLayer.removeEventListener('pointermove', onLassoMove);
    el.inkLayer.removeEventListener('pointerup', onLassoEnd);
    el.inkLayer.removeEventListener('pointercancel', onLassoCancel);
    const note = currentNote();
    const lasso = lassoPoints;
    lassoPoints = null;
    if (note && lasso.length > 2) selectStrokesInLasso(note, lasso);
    redrawInk(note);
  }

  function onLassoCancel() {
    el.inkLayer.removeEventListener('pointermove', onLassoMove);
    el.inkLayer.removeEventListener('pointerup', onLassoEnd);
    el.inkLayer.removeEventListener('pointercancel', onLassoCancel);
    lassoPoints = null;
    redrawInk(currentNote());
  }

  function selectStrokesInLasso(note, lasso) {
    const ids = new Set();
    for (const stroke of note.ink.strokes) {
      const pts = strokeAbsolutePoints(note, stroke);
      if (!pts.length) continue;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      if (pointInPolygon({ x: cx, y: cy }, lasso)) ids.add(stroke.id);
    }
    if (ids.size === 0) return;
    strokeSelection = { ids };
    renderStrokeSelectionBox(note);
  }

  function selectionBoundingBox(note) {
    if (!strokeSelection) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const stroke of note.ink.strokes) {
      if (!strokeSelection.ids.has(stroke.id)) continue;
      for (const p of strokeAbsolutePoints(note, stroke)) {
        minX = Math.min(minX, p.x - p.width / 2);
        minY = Math.min(minY, p.y - p.width / 2);
        maxX = Math.max(maxX, p.x + p.width / 2);
        maxY = Math.max(maxY, p.y + p.width / 2);
      }
    }
    if (!isFinite(minX)) return null;
    const pad = 6;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }

  function commonParentId(note) {
    let pid;
    for (const s of note.ink.strokes) {
      if (!strokeSelection.ids.has(s.id)) continue;
      const spid = s.parentId || null;
      if (pid === undefined) pid = spid;
      else if (pid !== spid) return null;
    }
    return pid || null;
  }

  function findAttachTarget(note, box) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    let target = null;
    for (const o of note.objects) {
      if (o.type !== 'image' && o.type !== 'pdf') continue;
      if (cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) {
        if (!target || (o.z || 0) > (target.z || 0)) target = o;
      }
    }
    return target;
  }

  function bakeSelectionAbsolute(note) {
    for (const stroke of note.ink.strokes) {
      if (!strokeSelection.ids.has(stroke.id)) continue;
      if (stroke.parentId) {
        stroke.points = strokeAbsolutePoints(note, stroke);
        stroke.parentId = null;
      }
    }
  }

  function attachSelection(note, target) {
    if (!target) return;
    for (const s of note.ink.strokes) {
      if (!strokeSelection.ids.has(s.id)) continue;
      const abs = strokeAbsolutePoints(note, s);
      s.points = abs.map((p) => ({
        x: (p.x - target.x) / target.w,
        y: (p.y - target.y) / target.h,
        width: p.width / target.w,
      }));
      s.parentId = target.id;
    }
    schedulePersist();
    redrawInk(note);
    renderStrokeSelectionBox(note);
    renderNoteList();
  }

  function detachSelection(note) {
    bakeSelectionAbsolute(note);
    schedulePersist();
    redrawInk(note);
    renderStrokeSelectionBox(note);
  }

  function deleteSelection(note) {
    if (!strokeSelection) return;
    note.ink.strokes = note.ink.strokes.filter((s) => !strokeSelection.ids.has(s.id));
    clearStrokeSelection();
    redrawInk(note);
    schedulePersist();
    renderNoteList();
  }

  function updateClearButtonLabel() {
    const label = strokeSelection ? 'Auswahl löschen' : 'Alles löschen';
    el.drawClearBtn.title = label;
    el.drawClearBtn.setAttribute('aria-label', label);
  }

  function clearStrokeSelection() {
    strokeSelection = null;
    const existing = document.getElementById('strokeSelectionBox');
    if (existing) existing.remove();
    updateClearButtonLabel();
  }

  function renderStrokeSelectionBox(note) {
    const existing = document.getElementById('strokeSelectionBox');
    if (existing) existing.remove();
    if (!strokeSelection) return;
    updateClearButtonLabel();
    const box = selectionBoundingBox(note);
    if (!box) {
      strokeSelection = null;
      return;
    }

    const boxEl = document.createElement('div');
    boxEl.className = 'stroke-selection-box';
    boxEl.id = 'strokeSelectionBox';
    boxEl.style.left = `${box.x}px`;
    boxEl.style.top = `${box.y}px`;
    boxEl.style.width = `${box.w}px`;
    boxEl.style.height = `${box.h}px`;

    const toolbar = document.createElement('div');
    toolbar.className = 'object-toolbar';
    const parentId = commonParentId(note);
    if (parentId) {
      toolbar.appendChild(
        makeToolbarBtn(ICONS.unlink, false, () => detachSelection(note), 'Vom Bild/PDF lösen')
      );
    } else {
      const target = findAttachTarget(note, box);
      const btn = makeToolbarBtn(
        ICONS.link,
        false,
        () => attachSelection(note, target),
        target
          ? 'An diesem Bild/PDF anheften (bewegt und skaliert sich dann mit)'
          : 'Anheften nur möglich, wenn die Auswahl auf einem Bild/PDF liegt'
      );
      if (!target) btn.disabled = true;
      toolbar.appendChild(btn);
    }
    toolbar.appendChild(makeToolbarBtn(ICONS.trash, true, () => deleteSelection(note), 'Auswahl löschen'));
    boxEl.appendChild(toolbar);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.addEventListener('pointerdown', (e) => startSelectionResize(e, box));
    boxEl.appendChild(handle);

    boxEl.addEventListener('pointerdown', (e) => startSelectionDrag(e));

    el.canvasSurface.appendChild(boxEl);
  }

  function startSelectionDrag(e) {
    const note = currentNote();
    if (!note || !strokeSelection) return;
    e.preventDefault();
    bakeSelectionAbsolute(note);
    const startX = e.clientX;
    const startY = e.clientY;
    const snapshot = note.ink.strokes
      .filter((s) => strokeSelection.ids.has(s.id))
      .map((s) => ({ stroke: s, points: s.points.map((p) => ({ ...p })) }));
    const boxEl = document.getElementById('strokeSelectionBox');
    try {
      boxEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      for (const { stroke, points } of snapshot) {
        stroke.points = points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
      }
      redrawInk(note);
      const box = selectionBoundingBox(note);
      if (box) {
        boxEl.style.left = `${box.x}px`;
        boxEl.style.top = `${box.y}px`;
        boxEl.style.width = `${box.w}px`;
        boxEl.style.height = `${box.h}px`;
      }
    }
    function onUp() {
      boxEl.removeEventListener('pointermove', onMove);
      boxEl.removeEventListener('pointerup', onUp);
      boxEl.removeEventListener('pointercancel', onUp);
      schedulePersist();
      renderNoteList();
    }
    boxEl.addEventListener('pointermove', onMove);
    boxEl.addEventListener('pointerup', onUp);
    boxEl.addEventListener('pointercancel', onUp);
  }

  function startSelectionResize(e, startBox) {
    e.preventDefault();
    e.stopPropagation();
    const note = currentNote();
    if (!note || !strokeSelection) return;
    bakeSelectionAbsolute(note);
    const startX = e.clientX;
    const startY = e.clientY;
    const snapshot = note.ink.strokes
      .filter((s) => strokeSelection.ids.has(s.id))
      .map((s) => ({ stroke: s, points: s.points.map((p) => ({ ...p })) }));
    const handle = e.currentTarget;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignorieren
    }
    const boxEl = document.getElementById('strokeSelectionBox');

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newW = Math.max(20, startBox.w + dx);
      const newH = Math.max(20, startBox.h + dy);
      const sx = newW / startBox.w;
      const sy = newH / startBox.h;
      const savg = (sx + sy) / 2;
      for (const { stroke, points } of snapshot) {
        stroke.points = points.map((p) => ({
          x: startBox.x + (p.x - startBox.x) * sx,
          y: startBox.y + (p.y - startBox.y) * sy,
          width: p.width * savg,
        }));
      }
      redrawInk(note);
      boxEl.style.width = `${newW}px`;
      boxEl.style.height = `${newH}px`;
    }
    function onUp() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      schedulePersist();
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  // ----- Bild-Objekt -----

  function buildImageContent(note, obj, objEl) {
    const img = document.createElement('img');
    img.className = 'canvas-image-el';
    img.src = obj.src;
    img.draggable = false;
    objEl.appendChild(img);

    objEl.addEventListener('pointerdown', (e) => startObjectDrag(e, note, obj, objEl));
  }

  // ----- PDF-Objekt -----

  let pdfJsLoadPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfJsLoadPromise) return pdfJsLoadPromise;
    pdfJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/vendor/pdf.js';
      script.onload = () => {
        if (!window.pdfjsLib) {
          reject(new Error('pdf.js wurde geladen, aber pdfjsLib ist nicht verfügbar.'));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error('pdf.js konnte nicht geladen werden.'));
      document.head.appendChild(script);
    });
    return pdfJsLoadPromise;
  }

  function buildPdfContent(note, obj, objEl) {
    const img = document.createElement('img');
    img.className = 'canvas-image-el';
    img.src = obj.src;
    img.draggable = false;
    objEl.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'pdf-badge';
    const pages = obj.pageCount > 1 ? `PDF · ${obj.pageCount} Seiten` : 'PDF';
    badge.textContent = obj.fileName ? `${pages} · ${obj.fileName}` : pages;
    objEl.appendChild(badge);

    objEl.addEventListener('pointerdown', (e) => startObjectDrag(e, note, obj, objEl));
  }

  async function addPdfObjectFromFile(file) {
    const note = currentNote();
    if (!note || !file) return;
    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      await page.render({ canvasContext: renderCanvas.getContext('2d'), viewport }).promise;
      const src = renderCanvas.toDataURL('image/png');

      const maxW = 360;
      const scale = Math.min(1, maxW / viewport.width);
      const w = Math.round(viewport.width * scale) || 200;
      const h = Math.round(viewport.height * scale) || 260;
      const { x, y } = nextPlacement(note, w, h);
      const objData = {
        id: uid(), type: 'pdf', x, y, w, h, z: 0,
        src, pageCount: pdf.numPages, fileName: file.name,
      };
      bringToFront(note, objData);
      note.objects.push(objData);
      const objEl = buildObjectEl(note, objData);
      el.canvasSurface.insertBefore(objEl, el.inkLayer);
      selectObject(note, objData, objEl);
      schedulePersist();
      renderNoteList();
    } catch (err) {
      console.error('PDF konnte nicht eingefügt werden:', err);
      alert('Diese PDF-Datei konnte nicht eingefügt werden.');
    }
  }

  // ----- Objekte hinzufügen / löschen -----

  function addTextObject(style) {
    const note = currentNote();
    if (!note) return;
    const { x, y } = nextPlacement(note, 220, 120);
    addTextObjectAt(note, x, y, style);
  }

  // Erstellt sofort ein freies Textobjekt an der übergebenen Stelle und aktiviert
  // direkt den Bearbeitungsmodus – für das OneNote-artige "irgendwo hinklicken und
  // lostippen". Bleibt das Objekt leer, entfernt exitTextEdit() es beim Verlassen
  // wieder automatisch, sodass kein unsichtbarer "Müll" auf der Fläche zurückbleibt.
  function addTextObjectAt(note, x, y, style) {
    const w = 220, h = 120;
    const clampedX = clamp(x, 0, Math.max(0, SURFACE_W - w));
    const clampedY = clamp(y, 0, Math.max(0, SURFACE_H - h));
    const obj = {
      id: uid(), type: 'text', x: clampedX, y: clampedY, w, h, z: 0, text: '', html: '', parentId: null,
      style: style === 'boxed' ? 'boxed' : 'free',
    };
    bringToFront(note, obj);
    note.objects.push(obj);
    const objEl = buildObjectEl(note, obj, true);
    el.canvasSurface.insertBefore(objEl, el.inkLayer);
    schedulePersist();
    renderNoteList();
    return obj;
  }

  function addImageObjectFromFile(file) {
    const note = currentNote();
    if (!note || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxW = 360;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale) || 200;
        const h = Math.round(img.naturalHeight * scale) || 150;
        const { x, y } = nextPlacement(note, w, h);
        const obj = { id: uid(), type: 'image', x, y, w, h, z: 0, src };
        bringToFront(note, obj);
        note.objects.push(obj);
        const objEl = buildObjectEl(note, obj);
        el.canvasSurface.insertBefore(objEl, el.inkLayer);
        selectObject(note, obj, objEl);
        schedulePersist();
        renderNoteList();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function deleteObject(note, id) {
    if (!confirm('Objekt löschen?')) return;
    for (const o of note.objects) {
      if (o.parentId === id) o.parentId = null;
    }
    // Angeheftete Zeichen-Striche lösen (in absolute Koordinaten umrechnen), bevor das Objekt verschwindet
    for (const s of note.ink.strokes) {
      if (s.parentId === id) {
        s.points = strokeAbsolutePoints(note, s);
        s.parentId = null;
      }
    }
    note.objects = note.objects.filter((o) => o.id !== id);
    if (selectedObjectId === id) selectedObjectId = null;
    const objEl = findObjEl(id);
    if (objEl) objEl.remove();
    note.updatedAt = Date.now();
    schedulePersist();
    redrawInk(note);
    renderNoteList();
  }

  // ---------- Move popover ----------

  function openMovePopover() {
    const note = findNote(selectedNoteId);
    if (!note) return;
    el.movePopoverList.innerHTML = '';

    const options = [{ id: null, name: 'Alle Notizen' }, ...state.folders];
    for (const opt of options) {
      const item = document.createElement('div');
      item.className = 'popover-item' + (note.folderId === opt.id ? ' current' : '');
      item.innerHTML = `<span class="folder-icon">${opt.id === null ? ICONS.allNotes : ICONS.folder}</span><span>${escapeHtml(opt.name)}</span>`;
      item.addEventListener('click', () => {
        // Unterseiten ziehen beim Verschieben mit, damit die Seite mitsamt ihrem
        // Unterbaum im selben Ordner bleibt. Die verschobene Notiz selbst wird von
        // ihrer bisherigen Eltern-Notiz gelöst (sonst bliebe eine Referenz auf eine
        // Notiz in einem anderen Ordner bestehen, die z. B. beim späteren Löschen
        // der alten Eltern-Notiz ungewollt mitgelöscht würde).
        if (note.folderId !== opt.id) {
          const subtreeIds = new Set([note.id, ...descendantNoteIds(note.id)]);
          for (const n of state.notes) {
            if (subtreeIds.has(n.id)) n.folderId = opt.id;
          }
          note.parentNoteId = null;
        }
        note.updatedAt = Date.now();
        schedulePersist();
        closeMovePopover();
        renderFolders();
        renderNoteList();
      });
      el.movePopoverList.appendChild(item);
    }

    const btnRect = el.moveNoteBtn.getBoundingClientRect();
    el.popoverBackdrop.hidden = false;
    const popover = el.movePopover;
    popover.style.top = `${btnRect.bottom + 6}px`;
    popover.style.left = `${Math.max(8, btnRect.right - 240)}px`;
  }

  function closeMovePopover() {
    el.popoverBackdrop.hidden = true;
  }

  // ---------- Hintergrund-Popover ----------

  function openBackgroundPopover() {
    const btnRect = el.backgroundBtn.getBoundingClientRect();
    el.backgroundPopoverBackdrop.hidden = false;
    el.backgroundPopover.style.top = `${btnRect.bottom + 6}px`;
    el.backgroundPopover.style.left = `${Math.max(8, btnRect.right - 200)}px`;
  }

  function closeBackgroundPopover() {
    el.backgroundPopoverBackdrop.hidden = true;
  }

  function setBackground(value) {
    const note = currentNote();
    if (!note) return;
    note.background = value;
    note.updatedAt = Date.now();
    el.canvasSurface.dataset.bg = value;
    realignFreeLinesForNote(note);
    schedulePersist();
    closeBackgroundPopover();
  }

  // ---------- Textart-Popover ----------

  function openTextStylePopover() {
    const btnRect = el.addTextBtn.getBoundingClientRect();
    el.textStylePopoverBackdrop.hidden = false;
    const popoverWidth = 320; // entspricht max-width in .popover-wide
    const left = Math.min(Math.max(8, btnRect.left), window.innerWidth - popoverWidth - 8);
    el.textStylePopover.style.top = `${btnRect.bottom + 6}px`;
    el.textStylePopover.style.left = `${Math.max(8, left)}px`;
  }

  function closeTextStylePopover() {
    el.textStylePopoverBackdrop.hidden = true;
  }

  // ---------- Responsive view state (mobile) ----------

  function goToView(view) {
    el.app.classList.remove('view-folders', 'view-notes', 'view-editor');
    el.app.classList.add(`view-${view}`);
  }

  function isMobileLayout() {
    return window.matchMedia('(max-width: 780px)').matches;
  }

  function setupBackButtons() {
    const listBack = document.createElement('button');
    listBack.className = 'back-btn';
    listBack.innerHTML = '<svg viewBox="0 0 20 20" class="icon"><path d="M12.5 3.5 6 10l6.5 6.5 1.4-1.4L8.8 10l5.1-5.1z"/></svg><span>Ordner</span>';
    listBack.addEventListener('click', () => goToView('folders'));
    document.querySelector('.note-list-header').prepend(listBack);

    const editorBack = document.createElement('button');
    editorBack.className = 'back-btn';
    editorBack.innerHTML = '<svg viewBox="0 0 20 20" class="icon"><path d="M12.5 3.5 6 10l6.5 6.5 1.4-1.4L8.8 10l5.1-5.1z"/></svg><span>Notizen</span>';
    editorBack.addEventListener('click', () => goToView('notes'));
    document.querySelector('.editor-toolbar').prepend(editorBack);
  }

  // ---------- Spaltentrenner (manuell verschiebbar) ----------

  const LAYOUT_STORAGE_KEY = 'appleNotesPwa.layout.v1';

  function loadLayoutPrefs() {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignorieren, Standardbreiten verwenden
    }
    return {};
  }

  function saveLayoutPrefs(prefs) {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      // ignorieren
    }
  }

  function makeColumnResizer(resizerEl, cssVar, min, max) {
    let startX = 0;
    let startWidth = 0;

    function onMove(e) {
      const dx = e.clientX - startX;
      el.app.style.setProperty(cssVar, `${clamp(startWidth + dx, min, max)}px`);
    }

    function onUp(e) {
      resizerEl.classList.remove('dragging');
      try {
        resizerEl.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignorieren
      }
      resizerEl.removeEventListener('pointermove', onMove);
      resizerEl.removeEventListener('pointerup', onUp);
      resizerEl.removeEventListener('pointercancel', onUp);
      const prefs = loadLayoutPrefs();
      prefs[cssVar] = getComputedStyle(el.app).getPropertyValue(cssVar).trim();
      saveLayoutPrefs(prefs);
    }

    resizerEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = parseFloat(getComputedStyle(el.app).getPropertyValue(cssVar)) || min;
      resizerEl.classList.add('dragging');
      try {
        resizerEl.setPointerCapture(e.pointerId);
      } catch (err) {
        // ignorieren
      }
      resizerEl.addEventListener('pointermove', onMove);
      resizerEl.addEventListener('pointerup', onUp);
      resizerEl.addEventListener('pointercancel', onUp);
    });
  }

  function initColumnResizers() {
    const prefs = loadLayoutPrefs();
    if (prefs['--sidebar-width']) el.app.style.setProperty('--sidebar-width', prefs['--sidebar-width']);
    if (prefs['--list-width']) el.app.style.setProperty('--list-width', prefs['--list-width']);
    makeColumnResizer(el.sidebarResizer, '--sidebar-width', 180, 420);
    makeColumnResizer(el.listResizer, '--list-width', 220, 520);
  }

  // ---------- Event wiring ----------

  function init() {
    setupBackButtons();
    initColumnResizers();
    goToView(isMobileLayout() ? 'folders' : 'notes');

    renderFolders();
    renderNoteList();
    renderEditor();

    el.newFolderBtn.addEventListener('click', createFolder);
    el.newNoteBtn.addEventListener('click', createNote);
    el.moveNoteBtn.addEventListener('click', openMovePopover);
    el.popoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.popoverBackdrop) closeMovePopover();
    });

    el.addTextBtn.addEventListener('click', openTextStylePopover);
    wireRibbonBtn(el.headingBtn, () => openHeadingPopover(el.headingBtn));
    wireRibbonBtn(el.boldBtn, () => applyInlineCommand('bold'));
    wireRibbonBtn(el.italicBtn, () => applyInlineCommand('italic'));
    wireRibbonBtn(el.underlineBtn, () => applyInlineCommand('underline'));
    wireRibbonBtn(el.strikeBtn, () => applyInlineCommand('strikeThrough'));
    wireRibbonBtn(el.superscriptBtn, () => applyInlineCommand('superscript'));
    wireRibbonBtn(el.subscriptBtn, () => applyInlineCommand('subscript'));
    wireRibbonBtn(el.bulletListBtn, () => applyListCommand('insertUnorderedList'));
    wireRibbonBtn(el.numberedListBtn, () => applyListCommand('insertOrderedList'));
    wireRibbonBtn(el.ribbonMarkerBtn, () => openFormatPopover(el.markerPopoverBackdrop, el.markerPopover, el.ribbonMarkerBtn));
    wireRibbonBtn(el.ribbonColorBtn, () => openFormatPopover(el.colorPopoverBackdrop, el.colorPopover, el.ribbonColorBtn));
    wireRibbonBtn(el.ribbonFontSizeBtn, () => openFormatPopover(el.fontSizePopoverBackdrop, el.fontSizePopover, el.ribbonFontSizeBtn));
    wireRibbonBtn(el.ribbonFontFamilyBtn, () => openFormatPopover(el.fontFamilyPopoverBackdrop, el.fontFamilyPopover, el.ribbonFontFamilyBtn));
    el.addImageBtn.addEventListener('click', () => el.imageFileInput.click());
    el.imageFileInput.addEventListener('change', () => {
      const file = el.imageFileInput.files[0];
      if (file) addImageObjectFromFile(file);
      el.imageFileInput.value = '';
    });
    el.addPdfBtn.addEventListener('click', () => el.pdfFileInput.click());
    el.pdfFileInput.addEventListener('change', () => {
      const file = el.pdfFileInput.files[0];
      if (file) addPdfObjectFromFile(file);
      el.pdfFileInput.value = '';
    });
    el.canvasSurface.addEventListener('pointerdown', (e) => {
      if (e.target !== el.canvasSurface) return;
      const note = currentNote();
      if (note && !drawModeActive) {
        const rect = el.canvasSurface.getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const hitId = hitTestStroke(note, point);
        if (hitId) {
          selectSingleStroke(note, hitId);
          return;
        }
        // Standardmäßig würde der Browser den Fokus beim Klick auf dieses (nicht
        // fokussierbare) Element wieder verwerfen – das würde das neue Textobjekt
        // sofort wieder aus dem Bearbeitungsmodus werfen, bevor der Nutzer tippen kann.
        e.preventDefault();
        deselectAll();
        addTextObjectAt(note, point.x - 10, point.y - 10, 'free');
        return;
      }
      deselectAll();
    });

    el.drawModeBtn.addEventListener('click', toggleDrawMode);
    el.inkLayer.addEventListener('pointerdown', (e) => {
      if (drawTool === 'select') startLasso(e);
      else startInkStroke(e);
    });
    el.drawPenToolBtn.addEventListener('click', () => setDrawTool('pen'));
    el.drawSelectToolBtn.addEventListener('click', () => setDrawTool('select'));
    el.drawEraserBtn.addEventListener('click', toggleDrawEraser);
    el.drawUndoBtn.addEventListener('click', undoInk);
    el.drawClearBtn.addEventListener('click', () => {
      if (strokeSelection) {
        const note = currentNote();
        if (note) deleteSelection(note);
      } else {
        clearInk();
      }
    });
    el.drawDoneBtn.addEventListener('click', deactivateDrawMode);
    el.drawColors.addEventListener('click', (e) => {
      const btn = e.target.closest('.draw-color');
      if (btn) setDrawColor(btn.dataset.color);
    });

    el.backgroundBtn.addEventListener('click', openBackgroundPopover);
    el.backgroundPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.backgroundPopoverBackdrop) closeBackgroundPopover();
    });
    el.backgroundPopover.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item');
      if (item) setBackground(item.dataset.bg);
    });

    el.textStylePopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.textStylePopoverBackdrop) closeTextStylePopover();
    });
    el.textStylePopover.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item-rich');
      if (item) {
        closeTextStylePopover();
        addTextObject(item.dataset.style);
      }
    });

    el.folderColorPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.folderColorPopoverBackdrop) closeFolderColorPopover();
    });
    el.folderColorGrid.addEventListener('click', (e) => {
      const swatch = e.target.closest('.format-swatch');
      if (!swatch) return;
      const folder = state.folders.find((f) => f.id === el.folderColorPopover.dataset.folderId);
      if (folder) {
        folder.color = swatch.dataset.hex;
        schedulePersist();
        renderFolders();
      }
      closeFolderColorPopover();
    });

    // Verhindert, dass ein Klick in einem Formatierungs-Popover den Fokus (und damit
    // die gemerkte Textauswahl) aus dem bearbeiteten Text-Objekt entfernt.
    el.markerPopover.addEventListener('pointerdown', (e) => e.preventDefault());
    el.markerPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.markerPopoverBackdrop) closeAllFormatPopovers();
    });
    el.markerGrid.addEventListener('click', (e) => {
      const swatch = e.target.closest('.format-swatch');
      if (swatch) applyMarkerChoice(swatch.dataset.hex, Number(swatch.dataset.alpha));
    });
    el.markerRemoveBtn.addEventListener('click', removeMarkerFromSelection);

    el.colorPopover.addEventListener('pointerdown', (e) => e.preventDefault());
    el.colorPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.colorPopoverBackdrop) closeAllFormatPopovers();
    });
    el.colorGrid.addEventListener('click', (e) => {
      const swatch = e.target.closest('.format-swatch');
      if (swatch) applyColorChoice(swatch.dataset.hex);
    });
    el.colorResetBtn.addEventListener('click', () => applyColorChoice(null));

    el.fontSizePopover.addEventListener('pointerdown', (e) => e.preventDefault());
    el.fontSizePopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.fontSizePopoverBackdrop) closeAllFormatPopovers();
    });
    el.fontSizeList.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item');
      if (item) applyFontSizeChoice(item.dataset.px ? Number(item.dataset.px) : null);
    });

    el.fontFamilyPopover.addEventListener('pointerdown', (e) => e.preventDefault());
    el.fontFamilyPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.fontFamilyPopoverBackdrop) closeAllFormatPopovers();
    });
    el.fontFamilyList.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item');
      if (item) applyFontFamilyChoice(item.dataset.family || null);
    });

    el.headingPopover.addEventListener('pointerdown', (e) => e.preventDefault());
    el.headingPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.headingPopoverBackdrop) closeAllFormatPopovers();
    });
    el.headingList.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item');
      if (item) applyHeadingLevel(item.dataset.level ? Number(item.dataset.level) : null);
    });

    el.titleInput.addEventListener('input', () => {
      autoGrow(el.titleInput);
      updateTitle();
    });

    el.titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.titleInput.blur();
      }
    });

    let searchDebounce = null;
    el.searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchQuery = el.searchInput.value;
        renderNoteList();
      }, 120);
    });

    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
