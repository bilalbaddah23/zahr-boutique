/* WebBloom Motion Plus: smooth scrolling, page transitions, 3D card entrance, cursor glow, reading ring.
   Additive and optional: remove this file and its script tag and the site still works. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1. Smooth wheel scrolling on desktop (touch keeps native scrolling) */
  if (window.Lenis && fine) {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, prevent: n => !!n.closest('dialog, [data-no-smooth], select, textarea') });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const sync = () => { if (document.body.classList.contains('dialog-open') || document.querySelector('dialog[open]')) lenis.stop(); else lenis.start(); };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    $$('dialog').forEach(d => { d.addEventListener('close', sync); new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ['open'] }); });
  }

  /* 2. Page transition: a veil slides up before leaving and away after arriving */
  const veil = document.createElement('div'); veil.className = 'mk-veil'; veil.setAttribute('aria-hidden', 'true'); document.body.append(veil);
  try {
    if (sessionStorage.getItem('mk-veil') === '1') {
      sessionStorage.removeItem('mk-veil'); veil.style.transform = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.transform = ''; veil.classList.add('out'); setTimeout(() => veil.classList.remove('out'), 700); }));
    }
  } catch { /* storage blocked: no transition */ }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target || a.hasAttribute('download') || a.dataset.noVeil !== undefined) return;
    let url; try { url = new URL(a.href, location.href); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    try { sessionStorage.setItem('mk-veil', '1'); } catch { /* ignore */ }
    veil.classList.remove('out'); veil.classList.add('in');
    setTimeout(() => { location.href = url.href; }, 300);
  });
  addEventListener('pageshow', e => { if (e.persisted) veil.classList.remove('in', 'out'); });

  /* 3. Product cards tip forward in 3D as they arrive */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      let k = 0;
      es.forEach(e => {
        if (!e.isIntersecting) return; const c = e.target; io.unobserve(c);
        c.style.setProperty('--d', (k++ % 4) * 90 + 'ms'); c.classList.add('mk-flip-go'); c.classList.remove('mk-flip-wait');
        setTimeout(() => { c.classList.remove('mk-flip', 'mk-flip-go'); c.style.removeProperty('--d'); }, 1700);
      });
    }, { threshold: .12 });
    $$('main .product-card').forEach(c => { if (c.getBoundingClientRect().top < innerHeight * .92) return; c.classList.add('mk-flip', 'mk-flip-wait'); io.observe(c); });
  }

  /* 4. Reading ring around the back-to-top button */
  const top = $('[data-to-top]');
  if (top) {
    const ns = 'http://www.w3.org/2000/svg', ring = document.createElementNS(ns, 'svg');
    ring.setAttribute('class', 'mk-ring'); ring.setAttribute('viewBox', '0 0 46 46'); ring.setAttribute('aria-hidden', 'true');
    const R = 20, C = 2 * Math.PI * R;
    ['t', 'p'].forEach(cls => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('class', cls); c.setAttribute('cx', 23); c.setAttribute('cy', 23); c.setAttribute('r', R); ring.append(c); });
    const prog = ring.lastChild; prog.style.strokeDasharray = C; prog.style.strokeDashoffset = C; document.body.append(ring);
    let tick = false;
    const upd = () => {
      tick = false; const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, scrollY / max) : 0;
      prog.style.strokeDashoffset = C * (1 - p);
      const r = top.getBoundingClientRect(), shown = r.width > 0 && getComputedStyle(top).visibility !== 'hidden' && +getComputedStyle(top).opacity > .2;
      ring.classList.toggle('on', shown);
      if (shown) { ring.style.right = (innerWidth - r.right - (46 - r.width) / 2) + 'px'; ring.style.bottom = (innerHeight - r.bottom - (46 - r.height) / 2) + 'px'; }
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); setTimeout(upd, 600);
  }

  /* 5. Soft glow that follows the pointer (desktop only) */
  if (fine) {
    const g = document.createElement('div'); g.className = 'mk-glow'; g.setAttribute('aria-hidden', 'true'); document.body.append(g);
    let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
    const loop = () => { x += (tx - x) * .12; y += (ty - y) * .12; g.style.transform = 'translate(' + x + 'px,' + y + 'px)'; raf = Math.abs(tx - x) + Math.abs(ty - y) > .4 ? requestAnimationFrame(loop) : 0; };
    document.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!on) { on = true; x = tx; y = ty; g.classList.add('on'); } if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    document.addEventListener('pointerleave', () => { on = false; g.classList.remove('on'); });
  }
})();
