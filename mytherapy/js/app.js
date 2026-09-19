'use strict';

// ===================================================================
// Konstanten
// ===================================================================

const MED_FORMS = {
  tablet: { icon: '💊', label: 'Tablette' },
  capsule: { icon: '💊', label: 'Kapsel' },
  drops: { icon: '💧', label: 'Tropfen' },
  syrup: { icon: '🧴', label: 'Saft' },
  injection: { icon: '💉', label: 'Spritze' },
  inhaler: { icon: '🌬️', label: 'Inhalator' },
  cream: { icon: '🧴', label: 'Creme / Salbe' },
  other: { icon: '⚕️', label: 'Sonstiges' },
};

const COLORS = ['#1f6f56', '#2a6fb0', '#8e44ad', '#c0392b', '#d68910', '#16a085', '#c2185b', '#546e7a'];

const WEEKDAYS = [
  { label: 'Mo', value: 1 },
  { label: 'Di', value: 2 },
  { label: 'Mi', value: 3 },
  { label: 'Do', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'So', value: 0 },
];

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ===================================================================
// State
// ===================================================================

const state = {
  medications: [],
  intakes: [],
  measurements: [],
  measurementPlans: [],
  measurementIntakes: [],
  currentDate: new Date(),
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  selectedCalDay: null,
  activeTab: 'today',
  editingMedId: null,
  editingMeasurementPlanId: null,
  settings: loadSettings(),
  notifiedKeys: new Set(),
};

function loadSettings() {
  try {
    return Object.assign(
      { notifications: false, snoozeMinutes: 15, theme: 'system' },
      JSON.parse(localStorage.getItem('mt_settings') || '{}')
    );
  } catch (err) {
    return { notifications: false, snoozeMinutes: 15, theme: 'system' };
  }
}

function saveSettings() {
  localStorage.setItem('mt_settings', JSON.stringify(state.settings));
}

// ===================================================================
// Datum-Hilfsfunktionen
// ===================================================================

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetweenISO(isoA, isoB) {
  const a = fromISO(isoA);
  const b = fromISO(isoB);
  return Math.round((b - a) / 86400000);
}

function todayISO() {
  return toISO(new Date());
}

function formatDayLabel(date) {
  const iso = toISO(date);
  if (iso === todayISO()) return 'Heute';
  if (iso === toISO(addDays(new Date(), -1))) return 'Gestern';
  if (iso === toISO(addDays(new Date(), 1))) return 'Morgen';
  return date.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ===================================================================
// Fachlogik: Fälligkeit von Medikamenten
// ===================================================================

function isDueOnDate(med, iso) {
  if (!med.active) return false;
  if (med.frequency.type === 'asNeeded') return false;
  if (med.startDate && iso < med.startDate) return false;
  if (med.endDate && iso > med.endDate) return false;
  const freq = med.frequency;
  if (freq.type === 'daily') return true;
  if (freq.type === 'weekdays') return (freq.days || []).includes(fromISO(iso).getDay());
  if (freq.type === 'interval') {
    const anchor = freq.anchorDate || med.startDate;
    const diff = daysBetweenISO(anchor, iso);
    return diff >= 0 && diff % Math.max(1, freq.everyNDays || 1) === 0;
  }
  return false;
}

function doseEntriesForDate(iso) {
  const entries = [];
  state.medications.forEach((med) => {
    if (!isDueOnDate(med, iso)) return;
    (med.times || []).forEach((t) => {
      const id = `${med.id}::${iso}::${t.time}`;
      const record = state.intakes.find((i) => i.id === id);
      entries.push({
        id,
        med,
        date: iso,
        scheduledTime: t.time,
        amount: t.amount,
        status: record ? record.status : 'pending',
        postponedTo: record ? record.postponedTo : null,
      });
    });
  });
  entries.sort((a, b) => (a.postponedTo || a.scheduledTime).localeCompare(b.postponedTo || b.scheduledTime));
  return entries;
}

function computeDayStats(iso) {
  const entries = doseEntriesForDate(iso);
  const due = entries.length;
  const taken = entries.filter((e) => e.status === 'taken').length;
  return { due, taken, ratio: due === 0 ? null : taken / due };
}

function measurementTimesForPlanOnDate(plan, iso) {
  if (plan.frequency.type === 'weekdays') {
    const weekday = fromISO(iso).getDay();
    return (plan.frequency.timesByDay && plan.frequency.timesByDay[weekday]) || [];
  }
  return plan.times || [];
}

function measurementEntriesForDate(iso) {
  const entries = [];
  state.measurementPlans.forEach((plan) => {
    if (!isDueOnDate(plan, iso)) return;
    measurementTimesForPlanOnDate(plan, iso).forEach((t) => {
      const id = `${plan.id}::${iso}::${t.time}`;
      const record = state.measurementIntakes.find((i) => i.id === id);
      entries.push({
        id,
        plan,
        date: iso,
        scheduledTime: t.time,
        status: record ? record.status : 'pending',
      });
    });
  });
  entries.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return entries;
}

function asNeededMeasurementPlans() {
  return state.measurementPlans.filter((p) => p.active && p.frequency.type === 'asNeeded');
}

// ===================================================================
// Datenzugriff / Sync
// ===================================================================

function upsertLocalList(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
}

async function saveMedication(med) {
  med.updatedAt = Date.now();
  upsertLocalList(state.medications, med);
  renderActiveView();
  await Sync.saveMedication(med);
}

async function deleteMedicationById(id) {
  state.medications = state.medications.filter((m) => m.id !== id);
  renderActiveView();
  await Sync.deleteMedication(id);
}

async function saveIntake(intake) {
  upsertLocalList(state.intakes, intake);
  renderActiveView();
  await Sync.saveIntake(intake);
}

async function saveMeasurement(m) {
  upsertLocalList(state.measurements, m);
  renderActiveView();
  await Sync.saveMeasurement(m);
}

async function saveMeasurementPlan(plan) {
  plan.updatedAt = Date.now();
  upsertLocalList(state.measurementPlans, plan);
  renderActiveView();
  await Sync.saveMeasurementPlan(plan);
}

async function deleteMeasurementPlanById(id) {
  state.measurementPlans = state.measurementPlans.filter((p) => p.id !== id);
  renderActiveView();
  await Sync.deleteMeasurementPlan(id);
}

async function saveMeasurementIntake(intake) {
  upsertLocalList(state.measurementIntakes, intake);
  renderActiveView();
  await Sync.saveMeasurementIntake(intake);
}

function initSync() {
  Sync.subscribeMedications((list) => {
    state.medications = list;
    renderActiveView();
  });
  Sync.subscribeIntakes((list) => {
    state.intakes = list;
    renderActiveView();
  });
  Sync.subscribeMeasurements((list) => {
    state.measurements = list;
    renderActiveView();
  });
  Sync.subscribeMeasurementPlans((list) => {
    state.measurementPlans = list;
    renderActiveView();
  });
  Sync.subscribeMeasurementIntakes((list) => {
    state.measurementIntakes = list;
    renderActiveView();
  });
  updateSyncDot();
}

function updateSyncDot() {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.classList.toggle('on', Sync.cloudReady());
}

// ===================================================================
// Toast
// ===================================================================

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

// ===================================================================
// Tabs / Navigation
// ===================================================================

function switchTab(target) {
  state.activeTab = target;
  document.querySelectorAll('.view').forEach((v) => {
    v.hidden = v.dataset.view !== target;
  });
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.target === target);
  });
  renderActiveView();
}

function renderActiveView() {
  updateSyncDot();
  if (state.activeTab === 'today') renderToday();
  else if (state.activeTab === 'meds') renderMeds();
  else if (state.activeTab === 'history') renderHistory();
  else if (state.activeTab === 'more') renderMore();
}

// ===================================================================
// HEUTE
// ===================================================================

function timeSection(time) {
  const h = Number(time.split(':')[0]);
  if (h < 12) return 'Morgens';
  if (h < 17) return 'Mittags';
  if (h < 21) return 'Abends';
  return 'Nachts';
}

