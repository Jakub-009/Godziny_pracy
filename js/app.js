// Czas pracy – prototyp 6.0. Stan, zdarzenia, okna, cofanie.
// Zapis wyłącznie pod PROTO_KEY i META_KEY. Dane głównej aplikacji (MAIN_KEY) są tylko odczytywane.
import * as D from "./data.js";
import * as V from "./views.js";
import { openReport } from "./report.js";

const VERSION = "6.0 (test 2)";
const $ = id => document.getElementById(id);
const S = {
  db: null, saved: "", meta: {}, today: D.todayISO(), month: "",
  open: null,          // data rozwiniętego wiersza (szybkie szablony)
  fill: null,          // {from,to} – tryb „uzupełnij po kolei”
  sheet: null,         // {type:"day", date} | {type:"menu"}
  edit: { index: -1, start: "", end: "", error: "" },
  panel: null, range: null, year: null
};

// ---------- Start ----------
function init() {
  const { db, error } = D.loadDB(D.PROTO_KEY);
  S.db = db || D.createEmptyDB();
  S.saved = JSON.stringify(S.db);
  S.meta = D.loadMeta();
  if (!S.meta.firstUse) { S.meta.firstUse = S.today; saveMeta(); }
  S.month = D.ym(S.today);
  bindEvents();
  render();
  requestAnimationFrame(() => scrollToDate(S.today, false));
  if (error) toast(error);
  try { navigator.storage?.persist?.().catch(() => {}); } catch {}
  registerSW();
}

// ---------- Zapis i cofanie ----------
function commit(message = "", snap = null, opts = {}) {
  D.normalize(S.db);
  if (!D.saveDB(D.PROTO_KEY, S.db)) {
    S.db = D.normalize(JSON.parse(S.saved));
    render();
    toast("Nie udało się zapisać. Zwolnij miejsce w telefonie i spróbuj ponownie.");
    return false;
  }
  S.saved = JSON.stringify(S.db);
  render(opts);
  if (message) toast(message, snap);
  return true;
}
function undo(snap) {
  S.db = D.normalize(JSON.parse(snap));
  S.edit = freshEdit();
  commit("Cofnięto.");
}
const saveMeta = () => D.saveMeta(S.meta);

// ---------- Renderowanie ----------
function render(opts = {}) {
  $("monthTitle").textContent = D.monthTitle(S.month);
  $("todayBtn").hidden = S.month === D.ym(S.today);
  $("summary").innerHTML = V.summaryHTML(S.db, S.month, S.today);
  $("banner").innerHTML = V.bannerHTML(currentBanner());
  $("list").innerHTML = V.listHTML(S.db, S.month, S);
  if (S.sheet && opts.sheet !== false) renderSheet();
  if (S.panel && opts.panel !== false) renderPanel();
}
function renderSheet() {
  const sheet = $("sheet");
  if (S.sheet?.type === "day") sheet.innerHTML = V.daySheetHTML(S.db, S.sheet.date, S.edit);
  else if (S.sheet?.type === "menu") sheet.innerHTML = V.menuHTML();
  else if (S.sheet?.type === "rate") sheet.innerHTML = V.rateSheetHTML(S.db);
  else if (S.sheet?.type === "tpl") sheet.innerHTML = V.tplSheetHTML();
}
function renderPanel() {
  const top = $("panel").scrollTop;
  const html = {
    range: () => V.rangeHTML(S.db, S.range, D.countRangeDays(S.range)),
    year: () => V.yearHTML(S.db, S.year),
    settings: () => V.settingsHTML(S.db),
    backup: () => V.backupHTML(S.meta, !!shareFile(), !!D.readRaw(D.MAIN_KEY)),
    info: () => V.infoHTML(VERSION)
  }[S.panel];
  if (html) { $("panel").innerHTML = html(); $("panel").scrollTop = top; }
}

