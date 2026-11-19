// cover.js — draws the multi-panel cover art.
//
// A cover is a set of photo panels on a dark poster sheet, a Vice City
// neon-sunset colour grade over each panel, a skyline silhouette and a bold
// outlined caption across the foot. Everything is drawn with the canvas 2D
// API, no fonts or images from outside the app: lettering uses the system
// heavy sans stack (Arial Black / Impact) so the app works fully offline.

/** The four panel layouts, by how many panels they hold. */
export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1 },
  trio: { label: 'Trio', panels: 3 },
  quad: { label: 'Quad', panels: 4 },
  strip: { label: 'Strip', panels: 3 },
};

/** The colour grades. wash/deep tint the photo, glow lights the caption. */
export const GRADES = {
  sunset: { label: 'Neon Sunset', wash: '#ff5e3a', deep: '#4a1040', glow: '#ffb347', accent: '#39e6ff', halftone: 0.1, warm: 0.3 },
  night: { label: 'Vice Night', wash: '#4a3aff', deep: '#12082e', glow: '#ff2e88', accent: '#ff5ad1', halftone: 0.12, warm: 0.18 },
  gold: { label: 'Palm Gold', wash: '#ff9d00', deep: '#3d1c00', glow: '#ffe066', accent: '#2ec4b6', halftone: 0.08, warm: 0.34 },
  pop: { label: 'Pop Flash', wash: '#ff2e88', deep: '#0d0221', glow: '#39e6ff', accent: '#ffe066', halftone: 0.16, warm: 0.22 },
};

/** A panel's photo placement: the image, zoom, pan offset and fit mode. */
export function makePanel(image) {
  return { image, zoom: 1, ox: 0, oy: 0, fit: 'fill' };
}

/** Turns '#rrggbb' into an rgba() string at the given alpha. */
export function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Panel rectangles for a layout inside a w x h sheet, with white gutters. */
export function panelRects(layout, w, h) {
  const g = Math.max(4, Math.round(w * 0.008));
  const x0 = g, y0 = g, iw = w - 2 * g, ih = h - 2 * g;
  if (layout === 'trio') {
    const cw = iw * 0.44;
    const sw = (iw - cw - 2 * g) / 2;
    return [
      { x: x0, y: y0, w: sw, h: ih },
      { x: x0 + sw + g, y: y0, w: cw, h: ih },
      { x: x0 + sw + g + cw + g, y: y0, w: sw, h: ih },
    ];
  }
  if (layout === 'quad') {
    const cw = (iw - g) / 2, ch = (ih - g) / 2;
    return [
      { x: x0, y: y0, w: cw, h: ch },
      { x: x0 + cw + g, y: y0, w: cw, h: ch },
      { x: x0, y: y0 + ch + g, w: cw, h: ch },
      { x: x0 + cw + g, y: y0 + ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'strip') {
    const cw = (iw - 2 * g) / 3;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (cw + g), y: y0, w: cw, h: ih }));
  }
  return [{ x: x0, y: y0, w: iw, h: ih }];
}

