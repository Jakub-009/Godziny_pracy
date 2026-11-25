// Widoki: czyste funkcje budujące HTML ze stanu. Nie zmieniają danych.
import {
  monthDays, getDay, dayMinutes, fmtHM, pln, escapeHtml, monthTitle, monthName, weekdayIndex, WD_SHORT,
  holidayName, isWorkday, isFilled, dayStatus, STATUS_LABEL, monthTotals, pluralPL, fmtDayMonth, fmtLongDate,
  shiftMinutes, fmtFullDate, yearTotals, RATE_START, ym, todayISO, pad2
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
  backup: "M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96ZM14 13v4h-4v-4H7l5-5 5 5h-3Z",
  info: "M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM11 9h2V7h-2v2Z",
  chev: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
};
export const icon = (name, cls = "") => `<svg viewBox="0 0 24 24"${cls ? ` class="${cls}"` : ""} aria-hidden="true"><path d="${ICON[name]}"/></svg>`;
const n = (v, one, few, many) => `${v} ${pluralPL(v, one, few, many)}`;
const dni = v => n(v, "dzień", "dni", "dni");

// ---------- Podsumowanie miesiąca ----------
export function summaryHTML(db, month, today) {
  const t = monthTotals(db, month, today);
  const chips = [
    t.workDays && `<span class="chip">${dni(t.workDays)} pracy</span>`,
    t.paid && `<span class="chip paid">${dni(t.paid)} urlopu płatnego</span>`,
    t.unpaid && `<span class="chip unpaid">${dni(t.unpaid)} urlopu bezpłatnego</span>`,
    t.sick && `<span class="chip sick">${dni(t.sick)} zwolnienia L4</span>`,
    t.off && `<span class="chip off">${t.off} ${pluralPL(t.off, "dzień wolny", "dni wolne", "dni wolnych")}</span>`,
    t.missing && `<button class="chip miss" data-a="fill-month" type="button">brakuje ${t.missing} ${pluralPL(t.missing, "dnia", "dni", "dni")}</button>`
  ].filter(Boolean).join("");
  return `<section class="sum" aria-label="Podsumowanie miesiąca">
    <div class="sumHead"><span class="sumLabel">${monthName(month)}</span>
      <button class="iconBtn printBtn" data-a="print" type="button" aria-label="Drukuj raport za ${monthTitle(month)}">${icon("print")}</button></div>
    <span class="sumHours">${fmtHM(t.min)}<small>godz.</small></span>
    <span class="sumMoney">${pln(t.money)}</span>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
  </section>`;
}

