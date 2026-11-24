// Czas pracy – prototyp 6.0. Warstwa danych: model, zapis, obliczenia, operacje.
// Format danych jest zgodny z 5.2 (te same pola). Nowe pole dnia: dayOff (dzień wolny).
// Wersja 5.2 ignoruje dayOff, więc kopia z prototypu da się wczytać do 5.2 bez błędów.

export const MAIN_KEY = "worktime_pwa_v1";          // dane głównej apki – prototyp tylko je CZYTA
export const PROTO_KEY = "czas_pracy_proto_v1";     // dane prototypu
export const META_KEY = "czas_pracy_proto_meta";    // paski, data kopii (poza danymi godzin)
export const RATE_START = "2000-01-01";
export const STATUSES = ["paid", "unpaid", "sick", "off"];
export const DEFAULT_TEMPLATES = [
  { start: "06:00", end: "14:00" },
  { start: "14:00", end: "22:00" },
  { start: "22:00", end: "06:00" }
];

// ---------- Narzędzia ----------
export const pad2 = n => String(n).padStart(2, "0");
export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const isoFromDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayISO = () => isoFromDate(new Date());
export const ym = iso => iso.slice(0, 7);
export const isValidDateISO = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !!parseISO(v);
export function parseISO(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return null;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
export const addDaysISO = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoFromDate(d); };
export const addMonthsYM = (month, n) => { const [y, m] = month.split("-").map(Number); return ym(isoFromDate(new Date(y, m - 1 + n, 1))); };
export const daysInMonth = month => { const [y, m] = month.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const monthDays = month => Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad2(i + 1)}`);
export const weekdayIndex = iso => (parseISO(iso).getDay() + 6) % 7; // 0 = pn … 6 = nd
export function normalizeTime(v) {
  const m = String(v ?? "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return "";
  const h = +m[1], min = +m[2];
  return h <= 23 && min <= 59 ? `${pad2(h)}:${pad2(min)}` : "";
}
export const fmtHM = min => `${Math.floor(min / 60)}:${pad2(min % 60)}`;
export const pln = v => (Number(v) || 0).toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
export function pluralPL(n, one, few, many) {
  const v = Math.abs(Number(n) || 0);
  if (v === 1) return one;
  return v % 10 >= 2 && v % 10 <= 4 && !(v % 100 >= 12 && v % 100 <= 14) ? few : many;
}
export const escapeHtml = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
const clone = v => JSON.parse(JSON.stringify(v));

// ---------- Model ----------
export function createEmptyDB() {
  return {
    settings: {
      rate: 0, rateHistory: [{ from: RATE_START, rate: 0 }], leaveQuota: 26,
      defaultIncludeSat: false, defaultIncludeSun: false, defaultIncludeHolidays: false,
      backupReminderDays: 7, shiftTemplates: clone(DEFAULT_TEMPLATES)
    },
    entries: []
  };
}

// Porządkuje dane w pamięci. Nie usuwa nieznanych pól ustawień i dni (zgodność w obie strony).
export function normalize(input) {
  const model = input && typeof input === "object" && !Array.isArray(input) ? input : createEmptyDB();
  const s = model.settings = model.settings && typeof model.settings === "object" ? model.settings : {};
  s.rate = Number.isFinite(Number(s.rate)) ? Number(s.rate) : 0;
  s.leaveQuota = Number.isFinite(Number(s.leaveQuota)) ? Number(s.leaveQuota) : 26;
  for (const k of ["defaultIncludeSat", "defaultIncludeSun", "defaultIncludeHolidays"]) s[k] = !!s[k];
  s.backupReminderDays = Math.max(1, Number(s.backupReminderDays) || 7);
  const hist = (Array.isArray(s.rateHistory) ? s.rateHistory : [])
    .filter(r => r && isValidDateISO(r.from) && Number.isFinite(Number(r.rate)) && Number(r.rate) >= 0)
    .map(r => ({ from: r.from, rate: round2(Number(r.rate)) }))
    .sort((a, b) => a.from.localeCompare(b.from))
    .filter((r, i, l) => i === l.length - 1 || l[i + 1].from !== r.from);
  if (!hist.length) hist.push({ from: RATE_START, rate: s.rate });
  hist[0] = { ...hist[0], from: RATE_START };
  s.rateHistory = hist;
  s.rate = hist[hist.length - 1].rate;
  if (!Array.isArray(s.shiftTemplates)) s.shiftTemplates = clone(DEFAULT_TEMPLATES);
  s.shiftTemplates = s.shiftTemplates
    .map(t => ({ start: normalizeTime(t?.start), end: normalizeTime(t?.end) }))
    .filter(t => t.start && t.end && t.start !== t.end).slice(0, 8);
  if (s.lastShift) {
    const ls = { start: normalizeTime(s.lastShift.start), end: normalizeTime(s.lastShift.end) };
    s.lastShift = ls.start && ls.end ? ls : undefined;
  }

  const seen = new Set();
  model.entries = (Array.isArray(model.entries) ? model.entries : []).flatMap(day => {
    if (!day || typeof day !== "object" || !isValidDateISO(day.date) || seen.has(day.date)) return [];
    seen.add(day.date);
    // Bardzo stary format: start/end bezpośrednio w dniu.
    if (!Array.isArray(day.shifts)) day.shifts = day.start && day.end ? [{ start: day.start, end: day.end }] : [];
    day.shifts = day.shifts
      .map(x => ({ start: normalizeTime(x?.start), end: normalizeTime(x?.end) }))
      .filter(x => x.start && x.end && x.start !== x.end)
      .sort((a, b) => a.start.localeCompare(b.start));
    day.note = typeof day.note === "string" ? day.note : "";
    day.vacation = !!day.vacation;
    day.leaveType = ["paid", "unpaid", "sick"].includes(day.leaveType) ? day.leaveType : "";
    if (day.vacation && !day.leaveType) day.leaveType = "paid";
    day.dayOff = !!day.dayOff && !day.leaveType;
    return [day];
  }).sort((a, b) => a.date.localeCompare(b.date));
  return model;
}

// ---------- Zapis ----------
export function readRaw(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function loadDB(key) {
  const raw = readRaw(key);
  if (!raw) return { db: null, error: "" };
  try { return { db: normalize(JSON.parse(raw)), error: "" }; }
  catch (e) { return { db: null, error: "Nie udało się odczytać danych: " + (e.message || e) }; }
}
export function saveDB(key, db) {
  try { localStorage.setItem(key, JSON.stringify(db)); return true; }
  catch (e) { console.error("Zapis nieudany", e); return false; }
}
export function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {}; } catch { return {}; }
}
export function saveMeta(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}

// ---------- Kalendarz ----------
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const v = h + l - 7 * m + 114;
  return new Date(y, Math.floor(v / 31) - 1, v % 31 + 1);
}
const holidayCache = new Map();
export function holidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const map = new Map([
    ["01-01", "Nowy Rok"], ["01-06", "Trzech Króli"], ["05-01", "Święto Pracy"], ["05-03", "Święto Konstytucji 3 Maja"],
    ["08-15", "Wniebowzięcie NMP"], ["11-01", "Wszystkich Świętych"], ["11-11", "Święto Niepodległości"],
    ["12-24", "Wigilia"], ["12-25", "Boże Narodzenie"], ["12-26", "Boże Narodzenie (2. dzień)"]
  ].map(([d, n]) => [`${year}-${d}`, n]));
  const e = easterSunday(year);
  for (const [delta, n] of [[0, "Wielkanoc"], [1, "Poniedziałek Wielkanocny"], [49, "Zielone Świątki"], [60, "Boże Ciało"]]) {
    const d = new Date(e); d.setDate(d.getDate() + delta); map.set(isoFromDate(d), n);
  }
  holidayCache.set(year, map);
  return map;
}
export const holidayName = iso => holidays(+iso.slice(0, 4)).get(iso) || "";

// Dzień roboczy według ustawień „Soboty / Niedziele / Święta to dni robocze”.
export function isWorkday(iso, settings) {
  const wd = weekdayIndex(iso);
  if (holidayName(iso) && !settings.defaultIncludeHolidays) return false;
  if (wd === 5) return settings.defaultIncludeSat;
  if (wd === 6) return settings.defaultIncludeSun;
  return true;
}

// ---------- Obliczenia ----------
export function shiftRange(date, start, end) {
  start = normalizeTime(start); end = normalizeTime(end);
  if (!isValidDateISO(date) || !start || !end || start === end) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [sh, sm] = start.split(":").map(Number), [eh, em] = end.split(":").map(Number);
  const s = new Date(y, m - 1, d, sh, sm).getTime();
  let e = new Date(y, m - 1, d, eh, em).getTime();
  if (e <= s) e = new Date(y, m - 1, d + 1, eh, em).getTime(); // nocka – należy do dnia rozpoczęcia
  return { s, e };
}
export const shiftMinutes = (date, sh) => { const r = shiftRange(date, sh.start, sh.end); return r ? Math.round((r.e - r.s) / 60000) : 0; };
export const dayMinutes = day => (day?.shifts || []).reduce((t, sh) => t + shiftMinutes(day.date, sh), 0);
export const getDay = (db, date) => db.entries.find(d => d.date === date) || null;
export const emptyDay = date => ({ date, note: "", shifts: [], vacation: false, leaveType: "", dayOff: false });
export const dayStatus = day => day?.leaveType || (day?.dayOff ? "off" : "");
export const isFilled = day => !!day && (day.shifts.length > 0 || !!day.leaveType || day.dayOff || !!day.note.trim());

// Zwraca komunikat błędu albo "" gdy zakres się nie nakłada (sprawdza też nocki z sąsiednich dni).
export function overlapError(db, date, start, end, skip = null) {
  const cand = shiftRange(date, start, end);
  if (!cand) return normalizeTime(start) && normalizeTime(start) === normalizeTime(end)
    ? "Godzina wejścia i wyjścia nie mogą być takie same." : "Uzupełnij poprawnie godzinę wejścia i wyjścia.";
  for (const d of [addDaysISO(date, -1), date, addDaysISO(date, 1)]) {
    const day = getDay(db, d);
    if (!day) continue;
    for (const [i, sh] of day.shifts.entries()) {
      if (skip && skip.date === d && skip.index === i) continue;
      const r = shiftRange(d, sh.start, sh.end);
      if (r && Math.max(r.s, cand.s) < Math.min(r.e, cand.e))
        return `Ten zakres nachodzi na ${d === date ? "" : fmtShortDate(d) + " "}${sh.start}–${sh.end}.`;
    }
  }
  return "";
}

export function rateFor(settings, date) {
  const h = settings.rateHistory;
  if (!Array.isArray(h) || !h.length) return Number(settings.rate) || 0;
  let r = h[0].rate;
  for (const x of h) { if (x.from <= date) r = x.rate; else break; }
  return Number(r) || 0;
}
export const dayPay = (settings, day) => round2(dayMinutes(day) / 60 * rateFor(settings, day.date));

export function monthTotals(db, month, today = todayISO()) {
  const t = { min: 0, money: 0, workDays: 0, paid: 0, unpaid: 0, sick: 0, off: 0, notes: 0, missing: 0, missingDates: [] };
  let raw = 0;
  for (const iso of monthDays(month)) {
    const day = getDay(db, iso);
    if (day) {
      const m = dayMinutes(day);
      t.min += m; raw += m / 60 * rateFor(db.settings, iso);
      if (m > 0) t.workDays++;
      if (day.leaveType) t[day.leaveType]++;
      if (day.dayOff) t.off++;
      if (day.note.trim()) t.notes++;
    }
    if (iso < today && isWorkday(iso, db.settings) && !isFilled(day)) { t.missing++; t.missingDates.push(iso); }
  }
  t.money = round2(raw);
  return t;
}
export function yearTotals(db, year) {
  const t = { min: 0, money: 0, workDays: 0, paid: 0, unpaid: 0, sick: 0, off: 0 };
  for (let m = 1; m <= 12; m++) {
    const mt = monthTotals(db, `${year}-${pad2(m)}`);
    for (const k of Object.keys(t)) t[k] += mt[k];
  }
  t.money = round2(t.money);
  return t;
}

// Stan miesiąca dla paska: "complete" gdy minął ostatni dzień roboczy i wszystkie są uzupełnione,
// "incomplete" gdy miesiąc się skończył, a są braki. W pozostałych przypadkach "".
export function monthCompletion(db, month, today = todayISO()) {
  const workdays = monthDays(month).filter(iso => isWorkday(iso, db.settings));
  if (!workdays.length) return { state: "", missing: [] };
  const last = workdays[workdays.length - 1];
  const missing = workdays.filter(iso => !isFilled(getDay(db, iso)) && iso <= today);
  const ended = today > `${month}-${pad2(daysInMonth(month))}`;
  if (today >= last && !missing.length) return { state: "complete", missing };
  if (ended && missing.length) return { state: "incomplete", missing };
  return { state: "", missing };
}

// ---------- Formatowanie dat ----------
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
export const WD_SHORT = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sb", "Nd"];
const WD_LONG = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const cap = s => s[0].toUpperCase() + s.slice(1);
export const monthName = month => cap(MONTHS[+month.slice(5, 7) - 1]);
export const monthTitle = month => `${monthName(month)} ${month.slice(0, 4)}`;
export const fmtShortDate = iso => `${+iso.slice(8)}.${iso.slice(5, 7)}`;
export const fmtLongDate = iso => `${WD_LONG[weekdayIndex(iso)]}, ${+iso.slice(8)} ${MONTHS_GEN[+iso.slice(5, 7) - 1]}`;
export const fmtDayMonth = iso => `${+iso.slice(8)} ${MONTHS_GEN[+iso.slice(5, 7) - 1]}`;
export const fmtFullDate = iso => `${+iso.slice(8)} ${MONTHS_GEN[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const STATUS_LABEL = { paid: "Urlop płatny", unpaid: "Urlop bezpłatny", sick: "Zwolnienie L4", off: "Dzień wolny" };

// ---------- Operacje na dniu (zmieniają db; zapis robi aplikacja) ----------
function ensureDay(db, date) {
  let day = getDay(db, date);
  if (!day) { day = emptyDay(date); db.entries.push(day); db.entries.sort((a, b) => a.date.localeCompare(b.date)); }
  return day;
}
function dropIfEmpty(db, date) {
  const day = getDay(db, date);
  if (day && !isFilled(day)) db.entries = db.entries.filter(d => d !== day);
}
export function addShift(db, date, start, end) {
  start = normalizeTime(start); end = normalizeTime(end);
  const err = overlapError(db, date, start, end);
  if (err) return { ok: false, message: err };
  const day = ensureDay(db, date);
  day.shifts.push({ start, end });
  day.shifts.sort((a, b) => a.start.localeCompare(b.start));
  if (day.dayOff) day.dayOff = false; // przepracowany dzień nie jest wolny
  db.settings.lastShift = { start, end };
  return { ok: true };
}
export function updateShift(db, date, index, start, end) {
  start = normalizeTime(start); end = normalizeTime(end);
  const day = getDay(db, date);
  if (!day?.shifts[index]) return { ok: false, message: "Nie znaleziono zakresu." };
  const err = overlapError(db, date, start, end, { date, index });
  if (err) return { ok: false, message: err };
  day.shifts[index] = { start, end };
  day.shifts.sort((a, b) => a.start.localeCompare(b.start));
  return { ok: true };
}
export function removeShift(db, date, index) {
  const day = getDay(db, date);
  if (!day?.shifts[index]) return { ok: false };
  day.shifts.splice(index, 1);
  dropIfEmpty(db, date);
  return { ok: true };
}
// status: "" | "paid" | "unpaid" | "sick" | "off"
export function setStatus(db, date, status) {
  const day = ensureDay(db, date);
  day.leaveType = ["paid", "unpaid", "sick"].includes(status) ? status : "";
  day.vacation = status === "paid";
  day.dayOff = status === "off";
  dropIfEmpty(db, date);
  return { ok: true };
}
export function setNote(db, date, text) {
  const note = String(text || "").trim();
  const day = getDay(db, date);
  if (!day && !note) return { ok: true, changed: false };
  if ((day?.note || "") === note) return { ok: true, changed: false };
  ensureDay(db, date).note = note;
  dropIfEmpty(db, date);
  return { ok: true, changed: true };
}

// ---------- Operacje na zakresie dat ----------
// opts: {from,to,kind:"hours"|"status", start,end,status, remove, sat,sun,hol}
export function applyRange(db, opts) {
  const res = { changed: 0, skipped: 0, conflicts: 0 };
  if (!isValidDateISO(opts.from) || !isValidDateISO(opts.to) || opts.to < opts.from) return { ...res, error: "Sprawdź daty „od” i „do”." };
  if (opts.kind === "hours" && !opts.remove && overlapError({ entries: [] }, opts.from, opts.start, opts.end))
    return { ...res, error: "Uzupełnij poprawnie godzinę wejścia i wyjścia." };
  for (let iso = opts.from; iso <= opts.to; iso = addDaysISO(iso, 1)) {
    const wd = weekdayIndex(iso), hol = !!holidayName(iso);
    if ((wd === 5 && !opts.sat) || (wd === 6 && !opts.sun) || (hol && !opts.hol)) { res.skipped++; continue; }
    if (opts.kind === "hours") {
      if (opts.remove) {
        const day = getDay(db, iso);
        const i = day ? day.shifts.findIndex(s => s.start === normalizeTime(opts.start) && s.end === normalizeTime(opts.end)) : -1;
        if (i >= 0) { removeShift(db, iso, i); res.changed++; }
      } else {
        const r = addShift(db, iso, opts.start, opts.end);
        if (r.ok) res.changed++; else res.conflicts++;
      }
    } else {
      const day = getDay(db, iso);
      if (opts.remove) { if (dayStatus(day)) { setStatus(db, iso, ""); res.changed++; } }
      else { setStatus(db, iso, opts.status); res.changed++; }
    }
  }
  return res;
}

// ---------- Stawki ----------
export function addRate(db, from, rate) {
  db.settings.rateHistory = [...db.settings.rateHistory.filter(r => r.from !== from), { from, rate: round2(rate) }];
  normalize(db);
}
export function removeRate(db, index) {
  if (db.settings.rateHistory.length < 2) return;
  db.settings.rateHistory = db.settings.rateHistory.filter((_, i) => i !== index);
  normalize(db);
}

// ---------- Import / scalanie ----------
export function parseBackup(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || !Array.isArray(value.entries)) throw Error("To nie jest kopia aplikacji Czas pracy.");
  return normalize(clone(value));
}
export function analyzeImport(db, incoming) {
  const dates = incoming.entries.map(d => d.date);
  const cur = new Map(db.entries.map(d => [d.date, d]));
  let same = 0, diff = 0;
  for (const d of incoming.entries) if (cur.has(d.date)) { same++; if (JSON.stringify(cur.get(d.date)) !== JSON.stringify(d)) diff++; }
  return { count: dates.length, from: dates[0] || "", to: dates[dates.length - 1] || "", same, diff };
}
// Dane w telefonie mają pierwszeństwo; zakresy nachodzące na istniejące godziny są pomijane.
export function mergeImport(db, incoming) {
  const r = { addedDays: 0, addedShifts: 0, conflicts: 0 };
  for (const src of incoming.entries) {
    const existed = !!getDay(db, src.date);
    const day = ensureDay(db, src.date);
    if (!day.note && src.note) day.note = src.note;
    if (!dayStatus(day) && dayStatus(src) && !(src.dayOff && day.shifts.length)) {
      day.leaveType = src.leaveType; day.vacation = src.vacation; day.dayOff = src.dayOff;
    }
    for (const sh of src.shifts) {
      if (day.shifts.some(x => x.start === sh.start && x.end === sh.end)) continue;
      if (overlapError(db, src.date, sh.start, sh.end)) { r.conflicts++; continue; }
      day.shifts.push({ ...sh }); r.addedShifts++;
    }
    day.shifts.sort((a, b) => a.start.localeCompare(b.start));
    if (!existed) { if (isFilled(day)) r.addedDays++; else dropIfEmpty(db, src.date); }
  }
  return r;
}
