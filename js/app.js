(() => {
  'use strict';

  // Grundgröße der Fläche – wächst bei Bedarf mit, wenn ein Objekt (z. B. eine
  // vielseitige PDF) darüber hinausragt, siehe updateSurfaceSize().
  const BASE_SURFACE_W = 1600;
  const BASE_SURFACE_H = 2200;
  const MAX_OBJ_DIM = 20000;
  let SURFACE_W = BASE_SURFACE_W;
  let SURFACE_H = BASE_SURFACE_H;
  const MIN_SIZES = { text: [140, 60], image: [60, 60], pdf: [60, 60], credential: [200, 70], reminder: [200, 70] };
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
    openFile: '<svg viewBox="0 0 20 20"><path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5V12h-1.5v3.5h-11v-11H8V3z" fill="currentColor"/><path d="M11 3h6v6h-1.5V5.6l-6.15 6.15-1.06-1.06L14.44 4.5H11V3z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 20 20"><path d="M10 2.5a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0V5A2.5 2.5 0 0 0 10 2.5z" fill="currentColor"/><path d="M5.5 9v.5a4.5 4.5 0 0 0 9 0V9H16v.5a6 6 0 0 1-5.25 5.95V17.5h-1.5v-2.05A6 6 0 0 1 4 9.5V9h1.5z" fill="currentColor"/></svg>',
    transcript: '<svg viewBox="0 0 20 20"><path d="M3 4h14v1.6H3V4zm0 4.2h14v1.6H3V8.2zm0 4.2h9v1.6H3v-1.6z" fill="currentColor"/></svg>',
    rename: '<svg viewBox="0 0 20 20"><path d="M13.6 2.4a1.9 1.9 0 0 1 2.7 2.7L7.4 14 4 15l1-3.4 8.6-9.2z" fill="currentColor"/></svg>',
    key: '<svg viewBox="0 0 20 20"><path d="M8 2a4.5 4.5 0 0 0-4.24 6h-.01L1 10.75V15h1.5v-1.5H4V12h1.5v-1.5h1.28A4.5 4.5 0 1 0 8 2zm3.3 4.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" fill="currentColor"/></svg>',
    restore: '<svg viewBox="0 0 20 20"><path d="M4 10a6 6 0 1 0 1.9-4.36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.2 3.8v3.6h3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bell: '<svg viewBox="0 0 20 20"><path d="M10 2a1 1 0 0 1 1 1v.6a5.5 5.5 0 0 1 4 5.3v2.9l1.3 2.1c.3.5-.05 1.1-.6 1.1H12a2 2 0 0 1-4 0H4.3c-.55 0-.9-.6-.6-1.1L5 11.8V8.9a5.5 5.5 0 0 1 4-5.3V3a1 1 0 0 1 1-1z" fill="currentColor"/></svg>',
    textCursor: '<svg viewBox="0 0 20 20"><path d="M8.5 3h3v1.6h-.5A1.4 1.4 0 0 0 9.6 6v8a1.4 1.4 0 0 0 1.4 1.4h.5V17h-3a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill="currentColor"/><rect x="3.5" y="3" width="3.5" height="1.6" fill="currentColor"/><rect x="3.5" y="15.4" width="3.5" height="1.6" fill="currentColor"/><rect x="13" y="3" width="3.5" height="1.6" fill="currentColor"/><rect x="13" y="15.4" width="3.5" height="1.6" fill="currentColor"/></svg>',
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

  // Echte Punktgrößen wie in Word/OneNote (Umrechnung 1pt = 1.333px), nicht
  // mehr beschreibende Namen wie früher ("Klein"/"Groß"). "11" entspricht der
  // normalen Standardgröße der App (15px) und bleibt daher bewusst ohne
  // eigenen px-Wert (px: null = "keine Überschreibung, normale Größe").
  const FONT_SIZES = [
    { px: 11, label: '8' },
    { px: 12, label: '9' },
    { px: 13, label: '10' },
    { px: null, label: '11' },
    { px: 16, label: '12' },
    { px: 19, label: '14' },
    { px: 21, label: '16' },
    { px: 24, label: '18' },
    { px: 27, label: '20' },
    { px: 32, label: '24' },
    { px: 37, label: '28' },
    { px: 48, label: '36' },
    { px: 64, label: '48' },
    { px: 96, label: '72' },
  ];

  // Echte, bekannte Schriftartnamen wie in Word statt beschreibender
  // Kategorien ("Serifenlos"/"Handschrift" etc.). "Calibri" ist die normale
  // Standardschrift der App (siehe --font in styles.css) und bleibt daher
  // ohne eigenen css-Wert.
  const FONT_FAMILIES = [
    { css: null, label: 'Calibri' },
    { css: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { css: '"Times New Roman", Times, serif', label: 'Times New Roman' },
    { css: 'Georgia, serif', label: 'Georgia' },
    { css: '"Courier New", Courier, monospace', label: 'Courier New' },
    { css: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
    { css: '"Comic Sans MS", "Comic Sans", cursive', label: 'Comic Sans MS' },
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
   * @typedef {{id:string, title:string, objects:Array, ink:{strokes:Stroke[]}, background:'dots'|'lines'|'blank', folderId:?string, parentNoteId:?string, order:number, createdAt:number, updatedAt:number}} Note
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

  // Vergibt einmalig eine feste, manuelle Reihenfolge (note.order) an alle Notizen,
  // die noch keine haben (ältere gespeicherte Notizen). Geschwister (gleiche
  // parentNoteId) werden dabei genau in der bisher angezeigten Reihenfolge
  // (zuletzt geändert zuerst) nummeriert, damit sich beim ersten Laden nach diesem
  // Update optisch nichts verschiebt - erst ein manuelles Ziehen ändert sie danach.
  function assignMissingNoteOrder(notes) {
    const byParent = new Map();
    for (const note of notes) {
      const key = note.parentNoteId || null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(note);
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => b.updatedAt - a.updatedAt);
      siblings.forEach((note, i) => {
        if (typeof note.order !== 'number') note.order = i;
      });
    }
  }

  // Kleinster vorhandener order-Wert unter den Geschwistern (gleiche parentNoteId)
  // minus 1, damit eine neue Notiz immer ganz oben in ihrer Ebene erscheint -
  // entspricht dem bisherigen Verhalten ("neueste zuerst").
  function nextOrderForParent(parentNoteId) {
    const key = parentNoteId || null;
    const siblings = state.notes.filter((n) => (n.parentNoteId || null) === key);
    if (siblings.length === 0) return 0;
    return Math.min(...siblings.map((n) => n.order ?? 0)) - 1;
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

  async function loadState() {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.folders)) {
          parsed.notes.forEach(migrateNote);
          sanitizeNoteParents(parsed.notes);
          assignMissingNoteOrder(parsed.notes);
          parsed.notes.forEach(pruneEmptyTextObjects);
          parsed.folders.forEach((f, i) => {
            if (!f.color) f.color = FOLDER_COLORS[i % FOLDER_COLORS.length].hex;
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Konnte gespeicherte Notizen nicht vom Server laden:', e);
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
      'Alle Notizen werden auf dem Server gespeichert und sind von jedem Gerät aus erreichbar.';
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
          order: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  }

  // Platzhalter, bis init() den echten Stand vom Server geladen hat (async) –
  // sonst würden Funktionen, die vor init() auf `state` zugreifen, ins Leere laufen.
  let state = createDefaultState();
  // Sonder-"Ordner" für gelöschte Hauptseiten (kein echter Eintrag in
  // state.folders) - siehe deleteNote()/restoreNote() und renderFolders().
  const TRASH_FOLDER_ID = '__trash__';
  // Ob der Papierkorb gerade in der Ordnerliste eingeblendet ist - lebt nur
  // im Arbeitsspeicher dieser Sitzung (nicht gespeichert): nach Abmelden
  // bzw. einem echten Neuladen ist er wieder versteckt.
  let trashVisible = false;
  let selectedFolderId = null; // null = "Alle Notizen"
  // Beim (Neu-)Start ist bewusst keine Notiz vorausgewählt - man landet in
  // der leeren Editor-Ansicht (Willkommens-Grafik) statt zufällig in der
  // zuletzt bearbeiteten Notiz.
  let selectedNoteId = null;
  // Merkt je Hauptüberschrift (selectedFolderId, null = "Alle Notizen") die
  // zuletzt dort geöffnete Notiz - siehe selectFolder().
  const lastSelectedNoteIdByFolder = new Map();
  let searchQuery = '';
  let collapsedNoteIds = new Set();
  // Doppelklick-Erkennung für Ordner-Umbenennung: da jeder Klick renderFolders()
  // (kompletten DOM-Neuaufbau) auslöst, würde ein natives "dblclick"-Event nie
  // ankommen, weil das Eingabefeld zwischen den beiden Klicks ausgetauscht wird.
  // Daher zeitbasiert über die Ordner-id verfolgen statt über den DOM-Knoten.
  let lastFolderTapAt = 0;
  let lastFolderTapId = null;
  let saveTimer = null;

  let persistFailWarningShown = false;

  async function persist() {
    state.notes.forEach(pruneEmptyTextObjects);
    try {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      persistFailWarningShown = false;
    } catch (e) {
      console.error('Speichern fehlgeschlagen:', e);
      // Ein fehlgeschlagenes Speichern darf nie unbemerkt bleiben – sonst wirkt eine
      // Änderung in der laufenden Sitzung übernommen, geht beim nächsten Neuladen
      // aber kommentarlos wieder verloren. Nur einmal pro anhaltender Fehlserie
      // warnen, um bei mehreren Änderungen in Folge nicht mit wiederholten
      // Meldungen zu nerven.
      if (!persistFailWarningShown) {
        persistFailWarningShown = true;
        alert(
          'Achtung: Diese Änderung konnte NICHT auf dem Server gespeichert werden ' +
          '(keine Verbindung zum Server?). Sie geht beim Neuladen der Seite wieder ' +
          'verloren, wenn du jetzt nichts unternimmst.\n\nBitte prüfe deine ' +
          'Internet-/Netzwerkverbindung.'
        );
      }
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
    allNotesBtn: document.getElementById('allNotesBtn'),
    allNotesCount: document.getElementById('allNotesCount'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    sidebarUserBtn: document.getElementById('sidebarUserBtn'),
    settingsPopoverBackdrop: document.getElementById('settingsPopoverBackdrop'),
    settingsPopover: document.getElementById('settingsPopover'),
    trashVisibleCheckbox: document.getElementById('trashVisibleCheckbox'),
    openReminderSettingsBtn: document.getElementById('openReminderSettingsBtn'),
    reminderSettingsModalBackdrop: document.getElementById('reminderSettingsModalBackdrop'),
    reminderSettingsModal: document.getElementById('reminderSettingsModal'),
    reminderEmailInput: document.getElementById('reminderEmailInput'),
    smtpHostInput: document.getElementById('smtpHostInput'),
    smtpPortInput: document.getElementById('smtpPortInput'),
    smtpSecureSelect: document.getElementById('smtpSecureSelect'),
    smtpUserInput: document.getElementById('smtpUserInput'),
    smtpPasswordInput: document.getElementById('smtpPasswordInput'),
    smtpFromNameInput: document.getElementById('smtpFromNameInput'),
    settingsSaveStatus: document.getElementById('settingsSaveStatus'),
    settingsCancelBtn: document.getElementById('settingsCancelBtn'),
    settingsSaveBtn: document.getElementById('settingsSaveBtn'),
    noteList: document.getElementById('noteList'),
    noteCount: document.getElementById('noteCount'),
    collapseAllBtn: document.getElementById('collapseAllBtn'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    searchInput: document.getElementById('searchInput'),
    editorEmpty: document.getElementById('editorEmpty'),
    editor: document.getElementById('editor'),
    titleInput: document.getElementById('titleInput'),
    moveNoteBtn: document.getElementById('moveNoteBtn'),
    popoverBackdrop: document.getElementById('popoverBackdrop'),
    movePopover: document.getElementById('movePopover'),
    movePopoverList: document.getElementById('movePopoverList'),
    addTextBtn: document.getElementById('addTextBtn'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
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
    ribbonFontSizeLabel: document.getElementById('ribbonFontSizeLabel'),
    ribbonFontFamilyBtn: document.getElementById('ribbonFontFamilyBtn'),
    ribbonFontFamilyLabel: document.getElementById('ribbonFontFamilyLabel'),
    fontFamilyPopoverBackdrop: document.getElementById('fontFamilyPopoverBackdrop'),
    fontFamilyPopover: document.getElementById('fontFamilyPopover'),
    fontFamilyList: document.getElementById('fontFamilyList'),
    textStylePopoverBackdrop: document.getElementById('textStylePopoverBackdrop'),
    textStylePopover: document.getElementById('textStylePopover'),
    pdfModePopoverBackdrop: document.getElementById('pdfModePopoverBackdrop'),
    pdfModePopover: document.getElementById('pdfModePopover'),
    pdfInlineFileModeBtn: document.getElementById('pdfInlineFileModeBtn'),
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
    addAudioBtn: document.getElementById('addAudioBtn'),
    addFileBtn: document.getElementById('addFileBtn'),
    addCredentialBtn: document.getElementById('addCredentialBtn'),
    credentialPopoverBackdrop: document.getElementById('credentialPopoverBackdrop'),
    credentialPopover: document.getElementById('credentialPopover'),
    credentialTitleInput: document.getElementById('credentialTitleInput'),
    credentialFieldsList: document.getElementById('credentialFieldsList'),
    credentialAddFieldBtn: document.getElementById('credentialAddFieldBtn'),
    credentialCancelBtn: document.getElementById('credentialCancelBtn'),
    credentialSaveBtn: document.getElementById('credentialSaveBtn'),
    addReminderBtn: document.getElementById('addReminderBtn'),
    reminderPopoverBackdrop: document.getElementById('reminderPopoverBackdrop'),
    reminderPopover: document.getElementById('reminderPopover'),
    reminderTitleInput: document.getElementById('reminderTitleInput'),
    reminderDateInput: document.getElementById('reminderDateInput'),
    reminderTextInput: document.getElementById('reminderTextInput'),
    reminderDeleteBtn: document.getElementById('reminderDeleteBtn'),
    reminderCancelBtn: document.getElementById('reminderCancelBtn'),
    reminderSaveBtn: document.getElementById('reminderSaveBtn'),
    fileFileInput: document.getElementById('fileFileInput'),
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

  // Eine Notiz gilt als "im Papierkorb", wenn sie selbst oder eine ihrer
  // Vorfahren-Hauptseiten als gelöscht markiert ist (trashedAt) - so werden
  // beim Löschen einer Hauptseite automatisch auch alle Unterseiten mit
  // "unsichtbar", ohne dass jede einzeln markiert werden muss, und beim
  // Wiederherstellen der Hauptseite sind sie ebenso automatisch wieder da.
  function isTrashed(note) {
    let current = note;
    while (current) {
      if (current.trashedAt) return true;
      current = current.parentNoteId ? findNote(current.parentNoteId) : null;
    }
    return false;
  }

  // "Leer" im Sinn von "darf beim Löschen sofort endgültig verschwinden,
  // statt in den Papierkorb zu wandern": keine Unterseiten UND kein eigener
  // Inhalt (weder Text/Bild/etc.-Objekte noch Zeichnungen).
  function isNoteEmpty(note) {
    const hasChildren = state.notes.some((n) => n.parentNoteId === note.id);
    // Absichtlich defensiv: sehr alte, schon lange bestehende Notizen könnten
    // (aus einer Zeit vor diesem Feld) kein "objects"/"ink" haben.
    const objects = note.objects || [];
    const strokes = (note.ink && note.ink.strokes) || [];
    return !hasChildren && objects.length === 0 && strokes.length === 0;
  }

  function notesInFolder(folderId) {
    if (folderId === TRASH_FOLDER_ID) {
      return state.notes.filter((n) => isTrashed(n));
    }
    return state.notes.filter((n) => !isTrashed(n) && (folderId === null ? true : n.folderId === folderId));
  }

  function noteSearchableText(note) {
    const objectText = note.objects
      .filter((o) => o.type === 'text')
      .map((o) => o.text || '')
      .join(' ');
    const credentialText = note.objects
      .filter((o) => o.type === 'credential')
      .map((o) => `${o.title || ''} ${(o.fields || []).map((f) => `${f.label} ${f.value}`).join(' ')}`)
      .join(' ');
    const reminderText = note.objects
      .filter((o) => o.type === 'reminder')
      .map((o) => `${o.title || ''} ${o.text || ''}`)
      .join(' ');
    return `${note.title || ''} ${objectText} ${credentialText} ${reminderText}`;
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
    const byOrderAsc = (a, b) => (a.order ?? 0) - (b.order ?? 0);
    roots.sort(byOrderAsc);
    for (const list of childrenOf.values()) list.sort(byOrderAsc);

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

  // ----- Notizen per Ziehen (lang drücken) manuell umsortieren/verschachteln -----
  // Wie in OneNote: lang drücken hebt eine Zeile "an" (kurzer Puls), danach folgt
  // sie dem Finger/der Maus nicht sichtbar mit, aber die Zeile unter dem Zeiger
  // zeigt an, ob beim Loslassen davor/danach eingeordnet (obere/untere Zonen)
  // oder als Unterseite verschachtelt wird (mittlere Zone). Eine übergeordnete
  // Notiz nimmt beim Verschieben automatisch alle Unterseiten mit, weil die nur
  // über parentNoteId verknüpft sind und beim Rendern direkt unter ihr folgen -
  // hier muss also nichts Zusätzliches für die Kinder gemacht werden.
  const NOTE_LONG_PRESS_MS = 450;
  const NOTE_DRAG_MOVE_CANCEL_PX = 8;
  let noteDragSuppressClick = false;

  function wireNoteItemDrag(item, note) {
    item.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button')) return; // Auf-/Zuklappen, Unterseite hinzufügen, Löschen bleiben normale Klicks
      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let fired = false;
      const timer = setTimeout(() => {
        fired = true;
        cleanup();
        startNoteDrag(note, item, pointerId);
      }, NOTE_LONG_PRESS_MS);
      const onMove = (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > NOTE_DRAG_MOVE_CANCEL_PX) cleanup();
      };
      const cleanup = () => {
        clearTimeout(timer);
        item.removeEventListener('pointermove', onMove);
        item.removeEventListener('pointerup', cleanup);
        item.removeEventListener('pointercancel', cleanup);
      };
      item.addEventListener('pointermove', onMove);
      item.addEventListener('pointerup', cleanup);
      item.addEventListener('pointercancel', cleanup);
    });
  }

  function clearNoteDropIndicators() {
    el.noteList.querySelectorAll('.note-drop-before, .note-drop-after, .note-drop-into').forEach((n) => {
      n.classList.remove('note-drop-before', 'note-drop-after', 'note-drop-into');
    });
  }

  function startNoteDrag(note, item, pointerId) {
    noteDragSuppressClick = true;
    // Zusätzliches Sicherheitsnetz: sollte irgendetwas in dieser Funktion
    // (oder später beim Loslassen) einen unerwarteten Fehler werfen, bevor
    // die Klick-Sperre normal wieder aufgehoben wird, bliebe die Notizliste
    // sonst dauerhaft unklickbar, bis die Seite neu geladen wird - daher
    // ganz am Anfang gesetzt, noch vor jeder Berechnung, die scheitern könnte.
    const dragSafetyTimeout = setTimeout(() => {
      noteDragSuppressClick = false;
    }, 5000);

    item.classList.add('note-item-picked');
    setTimeout(() => item.classList.remove('note-item-picked'), 220);
    item.classList.add('note-item-dragging');
    el.noteList.classList.add('note-list-dragging');

    const forbiddenIds = new Set([note.id, ...descendantNoteIds(note.id)]);
    let currentDrop = null;

    const onMove = (ev) => {
      const targetItem = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.note-item');
      clearNoteDropIndicators();
      const targetId = targetItem && targetItem.dataset.noteId;
      if (!targetItem || !targetId || forbiddenIds.has(targetId)) {
        currentDrop = null;
        return;
      }
      const rect = targetItem.getBoundingClientRect();
      const relY = (ev.clientY - rect.top) / rect.height;
      const mode = relY < 0.25 ? 'before' : relY > 0.75 ? 'after' : 'into';
      currentDrop = { targetId, mode };
      targetItem.classList.add(`note-drop-${mode}`);
    };
    const onUp = () => {
      item.removeEventListener('pointermove', onMove);
      item.removeEventListener('pointerup', onUp);
      item.removeEventListener('pointercancel', onUp);
      try {
        item.releasePointerCapture(pointerId);
      } catch (err) {
        // ignorieren
      }
      item.classList.remove('note-item-dragging');
      el.noteList.classList.remove('note-list-dragging');
      clearNoteDropIndicators();
      // Ein Fehler beim Verschieben darf niemals dazu führen, dass Klicks auf
      // die Notizliste dauerhaft blockiert bleiben (bisher konnte genau das
      // passieren, wenn applyNoteDrop einen Fehler wirft - die Zeile darunter
      // wurde dann nie mehr erreicht, und man musste die Seite neu laden).
      try {
        if (currentDrop) applyNoteDrop(note, currentDrop);
      } catch (err) {
        console.error('Notiz konnte nicht verschoben werden:', err);
      } finally {
        clearTimeout(dragSafetyTimeout);
        setTimeout(() => { noteDragSuppressClick = false; }, 50);
      }
    };
    try {
      item.setPointerCapture(pointerId);
    } catch (err) {
      // ignorieren
    }
    item.addEventListener('pointermove', onMove);
    item.addEventListener('pointerup', onUp);
    item.addEventListener('pointercancel', onUp);
  }

  function applyNoteDrop(draggedNote, drop) {
    const target = findNote(drop.targetId);
    if (!target) return;

    if (drop.mode === 'into') {
      draggedNote.parentNoteId = target.id;
      draggedNote.folderId = target.folderId;
      draggedNote.order = nextOrderForParent(target.id);
      collapsedNoteIds.delete(target.id);
    } else {
      const newParentId = target.parentNoteId || null;
      draggedNote.parentNoteId = newParentId;
      draggedNote.folderId = target.folderId;
      const siblings = state.notes
        .filter((n) => (n.parentNoteId || null) === newParentId && n.id !== draggedNote.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const targetIndex = siblings.findIndex((n) => n.id === target.id);
      let prevOrder;
      let nextOrder;
      if (drop.mode === 'before') {
        const before = siblings[targetIndex - 1];
        prevOrder = before ? before.order ?? 0 : (target.order ?? 0) - 1;
        nextOrder = target.order ?? 0;
      } else {
        const after = siblings[targetIndex + 1];
        prevOrder = target.order ?? 0;
        nextOrder = after ? after.order ?? 0 : (target.order ?? 0) + 1;
      }
      draggedNote.order = (prevOrder + nextOrder) / 2;
    }
    schedulePersist();
    renderNoteList();
  }

  function getVisibleNotes() {
    const q = searchQuery.trim().toLowerCase();
    // Bei aktiver Suche werden bewusst ALLE Notizen durchsucht (nicht nur der
    // gerade geöffnete Ordner), damit man wirklich überall etwas findet -
    // Notizen im Papierkorb bleiben dabei aber wie überall sonst versteckt.
    let list = q ? state.notes.filter((n) => !isTrashed(n)) : notesInFolder(selectedFolderId);
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Rendering: Sidebar ----------

  function renderFolders() {
    // "Alle Notizen" sitzt fest im Kopfbereich neben dem Logo (nicht mehr in
    // der scrollenden Ordnerliste) - hier nur Zähler/aktiv-Status aktualisieren.
    el.allNotesBtn.classList.toggle('active', selectedFolderId === null);
    el.allNotesCount.textContent = state.notes.filter((n) => !isTrashed(n)).length;

    el.folderList.innerHTML = '';

    for (const folder of state.folders) {
      if (folder.trashedAt) continue;
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

    // Der Papierkorb ist nur sichtbar, solange man ihn über den Nutzernamen
    // unten explizit eingeblendet hat (siehe trashVisible) - kein echter
    // Ordner, taucht deshalb z. B. auch nicht bei "In Ordner verschieben" auf.
    if (trashVisible) {
      const trashCount = state.notes.filter((n) => !n.parentNoteId && n.trashedAt).length;
      const trashItem = document.createElement('div');
      trashItem.className = 'folder-item' + (selectedFolderId === TRASH_FOLDER_ID ? ' active' : '');
      trashItem.innerHTML = `
        <span class="folder-icon">${ICONS.trash}</span>
        <span class="folder-name">Papierkorb</span>
        <span class="folder-count">${trashCount}</span>
      `;
      trashItem.addEventListener('click', () => selectFolder(TRASH_FOLDER_ID));
      el.folderList.appendChild(trashItem);
    }
  }

  function selectFolder(folderId) {
    // Merkt sich innerhalb der Sitzung je Hauptüberschrift, welche Notiz dort
    // zuletzt geöffnet war - beim nächsten Wechsel dorthin wird das wieder
    // hergestellt, statt jedes Mal leer/mit der Willkommens-Grafik zu starten.
    // Lebt nur im Arbeitsspeicher (nicht gespeichert), ein echtes Neuladen
    // startet also bewusst wieder ganz ohne Auswahl.
    if (selectedNoteId) lastSelectedNoteIdByFolder.set(selectedFolderId, selectedNoteId);
    selectedFolderId = folderId;
    const rememberedId = lastSelectedNoteIdByFolder.get(folderId) || null;
    const note = findNote(rememberedId);
    const belongsToFolder =
      note &&
      (folderId === TRASH_FOLDER_ID
        ? isTrashed(note)
        : !isTrashed(note) && (folderId === null || note.folderId === folderId));
    selectedNoteId = belongsToFolder ? rememberedId : null;
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
    // In den neuen Ordner hineinwechseln (nicht nur anlegen) - sonst landet
    // eine direkt danach über "+ neue Notiz" angelegte Notiz unbemerkt im
    // vorher aktiven Ordner statt im gerade erst erstellten.
    selectFolder(folder.id);
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
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder) return;
    // Hauptseiten in diesem Ordner durchlaufen dieselbe Regel wie beim
    // einzelnen Löschen über deleteNote(): nicht-leere wandern in den
    // Papierkorb (statt einfach "ordnerlos" zu werden und dadurch leicht
    // übersehen zu werden), wirklich leere werden wie sonst auch sofort
    // endgültig entfernt. Unterseiten hängen automatisch am Schicksal ihrer
    // Hauptseite (siehe isTrashed()) und werden hier nicht einzeln gezählt.
    const notesInThisFolder = state.notes.filter((n) => n.folderId === folderId);
    const rootsToTrash = notesInThisFolder.filter((n) => !n.parentNoteId && !isNoteEmpty(n));
    const rootsToDelete = notesInThisFolder.filter((n) => !n.parentNoteId && isNoteEmpty(n));

    let msg = 'Diesen Ordner löschen?';
    const parts = [];
    if (rootsToTrash.length > 0) parts.push(`${rootsToTrash.length} Hauptseite(n) wandern in den Papierkorb`);
    if (rootsToDelete.length > 0) parts.push(`${rootsToDelete.length} leere Hauptseite(n) werden endgültig gelöscht`);
    if (parts.length > 0) msg = `Ordner löschen? ${parts.join(', ')}.`;
    if (!confirm(msg)) return;

    for (const note of rootsToTrash) {
      note.trashedAt = Date.now();
      note.updatedAt = Date.now();
    }
    const deleteIds = new Set(rootsToDelete.map((n) => n.id));
    if (deleteIds.size > 0) {
      state.notes = state.notes.filter((n) => !deleteIds.has(n.id));
    }

    if (rootsToTrash.length > 0) {
      // Der Ordner bleibt zusammen mit seinen in den Papierkorb gewanderten
      // Hauptseiten erhalten (nur in der Seitenleiste versteckt) - sobald
      // eine dieser Notizen wiederhergestellt wird, kommt der Ordner in
      // restoreNote() automatisch mit zurück. folderId bleibt deshalb auf
      // allen verbliebenen Notizen unverändert.
      folder.trashedAt = Date.now();
    } else {
      // Nichts davon landet im Papierkorb (Ordner war leer oder enthielt
      // nur leere Hauptseiten) - dafür gibt es keinen Wiederherstellen-
      // Anlass, der Ordner wird wie bisher direkt entfernt.
      state.folders = state.folders.filter((f) => f.id !== folderId);
    }
    if (selectedFolderId === folderId) selectedFolderId = null;
    if (deleteIds.has(selectedNoteId) || rootsToTrash.some((n) => n.id === selectedNoteId)) {
      selectedNoteId = null;
    }
    schedulePersist();
    renderFolders();
    renderNoteList();
    renderEditor();
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

  // IDs aller Notizen aus der übergebenen Liste, die (innerhalb dieser Liste)
  // mindestens eine Unterseite haben - also genau die, für die überhaupt ein
  // Auf-/Zuklapp-Pfeil angezeigt wird.
  function collapsibleNoteIds(notes) {
    const idsInList = new Set(notes.map((n) => n.id));
    const withChildren = new Set();
    for (const note of notes) {
      if (note.parentNoteId && idsInList.has(note.parentNoteId)) {
        withChildren.add(note.parentNoteId);
      }
    }
    return withChildren;
  }

  function updateCollapseAllButton(collapsibleIds) {
    const btn = el.collapseAllBtn;
    if (!btn) return;
    if (collapsibleIds.size === 0) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    const allCollapsed = [...collapsibleIds].every((id) => collapsedNoteIds.has(id));
    btn.classList.toggle('expanded', !allCollapsed);
    const label = allCollapsed ? 'Alle Hauptüberschriften aufklappen' : 'Alle Hauptüberschriften zuklappen';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  function renderNoteList() {
    const notes = getVisibleNotes();
    el.noteList.innerHTML = '';

    // Im Papierkorb legt man keine neuen Hauptseiten an.
    el.newNoteBtn.hidden = selectedFolderId === TRASH_FOLDER_ID;

    const label =
      selectedFolderId === null
        ? 'Alle Notizen'
        : selectedFolderId === TRASH_FOLDER_ID
          ? 'Papierkorb'
          : (state.folders.find((f) => f.id === selectedFolderId) || {}).name || '';
    el.noteCount.textContent = notes.length > 0 ? `${label} (${notes.length})` : label;

    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'note-list-empty';
      empty.textContent = searchQuery ? 'Keine Ergebnisse' : 'Keine Notizen';
      el.noteList.appendChild(empty);
      updateCollapseAllButton(new Set());
      return;
    }

    // Während der Suche flach anzeigen (Trefferrelevanz statt Hierarchie zählt hier),
    // sonst als Baum mit Unterseiten.
    const rows = searchQuery.trim()
      ? notes.map((note) => ({ note, depth: 0, hasChildren: false }))
      : buildNoteTree(notes);

    const isSearchMode = searchQuery.trim().length > 0;
    const isTrashView = selectedFolderId === TRASH_FOLDER_ID;
    updateCollapseAllButton(isSearchMode ? new Set() : collapsibleNoteIds(notes));

    for (const { note, depth, hasChildren } of rows) {
      const item = document.createElement('div');
      item.className = 'note-item' + (depth > 0 ? ' note-item-sub' : '') + (note.id === selectedNoteId ? ' active' : '');
      item.style.paddingLeft = `${10 + depth * 16}px`;
      item.dataset.noteId = note.id;

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
      main.innerHTML = `<div class="note-title">${escapeHtml(note.title)}</div>`;
      item.appendChild(main);

      if (isTrashView) {
        // Im Papierkorb gibt es nur bei der Hauptseite selbst (depth 0) eine
        // Aktion - "Wiederherstellen" statt "Löschen", und kein "+" (neue
        // Unterseiten legt man hier nicht an). Unterseiten (depth > 0)
        // zeigen sich nur, hängen aber komplett am Schicksal ihrer
        // Hauptseite - kein eigener Knopf nötig.
        if (depth === 0) {
          const restoreBtn = document.createElement('button');
          restoreBtn.type = 'button';
          restoreBtn.className = 'note-restore-btn';
          restoreBtn.title = 'Wiederherstellen';
          restoreBtn.setAttribute('aria-label', 'Wiederherstellen');
          restoreBtn.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.restore}</svg>`;
          restoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            restoreNote(note.id);
          });
          item.appendChild(restoreBtn);
        }
      } else {
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
      }

      if (!isSearchMode && !isTrashView) wireNoteItemDrag(item, note);
      item.addEventListener('click', () => {
        if (noteDragSuppressClick) return;
        selectNote(note.id);
      });
      el.noteList.appendChild(item);
    }
  }

  // ---------- Rendering: Editor ----------

  function selectNote(id) {
    selectedNoteId = id;
    lastSelectedNoteIdByFolder.set(selectedFolderId, id);
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
      order: nextOrderForParent(parent ? parent.id : null),
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
  }

  function deleteNote(id) {
    const note = findNote(id);
    if (!note) return;
    const descendants = descendantNoteIds(id);
    const isRoot = !note.parentNoteId;

    // Eine nicht-leere Hauptseite (hat Unterseiten und/oder eigenen Inhalt)
    // wandert in den Papierkorb statt wirklich gelöscht zu werden - darunter
    // können Unterseiten mit noch wichtigen Informationen stecken. Nur eine
    // wirklich leere Hauptseite, oder eine einzelne Unterseite (deren
    // Löschen über ihre eigene Hauptseite jederzeit rückgängig gemacht
    // werden kann, indem diese wiederhergestellt wird), wird sofort
    // endgültig gelöscht.
    if (isRoot && !isNoteEmpty(note)) {
      const msg =
        descendants.length > 0
          ? `Diese Hauptseite und ${descendants.length} Unterseite(n) in den Papierkorb verschieben?`
          : 'Diese Hauptseite in den Papierkorb verschieben?';
      if (!confirm(msg)) return;
      note.trashedAt = Date.now();
      note.updatedAt = Date.now();
      schedulePersist();
      const toDeselect = new Set([id, ...descendants]);
      if (toDeselect.has(selectedNoteId)) {
        selectedNoteId = null;
      }
      renderFolders();
      renderNoteList();
      renderEditor();
      goToView('notes');
      return;
    }

    const msg =
      descendants.length > 0
        ? `Diese Notiz und ${descendants.length} Unterseite(n) endgültig löschen?`
        : 'Diese Notiz endgültig löschen?';
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

  // Holt eine Hauptseite (samt Unterseiten, die automatisch über isTrashed()
  // "mit verschwunden" waren) aus dem Papierkorb zurück - dauerhaft, nicht
  // nur für diese Sitzung.
  function restoreNote(id) {
    const note = findNote(id);
    if (!note || !note.trashedAt) return;
    if (!confirm(`"${note.title || 'Ohne Titel'}" wiederherstellen?`)) return;
    delete note.trashedAt;
    note.updatedAt = Date.now();
    // Gehörte diese Notiz zu einem inzwischen gelöschten Ordner, kommt der
    // Ordner automatisch mit zurück - er wurde beim Löschen bewusst nicht
    // entfernt, sondern nur versteckt (siehe deleteFolder()).
    if (note.folderId) {
      const folder = state.folders.find((f) => f.id === note.folderId);
      if (folder && folder.trashedAt) delete folder.trashedAt;
    }
    schedulePersist();
    renderFolders();
    renderNoteList();
    renderEditor();
  }

  // ---------- Freie Zeichenfläche: Objekte ----------

  let selectedObjectId = null;
  let dragState = null;
  let activeTextEdit = null; // { note, obj, objEl, body, overlay } – Formatierungs-Buttons sitzen global im Ribbon
  let lastSelectionRange = null;
  // Überlebt (kurz) einen Blur - siehe exitTextEdit()/convertFloatingPdfToInline().
  let lastTextEditContext = null;
  let lastTextEditRange = null;
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

  // Merkt sich, für welche Notiz die Fläche zuletzt aufgebaut wurde: Nur bei
  // einem echten Wechsel zu einer ANDEREN Notiz soll die Scroll-Position auf
  // links oben zurückgesetzt werden (sonst bleibt man immer dort stehen, wo
  // man zuletzt in der vorherigen Notiz hingescrollt hatte). Ein erneuter
  // Aufruf für dieselbe Notiz (z. B. durch selectFolder(), das renderEditor()
  // auch aufruft, wenn die aktuell offene Notiz im neu gewählten Ordner
  // bleibt) darf die Scroll-Position dagegen nicht antasten.
  let lastRenderedCanvasNoteId = undefined;

  function renderCanvas(note) {
    deactivateDrawMode();
    clearStrokeSelection();
    selectedObjectId = null;
    for (const child of [...el.canvasSurface.children]) {
      if (child !== el.inkLayer) child.remove();
    }
    if (!note) {
      lastRenderedCanvasNoteId = undefined;
      return;
    }
    el.canvasSurface.dataset.bg = note.background || 'dots';
    // Inline-Erinnerungen (obj.inline) leben als kleines Glocken-Symbol direkt
    // im Text eines Textobjekts (siehe insertInlineReminderMarker()) - sie
    // bekommen hier bewusst KEIN eigenes, frei positioniertes Objekt auf der
    // Fläche (kein x/y/w/h vorhanden).
    const sorted = [...note.objects].filter((o) => !o.inline).sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const obj of sorted) {
      el.canvasSurface.insertBefore(buildObjectEl(note, obj), el.inkLayer);
    }
    updateSurfaceSize(note, true);
    if (note.id !== lastRenderedCanvasNoteId) {
      el.canvasWorkspace.scrollLeft = 0;
      el.canvasWorkspace.scrollTop = 0;
    }
    lastRenderedCanvasNoteId = note.id;
  }

  function findObjEl(id) {
    return el.canvasSurface.querySelector(`[data-id="${id}"]`);
  }

  // Die Werkzeugleiste eines Objekts schwebt normalerweise 38px darüber - liegt
  // das Objekt zu nah am oberen Rand der Fläche, ragt sie dann oben über die
  // Fläche hinaus und verschwindet unter der Ribbon-Leiste. In dem Fall klappt
  // sie stattdessen nach unten unter das Objekt (siehe CSS ".toolbar-below").
  const TOOLBAR_FLIP_THRESHOLD = 44;

  function applyObjRect(objEl, obj) {
    objEl.style.left = `${obj.x}px`;
    objEl.style.top = `${obj.y}px`;
    objEl.style.width = `${obj.w}px`;
    objEl.style.height = `${obj.h}px`;
    objEl.style.zIndex = obj.z || 1;
    objEl.classList.toggle('toolbar-below', obj.y < TOOLBAR_FLIP_THRESHOLD);
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

    // Die Werkzeugleiste ist jetzt als kompletter grauer Balken (wie eine
    // Fenster-Titelleiste, siehe OneNote) selbst der Ziehgriff zum Verschieben -
    // ein eigener kleiner Verschieben-Knopf ist dadurch nicht mehr nötig. Die
    // Knöpfe darin (Löschen usw.) stoppen die Ereignis-Weitergabe selbst
    // (siehe makeToolbarBtn), lösen also kein Verschieben aus.
    const mainToolbar = document.createElement('div');
    mainToolbar.className = 'object-toolbar object-toolbar-main';
    mainToolbar.addEventListener('pointerdown', (e) => startObjectDrag(e, note, obj, objEl));
    if ((obj.type === 'pdf' || obj.type === 'file') && obj.fileData) {
      const label = obj.type === 'pdf' ? 'PDF öffnen' : 'Datei öffnen';
      mainToolbar.appendChild(makeToolbarBtn(ICONS.openFile, false, () => openAttachedFile(obj), label));
    }
    if ((obj.type === 'pdf' && obj.variant === 'file') || obj.type === 'file') {
      mainToolbar.appendChild(makeToolbarBtn(ICONS.rename, false, () => startRenameFileAttachment(obj, objEl), 'Umbenennen'));
    }
    if (obj.type === 'pdf' && obj.fileData) {
      mainToolbar.appendChild(
        makeToolbarBtn(ICONS.textCursor, false, () => convertFloatingPdfToInline(note, obj, objEl), 'An der Cursor-Stelle im Text platzieren')
      );
    }
    if (obj.type === 'audio') {
      mainToolbar.appendChild(makeToolbarBtn(ICONS.transcript, false, () => startTranscription(note, obj, objEl), 'In Text umwandeln'));
    }
    if (obj.type === 'credential') {
      mainToolbar.appendChild(makeToolbarBtn(ICONS.rename, false, () => openCredentialPopover(note, obj, mainToolbar), 'Bearbeiten'));
    }
    if (obj.type === 'reminder') {
      mainToolbar.appendChild(makeToolbarBtn(ICONS.rename, false, () => openReminderPopover(note, obj, mainToolbar), 'Bearbeiten'));
    }
    mainToolbar.appendChild(makeToolbarBtn(ICONS.trash, true, () => deleteObject(note, obj.id), 'Löschen'));
    objEl.appendChild(mainToolbar);

    if (obj.type === 'text') buildTextContent(note, obj, objEl, autoFocusText);
    else if (obj.type === 'image') buildImageContent(note, obj, objEl);
    else if (obj.type === 'pdf') buildPdfContent(note, obj, objEl);
    else if (obj.type === 'audio') buildAudioContent(note, obj, objEl);
    else if (obj.type === 'file') buildFileContent(note, obj, objEl);
    else if (obj.type === 'credential') buildCredentialContent(note, obj, objEl);
    else if (obj.type === 'reminder') buildReminderContent(note, obj, objEl);

    // Größe ändern nur noch über die rechte Kante (Breite) und die untere
    // Kante (Höhe) - wie bei einem normalen Fenster, kein zusätzlicher runder
    // Ziehpunkt in der Ecke mehr.
    const edgeRight = document.createElement('div');
    edgeRight.className = 'resize-edge resize-edge-right';
    edgeRight.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startObjectResize(e, note, obj, objEl, edgeRight, 'x');
    });
    objEl.appendChild(edgeRight);

    const edgeBottom = document.createElement('div');
    edgeBottom.className = 'resize-edge resize-edge-bottom';
    edgeBottom.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startObjectResize(e, note, obj, objEl, edgeBottom, 'y');
    });
    objEl.appendChild(edgeBottom);

    // Unsichtbare Zone genau in der Ecke (liegt über den beiden Kanten) für das
    // gleichzeitige Ändern von Breite UND Höhe - wie beim früheren runden
    // Ziehpunkt, nur ohne sichtbares Element.
    const edgeCorner = document.createElement('div');
    edgeCorner.className = 'resize-edge resize-edge-corner';
    edgeCorner.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startObjectResize(e, note, obj, objEl, edgeCorner, 'both');
    });
    objEl.appendChild(edgeCorner);

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

  // Lässt die Zeichenfläche automatisch scrollen, wenn beim Verschieben/
  // Skalieren eines Objekts der Zeiger nahe an den sichtbaren Rand der
  // (scrollbaren) Arbeitsfläche kommt – sonst kommt man bei großen Objekten
  // (z. B. einer mehrseitigen PDF) mit der Maus nicht mehr weiter, weil der
  // Bildschirmrand erreicht ist, bevor das Objekt groß/weit genug gezogen ist.
  let autoScrollRAF = null;
  let lastDragPointer = null;

  // Geschwindigkeit für eine Achse: 0, solange der Zeiger innerhalb der
  // Randzone der Arbeitsfläche bleibt; steigt danach an, je weiter der
  // Zeiger über den sichtbaren Rand hinaus gezogen wird (bis zu einer
  // Höchstgeschwindigkeit) – so lässt sich ein sehr großes Objekt (z. B.
  // eine 23-seitige PDF) durch weites Herausziehen zügig statt nur im
  // Schneckentempo verkleinern/vergrößern.
  function edgeAutoScrollSpeed(pos, edgeMin, edgeMax) {
    const zone = 40;
    const rampRange = 260;
    const maxSpeed = 160;
    if (pos < edgeMin + zone) {
      const dist = edgeMin - pos;
      const t = clamp((dist + zone) / (zone + rampRange), 0, 1);
      return -maxSpeed * t;
    }
    if (pos > edgeMax - zone) {
      const dist = pos - edgeMax;
      const t = clamp((dist + zone) / (zone + rampRange), 0, 1);
      return maxSpeed * t;
    }
    return 0;
  }

  function startAutoScroll(kind) {
    const moveHandler = kind === 'move' ? onObjectDragMove : onObjectResizeMove;
    const tick = () => {
      if (!dragState || dragState.type !== kind || !lastDragPointer) {
        autoScrollRAF = null;
        return;
      }
      const rect = el.canvasWorkspace.getBoundingClientRect();
      const { clientX: px, clientY: py } = lastDragPointer;
      const sx = edgeAutoScrollSpeed(px, rect.left, rect.right);
      const sy = edgeAutoScrollSpeed(py, rect.top, rect.bottom);
      if (sx !== 0 || sy !== 0) {
        const beforeLeft = el.canvasWorkspace.scrollLeft;
        const beforeTop = el.canvasWorkspace.scrollTop;
        el.canvasWorkspace.scrollLeft = clamp(beforeLeft + sx, 0, el.canvasWorkspace.scrollWidth - el.canvasWorkspace.clientWidth);
        el.canvasWorkspace.scrollTop = clamp(beforeTop + sy, 0, el.canvasWorkspace.scrollHeight - el.canvasWorkspace.clientHeight);
        const actualDX = el.canvasWorkspace.scrollLeft - beforeLeft;
        const actualDY = el.canvasWorkspace.scrollTop - beforeTop;
        if (actualDX || actualDY) {
          // Der Ziehpunkt ist unverändert (Maus steht am Bildschirmrand still);
          // durch das Verschieben von "startX/Y" wirkt es im Deltabild so, als
          // hätte sich der Zeiger um die gescrollte Strecke weiterbewegt.
          dragState.startX -= actualDX;
          dragState.startY -= actualDY;
          moveHandler(lastDragPointer);
        }
      }
      autoScrollRAF = requestAnimationFrame(tick);
    };
    if (!autoScrollRAF) autoScrollRAF = requestAnimationFrame(tick);
  }

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
    lastDragPointer = { clientX: e.clientX, clientY: e.clientY };
    startAutoScroll('move');
  }

  // Bild-/PDF-/Audio-Objekte starten das Verschieben (anders als Text, siehe
  // buildTextContent) sofort beim ersten Antippen des ganzen Objekts, ohne
  // erst eine Zieh-Bewegung abzuwarten - bei Touch würde das jeden Wisch-
  // Versuch (Fläche verschieben/zoomen), der zufällig auf einem Objekt
  // beginnt, sofort als "Objekt verschieben" kapern, noch bevor der Browser
  // die native Wisch-Geste überhaupt erkennen kann. Bei Maus/Stift bleibt
  // das sofortige Ziehen wie gewohnt bestehen. Verschieben per Finger
  // funktioniert weiterhin über die kleine Titelleiste (object-toolbar-main).
  function startObjectDragUnlessTouch(e, note, obj, objEl) {
    if (e.pointerType === 'touch') {
      // Trotzdem auswählen (damit ein einfaches Antippen wie gewohnt die
      // Titelleiste/Ziehpunkte zeigt) - nur das sofortige Verschieben bei
      // jeder Fingerbewegung entfällt hier bewusst.
      selectObject(note, obj, objEl);
      return;
    }
    startObjectDrag(e, note, obj, objEl);
  }

  function onObjectDragMove(e) {
    if (!dragState || dragState.type !== 'move') return;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    if (!note || !obj) return;
    lastDragPointer = { clientX: e.clientX, clientY: e.clientY };
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
    obj.x = clamp(dragState.startObjX + dx, -obj.w + 40, MAX_OBJ_DIM - 40);
    obj.y = clamp(dragState.startObjY + dy, 0, MAX_OBJ_DIM - 40);
    const objEl = findObjEl(obj.id);
    if (objEl) {
      objEl.style.left = `${obj.x}px`;
      objEl.style.top = `${obj.y}px`;
      objEl.classList.toggle('toolbar-below', obj.y < TOOLBAR_FLIP_THRESHOLD);
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
        childEl.classList.toggle('toolbar-below', childObj.y < TOOLBAR_FLIP_THRESHOLD);
      }
    }
    updateSurfaceSize(note);
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
    lastDragPointer = null;
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

  function startObjectResize(e, note, obj, objEl, handle, axis) {
    e.preventDefault();
    selectObject(note, obj, objEl);
    dragState = {
      type: 'resize',
      objId: obj.id,
      axis: axis || 'both',
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
    lastDragPointer = { clientX: e.clientX, clientY: e.clientY };
    startAutoScroll('resize');
  }

  function onObjectResizeMove(e) {
    if (!dragState || dragState.type !== 'resize') return;
    const note = currentNote();
    const obj = note && getObj(note, dragState.objId);
    if (!note || !obj) return;
    lastDragPointer = { clientX: e.clientX, clientY: e.clientY };
    const [minW, minH] = MIN_SIZES[obj.type] || [60, 60];
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (dragState.axis !== 'y') obj.w = clamp(dragState.startW + dx, minW, MAX_OBJ_DIM - obj.x);
    if (dragState.axis !== 'x') obj.h = clamp(dragState.startH + dy, minH, MAX_OBJ_DIM - obj.y);
    const objEl = findObjEl(obj.id);
    if (objEl) {
      objEl.style.width = `${obj.w}px`;
      objEl.style.height = `${obj.h}px`;
      const body = objEl.querySelector('.canvas-text-body');
      if (body) updateOverflowIndicators(objEl, body);
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
    updateSurfaceSize(note);
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
    lastDragPointer = null;
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
    enhanceInlineImages(body);
    enhanceInlinePdfChips(body);
    syncInlineReminderMarkers(note, obj, body);
    updateTextEmptyState(body);
    applyFreeLinesAlignment(note, obj, body);
    objEl.appendChild(body);

    const overlay = document.createElement('div');
    overlay.className = 'text-drag-overlay';
    objEl.appendChild(overlay);

    if (obj.style !== 'free') {
      for (const edge of ['top', 'bottom', 'left', 'right']) {
        const indicator = document.createElement('div');
        indicator.className = `overflow-indicator overflow-indicator-${edge}`;
        objEl.appendChild(indicator);
      }
      body.addEventListener('scroll', () => updateOverflowIndicators(objEl, body));
      queueMicrotask(() => updateOverflowIndicators(objEl, body));
    }

    // Ein einfacher Klick (ohne nennenswerte Bewegung) fängt direkt an zu
    // schreiben - kein Doppelklick mehr nötig. Bewegt sich der Zeiger vor dem
    // Loslassen mehr als ein paar Pixel, wird daraus stattdessen wie gewohnt
    // ein Verschieben des Objekts (startObjectDrag).
    overlay.addEventListener('pointerdown', (e) => {
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const onMove = (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
          moved = true;
          cleanup();
          // Bei Touch NICHT startObjectDrag() aufrufen: das würde per
          // setPointerCapture()/preventDefault() den Finger-Kontakt aktiv an
          // sich reißen - das gewinnt gegen die native Wisch-Geste des
          // Browsers, egal was touch-action in der CSS sagt (touch-action
          // verhindert nur, dass der Browser von sich aus scrollt, schützt
          // aber nicht davor, dass eigener Code die Geste per Pointer-Capture
          // nachträglich doch noch an sich zieht). cleanup() hat unsere
          // Listener bereits entfernt, es passiert also nichts weiter - der
          // Browser wischt die Fläche ganz normal.
          if (ev.pointerType !== 'touch') {
            startObjectDrag(e, note, obj, objEl);
          }
        }
      };
      const onUp = (ev) => {
        cleanup();
        if (!moved) {
          e.preventDefault();
          e.stopPropagation();
          // Ein Klick auf einen bereits erkannten Link soll ihn öffnen, statt
          // (wie sonst bei jedem Klick auf die Fläche) in den Bearbeitungsmodus
          // zu wechseln - die Überlagerung (overlay) läge sonst immer über dem
          // eigentlichen <a>-Element und würde jeden Klick abfangen.
          const link = findLinkAtPoint(body, ev.clientX, ev.clientY);
          if (link) {
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return;
          }
          // Dieselbe Überlagerung würde sonst auch jeden Klick auf ein
          // Erinnerungs-Symbol abfangen, statt ihn (per eigenem Klick-Handler,
          // siehe syncInlineReminderMarkers()) zum Bearbeiten-Fenster
          // durchzulassen.
          const marker = findReminderMarkerAtPoint(body, ev.clientX, ev.clientY);
          if (marker) {
            marker.click();
            return;
          }
          // Dieselbe Überlagerung würde sonst auch jeden Klick auf ein
          // eingebettetes PDF-Datei-Symbol abfangen (siehe
          // insertInlinePdfChip()), statt es per eigenem Klick-Handler
          // (enhanceInlinePdfChips()) direkt zu öffnen.
          const pdfChip = findInlinePdfChipAtPoint(body, ev.clientX, ev.clientY);
          if (pdfChip) {
            pdfChip.click();
            return;
          }
          enterTextEdit(note, obj, objEl, body, overlay, startX, startY);
        }
      };
      const cleanup = () => {
        overlay.removeEventListener('pointermove', onMove);
        overlay.removeEventListener('pointerup', onUp);
        overlay.removeEventListener('pointercancel', cleanup);
      };
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', cleanup);
    });

    body.addEventListener('blur', () => exitTextEdit(obj, body, overlay));
    body.addEventListener('input', () => {
      stripInheritedHeadingOnFreshLine(body);
      syncInlineReminderMarkers(note, obj, body);
      saveTextObjContent(note, obj, body);
      updateTextEmptyState(body);
      growFreeTextToFit(obj, objEl, body);
      updateOverflowIndicators(objEl, body);
    });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') body.blur();
    });
    body.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      const imageItem = Array.from(clipboardData.items || []).find(
        (item) => item.kind === 'file' && item.type && item.type.startsWith('image/')
      );
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        // Ein frisch durch Antippen der leeren Fläche entstandenes, noch
        // komplettes leeres Textfeld ist reiner Zufall des Klickpunkts, kein
        // bewusst begonnener Text - ein hier eingefügtes Bild soll daher (wie
        // in OneNote) ein eigenständiges Bild-Objekt werden statt in dieses
        // Textfeld eingebettet zu werden. Wurde dagegen bereits etwas
        // getippt oder ein Bild eingefügt, geht es wie gewohnt inline hinein.
        if (!body.textContent.trim() && !body.querySelector('img')) {
          const dropPoint = { x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 };
          body.blur(); // löst exitTextEdit aus und entfernt das leere Textobjekt
          addImageObjectFromFile(file, dropPoint);
          return;
        }
        insertInlineImage(note, obj, objEl, body, file);
        return;
      }
      e.preventDefault();
      const html = clipboardData.getData('text/html');
      if (html && html.trim()) {
        insertSanitizedHtmlAtCaret(sanitizePastedHtml(html));
      } else {
        const text = clipboardData.getData('text/plain');
        insertPlainTextAtCaret(text);
      }
      // insertPlainTextAtCaret/insertSanitizedHtmlAtCaret fügen direkt per Range-API
      // ein und lösen damit KEIN "input"-Ereignis aus - ohne die folgenden drei
      // Aufrufe (die sonst der input-Handler übernimmt) würde der eingefügte Text
      // weder gespeichert noch die Box darauf in der Höhe angepasst, sodass
      // eingefügter mehrzeiliger Text abgeschnitten aussah und beim nächsten
      // Neuladen sogar ganz verloren ging.
      saveTextObjContent(note, obj, body);
      updateTextEmptyState(body);
      growObjWidthToFit(obj, objEl, body);
      growFreeTextToFit(obj, objEl, body);
      updateOverflowIndicators(objEl, body);
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
    // Kein renderNoteList() hier: Die Liste zeigt nur den Notiztitel, den
    // Textinhalt eines Objekts betrifft sie nicht. Ein Neuaufbau genau in
    // diesem Moment (der beim Verlassen des Textfelds durch einen Klick auf
    // eine andere Notiz in der Liste ausgelöst wird) ersetzt aber die gerade
    // angeklickte Zeile durch ein neues DOM-Element, noch während der Klick
    // in Bearbeitung ist - der Browser verwirft diesen Klick dann komplett
    // (das angeklickte Element existiert ja nicht mehr), wodurch sich keine
    // andere Notiz mehr öffnen ließ, bis man z. B. eine Hauptüberschrift
    // anklickte (die keinen Blur mehr auslöste).
  }

  function updateTextEmptyState(body) {
    body.classList.toggle('is-empty', body.textContent.trim() === '');
  }

  // Lässt freien Text (ohne sichtbaren Rahmen) beim Tippen automatisch in der
  // Höhe mitwachsen, statt von Anfang an eine feste Kasten-Größe zu belegen –
  // wie das "irgendwo hinklicken und lostippen" in OneNote. Schrumpft
  // absichtlich nicht automatisch wieder (das bleibt dem Ziehpunkt
  // vorbehalten), damit der Text beim Löschen nicht ständig herumspringt.
  function growFreeTextToFit(obj, objEl, body) {
    if (obj.style !== 'free') return;
    const needed = body.scrollHeight;
    if (needed > obj.h) {
      obj.h = needed;
      objEl.style.height = `${obj.h}px`;
    }
  }

  // Beim Einfügen (z. B. aus Word/Browser kopiert) blieb ein frisch angelegtes,
  // schmales Textfeld schmal - jede Zeile brach dadurch sofort um, obwohl auf
  // der Fläche reichlich Platz wäre, und man musste von Hand nachziehen. Diese
  // Funktion misst, wie breit der eingefügte Inhalt ohne Umbruch tatsächlich
  // wäre (über ein unsichtbares Mess-Element mit dem gleichen Schriftstil),
  // und verbreitert das Textfeld bis zu einer sinnvollen Obergrenze passend
  // dazu - verkleinert es aber nie automatisch wieder.
  function growObjWidthToFit(obj, objEl, body) {
    const MAX_WIDTH = 900;
    const bodyStyle = getComputedStyle(body);
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:0; width:max-content; white-space:pre;';
    probe.style.fontFamily = bodyStyle.fontFamily;
    probe.style.fontSize = bodyStyle.fontSize;
    probe.style.fontWeight = bodyStyle.fontWeight;
    probe.style.lineHeight = bodyStyle.lineHeight;
    probe.innerHTML = body.innerHTML;
    document.body.appendChild(probe);
    // + Innenabstand/Rahmen des Textfelds plus etwas Sicherheitsabstand - ohne
    // den brach eine Zeile gelegentlich doch noch knapp um, wenn die Messung
    // (anderes Element, keine echte Zeilenumbruch-Logik) minimal von der
    // tatsächlichen Breite im echten Textfeld abwich.
    const neededWidth = probe.offsetWidth + 32;
    probe.remove();
    const target = Math.min(Math.max(neededWidth, obj.w), MAX_WIDTH);
    if (target > obj.w) {
      obj.w = target;
      objEl.style.width = `${obj.w}px`;
    }
  }

  // Blendet an jeder Kante eines "Textfelds" (fester Größe) eine schlanke
  // Leiste ein, wenn dort Inhalt über den sichtbaren Bereich hinausgeht -
  // berücksichtigt dabei auch die aktuelle Scroll-Position (z. B. keine
  // "unten"-Leiste mehr, sobald bis ganz nach unten gescrollt wurde). Ersetzt
  // die native Bildlaufleiste des Browsers, die von aktuellen Chrome-
  // Versionen mit aktivierten Overlay-Scrollbalken selbst nach eigener
  // ::-webkit-scrollbar-Gestaltung nicht mehr zuverlässig angezeigt wird.
  function updateOverflowIndicators(objEl, body) {
    const top = objEl.querySelector('.overflow-indicator-top');
    if (!top) return; // "Freier Text" hat keine Leisten (wächst stattdessen automatisch mit)
    const bottom = objEl.querySelector('.overflow-indicator-bottom');
    const left = objEl.querySelector('.overflow-indicator-left');
    const right = objEl.querySelector('.overflow-indicator-right');
    const EPS = 1;
    top.classList.toggle('visible', body.scrollTop > EPS);
    bottom.classList.toggle('visible', body.scrollHeight - body.scrollTop - body.clientHeight > EPS);
    left.classList.toggle('visible', body.scrollLeft > EPS);
    right.classList.toggle('visible', body.scrollWidth - body.scrollLeft - body.clientWidth > EPS);
  }

  // Bild direkt in den Textfluss einfügen (wie in OneNote per Einfügen/Drag&Drop
  // in eine Textnotiz) - im Unterschied zum separaten Bild-Objekt auf der
  // Fläche wird dieses Bild Teil des Text-Inhalts (obj.html) und bewegt sich
  // mit dem umgebenden Text mit.
  async function insertInlineImage(note, obj, objEl, body, file) {
    // Sofort ein Platzhalter-Element an der Cursor-Position einfügen (nicht
    // erst nach dem Hochladen): der eigentliche Selection-Range wird beim
    // asynchronen Warten ungültig/verliert den Bezug, ein bereits im DOM
    // hängender Platzhalter-Knoten bleibt dagegen unabhängig davon gültig.
    const placeholder = document.createElement('span');
    placeholder.className = 'inline-image-placeholder';
    placeholder.textContent = 'Bild wird hochgeladen …';
    placeholder.contentEditable = 'false';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && body.contains(sel.getRangeAt(0).startContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(placeholder);
      range.setStartAfter(placeholder);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      body.appendChild(placeholder);
    }
    saveTextObjContent(note, obj, body);
    updateTextEmptyState(body);
    growFreeTextToFit(obj, objEl, body);

    try {
      const src = await uploadFile(file);
      const img = document.createElement('img');
      img.className = 'inline-text-image';
      img.src = src;
      placeholder.replaceWith(img);
      enhanceInlineImages(body);
    } catch (err) {
      console.error('Bild konnte nicht eingefügt werden:', err);
      placeholder.textContent = 'Bild konnte nicht eingefügt werden.';
    }
    saveTextObjContent(note, obj, body);
    growFreeTextToFit(obj, objEl, body);
  }

  // Versieht jedes noch "nackte" eingebettete Bild mit einem Wrapper samt
  // Ziehpunkt unten rechts, über den sich seine Breite ändern lässt (Höhe
  // passt sich proportional automatisch an, da nur die Breite gesetzt wird).
  function enhanceInlineImages(body) {
    body.querySelectorAll('img.inline-text-image').forEach((img) => {
      if (img.parentElement && img.parentElement.classList.contains('inline-image-wrap')) return;
      const wrap = document.createElement('span');
      wrap.className = 'inline-image-wrap';
      wrap.contentEditable = 'false';
      img.replaceWith(wrap);
      wrap.appendChild(img);
      const handle = document.createElement('span');
      handle.className = 'inline-image-resize-handle';
      wrap.appendChild(handle);
      wireInlineImageResize(img, handle);
    });
  }

  function wireInlineImageResize(img, handle) {
    // Ein contentEditable="false"-Knoten (der Bild-Wrapper) bekommt beim
    // Anklicken sonst keinen sauberen Selection-Zustand - der Cursor springt
    // stattdessen an den Textanfang, und Entf/Rücktaste löschen dann dort statt
    // das Bild. Per Klick den ganzen Wrapper explizit als Browser-Selection
    // markieren, damit Entf/Rücktaste ihn wie in Word/OneNote nativ entfernen.
    img.addEventListener('pointerdown', (e) => {
      const body = img.closest('.canvas-text-body');
      if (!body || body.contentEditable !== 'true') return;
      e.preventDefault();
      const wrap = img.closest('.inline-image-wrap') || img;
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNode(wrap);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    handle.addEventListener('pointerdown', (e) => {
      const body = img.closest('.canvas-text-body');
      if (!body || body.contentEditable !== 'true') return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = img.getBoundingClientRect().width;
      const onMove = (ev) => {
        const maxWidth = Math.max(40, body.clientWidth - 8);
        img.style.width = `${clamp(startWidth + (ev.clientX - startX), 40, maxWidth)}px`;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const note = currentNote();
        const objEl = body.closest('.canvas-object');
        const obj = note && objEl && getObj(note, objEl.dataset.id);
        if (note && obj) saveTextObjContent(note, obj, body);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
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

  // Fügt bereinigtes HTML (siehe sanitizePastedHtml) an der Cursor-Position ein -
  // wie insertPlainTextAtCaret, nur für mehrere/verschachtelte Knoten statt eines
  // einzelnen Textknotens.
  function insertSanitizedHtmlAtCaret(html) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const container = document.createElement('div');
    container.innerHTML = html;
    const frag = document.createDocumentFragment();
    let lastNode = null;
    while (container.firstChild) lastNode = frag.appendChild(container.firstChild);
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // Beim Einfügen aus Word/Browser/Google Docs & Co. kommt neben reinem Text auch
  // HTML mit in die Zwischenablage ("text/html") - das enthält die Formatierung
  // (fett, Farben, Links, Überschriften, Listen ...), die vorher komplett verloren
  // ging, weil nur "text/plain" ausgelesen wurde. Nur eine eng begrenzte Auswahl an
  // Elementen/Stil-Eigenschaften wird übernommen (siehe PASTE_*-Konstanten unten) -
  // alles andere (Skripte, eingebettete Bilder/Objekte, unbekannte Attribute wie
  // onclick, javascript:-Links usw.) wird entfernt bzw. "entpackt" (Element weg,
  // Inhalt bleibt), sowohl aus Sicherheitsgründen (kein Code aus der Zwischenablage
  // darf ausgeführt werden können) als auch, damit nur Formatierungen ankommen, die
  // diese App selbst auch anzeigen/weiterbearbeiten kann.
  const PASTE_INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUP', 'SUB', 'A', 'SPAN', 'MARK', 'FONT', 'BR']);
  const PASTE_LINE_TAGS = new Set(['P', 'DIV']); // von isLineBlockEl bereits als eigene "Zeile" erkannt
  const PASTE_CONVERT_TO_DIV_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'TR']);
  const PASTE_DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'LINK', 'META', 'BASE', 'SVG', 'VIDEO', 'AUDIO']);
  const PASTE_HEADING_STYLE = {
    H1: 'font-weight: 700; font-size: 28px',
    H2: 'font-weight: 700; font-size: 22px',
    H3: 'font-weight: 700; font-size: 19px',
    H4: 'font-weight: 700; font-size: 17px',
    H5: 'font-weight: 700; font-size: 15px',
    H6: 'font-weight: 700; font-size: 15px',
  };
  const PASTE_ALLOWED_STYLE_PROPS = new Set(['color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'font-size', 'font-family']);

  function sanitizePastedHtml(html) {
    // Wichtig: NICHT per innerHTML in ein normales, im Dokument lebendes Element
    // parsen - ein <img onerror="..."> (oder ähnliches) würde seinen Ladeversuch
    // (und damit den onerror-Handler) sofort auslösen, noch bevor die folgende
    // Bereinigung das Element entfernen kann. Ein per DOMParser erzeugtes
    // Dokument ist dagegen inert: Es lädt keine Ressourcen nach und führt keine
    // Skripte/Event-Handler aus.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    cleanPastedNode(doc.body);
    return doc.body.innerHTML;
  }

  function cleanPastedNode(root) {
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.remove();
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        // Quellen wie OneNote brechen ihren HTML-Quelltext rein aus
        // Lesbarkeitsgründen um (z. B. "Papa wurde\nmit der Rettung..." oder
        // Zeilenumbrüche/Leerzeilen ZWISCHEN zwei <p>-Absätzen) - im normalen
        // Web ist das bedeutungslos, da Browser solche Leerzeichen/
        // Zeilenumbrüche beim Anzeigen entweder zu einem einzigen Leerzeichen
        // zusammenfassen oder (zwischen Block-Elementen) ganz ignorieren.
        // Unser Textfeld nutzt aber white-space:pre-wrap (damit selbst
        // getippte Zeilenumbrüche erhalten bleiben) und würde diese
        // eigentlich unsichtbaren Umbrüche sonst als echte Zeilenumbrüche
        // mitten im Satz bzw. als zusätzliche Leerzeile zwischen Absätzen
        // darstellen. Ein Textknoten, der NUR aus solchen "normalen"
        // Leerzeichen/Umbrüchen besteht, war reine Formatierung des
        // Quelltexts (kein echter Inhalt) und wird komplett entfernt -
        // wichtig: ein &nbsp; (geschütztes Leerzeichen,  ) zählt NICHT
        // dazu, das ist echter, sichtbarer Inhalt (z. B. eine von OneNote
        // absichtlich leer gelassene Zeile) und darf nicht mit JavaScripts
        // Unicode-bewusstem trim() verwechselt werden, das   fälschlich
        // ebenfalls als "Leerraum" einstufen würde.
        if (/^[ \t\r\n]*$/.test(node.nodeValue)) {
          node.remove();
        } else {
          node.nodeValue = node.nodeValue.replace(/[ \t\r\n]+/g, ' ');
        }
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      cleanPastedNode(node); // erst die Kinder bereinigen
      const tag = node.tagName;
      if (PASTE_DROP_TAGS.has(tag)) {
        node.remove();
        continue;
      }
      if (PASTE_CONVERT_TO_DIV_TAGS.has(tag)) {
        // Elemente, die diese App nicht als eigene "Zeile" erkennt (siehe
        // isLineBlockEl), werden in ein normales <div> umgewandelt - die
        // optische Formatierung (z. B. Überschriftengröße) bleibt über einen
        // umschließenden <span style="..."> erhalten.
        const div = document.createElement('div');
        if (PASTE_HEADING_STYLE[tag]) {
          const span = document.createElement('span');
          span.setAttribute('style', PASTE_HEADING_STYLE[tag]);
          while (node.firstChild) span.appendChild(node.firstChild);
          div.appendChild(span);
        } else {
          if (tag === 'LI') div.appendChild(document.createTextNode('• '));
          while (node.firstChild) div.appendChild(node.firstChild);
        }
        node.replaceWith(div);
        continue;
      }
      if (tag === 'TABLE') {
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
        continue;
      }
      if (!PASTE_INLINE_TAGS.has(tag) && !PASTE_LINE_TAGS.has(tag)) {
        // Unbekanntes/nicht erlaubtes Element (z. B. Word/Google-Docs-eigene
        // Wrapper) - Inhalt behalten, Element selbst entfernen.
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.remove();
        continue;
      }
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        if (name === 'style') {
          const cleaned = sanitizeStyleAttr(attr.value);
          if (cleaned) node.setAttribute('style', cleaned);
          else node.removeAttribute('style');
          continue;
        }
        if (name === 'href' && tag === 'A') continue; // unten separat geprüft
        node.removeAttribute(attr.name);
      }
      if (tag === 'A') {
        const href = (node.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
          node.classList.add('note-link');
        } else {
          node.removeAttribute('href');
        }
      }
    }
  }

  function sanitizeStyleAttr(styleText) {
    const parts = [];
    for (const decl of styleText.split(';')) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!PASTE_ALLOWED_STYLE_PROPS.has(prop)) continue;
      if (!value || /expression|javascript:|url\(/i.test(value)) continue;
      parts.push(`${prop}: ${value}`);
    }
    return parts.join('; ');
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
    return [el.headingBtn, el.bulletListBtn, el.numberedListBtn, el.undoBtn, el.redoBtn];
  }

  // Setzt den Cursor möglichst genau an die angeklickte Bildschirmposition,
  // statt (wie bei einem reinen .focus()) immer an den Textanfang zu springen.
  function placeCaretAtPoint(body, x, y) {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range || !body.contains(range.startContainer)) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function enterTextEdit(note, obj, objEl, body, overlay, clientX, clientY) {
    // Sicherheitsnetz gegen das browsereigene Scrollen beim erstmaligen
    // Aktivieren eines contentEditable-Bereichs (siehe unten) - Position
    // VOR jeder Änderung merken, um sie danach explizit wiederherzustellen.
    const savedScrollLeft = el.canvasWorkspace.scrollLeft;
    const savedScrollTop = el.canvasWorkspace.scrollTop;

    selectObject(note, obj, objEl);
    body.contentEditable = 'true';
    body.classList.add('editing');
    overlay.style.display = 'none';
    // preventScroll: ohne das versucht der Browser bei jedem Fokussieren
    // (auch nach dem Einfügen/Formatieren, wenn das Textfeld dadurch größer
    // wird), das Element selbst "ideal" in den sichtbaren Bereich zu
    // scrollen - auf der frei positionierbaren Fläche sprang die gerade
    // bearbeitete Notiz dadurch gelegentlich ungewollt ganz nach oben.
    body.focus({ preventScroll: true });
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      placeCaretAtPoint(body, clientX, clientY);
    }
    // preventScroll allein reichte nicht: Das erstmalige Setzen einer neuen
    // Selection/Cursor-Position in einem gerade erst editierbar gewordenen
    // Bereich lässt manche Browser die Fläche TROTZDEM automatisch
    // verschieben, um die neue Cursor-Position "sichtbar" zu machen - dafür
    // gibt es keine Option zum Abschalten, und es passiert nicht über die
    // JS-Eigenschaft scrollTop (daher per Property-Setter nicht abfangbar)
    // und auch nicht unbedingt synchron oder im selben Frame. Stattdessen
    // wird für ein kurzes Zeitfenster ein "scroll"-Event-Listener gesetzt,
    // der JEDE Scroll-Änderung in dieser Zeit sofort wieder auf die vorher
    // gemerkte Position zurücksetzt - dieses Event feuert nachweislich auch
    // bei dem browsereigenen Nachscrollen.
    let scrollLockActive = true;
    const enforceScrollLock = () => {
      if (!scrollLockActive) return;
      if (
        el.canvasWorkspace.scrollLeft !== savedScrollLeft ||
        el.canvasWorkspace.scrollTop !== savedScrollTop
      ) {
        el.canvasWorkspace.scrollLeft = savedScrollLeft;
        el.canvasWorkspace.scrollTop = savedScrollTop;
      }
    };
    el.canvasWorkspace.addEventListener('scroll', enforceScrollLock);
    enforceScrollLock();
    requestAnimationFrame(enforceScrollLock);
    setTimeout(() => {
      scrollLockActive = false;
      el.canvasWorkspace.removeEventListener('scroll', enforceScrollLock);
    }, 400);
    activeTextEdit = { note, obj, objEl, body, overlay };
    lastSelectionRange = null;
    el.ribbonFontFamilyLabel.textContent = 'Calibri';
    el.ribbonFontSizeLabel.textContent = '11';
    // Auch ohne markierten Text nutzbar (wirkt dann auf die ganze aktuelle
    // Zeile, siehe currentFormatRange) - wie in Word, wo Schriftart/-größe &
    // Co. auch ohne vorheriges Markieren anwendbar sind.
    for (const btn of selectionFormatBtns()) btn.disabled = false;
    // Zeilen-weite Formatvorlagen (Überschrift, Listen) gelten für die ganze Zeile
    // und brauchen daher keine Textauswahl – sie sind während des ganzen
    // Bearbeitens nutzbar.
    for (const btn of editingOnlyFormatBtns()) btn.disabled = false;
  }

  // Erkennt Internetadressen (http(s):// oder www.) im Text und macht daraus
  // klickbare Links - läuft beim Verlassen eines Textfelds (nicht während des
  // Tippens, das würde die Cursor-Position bei jedem Zeichen gefährden).
  const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]+)/gi;
  const URL_TRAILING_PUNCT_RE = /[.,;:!?)\]}'"]+$/;

  function linkifyBody(body) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Text, der schon in einem Link steckt (oder z. B. im Bild-Platzhalter),
        // nicht nochmal verlinken.
        if (node.parentElement && node.parentElement.closest('a')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);
    for (const textNode of textNodes) linkifyTextNode(textNode);
  }

  function linkifyTextNode(textNode) {
    const text = textNode.textContent;
    URL_RE.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = URL_RE.exec(text))) {
      let raw = m[0];
      let end = m.index + raw.length;
      const trailing = raw.match(URL_TRAILING_PUNCT_RE);
      if (trailing) {
        raw = raw.slice(0, raw.length - trailing[0].length);
        end -= trailing[0].length;
      }
      if (raw.length < 4) continue;
      matches.push({ start: m.index, end, raw });
    }
    // Von hinten nach vorne einsetzen, damit die Start/End-Indizes der
    // übrigen Treffer im (noch unveränderten) Rest des Textknotens gültig bleiben.
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, raw } = matches[i];
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const a = document.createElement('a');
      a.href = /^www\./i.test(raw) ? `https://${raw}` : raw;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'note-link';
      range.surroundContents(a);
    }
  }

  // Ermittelt, ob an einer Bildschirmposition ein erkannter Link liegt -
  // gebraucht, weil das transparente Overlay über dem Textfeld (siehe
  // buildTextContent) außerhalb des Bearbeitungsmodus alle Klicks abfängt und
  // damit auch die eigentlichen <a>-Elemente darunter verdeckt.
  function findLinkAtPoint(body, x, y) {
    const links = body.querySelectorAll('a.note-link');
    for (const a of links) {
      const r = a.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return a;
    }
    return null;
  }

  function findReminderMarkerAtPoint(body, x, y) {
    const markers = body.querySelectorAll('.inline-reminder-marker');
    for (const m of markers) {
      const r = m.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return m;
    }
    return null;
  }

  function exitTextEdit(obj, body, overlay) {
    linkifyBody(body);
    body.contentEditable = 'false';
    body.classList.remove('editing');
    overlay.style.display = '';
    const note = currentNote();
    if (note) saveTextObjContent(note, obj, body);
    for (const btn of selectionFormatBtns()) btn.disabled = true;
    for (const btn of editingOnlyFormatBtns()) btn.disabled = true;
    if (activeTextEdit && activeTextEdit.obj.id === obj.id) {
      // Bewusst kurz "über den Blur hinweg" gemerkt (siehe
      // convertFloatingPdfToInline()): um eine schon vorhandene PDF-Datei per
      // Werkzeugleisten-Knopf an dieser Stelle einzufügen, muss man erst
      // dorthin klicken, um das PDF-Objekt auszuwählen (dessen Werkzeugleiste
      // sonst gar nicht sichtbar ist) - genau dieser Klick verlässt aber
      // bereits das Textfeld. Ohne dieses "Nachleben" wäre die Cursor-Position
      // in dem Moment schon unwiederbringlich verloren.
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && body.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        lastTextEditRange = sel.getRangeAt(0).cloneRange();
        lastTextEditContext = activeTextEdit;
      }
      activeTextEdit = null;
      lastSelectionRange = null;
    }
    closeAllFormatPopovers();
    // Ein leer gebliebenes Textobjekt (z. B. durch Klick auf die Fläche ohne
    // anschließende Eingabe) hinterlässt keine unsichtbare Karteileiche.
    if (note && isTextObjectEmpty(obj) && !hasAttachedContent(note, obj.id)) {
      note.objects = note.objects.filter((o) => o.id !== obj.id);
      if (selectedObjectId === obj.id) selectedObjectId = null;
      const objEl = findObjEl(obj.id);
      if (objEl) objEl.remove();
      schedulePersist();
      // Kein renderNoteList() hier - siehe Begründung in saveTextObjContent().
    }
  }

  function hasAttachedContent(note, objId) {
    if (note.objects.some((o) => o.parentId === objId)) return true;
    if (note.ink.strokes.some((s) => s.parentId === objId)) return true;
    return false;
  }

  // "Leer" heißt: kein Text UND kein eingebettetes Inline-Bild - reiner
  // Text-Check allein würde ein Textobjekt, das nur ein eingefügtes Bild ohne
  // Begleittext enthält, fälschlich als leer einstufen (obj.text erfasst nur
  // Textinhalt, keine <img>-Elemente).
  function isTextObjectEmpty(obj) {
    if (obj.text && obj.text.trim()) return false;
    if (obj.html && /<img[\s>]/i.test(obj.html)) return false;
    return true;
  }

  // Entfernt leer gebliebene Textobjekte, die durch einen Notizwechsel, ein
  // Neuladen der Seite oder einen Server-Neustart mitten in der Bearbeitung
  // nie ein reguläres blur() (und damit die Aufräum-Logik in exitTextEdit)
  // durchlaufen haben und sonst für immer als unsichtbare/leere Karteileichen
  // in den Daten hängen bleiben würden. Das gerade aktiv bearbeitete Objekt
  // wird bewusst ausgenommen, damit ein kurz leerer, aber noch offener
  // Cursor nicht mitten in der Eingabe verschwindet.
  function pruneEmptyTextObjects(note) {
    const keep = [];
    const removedIds = [];
    for (const o of note.objects) {
      // Nicht nur die id vergleichen: activeTextEdit wird nur bei einem
      // echten blur() zurückgesetzt (siehe exitTextEdit) - wechselt man die
      // Notiz/Ansicht per Neu-Rendern statt per blur, würde sonst ein
      // veraltetes activeTextEdit ein längst verlassenes leeres Objekt
      // dauerhaft vor dem Aufräumen schützen. isConnected/contentEditable
      // stellen sicher, dass es wirklich noch das gerade bearbeitete ist.
      const isActive = activeTextEdit && activeTextEdit.obj.id === o.id &&
        activeTextEdit.body.isConnected && activeTextEdit.body.contentEditable === 'true';
      if (o.type === 'text' && isTextObjectEmpty(o) && !hasAttachedContent(note, o.id) && !isActive) {
        removedIds.push(o.id);
      } else {
        keep.push(o);
      }
    }
    if (removedIds.length === 0) return;
    note.objects = keep;
    for (const id of removedIds) {
      if (selectedObjectId === id) selectedObjectId = null;
      const objEl = findObjEl(id);
      if (objEl) objEl.remove();
    }
  }

  // Merkt sich die zuletzt markierte (nicht eingeklappte) Textauswahl im gerade
  // bearbeiteten Text-Objekt, damit die Formatierungs-Buttons auch nach einem Klick
  // in die Werkzeugleiste noch wissen, was formatiert werden soll. Die Buttons
  // selbst bleiben unabhängig davon nutzbar (siehe enterTextEdit/
  // currentFormatRange) - ohne Auswahl wirkt eine Formatierung auf die ganze
  // aktuelle Zeile statt stillschweigend nichts zu tun.
  document.addEventListener('selectionchange', () => {
    if (!activeTextEdit) return;
    const sel = window.getSelection();
    const valid =
      sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      activeTextEdit.body.contains(sel.getRangeAt(0).commonAncestorContainer);
    lastSelectionRange = valid ? sel.getRangeAt(0).cloneRange() : null;
  });

  // Entf/Rücktaste löscht das gerade ausgewählte Objekt (Bild/PDF/Audio/Text) -
  // wie der Papierkorb-Knopf in seiner Werkzeugleiste. Greift bewusst nicht,
  // solange ein Textfeld bearbeitet wird oder der Fokus in einem Eingabefeld
  // liegt, damit Entf/Rücktaste dort ganz normal Zeichen löschen.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (activeTextEdit) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (!selectedObjectId) return;
    const note = currentNote();
    if (!note || !getObj(note, selectedObjectId)) return;
    e.preventDefault();
    deleteObject(note, selectedObjectId);
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

  // Liefert die Range, auf die eine Formatierung angewendet werden soll: eine
  // echte Textauswahl, falls vorhanden - sonst (nur Cursor, nichts markiert)
  // die ganze aktuelle Zeile, damit ein Klick auf Schriftart/-größe & Co.
  // ohne vorheriges Markieren nicht stillschweigend wirkungslos bleibt
  // (genau wie in Word: Formatierung ohne Auswahl wirkt auf die Zeile).
  function currentFormatRange() {
    if (!activeTextEdit) return null;
    if (lastSelectionRange) return lastSelectionRange;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const { body } = activeTextEdit;
    const caretRange = sel.getRangeAt(0);
    if (!body.contains(caretRange.startContainer)) return null;
    const nodes = getCurrentLineNodes(caretRange.startContainer, body);
    if (nodes.length === 0) return null;
    const range = document.createRange();
    range.setStartBefore(nodes[0]);
    range.setEndAfter(nodes[nodes.length - 1]);
    return range;
  }

  function withActiveSelection(fn) {
    const targetRange = currentFormatRange();
    if (!activeTextEdit || !targetRange) {
      closeAllFormatPopovers();
      return;
    }
    const { note, obj, objEl, body } = activeTextEdit;
    const ranges = splitRangeByLine(targetRange, body);
    for (const range of ranges) {
      expandRangeToElementBoundaries(range, body);
      fn(range, note, obj, body);
    }
    saveTextObjContent(note, obj, body);
    updateTextEmptyState(body);
    growFreeTextToFit(obj, objEl, body);
    updateOverflowIndicators(objEl, body);
    lastSelectionRange = null;
    closeAllFormatPopovers();
    body.focus({ preventScroll: true });
    // Die ursprüngliche Selektion wurde durch das Umbauen des DOM oben
    // (extractContents/insertNode) ungültig - ohne eine neu gesetzte
    // Selektion hätte ein erneuter Formatierungsklick (ohne dass der Nutzer
    // vorher wieder in den Text klickt) keine gültige aktuelle Zeile mehr
    // zum Anwenden (siehe currentFormatRange) und würde stillschweigend
    // nichts tun. Cursor daher ans Ende des Textfelds setzen.
    collapseSelectionToEnd(body);
  }

  // Setzt den Cursor kollabiert an die letzte Stelle im übergebenen Element -
  // WICHTIG: absichtlich in den tiefsten letzten Nachfahren hinein (nie auf
  // das Element selbst als Container), sonst liefert lineBlockOf() beim
  // nächsten Aufruf von currentFormatRange() das Element selbst statt der
  // tatsächlichen letzten Zeile zurück (das Element ist ja selbst ein <div>
  // und würde von isLineBlockEl() fälschlich als eigene "Zeile" erkannt).
  function collapseSelectionToEnd(container) {
    try {
      let node = container;
      while (node.lastChild) node = node.lastChild;
      const range = document.createRange();
      if (node.nodeType === Node.TEXT_NODE) {
        range.setStart(node, node.textContent.length);
      } else {
        range.selectNodeContents(node);
      }
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      // ignorieren
    }
  }

  function applyInlineCommand(command) {
    if (!activeTextEdit) return;
    const { body } = activeTextEdit;
    body.focus({ preventScroll: true });
    if (lastSelectionRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(lastSelectionRange);
    }
    document.execCommand(command);
    saveTextObjContent(activeTextEdit.note, activeTextEdit.obj, body);
  }

  // Rückgängig/Wiederherstellen über den nativen Undo-Verlauf des Browsers im
  // gerade bearbeiteten Textfeld (Strg+Z/Strg+Y funktionieren dort ohnehin
  // schon nativ - deckt vor allem getipptes/gelöschtes ab, nicht unbedingt
  // jede über die Werkzeugleiste gesetzte Formatierung, da execCommand nur
  // echte Tastatureingaben und selbst ausgeführte execCommand-Befehle
  // zuverlässig auf den Verlauf legt).
  function applyUndoRedo(command) {
    if (!activeTextEdit) return;
    const { note, obj, body } = activeTextEdit;
    body.focus({ preventScroll: true });
    document.execCommand(command);
    saveTextObjContent(note, obj, body);
    updateTextEmptyState(body);
  }

  function applyListCommand(command) {
    if (!activeTextEdit) return;
    const { body } = activeTextEdit;
    body.focus({ preventScroll: true });
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
    // Bereits vorhandene Werte derselben Eigenschaft in verschachtelten Spans
    // (z. B. eine frühere Schriftgröße) zuerst entfernen - sonst wird nur
    // eine weitere Schicht außen herumgelegt, und der innerste (älteste)
    // Wert "gewinnt" optisch immer weiter, weil ein Inline-Style auf einem
    // Nachfahren einen vom Vorfahren geerbten Wert stets überschreibt. Ohne
    // das ließe sich eine einmal gesetzte Schriftgröße/-art nie mehr ändern.
    frag.querySelectorAll('[style]').forEach((el) => {
      if (!el.style[styleProp]) return;
      el.style[styleProp] = '';
      if (!el.getAttribute('style')) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
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
      btn.textContent = size.label;
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
    if (!activeTextEdit) return;
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
    body.focus({ preventScroll: true });
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
    const entry = FONT_SIZES.find((s) => s.px === px);
    el.ribbonFontSizeLabel.textContent = entry ? entry.label : '11';
  }

  function applyFontFamilyChoice(css) {
    withActiveSelection((range) => {
      if (css) wrapSelectionWithStyle(range, 'fontFamily', css);
      else unwrapStyleFromRange(range, 'fontFamily');
    });
    const entry = FONT_FAMILIES.find((f) => f.css === css);
    el.ribbonFontFamilyLabel.textContent = entry ? entry.label : 'Calibri';
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

  // Lässt die Fläche mitwachsen, wenn ein Objekt (z. B. eine vielseitige PDF)
  // über die normale Seitengröße hinausragt – sonst würde das Vergrößern
  // eines solchen Objekts an der festen Flächengröße (SURFACE_W/H) hängen
  // bleiben bzw. wieder auf sie zurückschnappen.
  function updateSurfaceSize(note, force) {
    let w = BASE_SURFACE_W;
    let h = BASE_SURFACE_H;
    for (const obj of note.objects) {
      w = Math.max(w, obj.x + obj.w + 40);
      h = Math.max(h, obj.y + obj.h + 40);
    }
    // "force" wird beim Öffnen einer Notiz gebraucht: SURFACE_W/H sind
    // Modul-weite Variablen, die von der zuvor angezeigten Notiz noch einen
    // (ggf. größeren) Wert tragen können – ohne den Vergleich zu überspringen,
    // würde eine kleinere Notiz danach fälschlich die zu große Fläche behalten.
    if (!force && w === SURFACE_W && h === SURFACE_H) return;
    SURFACE_W = w;
    SURFACE_H = h;
    el.canvasSurface.style.width = `${w}px`;
    el.canvasSurface.style.height = `${h}px`;
    sizeInkLayer();
    redrawInk(note);
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

    objEl.addEventListener('pointerdown', (e) => startObjectDragUnlessTouch(e, note, obj, objEl));
  }

  // ----- Audio-Objekt -----

  function buildAudioContent(note, obj, objEl) {
    // Eigener Wrapper statt objEl direkt: objEl trägt auch die schwebende
    // Werkzeugleiste (position:absolute, oberhalb des Objekts) - würde das
    // Zuschneiden (overflow:hidden) für das scrollbare Transkript direkt auf
    // objEl liegen, würde es diese Werkzeugleiste mit abschneiden.
    const body = document.createElement('div');
    body.className = 'audio-chip-body';
    objEl.appendChild(body);

    const icon = document.createElement('div');
    icon.className = 'audio-chip-icon';
    icon.innerHTML = ICONS.mic;
    body.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'audio-chip-info';

    const title = document.createElement('div');
    title.className = 'audio-chip-title';
    title.textContent = obj.fileName || 'Sprachnotiz';
    info.appendChild(title);

    const audio = document.createElement('audio');
    audio.className = 'audio-chip-player';
    audio.controls = true;
    // Verhindert den "Herunterladen"-Eintrag im nativen Kontextmenü des
    // Players, der sonst wie ein eigener Bedienknopf aussieht und leicht mit
    // einer Lösch-/Verwaltungsfunktion verwechselt wird.
    audio.controlsList = 'nodownload';
    audio.preload = 'metadata';
    audio.src = obj.src;
    // Sonst würde jede Bedienung des Players (Play, Ziehen am Zeitstrahl) das
    // ganze Objekt statt nur den Player mitziehen.
    audio.addEventListener('pointerdown', (e) => e.stopPropagation());
    info.appendChild(audio);

    body.appendChild(info);

    objEl.addEventListener('pointerdown', (e) => startObjectDragUnlessTouch(e, note, obj, objEl));

    if (obj.transcriptStatus) {
      renderAudioTranscriptUI(note, obj, objEl);
      // Falls die Seite während einer laufenden Transkription neu geladen wurde,
      // hier weiter auf das Ergebnis warten statt es zu verlieren.
      if (obj.transcriptStatus === 'processing' && obj.transcriptJobId) {
        pollTranscription(note, obj, objEl);
      }
    }
  }

  function renameSpeaker(note, obj, objEl, speakerKey) {
    const current = (obj.speakerNames && obj.speakerNames[speakerKey]) || speakerKey;
    const name = prompt('Name für diesen Sprecher:', current);
    if (name === null) return;
    if (!obj.speakerNames) obj.speakerNames = {};
    obj.speakerNames[speakerKey] = name.trim() || speakerKey;
    schedulePersist();
    renderAudioTranscriptUI(note, obj, objEl);
  }

  function renderAudioTranscriptUI(note, obj, objEl) {
    const info = objEl.querySelector('.audio-chip-info');
    if (!info) return;
    let area = info.querySelector('.audio-transcript');
    if (!area) {
      area = document.createElement('div');
      area.className = 'audio-transcript';
      // Sonst würde ein Scrollen im (evtl. langen) Transkript als Ziehen des
      // ganzen Objekts interpretiert, siehe audio-chip-player weiter oben.
      area.addEventListener('pointerdown', (e) => e.stopPropagation());
      info.appendChild(area);
    }
    if (obj.transcriptStatus === 'processing') {
      area.className = 'audio-transcript audio-transcript-status';
      area.innerHTML = '';
      const percent = Math.round((obj.transcriptProgress || 0) * 100);
      const label = document.createElement('div');
      label.textContent = `Transkription läuft im Hintergrund … ${percent}% (kann bei langen Aufnahmen mehrere Stunden dauern)`;
      area.appendChild(label);
      const barTrack = document.createElement('div');
      barTrack.className = 'audio-transcript-progress-track';
      const barFill = document.createElement('div');
      barFill.className = 'audio-transcript-progress-fill';
      barFill.style.width = `${percent}%`;
      barTrack.appendChild(barFill);
      area.appendChild(barTrack);
    } else if (obj.transcriptStatus === 'error') {
      area.className = 'audio-transcript audio-transcript-status';
      area.textContent = `Transkription fehlgeschlagen: ${obj.transcriptError || 'unbekannter Fehler'}`;
    } else if (obj.transcriptStatus === 'done' && obj.transcript) {
      area.className = 'audio-transcript';
      area.innerHTML = '';
      obj.transcript.forEach((seg) => {
        const line = document.createElement('div');
        line.className = 'audio-transcript-line';
        const speakerBtn = document.createElement('button');
        speakerBtn.type = 'button';
        speakerBtn.className = 'audio-transcript-speaker';
        const label = (obj.speakerNames && obj.speakerNames[seg.speaker]) || seg.speaker || 'Sprecher';
        speakerBtn.textContent = `${label}:`;
        speakerBtn.title = 'Sprecher umbenennen';
        speakerBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
        speakerBtn.addEventListener('click', () => renameSpeaker(note, obj, objEl, seg.speaker));
        line.appendChild(speakerBtn);
        line.appendChild(document.createTextNode(` ${seg.text}`));
        area.appendChild(line);
      });
    }
    // Fläche automatisch groß genug machen, damit das Transkript lesbar ist.
    if (obj.transcriptStatus === 'done' && obj.h < 260) {
      obj.h = 260;
      applyObjRect(objEl, obj);
      updateSurfaceSize(note);
    }
  }

  function startTranscription(note, obj, objEl) {
    if (obj.transcriptStatus === 'processing') return;
    obj.transcriptStatus = 'processing';
    obj.transcriptError = null;
    schedulePersist();
    renderAudioTranscriptUI(note, obj, objEl);
    fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: obj.src }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.jobId) throw new Error(data.error || 'Transkription konnte nicht gestartet werden');
        obj.transcriptJobId = data.jobId;
        schedulePersist();
        pollTranscription(note, obj, objEl);
      })
      .catch((err) => {
        console.error('Transkription konnte nicht gestartet werden:', err);
        obj.transcriptStatus = 'error';
        obj.transcriptError = 'Transkription konnte nicht gestartet werden.';
        schedulePersist();
        renderAudioTranscriptUI(note, obj, objEl);
      });
  }

  function pollTranscription(note, obj, objEl) {
    if (!obj.transcriptJobId) return;
    const poll = () => {
      // Objekt könnte inzwischen gelöscht worden sein - dann nicht weiter pollen.
      if (!document.body.contains(objEl)) return;
      fetch(`/api/transcribe/${obj.transcriptJobId}`)
        .then((res) => {
          // 404 = Job unbekannt, z. B. weil der Server währenddessen neu
          // gestartet ist (Jobs werden nur im Arbeitsspeicher gehalten).
          // Ohne diese Prüfung würde data.status undefined bleiben und der
          // "sonst weiter warten"-Zweig unten den Job für immer weiterpollen,
          // statt den Abbruch als Fehler zu melden.
          if (res.status === 404) return { status: 'error', error: 'Auftrag nach Server-Neustart verloren gegangen. Bitte erneut versuchen.' };
          return res.json();
        })
        .then((data) => {
          if (data.status === 'done') {
            obj.transcriptStatus = 'done';
            obj.transcript = data.result.segments;
            obj.transcriptLanguage = data.result.language;
            if (!obj.speakerNames) obj.speakerNames = {};
            schedulePersist();
            renderAudioTranscriptUI(note, obj, objEl);
          } else if (data.status === 'error') {
            obj.transcriptStatus = 'error';
            obj.transcriptError = data.error || 'Unbekannter Fehler';
            schedulePersist();
            renderAudioTranscriptUI(note, obj, objEl);
          } else {
            if (typeof data.progress === 'number') {
              obj.transcriptProgress = data.progress;
              renderAudioTranscriptUI(note, obj, objEl);
            }
            setTimeout(poll, 4000);
          }
        })
        .catch(() => setTimeout(poll, 8000));
    };
    // Verzögert statt sofort aufrufen: beim Wiederaufnehmen einer laufenden
    // Transkription (aus buildAudioContent) ist objEl in diesem Moment noch
    // nicht ins DOM eingehängt (das passiert erst im Aufrufer direkt danach) -
    // der document.body.contains()-Check würde sonst fälschlich abbrechen.
    setTimeout(poll, 0);
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
    const pages = obj.pageCount > 1 ? `PDF · ${obj.pageCount} Seiten` : 'PDF';

    if (obj.variant === 'file') {
      objEl.classList.add('pdf-file-chip');
      const icon = document.createElement('div');
      icon.className = 'pdf-file-chip-icon';
      icon.innerHTML = '<svg viewBox="0 0 20 20" class="icon" aria-hidden="true"><path d="M5 2h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm6.5.6V6H15L11.5 2.6zM6.2 9.5h1.6c.9 0 1.5.5 1.5 1.4 0 .9-.6 1.4-1.5 1.4h-.7v1.6H6.2V9.5zm1 .9v1h.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-.5zm2.7-.9h1.4c1.2 0 1.9.7 1.9 2.2 0 1.5-.7 2.2-1.9 2.2H9.9V9.5zm1 .9v2.6h.3c.6 0 1-.4 1-1.3s-.4-1.3-1-1.3h-.3zm3-.9h2.3v.9h-1.3v.7h1.2v.9h-1.2v1.6h-1V9.5z"/></svg>';
      objEl.appendChild(icon);
      const text = document.createElement('div');
      text.className = 'pdf-file-chip-text';
      text.innerHTML = `<span class="pdf-file-chip-name">${escapeHtml(obj.fileName || 'PDF')}</span><span class="pdf-file-chip-pages">${pages}</span>`;
      objEl.appendChild(text);
    } else {
      if (typeof obj.viewZoom !== 'number') obj.viewZoom = 1;
      if (typeof obj.viewPanX !== 'number') obj.viewPanX = 0;
      if (typeof obj.viewPanY !== 'number') obj.viewPanY = 0;

      const viewport = document.createElement('div');
      viewport.className = 'pdf-view-viewport';
      objEl.appendChild(viewport);

      const img = document.createElement('img');
      img.className = 'canvas-image-el';
      img.src = obj.src;
      img.draggable = false;
      viewport.appendChild(img);

      const applyViewTransform = () => {
        img.style.transform = `translate(${obj.viewPanX}px, ${obj.viewPanY}px) scale(${obj.viewZoom})`;
      };
      applyViewTransform();

      const badge = document.createElement('div');
      badge.className = 'pdf-badge';
      badge.textContent = obj.fileName ? `${pages} · ${obj.fileName}` : pages;
      objEl.appendChild(badge);

      const hint = document.createElement('div');
      hint.className = 'pdf-zoom-hint';
      hint.textContent = 'Mausrad: Zoom · Umschalt oder mittlere Maustaste + Ziehen: Verschieben';
      objEl.appendChild(hint);
      let hintTimer = null;
      viewport.addEventListener('mouseenter', () => {
        hint.classList.add('visible');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => hint.classList.remove('visible'), 3000);
      });
      viewport.addEventListener('mouseleave', () => {
        clearTimeout(hintTimer);
        hint.classList.remove('visible');
      });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newZoom = clamp(obj.viewZoom * factor, 1, 5);
        const rect = viewport.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        obj.viewPanX = cx - (newZoom / obj.viewZoom) * (cx - obj.viewPanX);
        obj.viewPanY = cy - (newZoom / obj.viewZoom) * (cy - obj.viewPanY);
        obj.viewZoom = newZoom;
        if (obj.viewZoom <= 1.001) {
          obj.viewZoom = 1;
          obj.viewPanX = 0;
          obj.viewPanY = 0;
        }
        applyViewTransform();
        schedulePersist();
      }, { passive: false });

      viewport.addEventListener('pointerdown', (e) => {
        const isMiddleButton = e.button === 1;
        const isShiftLeftButton = e.shiftKey && (e.button === undefined || e.button === 0);
        if (!isMiddleButton && !isShiftLeftButton) return;
        e.preventDefault();
        e.stopPropagation();
        selectObject(note, obj, objEl);
        const startX = e.clientX;
        const startY = e.clientY;
        const startPanX = obj.viewPanX;
        const startPanY = obj.viewPanY;
        const onMove = (ev) => {
          obj.viewPanX = startPanX + (ev.clientX - startX);
          obj.viewPanY = startPanY + (ev.clientY - startY);
          applyViewTransform();
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          schedulePersist();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    }

    if (obj.variant === 'file') wireFileChipInteraction(note, obj, objEl);
    else objEl.addEventListener('pointerdown', (e) => startObjectDragUnlessTouch(e, note, obj, objEl));
  }

  // Gemeinsame Klick-Logik für PDF-/Datei-Anhänge: ein einzelner Klick wählt
  // nur aus (und erlaubt Verschieben per Ziehen wie jedes andere Objekt), erst
  // ein Doppelklick öffnet die Datei - damit ein normaler Klick zum Anwählen
  // oder Umbenennen nicht schon versehentlich einen Download auslöst.
  function wireFileChipInteraction(note, obj, objEl) {
    const nameEl = objEl.querySelector('.file-chip-name, .pdf-file-chip-name');
    if (nameEl) {
      nameEl.addEventListener('pointerdown', (e) => {
        if (nameEl.isContentEditable) e.stopPropagation();
      });
    }
    let lastTapAt = 0;
    objEl.addEventListener('pointerdown', (e) => {
      const now = Date.now();
      if (now - lastTapAt < 400) {
        lastTapAt = 0;
        openAttachedFile(obj);
        return;
      }
      lastTapAt = now;
      startObjectDragUnlessTouch(e, note, obj, objEl);
    });
  }

  // Rendert alle Seiten einer PDF-Datei in EIN einziges, hohes Bild (Seiten
  // untereinander gestapelt, mit dünner Trennlinie) – wie das "Ausdruck
  // einfügen" in OneNote, wo die ganze Datei sichtbar auf der Seite liegt.
  async function renderPdfAllPages(pdf) {
    // Bei vielen Seiten die Auflösung pro Seite reduzieren – sonst wird die
    // Gesamtgröße (und damit der Speicherbedarf beim Sichern) bei langen
    // Dokumenten schnell unnötig groß. Die Originaldatei bleibt ohnehin über
    // "PDF öffnen" in voller Qualität verfügbar.
    const scale = pdf.numPages > 6 ? 1.3 : 2;
    const pageGap = 14;
    // Jede Seite wird zuerst auf eine EIGENE Leinwand gerendert: pdf.js leert
    // beim Rendern einer Seite die komplette übergebene Leinwand, daher würde
    // ein direktes Zeichnen mehrerer Seiten nacheinander auf dieselbe große
    // Leinwand (nur mit Transform-Versatz) die zuvor gezeichneten Seiten
    // wieder löschen. Die fertigen Seiten-Bilder werden danach per drawImage
    // zusammengesetzt.
    const pages = [];
    let maxWidth = 0;
    let totalHeight = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = viewport.width;
      pageCanvas.height = viewport.height;
      await page.render({ canvasContext: pageCanvas.getContext('2d'), viewport }).promise;
      pages.push({ canvas: pageCanvas, width: viewport.width, height: viewport.height });
      maxWidth = Math.max(maxWidth, viewport.width);
      totalHeight += viewport.height + (i > 1 ? pageGap : 0);
    }
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = maxWidth;
    renderCanvas.height = totalHeight;
    const ctx = renderCanvas.getContext('2d');
    ctx.fillStyle = '#e2e2e2';
    ctx.fillRect(0, 0, maxWidth, totalHeight);
    let offsetY = 0;
    for (const p of pages) {
      const offsetX = (maxWidth - p.width) / 2;
      ctx.drawImage(p.canvas, offsetX, offsetY);
      offsetY += p.height + pageGap;
    }
    return { canvas: renderCanvas, width: maxWidth, height: totalHeight };
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob fehlgeschlagen'))), 'image/jpeg', quality);
    });
  }

  // Lädt eine Datei (Bild, PDF oder gerenderte Vorschau) zum Server hoch und
  // liefert die dauerhafte URL zurück, unter der sie danach abrufbar ist.
  async function uploadFile(fileOrBlob, filename) {
    const fd = new FormData();
    fd.append('file', fileOrBlob, filename || fileOrBlob.name || 'upload');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Upload fehlgeschlagen (HTTP ${res.status})`);
    const data = await res.json();
    return data.url;
  }

  let pdfModeResolve = null;
  // Nur gesetzt, während gerade eine PDF-Datei ausgewählt wird, während der
  // Cursor in einem Textobjekt stand (siehe Wiring von addPdfBtn) - merkt
  // sich, wo das Datei-Symbol beim Einfügen in den Text eingesetzt werden
  // soll. Muss VOR dem Öffnen des nativen Dateiauswahl-Fensters erfasst
  // werden, da dieses den Fokus (und damit die Cursor-Position) sofort
  // verliert, sobald es sich öffnet.
  let pendingInlinePdfRange = null;
  let pendingInlinePdfHost = null;

  function askPdfInsertMode() {
    return new Promise((resolve) => {
      pdfModeResolve = resolve;
      el.pdfInlineFileModeBtn.hidden = !pendingInlinePdfHost;
      el.pdfModePopoverBackdrop.hidden = false;
    });
  }

  function resolvePdfInsertMode(mode) {
    el.pdfModePopoverBackdrop.hidden = true;
    if (pdfModeResolve) {
      const resolve = pdfModeResolve;
      pdfModeResolve = null;
      resolve(mode);
    }
  }

  // Öffnet die ursprüngliche Datei (PDF oder ein sonstiger Anhang wie Word/Excel)
  // im Browser bzw. lädt sie herunter. fileData ist eine ganz normale
  // Server-URL, daher genügt window.open - für Formate, die der Browser nicht
  // selbst anzeigen kann (z. B. .docx), stößt das einen normalen Download an,
  // den man danach lokal in Word öffnet.
  function openAttachedFile(obj) {
    if (!obj.fileData) return;
    window.open(obj.fileData, '_blank');
  }

  // Macht den angezeigten Dateinamen eines PDF-/Datei-Anhangs direkt editierbar
  // (Enter/Wegklicken übernimmt, Escape verwirft). Ändert nur den angezeigten
  // Namen (obj.fileName), nicht die Original-Datei auf dem Server - bei einem
  // generischen Datei-Anhang wird danach auch Symbol/Kürzel (WORD/EXCEL/...)
  // an die ggf. neue Dateiendung angepasst.
  function startRenameFileAttachment(obj, objEl) {
    const nameEl = objEl.querySelector('.file-chip-name, .pdf-file-chip-name');
    if (!nameEl) return;
    nameEl.contentEditable = 'true';
    nameEl.spellcheck = false;
    nameEl.focus();
    document.execCommand('selectAll', false, null);

    const finish = (commit) => {
      nameEl.contentEditable = 'false';
      nameEl.removeEventListener('blur', onBlur);
      nameEl.removeEventListener('keydown', onKeydown);
      const newName = nameEl.textContent.trim();
      if (commit && newName && newName !== obj.fileName) {
        obj.fileName = newName;
        if (obj.type === 'file') {
          const kind = fileKindStyle(obj.fileName);
          const kindEl = objEl.querySelector('.file-chip-kind');
          if (kindEl) kindEl.textContent = kind.label;
          const iconEl = objEl.querySelector('.file-chip-icon');
          if (iconEl) iconEl.style.background = kind.color;
        }
        schedulePersist();
      } else {
        nameEl.textContent = obj.fileName;
      }
    };
    const onBlur = () => finish(true);
    const onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameEl.blur();
      } else if (e.key === 'Escape') {
        finish(false);
      }
    };
    nameEl.addEventListener('blur', onBlur);
    nameEl.addEventListener('keydown', onKeydown);
  }

  async function addPdfObjectFromFile(file, dropPoint) {
    const note = currentNote();
    if (!note || !file) return;
    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const mode = await askPdfInsertMode();
      if (!mode) return;

      const fileData = await uploadFile(file);

      if (mode === 'inline-file') {
        if (pendingInlinePdfRange && pendingInlinePdfHost) {
          insertInlinePdfChip(note, pendingInlinePdfHost, pendingInlinePdfRange, {
            fileName: file.name,
            fileData,
            pageCount: pdf.numPages,
          });
          renderNoteList();
        }
        return;
      }

      let src = null;
      let w = 240;
      let h = 60;
      if (mode === 'pages') {
        const rendered = await renderPdfAllPages(pdf);
        const maxW = 360;
        const scale = Math.min(1, maxW / rendered.width);
        w = Math.round(rendered.width * scale) || 200;
        h = Math.round(rendered.height * scale) || 260;
        const blob = await canvasToJpegBlob(rendered.canvas, 0.82);
        src = await uploadFile(blob, `${file.name}.jpg`);
      }

      const { x, y } = dropPoint
        ? { x: clamp(dropPoint.x - w / 2, 0, Math.max(0, SURFACE_W - w)), y: clamp(dropPoint.y - h / 2, 0, Math.max(0, SURFACE_H - h)) }
        : nextPlacement(note, w, h);
      const objData = {
        id: uid(), type: 'pdf', x, y, w, h, z: 0,
        src, pageCount: pdf.numPages, fileName: file.name, variant: mode, fileData,
      };
      bringToFront(note, objData);
      note.objects.push(objData);
      const objEl = buildObjectEl(note, objData);
      el.canvasSurface.insertBefore(objEl, el.inkLayer);
      selectObject(note, objData, objEl);
      updateSurfaceSize(note);
      schedulePersist();
      renderNoteList();
    } catch (err) {
      console.error('PDF konnte nicht eingefügt werden:', err);
      alert('Diese PDF-Datei konnte nicht eingefügt werden.');
    }
  }

  // Kleines Datei-Symbol direkt im Text (statt einer frei auf der Fläche
  // platzierten Karte) - bewegt sich als ganz normaler Inline-Bestandteil des
  // Textes mit, wenn sich darüber etwas ändert. Braucht (anders als z. B. die
  // Erinnerungen) kein eigenes note.objects-Eintrag: die Datei-Adresse steckt
  // direkt im gespeicherten HTML des Textobjekts, genau wie bei eingebetteten
  // Bildern (siehe enhanceInlineImages()).
  function buildInlinePdfChipEl({ fileName, fileData, pageCount }) {
    const span = document.createElement('span');
    span.className = 'inline-pdf-chip';
    span.contentEditable = 'false';
    span.dataset.fileData = fileData;
    const pages = pageCount > 1 ? `PDF · ${pageCount} Seiten` : 'PDF';
    span.title = `${fileName || 'PDF'} (${pages})`;
    span.innerHTML =
      '<span class="inline-pdf-chip-icon"><svg viewBox="0 0 20 20" class="icon" aria-hidden="true">' +
      '<path d="M5 2h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm6.5.6V6H15L11.5 2.6z"/></svg></span>' +
      `<span class="inline-pdf-chip-name">${escapeHtml(fileName || 'PDF')}</span>`;
    return span;
  }

  function insertInlinePdfChip(note, hostTextEdit, range, fileInfo) {
    const { body } = hostTextEdit;
    const chip = buildInlinePdfChipEl(fileInfo);
    range.collapse(true);
    range.insertNode(chip);

    const after = document.createRange();
    after.setStartAfter(chip);
    after.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(after);

    enhanceInlinePdfChips(body);
    saveTextObjContent(note, hostTextEdit.obj, body);
    // Ohne das bleibt die Box in ihrer alten (kleineren) Höhe stehen und der
    // neu eingefügte Chip landet unsichtbar außerhalb des sichtbaren/
    // scrollbaren Bereichs - normalerweise übernimmt das der 'input'-Handler,
    // der hier aber nicht ausgelöst wird (die Einfügung passiert nicht über
    // eine echte Tastatureingabe).
    growFreeTextToFit(hostTextEdit.obj, hostTextEdit.objEl, body);
    updateOverflowIndicators(hostTextEdit.objEl, body);
  }

  // Wandelt eine bereits frei auf der Fläche platzierte PDF-Datei (Karte oder
  // Datei-Symbol) in ein Inline-Symbol an der aktuellen Cursor-Stelle im Text
  // um - für PDFs, die man erst im Nachhinein "aus dem Weg" direkt in den Text
  // stellen möchte. Braucht dafür einen gerade aktiv bearbeiteten Text, in den
  // eingefügt werden kann - ohne den lässt sich schließlich nicht wissen, WO
  // im Text das Symbol landen soll.
  function convertFloatingPdfToInline(note, obj, objEl) {
    let hostTextEdit = activeTextEdit;
    let range = null;
    const sel = window.getSelection();
    const liveRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (hostTextEdit && liveRange && hostTextEdit.body.contains(liveRange.commonAncestorContainer)) {
      range = liveRange.cloneRange();
    } else if (lastTextEditContext && lastTextEditRange && document.body.contains(lastTextEditContext.body)) {
      // Das Auswählen des PDF-Objekts (nötig, damit seine Werkzeugleiste
      // überhaupt sichtbar wird) hat den Text bereits verlassen - die zuletzt
      // dort gemerkte Position wird stattdessen verwendet (siehe exitTextEdit()).
      hostTextEdit = lastTextEditContext;
      range = lastTextEditRange.cloneRange();
    }
    if (!hostTextEdit || !range) {
      alert('Klicke zuerst in den Text an der gewünschten Stelle, dann noch einmal auf dieses Symbol.');
      return;
    }
    insertInlinePdfChip(note, hostTextEdit, range, {
      fileName: obj.fileName,
      fileData: obj.fileData,
      pageCount: obj.pageCount,
    });
    // Wie deleteObject(), aber bewusst ohne dessen "Objekt löschen?"-
    // Sicherheitsabfrage - das Umwandeln ist ein einzelner, gewollter Klick,
    // kein versehentliches Löschen.
    for (const o of note.objects) {
      if (o.parentId === obj.id) o.parentId = null;
    }
    for (const s of note.ink.strokes) {
      if (s.parentId === obj.id) {
        s.points = strokeAbsolutePoints(note, s);
        s.parentId = null;
      }
    }
    note.objects = note.objects.filter((o) => o.id !== obj.id);
    if (selectedObjectId === obj.id) selectedObjectId = null;
    objEl.remove();
    note.updatedAt = Date.now();
    schedulePersist();
    updateSurfaceSize(note);
    renderNoteList();
  }

  // Macht den angezeigten Namen eines eingebetteten PDF-Symbols direkt
  // editierbar (Enter/Wegklicken übernimmt, Escape verwirft) - ändert nur den
  // angezeigten Namen, nicht die Original-Datei auf dem Server. Analog zu
  // startRenameFileAttachment() für frei platzierte PDF-/Datei-Anhänge, hier
  // aber ohne note.objects-Eintrag: die Änderung landet direkt im
  // gespeicherten HTML des Textobjekts.
  function startRenameInlinePdfChip(chip) {
    const nameEl = chip.querySelector('.inline-pdf-chip-name');
    if (!nameEl) return;
    const original = nameEl.textContent;
    nameEl.contentEditable = 'true';
    nameEl.spellcheck = false;
    nameEl.focus();
    document.execCommand('selectAll', false, null);

    const finish = (commit) => {
      nameEl.contentEditable = 'false';
      nameEl.removeEventListener('blur', onBlur);
      nameEl.removeEventListener('keydown', onKeydown);
      const newName = nameEl.textContent.trim();
      nameEl.textContent = commit && newName ? newName : original;
      chip.title = nameEl.textContent;

      const body = chip.closest('.canvas-text-body');
      const objEl = chip.closest('.canvas-object');
      const note = currentNote();
      const textObj = note && objEl && note.objects.find((o) => o.id === objEl.dataset.id);
      if (body && textObj) saveTextObjContent(note, textObj, body);
    };
    const onBlur = () => finish(true);
    const onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameEl.blur();
      } else if (e.key === 'Escape') {
        finish(false);
      }
    };
    nameEl.addEventListener('blur', onBlur);
    nameEl.addEventListener('keydown', onKeydown);
  }

  // Wie enhanceInlineImages(): rohes HTML (z. B. beim Laden einer Notiz)
  // bringt keine Klick-Handler mit, die müssen nach jedem Aufbau neu gesetzt
  // werden. Eine reine JS-Eigenschaft (nicht dataset/HTML-Attribut) verhindert
  // ein doppeltes Anhängen, ohne mit ins gespeicherte HTML zu wandern.
  //
  // Einfacher Klick öffnet die Datei, Doppelklick benennt sie um. Kein
  // natives "dblclick" möglich: ein Klick, der durch die Verschiebe-
  // Überlagerung hindurch weitergereicht wird (siehe findInlinePdfChipAtPoint()
  // in buildTextContent()), löst hier nur ein einzelnes "click" aus - der
  // Browser bekommt die zwei echten Klicks nie direkt auf demselben Element zu
  // sehen, um selbst ein "dblclick" daraus zu machen. Deshalb wie bei der
  // Ordner-Umbenennung (siehe lastFolderTapAt/-Id) zeitbasiert selbst erkannt:
  // öffnet mit kurzer Verzögerung, außer ein zweiter Klick trifft rechtzeitig
  // ein - dann wird daraus das Umbenennen statt des Öffnens.
  function enhanceInlinePdfChips(body) {
    body.querySelectorAll('.inline-pdf-chip').forEach((chip) => {
      if (chip.pdfChipWired) return;
      chip.pdfChipWired = true;
      let openTimer = null;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openTimer) {
          clearTimeout(openTimer);
          openTimer = null;
          startRenameInlinePdfChip(chip);
          return;
        }
        openTimer = setTimeout(() => {
          openTimer = null;
          if (chip.dataset.fileData) window.open(chip.dataset.fileData, '_blank');
        }, 300);
      });
    });
  }

  function findInlinePdfChipAtPoint(body, x, y) {
    const chips = body.querySelectorAll('.inline-pdf-chip');
    for (const c of chips) {
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c;
    }
    return null;
  }

  // Farbe/Kürzel für den generischen Datei-Chip, angelehnt an die Farben der
  // jeweiligen Office-App - rein optisch, damit man Word/Excel/PowerPoint auf
  // einen Blick unterscheidet. Unbekannte Dateiendungen fallen auf ein
  // neutrales Grau mit der Endung als Kürzel zurück.
  const FILE_KIND_STYLES = {
    doc: { label: 'WORD', color: '#2b579a' },
    docx: { label: 'WORD', color: '#2b579a' },
    xls: { label: 'EXCEL', color: '#217346' },
    xlsx: { label: 'EXCEL', color: '#217346' },
    ppt: { label: 'POWERPOINT', color: '#d24726' },
    pptx: { label: 'POWERPOINT', color: '#d24726' },
    zip: { label: 'ZIP', color: '#6b7280' },
    txt: { label: 'TXT', color: '#6b7280' },
    csv: { label: 'CSV', color: '#217346' },
  };

  function fileKindStyle(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    return FILE_KIND_STYLES[ext] || { label: ext ? ext.toUpperCase() : 'DATEI', color: '#6b7280' };
  }

  // Beliebige andere Dateien (Word, Excel, ZIP, ...), die der Browser nicht
  // selbst rendern kann, werden - wie ein Dateianhang in OneNote - nur als
  // Symbol mit Dateiname abgelegt. Ein Klick lädt die Originaldatei herunter
  // bzw. öffnet sie, je nachdem was der Browser für diesen Dateityp kann.
  async function addFileObjectFromFile(file, dropPoint) {
    const note = currentNote();
    if (!note || !file) return;
    try {
      const fileData = await uploadFile(file);
      const w = 240;
      const h = 60;
      const { x, y } = dropPoint
        ? { x: clamp(dropPoint.x - w / 2, 0, Math.max(0, SURFACE_W - w)), y: clamp(dropPoint.y - h / 2, 0, Math.max(0, SURFACE_H - h)) }
        : nextPlacement(note, w, h);
      const objData = { id: uid(), type: 'file', x, y, w, h, z: 0, fileName: file.name, fileData };
      bringToFront(note, objData);
      note.objects.push(objData);
      const objEl = buildObjectEl(note, objData);
      el.canvasSurface.insertBefore(objEl, el.inkLayer);
      selectObject(note, objData, objEl);
      updateSurfaceSize(note);
      schedulePersist();
      renderNoteList();
    } catch (err) {
      console.error('Datei konnte nicht angehängt werden:', err);
      alert('Diese Datei konnte nicht angehängt werden.');
    }
  }

  function buildFileContent(note, obj, objEl) {
    const kind = fileKindStyle(obj.fileName);
    objEl.classList.add('file-chip');
    const icon = document.createElement('div');
    icon.className = 'file-chip-icon';
    icon.style.background = kind.color;
    icon.innerHTML = '<svg viewBox="0 0 20 20" class="icon" aria-hidden="true"><path d="M5 2h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm6.5.6V6H15L11.5 2.6z"/></svg>';
    objEl.appendChild(icon);
    const text = document.createElement('div');
    text.className = 'file-chip-text';
    text.innerHTML = `<span class="file-chip-name">${escapeHtml(obj.fileName || 'Datei')}</span><span class="file-chip-kind">${kind.label}</span>`;
    objEl.appendChild(text);
    wireFileChipInteraction(note, obj, objEl);
  }

  // Zugangsdaten-Karte: zeigt zugeklappt nur die Bezeichnung, ein Klick
  // darauf blendet die enthaltenen Felder (Benutzername, Passwort, ...) ein.
  // Der aufgeklappte Zustand wird bewusst NICHT gespeichert - jede Karte
  // startet nach einem Neuaufbau der Fläche (z. B. Notizwechsel) wieder
  // zugeklappt.
  function buildCredentialContent(note, obj, objEl) {
    const card = document.createElement('div');
    card.className = 'credential-card';

    const header = document.createElement('div');
    header.className = 'credential-card-header';
    header.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.key}</svg>`;
    const title = document.createElement('span');
    title.className = 'credential-card-title';
    title.textContent = obj.title || 'Zugangsdaten';
    header.appendChild(title);
    card.appendChild(header);

    const fieldsEl = document.createElement('div');
    fieldsEl.className = 'credential-card-fields';
    for (const field of obj.fields || []) {
      const row = document.createElement('div');
      row.className = 'credential-card-field';
      const labelEl = document.createElement('span');
      labelEl.className = 'credential-card-field-label';
      labelEl.textContent = `${field.label}:`;
      const valueEl = document.createElement('span');
      valueEl.className = 'credential-card-field-value';
      valueEl.textContent = field.value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      fieldsEl.appendChild(row);
    }
    card.appendChild(fieldsEl);

    card.addEventListener('click', (e) => {
      // Textmarkieren (z. B. um ein Passwort zu kopieren) soll nicht
      // gleichzeitig wieder zuklappen.
      if (window.getSelection().toString()) return;
      selectObject(note, obj, objEl);
      objEl.classList.toggle('expanded');
      e.stopPropagation();
    });

    objEl.appendChild(card);
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
    const isFree = style !== 'boxed';
    // Freier Text beginnt klein (nur der Cursor ist zu sehen) und wächst beim
    // Tippen automatisch in der Höhe mit (siehe growFreeTextToFit) – wie in
    // OneNote. Ein Textfeld (mit sichtbarem Rahmen) startet weiterhin in der
    // gewohnten Standardgröße.
    const w = isFree ? 140 : 220;
    const h = isFree ? 36 : 120;
    const clampedX = clamp(x, 0, Math.max(0, SURFACE_W - w));
    const clampedY = clamp(y, 0, Math.max(0, SURFACE_H - h));
    const obj = {
      id: uid(), type: 'text', x: clampedX, y: clampedY, w, h, z: 0, text: '', html: '', parentId: null,
      style: isFree ? 'free' : 'boxed',
    };
    bringToFront(note, obj);
    note.objects.push(obj);
    const objEl = buildObjectEl(note, obj, true);
    el.canvasSurface.insertBefore(objEl, el.inkLayer);
    schedulePersist();
    renderNoteList();
    return obj;
  }

  async function addImageObjectFromFile(file, dropPoint) {
    const note = currentNote();
    if (!note || !file) return;
    try {
      const localUrl = URL.createObjectURL(file);
      const naturalSize = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = localUrl;
      });
      URL.revokeObjectURL(localUrl);

      const src = await uploadFile(file);

      const maxW = 360;
      const scale = Math.min(1, maxW / naturalSize.w);
      const w = Math.round(naturalSize.w * scale) || 200;
      const h = Math.round(naturalSize.h * scale) || 150;
      const { x, y } = dropPoint
        ? { x: clamp(dropPoint.x - w / 2, 0, Math.max(0, SURFACE_W - w)), y: clamp(dropPoint.y - h / 2, 0, Math.max(0, SURFACE_H - h)) }
        : nextPlacement(note, w, h);
      const obj = { id: uid(), type: 'image', x, y, w, h, z: 0, src };
      bringToFront(note, obj);
      note.objects.push(obj);
      const objEl = buildObjectEl(note, obj);
      el.canvasSurface.insertBefore(objEl, el.inkLayer);
      selectObject(note, obj, objEl);
      schedulePersist();
      renderNoteList();
    } catch (err) {
      console.error('Bild konnte nicht eingefügt werden:', err);
      alert('Dieses Bild konnte nicht eingefügt werden.');
    }
  }

  // ----- Audio-Aufnahme -----

  let activeRecording = null; // { mediaRecorder, stream }

  function pickAudioMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  function audioFileExtension(mimeType) {
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  function updateRecordButtonUI(recording) {
    if (!el.addAudioBtn) return;
    el.addAudioBtn.classList.toggle('recording-active', recording);
    el.addAudioBtn.title = recording ? 'Aufnahme beenden' : 'Sprachnotiz aufnehmen';
  }

  async function toggleAudioRecording() {
    if (activeRecording) {
      activeRecording.mediaRecorder.stop();
      activeRecording = null;
      updateRecordButtonUI(false);
      return;
    }
    const note = currentNote();
    if (!note) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Audioaufnahme wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      });
      mediaRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => track.stop());
        finishAudioRecording(note, chunks, mediaRecorder.mimeType || mimeType);
      });
      // Mit Zeitscheiben statt einem einzigen Blob am Ende aufnehmen: bei sehr
      // langen Aufnahmen (30-90 Minuten) sinkt so das Risiko, bei einem Absturz
      // alles auf einmal zu verlieren, und der Speicherbedarf im Tab bleibt
      // gleichmäßiger statt am Ende in einem Rutsch anzufallen.
      mediaRecorder.start(1000);
      activeRecording = { mediaRecorder, stream };
      updateRecordButtonUI(true);
    } catch (err) {
      console.error('Mikrofon konnte nicht gestartet werden:', err);
      alert('Zugriff auf das Mikrofon war nicht möglich. Bitte erlaube den Mikrofonzugriff für diese Seite.');
    }
  }

  async function finishAudioRecording(note, chunks, mimeType) {
    if (!chunks.length) return;
    const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
    if (blob.size === 0) return;
    try {
      const ext = audioFileExtension(mimeType || '');
      const src = await uploadFile(blob, `aufnahme-${Date.now()}.${ext}`);
      // Falls die Notiz inzwischen gelöscht wurde (während der Aufnahme lief),
      // die Aufnahme nicht stillschweigend verwerfen, sondern melden.
      if (!state.notes.includes(note)) {
        alert('Die Notiz, in der aufgenommen wurde, existiert nicht mehr. Die Aufnahme konnte nicht zugeordnet werden.');
        return;
      }
      const w = 300;
      const h = 72;
      const { x, y } = nextPlacement(note, w, h);
      const obj = {
        id: uid(), type: 'audio', x, y, w, h, z: 0, src,
        fileName: `Sprachnotiz ${new Date().toLocaleString('de-AT')}`,
      };
      bringToFront(note, obj);
      note.objects.push(obj);
      // Nur ins DOM einfügen, wenn diese Notiz gerade tatsächlich angezeigt wird –
      // sonst würde das Objekt in der Fläche einer anderen, gerade offenen Notiz
      // auftauchen, falls währenddessen die Notiz gewechselt wurde.
      if (currentNote() === note) {
        const objEl = buildObjectEl(note, obj);
        el.canvasSurface.insertBefore(objEl, el.inkLayer);
        selectObject(note, obj, objEl);
      }
      schedulePersist();
      renderNoteList();
    } catch (err) {
      console.error('Aufnahme konnte nicht gespeichert werden:', err);
      alert('Die Aufnahme konnte nicht gespeichert werden.');
    }
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

    const options = [{ id: null, name: 'Alle Notizen' }, ...state.folders.filter((f) => !f.trashedAt)];
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

  // ---------- Zugangsdaten-Popover (anlegen/bearbeiten) ----------

  let editingCredentialObj = null; // null = neue Karte wird angelegt
  let credentialFieldsDraft = []; // [{label, value}, ...] - Entwurf, solange das Popover offen ist

  function renderCredentialFieldRows() {
    el.credentialFieldsList.innerHTML = '';
    credentialFieldsDraft.forEach((field, idx) => {
      const row = document.createElement('div');
      row.className = 'credential-field-row';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'credential-field-label-input';
      labelInput.placeholder = 'Bezeichnung';
      labelInput.value = field.label;
      labelInput.addEventListener('input', () => { field.label = labelInput.value; });

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'credential-field-value-input';
      valueInput.placeholder = 'Wert';
      valueInput.value = field.value;
      valueInput.addEventListener('input', () => { field.value = valueInput.value; });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'credential-field-remove-btn';
      removeBtn.setAttribute('aria-label', 'Feld entfernen');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        credentialFieldsDraft.splice(idx, 1);
        renderCredentialFieldRows();
      });

      row.appendChild(labelInput);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);
      el.credentialFieldsList.appendChild(row);
    });
  }

  function openCredentialPopover(note, obj, anchorEl) {
    if (!note) return;
    editingCredentialObj = obj || null;
    el.credentialTitleInput.value = obj ? obj.title : '';
    credentialFieldsDraft = obj
      ? obj.fields.map((f) => ({ ...f }))
      : [{ label: 'Benutzername', value: '' }, { label: 'Passwort', value: '' }];
    renderCredentialFieldRows();

    el.credentialPopoverBackdrop.hidden = false;
    const btnRect = anchorEl.getBoundingClientRect();
    const popoverWidth = 360;
    const left = Math.min(Math.max(8, btnRect.left), window.innerWidth - popoverWidth - 8);
    const top = Math.min(btnRect.bottom + 6, window.innerHeight - 200);
    el.credentialPopover.style.left = `${Math.max(8, left)}px`;
    el.credentialPopover.style.top = `${Math.max(8, top)}px`;
    el.credentialTitleInput.focus();
  }

  function closeCredentialPopover() {
    el.credentialPopoverBackdrop.hidden = true;
    editingCredentialObj = null;
    credentialFieldsDraft = [];
  }

  function saveCredentialPopover() {
    const note = currentNote();
    if (!note) return closeCredentialPopover();
    const title = el.credentialTitleInput.value.trim();
    if (!title) {
      el.credentialTitleInput.focus();
      return;
    }
    const fields = credentialFieldsDraft
      .map((f) => ({ label: f.label.trim(), value: f.value }))
      .filter((f) => f.label || f.value);

    if (editingCredentialObj) {
      editingCredentialObj.title = title;
      editingCredentialObj.fields = fields;
    } else {
      const { x, y } = nextPlacement(note, 260, 60 + fields.length * 26);
      const obj = {
        id: uid(),
        type: 'credential',
        x,
        y,
        w: 260,
        h: 60 + Math.max(fields.length, 1) * 26,
        z: 0,
        title,
        fields,
      };
      bringToFront(note, obj);
      note.objects.push(obj);
    }
    note.updatedAt = Date.now();
    schedulePersist();
    renderCanvas(note);
    closeCredentialPopover();
  }

  // ---------- Erinnerungs-Popover (anlegen/bearbeiten) ----------

  let editingReminderObj = null; // null = neue Erinnerung wird angelegt
  // Nur gesetzt, während das Popover für eine INLINE-Erinnerung offen ist (Knopf
  // "Erinnerung hinzufügen" bei aktivem Cursor in einem Textobjekt geklickt,
  // siehe Wiring von addReminderBtn) - merkt sich, WO beim Speichern das
  // Glocken-Symbol in den Text eingefügt werden soll.
  let pendingInlineReminderRange = null;
  let pendingInlineReminderHost = null;
  let reminderPopoverJustOpened = false;

  // <input type="datetime-local"> erwartet/liefert "YYYY-MM-DDTHH:mm" in der
  // lokalen Zeit des Geräts (nicht UTC) - dieselbe Umrechnung nutzen wir zum
  // Anzeigen wie zum Einlesen, damit die angezeigte Uhrzeit immer der wirklich
  // gemeinten entspricht.
  function toDatetimeLocalValue(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromDatetimeLocalValue(value) {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  function formatReminderDate(ms) {
    if (!ms) return 'Kein Zeitpunkt festgelegt';
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // prefillText kommt vom "Erinnerung hinzufügen"-Knopf, wenn dabei gerade Text
  // in einem Textobjekt markiert war (siehe Wiring von addReminderBtn) - so
  // landet markierter Text direkt im Erinnerungstext, ohne ihn erneut abtippen
  // zu müssen.
  function openReminderPopover(note, obj, anchorEl, prefillText) {
    if (!note) return;
    editingReminderObj = obj || null;
    el.reminderTitleInput.value = obj ? obj.title || '' : '';
    el.reminderDateInput.value = obj ? toDatetimeLocalValue(obj.remindAt) : '';
    el.reminderTextInput.value = obj ? obj.text || '' : prefillText || '';
    el.reminderDeleteBtn.hidden = !obj;

    el.reminderPopoverBackdrop.hidden = false;
    // Wird das Popover als Reaktion auf einen Klick geöffnet, der durch die
    // Text-Verschiebe-Überlagerung hindurch simuliert wird (siehe
    // findReminderMarkerAtPoint()-Zweig in buildTextContent()), löst derselbe
    // Mausklick anschließend noch das native "click"-Ereignis des Browsers
    // aus - dessen Ziel ist dann, weil der Hintergrund jetzt den ganzen
    // Bildschirm bedeckt, plötzlich dieser Hintergrund selbst, was das gerade
    // erst geöffnete Fenster sofort wieder schließen würde. Für einen sehr
    // kurzen Moment wird ein Schließen-durch-Hintergrundklick deshalb bewusst
    // ignoriert (siehe Wiring von reminderPopoverBackdrop).
    reminderPopoverJustOpened = true;
    setTimeout(() => { reminderPopoverJustOpened = false; }, 0);
    const btnRect = anchorEl.getBoundingClientRect();
    const popoverWidth = 320;
    const left = Math.min(Math.max(8, btnRect.left), window.innerWidth - popoverWidth - 8);
    const top = Math.min(btnRect.bottom + 6, window.innerHeight - 340);
    el.reminderPopover.style.left = `${Math.max(8, left)}px`;
    el.reminderPopover.style.top = `${Math.max(8, top)}px`;
    el.reminderTitleInput.focus();
  }

  function closeReminderPopover() {
    el.reminderPopoverBackdrop.hidden = true;
    editingReminderObj = null;
    pendingInlineReminderRange = null;
    pendingInlineReminderHost = null;
  }

  function saveReminderPopover() {
    const note = currentNote();
    if (!note) return closeReminderPopover();
    const title = el.reminderTitleInput.value.trim();
    if (!title) {
      el.reminderTitleInput.focus();
      return;
    }
    const remindAt = fromDatetimeLocalValue(el.reminderDateInput.value);
    const text = el.reminderTextInput.value.trim();

    if (editingReminderObj) {
      editingReminderObj.title = title;
      editingReminderObj.remindAt = remindAt;
      editingReminderObj.text = text;
      // Nach einer Änderung von Titel/Text/Zeitpunkt ist eine bereits
      // verschickte Erinnerung nicht mehr aktuell - erneut fällig machen,
      // statt stillschweigend nie wieder zu verschicken.
      editingReminderObj.sentAt = null;
    } else if (pendingInlineReminderRange && pendingInlineReminderHost) {
      const obj = {
        id: uid(),
        type: 'reminder',
        inline: true,
        parentTextObjId: pendingInlineReminderHost.obj.id,
        title,
        text,
        remindAt,
        sentAt: null,
      };
      note.objects.push(obj);
      insertInlineReminderMarker(note, pendingInlineReminderHost, pendingInlineReminderRange, obj);
    } else {
      const { x, y } = nextPlacement(note, 240, 90);
      const obj = {
        id: uid(),
        type: 'reminder',
        x,
        y,
        w: 240,
        h: 90,
        z: 0,
        title,
        text,
        remindAt,
        sentAt: null,
      };
      bringToFront(note, obj);
      note.objects.push(obj);
    }
    note.updatedAt = Date.now();
    schedulePersist();
    renderCanvas(note);
    closeReminderPopover();
  }

  // Fügt an der beim Öffnen gemerkten Cursor-/Auswahlposition (siehe Wiring von
  // addReminderBtn) ein kleines Glocken-Symbol direkt in den Text ein - der
  // ursprüngliche Text bleibt dabei erhalten, das Symbol landet nur davor.
  function buildInlineReminderMarkerEl(obj) {
    const span = document.createElement('span');
    span.className = 'inline-reminder-marker' + (obj.sentAt ? ' sent' : '');
    span.contentEditable = 'false';
    span.dataset.reminderId = obj.id;
    span.title = obj.title || 'Erinnerung';
    span.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.bell}</svg>`;
    return span;
  }

  function insertInlineReminderMarker(note, hostTextEdit, range, obj) {
    const { body } = hostTextEdit;
    const marker = buildInlineReminderMarkerEl(obj);
    range.collapse(true);
    range.insertNode(marker);

    // Cursor direkt hinter das neue Symbol setzen, damit man ohne Klick
    // weitertippen kann.
    const after = document.createRange();
    after.setStartAfter(marker);
    after.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(after);

    syncInlineReminderMarkers(note, hostTextEdit.obj, body);
    saveTextObjContent(note, hostTextEdit.obj, body);
    // Ohne das bleibt die Box in ihrer alten (kleineren) Höhe stehen und das
    // neu eingefügte Symbol landet ggf. unsichtbar außerhalb des sichtbaren/
    // scrollbaren Bereichs - normalerweise übernimmt das der 'input'-Handler,
    // der hier aber nicht ausgelöst wird (die Einfügung passiert nicht über
    // eine echte Tastatureingabe).
    growFreeTextToFit(hostTextEdit.obj, hostTextEdit.objEl, body);
    updateOverflowIndicators(hostTextEdit.objEl, body);
  }

  // Gleicht die im Text vorhandenen Glocken-Symbole (nach jeder Bearbeitung UND
  // beim erstmaligen Rendern aufgerufen) mit den echten Erinnerungs-Objekten ab:
  // Farbe/Titel folgen dem tatsächlichen Stand (siehe sentAt), ein Klick öffnet
  // das Bearbeiten-Fenster. Wurde ein Symbol aus dem Text gelöscht (z. B. beim
  // Löschen der ganzen Zeile), verschwindet die zugehörige Erinnerung ebenfalls
  // aus note.objects, statt unsichtbar im Hintergrund bestehen zu bleiben und
  // trotzdem irgendwann per Mail verschickt zu werden.
  function syncInlineReminderMarkers(note, hostObj, body) {
    const presentIds = new Set();
    body.querySelectorAll('.inline-reminder-marker').forEach((marker) => {
      const id = marker.dataset.reminderId;
      const obj = note.objects.find((o) => o.id === id && o.type === 'reminder');
      if (!obj) {
        marker.remove();
        return;
      }
      presentIds.add(id);
      marker.classList.toggle('sent', !!obj.sentAt);
      marker.title = obj.title || 'Erinnerung';
      // Bewusst eine reine JS-Eigenschaft statt eines data-Attributs: ein
      // Attribut würde mit ins gespeicherte HTML wandern und nach einem
      // Neuladen fälschlich vorgaukeln, der (dann in Wirklichkeit fehlende)
      // Klick-Handler sei schon gesetzt.
      if (marker.reminderClickWired) return;
      marker.reminderClickWired = true;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        openReminderPopover(note, obj, marker);
      });
    });
    note.objects = note.objects.filter(
      (o) => !(o.type === 'reminder' && o.inline && o.parentTextObjId === hostObj.id && !presentIds.has(o.id))
    );
  }

  function buildReminderContent(note, obj, objEl) {
    const card = document.createElement('div');
    card.className = 'reminder-card';

    const header = document.createElement('div');
    header.className = 'reminder-card-header' + (obj.sentAt ? ' sent' : '');
    header.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${ICONS.bell}</svg>`;
    const title = document.createElement('span');
    title.className = 'reminder-card-title';
    title.textContent = obj.title || 'Erinnerung';
    header.appendChild(title);
    card.appendChild(header);

    const dateEl = document.createElement('div');
    const isDue = obj.remindAt && !obj.sentAt && obj.remindAt <= Date.now();
    dateEl.className = 'reminder-card-date' + (isDue ? ' reminder-due' : '');
    dateEl.textContent = obj.sentAt
      ? `Verschickt am ${formatReminderDate(obj.sentAt)}`
      : formatReminderDate(obj.remindAt);
    card.appendChild(dateEl);

    const textEl = document.createElement('div');
    textEl.className = 'reminder-card-text';
    textEl.textContent = obj.text || '';
    card.appendChild(textEl);

    card.addEventListener('click', (e) => {
      // Textmarkieren im aufgeklappten Erinnerungstext soll nicht gleichzeitig
      // wieder zuklappen.
      if (window.getSelection().toString()) return;
      selectObject(note, obj, objEl);
      objEl.classList.toggle('expanded');
      e.stopPropagation();
    });

    objEl.appendChild(card);
  }

  // ---------- Einstellungen (Papierkorb + E-Mail-Erinnerungen) ----------

  function fillSettingsForm(settings) {
    el.reminderEmailInput.value = settings.reminderEmail || '';
    el.smtpHostInput.value = settings.smtpHost || '';
    el.smtpPortInput.value = settings.smtpPort || '';
    el.smtpSecureSelect.value = settings.smtpSecure || 'starttls';
    el.smtpUserInput.value = settings.smtpUser || '';
    el.smtpFromNameInput.value = settings.smtpFromName || '';
    // Das Passwort wird aus Sicherheitsgründen nie vom Server zurückgeschickt -
    // nur der Platzhalter verrät, ob schon eines gespeichert ist. Leer lassen
    // beim Speichern behält das bestehende Passwort bei (siehe saveSettingsPopover()).
    el.smtpPasswordInput.value = '';
    el.smtpPasswordInput.placeholder = settings.smtpPasswordSet ? 'Gespeichertes Passwort beibehalten' : 'Passwort';
  }

  // Kleines Fenster beim Benutzernamen: nur Papierkorb-Haken + Einstieg ins
  // Erinnerungs-Mail-Fenster. Dockt (anders als das Erinnerungs-Fenster) direkt
  // am Auslöser-Knopf an, da es kurz genug ist, um dort keinen Platz zu rauben.
  function openSettingsPopover() {
    el.trashVisibleCheckbox.checked = trashVisible;
    el.settingsPopoverBackdrop.hidden = false;
    const rect = el.sidebarUserBtn.getBoundingClientRect();
    el.settingsPopover.style.left = `${rect.left}px`;
    el.settingsPopover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
  }

  function closeSettingsPopover() {
    el.settingsPopoverBackdrop.hidden = true;
  }

  // Erinnerungs-Mail: eigenes, mittig zentriertes Fenster (siehe .modal-backdrop
  // im CSS) statt eines am Knopf angedockten Popovers - für das längere
  // Formular passender, unabhängig davon, wo der Auslöser gerade sitzt.
  async function openReminderSettingsModal() {
    closeSettingsPopover();
    el.settingsSaveStatus.textContent = '';
    el.reminderSettingsModalBackdrop.hidden = false;
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Laden fehlgeschlagen');
      fillSettingsForm(await res.json());
    } catch (err) {
      el.settingsSaveStatus.textContent = 'Einstellungen konnten nicht geladen werden.';
    }
  }

  function closeReminderSettingsModal() {
    el.reminderSettingsModalBackdrop.hidden = true;
  }

  async function saveReminderSettings() {
    const payload = {
      reminderEmail: el.reminderEmailInput.value.trim(),
      smtpHost: el.smtpHostInput.value.trim(),
      smtpPort: el.smtpPortInput.value.trim() ? Number(el.smtpPortInput.value.trim()) : null,
      smtpSecure: el.smtpSecureSelect.value,
      smtpUser: el.smtpUserInput.value.trim(),
      smtpFromName: el.smtpFromNameInput.value.trim(),
    };
    // Nur mitschicken, wenn tatsächlich ein neues Passwort eingegeben wurde -
    // sonst würde ein leeres Feld das gespeicherte Passwort löschen.
    if (el.smtpPasswordInput.value) payload.smtpPassword = el.smtpPasswordInput.value;

    el.settingsSaveStatus.textContent = 'Speichere …';
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      fillSettingsForm(await res.json());
      el.settingsSaveStatus.textContent = 'Gespeichert.';
    } catch (err) {
      el.settingsSaveStatus.textContent = 'Fehler beim Speichern - bitte erneut versuchen.';
    }
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

  async function init() {
    setupBackButtons();
    initColumnResizers();
    goToView(isMobileLayout() ? 'folders' : 'notes');

    state = await loadState();
    // Bei jedem frischen Laden der Seite (Neustart, anderes Gerät, zweiter
    // Tab) sollen alle Notizen mit Unterseiten zunächst zugeklappt sein.
    // collapsedNoteIds lebt nur im Arbeitsspeicher dieser Seite (nicht in den
    // gespeicherten Daten) - innerhalb einer laufenden Sitzung bleibt der
    // Auf-/Zuklapp-Zustand daher beim Wechseln zwischen Ordnern/Notizen und
    // beim Zurückgehen automatisch erhalten, ohne dass das extra gespeichert
    // werden muss.
    collapsedNoteIds = collapsibleNoteIds(state.notes);

    renderFolders();
    renderNoteList();
    renderEditor();

    el.newFolderBtn.addEventListener('click', createFolder);
    el.allNotesBtn.addEventListener('click', () => selectFolder(null));
    // Noch ohne echte Anmeldung (siehe README) - der Knopf lädt die Seite
    // vorerst nur neu, damit er sich nicht funktionslos anfühlt.
    el.logoutBtn.addEventListener('click', () => window.location.reload());
    el.sidebarUserBtn.addEventListener('click', openSettingsPopover);
    el.settingsPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.settingsPopoverBackdrop) closeSettingsPopover();
    });
    el.openReminderSettingsBtn.addEventListener('click', openReminderSettingsModal);
    el.reminderSettingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.reminderSettingsModalBackdrop) closeReminderSettingsModal();
    });
    el.settingsCancelBtn.addEventListener('click', closeReminderSettingsModal);
    el.settingsSaveBtn.addEventListener('click', saveReminderSettings);
    el.trashVisibleCheckbox.addEventListener('change', () => {
      trashVisible = el.trashVisibleCheckbox.checked;
      renderFolders();
    });
    // Als eigene Funktion statt direkt "createNote" übergeben, sonst würde der
    // Klick-Event selbst als "parentNoteId" durchgereicht (createNote() ohne
    // Argument = neue Hauptseite).
    el.newNoteBtn.addEventListener('click', () => createNote());
    el.collapseAllBtn.addEventListener('click', () => {
      const ids = collapsibleNoteIds(getVisibleNotes());
      const allCollapsed = ids.size > 0 && [...ids].every((id) => collapsedNoteIds.has(id));
      for (const id of ids) {
        if (allCollapsed) collapsedNoteIds.delete(id);
        else collapsedNoteIds.add(id);
      }
      renderNoteList();
    });
    el.moveNoteBtn.addEventListener('click', openMovePopover);
    el.popoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.popoverBackdrop) closeMovePopover();
    });

    el.addTextBtn.addEventListener('click', openTextStylePopover);
    wireRibbonBtn(el.undoBtn, () => applyUndoRedo('undo'));
    wireRibbonBtn(el.redoBtn, () => applyUndoRedo('redo'));
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
    // wireRibbonBtn (statt eines einfachen click-Listeners) verhindert, dass
    // schon der Klick auf den Knopf selbst (per Fokuswechsel auf mousedown)
    // das gerade bearbeitete Textfeld verlässt - sonst wäre activeTextEdit
    // hier unten bereits wieder null, bevor die Cursor-Position ausgelesen
    // werden kann.
    wireRibbonBtn(el.addPdfBtn, () => {
      // Muss VOR dem Öffnen des nativen Dateiauswahl-Fensters erfasst werden
      // (siehe pendingInlinePdfRange) - das Fenster nimmt sofort den Fokus
      // weg, damit wäre die Cursor-Position sonst schon verloren.
      pendingInlinePdfRange = null;
      pendingInlinePdfHost = null;
      if (activeTextEdit) {
        const sel = window.getSelection();
        const liveRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        if (liveRange && activeTextEdit.body.contains(liveRange.commonAncestorContainer)) {
          pendingInlinePdfRange = liveRange.cloneRange();
          pendingInlinePdfHost = activeTextEdit;
        }
      }
      el.pdfFileInput.click();
    });
    el.pdfFileInput.addEventListener('change', () => {
      const file = el.pdfFileInput.files[0];
      if (file) addPdfObjectFromFile(file);
      el.pdfFileInput.value = '';
    });
    el.addAudioBtn.addEventListener('click', toggleAudioRecording);
    el.addFileBtn.addEventListener('click', () => el.fileFileInput.click());
    el.fileFileInput.addEventListener('change', () => {
      const file = el.fileFileInput.files[0];
      if (file) addFileObjectFromFile(file);
      el.fileFileInput.value = '';
    });
    el.addCredentialBtn.addEventListener('click', () => openCredentialPopover(currentNote(), null, el.addCredentialBtn));
    el.credentialPopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.credentialPopoverBackdrop) closeCredentialPopover();
    });
    el.credentialAddFieldBtn.addEventListener('click', () => {
      credentialFieldsDraft.push({ label: '', value: '' });
      renderCredentialFieldRows();
    });
    el.credentialCancelBtn.addEventListener('click', closeCredentialPopover);
    el.credentialSaveBtn.addEventListener('click', saveCredentialPopover);
    // War gerade Text in einem Textobjekt markiert (siehe lastSelectionRange),
    // Steht der Cursor gerade in einem Textobjekt (mit oder ohne markierten
    // Text), wird die Erinnerung als kleines Glocken-Symbol direkt an dieser
    // Stelle in den Text eingefügt (siehe insertInlineReminderMarker()) -
    // vorbefüllt entweder mit dem markierten Text oder, ohne Markierung, mit
    // dem Text der ganzen Zeile, in der der Cursor steht. Ohne aktives
    // Textobjekt entsteht wie bisher eine frei auf der Fläche platzierte
    // Erinnerungs-Karte. Wie die Formatierungs-Buttons (siehe wireRibbonBtn)
    // muss dafür verhindert werden, dass der Klick selbst das Textfeld
    // verlässt und die Cursor-Position damit vor dem Auslesen verliert
    // (siehe body-blur -> exitTextEdit()).
    wireRibbonBtn(el.addReminderBtn, () => {
      const note = currentNote();
      if (!note) return;
      pendingInlineReminderRange = null;
      pendingInlineReminderHost = null;
      if (activeTextEdit) {
        const sel = window.getSelection();
        const liveRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        if (liveRange && activeTextEdit.body.contains(liveRange.commonAncestorContainer)) {
          // Für die Einfügestelle bewusst die ECHTE Cursor-/Auswahlposition
          // verwenden (nicht die von currentFormatRange() bei fehlender
          // Auswahl rekonstruierte "ganze Zeile"): jene Range beginnt
          // außerhalb des Zeilen-Elements (davor als Geschwister-Knoten) -
          // ein Einfügen dort setzt das Symbol als eigenen Block VOR die
          // Zeile statt wirklich mitten im Textfluss. Für den Formulierungs-
          // Vorschlag im Popover wird trotzdem die ganze Zeile herangezogen,
          // falls nichts markiert ist.
          pendingInlineReminderRange = liveRange.cloneRange();
          pendingInlineReminderHost = activeTextEdit;
          const prefillRange = liveRange.collapsed ? currentFormatRange() || liveRange : liveRange;
          openReminderPopover(note, null, el.addReminderBtn, prefillRange.toString().trim());
          return;
        }
      }
      openReminderPopover(note, null, el.addReminderBtn, '');
    });
    el.reminderPopoverBackdrop.addEventListener('click', (e) => {
      if (reminderPopoverJustOpened) return;
      if (e.target === el.reminderPopoverBackdrop) closeReminderPopover();
    });
    el.reminderCancelBtn.addEventListener('click', closeReminderPopover);
    el.reminderSaveBtn.addEventListener('click', saveReminderPopover);
    el.reminderDeleteBtn.addEventListener('click', () => {
      const note = currentNote();
      if (!note || !editingReminderObj) return closeReminderPopover();
      if (!confirm(`Erinnerung "${editingReminderObj.title || 'Ohne Titel'}" löschen?`)) return;
      const id = editingReminderObj.id;
      const markerEl = el.canvasSurface.querySelector(`.inline-reminder-marker[data-reminder-id="${id}"]`);
      if (markerEl) {
        const hostObjEl = markerEl.closest('.canvas-object');
        const hostBody = hostObjEl && hostObjEl.querySelector('.canvas-text-body');
        const hostTextObj = hostObjEl && note.objects.find((o) => o.id === hostObjEl.dataset.id);
        markerEl.remove();
        if (hostBody && hostTextObj) saveTextObjContent(note, hostTextObj, hostBody);
      }
      note.objects = note.objects.filter((o) => o.id !== id);
      note.updatedAt = Date.now();
      schedulePersist();
      renderCanvas(note);
      closeReminderPopover();
    });
    // Klick/Tipp auf die leere Fläche legt sofort freien Text an (wie in OneNote) –
    // ABER erst, wenn feststeht, dass es wirklich ein Tipp war (kurz, ohne Bewegung,
    // nur ein Finger). Sonst wäre auf Touch-Geräten jedes Wischen zum Scrollen oder
    // ein Zwei-Finger-Zoomen unmöglich, weil sofort ein neues Textobjekt entstünde –
    // deshalb hier NICHT sofort reagieren und NICHT preventDefault() auf pointerdown
    // aufrufen (das würde native Scroll-/Zoom-Gesten von vornherein blockieren).
    const TAP_MOVE_THRESHOLD = 10;
    const TAP_MAX_DURATION = 700;
    el.canvasSurface.addEventListener('pointerdown', (e) => {
      if (e.target !== el.canvasSurface) return;
      const note = currentNote();
      if (!note || drawModeActive) {
        deselectAll();
        return;
      }
      const rect = el.canvasSurface.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const startTime = Date.now();
      let moved = false;
      let otherPointerJoined = false;

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        if (Math.abs(ev.clientX - startX) > TAP_MOVE_THRESHOLD || Math.abs(ev.clientY - startY) > TAP_MOVE_THRESHOLD) {
          moved = true;
        }
      };
      const onOtherPointerDown = (ev) => {
        if (ev.pointerId !== pointerId) otherPointerJoined = true; // zweiter Finger = Zoomgeste, kein Tipp
      };
      const cleanup = () => {
        el.canvasSurface.removeEventListener('pointermove', onMove);
        el.canvasSurface.removeEventListener('pointerup', onUp);
        el.canvasSurface.removeEventListener('pointercancel', onCancel);
        document.removeEventListener('pointerdown', onOtherPointerDown, true);
      };
      const onCancel = () => cleanup();
      const onUp = (ev) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        const elapsed = Date.now() - startTime;
        if (moved || otherPointerJoined || elapsed > TAP_MAX_DURATION) return;
        ev.preventDefault();
        const hitId = hitTestStroke(note, point);
        if (hitId) {
          selectSingleStroke(note, hitId);
          return;
        }
        deselectAll();
        addTextObjectAt(note, point.x - 10, point.y - 10, 'free');
      };

      el.canvasSurface.addEventListener('pointermove', onMove);
      el.canvasSurface.addEventListener('pointerup', onUp);
      el.canvasSurface.addEventListener('pointercancel', onCancel);
      document.addEventListener('pointerdown', onOtherPointerDown, true);
    });

    // Dateien lassen sich direkt aus dem Dateisystem auf die Fläche ziehen -
    // PDFs und Bilder bekommen ihre spezielle Darstellung, alles andere
    // (Word, Excel, ...) landet als einfacher Datei-Anhang.
    el.canvasSurface.addEventListener('dragover', (e) => {
      if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.canvasSurface.classList.add('drag-over');
    });
    el.canvasSurface.addEventListener('dragleave', (e) => {
      if (e.target === el.canvasSurface) el.canvasSurface.classList.remove('drag-over');
    });
    el.canvasSurface.addEventListener('drop', (e) => {
      el.canvasSurface.classList.remove('drag-over');
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (files.length === 0) return;
      e.preventDefault();
      const rect = el.canvasSurface.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const pdfFile = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdfFile) {
        addPdfObjectFromFile(pdfFile, point);
        return;
      }
      const imageFile = files.find((f) => f.type.startsWith('image/'));
      if (imageFile) {
        addImageObjectFromFile(imageFile, point);
        return;
      }
      addFileObjectFromFile(files[0], point);
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

    el.pdfModePopoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.pdfModePopoverBackdrop) resolvePdfInsertMode(null);
    });
    el.pdfModePopover.addEventListener('click', (e) => {
      const item = e.target.closest('.popover-item-rich');
      if (item) resolvePdfInsertMode(item.dataset.mode);
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

    // navigator.sendBeacon() statt fetch(): Der Browser garantiert, dass dieser
    // Request auch dann noch losgeschickt wird, wenn die Seite direkt danach
    // geschlossen oder neu geladen wird (bei fetch() ist das nicht zuverlässig:
    // ein noch laufender Request wird beim Entladen der Seite abgebrochen und
    // würde in persist() fälschlich als Speicherfehler gemeldet, obwohl beim
    // ganz normalen Neuladen der Seite gar nichts verloren geht).
    function persistViaBeacon() {
      state.notes.forEach(pruneEmptyTextObjects);
      try {
        const ok = navigator.sendBeacon('/api/state', new Blob([JSON.stringify(state)], { type: 'application/json' }));
        if (!ok) persist();
      } catch (e) {
        persist();
      }
    }
    window.addEventListener('beforeunload', persistViaBeacon);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistViaBeacon();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
