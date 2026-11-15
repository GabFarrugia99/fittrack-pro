/* FitTrack Gym: workout logger built on openGym's MIT exercise catalogue and body diagram.
   Data: window.GYM_EXERCISES, window.GYM_BODY (see data/ and THIRD_PARTY_NOTICES.md). */
(() => {
'use strict';

// ---------- Data ----------
const EXERCISES = window.GYM_EXERCISES || [];
const BODY = window.GYM_BODY || { inert: [], views: {} };
const EX = new Map(EXERCISES.map(e => [e.id, e]));
const INERT = new Set(BODY.inert);

// Catalogue muscle words -> body diagram regions.
const MUSCLE_REGION = {
    'pectorals': 'chest', 'chest': 'chest', 'upper chest': 'chest',
    'biceps': 'biceps', 'brachialis': 'biceps',
    'triceps': 'triceps',
    'abs': 'abs', 'abdominals': 'abs', 'core': 'abs', 'lower abs': 'abs',
    'obliques': 'obliques',
    'serratus anterior': 'serratus',
    'quads': 'quadriceps', 'quadriceps': 'quadriceps',
    'hamstrings': 'hamstring',
    'glutes': 'gluteal', 'abductors': 'gluteal',
    'adductors': 'adductors', 'inner thighs': 'adductors', 'groin': 'adductors',
    'hip flexors': 'hip-flexors',
    'calves': 'calves', 'soleus': 'calves',
    'shins': 'tibialis', 'ankles': 'tibialis', 'ankle stabilizers': 'tibialis',
    'lats': 'upper-back', 'latissimus dorsi': 'upper-back', 'upper back': 'upper-back',
    'rhomboids': 'upper-back', 'back': 'upper-back',
    'spine': 'lower-back', 'lower back': 'lower-back',
    'traps': 'trapezius', 'trapezius': 'trapezius', 'levator scapulae': 'trapezius',
    'front delts': 'deltoids', 'side delts': 'deltoids', 'rear delts': 'deltoids', 'rotator cuff': 'deltoids',
    'forearms': 'forearm', 'wrists': 'forearm', 'wrist flexors': 'forearm', 'wrist extensors': 'forearm',
    'grip muscles': 'forearm', 'hands': 'forearm',
};
const REGION_LABEL = {
    'chest': 'Chest', 'abs': 'Abs', 'obliques': 'Obliques', 'serratus': 'Serratus',
    'deltoids': 'Shoulders', 'biceps': 'Biceps', 'triceps': 'Triceps', 'forearm': 'Forearms',
    'trapezius': 'Traps', 'upper-back': 'Upper back & lats', 'lower-back': 'Lower back',
    'gluteal': 'Glutes', 'quadriceps': 'Quads', 'hamstring': 'Hamstrings', 'adductors': 'Adductors',
    'hip-flexors': 'Hip flexors', 'calves': 'Calves', 'tibialis': 'Shins',
};
const regionOf = m => MUSCLE_REGION[m] || null;

function exerciseWeights(ex) {
    const w = {};
    for (const m of ex.s) { const r = regionOf(m); if (r) w[r] = Math.max(w[r] || 0, 0.45); }
    const t = regionOf(ex.t); if (t) w[t] = 1;
    return w;
}

const BODY_PARTS = [...new Set(EXERCISES.map(e => e.b))].sort();
const EQUIPMENT = [...new Set(EXERCISES.map(e => e.e))].sort();
const CATEGORY_ICON = {
    strength: 'fa-dumbbell', calisthenics: 'fa-person', stretching: 'fa-child-reaching',
    plyometrics: 'fa-person-running', mobility: 'fa-arrows-spin', cardio: 'fa-heart-pulse',
    isometric: 'fa-hourglass-half', olympic: 'fa-medal', yoga: 'fa-spa', combat: 'fa-hand-fist', rehab: 'fa-kit-medical',
};

// ---------- State ----------
const STORE_KEY = 'fittrack_gym_v1';
const DEFAULTS = { settings: { unit: 'kg', bodyWeightKg: 75, figure: 'male', rest: 90 }, routines: [], workouts: [], active: null };

function load() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
            const d = JSON.parse(raw);
            return { ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } };
        }
    } catch (e) { /* storage unavailable or corrupt */ }
    return structuredClone(DEFAULTS);
}
let db = load();
function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { toast('Could not save: storage is unavailable'); }
}

const ui = {
    tab: 'workout',
    q: '', bodyPart: '', equipment: '', region: '',
    limit: 60,
    pick: null,          // null | 'workout' | 'routine'
    routineDraft: null,  // routine being edited
    sheet: null,         // { kind, ...}
};

// ---------- Utils ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const cap = s => String(s).replace(/\b\w/g, c => c.toUpperCase());
const KG_PER_LB = 0.45359237;
const unit = () => db.settings.unit;
const toDisp = kg => kg == null || kg === '' ? '' : +(unit() === 'lb' ? kg / KG_PER_LB : kg).toFixed(1);
const fromDisp = v => v === '' || v == null || isNaN(+v) ? null : +(unit() === 'lb' ? +v * KG_PER_LB : +v).toFixed(3);
const kind = ex => ex && ex.h ? 'time' : ex && ex.d ? 'distance' : 'reps';
const KIND_LABEL = { reps: 'Reps', time: 'Sec', distance: 'm' };
const fmtDur = ms => {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
};
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtNum = n => Math.round(n).toLocaleString();

