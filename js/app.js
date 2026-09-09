(() => {
  'use strict';

  const STORAGE_KEY = 'appleNotesPwa.v1';
  const SURFACE_W = 1600;
  const SURFACE_H = 2200;
  const MIN_SIZES = { text: [140, 60], image: [60, 60], pdf: [60, 60] };

  const ICONS = {
    allNotes: '<svg viewBox="0 0 20 20"><path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.41a1 1 0 0 0-.29-.71l-2.41-2.41A1 1 0 0 0 13.59 3H4zm2 4h8v1.5H6V7zm0 3h8v1.5H6V10zm0 3h5v1.5H6V13z"/></svg>',
    folder: '<svg viewBox="0 0 20 20"><path d="M2 5.5C2 4.67 2.67 4 3.5 4h4.13c.36 0 .7.14.96.4l1.2 1.2c.26.26.6.4.96.4H16.5c.83 0 1.5.67 1.5 1.5v7.6c0 .83-.67 1.5-1.5 1.5h-13C2.67 16.6 2 15.93 2 15.1V5.5z"/></svg>',
    trash: '<svg viewBox="0 0 20 20"><path d="M6 2.5h8l.5 1.5H16v1.5H4V4h1.5L6 2.5zM5 7h10l-.7 10.1c-.05.7-.63 1.4-1.5 1.4H7.2c-.87 0-1.45-.7-1.5-1.4L5 7z"/></svg>',
  };

  /**
   * @typedef {{id:string, type:'text', x:number, y:number, w:number, h:number, z:number, text:string, parentId:?string, relX?:number, relY?:number, relW?:number, relH?:number}} TextObject
   * @typedef {{id:string, type:'image', x:number, y:number, w:number, h:number, z:number, src:string}} ImageObject
   * @typedef {{color:string, eraser:boolean, points:Array<{x:number,y:number,width:number}>}} Stroke
   * @typedef {{id:string, title:string, objects:Array, ink:{strokes:Stroke[]}, background:'dots'|'lines'|'blank', folderId:?string, createdAt:number, updatedAt:number}} Note
   * @typedef {{id:string, name:string}} Folder
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

    // Alte, auf ein Objekt begrenzte Zeichnungen (Vorversion) in die globale Tinten-Ebene übernehmen
    const oldDrawings = note.objects.filter((o) => o.type === 'drawing');
    for (const d of oldDrawings) {
      for (const stroke of d.strokes || []) {
        note.ink.strokes.push({
          color: stroke.color,
          eraser: stroke.eraser,
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
    return note;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.folders)) {
          parsed.notes.forEach(migrateNote);
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
    return {
      folders: [],
      notes: [
        {
          id: welcomeId,
          title: 'Willkommen bei KrisNote',
          objects: [
            {
              id: uid(), type: 'text', x: 24, y: 24, w: 560, h: 360, z: 1, parentId: null,
              text:
                'Willkommen bei deiner neuen Notizen-App!\n\n' +
                '- Oben: Text, Bild oder PDF hinzufügen. Objekte per Ziehen verschieben, ' +
                'an der Ecke unten rechts in der Größe ändern.\n' +
                '- Text per Doppelklick bearbeiten.\n' +
                '- Stift-Symbol = Zeichnen-Modus: dann kannst du überall auf der Fläche zeichnen, ' +
                'auch direkt auf einem Bild.\n' +
                '- Ziehe einen Text auf ein Bild oder PDF, um ihn dort als Beschriftung anzuheften ' +
                '– er bewegt und skaliert sich dann mit.\n' +
                '- Über das Raster-Symbol kannst du den Hintergrund umstellen: Punkte, Linien oder leer.\n\n' +
                'Alle Notizen werden aktuell nur lokal auf diesem Gerät gespeichert.',
            },
          ],
          ink: { strokes: [] },
          background: 'dots',
          folderId: null,
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
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    moveNoteBtn: document.getElementById('moveNoteBtn'),
    popoverBackdrop: document.getElementById('popoverBackdrop'),
    movePopover: document.getElementById('movePopover'),
    movePopoverList: document.getElementById('movePopoverList'),
    addTextBtn: document.getElementById('addTextBtn'),
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
    return note.objects
      .filter((o) => o.type === 'text')
      .map((o) => o.text || '')
      .join(' ');
  }

  function notePreviewText(note) {
    const firstText = note.objects.find((o) => o.type === 'text' && o.text && o.text.trim());
    if (firstText) return firstText.text.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (note.ink && note.ink.strokes && note.ink.strokes.length > 0) return 'Skizze';
    if (note.objects.some((o) => o.type === 'image')) return 'Bild';
    if (note.objects.some((o) => o.type === 'pdf')) return 'PDF';
    return '';
  }

  function getVisibleNotes() {
    let list = notesInFolder(selectedFolderId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || noteSearchableText(n).toLowerCase().includes(q)
      );
    }
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
        <span class="folder-icon">${ICONS.folder}</span>
        <input class="folder-name" value="${escapeHtml(folder.name)}" readonly />
        <span class="folder-count">${count}</span>
        <button class="folder-delete" type="button" aria-label="Ordner löschen" title="Ordner löschen">
          <svg viewBox="0 0 20 20" class="icon" style="width:14px;height:14px">${ICONS.trash}</svg>
        </button>
      `;
      const nameInput = item.querySelector('.folder-name');
      item.addEventListener('click', (e) => {
        if (e.target === nameInput && nameInput.readOnly === false) return;
        if (e.target.closest('.folder-delete')) return;
        selectFolder(folder.id);
      });
      nameInput.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        nameInput.readOnly = false;
        nameInput.focus();
        nameInput.select();
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
    renderFolders();
    renderNoteList();
    goToView('notes');
  }

  function createFolder() {
    const folder = { id: uid(), name: 'Neuer Ordner' };
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

    for (const note of notes) {
      const item = document.createElement('div');
      item.className = 'note-item' + (note.id === selectedNoteId ? ' active' : '');
      const preview = notePreviewText(note);
      item.innerHTML = `
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-meta">
          <span>${formatDate(note.updatedAt)}</span>
          <span class="note-preview">${escapeHtml(preview)}</span>
        </div>
      `;
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

  function createNote() {
    const now = Date.now();
    const note = {
      id: uid(),
      title: '',
      objects: [],
      ink: { strokes: [] },
      background: 'dots',
      folderId: selectedFolderId,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(note);
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
    if (!confirm('Diese Notiz löschen?')) return;
    state.notes = state.notes.filter((n) => n.id !== id);
    schedulePersist();
    if (selectedNoteId === id) {
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
  let inkStrokeState = null;
  let drawColor = '#1c1c1e';
  let drawIsEraser = false;
  let drawModeActive = false;

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

  function makeToolbarBtn(icon, danger, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'object-toolbar-btn' + (danger ? ' danger' : '');
    btn.innerHTML = `<svg viewBox="0 0 20 20" class="icon" aria-hidden="true">${icon}</svg>`;
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function buildObjectEl(note, obj) {
    const objEl = document.createElement('div');
    objEl.className = 'canvas-object';
    objEl.dataset.id = obj.id;
    objEl.dataset.type = obj.type;
    applyObjRect(objEl, obj);

    const mainToolbar = document.createElement('div');
    mainToolbar.className = 'object-toolbar object-toolbar-main';
    mainToolbar.appendChild(makeToolbarBtn(ICONS.trash, true, () => deleteObject(note, obj.id)));
    objEl.appendChild(mainToolbar);

    if (obj.type === 'text') buildTextContent(note, obj, objEl);
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
    }
    if (note && obj && obj.type === 'text' && dragState.moved) {
      updateAttachment(note, obj);
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
    dragState = null;
    if (note) schedulePersist();
  }

  // ----- Text-Objekt -----

  function buildTextContent(note, obj, objEl) {
    const textarea = document.createElement('textarea');
    textarea.className = 'canvas-text-body';
    textarea.placeholder = 'Text …';
    textarea.value = obj.text || '';
    textarea.readOnly = true;
    objEl.appendChild(textarea);

    const overlay = document.createElement('div');
    overlay.className = 'text-drag-overlay';
    objEl.appendChild(overlay);

    overlay.addEventListener('pointerdown', (e) => startObjectDrag(e, note, obj, objEl));
    overlay.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enterTextEdit(note, obj, objEl, textarea, overlay);
    });

    textarea.addEventListener('blur', () => exitTextEdit(obj, textarea, overlay));
    textarea.addEventListener('input', () => {
      obj.text = textarea.value;
      note.updatedAt = Date.now();
      schedulePersist();
      renderNoteList();
    });
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') textarea.blur();
    });
  }

  function enterTextEdit(note, obj, objEl, textarea, overlay) {
    selectObject(note, obj, objEl);
    textarea.readOnly = false;
    textarea.classList.add('editing');
    overlay.style.display = 'none';
    textarea.focus();
  }

  function exitTextEdit(obj, textarea, overlay) {
    textarea.readOnly = true;
    textarea.classList.remove('editing');
    overlay.style.display = '';
    obj.text = textarea.value;
    schedulePersist();
    renderNoteList();
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

  function drawStrokeAbs(ctx, stroke) {
    const pts = stroke.points;
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

  function redrawInk(note) {
    const ctx = el.inkLayer.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, SURFACE_W, SURFACE_H);
    for (const stroke of (note.ink && note.ink.strokes) || []) {
      drawStrokeAbs(ctx, stroke);
    }
    ctx.restore();
  }

  function startInkStroke(e) {
    const note = currentNote();
    if (!note || !drawModeActive) return;
    e.preventDefault();
    const rect = el.canvasSurface.getBoundingClientRect();
    const widthPx = widthForPointer(e.pointerType, e.pressure, drawIsEraser);
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top, width: widthPx };
    const stroke = { color: drawColor, eraser: drawIsEraser, points: [point] };
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
  }

  function deactivateDrawMode() {
    if (!drawModeActive) return;
    drawModeActive = false;
    el.canvasSurface.classList.remove('draw-mode');
    el.drawModeBtn.classList.remove('active');
    el.drawToolbar.hidden = true;
  }

  function toggleDrawMode() {
    if (drawModeActive) deactivateDrawMode();
    else activateDrawMode();
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
    redrawInk(note);
    schedulePersist();
    renderNoteList();
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

  function addTextObject() {
    const note = currentNote();
    if (!note) return;
    const { x, y } = nextPlacement(note, 220, 120);
    const obj = { id: uid(), type: 'text', x, y, w: 220, h: 120, z: 0, text: '', parentId: null };
    bringToFront(note, obj);
    note.objects.push(obj);
    const objEl = buildObjectEl(note, obj);
    el.canvasSurface.insertBefore(objEl, el.inkLayer);
    schedulePersist();
    renderNoteList();
    const textarea = objEl.querySelector('.canvas-text-body');
    const overlay = objEl.querySelector('.text-drag-overlay');
    enterTextEdit(note, obj, objEl, textarea, overlay);
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
    note.objects = note.objects.filter((o) => o.id !== id);
    if (selectedObjectId === id) selectedObjectId = null;
    const objEl = findObjEl(id);
    if (objEl) objEl.remove();
    note.updatedAt = Date.now();
    schedulePersist();
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
        note.folderId = opt.id;
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
    schedulePersist();
    closeBackgroundPopover();
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

  // ---------- Event wiring ----------

  function init() {
    setupBackButtons();
    goToView(isMobileLayout() ? 'folders' : 'notes');

    renderFolders();
    renderNoteList();
    renderEditor();

    el.newFolderBtn.addEventListener('click', createFolder);
    el.newNoteBtn.addEventListener('click', createNote);
    el.deleteNoteBtn.addEventListener('click', () => selectedNoteId && deleteNote(selectedNoteId));
    el.moveNoteBtn.addEventListener('click', openMovePopover);
    el.popoverBackdrop.addEventListener('click', (e) => {
      if (e.target === el.popoverBackdrop) closeMovePopover();
    });

    el.addTextBtn.addEventListener('click', addTextObject);
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
      if (e.target === el.canvasSurface) deselectAll();
    });

    el.drawModeBtn.addEventListener('click', toggleDrawMode);
    el.inkLayer.addEventListener('pointerdown', startInkStroke);
    el.drawEraserBtn.addEventListener('click', toggleDrawEraser);
    el.drawUndoBtn.addEventListener('click', undoInk);
    el.drawClearBtn.addEventListener('click', clearInk);
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
