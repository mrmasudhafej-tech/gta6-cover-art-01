// shots.js — fixed scenes for screenshots, driven by the page query string.
//
// ?shot=cover draws the cover alone, edge to edge, at the viewport's size:
// the app's own drawing of the exported cover, at a size within the
// screenshot limits. ?shot=editor shows the editor with a sample photo
// loaded. Query keys: layout, grade, caption, tagline, captionPos, size,
// photo, photo2, photo3, photo4 (sample names under samples/).
// window.__shotReady is set once the scene has painted.

/** Reads a shot scene out of the page's query string. */
export function parseShot(query) {
  const names = ['photo', 'photo2', 'photo3', 'photo4']
    .map((k) => query.get(k))
    .filter(Boolean);
  return {
    mode: query.get('shot') || 'editor',
    layout: query.get('layout') || 'trio',
    grade: query.get('grade') || 'sunset',
    caption: query.get('caption') || 'Sunset Heist',
    tagline: query.get('tagline') || 'Sunset Bay',
    captionPos: query.get('captionPos') || 'bottom',
    size: query.get('size') || '1920x1080',
    photos: names.length ? names : ['pier'],
  };
}

/** Marks the page as a cover-only shot, hiding the editor chrome. */
export function applyShotClass(mode) {
  if (mode === 'cover') document.body.classList.add('shot-cover');
}

/** Sets window.__shotReady after two animation frames, once painted. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
