import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// ─── Colours (Cognentrz brand) ────────────────────────────────────────────────
const C = {
  purple:    rgb(0.545, 0.361, 0.965),   // #8b5cf6
  purpleDk:  rgb(0.427, 0.165, 0.867),   // #6d28d9
  green:     rgb(0.204, 0.831, 0.600),   // #34d399
  greenDk:   rgb(0.022, 0.588, 0.412),   // #059669
  red:       rgb(0.984, 0.443, 0.443),   // #fb7185
  yellow:    rgb(0.984, 0.749, 0.267),   // #fbbf24
  dark:      rgb(0.055, 0.082, 0.055),   // #0e150e
  charcoal:  rgb(0.153, 0.200, 0.153),   // #273327
  gray:      rgb(0.510, 0.565, 0.510),   // #829082
  lightGray: rgb(0.894, 0.910, 0.894),   // #e4e8e4
  white:     rgb(1.000, 1.000, 1.000),
  offWhite:  rgb(0.965, 0.973, 0.965),   // #f6f8f6
};

export interface PdfReportInput {
  // user
  userName: string;
  userPhone: string;
  userEmail?: string;
  // farm
  farmName: string;
  farmLocation?: string;
  farmArea?: number;
  cropType?: string;
  // analysis
  analysisId: string;
  analysisDate: Date;
  soilHealthScore: number;
  moistureLevel: number;
  fertilityScore: number;
  erosionRisk: number;
  waterStress?: number;
  ndvi: number;
  evi?: number;
  savi?: number;
  ndwi?: number;
  lst: number;
  ph?: number;
  organicCarbon?: number;
  nitrogen?: number;
  trend: string;
  // weather
  weather: { temperature: number; humidity: number; description: string; windSpeed?: number; rainfall?: number };
  // recs
  recommendations: { title: string; description: string; priority: string; category?: string }[];
}

// ─── Helper: draw a rounded rectangle ────────────────────────────────────────
function roundRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, fillColor: any, borderColor?: any) {
  page.moveTo(x + r, y);
  page.drawRectangle({ x, y, width: w, height: h, color: fillColor, borderColor, borderWidth: borderColor ? 0.5 : 0 });
}

// ─── Helper: progress bar ────────────────────────────────────────────────────
function drawProgressBar(page: PDFPage, x: number, y: number, w: number, h: number, pct: number, color: any) {
  // Track
  page.drawRectangle({ x, y, width: w, height: h, color: C.lightGray, borderWidth: 0 });
  // Fill
  const fillW = Math.max(4, (w * Math.min(pct, 100)) / 100);
  page.drawRectangle({ x, y, width: fillW, height: h, color, borderWidth: 0 });
}