function renderToday() {
  const iso = toISO(state.currentDate);
  document.getElementById('day-label').textContent = formatDayLabel(state.currentDate);

  const entries = doseEntriesForDate(iso);
  const measurementEntries = measurementEntriesForDate(iso);
  const listEl = document.getElementById('dose-list');
  const emptyEl = document.getElementById('today-empty');
  const progressCard = document.getElementById('progress-card');

  const hasAnyPlan = state.medications.length > 0 || state.measurementPlans.length > 0;
  if (!hasAnyPlan) {
    listEl.innerHTML = '';
    progressCard.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  progressCard.hidden = state.medications.length === 0;
  const due = entries.length;
  const taken = entries.filter((e) => e.status === 'taken').length;
  if (state.medications.length > 0) {
    const ring = document.getElementById('progress-ring-fg');
    const circumference = 163.4;
    const ratio = due === 0 ? 0 : taken / due;
    ring.style.strokeDashoffset = String(circumference - circumference * ratio);
    document.getElementById('progress-num').textContent = `${taken}/${due}`;
    document.getElementById('progress-title').textContent =
      due === 0 ? 'Für diesen Tag ist nichts geplant' : taken === due ? 'Alles erledigt 🎉' : `${due - taken} noch offen`;
    document.getElementById('progress-sub').textContent =
      due === 0 ? 'Genieß den Tag' : `${taken} von ${due} Einnahmen erledigt`;
  }

  const asNeeded = asNeededMeds();
  const asNeededMeasurements = asNeededMeasurementPlans();
  emptyEl.hidden = entries.length > 0 || asNeeded.length > 0 || measurementEntries.length > 0 || asNeededMeasurements.length > 0;

  const sections = ['Morgens', 'Mittags', 'Abends', 'Nachts'];
  let html = '';
  sections.forEach((sec) => {
    const secEntries = entries.filter((e) => timeSection(e.postponedTo || e.scheduledTime) === sec);
    if (secEntries.length === 0) return;
    html += `<div class="dose-section"><div class="dose-section-title">${sec}</div>`;
    secEntries.forEach((e) => { html += doseCardHtml(e); });
    html += `</div>`;
  });

  if (asNeeded.length > 0) {
    html += `<div class="dose-section"><div class="dose-section-title">Bei Bedarf</div>`;
    asNeeded.forEach((med) => { html += asNeededCardHtml(med, iso); });
    html += `</div>`;
  }

  if (measurementEntries.length > 0) {
    const doneCount = measurementEntries.filter((e) => e.status === 'taken').length;
    html += `<div class="dose-section"><div class="dose-section-title">Messwerte (${doneCount}/${measurementEntries.length})</div>`;
    measurementEntries.forEach((e) => { html += measurementCardHtml(e); });
    html += `</div>`;
  }

  if (asNeededMeasurements.length > 0) {
    html += `<div class="dose-section"><div class="dose-section-title">Messwerte bei Bedarf</div>`;
    asNeededMeasurements.forEach((plan) => { html += asNeededMeasurementCardHtml(plan, iso); });
    html += `</div>`;
  }

  listEl.innerHTML = html;

  listEl.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { action, entryId } = btn.dataset;
      if (action === 'as-needed-log') {
        logAsNeeded(btn.dataset.medId, iso);
      } else if (action === 'measurement-taken') {
        openMeasurementModal({ planEntry: measurementEntries.find((e) => e.id === entryId) });
      } else if (action === 'measurement-skip') {
        handleMeasurementSkip(entryId);
      } else if (action === 'measurement-as-needed-log') {
        const plan = state.measurementPlans.find((p) => p.id === btn.dataset.planId);
        openMeasurementModal({ planEntry: { plan, date: iso, scheduledTime: null } });
      } else {
        handleDoseAction(entryId, action);
      }
    });
  });
}

function asNeededMeds() {
  return state.medications.filter((m) => m.active && m.frequency.type === 'asNeeded');
}

function doseCardHtml(e) {
  const form = MED_FORMS[e.med.form] || MED_FORMS.other;
  const statusLabel = { taken: 'Eingenommen', skipped: 'Ausgelassen', postponed: 'Verschoben', pending: '' }[e.status];
  return `
    <div class="dose-card ${e.status === 'taken' ? 'taken' : ''}">
      <div class="dose-icon" style="background:${e.med.color}">${form.icon}</div>
      <div class="dose-info">
        <div class="dose-name">${escapeHtml(e.med.name)}</div>
        <div class="dose-sub">${escapeHtml(doseLabel(e.med, e.amount))}</div>
        <div class="dose-status-line">
          <span class="dose-time">${e.postponedTo ? `${e.postponedTo} (verschoben von ${e.scheduledTime})` : e.scheduledTime}</span>
          ${statusLabel ? `<span class="status-pill ${e.status}">${statusLabel}</span>` : ''}
        </div>
      </div>
      <div class="dose-actions">
        <button class="take ${e.status === 'taken' ? 'active' : ''}" data-action="taken" data-entry-id="${e.id}" title="Eingenommen" aria-label="Eingenommen">✓</button>
        <button class="skip ${e.status === 'skipped' ? 'active' : ''}" data-action="skipped" data-entry-id="${e.id}" title="Ausgelassen" aria-label="Ausgelassen">✕</button>
        <button class="snooze" data-action="postpone" data-entry-id="${e.id}" title="Verschieben" aria-label="Verschieben">⏰</button>
      </div>
    </div>`;
}

function asNeededCardHtml(med, iso) {
  const form = MED_FORMS[med.form] || MED_FORMS.other;
  const count = state.intakes.filter((i) => i.medId === med.id && i.date === iso && i.status === 'taken').length;
  return `
    <div class="dose-card">
      <div class="dose-icon" style="background:${med.color}">${form.icon}</div>
      <div class="dose-info">
        <div class="dose-name">${escapeHtml(med.name)}</div>
        <div class="dose-sub">${escapeHtml(doseLabel(med))} · heute ${count}×</div>
      </div>
      <div class="dose-actions">
        <button class="take" data-action="as-needed-log" data-med-id="${med.id}" title="Einnahme erfassen" aria-label="Einnahme erfassen">+</button>
      </div>
    </div>`;
}

function measurementCardHtml(e) {
  const type = MEASUREMENT_TYPES[e.plan.type];
  const statusLabel = { taken: 'Erledigt', skipped: 'Ausgelassen', pending: '' }[e.status];
  return `
    <div class="dose-card ${e.status === 'taken' ? 'taken' : ''}">
      <div class="dose-icon" style="background:${MEASUREMENT_COLOR}">${type.icon}</div>
      <div class="dose-info">
        <div class="dose-name">${escapeHtml(type.label)}</div>
        <div class="dose-status-line">
          <span class="dose-time">${e.scheduledTime}</span>
          ${statusLabel ? `<span class="status-pill ${e.status}">${statusLabel}</span>` : ''}
        </div>
      </div>
      <div class="dose-actions">
        <button class="take ${e.status === 'taken' ? 'active' : ''}" data-action="measurement-taken" data-entry-id="${e.id}" title="Erfassen" aria-label="Erfassen">✓</button>
        <button class="skip ${e.status === 'skipped' ? 'active' : ''}" data-action="measurement-skip" data-entry-id="${e.id}" title="Auslassen" aria-label="Auslassen">✕</button>
      </div>
    </div>`;
}

function asNeededMeasurementCardHtml(plan, iso) {
  const type = MEASUREMENT_TYPES[plan.type];
  const count = state.measurementIntakes.filter((i) => i.planId === plan.id && i.date === iso && i.status === 'taken').length;
  return `
    <div class="dose-card">
      <div class="dose-icon" style="background:${MEASUREMENT_COLOR}">${type.icon}</div>
      <div class="dose-info">
        <div class="dose-name">${escapeHtml(type.label)}</div>
        <div class="dose-sub">heute ${count}×</div>
      </div>
      <div class="dose-actions">
        <button class="take" data-action="measurement-as-needed-log" data-plan-id="${plan.id}" title="Erfassen" aria-label="Erfassen">+</button>
      </div>
    </div>`;
}

function doseLabel(med, amount) {
  const a = amount || (med.times && med.times[0] && med.times[0].amount) || med.dosageAmount || 1;
  return `${a} ${med.dosageUnit || ''}`.trim();
}

