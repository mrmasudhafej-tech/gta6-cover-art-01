// main.js — wires the Sunset Palms cover editor.
//
// Pick photos (the two samples, or your own files), choose a multi-panel
// layout, crop and position each panel by dragging it on the preview, write
// the caption, pick a colour grade, and export the cover as a PNG in one of
// the three post sizes. Photos are read on this machine and never uploaded.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).

import { drawCover, LAYOUTS, GRADES, makePanel, panelRects } from './cover.js';
import { parseShot, applyShotClass, markShotReady } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('photoTray');
const panelEditorsEl = document.getElementById('panelEditors');

/** The three post sizes the cover exports to. */
const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  layout: 'trio',
  grade: 'sunset',
  caption: 'Sunset Heist',
  tagline: 'Sunset Bay',
  captionPos: 'bottom',
  size: '1920x1080',
  panels: [],
};

const photos = []; // { name, image } — samples plus the user's own files
let selected = 1; // the panel the editor and dragging act on

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawPreview() {
  drawCover(canvas, state);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Rebuilds the photo tray thumbnails from the loaded photos. */
function renderTray() {
  trayEl.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = `Use ${photo.name} in panel ${selected + 1}`;
    const img = document.createElement('img');
    img.src = photo.image.src;
    img.alt = photo.name;
    thumb.appendChild(img);
    thumb.appendChild(Object.assign(document.createElement('span'), { textContent: photo.name }));
    thumb.addEventListener('click', () => {
      state.panels[selected] = makePanel(photo.image);
      state.panels[selected].name = photo.name;
      renderPanelEditors();
      drawPreview();
      setStatus(`${photo.name} is now in panel ${selected + 1}.`);
    });
    trayEl.appendChild(thumb);
  });
}

/** Rebuilds the per-panel editor cards for the current layout. */
function renderPanelEditors() {
  const count = LAYOUTS[state.layout].panels;
  panelEditorsEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || makePanel(null);
    const card = document.createElement('div');
    card.className = `panel-card${i === selected ? ' selected' : ''}`;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'panel-head';
    head.textContent = `Panel ${i + 1}${panel.name ? ' · ' + panel.name : ''}`;
    head.addEventListener('click', () => { selected = i; renderPanelEditors(); drawPreview(); });
    card.appendChild(head);

    const photoLabel = document.createElement('label');
    photoLabel.textContent = 'Photo ';
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '— empty —';
    select.appendChild(empty);
    photos.forEach((photo) => {
      const opt = document.createElement('option');
      opt.value = photo.name;
      opt.textContent = photo.name;
      if (panel.name === photo.name) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      const found = photos.find((p) => p.name === select.value);
      state.panels[i] = makePanel(found ? found.image : null);
      if (found) state.panels[i].name = found.name;
      renderPanelEditors();
      drawPreview();
    });
    photoLabel.appendChild(select);
    card.appendChild(photoLabel);

    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = 'Zoom ';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom || 1);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      drawPreview();
    });
    zoomLabel.appendChild(zoom);
    card.appendChild(zoomLabel);

    const fitLabel = document.createElement('label');
    fitLabel.textContent = 'Crop ';
    const fit = document.createElement('select');
    for (const [value, label] of [['fill', 'Fill panel'], ['fit', 'Fit whole photo']]) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if ((panel.fit || 'fill') === value) opt.selected = true;
      fit.appendChild(opt);
    }
    fit.addEventListener('change', () => { panel.fit = fit.value; drawPreview(); });
    fitLabel.appendChild(fit);
    card.appendChild(fitLabel);

    const center = document.createElement('button');
    center.type = 'button';
    center.textContent = 'Centre photo';
    center.addEventListener('click', () => {
      panel.ox = 0; panel.oy = 0; panel.zoom = 1;
      renderPanelEditors();
      drawPreview();
    });
    card.appendChild(center);

    panelEditorsEl.appendChild(card);
  }
}

/** Switches layout, keeping each panel's photo where it still fits. */
function setLayout(layout) {
  const old = state.panels;
  state.layout = layout;
  const count = LAYOUTS[layout].panels;
  state.panels = [];
  for (let i = 0; i < count; i++) {
    state.panels.push(old[i] || makePanel(photos[0] ? photos[0].image : null));
    if (old[i] && old[i].name) state.panels[i].name = old[i].name;
    else if (photos[0]) state.panels[i].name = photos[0].name;
  }
  selected = Math.min(selected, count - 1);
  document.querySelectorAll('#layoutRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === layout);
  });
  renderPanelEditors();
  drawPreview();
}