// ---------- Paski ----------
export function bannerHTML(b) {
  if (!b) return "";
  if (b.kind === "start") return `<section class="startCard">
      <h2>Wersja testowa nowego wyglądu</h2>
      <p>Skopiuj swoje dane z aplikacji Czas pracy i sprawdź, jak się tu pracuje. Oryginał zostaje nietknięty.</p>
      <div class="row"><button class="btn" data-a="copy-main" type="button">Skopiuj dane</button>
      <button class="btn text" data-a="dismiss-start" type="button">Zacznij od zera</button></div></section>`;
  const close = `<button class="iconBtn bannerClose" data-a="dismiss-banner" data-kind="${b.kind}" data-month="${b.month || ""}" type="button" aria-label="Ukryj">${icon("close")}</button>`;
  if (b.kind === "complete") return `<section class="banner"><span class="bannerText"><b>${monthName(b.month)}</b> jest kompletny</span>
      <button class="bannerAct" data-a="print-month" data-month="${b.month}" type="button">Drukuj raport</button>${close}</section>`;
  if (b.kind === "incomplete") return `<section class="banner warn"><span class="bannerText"><b>${monthName(b.month)}</b> jest niekompletny · brakuje ${b.missing} ${pluralPL(b.missing, "dnia", "dni", "dni")}</span>
      <button class="bannerAct" data-a="show-missing" data-month="${b.month}" type="button">Pokaż</button>${close}</section>`;
  if (b.kind === "backup") return `<section class="banner"><span class="bannerText">${b.days == null ? "Nie masz jeszcze kopii zapasowej" : `Ostatnia kopia była ${dni(b.days)} temu`}</span>
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
    const label = first !== last ? `${+first.slice(8)}–${fmtDayMonth(last)}` : fmtDayMonth(first);
    const right = miss.length
      ? `<button class="fillBtn" data-a="fill-week" data-from="${first}" data-to="${last}" type="button">Uzupełnij ${dni(miss.length)}</button>`
      : min ? `<span class="weekSum">${fmtHM(min)} godz.</span>` : "";
    return `<section class="week"><div class="weekHead"><span>${label}</span>${right}</div>
      <div class="list">${days.map(iso => dayHTML(db, iso, state)).join("")}</div></section>`;
  }).join("");
}

function dayHTML(db, iso, state) {
  const day = getDay(db, iso), status = dayStatus(day), min = dayMinutes(day);
  const wd = weekdayIndex(iso), hol = holidayName(iso), work = isWorkday(iso, db.settings);
  const isToday = iso === state.today, open = state.open === iso;
  const red = (wd === 6 || hol) && !isToday ? " red" : "";
  const dn = `<div class="dn${red}"><b>${+iso.slice(8)}</b><small>${WD_SHORT[wd].toLowerCase()}</small></div>`;
  const cls = ["day", isToday && "today", open && "open"];
  const attrs = `data-a="day" data-date="${iso}" role="button" tabindex="0" aria-label="${escapeHtml(fmtLongDate(iso))}"`;
  let main = "", right = "";

  if (isFilled(day)) {
    if (status) { main += `<span class="tag ${status}">${STATUS_LABEL[status]}</span>`; cls.push("st-" + status); }
    if (day.shifts.length) main += `<span class="hrs">${day.shifts.map(s => `${s.start}–${s.end}`).join("<br>")}</span>`;
    if (day.note.trim()) main += `<span class="note">${escapeHtml(day.note.trim().split("\n")[0])}</span>`;
    if (min) right = `<span class="dsum">${fmtHM(min)}</span>`;
    return `<div class="${cls.filter(Boolean).join(" ")}" ${attrs}>${dn}<div class="dmain">${main}</div>${right}</div>`;
  }
  if (!work && !open) {
    cls.push("compact");
    return `<div class="${cls.filter(Boolean).join(" ")}" ${attrs}>${dn}<div class="dmain"><span class="muted">${hol ? escapeHtml(hol) : "Wolne"}</span></div></div>`;
  }
  if (iso < state.today && work) { cls.push("miss"); main = `<span class="missText">Brak wpisu</span>`; }
  else if (isToday) main = `<span class="muted">Dzisiaj</span>`;
  else if (iso > state.today) cls.push("future");
  if (!work && hol) main = `<span class="muted">${escapeHtml(hol)}</span>`;
  if (open) main += quickHTML(db, iso);
  return `<div class="${cls.filter(Boolean).join(" ")}" ${attrs}>${dn}<div class="dmain">${main}</div>${open ? "" : `<span class="plus">${icon("plus")}</span>`}</div>`;
}

function quickHTML(db, iso) {
  const tpl = db.settings.shiftTemplates.map((t, i) =>
    `<button class="qbtn" data-a="quick-tpl" data-date="${iso}" data-i="${i}" type="button">${t.start}–${t.end}</button>`).join("");
  return `<div class="quick">${tpl}
    <button class="qbtn sec" data-a="quick-off" data-date="${iso}" type="button">Dzień wolny</button>
    <button class="qbtn sec" data-a="quick-more" data-date="${iso}" type="button">Więcej…</button></div>`;
}

// ---------- Arkusz dnia ----------
export function daySheetHTML(db, iso, edit) {
  const day = getDay(db, iso), status = dayStatus(day), min = dayMinutes(day), hol = holidayName(iso);
  const shifts = (day?.shifts || []).map((s, i) => `
    <div class="shiftRow${edit.index === i ? " editing" : ""}">
      <button class="t" data-a="edit-shift" data-i="${i}" type="button" aria-label="Zmień ${s.start}–${s.end}">${s.start} – ${s.end}</button>
      <span class="m">${fmtHM(shiftMinutes(iso, s))}</span>
      <button class="iconBtn" data-a="del-shift" data-i="${i}" type="button" aria-label="Usuń ${s.start}–${s.end}">${icon("trash")}</button>
    </div>`).join("");
  const editing = edit.index >= 0;
  const tpl = !editing && db.settings.shiftTemplates.length ? `<div class="quick" style="margin-bottom:12px">${db.settings.shiftTemplates.map((t, i) =>
    `<button class="qbtn" data-a="sheet-tpl" data-i="${i}" type="button">${t.start}–${t.end}</button>`).join("")}</div>` : "";
  const st = ["", "paid", "unpaid", "sick", "off"].map(v =>
    `<button type="button" data-a="set-status" data-v="${v}" class="${status === v ? "on" : ""}" aria-pressed="${status === v}">${v ? STATUS_LABEL[v] : "Brak"}</button>`).join("");
  return `<div class="grabZone" aria-hidden="true"><div class="grab"></div></div>
    <div class="sheetHead"><div style="flex:1"><h2>${fmtLongDate(iso)}</h2>${hol ? `<p>${escapeHtml(hol)}</p>` : ""}</div>
      ${min ? `<span class="sheetTotal">${fmtHM(min)}</span>` : ""}</div>
    ${shifts ? `<div style="margin-top:18px">${shifts}</div>` : ""}
    <div class="secTitle">${editing ? "Zmień godziny" : shifts ? "Dodaj kolejne godziny" : "Dodaj godziny"}</div>
    ${tpl}
    <div class="timeRow">
      <div class="field"><label for="tStart">Wejście</label><input id="tStart" type="time" value="${edit.start}"></div>
      <div class="field"><label for="tEnd">Wyjście</label><input id="tEnd" type="time" value="${edit.end}"></div>
      <button class="btn" data-a="save-shift" type="button">${editing ? "Zapisz" : "Dodaj"}</button>
    </div>
    ${editing ? `<button class="btn text block" style="margin-top:6px" data-a="cancel-edit" type="button">Anuluj zmianę</button>` : ""}
    <div class="err" id="sheetErr" role="alert">${escapeHtml(edit.error || "")}</div>
    <div class="secTitle">Status dnia</div>
    <div class="pills">${st}</div>
    <div class="secTitle">Notatka</div>
    <div class="field"><textarea id="noteField" rows="2" placeholder="Np. nadgodziny do odebrania">${escapeHtml(day?.note || "")}</textarea></div>
    <div class="sheetFoot"><button class="btn block" data-a="close-sheet" type="button">Gotowe</button></div>`;
}

// ---------- Menu ----------
export function menuHTML() {
  const tile = (a, ic, title, sub) => `<button class="tile" data-a="${a}" type="button">${icon(ic)}<div><strong>${title}</strong><span>${sub}</span></div></button>`;
  return `<div class="grabZone" aria-hidden="true"><div class="grab"></div></div><div class="tiles">
    ${tile("panel-range", "range", "Zakres dni", "Urlop, L4 albo godziny dla wielu dni")}
    ${tile("panel-year", "stats", "Statystyki", "Godziny, wypłata i urlop w roku")}
    ${tile("panel-settings", "settings", "Ustawienia", "Stawka, szablony, dni robocze")}
    ${tile("panel-backup", "backup", "Kopia zapasowa", "Zapisz lub wczytaj dane")}
  </div>
  <div class="menuFoot"><button class="btn text" data-a="panel-info" type="button">O wersji testowej</button></div>`;
}

const panelTop = title => `<div class="panelBar"><button class="iconBtn" data-a="close-panel" type="button" aria-label="Wróć">${icon("back")}</button></div>
  <h2 class="panelTitle">${title}</h2>`;

// ---------- Zakres dni ----------
export const RANGE_WHAT = { hours: "godziny", paid: "urlop płatny", unpaid: "urlop bezpłatny", sick: "zwolnienie L4", off: "dzień wolny" };
export function rangeHTML(db, r, count) {
  const kinds = [["hours", "Godziny"], ["paid", "Urlop płatny"], ["unpaid", "Urlop bezpłatny"], ["sick", "Zwolnienie L4"], ["off", "Dzień wolny"]];
  const tpl = db.settings.shiftTemplates.map((t, i) => `<button class="qbtn" data-a="range-tpl" data-i="${i}" type="button">${t.start}–${t.end}</button>`).join("");
  const sw = (id, label, on) => `<label class="row"><span>${label}</span><input class="switch" type="checkbox" id="${id}" ${on ? "checked" : ""}></label>`;
  const what = RANGE_WHAT[r.kind];
  return `${panelTop("Zakres dni")}<div class="panelBody withBar">
    <div class="label">Co wpisać</div>
    <div class="pills">${kinds.map(([v, l]) => `<button type="button" data-a="range-kind" data-kind="${v}" data-v="${v === "hours" ? "" : v}" class="${r.kind === v ? "on" : ""}" aria-pressed="${r.kind === v}">${l}</button>`).join("")}</div>
    ${r.kind === "hours" ? `<div class="label">Godziny</div><div class="card"><div class="quick" style="margin:0 0 14px">${tpl}</div><div class="grid2">
        <div class="field"><label for="rStart">Wejście</label><input id="rStart" type="time" value="${r.start}"></div>
        <div class="field"><label for="rEnd">Wyjście</label><input id="rEnd" type="time" value="${r.end}"></div></div></div>` : ""}
    <div class="label">Dni</div>
    <div class="card"><div class="grid2">
      <div class="field"><label for="rFrom">Od</label><input id="rFrom" type="date" value="${r.from}"></div>
      <div class="field"><label for="rTo">Do</label><input id="rTo" type="date" value="${r.to}"></div></div></div>
    <div class="rows" style="margin-top:10px">${sw("rSat", "Uwzględnij soboty", r.sat)}${sw("rSun", "Uwzględnij niedziele", r.sun)}${sw("rHol", "Uwzględnij święta", r.hol)}</div>
    ${r.kind === "sick" ? `<p class="hint">Zwolnienie L4 liczy się w dniach kalendarzowych, dlatego obejmuje też weekendy i święta.</p>` : ""}
  </div>
  <div class="actionBar">
    <button class="btn block" data-a="range-apply" type="button" id="rangeApply" ${count ? "" : "disabled"}>${count ? `Zapisz ${what} dla ${count} ${pluralPL(count, "dnia", "dni", "dni")}` : "Brak dni w tym zakresie"}</button>
    <button class="btn text danger block" data-a="range-remove" type="button">Usuń ${r.kind === "hours" ? "te godziny" : "status"} z tych dni</button>
  </div>`;
}

// ---------- Statystyki roczne ----------
const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
export function yearHTML(db, year) {
  const t = yearTotals(db, year);
  const quota = Number(db.settings.leaveQuota) || 0, left = Math.max(0, quota - t.paid);
  const months = Array.from({ length: 12 }, (_, i) => monthTotals(db, `${year}-${pad2(i + 1)}`).min);
  const max = Math.max(...months, 1), cur = ym(todayISO());
  const bars = months.map((m, i) => `<div class="bar${`${year}-${pad2(i + 1)}` === cur ? " cur" : ""}" title="${fmtHM(m)}">
    <i style="height:${Math.round(m / max * 84)}px"></i><span>${MONTH_SHORT[i]}</span></div>`).join("");
  const row = (k, v) => `<div class="row"><span>${k}</span><span class="val">${v}</span></div>`;
  return `${panelTop("Statystyki")}<div class="panelBody">
    <div class="card">
      <div class="yearNav"><button class="iconBtn" data-a="year-prev" type="button" aria-label="Poprzedni rok">${icon("left")}</button>
        <strong>${year}</strong><button class="iconBtn" data-a="year-next" type="button" aria-label="Następny rok">${icon("right")}</button></div>
      <div class="bigValue">${fmtHM(t.min)}<small>godz.</small></div>
      <div class="subValue">${pln(t.money)} za ${dni(t.workDays)} pracy</div>
      <div class="bars" aria-label="Godziny w kolejnych miesiącach">${bars}</div>
    </div>
    <div class="label">Urlop płatny</div>
    <div class="card"><div class="bigValue" style="font-size:26px">${t.paid}<small>z ${quota} dni wykorzystane</small></div>
      <div class="meter"><i style="width:${quota ? Math.min(100, t.paid / quota * 100) : 0}%"></i></div>
      <p class="hint" style="margin:10px 0 0">Zostało ${dni(left)}.</p></div>
    <div class="label">Pozostałe nieobecności</div>
    <div class="rows">${row("Urlop bezpłatny", dni(t.unpaid))}${row("Zwolnienie L4", dni(t.sick))}${row("Dni wolne", dni(t.off))}</div>
  </div>`;
}

// ---------- Ustawienia ----------
export const THEMES = [["green", "Zieleń", "#1f5745"], ["navy", "Granat", "#24406b"], ["graphite", "Grafit", "#2b2b30"]];
export function settingsHTML(db, theme = "green") {
  const s = db.settings;
  const tpls = s.shiftTemplates.map((t, i) => `<span class="tplChip">${t.start}–${t.end}<button data-a="del-tpl" data-i="${i}" type="button" aria-label="Usuń szablon ${t.start}–${t.end}">${icon("close")}</button></span>`).join("");
  const sw = (key, label, on) => `<label class="row"><span>${label}</span><input class="switch" type="checkbox" data-setting="${key}" ${on ? "checked" : ""}></label>`;
  const step = (key, label, sub, val, unit) => `<div class="row"><span>${label}<small>${sub}</small></span>
    <div class="stepper"><button type="button" data-a="step" data-key="${key}" data-d="-1" aria-label="Mniej">−</button><output>${val}</output>
    <button type="button" data-a="step" data-key="${key}" data-d="1" aria-label="Więcej">+</button></div></div>`;
  const rate = s.rateHistory[s.rateHistory.length - 1];
  const themes = THEMES.map(([v, l, c]) => `<button class="themeBtn${theme === v ? " on" : ""}" data-a="theme" data-v="${v}" type="button" aria-pressed="${theme === v}"><i style="background:${c}"></i>${l}</button>`).join("");
  return `${panelTop("Ustawienia")}<div class="panelBody">
    <div class="label">Wygląd (do porównania w wersji testowej)</div>
    <div class="themes">${themes}</div>
    <div class="label">Rozliczenie</div>
    <div class="rows">
      <button class="row" data-a="sheet-rate" type="button"><span>Stawka godzinowa${s.rateHistory.length > 1 ? `<small>${s.rateHistory.length} zmiany w historii</small>` : ""}</span><span class="val">${pln(rate.rate)}</span>${icon("chev", "chev")}</button>
      ${step("leaveQuota", "Urlop płatny w roku", "Liczba dni do wykorzystania", s.leaveQuota)}
    </div>
    <div class="label">Szablony godzin</div>
    <div class="card"><div class="tplChips">${tpls}<button class="addChip" data-a="sheet-tpl-add" type="button">${icon("plus")}Dodaj</button></div>
      <p class="hint" style="margin:12px 0 0">Szablony pojawiają się przy każdym dniu – jedno dotknięcie zapisuje godziny.</p></div>
    <div class="label">Dni robocze</div>
    <div class="rows">${sw("defaultIncludeSat", "Pracuję w soboty", s.defaultIncludeSat)}${sw("defaultIncludeSun", "Pracuję w niedziele", s.defaultIncludeSun)}${sw("defaultIncludeHolidays", "Pracuję w święta", s.defaultIncludeHolidays)}</div>
    <p class="hint">Pusty dzień roboczy jest oznaczany jako „Brak wpisu”. Pozostałe puste dni są zwinięte jako wolne.</p>
    <div class="label">Kopia zapasowa</div>
    <div class="rows">${step("backupReminderDays", "Przypominaj o kopii", "Co ile dni", s.backupReminderDays)}</div>
  </div>`;
}
export function rateSheetHTML(db) {
  const h = db.settings.rateHistory;
  const list = [...h].map((r, i) => ({ r, i })).reverse().map(({ r, i }) => `<div><span><strong>${pln(r.rate)}</strong><small>${r.from <= RATE_START ? "od początku" : "od " + fmtFullDate(r.from)}</small></span>
    ${h.length > 1 ? `<button class="iconBtn" data-a="del-rate" data-i="${i}" type="button" aria-label="Usuń stawkę">${icon("trash")}</button>` : ""}</div>`).join("");
  return `<div class="grabZone" aria-hidden="true"><div class="grab"></div></div><div class="sheetHead"><h2>Stawka godzinowa</h2></div>
    <p class="hint" style="margin:8px 4px 0">Każda stawka obowiązuje od wskazanego dnia. Wcześniejsze dni liczą się starą stawką.</p>
    <div class="rateList" style="margin-top:16px">${list}</div>
    <div class="secTitle">Nowa stawka</div>
    <div class="grid2">
      <div class="field"><label for="rateVal">Kwota za godzinę</label><input id="rateVal" type="number" step="0.01" min="0" inputmode="decimal" placeholder="np. 35,00"></div>
      <div class="field"><label for="rateFrom">Obowiązuje od</label><input id="rateFrom" type="date" value="${ym(todayISO())}-01"></div></div>
    <div class="sheetFoot"><button class="btn block" data-a="add-rate" type="button">Zapisz nową stawkę</button></div>`;
}
export function tplSheetHTML() {
  return `<div class="grabZone" aria-hidden="true"><div class="grab"></div></div><div class="sheetHead"><h2>Nowy szablon godzin</h2></div>
    <div class="grid2" style="margin-top:18px">
      <div class="field"><label for="tplStart">Wejście</label><input id="tplStart" type="time"></div>
      <div class="field"><label for="tplEnd">Wyjście</label><input id="tplEnd" type="time"></div></div>
    <div class="sheetFoot"><button class="btn block" data-a="add-tpl" type="button">Dodaj szablon</button></div>`;
}

// ---------- Kopia zapasowa ----------
export function backupHTML(meta, canShare, hasMain) {
  const last = meta.lastBackup ? fmtFullDate(meta.lastBackup.slice(0, 10)) : "";
  return `${panelTop("Kopia zapasowa")}<div class="panelBody">
    <div class="card">
      <div class="bigValue" style="font-size:24px">${last ? `Ostatnia kopia: ${last}` : "Nie masz jeszcze kopii"}</div>
      <p class="hint" style="margin:8px 0 18px">Kopia to jeden plik z wszystkimi danymi. Najlepiej wysłać ją poza telefon – na Dysk albo mailem.</p>
      <div class="stack">
        ${canShare ? `<button class="btn block" data-a="share-backup" type="button">Udostępnij kopię</button>` : ""}
        <button class="btn ${canShare ? "tonal" : ""} block" data-a="download-backup" type="button">Pobierz kopię do telefonu</button>
        <button class="btn text block" data-a="import" type="button">Wczytaj kopię z pliku</button>
      </div></div>
    <div class="label">Wersja testowa</div>
    <div class="card"><p class="hint" style="margin:0 0 14px">Kopiuje aktualne dane z aplikacji Czas pracy. Główna aplikacja nie jest zmieniana.</p>
      <button class="btn tonal block" data-a="copy-main" type="button" ${hasMain ? "" : "disabled"}>${hasMain ? "Skopiuj dane z Czasu pracy" : "Na tym telefonie nie ma danych Czasu pracy"}</button></div>
  </div>`;
}

export function infoHTML(version) {
  return `${panelTop("O wersji testowej")}<div class="panelBody"><div class="card">
    <div class="bigValue" style="font-size:22px">Czas pracy ${version}</div>
    <p class="hint" style="margin:10px 0 0">To wersja testowa nowego wyglądu. Zapisuje dane osobno, więc główna aplikacja Czas pracy nie jest przez nią zmieniana.</p>
    <p class="hint" style="margin:10px 0 0">Godziny wpisane tutaj przeniesiesz do głównej aplikacji tak: zrób tu kopię, a w głównej aplikacji wczytaj ją i wybierz „Scal”.</p>
  </div></div>`;
}