let toastTimer;
function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function setLabel(ex, set) {
    const k = kind(ex);
    const w = set.w ? `${toDisp(set.w)} ${unit()}` : '';
    const v = set.v ?? '';
    if (k === 'time') return `${w ? w + ' × ' : ''}${v}s`;
    if (k === 'distance') return `${w ? w + ' × ' : ''}${v}m`;
    return w ? `${w} × ${v}` : `${v} reps`;
}
// Epley estimate, reps sets only.
const e1rm = s => (s.w && s.v && s.v <= 20) ? s.w * (1 + s.v / 30) : 0;
const workoutVolume = w => w.items.reduce((a, it) => a + it.sets.reduce((b, s) => b + (kind(EX.get(it.ex)) === 'reps' ? (s.w || 0) * (s.v || 0) : 0), 0), 0);
const workoutSets = w => w.items.reduce((a, it) => a + it.sets.length, 0);

// Calories: MET x body weight (kg) x hours. 5.0 = general weight training (Compendium of Physical Activities).
const STRENGTH_MET = 5.0;
const kcalFor = minutes => Math.round(STRENGTH_MET * (db.settings.bodyWeightKg || 75) * minutes / 60);

function lastSetsFor(exId) {
    for (const w of db.workouts) {
        const it = w.items.find(i => i.ex === exId);
        if (it && it.sets.length) return it.sets;
    }
    return null;
}
function historyFor(exId) {
    const out = [];
    for (const w of db.workouts) for (const it of w.items) if (it.ex === exId) out.push({ w, sets: it.sets });
    return out;
}

// ---------- FitTrack Pro bridge ----------
// FitTrack Pro reads today's exercise calories from fittrack_exercise_<Date.toDateString()>.
const diaryKey = ts => `fittrack_exercise_${new Date(ts).toDateString()}`;
function diaryWrite(w) {
    try {
        const k = diaryKey(w.start);
        const list = JSON.parse(localStorage.getItem(k) || '[]').filter(e => e.workoutId !== w.id);
        list.push({ source: 'fittrack-gym', workoutId: w.id, name: w.name, minutes: Math.round((w.end - w.start) / 60000), calories: w.kcal, timestamp: new Date(w.end).toISOString() });
        localStorage.setItem(k, JSON.stringify(list));
    } catch (e) { /* ignore */ }
}
function diaryRemove(w) {
    try {
        const k = diaryKey(w.start);
        const list = JSON.parse(localStorage.getItem(k) || '[]').filter(e => e.workoutId !== w.id);
        list.length ? localStorage.setItem(k, JSON.stringify(list)) : localStorage.removeItem(k);
    } catch (e) { /* ignore */ }
}

// ---------- Body map ----------
function heatColor(v) {
    // 0..1 -> muted to emerald
    const a = 0.12 + 0.88 * Math.pow(Math.min(1, v), 1.5);
    return `rgba(16,185,129,${a.toFixed(2)})`;
}
function bodyMap(weights = {}, { clickable = false, selected = '', compact = false } = {}) {
    const fig = BODY.views[db.settings.figure] || BODY.views.male;
    if (!fig) return '';
    const svg = view => {
        const v = fig[view];
        const paths = Object.entries(v.p).map(([part, ds]) => {
            const inert = INERT.has(part);
            const w = weights[part];
            const style = !inert && w ? ` style="fill:${heatColor(w)}"` : '';
            const cls = [inert ? 'inert' : '', part === selected ? 'sel' : ''].join(' ').trim();
            const data = !inert && clickable ? ` data-action="region" data-region="${part}"` : '';
            const title = !inert ? `<title>${esc(REGION_LABEL[part] || part)}</title>` : '';
            return ds.map(d => `<path d="${d}"${cls ? ` class="${cls}"` : ''}${style}${data}>${title}</path>`).join('');
        }).join('');
        return `<svg viewBox="${v.vb}" role="img" aria-label="${view} view">${paths}</svg>`;
    };
    return `<div class="body-map${clickable ? ' clickable' : ''}${compact ? ' compact' : ''}">${svg('front')}${svg('back')}</div>`;
}

function weeklyHeat() {
    const since = Date.now() - 7 * 864e5;
    const acc = {};
    for (const w of db.workouts) {
        if (w.start < since) continue;
        for (const it of w.items) {
            const ex = EX.get(it.ex); if (!ex) continue;
            const ws = exerciseWeights(ex);
            for (const [r, v] of Object.entries(ws)) acc[r] = (acc[r] || 0) + v * it.sets.length;
        }
    }
    const max = Math.max(0, ...Object.values(acc));
    const out = {};
    for (const [r, v] of Object.entries(acc)) out[r] = max ? v / max : 0;
    return { weights: out, raw: acc };
}