function strengthLabel(med) {
  const parts = [];
  if (med.strengthAmount) parts.push(`${med.strengthAmount} ${med.strengthUnit || ''}`.trim());
  (med.extraIngredients || []).forEach((ing) => {
    if (ing.name || ing.amount) parts.push(`${ing.name ? ing.name + ' ' : ''}${ing.amount || ''} ${ing.unit || ''}`.trim());
  });
  return parts.join(' + ');
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function handleDoseAction(entryId, action) {
  const existing = state.intakes.find((i) => i.id === entryId);
  const [medId] = entryId.split('::');
  const med = state.medications.find((m) => m.id === medId);
  const wasTaken = existing && existing.status === 'taken';
  const nextStatus = existing && existing.status === action ? 'pending' : action;

  if (med && med.stock && med.stock.enabled) {
    const per = med.stock.perIntake || 1;
    if (nextStatus === 'taken' && !wasTaken) {
      med.stock.count = Math.max(0, (med.stock.count || 0) - per);
      await saveMedication(med);
    } else if (nextStatus !== 'taken' && wasTaken) {
      med.stock.count = (med.stock.count || 0) + per;
      await saveMedication(med);
    }
  }

  const parts = entryId.split('::');
  const date = parts[1];
  const time = parts[2];
  await saveIntake({
    id: entryId,
    medId,
    date,
    time,
    status: nextStatus,
    postponedTo: existing ? existing.postponedTo : null,
    actedAt: Date.now(),
  });
}

async function handlePostpone(entryId) {
  const [medId, date, time] = entryId.split('::');
  const existing = state.intakes.find((i) => i.id === entryId);
  const minutes = state.settings.snoozeMinutes || 15;
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + minutes, 0, 0);
  const newTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  await saveIntake({
    id: entryId,
    medId,
    date,
    time,
    status: 'postponed',
    postponedTo: newTime,
    actedAt: Date.now(),
  });
  toast(`Verschoben auf ${newTime} Uhr`);
}

async function logAsNeeded(medId, iso) {
  const med = state.medications.find((m) => m.id === medId);
  if (!med) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (med.stock && med.stock.enabled) {
    med.stock.count = Math.max(0, (med.stock.count || 0) - (med.stock.perIntake || 1));
    await saveMedication(med);
  }
  await saveIntake({ id: uid('intake'), medId, date: iso, time, status: 'taken', actedAt: Date.now() });
  toast('Einnahme erfasst');
}

async function handleMeasurementSkip(entryId) {
  const existing = state.measurementIntakes.find((i) => i.id === entryId);
  const [planId, date, time] = entryId.split('::');
  const nextStatus = existing && existing.status === 'skipped' ? 'pending' : 'skipped';
  await saveMeasurementIntake({ id: entryId, planId, date, time, status: nextStatus, actedAt: Date.now() });
}

// Klick auf "Verschieben" ist ein eigener Listener, da handleDoseAction()
// direkt auf taken/skipped ausgelegt ist.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="postpone"]');
  if (btn) handlePostpone(btn.dataset.entryId);
});

// ===================================================================
// MEDIKAMENTE
// ===================================================================

