/* FitTrack Pro food logging: a real diary, USDA food search and nutrition-label scanning.
   Loaded after the inline script in index.html and builds on its globals (currentMeal, modals). */
(() => {
'use strict';

const GOALS = { calories: 2200, protein: 140, carbs: 275, fat: 73 };
const MEALS = [
    ['breakfast', 'Breakfast', 'fa-coffee'],
    ['lunch', 'Lunch', 'fa-utensils'],
    ['dinner', 'Dinner', 'fa-moon'],
    ['snack', 'Snacks', 'fa-cookie-bite'],
];
// Values per the serving shown (USDA FoodData Central, rounded).
const COMMON_FOODS = [
    { name: 'Grilled Chicken Breast', serving: '4 oz (113 g)', calories: 187, protein: 35, carbs: 0, fat: 4 },
    { name: 'Brown Rice, cooked', serving: '1 cup (195 g)', calories: 218, protein: 4.5, carbs: 46, fat: 1.6 },
    { name: 'Broccoli, cooked', serving: '1 cup (156 g)', calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
    { name: 'Salmon, cooked', serving: '6 oz (170 g)', calories: 350, protein: 38, carbs: 0, fat: 21 },
    { name: 'Greek Yogurt, non-fat', serving: '1 cup (245 g)', calories: 145, protein: 25, carbs: 9, fat: 1 },
    { name: 'Banana', serving: '1 medium (118 g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { name: 'Almonds', serving: '1 oz (28 g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { name: 'Avocado', serving: '1 medium (150 g)', calories: 240, protein: 3, carbs: 13, fat: 22 },
    { name: 'Egg, whole', serving: '1 large (50 g)', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
    { name: 'Oatmeal, cooked', serving: '1 cup (234 g)', calories: 166, protein: 5.9, carbs: 28, fat: 3.6 },
];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = n => Math.round((+n || 0) * 10) / 10;
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : 0; };

// ---------- Diary storage ----------
const logKey = () => `fittrack_log_${new Date().toDateString()}`;
function readLog() { try { return JSON.parse(localStorage.getItem(logKey()) || '[]'); } catch (e) { return []; } }
function writeLog(list) { try { localStorage.setItem(logKey(), JSON.stringify(list)); return true; } catch (e) { return false; } }
function exerciseCalories() {
    try {
        return JSON.parse(localStorage.getItem(`fittrack_exercise_${new Date().toDateString()}`) || '[]')
            .reduce((s, e) => s + (e.calories || 0), 0);
    } catch (e) { return 0; }
}

function toast(msg) {
    const t = $('ftToast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- Diary rendering ----------
function renderDiary() {
    const log = readLog();
    const tot = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    log.forEach(e => { for (const k in tot) tot[k] += +e[k] || 0; });
    const burned = exerciseCalories();
    const budget = GOALS.calories + burned;
    const remaining = Math.round(budget - tot.calories);

    $('calRemaining').textContent = Math.abs(remaining).toLocaleString();
    $('calLabel').textContent = remaining < 0 ? 'Calories Over' : 'Calories Remaining';
    $('calGoalSub').textContent = `of ${GOALS.calories.toLocaleString()} goal${burned ? ` + ${burned.toLocaleString()} exercise` : ''}`;
    const C = 326.73, ring = $('calRing');
    ring.setAttribute('stroke-dashoffset', (C * (1 - Math.min(1, tot.calories / budget))).toFixed(2));
    ring.style.stroke = remaining < 0 ? 'var(--danger)' : '';
    $('foodCalories').textContent = Math.round(tot.calories).toLocaleString();
    $('exerciseCalories').textContent = burned.toLocaleString();
    $('macroProtein').textContent = Math.round(tot.protein) + 'g';
    $('macroCarbs').textContent = Math.round(tot.carbs) + 'g';
    $('macroFat').textContent = Math.round(tot.fat) + 'g';

    $('meals').innerHTML = MEALS.map(([id, label, icon]) => {
        const items = log.map((e, i) => ({ e, i })).filter(x => (x.e.meal || 'snack') === id);
        const cals = items.reduce((s, x) => s + (+x.e.calories || 0), 0);
        return `
        <div class="meal-section">
            <div class="meal-header" onclick="toggleMeal(this)">
                <h3><i class="fas ${icon}"></i> ${label}</h3>
                <span class="calories">${Math.round(cals)} cal</span>
            </div>
            <div class="meal-items">
                ${items.map(({ e, i }) => `
                <div class="meal-item">
                    <div class="meal-item-main">
                        <div class="name">${esc(e.name)}</div>
                        <div class="details">${esc(e.serving || '')}${e.serving ? ' · ' : ''}P ${r1(e.protein)}g · C ${r1(e.carbs)}g · F ${r1(e.fat)}g</div>
                    </div>
                    <span class="cals">${Math.round(e.calories)} cal</span>
                    <button class="meal-del" onclick="removeFood(${i})" aria-label="Remove ${esc(e.name)}">&times;</button>
                </div>`).join('')}
                <button class="add-btn" onclick="openModal('${id}')"><i class="fas fa-plus"></i> Add Food</button>
            </div>
        </div>`;
    }).join('');
}
function removeFood(i) {
    const log = readLog();
    const [gone] = log.splice(i, 1);
    writeLog(log); renderDiary();
    if (gone) toast(`Removed ${gone.name}`);
}

// ---------- Food search (common foods + USDA FoodData Central) ----------
const USDA_KEY_STORE = 'fittrack_usda_key';
const usdaKey = () => { try { return localStorage.getItem(USDA_KEY_STORE) || 'DEMO_KEY'; } catch (e) { return 'DEMO_KEY'; } };
let searchSeq = 0, searchTimer;

function nutrient(food, ...ids) {
    for (const id of ids) {
        const n = (food.foodNutrients || []).find(x => x.nutrientId === id);
        if (n && n.value != null) return n.value;
    }
    return null;
}
// USDA search results list nutrients per 100 g.
function fromUsda(food) {
    const protein = nutrient(food, 1003) || 0, fat = nutrient(food, 1004) || 0, carbs = nutrient(food, 1005, 1050) || 0;
    let kcal = nutrient(food, 1008, 2047, 2048);
    if (kcal == null) { const kj = nutrient(food, 1062); kcal = kj != null ? kj / 4.184 : 4 * protein + 4 * carbs + 9 * fat; }
    const measures = (food.foodMeasures || [])
        .filter(m => m.gramWeight > 0 && m.disseminationText && !/quantity not specified/i.test(m.disseminationText))
        .slice(0, 4).map(m => ({ label: m.disseminationText, grams: Math.round(m.gramWeight) }));
    const name = String(food.description || 'Food');
    return {
        name: name === name.toUpperCase() ? name.charAt(0) + name.slice(1).toLowerCase() : name,
        source: 'usda', per: '100g', calories: Math.round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat),
        grams: measures[0]?.grams || 100, measures,
    };
}
async function usdaSearch(q) {
    const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(usdaKey()) +
        '&query=' + encodeURIComponent(q) + '&pageSize=12&dataType=' + encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS)');
    const res = await fetch(url);
    if (res.status === 429) throw new Error('limit');
    if (res.status === 403) throw new Error('key');
    if (!res.ok) throw new Error('http');
    return ((await res.json()).foods || []).map(fromUsda);
}

let listed = []; // candidates currently shown, by index
function foodRow(c, sub) {
    const i = listed.push(c) - 1;
    return `<div class="food-item" onclick="pickFood(${i})">
        <div class="info"><h4>${esc(c.name)}</h4><p>${esc(sub)}</p></div>
        <span class="cals">${Math.round(c.calories)} cal</span></div>`;
}
function renderFoodList(q, usda) {
    listed = [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const common = COMMON_FOODS.filter(f => words.every(w => f.name.toLowerCase().includes(w)))
        .map(f => ({ ...f, per: 'serving', source: 'common' }));
    let html = common.map(c => foodRow(c, `${c.serving} · P ${c.protein}g · C ${c.carbs}g · F ${c.fat}g`)).join('');
    if (usda && usda.items) {
        html += `<div class="food-group">USDA FoodData Central</div>` +
            (usda.items.length ? usda.items.map(c => foodRow(c, `per 100 g · P ${c.protein}g · C ${c.carbs}g · F ${c.fat}g`)).join('')
                : `<p class="food-note">No USDA matches for “${esc(q)}”.</p>`);
    } else if (usda && usda.status) {
        html += `<p class="food-note">${usda.status}</p>`;
    }
    if (!html) html = `<p class="food-note">No matches. Try another word, or scan a label.</p>`;
    $('foodList').innerHTML = html;
}
function onSearch() {
    const q = $('foodSearch').value.trim();
    const seq = ++searchSeq;
    clearTimeout(searchTimer);
    if (q.length < 3) { renderFoodList(q, q ? { status: 'Type at least 3 letters to search the USDA database.' } : null); return; }
    renderFoodList(q, { status: 'Searching USDA…' });
    searchTimer = setTimeout(async () => {
        try {
            const items = await usdaSearch(q);
            if (seq === searchSeq) renderFoodList(q, { items });
        } catch (e) {
            if (seq !== searchSeq) return;
            const msg = e.message === 'limit' ? 'The shared USDA demo key has hit its hourly limit. Add your own free key below to keep searching.'
                : e.message === 'key' ? 'USDA rejected the API key. Check it below.'
                : 'Could not reach the USDA database. Check your connection.';
            renderFoodList(q, { status: msg });
            if (e.message !== 'http') $('usdaKeyRow').hidden = false;
        }
    }, 450);
}
function pickFood(i) { const c = listed[i]; if (c) { closeModal(); openConfirm(c); } }
function saveUsdaKey() {
    const v = $('usdaKeyInput').value.trim();
    try { v ? localStorage.setItem(USDA_KEY_STORE, v) : localStorage.removeItem(USDA_KEY_STORE); } catch (e) { /* ignore */ }
    $('usdaKeyRow').hidden = true;
    toast(v ? 'USDA key saved' : 'Using the shared demo key');
    onSearch();
}

// ---------- Confirm sheet: check values, choose portion, add ----------
let pending = null;
function openConfirm(c, note) {
    pending = { measures: [], ...c };
    $('cfName').value = c.name || '';
    $('cfCalories').value = c.calories ?? '';
    $('cfProtein').value = c.protein ?? '';
    $('cfCarbs').value = c.carbs ?? '';
    $('cfFat').value = c.fat ?? '';
    $('cfPer').value = c.per === '100g' ? '100g' : 'serving';
    $('cfAmount').value = c.per === '100g' ? (c.grams || 100) : 1;
    $('cfMeal').value = (typeof currentMeal === 'string' && currentMeal) || mealForNow();
    const n = $('cfNote'); n.textContent = note || ''; n.hidden = !note;
    $('cfMeasures').innerHTML = pending.measures.map(m => `<button type="button" class="cf-chip" onclick="setGrams(${m.grams})">${esc(m.label)} (${m.grams} g)</button>`).join('');
    updateConfirm();
    $('confirmModal').classList.add('active');
}
function mealForNow() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; }
function setGrams(g) { $('cfPer').value = '100g'; $('cfAmount').value = g; updateConfirm(); }
function confirmTotals() {
    const per100 = $('cfPer').value === '100g', amount = num($('cfAmount').value);
    const k = per100 ? amount / 100 : amount;
    return {
        per100, amount, k,
        calories: Math.round(num($('cfCalories').value) * k), protein: r1(num($('cfProtein').value) * k),
        carbs: r1(num($('cfCarbs').value) * k), fat: r1(num($('cfFat').value) * k),
    };
}
function updateConfirm() {
    const t = confirmTotals();
    $('cfBasisLabel').textContent = t.per100 ? 'Nutrition per 100 g' : 'Nutrition per serving';
    $('cfAmountLabel').textContent = t.per100 ? 'Amount eaten (g)' : 'Servings eaten';
    $('cfMeasures').hidden = !t.per100 || !pending || !pending.measures.length;
    $('cfTotal').innerHTML = `<strong>${t.calories} cal</strong> · P ${t.protein}g · C ${t.carbs}g · F ${t.fat}g`;
    // Atwater check: calories should be close to 4P + 4C + 9F.
    const c = num($('cfCalories').value), est = 4 * num($('cfProtein').value) + 4 * num($('cfCarbs').value) + 9 * num($('cfFat').value);
    const off = c > 0 && est > 0 && Math.abs(c - est) / Math.max(c, est) > 0.3;
    const w = $('cfWarn'); w.hidden = !off;
    if (off) w.textContent = `These don't add up: the macros come to about ${Math.round(est)} cal. Check the numbers.`;
}
function closeConfirm() { $('confirmModal').classList.remove('active'); pending = null; }
function confirmAdd() {
    const name = $('cfName').value.trim();
    if (!name) { toast('Give the food a name'); $('cfName').focus(); return; }
    const t = confirmTotals();
    if (!t.amount) { toast('Enter how much you ate'); $('cfAmount').focus(); return; }
    const p = pending || {};
    const serving = t.per100 ? `${r1(t.amount)} g` : (t.amount === 1 ? (p.serving || '1 serving') : `${r1(t.amount)} × ${p.serving || 'serving'}`);
    const log = readLog();
    log.push({
        name, calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, serving,
        meal: $('cfMeal').value, source: p.source || 'manual', barcode: p.barcode, timestamp: new Date().toISOString(),
    });
    if (!writeLog(log)) { toast('Could not save: storage is unavailable'); return; }
    closeConfirm(); renderDiary();
    toast(`Added ${name} (${t.calories} cal)`);
}

// ---------- Barcode: send the scanned product through the confirm sheet ----------
function addScannedFood() {
    const d = typeof scannedProductData !== 'undefined' ? scannedProductData : null;
    if (!d) return;
    const g = /(\d+(?:[.,]\d+)?)\s*g\b/i.exec(d.serving || '');
    const c = {
        name: d.name + (d.brand ? ` (${d.brand})` : ''), source: 'barcode', barcode: d.barcode, per: '100g',
        calories: Math.round(d.calories), protein: r1(d.protein), carbs: r1(d.carbs), fat: r1(d.fat),
        grams: g ? num(g[1]) : 100,
        measures: g ? [{ label: '1 serving', grams: Math.round(num(g[1])) }] : [],
    };
    closeBarcodeModal();
    openConfirm(c, 'From Open Food Facts. Values are per 100 g; set how much you ate.');
}

// ---------- Nutrition label scanning (Tesseract.js OCR, on-device) ----------
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let tesseractLoading;
function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return tesseractLoading || (tesseractLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = TESSERACT_URL; s.onload = resolve;
        s.onerror = () => { tesseractLoading = null; reject(new Error('load')); };
        document.head.appendChild(s);
    }));
}

/* Turn OCR text from a nutrition label into numbers.
   Handles US "Nutrition Facts" panels and EU/UK tables (takes the first column).
   OCR is unreliable on labels: it drops lines, and often reads a trailing "g" as "9"
   ("8g" -> "89"). So every plausible reading of each value is kept as a candidate, from
   every line that matches (the text may hold more than one OCR pass), and the combination
   whose calories best match 4P + 4C + 9F wins. */
function parseNutritionLabel(text) {
    const lines = String(text || '').split(/\n/)
        .map(l => l.toLowerCase().replace(/\bo(?=\s?m?g\b)/g, '0').replace(/[|*_]/g, ' ').replace(/^[^a-z0-9<]+/, '').trim())
        .filter(Boolean);
    const all = lines.join('\n');

    // Candidate gram values for a nutrient: [{ v, raw }] where raw marks an unstripped trailing 9.
    const grams = keyRe => {
        const out = [], add = (v, raw) => { if (isFinite(v) && v <= 100 * (raw ? 1 : 10) && !out.some(o => o.v === v)) out.push({ v, raw }); };
        for (let i = 0; i < lines.length && out.length < 4; i++) {
            const m = keyRe.exec(lines[i]); if (!m) continue;
            const rest = lines[i].slice(m.index + m[0].length);
            const t = /(\d+(?:[.,]\d+)?)\s*(mg|g\b)?/.exec(rest) || (/^\D*$/.test(rest) && /^<?\s*(\d+(?:[.,]\d+)?)\s*(mg|g\b)?/.exec(lines[i + 1] || ''));
            if (!t) continue;
            const raw = t[1].replace(',', '.'), v = parseFloat(raw);
            if (t[2] === 'mg') add(v / 1000, false);
            else if (t[2]) add(v, false);
            else if (/9$/.test(raw) && raw.length > 1 && !/\.$/.test(raw.slice(0, -1))) { add(parseFloat(raw.slice(0, -1)), false); add(v, true); }
            else add(v, false);
        }
        return out.length ? out : [{ v: null, raw: false }];
    };
    const fats = grams(/^(?:total\s+)?fat\b[\s,:]*(?:total)?/);
    const carbs = grams(/^(?:total\s+)?(?:carbohydrates?|carbs?)\b[\s,:]*(?:total)?/);
    const prots = grams(/^proteins?\b/);

    // Calorie candidates, most trustworthy first. kJ figures are converted.
    const cals = [];
    const push = v => { if (isFinite(v) && v > 0 && v < 5000 && !cals.includes(v)) cals.push(v); };
    let m;
    const reAll = (re, f) => { re.lastIndex = 0; while ((m = re.exec(all))) f(m); };
    reAll(/^calories?(?!\s+from)\D{0,12}(\d{1,4})\b/gm, x => push(+x[1]));
    reAll(/(\d+(?:[.,]\d+)?)\s*kcal\b/g, x => push(parseFloat(x[1].replace(',', '.'))));
    reAll(/^energy\D{0,12}(\d{2,4})\b(?!\s*k)/gm, x => push(+x[1]));
    reAll(/(\d+(?:[.,]\d+)?)\s*k[j)\]]/g, x => push(Math.round(parseFloat(x[1].replace(',', '.')) / 4.184)));

    let best = null;
    for (const cal of cals.length ? cals : [null]) for (const f of fats) for (const c of carbs) for (const p of prots) {
        const est = 9 * (f.v || 0) + 4 * (c.v || 0) + 4 * (p.v || 0);
        const err = cal && est ? Math.abs(est - cal) / Math.max(cal, est) : 0;
        const score = err + (f.raw + c.raw + p.raw) * 0.1 + cals.indexOf(cal) * 0.02 +
            (fats.indexOf(f) + carbs.indexOf(c) + prots.indexOf(p)) * 0.01;
        if (!best || score < best.score) best = { cal, f: f.v, c: c.v, p: p.v, score, err };
    }

    // EU-style tables (kcal/kJ, no "serving size") list per 100 g first, by regulation.
    const per100 = /per\s*100\s*(g|ml)/.test(all) || (/kcal|\dk[j)\]]|^energy/m.test(all) && !/serving size|amount per serving|nutrition facts/.test(all));
    let serving = '';
    if (!per100 && (m = /serving\s*size[:\s]*([^\n]+)/.exec(all))) serving = m[1].replace(/\((\d+)9\)/, '($1g)').trim();
    const found = [best.cal, best.f, best.c, best.p].filter(v => v != null).length;
    return {
        calories: best.cal, fat: best.f, carbs: best.c, protein: best.p,
        per: per100 ? '100g' : 'serving', serving, found,
        consistent: found === 4 && best.err <= 0.25,
    };
}

