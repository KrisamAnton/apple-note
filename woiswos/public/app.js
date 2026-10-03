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

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const pathText = (path) => path.map((p) => p.name).join(' › ') || 'Oberste Ebene';

function renderCrumbs(path, last) {
  const parts = [`<a href="#/">Start</a>`];
  path.forEach((p) => parts.push(`<a href="#/o/${p.id}">${esc(p.name)}</a>`));
  if (last) parts.push(esc(last));
  crumbs.innerHTML = parts.join('<span>›</span>');
}

// ---- Ansicht: Inhalt eines Ortes ----------------------------------------
async function showPlace(id) {
  const data = await api('GET', '/api/items' + (id ? '?parent=' + id : ''));
  const item = data.item;
  renderCrumbs(data.path.slice(0, -1), item ? item.name : '');
  let html = '';
  if (item) {
    html += `<h2>${esc(item.name)}</h2>
      <div class="where">${esc(item.code)} · Menge ${item.quantity}</div>
      ${item.notes ? `<p>${esc(item.notes)}</p>` : ''}
      <div class="bar"><button data-act="edit">Bearbeiten / Verschieben</button></div>`;
  } else {
    html += '<h2>Alle Lagerplätze</h2>';
  }
  html += data.children.length
    ? data.children.map((c) => `<div class="card"><a class="row" href="#/o/${c.id}">
        <span class="name">${esc(c.name)}${c.notes ? `<span class="sub">${esc(c.notes.slice(0, 80))}</span>` : ''}</span>
        ${c.quantity !== 1 ? `<span class="badge">${c.quantity}×</span>` : ''}
        ${c.child_count ? `<span class="badge">${c.child_count} drin</span>` : ''}
      </a></div>`).join('')
    : `<div class="empty">${item ? 'Hier liegt noch nichts drin.' : 'Noch nichts angelegt. Beginne mit einem Raum, zum Beispiel „Schrankraum“.'}</div>`;
  html += `<button class="primary fab" data-act="add">+ Neu${item ? ' hier drin' : ''}</button>`;
  main.innerHTML = html;
  main.querySelector('[data-act=add]').onclick = () => itemDialog({ parent_id: id || null }, data.path);
  const edit = main.querySelector('[data-act=edit]');
  if (edit) edit.onclick = async () => itemDialog(await api('GET', '/api/items/' + id));
}

// ---- Ansicht: Suche ------------------------------------------------------
async function showSearch(text) {
  renderCrumbs([], 'Suche');
  const hits = await api('GET', '/api/search?q=' + encodeURIComponent(text));
  main.innerHTML = `<h2>Suche: „${esc(text)}“</h2>` + (hits.length
    ? hits.map((h) => `<div class="card"><a class="row" href="#/o/${h.id}">
        <span class="name">${esc(h.name)}<span class="sub">📍 ${esc(pathText(h.path))}</span></span>
        ${h.quantity !== 1 ? `<span class="badge">${h.quantity}×</span>` : ''}</a></div>`).join('')
    : '<div class="empty">Nichts gefunden.</div>');
}