function currentBanner() {
  const hasData = S.db.entries.length > 0;
  if (!hasData && !S.meta.startDismissed && D.readRaw(D.MAIN_KEY)) return { kind: "start" };
  if (S.month !== D.ym(S.today) || !hasData) return null;
  const done = S.meta.reportDone || {};
  const cur = D.monthCompletion(S.db, S.month, S.today);
  if (cur.state === "complete" && !done[S.month]) return { kind: "complete", month: S.month };
  const prev = D.addMonthsYM(S.month, -1);
  if (+S.today.slice(8) <= 20 && !done[prev] && S.db.entries.some(d => D.ym(d.date) === prev)) {
    const p = D.monthCompletion(S.db, prev, S.today);
    if (p.state === "complete") return { kind: "complete", month: prev };
    if (p.state === "incomplete") return { kind: "incomplete", month: prev, missing: p.missing.length };
  }
  if (S.meta.backupSnooze !== S.today) {
    // Bez kopii: przypominamy dopiero po kilku dniach używania, a nie od razu po starcie.
    const since = iso => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    const limit = S.db.settings.backupReminderDays;
    if (S.meta.lastBackup ? since(S.meta.lastBackup) >= limit : since(S.meta.firstUse || S.today) >= limit)
      return { kind: "backup", days: S.meta.lastBackup ? since(S.meta.lastBackup) : null };
  }
  return null;
}

function scrollToDate(iso, smooth = true) {
  const el = document.querySelector(`.day[data-date="${iso}"]`);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
  window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
}
function setMonth(month, scroll = "top") {
  S.month = month; S.open = null; S.fill = null;
  render();
  if (scroll === "today") scrollToDate(S.today, false); else window.scrollTo({ top: 0 });
}
// Płynna zmiana miesiąca: obecny odjeżdża w bok, nowy wjeżdża z drugiej strony.
// from = aktualne przesunięcie (gdy palec już przeciągnął listę).
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let sliding = false;
function slideMonth(dir, month = D.addMonthsYM(S.month, dir), scroll = "top") {
  const pager = $("pager");
  if (reduceMotion()) { pager.style.transform = pager.style.opacity = ""; setMonth(month, scroll); return; }
  if (sliding) return;
  sliding = true;
  const w = pager.offsetWidth;
  pager.classList.add("anim");
  pager.style.transform = `translateX(${-dir * w * 0.4}px)`;
  pager.style.opacity = "0";
  setTimeout(() => {
    pager.classList.remove("anim");
    setMonth(month, scroll);
    pager.style.transform = `translateX(${dir * w * 0.4}px)`;
    void pager.offsetWidth;
    pager.classList.add("anim");
    pager.style.transform = "";
    pager.style.opacity = "";
    setTimeout(() => { pager.classList.remove("anim"); sliding = false; }, 220);
  }, 170);
}

// ---------- Okna (arkusz, panel, pytanie) + gest „wstecz” ----------
const stack = [];
let ignorePop = 0;
const onClose = new Map();
function openOverlay(dlg, closeCb) {
  if (closeCb) onClose.set(dlg, closeCb);
  if (!dlg.open) dlg.showModal();
  stack.push(dlg);
  history.pushState({ overlay: stack.length }, "");
}
// Zamienia górne okno na inne bez zmiany historii (menu → panel).
function swapOverlay(from, to, closeCb) {
  finishClose(from);
  if (closeCb) onClose.set(to, closeCb);
  to.showModal();
  stack.push(to);
}
function closeOverlay(dlg) {
  const i = stack.lastIndexOf(dlg);
  if (i < 0) { if (dlg.open) dlg.close(); return; }
  const isTop = i === stack.length - 1;
  finishClose(dlg);
  if (isTop) { ignorePop++; history.back(); }
}
function finishClose(dlg) {
  const i = stack.lastIndexOf(dlg);
  if (i >= 0) stack.splice(i, 1);
  if (dlg.open) dlg.close();
  const cb = onClose.get(dlg);
  onClose.delete(dlg);
  cb?.();
}
window.addEventListener("popstate", () => {
  if (ignorePop > 0) { ignorePop--; return; }
  const top = stack[stack.length - 1];
  if (top) finishClose(top);
});
for (const id of ["sheet", "panel", "confirm"]) {
  const dlg = $(id);
  dlg.addEventListener("cancel", e => { e.preventDefault(); closeOverlay(dlg); });
  // Zamknięcie przez system (np. gest wstecz w Chrome) – porządkujemy stos i historię.
  dlg.addEventListener("close", () => { if (stack.includes(dlg)) closeOverlay(dlg); });
  // Dotknięcie tła zamyka arkusz.
  if (id === "sheet") dlg.addEventListener("click", e => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) closeOverlay(dlg);
  });
}

