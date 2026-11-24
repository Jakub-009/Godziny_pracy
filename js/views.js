// Widoki: czyste funkcje budujące HTML ze stanu. Nie zmieniają danych.
import {
  monthDays, getDay, dayMinutes, fmtHM, pln, escapeHtml, monthTitle, monthName, weekdayIndex, WD_SHORT,
  holidayName, isWorkday, isFilled, dayStatus, STATUS_LABEL, monthTotals, pluralPL, fmtDayMonth, fmtLongDate,
  shiftMinutes, fmtFullDate, yearTotals, RATE_START, ym, todayISO
} from "./data.js";

export const ICON = {
  left: "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  right: "M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z",
  more: "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  print: "M18 7H6V3h12v4Zm1 2c1.66 0 3 1.34 3 3v5h-4v4H6v-4H2v-5c0-1.66 1.34-3 3-3h14Zm-3 10v-5H8v5h8Zm3-6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2Z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z",
  range: "M9 11H7v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2Zm2-7h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11Z",
  stats: "M4 19h16v2H4v-2Zm1-2V9h3v8H5Zm5.5 0V3h3v14h-3ZM16 17v-6h3v6h-3Z",
  settings: "M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
  backup: "M19 9h-4V3H9v6H5l7 7 7-7ZM5 18v3h14v-3h-2v1H7v-1H5Z",
  copy: "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z",
  info: "M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM11 9h2V7h-2v2Z"
};
export const icon = (name, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${ICON[name]}"/></svg>`;
const n = (v, one, few, many) => `${v} ${pluralPL(v, one, few, many)}`;

// ---------- Podsumowanie miesiąca ----------
export function summaryHTML(db, month, today) {
  const t = monthTotals(db, month, today);
  const chips = [
    t.workDays && `<span class="chip">${n(t.workDays, "dzień", "dni", "dni")} pracy</span>`,
    t.paid && `<span class="chip paid">${n(t.paid, "dzień", "dni", "dni")} urlopu płatnego</span>`,
    t.unpaid && `<span class="chip unpaid">${n(t.unpaid, "dzień", "dni", "dni")} urlopu bezpłatnego</span>`,
    t.sick && `<span class="chip sick">${n(t.sick, "dzień", "dni", "dni")} zwolnienia L4</span>`,
    t.off && `<span class="chip off">${t.off} ${pluralPL(t.off, "dzień wolny", "dni wolne", "dni wolnych")}</span>`,
    t.missing && `<button class="chip miss" data-a="fill-month" type="button">brakuje ${t.missing} ${pluralPL(t.missing, "dnia", "dni", "dni")}</button>`
  ].filter(Boolean).join("");
  return `<section class="sum" aria-label="Podsumowanie miesiąca">
    <div class="sumLabel">${monthName(month)}</div>
    <button class="iconBtn printBtn" data-a="print" type="button" aria-label="Drukuj raport za ${monthTitle(month)}">${icon("print")}</button>
    <div class="sumTop">
      <span class="sumHours num">${fmtHM(t.min)}<small>godz.</small></span>
      <span class="sumMoney num">${pln(t.money)}</span>
    </div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
  </section>`;
}

// ---------- Paski ----------
export function bannerHTML(b) {
  if (!b) return "";
  if (b.kind === "start") return `<section class="startCard">
      <h2>Wersja testowa</h2>
      <p>Tu możesz bezpiecznie testować nowy wygląd. Skopiuj dane z aplikacji Czas pracy – oryginał zostaje nietknięty.</p>
      <div class="row"><button class="btn" data-a="copy-main" type="button">Skopiuj dane</button>
      <button class="btn ghost" data-a="dismiss-start" type="button">Zacznij od zera</button></div></section>`;
  const close = `<button class="iconBtn bannerClose" data-a="dismiss-banner" data-kind="${b.kind}" data-month="${b.month || ""}" type="button" aria-label="Ukryj">${icon("close")}</button>`;
  if (b.kind === "complete") return `<section class="banner"><span class="bannerText"><b>${monthName(b.month)}</b> jest kompletny</span>
      <button class="bannerAct" data-a="print-month" data-month="${b.month}" type="button">Drukuj raport</button>${close}</section>`;
  if (b.kind === "incomplete") return `<section class="banner warn"><span class="bannerText"><b>${monthName(b.month)}</b> jest niekompletny · brakuje ${b.missing} ${pluralPL(b.missing, "dnia", "dni", "dni")}</span>
      <button class="bannerAct" data-a="show-missing" data-month="${b.month}" type="button">Pokaż</button>${close}</section>`;
  if (b.kind === "backup") return `<section class="banner"><span class="bannerText">${b.days == null ? "Nie masz jeszcze kopii zapasowej" : `Ostatnia kopia: ${n(b.days, "dzień", "dni", "dni")} temu`}</span>
      <button class="bannerAct" data-a="share-backup" type="button">Zrób kopię</button>${close}</section>`;
  return "";
}

// ---------- Lista dni ----------
function weeksOf(month) {
  const weeks = [];
  for (const iso of monthDays(month)) {
    if (!weeks.length || weekdayIndex(iso) === 0) weeks.push([]);
    weeks[weeks.length - 1].push(iso);
  }
  return weeks;
}
const isMissing = (db, iso, today) => iso < today && isWorkday(iso, db.settings) && !isFilled(getDay(db, iso));
export const missingIn = (db, days, today) => days.filter(iso => isMissing(db, iso, today));

export function listHTML(db, month, state) {
  return weeksOf(month).map(days => {
    const first = days[0], last = days[days.length - 1];
    const min = days.reduce((s, iso) => s + dayMinutes(getDay(db, iso)), 0);
    const miss = missingIn(db, days, state.today);
    const label = ym(first) === ym(last) && first !== last ? `${+first.slice(8)} – ${fmtDayMonth(last)}` : fmtDayMonth(first);
    const right = miss.length
      ? `<button class="fillBtn" data-a="fill-week" data-from="${first}" data-to="${last}" type="button">Uzupełnij ${n(miss.length, "dzień", "dni", "dni")}</button>`
      : min ? `<span class="weekSum num">${fmtHM(min)}</span>` : "";
    return `<section class="week"><div class="weekHead"><span>${label}</span>${right}</div>
      <div class="list">${days.map(iso => dayHTML(db, iso, state)).join("")}</div></section>`;
  }).join("");
}

function dayHTML(db, iso, state) {
  const day = getDay(db, iso), status = dayStatus(day), min = dayMinutes(day);
  const wd = weekdayIndex(iso), hol = holidayName(iso), work = isWorkday(iso, db.settings);
  const isToday = iso === state.today, open = state.open === iso;
  const red = wd === 6 || hol ? " red" : "";
  const dn = `<div class="dn${red}"><b class="num">${+iso.slice(8)}</b><small>${WD_SHORT[wd]}</small></div>`;
  const cls = ["day", isToday && "today", open && "open"];
  let main = "", right = "";

  if (isFilled(day)) {
    if (status) { main += `<span class="tag ${status}">${STATUS_LABEL[status]}</span>`; cls.push("st-" + status); }
    if (day.shifts.length) main += `<span class="hrs num">${day.shifts.map(s => `${s.start}–${s.end}`).join(" · ")}</span>`;
    if (day.note.trim()) main += `<span class="note">${escapeHtml(day.note.trim().split("\n")[0])}</span>`;
    if (min) right = `<span class="dsum num">${fmtHM(min)}</span>`;
    return `<div class="${cls.filter(Boolean).join(" ")}" data-a="day" data-date="${iso}" role="button" tabindex="0"
      aria-label="${escapeHtml(fmtLongDate(iso))}">${dn}<div class="dmain">${main}</div>${right}</div>`;
  }

  const plus = `<span class="plus">${icon("plus")}</span>`;
  if (!work && !open) {
    cls.push("compact");
    return `<div class="${cls.filter(Boolean).join(" ")}" data-a="day" data-date="${iso}" role="button" tabindex="0">${dn}
      <div class="dmain"><span class="muted">${hol ? escapeHtml(hol) : "wolne"}</span></div></div>`;
  }
  const missing = iso < state.today && work;
  if (missing) { cls.push("miss"); main = `<span class="missText">Brak wpisu</span>`; }
  else if (isToday) main = `<span class="muted">Dzisiaj</span>`;
  else if (iso > state.today) cls.push("future");
  if (!work && hol) main = `<span class="muted">${escapeHtml(hol)}</span>`;
  if (open) main += quickHTML(db, iso);
  return `<div class="${cls.filter(Boolean).join(" ")}" data-a="day" data-date="${iso}" role="button" tabindex="0">${dn}
    <div class="dmain">${main}</div>${open ? "" : plus}</div>`;
}

function quickHTML(db, iso) {
  const tpl = db.settings.shiftTemplates.map((t, i) =>
    `<button class="qbtn" data-a="quick-tpl" data-date="${iso}" data-i="${i}" type="button">${short(t.start)}–${short(t.end)}</button>`).join("");
  return `<div class="quick">${tpl}
    <button class="qbtn sec" data-a="quick-off" data-date="${iso}" type="button">Dzień wolny</button>
    <button class="qbtn sec" data-a="quick-more" data-date="${iso}" type="button">Więcej…</button></div>`;
}
const short = t => t.endsWith(":00") ? t.slice(0, 2) : t; // 06:00 → 06, 06:30 zostaje

// ---------- Arkusz dnia ----------
export function daySheetHTML(db, iso, edit) {
  const day = getDay(db, iso), status = dayStatus(day), min = dayMinutes(day), hol = holidayName(iso);
  const shifts = (day?.shifts || []).map((s, i) => `
    <div class="shiftRow${edit.index === i ? " editing" : ""}">
      <button class="t num" data-a="edit-shift" data-i="${i}" type="button" aria-label="Edytuj ${s.start}–${s.end}">${s.start} – ${s.end}</button>
      <span class="m num">${fmtHM(shiftMinutes(iso, s))}</span>
      <button class="iconBtn" data-a="del-shift" data-i="${i}" type="button" aria-label="Usuń ${s.start}–${s.end}">${icon("trash")}</button>
    </div>`).join("");
  const editing = edit.index >= 0;
  const tpl = !editing ? `<div class="quick">${db.settings.shiftTemplates.map((t, i) =>
    `<button class="qbtn" data-a="sheet-tpl" data-i="${i}" type="button">${t.start}–${t.end}</button>`).join("")}</div>` : "";
  const st = ["", "paid", "unpaid", "sick", "off"].map(v =>
    `<button type="button" data-a="set-status" data-v="${v}" class="${status === v ? "on" : ""}">${v ? STATUS_LABEL[v] : "Brak"}</button>`).join("");
  return `<div class="grab"></div>
    <div class="sheetHead"><div style="flex:1"><h2>${fmtLongDate(iso)}</h2>${hol ? `<p>${escapeHtml(hol)}</p>` : ""}</div>
      <span class="sheetTotal num">${min ? fmtHM(min) : ""}</span></div>
    <div class="secTitle">Godziny pracy</div>
    ${shifts}
    ${tpl}
    <div class="timeRow">
      <div class="field"><label for="tStart">Wejście</label><input id="tStart" type="time" value="${edit.start}"></div>
      <div class="field"><label for="tEnd">Wyjście</label><input id="tEnd" type="time" value="${edit.end}"></div>
      <button class="btn" data-a="save-shift" type="button">${editing ? "Zapisz" : "Dodaj"}</button>
    </div>
    ${editing ? `<button class="btn ghost block" style="margin-top:8px" data-a="cancel-edit" type="button">Anuluj edycję</button>` : ""}
    <div class="err" id="sheetErr" role="alert">${escapeHtml(edit.error || "")}</div>
    <div class="secTitle">Status dnia</div>
    <div class="seg">${st}</div>
    <div class="secTitle">Notatka</div>
    <textarea id="noteField" rows="2" placeholder="Np. nadgodziny do odebrania">${escapeHtml(day?.note || "")}</textarea>
    <button class="btn tonal block" style="margin-top:16px" data-a="close-sheet" type="button">Gotowe</button>`;
}

// ---------- Menu ----------
export function menuHTML() {
  const item = (a, ic, label, sub = "") => `<button class="menuItem" data-a="${a}" type="button">${icon(ic)}<span>${label}${sub ? `<small>${sub}</small>` : ""}</span></button>`;
  return `<div class="grab"></div><div class="menuList">
    ${item("panel-range", "range", "Zakres dni", "Godziny, urlop, L4 lub dni wolne dla wielu dni naraz")}
    ${item("panel-year", "stats", "Statystyki roczne")}
    ${item("panel-settings", "settings", "Ustawienia", "Stawka, szablony, dni robocze")}
    ${item("panel-backup", "backup", "Kopia zapasowa")}
    ${item("panel-info", "info", "O wersji testowej")}
  </div>`;
}

const panelHead = title => `<div class="panelHead"><button class="iconBtn" data-a="close-panel" type="button" aria-label="Wróć">${icon("back")}</button><h2>${title}</h2></div>`;

// ---------- Zakres dni ----------
export function rangeHTML(db, r) {
  const kinds = [["hours", "Godziny"], ["paid", "Urlop płatny"], ["unpaid", "Urlop bezpłatny"], ["sick", "Zwolnienie L4"], ["off", "Dzień wolny"]];
  const tpl = db.settings.shiftTemplates.map((t, i) => `<button class="qbtn" data-a="range-tpl" data-i="${i}" type="button">${t.start}–${t.end}</button>`).join("");
  const sw = (id, label, on) => `<label class="switchRow"><span>${label}</span><input class="switch" type="checkbox" id="${id}" ${on ? "checked" : ""}></label>`;
  return `${panelHead("Zakres dni")}<div class="panelBody">
    <div class="card stack">
      <div class="grid2">
        <div class="field"><label for="rFrom">Od</label><input id="rFrom" type="date" value="${r.from}"></div>
        <div class="field"><label for="rTo">Do</label><input id="rTo" type="date" value="${r.to}"></div>
      </div>
      <div class="seg" id="rKind">${kinds.map(([v, l]) => `<button type="button" data-a="range-kind" data-v="${v === "hours" ? "" : v}" data-kind="${v}" class="${r.kind === v ? "on" : ""}">${l}</button>`).join("")}</div>
      ${r.kind === "hours" ? `<div class="grid2">
        <div class="field"><label for="rStart">Wejście</label><input id="rStart" type="time" value="${r.start}"></div>
        <div class="field"><label for="rEnd">Wyjście</label><input id="rEnd" type="time" value="${r.end}"></div></div>
        <div class="quick">${tpl}</div>` : ""}
    </div>
    <div class="card">
      <h3>Uwzględnij</h3>
      ${sw("rSat", "Soboty", r.sat)}${sw("rSun", "Niedziele", r.sun)}${sw("rHol", "Święta", r.hol)}
      <p class="hint">${r.kind === "sick" ? "Zwolnienie L4 liczy się w dniach kalendarzowych, dlatego domyślnie obejmuje wszystkie dni." : "Domyślny wybór wynika z ustawień dni roboczych."}</p>
    </div>
    <div class="card stack">
      <button class="btn block" data-a="range-apply" type="button">${r.kind === "hours" ? "Dodaj godziny" : "Ustaw: " + (STATUS_LABEL[r.kind] || "")}</button>
      <button class="btn ghost block" data-a="range-remove" type="button">${r.kind === "hours" ? "Usuń te godziny z zakresu" : "Usuń status z zakresu"}</button>
    </div></div>`;
}

// ---------- Statystyki roczne ----------
export function yearHTML(db, year) {
  const t = yearTotals(db, year);
  const left = Math.max(0, (Number(db.settings.leaveQuota) || 0) - t.paid);
  const kv = (k, v) => `<div class="kv"><span>${k}</span><strong class="num">${v}</strong></div>`;
  return `${panelHead("Statystyki roczne")}<div class="panelBody">
    <div class="card"><div class="yearNav">
      <button class="iconBtn" data-a="year-prev" type="button" aria-label="Poprzedni rok">${icon("left")}</button>
      <strong>${year}</strong>
      <button class="iconBtn" data-a="year-next" type="button" aria-label="Następny rok">${icon("right")}</button></div></div>
    <div class="card">
      ${kv("Godziny", fmtHM(t.min))}${kv("Wypłata", pln(t.money))}${kv("Dni pracy", t.workDays)}
    </div>
    <div class="card">
      ${kv("Urlop płatny wykorzystany", n(t.paid, "dzień", "dni", "dni"))}${kv("Urlop płatny pozostały", n(left, "dzień", "dni", "dni"))}
      ${kv("Urlop bezpłatny", n(t.unpaid, "dzień", "dni", "dni"))}${kv("Zwolnienie L4", n(t.sick, "dzień", "dni", "dni"))}
      ${kv("Dni wolne", n(t.off, "dzień", "dni", "dni"))}
    </div></div>`;
}

// ---------- Ustawienia ----------
export function settingsHTML(db) {
  const s = db.settings;
  const rates = s.rateHistory.map((r, i) => `<div class="listRow"><span><strong class="num">${pln(r.rate)}</strong><small>${r.from <= RATE_START ? "od początku" : "od " + fmtFullDate(r.from)}</small></span>
    ${s.rateHistory.length > 1 ? `<button class="iconBtn" data-a="del-rate" data-i="${i}" type="button" aria-label="Usuń stawkę">${icon("trash")}</button>` : ""}</div>`).join("");
  const tpls = s.shiftTemplates.map((t, i) => `<div class="listRow"><span class="num">${t.start} – ${t.end}</span>
    <button class="iconBtn" data-a="del-tpl" data-i="${i}" type="button" aria-label="Usuń szablon">${icon("trash")}</button></div>`).join("")
    || `<p class="hint">Brak szablonów.</p>`;
  const sw = (id, label, on) => `<label class="switchRow"><span>${label}</span><input class="switch" type="checkbox" data-setting="${id}" ${on ? "checked" : ""}></label>`;
  const first = `${ym(todayISO())}-01`;
  return `${panelHead("Ustawienia")}<div class="panelBody">
    <div class="card"><h3>Stawka godzinowa</h3><p class="hint" style="margin:0 0 4px">Każda stawka obowiązuje od wskazanego dnia. Wcześniejsze dni liczą się starą stawką.</p>
      ${rates}
      <div class="grid2" style="margin-top:12px">
        <div class="field"><label for="rateVal">Nowa stawka (zł)</label><input id="rateVal" type="number" step="0.01" min="0" inputmode="decimal" placeholder="np. 35,00"></div>
        <div class="field"><label for="rateFrom">Obowiązuje od</label><input id="rateFrom" type="date" value="${first}"></div></div>
      <button class="btn tonal block" style="margin-top:8px" data-a="add-rate" type="button">Dodaj zmianę stawki</button></div>
    <div class="card"><h3>Szablony godzin</h3><p class="hint" style="margin:0 0 4px">Pojawiają się przy każdym dniu – jedno dotknięcie zapisuje godziny.</p>
      ${tpls}
      <div class="timeRow"><div class="field"><label for="tplStart">Wejście</label><input id="tplStart" type="time"></div>
        <div class="field"><label for="tplEnd">Wyjście</label><input id="tplEnd" type="time"></div>
        <button class="btn tonal" data-a="add-tpl" type="button">Dodaj</button></div></div>
    <div class="card"><h3>Dni robocze</h3>
      ${sw("defaultIncludeSat", "Soboty to dni robocze", s.defaultIncludeSat)}
      ${sw("defaultIncludeSun", "Niedziele to dni robocze", s.defaultIncludeSun)}
      ${sw("defaultIncludeHolidays", "Święta to dni robocze", s.defaultIncludeHolidays)}
      <p class="hint">Pusty dzień roboczy pokazuje się jako „Brak wpisu”. Pozostałe puste dni są zwinięte jako „wolne”.</p></div>
    <div class="card stack"><h3>Urlop i kopia</h3>
      <div class="grid2">
        <div class="field"><label for="leaveQuota">Urlop płatny (dni / rok)</label><input id="leaveQuota" data-setting-num="leaveQuota" type="number" min="0" step="1" value="${s.leaveQuota}"></div>
        <div class="field"><label for="backupDays">Przypomnienie o kopii (dni)</label><input id="backupDays" data-setting-num="backupReminderDays" type="number" min="1" max="60" step="1" value="${s.backupReminderDays}"></div>
      </div></div>
  </div>`;
}

// ---------- Kopia zapasowa ----------
export function backupHTML(meta, canShare, hasMain) {
  const last = meta.lastBackup ? new Date(meta.lastBackup).toLocaleDateString("pl-PL") : "jeszcze nie było";
  return `${panelHead("Kopia zapasowa")}<div class="panelBody">
    <div class="card stack"><h3>Kopia danych</h3><p class="hint" style="margin:0">Ostatnia kopia: ${last}</p>
      ${canShare ? `<button class="btn block" data-a="share-backup" type="button">Udostępnij kopię (Dysk, e-mail…)</button>` : ""}
      <button class="btn ${canShare ? "tonal" : ""} block" data-a="download-backup" type="button">Pobierz kopię do telefonu</button>
      <button class="btn ghost block" data-a="import" type="button">Wczytaj kopię z pliku</button></div>
    <div class="card stack"><h3>Dane z aplikacji Czas pracy</h3>
      <p class="hint" style="margin:0">Kopiuje aktualne dane z głównej aplikacji do wersji testowej. Główna aplikacja nie jest zmieniana.</p>
      <button class="btn tonal block" data-a="copy-main" type="button" ${hasMain ? "" : "disabled"}>${hasMain ? "Skopiuj dane z Czasu pracy" : "Brak danych głównej aplikacji na tym telefonie"}</button></div>
  </div>`;
}

export function infoHTML(version) {
  return `${panelHead("O wersji testowej")}<div class="panelBody"><div class="card stack">
    <h3>Czas pracy ${version}</h3>
    <p class="hint" style="margin:0">To wersja testowa nowego wyglądu. Zapisuje dane osobno – główna aplikacja Czas pracy nie jest przez nią zmieniana.</p>
    <p class="hint" style="margin:0">Godziny wpisane tutaj możesz przenieść do głównej aplikacji: zrób kopię tutaj, a w głównej aplikacji wybierz „Wczytaj dane z kopii” → „Scal”.</p>
  </div></div>`;
}
