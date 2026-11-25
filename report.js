// Raport miesięczny A4 dla pracodawcy: pełna ewidencja wszystkich dni miesiąca.
// Otwierany w nowej karcie i drukowany (albo „Zapisz jako PDF”). Czcionka Google Sans jest
// wbudowana w sam raport (data URL), bo karta raportu nie ma dostępu do plików aplikacji.
import {
  monthDays, getDay, dayMinutes, fmtHM, pln, escapeHtml, monthTitle, weekdayIndex, holidayName,
  monthTotals, STATUS_LABEL, dayStatus, rateFor, pluralPL, isWorkday, todayISO, fmtFullDate
} from "./data.js";

const WD = ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."];
const dni = n => `${n} ${pluralPL(n, "dzień", "dni", "dni")}`;

export function buildReportHTML(db, month, opts = {}) {
  const color = opts.color || { accent: "#1f5745", soft: "#e2efe8" };
  const t = monthTotals(db, month);
  const rates = [...new Set(monthDays(month).map(iso => rateFor(db.settings, iso)))];
  const showPay = db.settings.reportShowPay !== false && t.money > 0;

  const rows = monthDays(month).map((iso, i) => {
    const day = getDay(db, iso), min = day ? dayMinutes(day) : 0, status = dayStatus(day);
    const wd = weekdayIndex(iso), hol = holidayName(iso), free = !isWorkday(iso, db.settings);
    const hours = (day?.shifts || []).map(s => `${s.start}–${s.end}`).join(", ");
    const badge = status ? `<span class="badge ${status}">${STATUS_LABEL[status]}</span>` : "";
    const notes = [hol, day?.note?.trim()].filter(Boolean).map(escapeHtml).join(" · ");
    const cls = [free && !min && !status ? "free" : "", status ? "st-" + status : "", wd === 0 && i > 0 ? "wk" : ""].filter(Boolean).join(" ");
    return `<tr class="${cls}">
      <td class="c-date">${+iso.slice(8)}.${iso.slice(5, 7)}</td>
      <td class="c-dow${wd === 6 || hol ? " red" : ""}">${WD[wd]}</td>
      <td class="c-hours">${badge}${hours ? `<span>${escapeHtml(hours)}</span>` : (badge ? "" : `<span class="dash">–</span>`)}</td>
      <td class="c-sum">${min ? fmtHM(min) : ""}</td>
      <td class="c-note">${notes}</td></tr>`;
  }).join("");

  const stat = (value, label, cls = "") => `<div class="stat ${cls}"><strong>${value}</strong><span>${label}</span></div>`;
  const stats = [
    stat(fmtHM(t.min), "godzin łącznie", "main"),
    stat(t.workDays, pluralPL(t.workDays, "dzień pracy", "dni pracy", "dni pracy")),
    t.paid && stat(t.paid, "urlop płatny"),
    t.unpaid && stat(t.unpaid, "urlop bezpłatny"),
    t.sick && stat(t.sick, "zwolnienie L4"),
    t.off && stat(t.off, pluralPL(t.off, "dzień wolny", "dni wolne", "dni wolnych")),
    showPay && stat(pln(t.money), "wypłata (szacunkowo)")
  ].filter(Boolean).join("");

  const fontFace = opts.font ? `
  @font-face { font-family: "Google Sans"; src: url(${opts.font.ext}) format("woff2"); font-weight: 400 700;
    unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
  @font-face { font-family: "Google Sans"; src: url(${opts.font.latin}) format("woff2"); font-weight: 400 700;
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }` : "";

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ewidencja czasu pracy – ${escapeHtml(monthTitle(month))}</title>
<style>${fontFace}
  @page { size: A4; margin: 12mm 12mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Google Sans", system-ui, Arial, sans-serif; color: #15201b; background: #fff; font-size: 12px;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc { max-width: 186mm; margin: 0 auto; padding: 16px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .kind { color: ${color.accent}; font-weight: 600; font-size: 13px; }
  h1 { margin: 2px 0 0; font-size: 26px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; }
  .meta { text-align: right; color: #6b7772; font-size: 11px; line-height: 1.6; }
  .stats { display: flex; flex-wrap: wrap; gap: 6px 26px; align-items: flex-end; background: ${color.soft}; border-radius: 14px; padding: 12px 18px; margin: 14px 0 12px; }
  .stat strong { display: block; font-size: 16px; font-weight: 700; line-height: 1.15; }
  .stat span { color: #4b5852; font-size: 10.5px; }
  .stat.main strong { font-size: 22px; color: ${color.accent}; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; color: #6b7772; font-weight: 600; padding: 0 6px 5px; }
  td { padding: 3.5px 6px; border-top: 1px solid #edf1ef; vertical-align: top; line-height: 1.35; }
  tr.wk td { border-top: 1.5px solid #c9d4cf; }
  tr { break-inside: avoid; }
  .c-date { width: 44px; font-weight: 600; }
  .c-dow { width: 46px; color: #4b5852; }
  .c-dow.red { color: #b03d38; }
  .c-hours { width: 34%; }
  .c-sum { width: 52px; text-align: right; font-weight: 700; }
  th.c-sum { text-align: right; }
  .c-note { color: #4b5852; font-size: 11px; padding-left: 14px; }
  .dash { color: #b5bfba; }
  tr.free td { color: #9aa5a0; background: #f6f8f7; }
  tr.free .c-date { font-weight: 500; }
  tr.free .c-dow.red { color: #c98581; }
  .badge { display: inline-block; border-radius: 99px; padding: 0 8px; font-size: 10.5px; font-weight: 600; line-height: 17px; margin-right: 6px; }
  .badge.paid { background: #e6eefa; color: #2f5891; }
  .badge.unpaid { background: #eef0e3; color: #5c6330; }
  .badge.sick { background: #fbe9e8; color: #a23a36; }
  .badge.off { background: #edf2ef; color: #4b5852; }
  tfoot td { border-top: 2px solid ${color.accent}; font-weight: 700; padding-top: 7px; font-size: 13px; }
  .noprint { margin: 0 auto 4px; max-width: 186mm; display: flex; gap: 8px; padding: 12px 16px 0; }
  .noprint button { border: 0; border-radius: 99px; padding: 11px 20px; font: 600 14px "Google Sans", system-ui, sans-serif; background: ${color.accent}; color: #fff; }
  .noprint button.sec { background: ${color.soft}; color: ${color.accent}; }
  @media print { .noprint { display: none; } .doc { padding: 0; } }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Drukuj / zapisz PDF</button><button class="sec" onclick="window.close()">Zamknij</button></div>
<main class="doc">
  <header>
    <div><div class="kind">Ewidencja czasu pracy</div><h1>${escapeHtml(monthTitle(month))}</h1></div>
    <div class="meta">Wygenerowano ${fmtFullDate(todayISO())}${showPay ? `<br>Stawka ${escapeHtml(rates.map(r => pln(r) + "/h").join(", potem "))}` : ""}</div>
  </header>
  <section class="stats">${stats}</section>
  <table>
    <thead><tr><th class="c-date">Data</th><th class="c-dow">Dzień</th><th class="c-hours">Godziny pracy</th><th class="c-sum">Suma</th><th class="c-note">Uwagi</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3">Razem</td><td class="c-sum">${fmtHM(t.min)}</td><td></td></tr></tfoot>
  </table>
</main>
<script>document.fonts && document.fonts.ready.then(function(){ setTimeout(function(){ try { window.print(); } catch (e) {} }, 300); });</script>
</body></html>`;
}

// Otwiera raport w nowej karcie; gdy przeglądarka zablokuje okno – pobiera plik HTML.
export function openReport(db, month, opts) {
  const html = buildReportHTML(db, month, opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (win) return "opened";
  const a = document.createElement("a");
  a.href = url; a.download = `ewidencja-czasu-pracy_${month}.html`; a.click();
  return "downloaded";
}

// Wczytuje pliki czcionki z aplikacji (z pamięci offline) i zamienia je na data URL dla raportu.
export async function loadReportFont() {
  const toDataURL = async path => {
    const blob = await (await fetch(path)).blob();
    return await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(blob); });
  };
  const [latin, ext] = await Promise.all([toDataURL("fonts/google-sans-latin-wght-normal.woff2"), toDataURL("fonts/google-sans-latin-ext-wght-normal.woff2")]);
  return { latin: latin.replace(/^data:[^;]*/, "data:font/woff2"), ext: ext.replace(/^data:[^;]*/, "data:font/woff2") };
}