function ask({ title, message = "", buttons }) {
  return new Promise(resolve => {
    let result = null;
    $("confirmTitle").textContent = title;
    $("confirmMsg").textContent = message;
    $("confirmActs").innerHTML = "";
    for (const b of buttons) {
      const el = document.createElement("button");
      el.type = "button"; el.textContent = b.label;
      if (b.kind) el.className = b.kind;
      el.addEventListener("click", () => { result = b.value; closeOverlay($("confirm")); });
      $("confirmActs").appendChild(el);
    }
    openOverlay($("confirm"), () => resolve(result));
  });
}

let toastTimer = 0, toastSnap = null;
function toast(text, snap = null) {
  toastSnap = snap;
  $("toastText").textContent = text;
  $("toastUndo").hidden = !snap;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), snap ? 6000 : 3500);
}

// ---------- Arkusz dnia ----------
const freshEdit = () => ({ index: -1, start: S.db.settings.lastShift?.start || "", end: S.db.settings.lastShift?.end || "", error: "" });
function openDay(date) {
  S.open = null;
  S.sheet = { type: "day", date };
  S.edit = freshEdit();
  render({ sheet: false });
  renderSheet();
  openOverlay($("sheet"), () => { saveNoteFromField(); S.sheet = null; S.edit = freshEdit(); });
}
function saveNoteFromField() {
  const field = $("noteField");
  if (!field || S.sheet?.type !== "day") return;
  const snap = S.saved;
  const r = D.setNote(S.db, S.sheet.date, field.value);
  if (r.changed) commit("Zapisano notatkę.", snap, { sheet: false });
}

// ---------- Szybkie wpisy z listy ----------
function quick(date, fn, message) {
  const snap = S.saved;
  const r = fn();
  if (!r.ok) { toast(r.message || "Nie udało się zapisać."); return; }
  let next = null;
  if (S.fill) next = V.missingIn(S.db, D.monthDays(S.month).filter(d => d >= S.fill.from && d <= S.fill.to && d !== date), S.today)[0] || null;
  S.open = next;
  if (!next && S.fill) { S.fill = null; message += " Wszystko uzupełnione."; }
  commit(message, snap);
  if (next) scrollToDate(next);
}
function startFill(from, to) {
  const days = D.monthDays(S.month).filter(d => d >= from && d <= to);
  const first = V.missingIn(S.db, days, S.today)[0];
  if (!first) return;
  S.fill = { from, to }; S.open = first;
  render();
  scrollToDate(first);
}

// ---------- Raport ----------
async function printMonth(month) {
  const t = D.monthTotals(S.db, month, S.today);
  if (t.missing) {
    const go = await ask({ title: "Niekompletny miesiąc", message: `W miesiącu ${D.monthName(month).toLowerCase()} brakuje ${t.missing} ${D.pluralPL(t.missing, "dnia", "dni", "dni")}. Drukować mimo to?`,
      buttons: [{ label: "Anuluj", value: false }, { label: "Drukuj", value: true, kind: "primary" }] });
    if (!go) return;
  }
  const how = openReport(S.db, month);
  S.meta.reportDone = { ...(S.meta.reportDone || {}), [month]: "printed" };
  saveMeta();
  render({ sheet: false, panel: false });
  if (how === "downloaded") toast("Pobrano raport jako plik HTML – otwórz go i wybierz Drukuj.");
}