function renderMeds() {
  const listEl = document.getElementById('med-list');
  const emptyEl = document.getElementById('meds-empty');
  if (state.medications.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = state.medications.map((med) => {
    const form = MED_FORMS[med.form] || MED_FORMS.other;
    const freqLabel = frequencyLabel(med);
    const timesLabel = med.frequency.type === 'asNeeded' ? 'Bei Bedarf' : (med.times || []).map((t) => t.time).join(' · ');
    const lowStock = med.stock && med.stock.enabled && med.stock.count <= med.stock.threshold;
    const strength = strengthLabel(med);
    return `
      <div class="med-card" data-med-id="${med.id}">
        <div class="dose-icon" style="background:${med.color}">${form.icon}</div>
        <div class="med-meta">
          <div class="med-name">${escapeHtml(med.name)}</div>
          ${strength ? `<div class="med-sub">${escapeHtml(strength)}</div>` : ''}
          <div class="med-sub">${escapeHtml(doseLabel(med))} · ${freqLabel}</div>
          <div class="med-sub">${timesLabel}</div>
          ${lowStock ? `<span class="med-stock-warn">Nur noch ${med.stock.count} – nachfüllen</span>` : ''}
        </div>
        <span class="chevron">›</span>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.med-card').forEach((card) => {
    card.addEventListener('click', () => openMedModal(card.dataset.medId));
  });
}

function frequencyLabel(med) {
  const f = med.frequency;
  if (f.type === 'daily') return 'Täglich';
  if (f.type === 'asNeeded') return 'Bei Bedarf';
  if (f.type === 'weekdays') return (f.days || []).map((d) => WEEKDAYS.find((w) => w.value === d).label).join(', ') || '—';
  if (f.type === 'interval') return `Alle ${f.everyNDays || 1} Tage`;
  return '';
}

// ---- Formular ----

let formState = null;

function defaultMed() {
  return {
    id: uid('med'),
    name: '',
    form: 'tablet',
    color: COLORS[0],
    dosageAmount: 1,
    dosageUnit: 'Tablette(n)',
    strengthAmount: '',
    strengthUnit: 'mg',
    extraIngredients: [],
    times: [{ time: '08:00', amount: 1 }],
    frequency: { type: 'daily', days: [1, 2, 3, 4, 5, 6, 0], everyNDays: 1, anchorDate: todayISO() },
    startDate: todayISO(),
    endDate: null,
    hasEndDate: false,
    stock: { enabled: false, count: 30, perIntake: 1, threshold: 5 },
    notes: '',
    active: true,
    createdAt: Date.now(),
  };
}

function openMedModal(medId) {
  state.editingMedId = medId || null;
  const existing = medId ? state.medications.find((m) => m.id === medId) : null;
  formState = existing ? JSON.parse(JSON.stringify(existing)) : defaultMed();
  if (formState.hasEndDate === undefined) formState.hasEndDate = !!formState.endDate;
  // Ältere, bereits gespeicherte Medikamente kennen diese Felder noch nicht -
  // sinnvolle Standardwerte ergänzen, statt sie leer/undefined zu lassen.
  if (formState.strengthAmount === undefined) formState.strengthAmount = '';
  if (formState.strengthUnit === undefined) formState.strengthUnit = 'mg';
  if (!formState.extraIngredients) formState.extraIngredients = [];
  document.getElementById('med-modal-title').textContent = existing ? 'Medikament bearbeiten' : 'Neues Medikament';
  renderMedForm();
  document.getElementById('med-modal').hidden = false;
}

function closeMedModal() {
  document.getElementById('med-modal').hidden = true;
  document.getElementById('med-form').innerHTML = '';
  formState = null;
  state.editingMedId = null;
}

function syncFormFieldsIntoState() {
  if (!document.getElementById('f-name')) return;
  formState.name = document.getElementById('f-name').value;
  formState.dosageAmount = Number(document.getElementById('f-amount').value) || 0;
  formState.dosageUnit = document.getElementById('f-unit').value;
  formState.strengthAmount = document.getElementById('f-strength-amount').value;
  formState.strengthUnit = document.getElementById('f-strength-unit').value;
  document.querySelectorAll('#med-form [data-ing-name-idx]').forEach((inp) => {
    if (formState.extraIngredients[Number(inp.dataset.ingNameIdx)]) formState.extraIngredients[Number(inp.dataset.ingNameIdx)].name = inp.value;
  });
  document.querySelectorAll('#med-form [data-ing-amount-idx]').forEach((inp) => {
    if (formState.extraIngredients[Number(inp.dataset.ingAmountIdx)]) formState.extraIngredients[Number(inp.dataset.ingAmountIdx)].amount = inp.value;
  });
  document.querySelectorAll('#med-form [data-ing-unit-idx]').forEach((inp) => {
    if (formState.extraIngredients[Number(inp.dataset.ingUnitIdx)]) formState.extraIngredients[Number(inp.dataset.ingUnitIdx)].unit = inp.value;
  });
  formState.startDate = document.getElementById('f-start').value || formState.startDate;
  const endInput = document.getElementById('f-end');
  formState.endDate = formState.hasEndDate && endInput ? (endInput.value || null) : null;
  formState.notes = document.getElementById('f-notes').value;
  const intervalInput = document.getElementById('f-interval');
  if (intervalInput) formState.frequency.everyNDays = Number(intervalInput.value) || 1;
  document.querySelectorAll('#med-form [data-time-idx]').forEach((inp) => {
    if (formState.times[Number(inp.dataset.timeIdx)]) formState.times[Number(inp.dataset.timeIdx)].time = inp.value;
  });
  document.querySelectorAll('#med-form [data-amount-idx]').forEach((inp) => {
    if (formState.times[Number(inp.dataset.amountIdx)]) formState.times[Number(inp.dataset.amountIdx)].amount = Number(inp.value) || 1;
  });
  const stockCount = document.getElementById('f-stock-count');
  if (stockCount) formState.stock.count = Number(stockCount.value) || 0;
  const stockThreshold = document.getElementById('f-stock-threshold');
  if (stockThreshold) formState.stock.threshold = Number(stockThreshold.value) || 0;
}

function renderMedForm() {
  syncFormFieldsIntoState();
  const f = formState;
  const formIcons = Object.entries(MED_FORMS).map(([key, v]) =>
    `<button type="button" data-form="${key}" class="${f.form === key ? 'selected' : ''}" style="background:${f.color}"><span class="pick-icon">${v.icon}</span><span>${v.label}</span></button>`
  ).join('');
  const colorButtons = COLORS.map((c) =>
    `<button type="button" data-color="${c}" class="${f.color === c ? 'selected' : ''}" style="background:${c}">${f.color === c ? '✓' : ''}</button>`
  ).join('');
  const weekdayButtons = WEEKDAYS.map((w) =>
    `<button type="button" data-day="${w.value}" class="${(f.frequency.days || []).includes(w.value) ? 'selected' : ''}">${w.label}</button>`
  ).join('');
  const timesHtml = (f.times || []).map((t, idx) => `
    <div class="time-entry">
      <input type="time" data-time-idx="${idx}" value="${t.time}" />
      <input type="number" min="0" step="0.5" data-amount-idx="${idx}" value="${t.amount || 1}" style="max-width:70px" />
      <button type="button" data-remove-time="${idx}" aria-label="Uhrzeit entfernen">✕</button>
    </div>`).join('');
  const ingredientsHtml = (f.extraIngredients || []).map((ing, idx) => `
    <div class="weekday-time-group">
      <div class="form-field">
        <label>Weiterer Wirkstoff</label>
        <input type="text" data-ing-name-idx="${idx}" value="${escapeHtml(ing.name)}" placeholder="z. B. Hydrochlorothiazid" />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Stärke</label>
          <input type="number" step="0.01" min="0" data-ing-amount-idx="${idx}" value="${ing.amount}" placeholder="z. B. 12.5" />
        </div>
        <div class="form-field">
          <label>Einheit</label>
          <input type="text" data-ing-unit-idx="${idx}" value="${escapeHtml(ing.unit)}" placeholder="mg" />
        </div>
      </div>
      <button type="button" class="delete-med-btn" data-remove-ingredient="${idx}">Diesen Wirkstoff entfernen</button>
    </div>`).join('');

  document.getElementById('med-form').innerHTML = `
    <div class="form-field">
      <label>Name</label>
      <input type="text" id="f-name" value="${escapeHtml(f.name)}" placeholder="z. B. Ibuprofen 400mg" />
    </div>

    <div class="form-field">
      <label>Darreichungsform</label>
      <div class="icon-pick">${formIcons}</div>
    </div>

    <div class="form-field">
      <label>Farbe</label>
      <div class="color-pick">${colorButtons}</div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>Menge pro Einnahme</label>
        <input type="number" id="f-amount" min="0" step="0.5" value="${f.dosageAmount}" />
      </div>
      <div class="form-field">
        <label>Einheit</label>
        <input type="text" id="f-unit" value="${escapeHtml(f.dosageUnit)}" placeholder="Tablette(n), ml, Tropfen …" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>Stärke (Wirkstoffmenge)</label>
        <input type="number" id="f-strength-amount" min="0" step="0.01" value="${f.strengthAmount}" placeholder="z. B. 400" />
      </div>
      <div class="form-field">
        <label>Einheit</label>
        <input type="text" id="f-strength-unit" value="${escapeHtml(f.strengthUnit)}" placeholder="mg" />
      </div>
    </div>

    <div class="form-field">
      ${ingredientsHtml}
      <button type="button" class="add-time-btn" id="f-add-ingredient">+ Zusätzlichen Wirkstoff angeben (optional)</button>
    </div>

    <div class="form-field">
      <label>Häufigkeit</label>
      <select id="f-frequency">
        <option value="daily" ${f.frequency.type === 'daily' ? 'selected' : ''}>Täglich</option>
        <option value="weekdays" ${f.frequency.type === 'weekdays' ? 'selected' : ''}>Bestimmte Wochentage</option>
        <option value="interval" ${f.frequency.type === 'interval' ? 'selected' : ''}>Alle X Tage</option>
        <option value="asNeeded" ${f.frequency.type === 'asNeeded' ? 'selected' : ''}>Bei Bedarf</option>
      </select>
    </div>

    ${f.frequency.type === 'weekdays' ? `<div class="form-field"><label>Wochentage</label><div class="weekday-pick">${weekdayButtons}</div></div>` : ''}
    ${f.frequency.type === 'interval' ? `<div class="form-field"><label>Intervall (Tage)</label><input type="number" id="f-interval" min="1" value="${f.frequency.everyNDays || 1}" /></div>` : ''}

    ${f.frequency.type !== 'asNeeded' ? `
    <div class="form-field">
      <label>Uhrzeiten</label>
      ${timesHtml}
      <button type="button" class="add-time-btn" id="f-add-time">+ Uhrzeit hinzufügen</button>
    </div>` : ''}

    <div class="form-row">
      <div class="form-field">
        <label>Beginn</label>
        <input type="date" id="f-start" value="${f.startDate}" />
      </div>
      <div class="form-field">
        <label>Ende</label>
        <input type="date" id="f-end" value="${f.endDate || ''}" ${f.hasEndDate ? '' : 'disabled'} />
      </div>
    </div>
    <label class="switch-row">
      <span>Enddatum festlegen</span>
      <input type="checkbox" id="f-has-end" ${f.hasEndDate ? 'checked' : ''} />
    </label>

    <label class="switch-row">
      <span>Bestand verfolgen</span>
      <input type="checkbox" id="f-stock-enabled" ${f.stock.enabled ? 'checked' : ''} />
    </label>
    ${f.stock.enabled ? `
    <div class="form-row">
      <div class="form-field"><label>Aktueller Bestand</label><input type="number" id="f-stock-count" min="0" value="${f.stock.count}" /></div>
      <div class="form-field"><label>Warnschwelle</label><input type="number" id="f-stock-threshold" min="0" value="${f.stock.threshold}" /></div>
    </div>` : ''}

    <div class="form-field">
      <label>Notizen</label>
      <textarea id="f-notes" placeholder="z. B. zu den Mahlzeiten einnehmen">${escapeHtml(f.notes)}</textarea>
    </div>

    ${state.editingMedId ? `<button type="button" class="delete-med-btn" id="f-delete">Medikament löschen</button>` : ''}
  `;

  attachFormListeners();
}

function attachFormListeners() {
  const root = document.getElementById('f-name');
  if (!root) return;

  document.getElementById('med-form').querySelectorAll('[data-form]').forEach((btn) => {
    btn.addEventListener('click', () => { formState.form = btn.dataset.form; renderMedForm(); });
  });
  document.getElementById('med-form').querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => { formState.color = btn.dataset.color; renderMedForm(); });
  });
  const freqSel = document.getElementById('f-frequency');
  if (freqSel) freqSel.addEventListener('change', () => {
    if (freqSel.value === 'weekdays' && formState.frequency.type !== 'weekdays') formState.frequency.days = [];
    formState.frequency.type = freqSel.value;
    if (freqSel.value === 'interval' && !formState.frequency.everyNDays) formState.frequency.everyNDays = 1;
    renderMedForm();
  });
  document.getElementById('med-form').querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.day);
      const days = formState.frequency.days || [];
      formState.frequency.days = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      renderMedForm();
    });
  });
  const intervalInput = document.getElementById('f-interval');
  if (intervalInput) intervalInput.addEventListener('input', () => { formState.frequency.everyNDays = Number(intervalInput.value) || 1; });

  document.getElementById('med-form').querySelectorAll('[data-time-idx]').forEach((inp) => {
    inp.addEventListener('change', () => { formState.times[Number(inp.dataset.timeIdx)].time = inp.value; });
  });
  document.getElementById('med-form').querySelectorAll('[data-amount-idx]').forEach((inp) => {
    inp.addEventListener('change', () => { formState.times[Number(inp.dataset.amountIdx)].amount = Number(inp.value) || 1; });
  });
  document.getElementById('med-form').querySelectorAll('[data-remove-time]').forEach((btn) => {
    btn.addEventListener('click', () => { formState.times.splice(Number(btn.dataset.removeTime), 1); renderMedForm(); });
  });
  const addTimeBtn = document.getElementById('f-add-time');
  if (addTimeBtn) addTimeBtn.addEventListener('click', () => { formState.times.push({ time: '12:00', amount: 1 }); renderMedForm(); });

  document.getElementById('med-form').querySelectorAll('[data-remove-ingredient]').forEach((btn) => {
    btn.addEventListener('click', () => { formState.extraIngredients.splice(Number(btn.dataset.removeIngredient), 1); renderMedForm(); });
  });
  const addIngredientBtn = document.getElementById('f-add-ingredient');
  if (addIngredientBtn) addIngredientBtn.addEventListener('click', () => { formState.extraIngredients.push({ name: '', amount: '', unit: 'mg' }); renderMedForm(); });

  const hasEnd = document.getElementById('f-has-end');
  if (hasEnd) hasEnd.addEventListener('change', () => { formState.hasEndDate = hasEnd.checked; if (!hasEnd.checked) formState.endDate = null; renderMedForm(); });

  const stockEnabled = document.getElementById('f-stock-enabled');
  if (stockEnabled) stockEnabled.addEventListener('change', () => { formState.stock.enabled = stockEnabled.checked; renderMedForm(); });

  const delBtn = document.getElementById('f-delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (confirm('Dieses Medikament wirklich löschen? Der Einnahmeverlauf bleibt erhalten.')) {
      await deleteMedicationById(state.editingMedId);
      closeMedModal();
      toast('Medikament gelöscht');
    }
  });
}

async function saveMedForm() {
  syncFormFieldsIntoState();
  formState.name = formState.name.trim();
  formState.dosageUnit = formState.dosageUnit.trim();
  if (!formState.dosageAmount) formState.dosageAmount = 1;
  formState.extraIngredients = (formState.extraIngredients || []).filter((ing) => ing.name.trim() || ing.amount);
  if (!formState.startDate) formState.startDate = todayISO();
  if (formState.frequency.type !== 'asNeeded') {
    formState.times = (formState.times || []).filter((t) => t.time);
  }
  if (!formState.name) { toast('Bitte einen Namen eingeben'); return; }
  if (formState.frequency.type !== 'asNeeded' && formState.times.length === 0) { toast('Bitte mindestens eine Uhrzeit angeben'); return; }
  if (formState.frequency.type === 'weekdays' && (!formState.frequency.days || formState.frequency.days.length === 0)) { toast('Bitte mindestens einen Wochentag wählen'); return; }
  await saveMedication(formState);
  closeMedModal();
  toast('Gespeichert');
}

// ===================================================================
// VERLAUF
// ===================================================================

function renderHistory() {
  document.getElementById('month-label').textContent = `${MONTH_NAMES[state.calMonth]} ${state.calYear}`;

  // Statistik letzte 30 Tage
  let ratioSum = 0, ratioDays = 0;
  for (let i = 0; i < 30; i++) {
    const iso = toISO(addDays(new Date(), -i));
    const stats = computeDayStats(iso);
    if (stats.due > 0) { ratioSum += stats.ratio; ratioDays++; }
  }
  document.getElementById('stat-adherence').textContent = ratioDays === 0 ? '–' : `${Math.round((ratioSum / ratioDays) * 100)}%`;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const iso = toISO(addDays(new Date(), -i));
    const stats = computeDayStats(iso);
    if (stats.due === 0) continue;
    if (stats.ratio === 1) streak++;
    else break;
  }
  document.getElementById('stat-streak').textContent = String(streak);

  // Kalender-Grid (Montag-Start)
  const first = new Date(state.calYear, state.calMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  const today = todayISO();

  let html = WEEKDAYS.map((w) => `<div class="cal-weekday">${w.label}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const iso = toISO(d);
    const stats = computeDayStats(iso);
    const otherMonth = d.getMonth() !== state.calMonth;
    let levelClass = '';
    if (iso <= today && stats.due > 0) {
      levelClass = stats.ratio === 1 ? 'level-full' : stats.ratio === 0 ? 'level-none' : 'level-partial';
    }
    html += `<button type="button" class="cal-day ${otherMonth ? 'other-month' : ''} ${iso === today ? 'today' : ''} ${iso === state.selectedCalDay ? 'selected' : ''} ${levelClass}" data-iso="${iso}">${d.getDate()}</button>`;
  }
  document.getElementById('calendar').innerHTML = html;
  document.getElementById('calendar').querySelectorAll('.cal-day').forEach((btn) => {
    btn.addEventListener('click', () => { state.selectedCalDay = btn.dataset.iso; renderHistory(); });
  });

  renderDayDetail();
}

function renderDayDetail() {
  const panel = document.getElementById('day-detail');
  if (!state.selectedCalDay) { panel.hidden = true; return; }
  const iso = state.selectedCalDay;
  const entries = doseEntriesForDate(iso);
  panel.hidden = false;
  const dateLabel = fromISO(iso).toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long' });
  if (entries.length === 0) {
    panel.innerHTML = `<h3>${dateLabel}</h3><p class="hint">Keine Einnahmen geplant.</p>`;
    return;
  }
  const statusLabel = { taken: 'Eingenommen', skipped: 'Ausgelassen', postponed: 'Verschoben', pending: 'Offen' };
  panel.innerHTML = `<h3>${dateLabel}</h3>` + entries.map((e) => `
    <div class="day-detail-row">
      <span>${e.scheduledTime} · ${escapeHtml(e.med.name)}</span>
      <span class="status-pill ${e.status}">${statusLabel[e.status]}</span>
    </div>`).join('');
}

// ===================================================================
// MEHR / EINSTELLUNGEN
// ===================================================================

function renderMore() {
  renderSyncPanel();

  const notifToggle = document.getElementById('toggle-notifications');
  notifToggle.checked = state.settings.notifications;
  document.getElementById('notif-hint').textContent =
    !('Notification' in window)
      ? 'Dieser Browser unterstützt keine Benachrichtigungen.'
      : Notification.permission === 'denied'
      ? 'Benachrichtigungen sind in den Browser-/Systemeinstellungen blockiert.'
      : 'Erinnert dich, solange MediPlan geöffnet oder im Hintergrund-Tab aktiv ist. Bei vollständig geschlossener App sind (wie bei den meisten Web-Apps ohne eigenen Server) keine Erinnerungen möglich.';
  document.getElementById('select-snooze').value = String(state.settings.snoozeMinutes);
  document.getElementById('select-theme').value = state.settings.theme;

  renderMeasurementPlans();
  renderMeasurements();
}

function renderSyncPanel() {
  const panel = document.getElementById('sync-panel');
  if (!Sync.isCloudEnabled()) {
    panel.innerHTML = `<p class="hint">Cloud-Sync ist noch nicht eingerichtet. Solange kein Firebase-Projekt hinterlegt ist, speichert MediPlan nur lokal auf diesem Gerät (siehe README für die Einrichtung).</p>`;
    return;
  }
  const code = Sync.getCode();
  if (code) {
    panel.innerHTML = `
      <div class="sync-code-display">${code}</div>
      <p class="hint">Gib diesen Code auf deinen anderen Handys unter „Mehr → Geräte-Synchronisierung" ein, damit sie denselben Medikamentenplan sehen.</p>
      <div class="sync-actions">
        <button type="button" id="sync-copy">Code kopieren</button>
        <button type="button" id="sync-leave">Trennen</button>
      </div>`;
    document.getElementById('sync-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(code).then(() => toast('Code kopiert'));
    });
    document.getElementById('sync-leave').addEventListener('click', () => {
      if (confirm('Von der Synchronisierung trennen? Die Daten bleiben in der Cloud erhalten, dieses Gerät zeigt danach nur noch lokale Daten.')) {
        Sync.setCode('');
        location.reload();
      }
    });
  } else {
    panel.innerHTML = `
      <p class="hint">Noch kein Gerätecode aktiv. Erstelle einen neuen Code auf deinem ersten Handy, oder gib hier den Code eines anderen Handys ein.</p>
      <div class="sync-actions">
        <button type="button" class="primary" id="sync-create">Neuen Code erstellen</button>
      </div>
      <div class="sync-actions" style="margin-top:8px">
        <input type="text" id="sync-join-input" placeholder="Code eingeben" maxlength="6" style="text-transform:uppercase" />
        <button type="button" id="sync-join">Verbinden</button>
      </div>`;
    document.getElementById('sync-create').addEventListener('click', () => {
      Sync.setCode(Sync.randomCode());
      location.reload();
    });
    document.getElementById('sync-join').addEventListener('click', () => {
      const val = document.getElementById('sync-join-input').value.trim();
      if (!val) return;
      Sync.setCode(val);
      location.reload();
    });
  }
}

async function toggleNotifications(enabled) {
  if (enabled && 'Notification' in window) {
    const perm = await Notification.requestPermission();
    enabled = perm === 'granted';
  }
  state.settings.notifications = enabled;
  saveSettings();
  renderMore();
}

async function sendTestNotification() {
  if (!('Notification' in window)) { toast('Dieser Browser unterstützt keine Benachrichtigungen'); return; }
  if (Notification.permission !== 'granted') { toast('Bitte zuerst oben die Benachrichtigungen aktivieren'); return; }
  const result = await showAppNotification('Test-Erinnerung', {
    body: 'Wenn du das siehst, funktionieren Benachrichtigungen auf diesem Gerät.',
    icon: 'icons/icon-192.png',
  });
  toast(result.ok ? 'Test-Benachrichtigung gesendet – schau in deiner Benachrichtigungsleiste nach' : 'Fehlgeschlagen: ' + (result.error && result.error.message ? result.error.message : 'unbekannter Fehler'));
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}

// ---- Messwerte ----

const MEASUREMENT_TYPES = {
  bp: { label: 'Blutdruck', unit: 'mmHg', icon: '🩺' },
  sugar: { label: 'Blutzucker', unit: 'mg/dl', icon: '🩸' },
  weight: { label: 'Gewicht', unit: 'kg', icon: '⚖️' },
  pulse: { label: 'Puls', unit: 'bpm', icon: '❤️' },
};
const MEASUREMENT_COLOR = '#2a6fb0';

// ---- Mess-Pläne (wann/wie oft welcher Messwert fällig ist) ----

let planFormState = null;

function defaultMeasurementPlan() {
  return {
    id: uid('mplan'),
    type: 'bp',
    times: [{ time: '07:00' }],
    // timesByDay wird nur genutzt, wenn frequency.type === 'weekdays' ist -
    // dort kann jeder Wochentag eigene, unterschiedliche Uhrzeiten haben
    // (z. B. Mo 7/13 Uhr, Mi 8/18 Uhr). Bei täglich/Intervall gilt weiterhin
    // die einheitliche "times"-Liste für jeden fälligen Tag.
    frequency: { type: 'daily', days: [], timesByDay: {}, everyNDays: 1, anchorDate: todayISO() },
    startDate: todayISO(),
    endDate: null,
    hasEndDate: false,
    active: true,
    createdAt: Date.now(),
  };
}

function renderMeasurementPlans() {
  const listEl = document.getElementById('measurement-plan-list');
  const emptyEl = document.getElementById('measurement-plan-empty');
  if (state.measurementPlans.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = state.measurementPlans.map((plan) => {
    const type = MEASUREMENT_TYPES[plan.type];
    const freqLabel = frequencyLabel(plan);
    const timesLabel = plan.frequency.type === 'asNeeded'
      ? 'Bei Bedarf'
      : plan.frequency.type === 'weekdays'
      ? (plan.frequency.days || []).map((d) => {
          const label = WEEKDAYS.find((w) => w.value === d).label;
          const times = ((plan.frequency.timesByDay && plan.frequency.timesByDay[d]) || []).map((t) => t.time).join(', ');
          return `${label} ${times}`;
        }).join(' · ')
      : (plan.times || []).map((t) => t.time).join(' · ');
    return `
      <div class="med-card" data-plan-id="${plan.id}">
        <div class="dose-icon" style="background:${MEASUREMENT_COLOR}">${type.icon}</div>
        <div class="med-meta">
          <div class="med-name">${escapeHtml(type.label)}</div>
          <div class="med-sub">${freqLabel}</div>
          <div class="med-sub">${timesLabel}</div>
        </div>
        <span class="chevron">›</span>
      </div>`;
  }).join('');
  listEl.querySelectorAll('.med-card').forEach((card) => {
    card.addEventListener('click', () => openMeasurementPlanModal(card.dataset.planId));
  });
}

function openMeasurementPlanModal(planId) {
  state.editingMeasurementPlanId = planId || null;
  const existing = planId ? state.measurementPlans.find((p) => p.id === planId) : null;
  planFormState = existing ? JSON.parse(JSON.stringify(existing)) : defaultMeasurementPlan();
  if (planFormState.hasEndDate === undefined) planFormState.hasEndDate = !!planFormState.endDate;
  document.getElementById('measurement-plan-modal-title').textContent = existing ? 'Mess-Plan bearbeiten' : 'Neuer Mess-Plan';
  renderMeasurementPlanForm();
  document.getElementById('measurement-plan-modal').hidden = false;
}

function closeMeasurementPlanModal() {
  document.getElementById('measurement-plan-modal').hidden = true;
  document.getElementById('measurement-plan-form').innerHTML = '';
  planFormState = null;
  state.editingMeasurementPlanId = null;
}

function syncPlanFormFieldsIntoState() {
  if (!document.getElementById('p-frequency')) return;
  planFormState.startDate = document.getElementById('p-start').value || planFormState.startDate;
  const endInput = document.getElementById('p-end');
  planFormState.endDate = planFormState.hasEndDate && endInput ? (endInput.value || null) : null;
  const intervalInput = document.getElementById('p-interval');
  if (intervalInput) planFormState.frequency.everyNDays = Number(intervalInput.value) || 1;
  document.querySelectorAll('#measurement-plan-form [data-time-idx]').forEach((inp) => {
    if (planFormState.times[Number(inp.dataset.timeIdx)]) planFormState.times[Number(inp.dataset.timeIdx)].time = inp.value;
  });
  document.querySelectorAll('#measurement-plan-form [data-wd-day]').forEach((inp) => {
    const day = Number(inp.dataset.wdDay);
    const idx = Number(inp.dataset.wdIdx);
    const dayTimes = planFormState.frequency.timesByDay && planFormState.frequency.timesByDay[day];
    if (dayTimes && dayTimes[idx]) dayTimes[idx].time = inp.value;
  });
}

function renderMeasurementPlanForm() {
  syncPlanFormFieldsIntoState();
  const f = planFormState;
  if (!f.frequency.timesByDay) f.frequency.timesByDay = {};
  const isWeekdays = f.frequency.type === 'weekdays';

  const typeButtons = Object.entries(MEASUREMENT_TYPES).map(([key, v]) =>
    `<button type="button" data-type="${key}" class="${f.type === key ? 'selected' : ''}" style="background:${MEASUREMENT_COLOR}"><span class="pick-icon">${v.icon}</span><span>${v.label}</span></button>`
  ).join('');
  const weekdayButtons = WEEKDAYS.map((w) =>
    `<button type="button" data-day="${w.value}" class="${(f.frequency.days || []).includes(w.value) ? 'selected' : ''}">${w.label}</button>`
  ).join('');
  const timesHtml = (f.times || []).map((t, idx) => `
    <div class="time-entry">
      <input type="time" data-time-idx="${idx}" value="${t.time}" />
      <button type="button" data-remove-time="${idx}" aria-label="Uhrzeit entfernen">✕</button>
    </div>`).join('');

  // Bei "Bestimmte Wochentage" bekommt jeder ausgewählte Tag seine eigene,
  // unabhängige Liste an Uhrzeiten (z. B. Mo 7/13 Uhr, Mi 8/18 Uhr).
  const weekdayTimesHtml = isWeekdays ? WEEKDAYS
    .filter((w) => (f.frequency.days || []).includes(w.value))
    .map((w) => {
      const dayTimes = f.frequency.timesByDay[w.value] || [];
      const rows = dayTimes.map((t, idx) => `
        <div class="time-entry">
          <input type="time" data-wd-day="${w.value}" data-wd-idx="${idx}" value="${t.time}" />
          <button type="button" data-wd-remove="${w.value}:${idx}" aria-label="Uhrzeit entfernen">✕</button>
        </div>`).join('');
      return `
        <div class="form-field weekday-time-group">
          <label>${w.label}</label>
          ${rows}
          <button type="button" class="add-time-btn" data-wd-add="${w.value}">+ Uhrzeit für ${w.label}</button>
        </div>`;
    }).join('') : '';

  document.getElementById('measurement-plan-form').innerHTML = `
    <div class="form-field">
      <label>Art</label>
      <div class="icon-pick">${typeButtons}</div>
    </div>

    <div class="form-field">
      <label>Häufigkeit</label>
      <select id="p-frequency">
        <option value="daily" ${f.frequency.type === 'daily' ? 'selected' : ''}>Täglich</option>
        <option value="weekdays" ${f.frequency.type === 'weekdays' ? 'selected' : ''}>Bestimmte Wochentage</option>
        <option value="interval" ${f.frequency.type === 'interval' ? 'selected' : ''}>Alle X Tage</option>
        <option value="asNeeded" ${f.frequency.type === 'asNeeded' ? 'selected' : ''}>Bei Bedarf</option>
      </select>
    </div>

    ${isWeekdays ? `<div class="form-field"><label>Wochentage</label><div class="weekday-pick">${weekdayButtons}</div></div>` : ''}
    ${f.frequency.type === 'interval' ? `<div class="form-field"><label>Intervall (Tage)</label><input type="number" id="p-interval" min="1" value="${f.frequency.everyNDays || 1}" /></div>` : ''}

    ${isWeekdays ? `
    <div class="form-field">
      <label>Uhrzeiten je Wochentag</label>
      ${weekdayTimesHtml || '<p class="hint">Bitte oben mindestens einen Wochentag auswählen.</p>'}
    </div>` : ''}

    ${(!isWeekdays && f.frequency.type !== 'asNeeded') ? `
    <div class="form-field">
      <label>Uhrzeiten</label>
      ${timesHtml}
      <button type="button" class="add-time-btn" id="p-add-time">+ Uhrzeit hinzufügen</button>
    </div>` : ''}

    <div class="form-row">
      <div class="form-field">
        <label>Beginn</label>
        <input type="date" id="p-start" value="${f.startDate}" />
      </div>
      <div class="form-field">
        <label>Ende</label>
        <input type="date" id="p-end" value="${f.endDate || ''}" ${f.hasEndDate ? '' : 'disabled'} />
      </div>
    </div>
    <label class="switch-row">
      <span>Enddatum festlegen</span>
      <input type="checkbox" id="p-has-end" ${f.hasEndDate ? 'checked' : ''} />
    </label>

    ${state.editingMeasurementPlanId ? `<button type="button" class="delete-med-btn" id="p-delete">Mess-Plan löschen</button>` : ''}
  `;

  attachPlanFormListeners();
}

function attachPlanFormListeners() {
  const root = document.getElementById('measurement-plan-form');
  root.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => { planFormState.type = btn.dataset.type; renderMeasurementPlanForm(); });
  });
  const freqSel = document.getElementById('p-frequency');
  freqSel.addEventListener('change', () => {
    if (freqSel.value === 'weekdays' && planFormState.frequency.type !== 'weekdays') planFormState.frequency.days = [];
    planFormState.frequency.type = freqSel.value;
    if (freqSel.value === 'interval' && !planFormState.frequency.everyNDays) planFormState.frequency.everyNDays = 1;
    renderMeasurementPlanForm();
  });
  root.querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.day);
      const days = planFormState.frequency.days || [];
      if (!planFormState.frequency.timesByDay) planFormState.frequency.timesByDay = {};
      if (days.includes(day)) {
        planFormState.frequency.days = days.filter((d) => d !== day);
        delete planFormState.frequency.timesByDay[day];
      } else {
        planFormState.frequency.days = [...days, day];
        if (!planFormState.frequency.timesByDay[day]) planFormState.frequency.timesByDay[day] = [{ time: '08:00' }];
      }
      renderMeasurementPlanForm();
    });
  });
  root.querySelectorAll('[data-wd-day]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const day = Number(inp.dataset.wdDay);
      const idx = Number(inp.dataset.wdIdx);
      planFormState.frequency.timesByDay[day][idx].time = inp.value;
    });
  });
  root.querySelectorAll('[data-wd-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [day, idx] = btn.dataset.wdRemove.split(':').map(Number);
      planFormState.frequency.timesByDay[day].splice(idx, 1);
      renderMeasurementPlanForm();
    });
  });
  root.querySelectorAll('[data-wd-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.wdAdd);
      if (!planFormState.frequency.timesByDay[day]) planFormState.frequency.timesByDay[day] = [];
      planFormState.frequency.timesByDay[day].push({ time: '12:00' });
      renderMeasurementPlanForm();
    });
  });
  const intervalInput = document.getElementById('p-interval');
  if (intervalInput) intervalInput.addEventListener('input', () => { planFormState.frequency.everyNDays = Number(intervalInput.value) || 1; });

  root.querySelectorAll('[data-time-idx]').forEach((inp) => {
    inp.addEventListener('change', () => { planFormState.times[Number(inp.dataset.timeIdx)].time = inp.value; });
  });
  root.querySelectorAll('[data-remove-time]').forEach((btn) => {
    btn.addEventListener('click', () => { planFormState.times.splice(Number(btn.dataset.removeTime), 1); renderMeasurementPlanForm(); });
  });
  const addTimeBtn = document.getElementById('p-add-time');
  if (addTimeBtn) addTimeBtn.addEventListener('click', () => { planFormState.times.push({ time: '12:00' }); renderMeasurementPlanForm(); });

  const hasEnd = document.getElementById('p-has-end');
  hasEnd.addEventListener('change', () => { planFormState.hasEndDate = hasEnd.checked; if (!hasEnd.checked) planFormState.endDate = null; renderMeasurementPlanForm(); });

  const delBtn = document.getElementById('p-delete');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (confirm('Diesen Mess-Plan wirklich löschen? Bereits erfasste Werte bleiben erhalten.')) {
      await deleteMeasurementPlanById(state.editingMeasurementPlanId);
      closeMeasurementPlanModal();
      toast('Mess-Plan gelöscht');
    }
  });
}

