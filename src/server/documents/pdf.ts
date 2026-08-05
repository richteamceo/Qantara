import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Shared document-generation service — DOCUMENT_AND_REPORT_GENERATION_
 * STANDARD.md §Ownership: "Document generation is a shared service ...
 * no stage builds its own PDF generation path." Server-side only
 * (pdf-lib, no headless browser), never a print of a live screen.
 *
 * No approved visual template exists for print documents in
 * 07_REFERENCE_ASSETS (only web-page screenshots) — this layout is a
 * first real generation pass, not matched against an approved PDF
 * design authority. Disclosed in CHECKPOINT_8_REPORT.md.
 */

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

export type DocBuilder = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

export async function createDocument(): Promise<DocBuilder> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, page, font, bold, y: PAGE_HEIGHT - MARGIN };
}

const INK = rgb(0.067, 0.09, 0.153); // matches --c1x-ink
const MUTED = rgb(0.4, 0.44, 0.52); // matches --c1x-muted
const LINE = rgb(0.867, 0.886, 0.918); // matches --c1x-line

export function drawTitleBlock(b: DocBuilder, orgName: string, docType: string, reference: string, status: string) {
  b.page.drawText(orgName, { x: MARGIN, y: b.y, size: 10, font: b.font, color: MUTED });
  b.y -= 22;
  b.page.drawText(docType, { x: MARGIN, y: b.y, size: 18, font: b.bold, color: INK });
  b.page.drawText(`${reference} — ${status}`, {
    x: PAGE_WIDTH - MARGIN - b.font.widthOfTextAtSize(`${reference} — ${status}`, 11),
    y: b.y + 2,
    size: 11,
    font: b.font,
    color: MUTED,
  });
  b.y -= 14;
  b.page.drawLine({ start: { x: MARGIN, y: b.y }, end: { x: PAGE_WIDTH - MARGIN, y: b.y }, thickness: 1, color: LINE });
  b.y -= 20;
}

export function drawKeyValueGrid(b: DocBuilder, pairs: [string, string][]) {
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  let row = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    const rowY = b.y - row * 30;
    for (let c = 0; c < 2; c++) {
      const pair = pairs[i + c];
      if (!pair) continue;
      const x = MARGIN + c * colWidth;
      b.page.drawText(pair[0], { x, y: rowY, size: 8, font: b.font, color: MUTED });
      b.page.drawText(pair[1], { x, y: rowY - 13, size: 10, font: b.bold, color: INK });
    }
    row++;
  }
  b.y -= row * 30 + 10;
}

export function drawSectionHeading(b: DocBuilder, text: string) {
  b.page.drawText(text.toUpperCase(), { x: MARGIN, y: b.y, size: 9, font: b.bold, color: MUTED });
  b.y -= 16;
}

export type TableColumn = { label: string; width: number; align?: "left" | "right" };

/** Truncates text with an ellipsis so it never overflows its column, regardless of content length. */
function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "…";
  let result = text;
  while (result.length > 0 && font.widthOfTextAtSize(result + ellipsis, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + ellipsis;
}

const CELL_PADDING = 8;

export function drawTable(b: DocBuilder, columns: TableColumn[], rows: string[][]) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  const availableWidth = PAGE_WIDTH - MARGIN * 2;
  if (totalWidth > availableWidth) {
    throw new Error(`drawTable: column widths sum to ${totalWidth}pt, page only has ${availableWidth}pt available`);
  }

  let x = MARGIN;
  const headerY = b.y;
  for (const col of columns) {
    const label = truncateToWidth(b.bold, col.label, 8, col.width - CELL_PADDING);
    const tx = col.align === "right" ? x + col.width - b.bold.widthOfTextAtSize(label, 8) : x;
    b.page.drawText(label, { x: tx, y: headerY, size: 8, font: b.bold, color: MUTED });
    x += col.width;
  }
  b.y -= 6;
  b.page.drawLine({ start: { x: MARGIN, y: b.y }, end: { x: PAGE_WIDTH - MARGIN, y: b.y }, thickness: 0.5, color: LINE });
  b.y -= 16;

  for (const row of rows) {
    x = MARGIN;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const cell = truncateToWidth(b.font, row[i] ?? "", 9, col.width - CELL_PADDING);
      const tx = col.align === "right" ? x + col.width - b.font.widthOfTextAtSize(cell, 9) : x;
      b.page.drawText(cell, { x: tx, y: b.y, size: 9, font: b.font, color: INK });
      x += col.width;
    }
    b.y -= 18;
  }
  b.y -= 8;
  b.page.drawLine({ start: { x: MARGIN, y: b.y }, end: { x: PAGE_WIDTH - MARGIN, y: b.y }, thickness: 1, color: LINE });
  b.y -= 20;
}

export function drawTotalsBlock(b: DocBuilder, lines: [string, string, boolean?][]) {
  const valueColumnWidth = 100;
  const labelColumnWidth = 280;
  const gap = 12;
  const labelX = PAGE_WIDTH - MARGIN - valueColumnWidth - gap - labelColumnWidth;
  for (const [label, value, bold] of lines) {
    const font = bold ? b.bold : b.font;
    const labelSize = bold ? 10 : 9;
    const valueSize = bold ? 11 : 9;
    const truncatedLabel = truncateToWidth(font, label, labelSize, labelColumnWidth);
    b.page.drawText(truncatedLabel, { x: labelX, y: b.y, size: labelSize, font, color: bold ? INK : MUTED });
    b.page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(value, valueSize),
      y: b.y,
      size: valueSize,
      font,
      color: INK,
    });
    b.y -= bold ? 18 : 15;
  }
  b.y -= 10;
}

export function drawNote(b: DocBuilder, text: string) {
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (b.font.widthOfTextAtSize(candidate, 8) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  for (const l of lines) {
    b.page.drawText(l, { x: MARGIN, y: b.y, size: 8, font: b.font, color: MUTED });
    b.y -= 12;
  }
  b.y -= 8;
}

/**
 * DOCUMENT_AND_REPORT_GENERATION_STANDARD.md §Generation mechanics:
 * "Every generated document embeds: generation timestamp, the certified
 * source record's ID and version ... so a printed document is
 * independently traceable back to its exact source state." No document
 * versioning field exists on any table yet (disclosed gap) — sourceId is
 * the record's database UUID, "version" is stated as "1 (no amendment/
 * revision tracking yet)" rather than fabricated.
 */
export function drawFooter(b: DocBuilder, sourceRecordId: string) {
  const footerY = MARGIN;
  b.page.drawLine({ start: { x: MARGIN, y: footerY + 22 }, end: { x: PAGE_WIDTH - MARGIN, y: footerY + 22 }, thickness: 0.5, color: LINE });
  const generatedAt = new Date().toISOString();
  b.page.drawText(
    `Generated ${generatedAt} — source record ${sourceRecordId}, version 1 (no amendment/revision tracking yet) — CORE1X V7`,
    { x: MARGIN, y: footerY + 8, size: 7, font: b.font, color: MUTED }
  );
}

export async function finish(b: DocBuilder): Promise<Uint8Array> {
  return b.doc.save();
}