/** Draws one photo into its panel rect, honouring zoom, pan and fit. */
function drawPhoto(ctx, rect, panel) {
  const img = panel.image;
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  let scale = panel.fit === 'fit'
    ? Math.min(rect.w / iw, rect.h / ih)
    : Math.max(rect.w / iw, rect.h / ih);
  scale *= panel.zoom || 1;
  const dw = iw * scale, dh = ih * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

// One halftone dot tile per spacing, reused across panels and redraws.
const dotTiles = new Map();
function dotPattern(ctx, spacing) {
  if (!dotTiles.has(spacing)) {
    const tile = document.createElement('canvas');
    tile.width = spacing; tile.height = spacing;
    const t = tile.getContext('2d');
    t.fillStyle = '#000000';
    t.beginPath();
    t.arc(spacing / 2, spacing / 2, spacing * 0.16, 0, Math.PI * 2);
    t.fill();
    dotTiles.set(spacing, tile);
  }
  return ctx.createPattern(dotTiles.get(spacing), 'repeat');
}

/** The grade over one panel: warm wash, halftone dots, vignette, hairline. */
function gradePanel(ctx, rect, grade) {
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, 'rgba(255,255,255,0.05)');
  tint.addColorStop(0.5, hexA(grade.wash, grade.warm * 0.4));
  tint.addColorStop(1, hexA(grade.deep, 0.42));
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.save();
  ctx.globalAlpha = grade.halftone;
  ctx.fillStyle = dotPattern(ctx, 9);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const vg = ctx.createRadialGradient(cx, cy, Math.min(rect.w, rect.h) * 0.35, cx, cy, Math.max(rect.w, rect.h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,0,18,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

/** A low sun glow over the biggest panel, for the warm grades. */
function drawSun(ctx, rect, grade) {
  const sx = rect.x + rect.w / 2;
  const sy = rect.y + rect.h * 0.2;
  const r = rect.w * 0.42;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  glow.addColorStop(0, hexA(grade.glow, 0.75));
  glow.addColorStop(0.45, hexA(grade.wash, 0.35));
  glow.addColorStop(1, hexA(grade.wash, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Fixed skyline silhouette, drawn as dark blocks along the foot of the sheet.
const SKYLINE = [0.1, 0.17, 0.08, 0.22, 0.12, 0.26, 0.09, 0.19, 0.13, 0.23, 0.07, 0.16, 0.11, 0.2];

function drawSkyline(ctx, w, h, grade) {
  const bandH = h * 0.085;
  const y0 = h - bandH;
  const step = w / SKYLINE.length;
  ctx.fillStyle = hexA(grade.deep, 0.9);
  SKYLINE.forEach((f, i) => {
    const bh = bandH * f * 3.2;
    ctx.fillRect(i * step + 1, y0 + bandH - bh, step - 2, bh);
  });
}

/** The bold caption and tagline across the foot (or head) of the sheet. */
function drawCaption(ctx, w, h, state, grade) {
  const pos = state.captionPos || 'bottom';
  const bandH = h * 0.3;
  const scrim = ctx.createLinearGradient(0, pos === 'bottom' ? h - bandH : 0, 0, pos === 'bottom' ? h : bandH);
  if (pos === 'bottom') {
    scrim.addColorStop(0, 'rgba(10,2,20,0)');
    scrim.addColorStop(1, 'rgba(10,2,20,0.62)');
  } else {
    scrim.addColorStop(0, 'rgba(10,2,20,0.62)');
    scrim.addColorStop(1, 'rgba(10,2,20,0)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, pos === 'bottom' ? h - bandH : 0, w, bandH);

  const text = (state.caption || '').trim().toUpperCase();
  const tag = (state.tagline || '').trim().toUpperCase();
  const baseY = pos === 'bottom' ? h - h * 0.075 : h * 0.14;

  if (tag) {
    const tagSize = Math.max(10, h * 0.024);
    ctx.font = `700 ${tagSize}px 'Arial Black', Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = tagSize * 0.4;
    const spaced = tag.split('').join(' ');
    // Sit clear of the big caption: its half-height is about 0.06h, so the
    // tagline rides a full caption-height above (or below) the caption line.
    ctx.fillText(spaced, w / 2, baseY + (pos === 'bottom' ? -h * 0.125 : h * 0.125));
    ctx.shadowBlur = 0;
  }

  if (!text) return;
  let size = h * 0.115;
  ctx.font = `900 ${size}px 'Arial Black', Impact, 'Helvetica Neue', sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 10) {
    size -= 2;
    ctx.font = `900 ${size}px 'Arial Black', Impact, 'Helvetica Neue', sans-serif`;
  }
  ctx.save();
  ctx.translate(w / 2, baseY);
  ctx.transform(1, 0, -0.07, 1, 0, 0); // a slight poster slant
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeStyle = grade.deep;
  ctx.lineWidth = size * 0.17;
  ctx.strokeText(text, 0, 0);
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, grade.glow);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Small poster corner marks: the fictional city name and the year. */
function drawCornerMarks(ctx, w, h, grade) {
  const size = Math.max(11, h * 0.02);
  ctx.font = `700 ${size}px 'Arial Black', Impact, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = size * 0.4;
  ctx.textAlign = 'left';
  ctx.fillText('S U N S E T   B A Y', w * 0.025, h * 0.035);
  ctx.textAlign = 'right';
  ctx.fillStyle = grade.accent;
  ctx.fillText('EST. 2026', w * 0.975, h * 0.035);
  ctx.shadowBlur = 0;
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * state: { layout, panels, caption, tagline, captionPos, grade }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout || 'hero', w, h);
  const panels = state.panels || [];
  let biggest = 0;
  rects.forEach((r, i) => { if (r.w * r.h > rects[biggest].w * rects[biggest].h) biggest = i; });
  // The sun only belongs on a layout with one hero panel (hero, trio):
  // on quad or strip every panel is the same size and a glow on the first
  // one would just sit on a face.
  const hasHeroPanel = rects.filter((r) => r.w * r.h === rects[biggest].w * rects[biggest].h).length === 1;

  rects.forEach((rect, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.fillStyle = grade.deep;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const panel = panels[i];
    if (panel && panel.image) drawPhoto(ctx, rect, panel);
    if (hasHeroPanel && (state.grade === 'sunset' || state.grade === 'gold') && i === biggest) drawSun(ctx, rect, grade);
    gradePanel(ctx, rect, grade);
    ctx.restore();
  });

  drawSkyline(ctx, w, h, grade);
  drawCaption(ctx, w, h, state, grade);
  drawCornerMarks(ctx, w, h, grade);
}