/* Greyscale the image and erase long straight lines (table borders, the thick bars on
   US labels). Grid lines make the OCR engine treat a table as a drawing and skip its rows. */
function eraseRules(img, erasing = true) {
    const { data: d, width: w, height: h } = img, n = w * h;
    const g = new Uint8Array(n), hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) { const y = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8; g[i] = y; hist[y]++; }
    // Otsu threshold separates ink from paper.
    let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
        wB += hist[t]; if (!wB) continue;
        const wF = n - wB; if (!wF) break;
        sumB += t * hist[t];
        const diff = sumB / wB - (sum - sumB) / wF, v = wB * wF * diff * diff;
        if (v > best) { best = v; thr = t; }
    }
    const erase = new Uint8Array(n);
    if (erasing) {
    const minH = Math.max(40, Math.round(w * 0.12)), minV = Math.max(40, Math.round(h * 0.06));
    for (let y = 0; y < h; y++) for (let x = 0, run = 0; x <= w; x++) {
        if (x < w && g[y * w + x] <= thr) run++;
        else { if (run >= minH) for (let k = x - run; k < x; k++) erase[y * w + k] = 1; run = 0; }
    }
    for (let x = 0; x < w; x++) for (let y = 0, run = 0; y <= h; y++) {
        if (y < h && g[y * w + x] <= thr) run++;
        else { if (run >= minV) for (let k = y - run; k < y; k++) erase[k * w + x] = 1; run = 0; }
    }
    }
    for (let i = 0; i < n; i++) { const y = erase[i] ? 255 : g[i]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = y; d[i * 4 + 3] = 255; }
}

