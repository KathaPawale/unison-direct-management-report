# Unison Direct Management Reporting

Management reporting web application for **Unison Direct GCC INC**.

## Workflow

Upload a QuickBooks-style Excel workbook → parsed automatically → analytical dashboard →
review & edit with impact analysis → management report preview → download PDF / styled Excel.

## Features

- **QuickBooks workbook parsing** — detects P&L (Monthly / Comparative / % of Income),
  Balance Sheet (current vs prior), A/R & A/P aging summaries, and supplementary sheets;
  reads real month labels, account hierarchy and subtotal structure from the file.
- **Analytical dashboard** — KPI tiles with prior-year variance, monthly revenue vs net
  income, net-margin trend, current-vs-prior-year comparison, expense breakdown,
  aging buckets, balance-sheet composition, and management-attention alerts.
- **Review & edit with impact analysis** — every numeric edit opens a QuickBooks-style
  popup showing exactly which subtotals, statement totals and Balance Sheet lines are
  affected (deterministic cascade with a live balance check), and applies the
  adjustments on confirmation. A monthly P&L edit also syncs the comparative view.
- **AI explanations (optional)** — add a Groq API key in Settings and the impact popup
  includes a plain-English explanation and cautions. Fully functional without a key.
- **Management report** — cover page with branded skyline artwork, table of contents
  with real page numbers, multi-page analytical dashboard section, paginated financial
  statements (long P&Ls span pages — nothing is clipped), aging summaries, editable
  Notes to Financial Statements (section 9), the mandatory management-purpose
  disclaimer, and an authorised-signatory block.
- **Edit highlighting** — manual edits and automatic adjustments show in red in the
  report preview only; downloaded PDF and Excel files are clean.
- **Exports** — 20-page PDF (rendered page by page), a styled Excel report
  (navy headers, indent hierarchy, bordered totals) and the raw data workbook.
- **Session persistence** — the processed workbook, edits, notes and signatory are
  auto-saved to the browser (localStorage) and restored on reload.

## Structure

```
index.html            app shell (6 pages + Settings, impact modal)
src/core/util.js      shared helpers
src/core/state.js     state + localStorage persistence
src/core/parser.js    workbook parsing: roles, columns, hierarchy, metrics
src/core/recompute.js deterministic impact / recompute engine
src/core/groq.js      Groq API client (impact narratives)
src/report/charts.js  SVG chart builders (dashboard + report)
src/report/report.js  report builder with DOM-measured pagination
src/report/exports.js PDF + styled Excel + raw data exports
src/app.js            navigation, upload, dashboard, editor, settings wiring
css/style.css         application styling
css/report.css        report page styling (preview + PDF)
```

Libraries (CDN): [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) (SheetJS +
style writer), [html2canvas](https://html2canvas.hertzen.com/), [jsPDF](https://github.com/parallax/jsPDF).

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

Import this GitHub repository into Vercel. The project is a static web application and
includes `vercel.json`.

## Confidentiality

Financial information processed by this tool remains in the user's browser (localStorage
only). The optional Groq API key is stored in the browser and sent only to api.groq.com,
and only the edited line and its computed adjustments are shared — never the workbook.
Client workbooks must not be committed to this repository (`.gitignore` blocks `*.xlsx`).