/** Switches the colour grade. */
function setGrade(grade) {
  state.grade = grade;
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === grade);
  });
  drawPreview();
}

/** Switches the export size, resizing the preview canvas to match. */
function setSize(size) {
  state.size = size;
  const [w, h] = SIZES[size];
  canvas.width = w;
  canvas.height = h;
  document.querySelectorAll('#sizeRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === size);
  });
  drawPreview();
}

/** Exports the cover at the chosen size as a PNG download. */
function exportCover() {
  const [w, h] = SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out, state);
  out.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-palms-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved sunset-palms-cover-${w}x${h}.png`);
  }, 'image/png');
}

// --- control wiring ---------------------------------------------------------

document.querySelectorAll('#layoutRow button').forEach((b) => {
  b.addEventListener('click', () => setLayout(b.dataset.layout));
});
document.querySelectorAll('#gradeRow button').forEach((b) => {
  b.addEventListener('click', () => setGrade(b.dataset.grade));
});
document.querySelectorAll('#sizeRow button').forEach((b) => {
  b.addEventListener('click', () => setSize(b.dataset.size));
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; drawPreview(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; drawPreview(); });
document.getElementById('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  drawPreview();
});
document.getElementById('export').addEventListener('click', exportCover);

document.getElementById('loadSamples').addEventListener('click', async () => {
  await loadSamples();
  setStatus('Sample photos loaded.');
});

document.getElementById('photoFiles').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ name: file.name.replace(/\.[^.]+$/, ''), image: img });
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  renderTray();
  renderPanelEditors();
  drawPreview();
  e.target.value = '';
});

/** Loads the two bundled sample photos into the tray. */
async function loadSamples() {
  for (const name of ['pier', 'boulevard']) {
    if (photos.some((p) => p.name === name)) continue;
    photos.push({ name, image: await loadImage(`samples/${name}.jpg`) });
  }
  renderTray();
}

// --- drag to pan, click to select a panel ----------------------------------

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * sx, py = (e.clientY - rect.top) * sy;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (hit === -1) return;
  selected = hit;
  renderPanelEditors();
  drag = { panel: state.panels[hit], rect: rects[hit], lastX: px, lastY: py, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * sx, py = (e.clientY - rect.top) * sy;
  const dx = px - drag.lastX, dy = py - drag.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 0) drag.moved = true;
  const panel = drag.panel;
  panel.ox = Math.max(-0.6, Math.min(0.6, (panel.ox || 0) + dx / drag.rect.w));
  panel.oy = Math.max(-0.6, Math.min(0.6, (panel.oy || 0) + dy / drag.rect.h));
  drag.lastX = px;
  drag.lastY = py;
  drawPreview();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- startup ---------------------------------------------------------------

async function start() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  await loadSamples();
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;

  if (shot) {
    const scene = parseShot(params);
    applyShotClass(scene.mode);
    state.layout = scene.layout;
    state.grade = scene.grade;
    state.caption = scene.caption;
    state.tagline = scene.tagline;
    state.captionPos = scene.captionPos;
    captionInput.value = scene.caption;
    taglineInput.value = scene.tagline;
    document.getElementById('captionPos').value = scene.captionPos;
    const byName = (n) => photos.find((p) => p.name === n);
    const count = LAYOUTS[scene.layout].panels;
    state.panels = [];
    for (let i = 0; i < count; i++) {
      const found = byName(scene.photos[i % scene.photos.length]);
      const panel = makePanel(found ? found.image : null);
      if (found) panel.name = found.name;
      state.panels.push(panel);
    }
    if (scene.mode === 'cover') {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawPreview();
      markShotReady();
      return;
    }
    setLayout(scene.layout);
    setGrade(scene.grade);
    renderTray();
    renderPanelEditors();
    drawPreview();
    markShotReady();
    return;
  }

  // The everyday start: trio layout, boulevard big in the centre, pier sides.
  const pier = photos.find((p) => p.name === 'pier');
  const boulevard = photos.find((p) => p.name === 'boulevard');
  state.panels = [
    Object.assign(makePanel(pier.image), { name: 'pier' }),
    Object.assign(makePanel(boulevard.image), { name: 'boulevard' }),
    Object.assign(makePanel(pier.image), { name: 'pier' }),
  ];
  renderTray();
  renderPanelEditors();
  drawPreview();
}

start();