// Shrink or enlarge the photo to a size OCR handles well.
async function prepareImage(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
        src = await new Promise((resolve, reject) => {
            const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file);
        });
    }
    const w0 = src.width, h0 = src.height, long = Math.max(w0, h0);
    // Phone photos are shrunk; small images are doubled. In-between sizes are left alone,
    // because resampling by odd factors blurs small print.
    const scale = long > 2000 ? 2000 / long : long < 900 ? 2 : 1;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w0 * scale); cv.height = Math.round(h0 * scale);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    // Two versions: greyscale as-is, and with table lines erased.
    const plain = ctx.getImageData(0, 0, cv.width, cv.height);
    eraseRules(plain, false);
    ctx.putImageData(plain, 0, 0);
    const clean = document.createElement('canvas'); clean.width = cv.width; clean.height = cv.height;
    const lined = ctx.getImageData(0, 0, cv.width, cv.height);
    eraseRules(lined, true);
    clean.getContext('2d').putImageData(lined, 0, 0);
    return { plain: cv, clean };
}

function scanLabel() { const i = $('labelInput'); i.value = ''; i.click(); }
function setScan(msg, pct) {
    $('labelStatus').textContent = msg;
    $('labelBar').style.width = Math.round((pct || 0) * 100) + '%';
}
let scanning = false;
async function onLabelChosen(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || scanning) return;
    scanning = true;
    if (typeof closeModal === 'function') closeModal();
    $('labelModal').classList.add('active');
    const prev = $('labelPreview');
    let worker;
    try {
        setScan('Preparing photo…', 0.05);
        const { plain, clean } = await prepareImage(file);
        prev.src = plain.toDataURL('image/jpeg', 0.7); prev.hidden = false;
        setScan('Loading the text reader (first time only)…', 0.1);
        await loadTesseract();
        let pass = 0;
        worker = await Tesseract.createWorker('eng', 1, {
            logger: m => { if (m.status === 'recognizing text') setScan('Reading the label…', 0.25 + 0.35 * (pass + m.progress)); },
        });
        // Pass 1: lines erased, read as one block. This suits label tables best.
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        let text = (await worker.recognize(clean)).data.text;
        let result = parseNutritionLabel(text);
        if (!result.consistent) {
            // Pass 2: the untouched photo in column mode, then weigh both readings together.
            pass = 1;
            await worker.setParameters({ tessedit_pageseg_mode: '4' });
            text += '\n' + (await worker.recognize(plain)).data.text;
            result = parseNutritionLabel(text);
        }
        $('labelModal').classList.remove('active');
        if (!result.found) {
            toast('Could not read nutrition values. Try a closer, sharper photo.');
            return;
        }
        openConfirm({
            name: '', source: 'label', per: result.per, serving: result.serving || '1 serving',
            calories: result.calories ?? '', protein: result.protein ?? '', carbs: result.carbs ?? '', fat: result.fat ?? '',
            grams: 100,
        }, result.found < 4
            ? 'Some values could not be read from the label. Fill in the blanks and check the rest.'
            : 'Read from the label. Check the numbers against the pack before adding.');
        $('cfName').focus();
    } catch (err) {
        $('labelModal').classList.remove('active');
        toast(err && err.message === 'load' ? 'Could not load the text reader. Check your connection.' : 'Could not read that photo. Try again.');
    } finally {
        scanning = false;
        if (worker) worker.terminate().catch(() => {});
    }
}

// ---------- Wire up ----------
Object.assign(window, {
    renderDiary, removeFood, pickFood, saveUsdaKey, openConfirm, closeConfirm, confirmAdd, updateConfirm, setGrams,
    addScannedFood, scanLabel, parseNutritionLabel, loadTodayLog: renderDiary, loadExerciseCalories: renderDiary,
    addFood: () => {},
});
$('foodSearch').addEventListener('input', onSearch);
$('labelInput').addEventListener('change', onLabelChosen);
$('confirmModal').addEventListener('input', updateConfirm);
$('confirmModal').addEventListener('click', e => { if (e.target === $('confirmModal')) closeConfirm(); });
// Fresh list each time the add-food sheet opens.
const baseOpen = window.openModal;
window.openModal = meal => { baseOpen(meal); $('foodSearch').value = ''; $('usdaKeyRow').hidden = true; renderFoodList('', null); };
window.addEventListener('pageshow', renderDiary);
renderFoodList('', null);
renderDiary();
})();
