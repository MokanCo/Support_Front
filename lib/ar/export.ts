/**
 * Client-side export helpers for Accounts reports.
 *
 * CSV and Excel are generated in the browser from the rows already on screen,
 * so an export always matches exactly what the user is looking at (filters
 * included). PDF is produced through the browser print dialog because the
 * backend only renders PDFs for invoices, not for reports.
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlEscape(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const content = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
  triggerDownload(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`,
  );
}

/**
 * Spreadsheet export as an Excel-readable HTML workbook. This keeps the app
 * dependency-free; Excel, Numbers, and Sheets all open the resulting .xls.
 */
export function exportExcel(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const table = `
    <table border="1">
      <thead>
        <tr><th colspan="${headers.length}" style="font-size:14pt;text-align:left">${htmlEscape(
          title,
        )}</th></tr>
        <tr>${headers.map((h) => `<th>${htmlEscape(h)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body>${table}</body></html>`;
  triggerDownload(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    `${filename}.xls`,
  );
}

/** Opens the print dialog; the user can save as PDF from there. */
export function printReport() {
  window.print();
}