// ---------- Rendering ----------
const TITLES = { workout: 'Workout', library: 'Exercises', routines: 'Routines', history: 'History' };

function render() {
    document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
    $('#title').textContent = ui.pick ? 'Add exercises' : TITLES[ui.tab];
    const v = $('#view');
    v.innerHTML = ({ workout: viewWorkout, library: viewLibrary, routines: viewRoutines, history: viewHistory })[ui.tab]();
    if (ui.tab === 'workout' && db.active) tickTimer();
}

function viewWorkout() {
    if (db.active) return viewActive();
    const week = db.workouts.filter(w => w.start > Date.now() - 7 * 864e5);
    const heat = weeklyHeat();
    const top = Object.entries(heat.raw).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return `
        <div class="stats">
            <div class="stat"><div class="v">${week.length}</div><div class="l">Workouts (7d)</div></div>
            <div class="stat"><div class="v">${fmtNum(week.reduce((a, w) => a + toDisp(workoutVolume(w)), 0))}</div><div class="l">Volume (${unit()})</div></div>
            <div class="stat"><div class="v">${fmtNum(week.reduce((a, w) => a + (w.kcal || 0), 0))}</div><div class="l">kcal burned</div></div>
        </div>
        <button class="btn primary block" data-action="start-empty"><i class="fas fa-play"></i> Start empty workout</button>
        <div class="section-title">Start from a routine</div>
        ${db.routines.length ? db.routines.map(r => `
            <div class="card row">
                <div class="grow">
                    <div class="title" style="font-weight:700">${esc(r.name)}</div>
                    <div class="muted small cap">${esc(r.items.map(i => EX.get(i.ex)?.n).filter(Boolean).slice(0, 4).join(', '))}${r.items.length > 4 ? '…' : ''}</div>
                </div>
                <button class="btn sm primary" data-action="start-routine" data-id="${r.id}"><i class="fas fa-play"></i> Start</button>
            </div>`).join('') : `<div class="card empty"><i class="fas fa-list-check"></i>No routines yet.<br><button class="btn sm" style="margin-top:12px" data-action="new-routine">Create a routine</button></div>`}
        <div class="section-title">Muscles trained, last 7 days</div>
        <div class="card">
            ${bodyMap(heat.weights)}
            ${top.length ? `<div class="legend">${top.map(([r, v]) => `<span style="--c:${heatColor(heat.weights[r])}">${esc(REGION_LABEL[r] || r)} · ${Math.round(v)} sets</span>`).join('')}</div>`
                : `<p class="muted small" style="text-align:center;margin-top:8px">Log a workout to see which muscles you've trained.</p>`}
        </div>`;
}

function viewActive() {
    const a = db.active;
    return `
        <div class="wk-head">
            <input type="text" value="${esc(a.name)}" data-bind="wk-name" aria-label="Workout name">
            <div class="timer" id="wkTimer">${fmtDur(Date.now() - a.start)}</div>
        </div>
        ${a.items.map((it, i) => activeExercise(it, i)).join('') || `<div class="card empty"><i class="fas fa-dumbbell"></i>Add your first exercise.</div>`}
        <button class="btn block" data-action="pick-workout"><i class="fas fa-plus"></i> Add exercises</button>
        <div class="btn-row">
            <button class="btn danger" data-action="discard">Discard</button>
            <button class="btn primary" data-action="finish"><i class="fas fa-flag-checkered"></i> Finish</button>
        </div>`;
}

function activeExercise(it, i) {
    const ex = EX.get(it.ex);
    const k = kind(ex);
    const prev = lastSetsFor(it.ex) || [];
    return `
        <div class="card wk-ex">
            <div class="wk-ex-title">
                <span class="ex-name" data-action="detail" data-id="${it.ex}">${esc(ex ? ex.n : 'Unknown exercise')}</span>
                <button class="icon-btn" data-action="move-ex" data-i="${i}" data-dir="-1" title="Move up" aria-label="Move up"><i class="fas fa-arrow-up"></i></button>
                <button class="icon-btn" data-action="remove-ex" data-i="${i}" title="Remove" aria-label="Remove exercise"><i class="fas fa-trash"></i></button>
            </div>
            <table class="sets">
                <thead><tr><th>Set</th><th>Previous</th><th>${unit()}</th><th>${KIND_LABEL[k]}</th><th></th></tr></thead>
                <tbody>
                ${it.sets.map((s, j) => `
                    <tr class="${s.done ? 'done' : ''}">
                        <td class="set-no">${j + 1}</td>
                        <td class="prev">${prev[j] ? esc(setLabel(ex, prev[j])) : '–'}</td>
                        <td><input type="number" inputmode="decimal" min="0" step="0.5" value="${toDisp(s.w)}" placeholder="${prev[j] ? toDisp(prev[j].w) || '' : ''}" data-bind="set-w" data-i="${i}" data-j="${j}" aria-label="Weight"></td>
                        <td><input type="number" inputmode="numeric" min="0" step="1" value="${s.v ?? ''}" placeholder="${prev[j]?.v ?? ''}" data-bind="set-v" data-i="${i}" data-j="${j}" aria-label="${KIND_LABEL[k]}"></td>
                        <td><button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-label="Complete set"><i class="fas fa-check"></i></button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="btn-row" style="margin-top:8px">
                <button class="btn sm" data-action="add-set" data-i="${i}"><i class="fas fa-plus"></i> Add set</button>
                ${it.sets.length > 1 ? `<button class="btn sm" data-action="del-set" data-i="${i}"><i class="fas fa-minus"></i> Remove set</button>` : ''}
            </div>
        </div>`;
}

function resetFilters() { ui.q = ''; ui.bodyPart = ''; ui.equipment = ''; ui.region = ''; ui.limit = 60; }

function filteredExercises() {
    const q = ui.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return EXERCISES.filter(e =>
        (!ui.bodyPart || e.b === ui.bodyPart) &&
        (!ui.equipment || e.e === ui.equipment) &&
        (!ui.region || regionOf(e.t) === ui.region) &&
        q.every(w => e.n.includes(w) || e.t.includes(w) || e.e.includes(w)));
}

function viewLibrary() {
    const list = filteredExercises();
    const shown = list.slice(0, ui.limit);
    const pickCount = ui.pick === 'workout' ? db.active?.items.length || 0 : ui.pick === 'routine' ? ui.routineDraft?.items.length || 0 : 0;
    return `
        ${ui.pick ? `<div class="pick-banner"><span>Tap <b>+</b> to add to ${ui.pick === 'workout' ? 'your workout' : 'the routine'} (${pickCount})</span><button class="btn sm" data-action="pick-done">Done</button></div>` : ''}
        <div class="search-bar"><i class="fas fa-magnifying-glass"></i><input type="search" placeholder="Search ${EXERCISES.length.toLocaleString()} exercises" value="${esc(ui.q)}" data-bind="q" aria-label="Search exercises"></div>
        <div class="filters">
            <select data-bind="bodyPart" aria-label="Body part"><option value="">All body parts</option>${BODY_PARTS.map(b => `<option value="${esc(b)}"${b === ui.bodyPart ? ' selected' : ''}>${esc(cap(b))}</option>`).join('')}</select>
            <select data-bind="equipment" aria-label="Equipment"><option value="">All equipment</option>${EQUIPMENT.map(b => `<option value="${esc(b)}"${b === ui.equipment ? ' selected' : ''}>${esc(cap(b))}</option>`).join('')}</select>
        </div>
        <details class="card" ${ui.region ? 'open' : ''} style="padding:12px 16px">
            <summary class="row between" style="cursor:pointer;list-style:none">
                <span><i class="fas fa-person" style="color:var(--primary)"></i>&nbsp; ${ui.region ? `Target: <b>${esc(REGION_LABEL[ui.region])}</b>` : 'Filter by muscle'}</span>
                ${ui.region ? `<button class="btn sm" data-action="region" data-region="">Clear</button>` : '<i class="fas fa-chevron-down muted"></i>'}
            </summary>
            <div style="margin-top:12px">${bodyMap({}, { clickable: true, selected: ui.region, compact: true })}
            <p class="muted small" style="text-align:center;margin-top:6px">Tap a muscle to show exercises that target it.</p></div>
        </details>
        <div class="muted small" style="margin:4px 4px 8px">${list.length.toLocaleString()} exercise${list.length === 1 ? '' : 's'}</div>
        <ul class="ex-list">
            ${shown.map(e => `
                <li class="ex-item" data-action="detail" data-id="${e.id}">
                    <div class="ex-icon"><i class="fas ${CATEGORY_ICON[e.c] || 'fa-dumbbell'}"></i></div>
                    <div class="grow"><div class="ex-name">${esc(e.n)}</div><div class="ex-meta">${esc(e.t)} · ${esc(e.e)}</div></div>
                    ${ui.pick ? `<button class="ex-add" data-action="pick-add" data-id="${e.id}" aria-label="Add"><i class="fas fa-plus"></i></button>` : '<i class="fas fa-chevron-right muted"></i>'}
                </li>`).join('')}
        </ul>
        ${list.length > shown.length ? `<button class="btn block" data-action="more">Show more (${(list.length - shown.length).toLocaleString()} left)</button>` : ''}
        ${!list.length ? `<div class="empty"><i class="fas fa-magnifying-glass"></i>No exercises match.</div>` : ''}`;
}

function viewRoutines() {
    return `
        <button class="btn primary block" data-action="new-routine"><i class="fas fa-plus"></i> New routine</button>
        <div class="section-title">Your routines</div>
        ${db.routines.length ? db.routines.map(r => `
            <div class="card list-card" data-action="edit-routine" data-id="${r.id}">
                <div class="row between"><div class="title">${esc(r.name)}</div><span class="muted small">${r.items.length} exercise${r.items.length === 1 ? '' : 's'}</span></div>
                <div class="muted small cap" style="margin-top:4px">${esc(r.items.map(i => `${i.sets}× ${EX.get(i.ex)?.n || '?'}`).join(' · '))}</div>
            </div>`).join('') : `<div class="card empty"><i class="fas fa-list-check"></i>Build a routine once, then start it in one tap.</div>`}`;
}

function viewHistory() {
    if (!db.workouts.length) return `<div class="card empty"><i class="fas fa-clock-rotate-left"></i>Finished workouts appear here.</div>`;
    return db.workouts.map(w => `
        <div class="card list-card" data-action="workout-detail" data-id="${w.id}">
            <div class="row between"><div class="title">${esc(w.name)}</div><span class="muted small">${fmtDate(w.start)}</span></div>
            <div class="row muted small" style="margin-top:6px;gap:16px">
                <span><i class="far fa-clock"></i> ${fmtDur(w.end - w.start)}</span>
                <span><i class="fas fa-weight-hanging"></i> ${fmtNum(toDisp(workoutVolume(w)))} ${unit()}</span>
                <span><i class="fas fa-layer-group"></i> ${workoutSets(w)} sets</span>
                <span><i class="fas fa-fire"></i> ${w.kcal} kcal</span>
            </div>
            <div class="muted small cap" style="margin-top:6px">${esc(w.items.map(i => EX.get(i.ex)?.n).filter(Boolean).join(', '))}</div>
        </div>`).join('');
}

// ---------- Sheets ----------
function openSheet(title, html, state) {
    ui.sheet = state;
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false;
    $('#sheetBody').scrollTop = 0;
}
function closeSheet() { ui.sheet = null; $('#sheet').hidden = true; }

function showDetail(id) {
    const ex = EX.get(id); if (!ex) return;
    const hist = historyFor(id);
    let best = 0, bestSet = null;
    for (const h of hist) for (const s of h.sets) { const v = e1rm(s); if (v > best) { best = v; bestSet = s; } }
    const canAddWorkout = !!db.active;
    openSheet(ex.n, `
        <div style="margin-bottom:12px">
            <span class="tag target">${esc(ex.t)}</span>${ex.s.map(m => `<span class="tag">${esc(m)}</span>`).join('')}
        </div>
        <div class="row muted small" style="gap:14px;margin-bottom:14px;flex-wrap:wrap">
            <span class="cap"><i class="fas fa-dumbbell"></i> ${esc(ex.e)}</span>
            <span class="cap"><i class="fas fa-location-crosshairs"></i> ${esc(ex.b)}</span>
            <span class="cap"><i class="fas ${CATEGORY_ICON[ex.c] || 'fa-tag'}"></i> ${esc(ex.c)}</span>
        </div>
        <div class="card">
            ${bodyMap(exerciseWeights(ex))}
            <div class="legend"><span style="--c:${heatColor(1)}">Target</span><span style="--c:${heatColor(.45)}">Secondary</span></div>
            ${!regionOf(ex.t) ? `<p class="muted small" style="text-align:center;margin-top:6px">Mainly trains the ${esc(ex.t)}.</p>` : ''}
        </div>
        <h3 style="margin:16px 0 10px">How to do it</h3>
        <ol class="instructions">${ex.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        ${hist.length ? `
            <h3 style="margin:16px 0 10px">Your history</h3>
            <div class="card">
                ${best ? `<div class="row between" style="margin-bottom:8px"><span class="muted">Best estimated 1RM</span><b>${toDisp(best)} ${unit()}</b></div>
                <div class="muted small" style="margin-bottom:8px">from ${esc(setLabel(ex, bestSet))}</div>` : ''}
                ${hist.slice(0, 6).map(h => `<div class="hist-ex"><div class="small muted">${fmtDate(h.w.start)}</div><div class="small">${h.sets.map(s => esc(setLabel(ex, s))).join(' · ')}</div></div>`).join('')}
            </div>` : ''}
        <div class="btn-row">
            ${canAddWorkout ? `<button class="btn primary" data-action="add-to-workout" data-id="${id}"><i class="fas fa-plus"></i> Add to workout</button>`
                : `<button class="btn primary" data-action="start-with" data-id="${id}"><i class="fas fa-play"></i> Start workout with this</button>`}
        </div>
        <p class="muted small" style="margin-top:16px">Exercise data from openGym (ExerciseDB, MIT). See <a href="THIRD_PARTY_NOTICES.md" style="color:var(--primary)">notices</a>.</p>
    `, { kind: 'detail', id });
}

function showRoutineEditor() {
    const r = ui.routineDraft;
    openSheet(r.isNew ? 'New routine' : 'Edit routine', `
        <div class="field"><label for="rName">Name</label><input id="rName" type="text" value="${esc(r.name)}" data-bind="r-name" placeholder="e.g. Push day"></div>
        <div class="row between" style="margin-bottom:6px"><label class="muted small">Exercises</label><span class="muted small">Sets · Reps</span></div>
        <div class="card" style="padding:4px 12px">
            ${r.items.length ? r.items.map((it, i) => `
                <div class="routine-ex">
                    <div class="ex-name small">${esc(EX.get(it.ex)?.n || '?')}</div>
                    <input type="number" min="1" max="20" value="${it.sets}" data-bind="r-sets" data-i="${i}" aria-label="Sets">
                    <input type="number" min="1" max="999" value="${it.reps}" data-bind="r-reps" data-i="${i}" aria-label="Reps">
                    <button class="icon-btn" data-action="r-remove" data-i="${i}" aria-label="Remove"><i class="fas fa-xmark"></i></button>
                </div>`).join('') : `<div class="empty small">No exercises yet.</div>`}
        </div>
        <button class="btn block" data-action="pick-routine"><i class="fas fa-plus"></i> Add exercises</button>
        <div class="btn-row">
            ${!r.isNew ? `<button class="btn danger" data-action="r-delete">Delete</button>` : ''}
            <button class="btn primary" data-action="r-save">Save routine</button>
        </div>
    `, { kind: 'routine' });
}

function showWorkoutDetail(id) {
    const w = db.workouts.find(x => x.id === id); if (!w) return;
    const heat = {};
    for (const it of w.items) { const ex = EX.get(it.ex); if (!ex) continue; for (const [r, v] of Object.entries(exerciseWeights(ex))) heat[r] = Math.max(heat[r] || 0, v); }
    openSheet(w.name, `
        <div class="muted small" style="margin-bottom:12px">${new Date(w.start).toLocaleString()}</div>
        <div class="stats">
            <div class="stat"><div class="v">${fmtDur(w.end - w.start)}</div><div class="l">Duration</div></div>
            <div class="stat"><div class="v">${fmtNum(toDisp(workoutVolume(w)))}</div><div class="l">Volume (${unit()})</div></div>
            <div class="stat"><div class="v">${w.kcal}</div><div class="l">kcal</div></div>
        </div>
        <div class="card">${bodyMap(heat, { compact: true })}</div>
        <div class="card">
            ${w.items.map(it => { const ex = EX.get(it.ex); return `<div class="hist-ex"><div class="ex-name" data-action="detail" data-id="${it.ex}" style="cursor:pointer">${esc(ex?.n || '?')}</div><div class="small muted">${it.sets.map(s => esc(setLabel(ex, s))).join(' · ')}</div></div>`; }).join('')}
        </div>
        <div class="btn-row">
            <button class="btn danger" data-action="delete-workout" data-id="${w.id}">Delete</button>
            <button class="btn" data-action="save-as-routine" data-id="${w.id}"><i class="fas fa-list-check"></i> Save as routine</button>
        </div>
    `, { kind: 'workout', id });
}

function showSettings() {
    const s = db.settings;
    openSheet('Settings', `
        <div class="field"><label>Weight unit</label>
            <div class="seg"><button class="${s.unit === 'kg' ? 'on' : ''}" data-action="set-unit" data-v="kg">kg</button><button class="${s.unit === 'lb' ? 'on' : ''}" data-action="set-unit" data-v="lb">lb</button></div></div>
        <div class="field"><label for="sBw">Body weight (${s.unit}), used to estimate calories</label><input id="sBw" type="number" min="20" step="0.1" value="${toDisp(s.bodyWeightKg)}" data-bind="s-bw"></div>
        <div class="field"><label for="sRest">Rest timer (seconds, 0 to turn off)</label><input id="sRest" type="number" min="0" step="15" value="${s.rest}" data-bind="s-rest"></div>
        <div class="field"><label>Body diagram</label>
            <div class="seg"><button class="${s.figure === 'male' ? 'on' : ''}" data-action="set-figure" data-v="male">Male</button><button class="${s.figure === 'female' ? 'on' : ''}" data-action="set-figure" data-v="female">Female</button></div></div>
        <div class="card small muted">
            Finished workouts add their estimated calories to the <b>Exercise</b> total in FitTrack Pro's diary.
            Data stays in this browser.
        </div>
        <div class="btn-row"><button class="btn" data-action="export"><i class="fas fa-download"></i> Export data</button></div>
        <p class="muted small" style="margin-top:16px">Exercise library and body diagram from <a href="https://github.com/DuarteSantos8/openGym" style="color:var(--primary)" target="_blank" rel="noopener">openGym</a> (MIT-licensed parts only). <a href="THIRD_PARTY_NOTICES.md" style="color:var(--primary)">Notices</a></p>
    `, { kind: 'settings' });
}

// ---------- Workout actions ----------
function newSetsFor(exId, n = 3, reps = null) {
    const prev = lastSetsFor(exId) || [];
    return Array.from({ length: n }, (_, j) => ({ w: prev[j]?.w ?? prev[prev.length - 1]?.w ?? null, v: reps ?? prev[j]?.v ?? null, done: false }));
}
function startWorkout(name, items = []) {
    if (db.active) { toast('Finish or discard the current workout first'); return false; }
    db.active = { id: uid(), name, start: Date.now(), items };
    save(); ui.tab = 'workout'; closeSheet(); render();
    return true;
}
function defaultName() {
    const h = new Date().getHours();
    return h < 12 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout';
}
function addToActive(exId) {
    db.active.items.push({ ex: exId, sets: newSetsFor(exId) });
    save();
}
function finishWorkout() {
    const a = db.active;
    const items = a.items.map(it => ({ ex: it.ex, sets: it.sets.filter(s => s.done).map(({ w, v }) => ({ w, v })) })).filter(it => it.sets.length);
    if (!items.length) {
        if (confirm('No sets are ticked as done. Discard this workout?')) { db.active = null; stopRest(); save(); render(); }
        return;
    }
    const pending = a.items.reduce((n, it) => n + it.sets.filter(s => !s.done).length, 0);
    if (pending && !confirm(`${pending} set${pending === 1 ? ' isn\'t' : 's aren\'t'} ticked and won't be saved. Finish anyway?`)) return;
    const end = Date.now();
    const w = { id: a.id, name: a.name.trim() || defaultName(), start: a.start, end, items, kcal: kcalFor((end - a.start) / 60000) };
    db.workouts.unshift(w);
    db.active = null;
    stopRest(); save(); diaryWrite(w);
    ui.tab = 'history'; render();
    toast(`Saved · ${w.kcal} kcal added to your diary`);
}

// ---------- Rest timer ----------
let restEnd = 0, restInt = null;
function startRest() {
    const secs = +db.settings.rest; if (!secs) return;
    restEnd = Date.now() + secs * 1000;
    $('#restBar').hidden = false;
    document.body.classList.add('resting');
    clearInterval(restInt); restInt = setInterval(tickRest, 250); tickRest();
}
function tickRest() {
    const left = restEnd - Date.now();
    if (left <= 0) {
        stopRest();
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
        toast('Rest over: next set!');
        return;
    }
    $('#restTime').textContent = fmtDur(left + 999);
}
function stopRest() { clearInterval(restInt); restInt = null; $('#restBar').hidden = true; document.body.classList.remove('resting'); }

let timerInt = null;
function tickTimer() {
    clearInterval(timerInt);
    timerInt = setInterval(() => {
        const t = $('#wkTimer');
        if (!t || !db.active) { clearInterval(timerInt); return; }
        t.textContent = fmtDur(Date.now() - db.active.start);
    }, 1000);
}

// ---------- Events ----------
document.addEventListener('click', e => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
        ui.tab = tabBtn.dataset.tab; ui.pick = null; render(); window.scrollTo(0, 0);
        return;
    }
    const el = e.target.closest('[data-action]');
    if (!el) {
        if (e.target === $('#sheet')) closeSheet();
        return;
    }
    const { action, id } = el.dataset;
    const i = +el.dataset.i, j = +el.dataset.j;
    switch (action) {
        case 'settings': showSettings(); break;
        case 'close-sheet': closeSheet(); break;
        case 'detail': e.stopPropagation(); showDetail(id); break;
        case 'more': ui.limit += 60; render(); break;
        case 'region':
            e.preventDefault(); e.stopPropagation();
            ui.region = ui.region === el.dataset.region ? '' : el.dataset.region; ui.limit = 60; render(); break;

        case 'start-empty': startWorkout(defaultName()); break;
        case 'start-routine': {
            const r = db.routines.find(x => x.id === id); if (!r) break;
            startWorkout(r.name, r.items.filter(it => EX.has(it.ex)).map(it => ({ ex: it.ex, sets: newSetsFor(it.ex, it.sets, it.reps) })));
            break;
        }
        case 'start-with': if (startWorkout(defaultName())) { addToActive(id); render(); } break;
        case 'add-to-workout': addToActive(id); closeSheet(); toast('Added to workout'); if (ui.tab === 'workout') render(); break;
        case 'pick-workout': resetFilters(); ui.pick = 'workout'; ui.tab = 'library'; render(); window.scrollTo(0, 0); break;
        case 'pick-add':
            e.stopPropagation();
            if (ui.pick === 'workout' && db.active) { addToActive(id); }
            else if (ui.pick === 'routine' && ui.routineDraft) { ui.routineDraft.items.push({ ex: id, sets: 3, reps: kind(EX.get(id)) === 'time' ? 30 : 10 }); }
            toast(`Added ${cap(EX.get(id).n)}`); render();
            break;
        case 'pick-done':
            if (ui.pick === 'routine') { ui.pick = null; ui.tab = 'routines'; render(); showRoutineEditor(); }
            else { ui.pick = null; ui.tab = 'workout'; render(); }
            window.scrollTo(0, 0);
            break;
        case 'toggle-set': {
            const s = db.active.items[i].sets[j];
            s.done = !s.done;
            if (s.done) {
                // Fill blanks from placeholders (previous values) so a quick tick logs a set.
                const row = el.closest('tr');
                const wIn = row.querySelector('[data-bind="set-w"]'), vIn = row.querySelector('[data-bind="set-v"]');
                if (s.w == null && wIn.placeholder) s.w = fromDisp(wIn.placeholder);
                if (s.v == null && vIn.placeholder) s.v = +vIn.placeholder;
                if (s.v == null) { s.done = false; toast(`Enter ${KIND_LABEL[kind(EX.get(db.active.items[i].ex))].toLowerCase()} first`); vIn.focus(); break; }
                startRest();
            }
            save(); render();
            break;
        }
        case 'add-set': {
            const sets = db.active.items[i].sets, last = sets[sets.length - 1];
            sets.push({ w: last?.w ?? null, v: last?.v ?? null, done: false }); save(); render(); break;
        }
        case 'del-set': db.active.items[i].sets.pop(); save(); render(); break;
        case 'remove-ex': db.active.items.splice(i, 1); save(); render(); break;
        case 'move-ex': {
            const items = db.active.items, k = i + +el.dataset.dir;
            if (k >= 0 && k < items.length) { [items[i], items[k]] = [items[k], items[i]]; save(); render(); }
            break;
        }
        case 'discard': if (confirm('Discard this workout? Nothing will be saved.')) { db.active = null; stopRest(); save(); render(); } break;
        case 'finish': finishWorkout(); break;
        case 'rest-adjust': restEnd += +el.dataset.delta * 1000; tickRest(); break;
        case 'rest-skip': stopRest(); break;

        case 'new-routine': ui.routineDraft = { id: uid(), name: '', items: [], isNew: true }; ui.tab = 'routines'; render(); showRoutineEditor(); break;
        case 'edit-routine': {
            const r = db.routines.find(x => x.id === id); if (!r) break;
            ui.routineDraft = structuredClone(r); showRoutineEditor(); break;
        }
        case 'pick-routine': closeSheet(); resetFilters(); ui.pick = 'routine'; ui.tab = 'library'; render(); window.scrollTo(0, 0); break;
        case 'r-remove': ui.routineDraft.items.splice(i, 1); showRoutineEditor(); break;
        case 'r-save': {
            const r = ui.routineDraft;
            if (!r.name.trim()) { toast('Give the routine a name'); $('#rName').focus(); break; }
            if (!r.items.length) { toast('Add at least one exercise'); break; }
            delete r.isNew; r.name = r.name.trim();
            const k = db.routines.findIndex(x => x.id === r.id);
            k >= 0 ? db.routines[k] = r : db.routines.push(r);
            ui.routineDraft = null; save(); closeSheet(); render(); toast('Routine saved');
            break;
        }
        case 'r-delete':
            if (confirm('Delete this routine?')) { db.routines = db.routines.filter(x => x.id !== ui.routineDraft.id); ui.routineDraft = null; save(); closeSheet(); render(); }
            break;

        case 'workout-detail': showWorkoutDetail(id); break;
        case 'delete-workout': {
            const w = db.workouts.find(x => x.id === id);
            if (w && confirm('Delete this workout from your history?')) { db.workouts = db.workouts.filter(x => x.id !== id); diaryRemove(w); save(); closeSheet(); render(); }
            break;
        }
        case 'save-as-routine': {
            const w = db.workouts.find(x => x.id === id); if (!w) break;
            ui.routineDraft = { id: uid(), name: w.name, isNew: true, items: w.items.map(it => ({ ex: it.ex, sets: it.sets.length, reps: it.sets[0]?.v || 10 })) };
            ui.tab = 'routines'; render(); showRoutineEditor();
            break;
        }

        case 'set-unit': db.settings.unit = el.dataset.v; save(); showSettings(); render(); break;
        case 'set-figure': db.settings.figure = el.dataset.v; save(); showSettings(); render(); break;
        case 'export': {
            const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = `fittrack-gym-${new Date().toISOString().slice(0, 10)}.json`;
            a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            break;
        }
    }
});