async function savePlanForm() {
  syncPlanFormFieldsIntoState();
  if (!planFormState.startDate) planFormState.startDate = todayISO();

  if (planFormState.frequency.type === 'weekdays') {
    const days = planFormState.frequency.days || [];
    if (days.length === 0) { toast('Bitte mindestens einen Wochentag wählen'); return; }
    for (const day of days) {
      const times = (planFormState.frequency.timesByDay[day] || []).filter((t) => t.time);
      planFormState.frequency.timesByDay[day] = times;
      if (times.length === 0) {
        toast(`Bitte für ${WEEKDAYS.find((w) => w.value === day).label} mindestens eine Uhrzeit angeben`);
        return;
      }
    }
  } else if (planFormState.frequency.type !== 'asNeeded') {
    planFormState.times = (planFormState.times || []).filter((t) => t.time);
    if (planFormState.times.length === 0) { toast('Bitte mindestens eine Uhrzeit angeben'); return; }
  }

  await saveMeasurementPlan(planFormState);
  closeMeasurementPlanModal();
  toast('Gespeichert');
}

function renderMeasurements() {
  const list = [...state.measurements].sort((a, b) => b.takenAt - a.takenAt).slice(0, 20);
  const listEl = document.getElementById('measurement-list');
  const emptyEl = document.getElementById('measurement-empty');
  if (list.length === 0) { listEl.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  listEl.innerHTML = list.map((m) => {
    const type = MEASUREMENT_TYPES[m.type] || { label: m.type, unit: '' };
    const valueStr = m.type === 'bp' ? `${m.sys}/${m.dia} ${type.unit}` : `${m.value} ${type.unit}`;
    const dateStr = new Date(m.takenAt).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="measurement-row"><span>${type.label}: <strong>${valueStr}</strong> · ${dateStr}</span></div>`;
  }).join('');
}

let measurementPlanContext = null;

function openMeasurementModal(opts) {
  const planEntry = opts && opts.planEntry;
  measurementPlanContext = planEntry || null;
  const lockedType = planEntry ? planEntry.plan.type : null;
  const defaultTime = planEntry && planEntry.scheduledTime
    ? planEntry.scheduledTime
    : (() => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; })();

  document.getElementById('measurement-form').innerHTML = `
    <div class="form-field">
      <label>Art</label>
      <select id="m-type" ${lockedType ? 'disabled' : ''}>
        ${Object.entries(MEASUREMENT_TYPES).map(([k, v]) => `<option value="${k}" ${lockedType === k ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select>
    </div>
    <div id="m-value-fields"></div>
    <div class="form-field">
      <label>Uhrzeit</label>
      <input type="time" id="m-time" value="${defaultTime}" />
    </div>
    <div class="form-field">
      <label>Notiz</label>
      <input type="text" id="m-notes" placeholder="optional" />
    </div>
  `;
  const renderValueFields = () => {
    const type = document.getElementById('m-type').value;
    const container = document.getElementById('m-value-fields');
    if (type === 'bp') {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-field"><label>Systolisch</label><input type="number" id="m-sys" value="120" /></div>
          <div class="form-field"><label>Diastolisch</label><input type="number" id="m-dia" value="80" /></div>
        </div>`;
    } else {
      container.innerHTML = `<div class="form-field"><label>${MEASUREMENT_TYPES[type].label} (${MEASUREMENT_TYPES[type].unit})</label><input type="number" step="0.1" id="m-value" /></div>`;
    }
  };
  document.getElementById('m-type').addEventListener('change', renderValueFields);
  renderValueFields();
  document.getElementById('measurement-modal').hidden = false;
}

function closeMeasurementModal() {
  document.getElementById('measurement-modal').hidden = true;
  measurementPlanContext = null;
}

async function saveMeasurementForm() {
  const type = document.getElementById('m-type').value;
  const notes = document.getElementById('m-notes').value;
  const timeValue = document.getElementById('m-time').value;
  const takenAt = new Date();
  if (timeValue) {
    const [h, m] = timeValue.split(':').map(Number);
    takenAt.setHours(h, m, 0, 0);
  }
  const record = { id: uid('meas'), type, notes, takenAt: takenAt.getTime() };
  if (type === 'bp') {
    record.sys = Number(document.getElementById('m-sys').value) || 0;
    record.dia = Number(document.getElementById('m-dia').value) || 0;
  } else {
    record.value = Number(document.getElementById('m-value').value) || 0;
  }
  await saveMeasurement(record);

  if (measurementPlanContext) {
    const { plan, date, scheduledTime } = measurementPlanContext;
    const intakeId = scheduledTime ? `${plan.id}::${date}::${scheduledTime}` : uid('mintake');
    await saveMeasurementIntake({
      id: intakeId,
      planId: plan.id,
      date,
      time: timeValue,
      status: 'taken',
      valueRecordId: record.id,
      actedAt: Date.now(),
    });
  }

  closeMeasurementModal();
  toast('Messwert gespeichert');
}

// ===================================================================
// Erinnerungen (Notifications) – rein im Vordergrund/Hintergrund-Tab
// ===================================================================

// Zeigt eine Benachrichtigung an. Chrome auf Android (und einige andere
// mobile Browser) werfen bei `new Notification()` einen Fehler, sobald ein
// Service Worker aktiv ist ("Illegal constructor") - dort MUSS der Weg über
// die ServiceWorkerRegistration gehen. Das funktioniert auch auf allen
// anderen modernen Browsern, daher hier einheitlich verwendet.
async function showAppNotification(title, options) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return { ok: true };
    }
    new Notification(title, options);
    return { ok: true };
  } catch (err) {
    console.error('Benachrichtigung fehlgeschlagen', err);
    return { ok: false, error: err };
  }
}

function minutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function checkReminders() {
  if (!state.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const iso = toISO(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  doseEntriesForDate(iso).forEach((e) => {
    const effectiveTime = e.postponedTo || e.scheduledTime;
    const diff = nowMinutes - minutesSinceMidnight(effectiveTime);
    // Bis zu 10 Minuten nach der geplanten Zeit noch nachholen, falls der
    // 20-Sekunden-Takt durch Drosselung im Hintergrund mal ausgesetzt hat.
    if (diff < 0 || diff > 10) return;
    if (e.status === 'taken' || e.status === 'skipped') return;
    const key = `${e.id}_${effectiveTime}`;
    if (state.notifiedKeys.has(key)) return;
    state.notifiedKeys.add(key);
    showAppNotification('Medikamenten-Erinnerung', {
      body: `${e.med.name} – ${doseLabel(e.med, e.amount)} jetzt einnehmen`,
      icon: 'icons/icon-192.png',
      tag: key,
    });
  });

  measurementEntriesForDate(iso).forEach((e) => {
    const diff = nowMinutes - minutesSinceMidnight(e.scheduledTime);
    if (diff < 0 || diff > 10) return;
    if (e.status === 'taken' || e.status === 'skipped') return;
    const key = `${e.id}_${e.scheduledTime}`;
    if (state.notifiedKeys.has(key)) return;
    state.notifiedKeys.add(key);
    const type = MEASUREMENT_TYPES[e.plan.type];
    showAppNotification('Messwert-Erinnerung', {
      body: `${type.label} jetzt messen/eintragen`,
      icon: 'icons/icon-192.png',
      tag: key,
    });
  });
}

// ===================================================================
// Init
// ===================================================================

function bindStaticEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.target));
  });

  document.getElementById('day-prev').addEventListener('click', () => { state.currentDate = addDays(state.currentDate, -1); renderToday(); });
  document.getElementById('day-next').addEventListener('click', () => { state.currentDate = addDays(state.currentDate, 1); renderToday(); });
  document.getElementById('day-label').addEventListener('click', () => { state.currentDate = new Date(); renderToday(); });

  document.getElementById('btn-add-med').addEventListener('click', () => openMedModal(null));
  document.getElementById('empty-add-med').addEventListener('click', () => { switchTab('meds'); openMedModal(null); });
  document.getElementById('meds-empty-add').addEventListener('click', () => openMedModal(null));
  document.getElementById('med-cancel').addEventListener('click', closeMedModal);
  document.getElementById('med-save').addEventListener('click', saveMedForm);

  document.getElementById('month-prev').addEventListener('click', () => {
    state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderHistory();
  });
  document.getElementById('month-next').addEventListener('click', () => {
    state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderHistory();
  });
  document.getElementById('btn-report').addEventListener('click', () => window.print());

  document.getElementById('toggle-notifications').addEventListener('change', (e) => toggleNotifications(e.target.checked));
  document.getElementById('select-snooze').addEventListener('change', (e) => { state.settings.snoozeMinutes = Number(e.target.value); saveSettings(); });
  document.getElementById('select-theme').addEventListener('change', (e) => { state.settings.theme = e.target.value; saveSettings(); applyTheme(); });
  document.getElementById('btn-test-notification').addEventListener('click', sendTestNotification);

  document.getElementById('btn-add-measurement').addEventListener('click', () => openMeasurementModal());
  document.getElementById('measurement-cancel').addEventListener('click', closeMeasurementModal);
  document.getElementById('measurement-save').addEventListener('click', saveMeasurementForm);

  document.getElementById('btn-add-measurement-plan').addEventListener('click', () => openMeasurementPlanModal(null));
  document.getElementById('measurement-plan-cancel').addEventListener('click', closeMeasurementPlanModal);
  document.getElementById('measurement-plan-save').addEventListener('click', savePlanForm);

  document.getElementById('btn-sync-status').addEventListener('click', () => switchTab('more'));
}

function init() {
  applyTheme();
  bindStaticEvents();
  initSync();
  switchTab('today');
  setInterval(checkReminders, 20000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('SW-Registrierung fehlgeschlagen', err));
  }
}

document.addEventListener('DOMContentLoaded', init);