// ─── Helper: section header ───────────────────────────────────────────────────
function sectionHeader(page: PDFPage, bold: PDFFont, text: string, x: number, y: number, pageW: number) {
  page.drawText(text, { x, y, size: 9, font: bold, color: C.gray });
  page.drawLine({ start: { x: x + bold.widthOfTextAtSize(text, 9) + 8, y: y + 4 }, end: { x: pageW - 40, y: y + 4 }, thickness: 0.5, color: C.lightGray });
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateSoilReportPDF(data: PdfReportInput): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const W    = 595;   // A4 width  (points)
  const H    = 842;   // A4 height (points)
  const page = doc.addPage([W, H]);

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  // ── utility: y from top ────────────────────────────────────────────────────
  const t = (fromTop: number) => H - fromTop;

  // ═══════════════════════════════════════════════════════════════════
  // 1. HEADER BAR (dark green gradient simulation with two rects)
  // ═══════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: t(72), width: W, height: 72, color: C.dark });
  page.drawRectangle({ x: 0, y: t(72), width: 6,  height: 72, color: C.purple });

  // Logo: leaf icon (simple square shape)
  page.drawRectangle({ x: 40, y: t(50), width: 22, height: 22, color: C.green });
  page.drawText('C', { x: 46, y: t(43), size: 14, font: fontBold, color: C.dark });

  // Brand name
  page.drawText('COGNENTRZ', { x: 70, y: t(38), size: 18, font: fontBold, color: C.white });
  page.drawText('Soil Intelligence Platform', { x: 71, y: t(54), size: 8, font: fontReg, color: rgb(0.7, 0.85, 0.7) });

  // Report title (right-aligned)
  page.drawText('SOIL ANALYSIS REPORT', { x: 340, y: t(38), size: 13, font: fontBold, color: C.white });
  page.drawText(`Report ID: ${data.analysisId.slice(0, 8).toUpperCase()}`, { x: 374, y: t(54), size: 7.5, font: fontReg, color: rgb(0.6, 0.75, 0.6) });

  // ═══════════════════════════════════════════════════════════════════
  // 2. INFO STRIP (light background)
  // ═══════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: t(140), width: W, height: 68, color: C.offWhite });

  const dateStr = data.analysisDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = data.analysisDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const infoItems = [
    { label: 'FARMER',    value: data.userName },
    { label: 'PHONE',     value: data.userPhone },
    { label: 'FARM',      value: data.farmName },
    { label: 'CROP',      value: data.cropType || 'Mixed' },
    { label: 'AREA',      value: data.farmArea ? `${data.farmArea} ha` : 'N/A' },
    { label: 'DATE',      value: `${dateStr} · ${timeStr}` },
  ];

  let infoX = 40;
  infoItems.forEach((item, i) => {
    const colW = i < 2 ? 130 : i < 4 ? 100 : 115;
    page.drawText(item.label, { x: infoX, y: t(98),  size: 6.5, font: fontBold, color: C.gray });
    page.drawText(item.value, { x: infoX, y: t(113), size: 8,   font: fontBold, color: C.charcoal });
    infoX += colW;
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. SOIL HEALTH SCORE — large coloured block
  // ═══════════════════════════════════════════════════════════════════
  const score      = data.soilHealthScore;
  const scoreColor = score >= 70 ? C.green : score >= 50 ? C.yellow : C.red;
  const scoreLabel = score >= 70 ? 'HEALTHY' : score >= 50 ? 'FAIR CONDITION' : 'NEEDS ATTENTION';

  page.drawRectangle({ x: 40, y: t(230), width: 170, height: 78, color: scoreColor });
  page.drawText(`${score}`, {
    x: score >= 100 ? 58 : score >= 10 ? 65 : 82,
    y: t(207), size: 52, font: fontBold, color: C.white,
  });
  page.drawText('/ 100', { x: 130, y: t(207), size: 13, font: fontReg,  color: rgb(0.85, 0.85, 0.85) });
  page.drawText('SOIL HEALTH SCORE', { x: 49, y: t(224), size: 7.5, font: fontBold, color: C.white });

  page.drawRectangle({ x: 220, y: t(230), width: 335, height: 78, color: C.dark });
  page.drawText(scoreLabel, { x: 234, y: t(200), size: 17, font: fontBold, color: scoreColor });
  page.drawText(`Trend: ${data.trend}`, { x: 234, y: t(218), size: 9, font: fontReg, color: rgb(0.75, 0.85, 0.75) });
  page.drawText(
    score >= 70
      ? 'Your field is in excellent condition. Keep monitoring regularly.'
      : score >= 50
      ? 'Moderate soil health. Address recommendations to improve.'
      : 'Immediate attention required. Follow the recommendations below.',
    { x: 234, y: t(227), size: 7.5, font: fontReg, color: rgb(0.6, 0.72, 0.6) }
  );

  // ═══════════════════════════════════════════════════════════════════
  // 4. KEY INDICATORS (two columns of progress bars)
  // ═══════════════════════════════════════════════════════════════════
  sectionHeader(page, fontBold, 'KEY SOIL INDICATORS', 40, t(260), W);

  const indicators = [
    { label: 'Plant Health',  value: data.moistureLevel,   color: C.green  },
    { label: 'Moisture',      value: data.moistureLevel,   color: rgb(0.22, 0.74, 0.96) },
    { label: 'Fertility',     value: data.fertilityScore,  color: C.purple },
    { label: 'Erosion Risk',  value: data.erosionRisk,     color: data.erosionRisk > 60 ? C.red : C.yellow },
    { label: 'Water Stress',  value: data.waterStress ?? 40, color: rgb(0.12, 0.60, 0.87) },
  ];

  let indY = 280;
  indicators.forEach((ind) => {
    const col = indicators.indexOf(ind) < 3 ? 0 : 1;
    const x   = col === 0 ? 40 : 330;
    const y   = col === 0 ? indY : indY - (indY - 280) % (indicators.length / 2 | 0) * 28;

    page.drawText(ind.label, { x, y: t(indY), size: 8, font: fontReg,  color: C.charcoal });
    page.drawText(`${ind.value}%`, { x: x + 195, y: t(indY), size: 8, font: fontBold, color: ind.color });
    drawProgressBar(page, x, t(indY + 13), 185, 6, ind.value, ind.color);
    if (col === 0) indY += 26;
  });

  // Two-column layout correction
  const colAIndicators = indicators.slice(0, 3);
  const colBIndicators = indicators.slice(3);

  // Reset and draw properly in 2 columns
  let colAY = 280;
  let colBY = 280;

  colAIndicators.forEach((ind) => {
    page.drawText(ind.label, { x: 40, y: t(colAY), size: 8, font: fontReg, color: C.charcoal });
    page.drawText(`${ind.value}%`, { x: 220, y: t(colAY), size: 8.5, font: fontBold, color: ind.color });
    drawProgressBar(page, 40, t(colAY + 13), 205, 5, ind.value, ind.color);
    colAY += 28;
  });

  colBIndicators.forEach((ind) => {
    page.drawText(ind.label, { x: 320, y: t(colBY), size: 8, font: fontReg, color: C.charcoal });
    page.drawText(`${ind.value}%`, { x: 500, y: t(colBY), size: 8.5, font: fontBold, color: ind.color });
    drawProgressBar(page, 320, t(colBY + 13), 205, 5, ind.value, ind.color);
    colBY += 28;
  });

  // Horizontal divider
  const dividerY = 370;
  page.drawLine({ start: { x: 40, y: t(dividerY) }, end: { x: W - 40, y: t(dividerY) }, thickness: 0.5, color: C.lightGray });

  // ═══════════════════════════════════════════════════════════════════
  // 5. SATELLITE + SOIL NUTRIENTS (two-column table)
  // ═══════════════════════════════════════════════════════════════════
  sectionHeader(page, fontBold, 'SATELLITE READINGS', 40, t(392), W);

  const satRows = [
    ['NDVI (Vegetation Index)',  data.ndvi.toFixed(4)],
    ['EVI (Enhanced Vegetation)', (data.evi ?? 0).toFixed(4)],
    ['SAVI (Soil Adjusted)',      (data.savi ?? 0).toFixed(4)],
    ['NDWI (Water Index)',        (data.ndwi ?? 0).toFixed(4)],
    ['LST (Surface Temp)',        `${data.lst.toFixed(1)} °C`],
  ];

  const nutRows = [
    ['pH Level',          data.ph ? data.ph.toFixed(1) : 'N/A'],
    ['Organic Carbon',    data.organicCarbon ? `${data.organicCarbon.toFixed(2)} g/kg` : 'N/A'],
    ['Nitrogen (N)',      data.nitrogen      ? `${data.nitrogen.toFixed(3)} g/kg` : 'N/A'],
  ];

  let rowY = 412;
  satRows.forEach(([label, value]) => {
    page.drawRectangle({ x: 40, y: t(rowY + 12), width: 245, height: 16, color: rowY % 56 === 0 ? C.offWhite : C.white });
    page.drawText(label, { x: 44, y: t(rowY + 4), size: 8, font: fontReg, color: C.charcoal });
    page.drawText(value, { x: 240, y: t(rowY + 4), size: 8, font: fontBold, color: C.dark });
    rowY += 18;
  });

  let nutY = 412;
  nutRows.forEach(([label, value]) => {
    page.drawRectangle({ x: 310, y: t(nutY + 12), width: 245, height: 16, color: nutY % 56 === 0 ? C.offWhite : C.white });
    page.drawText(label, { x: 314, y: t(nutY + 4), size: 8, font: fontReg, color: C.charcoal });
    page.drawText(value, { x: 510, y: t(nutY + 4), size: 8, font: fontBold, color: C.dark });
    nutY += 18;
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. WEATHER CONDITIONS
  // ═══════════════════════════════════════════════════════════════════
  const wY = 520;
  page.drawLine({ start: { x: 40, y: t(wY - 10) }, end: { x: W - 40, y: t(wY - 10) }, thickness: 0.5, color: C.lightGray });
  sectionHeader(page, fontBold, 'WEATHER CONDITIONS', 40, t(wY + 10), W);

  const wBoxes = [
    { label: 'TEMPERATURE',  value: `${Math.round(data.weather.temperature)}°C` },
    { label: 'HUMIDITY',     value: `${data.weather.humidity}%` },
    { label: 'WIND SPEED',   value: `${Math.round(data.weather.windSpeed ?? 0)} km/h` },
    { label: 'RAINFALL',     value: `${(data.weather.rainfall ?? 0).toFixed(1)} mm` },
    { label: 'CONDITIONS',   value: data.weather.description || 'Partly Cloudy' },
  ];

  let wX = 40;
  wBoxes.forEach((b) => {
    page.drawRectangle({ x: wX, y: t(wY + 55), width: 101, height: 40, color: C.offWhite });
    page.drawText(b.label, { x: wX + 6, y: t(wY + 34), size: 6, font: fontBold, color: C.gray });
    page.drawText(b.value, { x: wX + 6, y: t(wY + 48), size: b.value.length > 10 ? 7.5 : 10, font: fontBold, color: C.dark });
    wX += 105;
  });

  // ═══════════════════════════════════════════════════════════════════
  // 7. AI RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════
  const recStartY = 605;
  page.drawLine({ start: { x: 40, y: t(recStartY - 12) }, end: { x: W - 40, y: t(recStartY - 12) }, thickness: 0.5, color: C.lightGray });
  sectionHeader(page, fontBold, 'AI RECOMMENDATIONS', 40, t(recStartY), W);

  data.recommendations.slice(0, 4).forEach((rec, i) => {
    const recY     = recStartY + 22 + i * 36;
    const pColor   = rec.priority === 'high' ? C.red : rec.priority === 'medium' ? C.yellow : C.green;
    const pLabel   = rec.priority.toUpperCase();

    // Priority badge
    page.drawRectangle({ x: 40, y: t(recY + 18), width: 46, height: 14, color: pColor });
    page.drawText(pLabel, { x: 42, y: t(recY + 9), size: 6.5, font: fontBold, color: C.white });

    // Number
    page.drawText(`${i + 1}.`, { x: 93, y: t(recY + 9), size: 9, font: fontBold, color: C.charcoal });

    // Title
    page.drawText(rec.title, { x: 108, y: t(recY + 9), size: 9, font: fontBold, color: C.dark });

    // Description (truncate to ~80 chars)
    const desc = rec.description.slice(0, 88) + (rec.description.length > 88 ? '…' : '');
    page.drawText(desc, { x: 108, y: t(recY + 21), size: 7.5, font: fontReg, color: C.gray });

    // Light separator
    if (i < 3) {
      page.drawLine({ start: { x: 40, y: t(recY + 26) }, end: { x: W - 40, y: t(recY + 26) }, thickness: 0.3, color: C.lightGray });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. FOOTER
  // ═══════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: 0, width: W, height: 48, color: C.dark });
  page.drawRectangle({ x: 0, y: 44,  width: W, height: 3, color: C.purple });

  page.drawText('Powered by Google Earth Engine · Sentinel-2 Satellite · 10m Resolution', { x: 40, y: 28, size: 7.5, font: fontReg, color: rgb(0.6, 0.75, 0.6) });
  page.drawText('© 2025 Cognentrz. This report is auto-generated. Consult an agronomist for critical decisions.', { x: 40, y: 14, size: 6.5, font: fontReg, color: C.gray });

  const generated = new Date().toLocaleString('en-IN');
  const genText   = `Generated: ${generated}`;
  page.drawText(genText, { x: W - 40 - fontReg.widthOfTextAtSize(genText, 6.5), y: 14, size: 6.5, font: fontReg, color: C.gray });

  return doc.save();
}