let searchTimer;
document.addEventListener('input', e => {
    const el = e.target, b = el.dataset.bind; if (!b) return;
    const i = +el.dataset.i, j = +el.dataset.j;
    switch (b) {
        case 'q':
            ui.q = el.value; ui.limit = 60;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const pos = el.selectionStart; render();
                const n = $('[data-bind="q"]'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) { /* ignore */ }
            }, 150);
            break;
        case 'wk-name': db.active.name = el.value; save(); break;
        case 'set-w': db.active.items[i].sets[j].w = fromDisp(el.value); save(); break;
        case 'set-v': db.active.items[i].sets[j].v = el.value === '' ? null : +el.value; save(); break;
        case 'r-name': ui.routineDraft.name = el.value; break;
        case 'r-sets': ui.routineDraft.items[i].sets = Math.max(1, Math.min(20, +el.value || 1)); break;
        case 'r-reps': ui.routineDraft.items[i].reps = Math.max(1, +el.value || 1); break;
        case 's-bw': { const v = fromDisp(el.value); if (v && v > 0) { db.settings.bodyWeightKg = v; save(); } break; }
        case 's-rest': db.settings.rest = Math.max(0, +el.value || 0); save(); break;
    }
});
document.addEventListener('change', e => {
    const el = e.target, b = el.dataset.bind;
    if (b === 'bodyPart' || b === 'equipment') { ui[b] = el.value; ui.limit = 60; render(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });

// ---------- Boot ----------
if (!EXERCISES.length) {
    $('#view').innerHTML = `<div class="card empty"><i class="fas fa-triangle-exclamation"></i>Exercise data is missing. Run <code>gym/tools/import_opengym.py</code>.</div>`;
} else {
    if (location.hash === '#library') ui.tab = 'library';
    render();
}
})();