// ---- Dialog: Neu / Bearbeiten -------------------------------------------
function itemDialog(item, path) {
  const isNew = !item.id;
  const where = isNew ? path : item.path;
  dlg.innerHTML = `<form method="dialog" id="f">
    <h3>${isNew ? 'Neuer Eintrag' : 'Eintrag bearbeiten'}</h3>
    <div class="where" id="where">📍 ${esc(pathText(where))}</div>
    <label>Name</label><input type="text" name="name" required maxlength="200" value="${esc(item.name || '')}">
    <label>Menge</label><input type="number" name="quantity" min="0" step="1" value="${item.quantity ?? 1}">
    <label>Notiz</label><textarea name="notes" rows="3">${esc(item.notes || '')}</textarea>
    <div class="err" id="err"></div>
    <div class="bar">
      <button class="primary" value="save">Speichern</button>
      ${isNew ? '' : '<button type="button" id="move">Verschieben…</button><button type="button" class="danger" id="del">Löschen</button>'}
      <button type="button" id="cancel">Abbrechen</button>
    </div></form>`;
  let parent = item.parent_id;
  const err = (m) => { $('#err').textContent = m; };
  $('#cancel').onclick = () => dlg.close();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), quantity: fd.get('quantity'), notes: fd.get('notes'), parent_id: parent };
    try {
      const saved = isNew ? await api('POST', '/api/items', body) : await api('PATCH', '/api/items/' + item.id, body);
      dlg.close();
      const target = isNew ? location.hash : '#/o/' + saved.id;
      if (location.hash === target || (isNew && !location.hash)) route();
      else location.hash = target;
    } catch (ex) { err(ex.message); }
  };
  if (!isNew) {
    $('#move').onclick = async () => {
      const target = await pickPlace(item);
      if (target === undefined) return;
      parent = target.id;
      $('#where').textContent = '📍 → ' + pathText(target.path);
    };
    $('#del').onclick = async () => {
      const n = item.descendant_count;
      const q = n ? `„${item.name}“ und alles darin (${n} Einträge) wirklich löschen?` : `„${item.name}“ wirklich löschen?`;
      if (!confirm(q)) return;
      try {
        await api('DELETE', '/api/items/' + item.id);
        dlg.close();
        location.hash = item.parent_id ? '#/o/' + item.parent_id : '#/';
      } catch (ex) { err(ex.message); }
    };
  }
  dlg.showModal();
}

// ---- Dialog: Zielort auswählen (Verschieben) -----------------------------
// Gibt {id, path} zurück (id null = oberste Ebene) oder undefined bei Abbruch.
function pickPlace(moving) {
  return new Promise((resolve) => {
    // Das Formular bleibt im Dokument (nur versteckt), damit seine Handler erhalten bleiben.
    const form = $('#f');
    const box = document.createElement('div');
    form.hidden = true;
    dlg.appendChild(box);
    const restore = (val) => { box.remove(); form.hidden = false; resolve(val); };
    async function browse(id) {
      const data = await api('GET', '/api/items' + (id ? '?parent=' + id : ''));
      const blocked = data.path.some((p) => p.id === moving.id);
      box.innerHTML = `<h3>Verschieben nach…</h3>
        <div class="where">📍 ${esc(pathText(data.path))}</div>
        <div id="list">${blocked ? '<div class="empty">Hier nicht möglich (liegt im Inhalt selbst).</div>' :
          data.children.filter((c) => c.id !== moving.id).map((c) =>
            `<div class="card"><a class="row" href="#" data-id="${c.id}"><span class="name">${esc(c.name)}</span>
             ${c.child_count ? `<span class="badge">${c.child_count}</span>` : ''}</a></div>`).join('') || '<div class="empty">Leer</div>'}</div>
        <div class="bar">
          ${blocked ? '' : '<button class="primary" id="here">Hierher verschieben</button>'}
          ${id ? '<button id="up">Ebene höher</button>' : ''}
          <button id="no">Abbrechen</button></div>`;
      box.querySelectorAll('#list a').forEach((a) => {
        a.onclick = (e) => { e.preventDefault(); browse(Number(a.dataset.id)); };
      });
      const here = box.querySelector('#here');
      if (here) here.onclick = () => restore({ id: id || null, path: data.path });
      const up = box.querySelector('#up');
      if (up) up.onclick = () => browse(data.path.length > 1 ? data.path[data.path.length - 2].id : null);
      box.querySelector('#no').onclick = () => restore(undefined);
    }
    browse(moving.parent_id || null).catch(() => restore(undefined));
  });
}

// ---- Routing -------------------------------------------------------------
async function route() {
  const m = location.hash.match(/^#\/o\/(\d+)$/);
  try {
    if (m) await showPlace(Number(m[1]));
    else await showPlace(null);
  } catch (ex) {
    renderCrumbs([], '');
    main.innerHTML = `<div class="toast">${esc(ex.message)}</div><a href="#/">Zum Start</a>`;
  }
}
window.addEventListener('hashchange', route);

let timer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(timer);
  const text = e.target.value.trim();
  timer = setTimeout(() => {
    if (text) showSearch(text).catch((ex) => { main.innerHTML = `<div class="toast">${esc(ex.message)}</div>`; });
    else route();
  }, 250);
});
route();
