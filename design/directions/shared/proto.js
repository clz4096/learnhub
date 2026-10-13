// Shared behaviour for the static direction prototypes. Not app code.
(() => {
  const root = document.documentElement;
  // ?theme=dark|light pins the theme (the gallery captures use it); otherwise follow the device.
  const pinned = new URLSearchParams(location.search).get('theme');
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => { root.dataset.theme = pinned || (media.matches ? 'dark' : 'light'); };
  apply();
  media.addEventListener('change', apply);

  document.addEventListener('DOMContentLoaded', () => {
    // Contents lists open on a wide screen and fold away on a phone, where they would fill the first screen.
    if (matchMedia('(max-width: 760px)').matches) for (const d of document.querySelectorAll('details[data-open-wide]')) d.open = false;
    for (const b of document.querySelectorAll('[data-theme-toggle]')) {
      b.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; });
    }

    // The app scrolls the map so the chosen topic sits in view; do the same here.
    const scroller = document.querySelector('.map-scroll');
    const sel = scroller && scroller.querySelector('.node.selected');
    if (scroller && sel) {
      const s = scroller.getBoundingClientRect();
      const n = sel.getBoundingClientRect();
      scroller.scrollLeft += n.left - s.left - (s.width - n.width) / 2;
      scroller.scrollTop += n.top - s.top - s.height * 0.38;
    }

    // Direction C: tag the event letters so A and B keep one colour across prose, plate, and caption,
    // and pointing at one lights up every copy of it.
    if (root.dataset.direction === 'c') {
      const vars = [...document.querySelectorAll('.katex .mathnormal')].filter((e) => /^[AB]$/.test(e.textContent));
      for (const v of vars) v.classList.add(`ev-${v.textContent.toLowerCase()}`);
      for (const v of vars) {
        const k = `ev-${v.textContent.toLowerCase()}`;
        v.addEventListener('pointerenter', () => document.body.classList.add(`lit-${k}`));
        v.addEventListener('pointerleave', () => document.body.classList.remove(`lit-${k}`));
      }
    }
  });
})();
