(() => {
  'use strict';

  const STORAGE_KEY = 'appleNotesPwa.v1';

  const ICONS = {
    allNotes: '<svg viewBox="0 0 20 20"><path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.41a1 1 0 0 0-.29-.71l-2.41-2.41A1 1 0 0 0 13.59 3H4zm2 4h8v1.5H6V7zm0 3h8v1.5H6V10zm0 3h5v1.5H6V13z"/></svg>',
      folder: '<svg viewBox="0 0 20 20"><path d="M2 5.5C2 4.67 2.67 4 3.5 4h4.13c.36 0 .7.14.96.4l1.2 1.2c.26.26.6.4.96.4H16.5c.83 0 1.5.67 1.5 1.5v7.6c0 .83-.67 1.5-1.5 1.5h-13C2.67 16.6 2 15.93 2 15.1V5.5z"/></svg>',
  };

  /** @typedef {{id:string, title:string, content:string, folderId:string, createdAt:number, updatedAt:number}} Note */
  /** @typedef {{id:string, name:string}} Folder */

  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notes) && Array.isArray(parsed.folders)) {
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
          title: 'Willkommen bei Notizen',
          content:
            'Willkommen bei deiner neuen Notizen-App!\n\n' +
            '- Tippe links unten auf das Stift-Symbol, um eine neue Notiz zu erstellen.\n' +
            '- Lege über "Neuer Ordner" eigene Kategorien an.\n' +
            '- Nutze die Suche, um alle Notizen zu durchsuchen.\n\n' +
            'Alle Notizen werden aktuell nur lokal auf diesem Gerät gespeichert.',
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
    contentInput: document.getElementById('contentInput'),
    editorDate: document.getElementById('editorDate'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    moveNoteBtn: document.getElementById('moveNoteBtn'),
    popoverBackdrop: document.getElementById('popoverBackdrop'),
    movePopover: document.getElementById('movePopover'),
    movePopoverList: document.getElementById('movePopoverList'),
  };

  // ---------- Helpers ----------

  function notesInFolder(folderId) {
    return state.notes.filter((n) => (folderId === null ? true : n.folderId === folderId));
  }

  function getVisibleNotes() {
    let list = notesInFolder(selectedFolderId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function findNote(id) {
    return state.notes.find((n) => n.id === id) || null;
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

  function firstLine(text) {
    const idx = text.indexOf('\n');
    return idx === -1 ? text : text.slice(0, idx);
  }

  function restLines(text) {
    const idx = text.indexOf('\n');
    return idx === -1 ? '' : text.slice(idx + 1).trim();
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
          <svg viewBox="0 0 20 20" class="icon" style="width:14px;height:14px"><path d="M6 2.5h8l.5 1.5H16v1.5H4V4h1.5L6 2.5zM5 7h10l-.7 10.1c-.05.7-.63 1.4-1.5 1.4H7.2c-.87 0-1.45-.7-1.5-1.4L5 7z"/></svg>
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      const preview = restLines(note.content) || note.content;
      item.innerHTML = `
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-meta">
          <span>${formatDate(note.updatedAt)}</span>
          <span class="note-preview">${escapeHtml(preview.slice(0, 80))}</span>
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
    el.contentInput.value = note.content;
    el.editorDate.textContent = formatDate(note.updatedAt);
    autoGrow(el.titleInput);
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
      content: '',
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

  function updateSelectedNote() {
    const note = findNote(selectedNoteId);
    if (!note) return;
    const titleRaw = el.titleInput.value;
    const title = titleRaw.replace(/\n/g, ' ').trim();
    const content = el.contentInput.value;
    note.title = title;
    note.content = content;
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

    el.titleInput.addEventListener('input', () => {
      autoGrow(el.titleInput);
      updateSelectedNote();
    });
    el.contentInput.addEventListener('input', updateSelectedNote);

    el.titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.contentInput.focus();
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