// ---------- Kopia zapasowa ----------
function shareFile() {
  if (typeof File !== "function" || !navigator.canShare) return null;
  const f = new File([JSON.stringify(S.db, null, 2)], `czas-pracy-test-kopia_${S.today}.json.txt`, { type: "text/plain" });
  try { return navigator.canShare({ files: [f] }) ? f : null; } catch { return null; }
}
async function shareBackup() {
  const f = shareFile();
  if (!f) return downloadBackup();
  try { await navigator.share({ files: [f], title: "Kopia – Czas pracy (test)" }); }
  catch (e) { if (e?.name === "AbortError") return toast("Anulowano."); return downloadBackup(); }
  backupDone("Kopia udostępniona.");
}
function downloadBackup() {
  const blob = new Blob([JSON.stringify(S.db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = `czas-pracy-test-kopia_${S.today}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  backupDone("Pobrano kopię do telefonu.");
}
function backupDone(msg) {
  S.meta.lastBackup = new Date().toISOString(); saveMeta();
  render(); toast(msg);
}
async function importFile(file) {
  let incoming;
  try { incoming = D.parseBackup(await file.text()); }
  catch (e) { toast(e.message || "Nie udało się wczytać pliku."); return; }
  const info = D.analyzeImport(S.db, incoming);
  const choice = await ask({ title: "Wczytać kopię?",
    message: `W pliku: ${info.count} ${D.pluralPL(info.count, "dzień", "dni", "dni")}${info.from ? ` (${D.fmtShortDate(info.from)}.${info.from.slice(0, 4)} – ${D.fmtShortDate(info.to)}.${info.to.slice(0, 4)})` : ""}.\nRóżni się od obecnych danych: ${info.diff}.\n\nScal – dopisuje brakujące dane, przy różnicach zostawia to, co jest tutaj.\nZastąp – wczytuje plik zamiast obecnych danych.`,
    buttons: [{ label: "Zastąp", value: "replace", kind: "danger" }, { label: "Anuluj", value: null }, { label: "Scal", value: "merge", kind: "primary" }] });
  if (!choice) return;
  const snap = S.saved;
  if (choice === "merge") {
    const r = D.mergeImport(S.db, incoming);
    commit(`Scalono: ${r.addedDays} ${D.pluralPL(r.addedDays, "nowy dzień", "nowe dni", "nowych dni")}, ${r.addedShifts} ${D.pluralPL(r.addedShifts, "zakres", "zakresy", "zakresów")}.${r.conflicts ? ` Pominięto ${r.conflicts} nachodzących.` : ""}`, snap);
  } else {
    S.db = incoming;
    commit("Wczytano kopię.", snap);
  }
}
async function copyFromMain() {
  const raw = D.readRaw(D.MAIN_KEY);
  if (!raw) { toast("Na tym telefonie nie ma danych aplikacji Czas pracy."); return; }
  let incoming;
  try { incoming = D.normalize(JSON.parse(raw)); } catch { toast("Nie udało się odczytać danych Czasu pracy."); return; }
  if (S.db.entries.length) {
    const ok = await ask({ title: "Skopiować dane?", message: "Dane wersji testowej zostaną zastąpione aktualnymi danymi z aplikacji Czas pracy. Główna aplikacja się nie zmieni.",
      buttons: [{ label: "Anuluj", value: false }, { label: "Skopiuj", value: true, kind: "primary" }] });
    if (!ok) return;
  }
  const snap = S.saved;
  S.db = incoming;
  S.meta.startDismissed = true; saveMeta();
  commit(`Skopiowano dane: ${incoming.entries.length} ${D.pluralPL(incoming.entries.length, "dzień", "dni", "dni")}.`, snap);
  requestAnimationFrame(() => scrollToDate(S.today, false));
}

// ---------- Panele ----------
function openPanel(name) {
  S.panel = name;
  if (name === "range") {
    const s = S.db.settings, base = S.open || S.today;
    S.range = { from: base, to: base, kind: "hours", start: s.lastShift?.start || "", end: s.lastShift?.end || "",
      sat: s.defaultIncludeSat, sun: s.defaultIncludeSun, hol: s.defaultIncludeHolidays };
  }
  if (name === "year") S.year = +S.month.slice(0, 4);
  renderPanel();
  $("panel").scrollTop = 0;
  const cb = () => { S.panel = null; render(); };
  if (S.sheet?.type === "menu") { S.sheet = null; swapOverlay($("sheet"), $("panel"), cb); }
  else openOverlay($("panel"), cb);
}
function updateRangeButton() {
  const r = readRange(), c = D.countRangeDays(r), btn = $("rangeApply");
  if (!btn) return;
  const what = V.RANGE_WHAT[r.kind];
  btn.disabled = !c;
  btn.textContent = c ? `Zapisz ${what} dla ${c} ${D.pluralPL(c, "dnia", "dni", "dni")}` : "Brak dni w tym zakresie";
}
function openSheet(type, closeCb) {
  S.sheet = { type };
  renderSheet();
  $("sheet").scrollTop = 0;
  openOverlay($("sheet"), () => { S.sheet = null; closeCb?.(); });
}
function readRange() {
  const r = S.range, v = id => $(id)?.value;
  if ($("rFrom")) { r.from = v("rFrom"); r.to = v("rTo"); }
  if ($("rStart")) { r.start = v("rStart"); r.end = v("rEnd"); }
  if ($("rSat")) { r.sat = $("rSat").checked; r.sun = $("rSun").checked; r.hol = $("rHol").checked; }
  return r;
}
async function applyRange(remove) {
  const r = readRange();
  const status = r.kind === "hours" ? "" : r.kind;
  if (remove) {
    const ok = await ask({ title: "Usunąć w zakresie?", message: r.kind === "hours" ? `Usunąć zakres ${r.start || "?"}–${r.end || "?"} z dni ${D.fmtShortDate(r.from)}–${D.fmtShortDate(r.to)}?` : `Usunąć status z dni ${D.fmtShortDate(r.from)}–${D.fmtShortDate(r.to)}?`,
      buttons: [{ label: "Anuluj", value: false }, { label: "Usuń", value: true, kind: "primary" }] });
    if (!ok) return;
  }
  const snap = S.saved;
  const res = D.applyRange(S.db, { from: r.from, to: r.to, kind: r.kind === "hours" ? "hours" : "status", start: r.start, end: r.end, status, remove, sat: r.sat, sun: r.sun, hol: r.hol });
  if (res.error) { toast(res.error); return; }
  const parts = [`${remove ? "Usunięto" : "Zapisano"} w ${res.changed} ${D.pluralPL(res.changed, "dniu", "dniach", "dniach")}.`];
  if (res.skipped) parts.push(`Pominięto ${res.skipped} ${D.pluralPL(res.skipped, "dzień wolny", "dni wolne", "dni wolnych")}.`);
  if (res.conflicts) parts.push(`${res.conflicts} ${D.pluralPL(res.conflicts, "dzień miał", "dni miały", "dni miało")} nachodzące godziny.`);
  commit(parts.join(" "), snap);
}

// ---------- Zdarzenia ----------
const A = {
  "prev-month": () => slideMonth(-1),
  "next-month": () => slideMonth(1),
  "go-today": () => slideMonth(S.month < D.ym(S.today) ? 1 : -1, D.ym(S.today), "today"),
  "pick-month": () => { const p = $("monthPicker"); p.value = S.month; try { p.showPicker(); } catch { p.focus(); p.click(); } },
  "menu": () => { S.sheet = { type: "menu" }; renderSheet(); openOverlay($("sheet"), () => { S.sheet = null; }); },
  "day": el => {
    const date = el.dataset.date;
    if (D.isFilled(D.getDay(S.db, date))) return openDay(date);
    S.open = S.open === date ? null : date;
    if (!S.open) S.fill = null;
    render();
  },
  "quick-tpl": el => { const t = S.db.settings.shiftTemplates[+el.dataset.i]; if (t) quick(el.dataset.date, () => D.addShift(S.db, el.dataset.date, t.start, t.end), `${D.fmtShortDate(el.dataset.date)}: ${t.start}–${t.end}.`); },
  "quick-off": el => quick(el.dataset.date, () => D.setStatus(S.db, el.dataset.date, "off"), `${D.fmtShortDate(el.dataset.date)}: dzień wolny.`),
  "quick-more": el => openDay(el.dataset.date),
  "fill-week": el => startFill(el.dataset.from, el.dataset.to),
  "fill-month": () => startFill(`${S.month}-01`, `${S.month}-31`),
  "show-missing": el => { S.month = el.dataset.month; window.scrollTo({ top: 0 }); startFill(`${S.month}-01`, `${S.month}-31`); },
  "print": () => printMonth(S.month),
  "print-month": el => printMonth(el.dataset.month),
  "dismiss-banner": el => {
    if (el.dataset.kind === "backup") S.meta.backupSnooze = S.today;
    else S.meta.reportDone = { ...(S.meta.reportDone || {}), [el.dataset.month]: "dismissed" };
    saveMeta(); render();
  },
  "dismiss-start": () => { S.meta.startDismissed = true; saveMeta(); render(); },
  "copy-main": () => copyFromMain(),
  "share-backup": () => shareBackup(),
  "download-backup": () => downloadBackup(),
  "import": () => $("fileInput").click(),

  // arkusz dnia
  "edit-shift": el => { const sh = D.getDay(S.db, S.sheet.date)?.shifts[+el.dataset.i]; if (sh) { S.edit = { index: +el.dataset.i, start: sh.start, end: sh.end, error: "" }; renderSheet(); } },
  "cancel-edit": () => { S.edit = freshEdit(); renderSheet(); },
  "del-shift": el => { const snap = S.saved; D.removeShift(S.db, S.sheet.date, +el.dataset.i); S.edit = freshEdit(); commit("Usunięto godziny.", snap); },
  "sheet-tpl": el => {
    const t = S.db.settings.shiftTemplates[+el.dataset.i], snap = S.saved;
    const r = D.addShift(S.db, S.sheet.date, t.start, t.end);
    if (!r.ok) { S.edit.error = r.message; renderSheet(); return; }
    S.edit = freshEdit(); commit(`Dodano ${t.start}–${t.end}.`, snap);
  },
  "save-shift": () => {
    const start = $("tStart").value, end = $("tEnd").value, snap = S.saved, date = S.sheet.date;
    const r = S.edit.index >= 0 ? D.updateShift(S.db, date, S.edit.index, start, end) : D.addShift(S.db, date, start, end);
    if (!r.ok) { S.edit = { ...S.edit, start, end, error: r.message }; renderSheet(); return; }
    const was = S.edit.index >= 0;
    S.edit = freshEdit(); commit(was ? "Zapisano zmiany." : `Dodano ${D.normalizeTime(start)}–${D.normalizeTime(end)}.`, snap);
  },
  "set-status": el => {
    const v = el.dataset.v, date = S.sheet.date, day = D.getDay(S.db, date);
    if (v === "off" && day?.shifts.length) { toast("Dzień z godzinami pracy nie może być dniem wolnym. Najpierw usuń godziny."); return; }
    if (D.dayStatus(day) === v) return;
    const snap = S.saved; D.setStatus(S.db, date, v);
    commit(v ? `${D.STATUS_LABEL[v]}.` : "Usunięto status dnia.", snap);
  },
  "close-sheet": () => closeOverlay($("sheet")),

  // menu i panele
  "panel-range": () => openPanel("range"),
  "panel-year": () => openPanel("year"),
  "panel-settings": () => openPanel("settings"),
  "panel-backup": () => openPanel("backup"),
  "panel-info": () => openPanel("info"),
  "close-panel": () => closeOverlay($("panel")),
  "year-prev": () => { S.year--; renderPanel(); },
  "year-next": () => { S.year++; renderPanel(); },
  "range-kind": el => {
    readRange();
    S.range.kind = el.dataset.kind;
    const s = S.db.settings, sick = S.range.kind === "sick";
    Object.assign(S.range, { sat: sick || s.defaultIncludeSat, sun: sick || s.defaultIncludeSun, hol: sick || s.defaultIncludeHolidays });
    renderPanel();
  },
  "range-tpl": el => { readRange(); const t = S.db.settings.shiftTemplates[+el.dataset.i]; Object.assign(S.range, { start: t.start, end: t.end }); renderPanel(); },
  "range-apply": () => applyRange(false),
  "range-remove": () => applyRange(true),

  // ustawienia
  "add-rate": async () => {
    const val = $("rateVal").valueAsNumber, from = $("rateFrom").value;
    if (!Number.isFinite(val) || val < 0) return toast("Wpisz poprawną stawkę.");
    if (!D.isValidDateISO(from)) return toast("Wybierz datę, od której obowiązuje stawka.");
    const next = S.db.settings.rateHistory.find(r => r.from > from);
    const affected = S.db.entries.filter(d => d.date >= from && (!next || d.date < next.from) && D.dayMinutes(d) > 0).length;
    const ok = await ask({ title: "Nowa stawka", message: `${D.pln(val)} od ${D.fmtFullDate(from)}.${affected ? `\nZmieni wyliczenia dla ${affected} ${D.pluralPL(affected, "dnia", "dni", "dni")} już wpisanych.` : ""}`,
      buttons: [{ label: "Anuluj", value: false }, { label: "Zapisz", value: true, kind: "primary" }] });
    if (!ok) return;
    const snap = S.saved; D.addRate(S.db, from, val); commit("Zapisano stawkę.", snap);
    if ($("rateVal")) $("rateVal").value = "";
  },
  "sheet-rate": () => openSheet("rate"),
  "sheet-tpl-add": () => openSheet("tpl"),
  "step": el => {
    const key = el.dataset.key, lim = { leaveQuota: [0, 60], backupReminderDays: [1, 60] }[key];
    const v = Math.min(lim[1], Math.max(lim[0], (Number(S.db.settings[key]) || 0) + Number(el.dataset.d)));
    if (v === S.db.settings[key]) return;
    S.db.settings[key] = v; commit();
  },
  "del-rate": el => { const snap = S.saved; D.removeRate(S.db, +el.dataset.i); commit("Usunięto stawkę.", snap); },
  "add-tpl": () => {
    const start = D.normalizeTime($("tplStart").value), end = D.normalizeTime($("tplEnd").value), list = S.db.settings.shiftTemplates;
    if (!start || !end || start === end) return toast("Uzupełnij poprawnie wejście i wyjście.");
    if (list.some(t => t.start === start && t.end === end)) return toast("Taki szablon już jest.");
    if (list.length >= 8) return toast("Możesz mieć najwyżej 8 szablonów.");
    const snap = S.saved; list.push({ start, end });
    if (S.sheet?.type === "tpl") closeOverlay($("sheet"));
    commit("Dodano szablon.", snap);
  },
  "del-tpl": el => { const snap = S.saved; S.db.settings.shiftTemplates.splice(+el.dataset.i, 1); commit("Usunięto szablon.", snap); }
};

function bindEvents() {
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-a]");
    if (!el || el.disabled) return;
    A[el.dataset.a]?.(el, e);
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".day[data-a]")) { e.preventDefault(); A.day(e.target); }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "monthPicker" && /^\d{4}-\d{2}$/.test(t.value)) setMonth(t.value);
    else if (t.id === "noteField") saveNoteFromField();
    else if (t.id === "fileInput") { const f = t.files?.[0]; t.value = ""; if (f) importFile(f); }
    else if (t.dataset.setting) { const snap = S.saved; S.db.settings[t.dataset.setting] = t.checked; commit("Zapisano.", snap); }
    else if (t.dataset.settingNum) {
      const v = t.valueAsNumber;
      if (!Number.isFinite(v) || v < Number(t.min || 0)) { toast("Nieprawidłowa wartość."); renderPanel(); return; }
      const snap = S.saved; S.db.settings[t.dataset.settingNum] = v; commit("Zapisano.", snap);
    }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "tStart") S.edit.start = e.target.value;
    if (e.target.id === "tEnd") S.edit.end = e.target.value;
    if (S.panel === "range" && /^r(From|To|Start|End|Sat|Sun|Hol)$/.test(e.target.id)) updateRangeButton();
  });
  $("toastUndo").addEventListener("click", () => { const s = toastSnap; $("toast").classList.remove("show"); if (s) undo(s); });
  window.addEventListener("scroll", () => $("top").classList.toggle("scrolled", window.scrollY > 4), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && D.todayISO() !== S.today) { S.today = D.todayISO(); render(); }
  });
  // Przeciągnięcie w bok: lista jedzie za palcem, po puszczeniu wjeżdża sąsiedni miesiąc.
  const pager = $("pager");
  let sx = 0, sy = 0, st = 0, mode = "", dx = 0;
  $("main").addEventListener("touchstart", e => {
    mode = "";
    if (sliding || e.touches.length !== 1 || e.target.closest("input,textarea,.quick")) { mode = "off"; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = e.timeStamp; dx = 0;
  }, { passive: true });
  $("main").addEventListener("touchmove", e => {
    if (mode === "off" || mode === "v") return;
    const x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
    if (!mode) {
      if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
      mode = Math.abs(x) > Math.abs(y) * 1.2 ? "h" : "v";
      if (mode === "v") return;
    }
    dx = x;
    const w = pager.offsetWidth;
    pager.style.transform = `translateX(${dx}px)`;
    pager.style.opacity = String(1 - Math.min(0.6, Math.abs(dx) / w * 0.8));
  }, { passive: true });
  const endDrag = e => {
    if (mode !== "h") { mode = ""; return; }
    mode = "";
    const w = pager.offsetWidth, v = Math.abs(dx) / Math.max(1, e.timeStamp - st);
    if (Math.abs(dx) > w * 0.22 || (Math.abs(dx) > 40 && v > 0.45)) { slideMonth(dx < 0 ? 1 : -1); return; }
    pager.classList.add("anim");
    pager.style.transform = ""; pager.style.opacity = "";
    setTimeout(() => pager.classList.remove("anim"), 220);
  };
  $("main").addEventListener("touchend", endDrag, { passive: true });
  $("main").addEventListener("touchcancel", endDrag, { passive: true });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(e => console.warn("SW:", e));
}

init();
