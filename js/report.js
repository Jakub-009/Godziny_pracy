// Raport miesięczny A4 – otwierany w nowej karcie i drukowany (lub „Zapisz jako PDF”).
import {
  monthDays, getDay, dayMinutes, fmtHM, pln, escapeHtml, monthTitle, weekdayIndex, WD_SHORT, holidayName,
  monthTotals, STATUS_LABEL, dayStatus, rateFor, pluralPL, pad2
} from "./data.js";

const days = (n, one, few, many) => `${n} ${pluralPL(n, one, few, many)}`;

export function buildReportHTML(db, month, color = { accent: "${color.accent}", soft: "#e2efe8" }) {
  const t = monthTotals(db, month);
  const rows = [];
  for (const iso of monthDays(month)) {
    const day = getDay(db, iso);
    const min = day ? dayMinutes(day) : 0, status = dayStatus(day), note = day?.note?.trim() || "";
    if (!min && !status && !note) continue;
    const hours = (day?.shifts || []).map(s => `${s.start}–${s.end}`).join(", ");
    const badge = status ? `<span class="badge ${status}">${STATUS_LABEL[status]}</span>` : "";
    const hol = holidayName(iso);
    rows.push(`<tr class="${status ? "st-" + status : ""}">
      <td class="c-date"><strong>${+iso.slice(8)}.${iso.slice(5, 7)}</strong></td>
      <td class="c-dow">${WD_SHORT[weekdayIndex(iso)]}${hol ? `<small>${escapeHtml(hol)}</small>` : ""}</td>
      <td class="c-hours">${badge}${hours ? `<span>${escapeHtml(hours)}</span>` : ""}</td>
      <td class="c-sum">${min ? fmtHM(min) : "—"}</td>
      <td class="c-note">${note ? escapeHtml(note.length > 90 ? note.slice(0, 90) + "…" : note) : ""}</td>
    </tr>`);
  }
  // Stawki obowiązujące w tym miesiącu (zwykle jedna).
  const rates = [...new Set(monthDays(month).map(iso => rateFor(db.settings, iso)))];
  const rateText = rates.map(r => pln(r) + "/h").join(" → ");
  const chips = [
    t.paid && `<span class="badge paid">${days(t.paid, "dzień", "dni", "dni")} urlopu płatnego</span>`,
    t.unpaid && `<span class="badge unpaid">${days(t.unpaid, "dzień", "dni", "dni")} urlopu bezpłatnego</span>`,
    t.sick && `<span class="badge sick">${days(t.sick, "dzień", "dni", "dni")} zwolnienia L4</span>`,
    t.off && `<span class="badge off">${t.off} ${pluralPL(t.off, "dzień wolny", "dni wolne", "dni wolnych")}</span>`
  ].filter(Boolean).join("");
  const now = new Date();
  const gen = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Raport godzin – ${escapeHtml(monthTitle(month))}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, Roboto, "Segoe UI", Arial, sans-serif; color: #18211e; background: #fff; font-size: 12px;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc { max-width: 190mm; margin: 0 auto; padding: 16px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid ${color.accent}; padding-bottom: 10px; }
  .eyebrow { color: ${color.accent}; font-weight: 600; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
  h1 { margin: 2px 0 0; font-size: 22px; font-weight: 650; }
  .meta { text-align: right; color: #5b6762; font-size: 11px; line-height: 1.5; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0 10px; }
  .box { border: 1px solid #dfe6e3; border-radius: 10px; padding: 10px 12px; }
  .box strong { display: block; font-size: 20px; font-weight: 650; font-variant-numeric: tabular-nums; }
  .box span { color: #5b6762; font-size: 11px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .badge { display: inline-block; border-radius: 99px; padding: 2px 8px; font-size: 10.5px; font-weight: 600; margin-right: 6px; }
  .badge.paid { background: #e6eefa; color: #2f5891; } .badge.unpaid { background: #eef0e6; color: #5c6330; }
  .badge.sick { background: #fbe9e8; color: #a23a36; } .badge.off { background: #eef1f0; color: #46524d; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10.5px; color: #5b6762; font-weight: 600; border-bottom: 1px solid #cfd8d4; padding: 6px 6px; }
  td { border-bottom: 1px solid #edf1ef; padding: 6px; vertical-align: top; font-variant-numeric: tabular-nums; }
  tr { break-inside: avoid; }
  .c-date { width: 52px; } .c-dow { width: 64px; color: #46524d; } .c-dow small { display: block; color: #a23a36; font-size: 9.5px; }
  .c-sum { width: 52px; text-align: right; font-weight: 600; } th.c-sum { text-align: right; }
  .c-note { color: #46524d; width: 34%; }
  tr.st-paid td { background: #f8fafd; } tr.st-sick td { background: #fdf8f8; } tr.st-unpaid td { background: #fafbf6; }
  tfoot td { border-top: 2px solid ${color.accent}; border-bottom: 0; font-weight: 650; padding-top: 8px; }
  footer { margin-top: 14px; color: #87938e; font-size: 10px; display: flex; justify-content: space-between; }
  .noprint { margin: 0 auto 12px; max-width: 190mm; display: flex; gap: 8px; padding: 12px 16px 0; }
  .noprint button { border: 0; border-radius: 99px; padding: 10px 18px; font: 600 14px system-ui; background: ${color.accent}; color: #fff; }
  .noprint button.sec { background: ${color.soft}; color: ${color.accent}; }
  @media print { .noprint { display: none; } .doc { padding: 0; } }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Drukuj / zapisz PDF</button><button class="sec" onclick="window.close()">Zamknij</button></div>
<main class="doc">
  <header>
    <div><div class="eyebrow">Raport godzin pracy</div><h1>${escapeHtml(monthTitle(month))}</h1></div>
    <div class="meta">Wygenerowano ${gen}<br>Stawka: ${escapeHtml(rateText)}</div>
  </header>
  <section class="summary">
    <div class="box"><strong>${fmtHM(t.min)}</strong><span>Łącznie godzin</span></div>
    <div class="box"><strong>${escapeHtml(pln(t.money))}</strong><span>Szacowana wypłata</span></div>
    <div class="box"><strong>${t.workDays}</strong><span>${pluralPL(t.workDays, "Dzień pracy", "Dni pracy", "Dni pracy")}</span></div>
  </section>
  ${chips ? `<div class="chips">${chips}</div>` : ""}
  <table>
    <thead><tr><th class="c-date">Data</th><th class="c-dow">Dzień</th><th>Godziny / status</th><th class="c-sum">Suma</th><th class="c-note">Notatka</th></tr></thead>
    <tbody>${rows.join("") || `<tr><td colspan="5">Brak wpisów w tym miesiącu.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">Razem</td><td class="c-sum">${fmtHM(t.min)}</td><td></td></tr></tfoot>
  </table>
  <footer><span>Czas pracy · raport wygenerowany lokalnie na telefonie</span><span>${escapeHtml(monthTitle(month))}</span></footer>
</main>
<script>setTimeout(function(){ try { window.print(); } catch (e) {} }, 400);</script>
</body></html>`;
}

// Otwiera raport w nowej karcie; gdy przeglądarka zablokuje okno – pobiera plik HTML.
export function openReport(db, month, color) {
  const html = buildReportHTML(db, month, color);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (win) return "opened";
  const a = document.createElement("a");
  a.href = url; a.download = `raport-godzin_${month}.html`; a.click();
  return "downloaded";
}
