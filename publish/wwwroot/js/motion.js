/* WebBloom Motion Kit v1: premium scroll and interaction layer.
   Additive: every effect checks for its elements and does nothing if they are missing.
   Respects prefers-reduced-motion, touch devices and print. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const vh = () => innerHeight || document.documentElement.clientHeight;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const main = $('main') || document.body;

  /* 1. Intro curtain, once per browser tab session */
  try {
    if (!sessionStorage.getItem('mk-intro')) {
      sessionStorage.setItem('mk-intro', '1');
      const name = (document.body.dataset.shopName || $('.wordmark')?.firstChild?.textContent || '').trim();
      if (name && name.length < 40) {
        const c = document.createElement('div'); c.className = 'mk-curtain'; c.setAttribute('aria-hidden', 'true');
        const s = document.createElement('span'), i = document.createElement('i'); i.textContent = name; s.append(i); c.append(s);
        document.body.prepend(c); setTimeout(() => c.remove(), 1800);
      }
    }
  } catch { /* storage blocked: skip the intro */ }

  /* 2. Split headings into words that rise from a mask */
  function split(el) {
    if (el.dataset.mkSplit) return; el.dataset.mkSplit = '1';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    let n = 0;
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span'), inner = document.createElement('span');
        w.className = 'mk-w'; inner.textContent = part; inner.style.setProperty('--d', Math.min(n++, 14) * 55 + 'ms'); w.append(inner); frag.append(w);
      });
      node.replaceWith(frag);
    });
  }
  const heroTitle = $('main h1');
  if (heroTitle && heroTitle.getBoundingClientRect().top < vh()) {
    split(heroTitle); heroTitle.style.animation = 'none'; heroTitle.classList.add('mk-split-wait');
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => heroTitle.classList.remove('mk-split-wait'), 120)));
  }
  const headObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('mk-split-wait'); headObs.unobserve(e.target); } }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  $$('main h2').forEach(h => { if (h.closest('dialog') || h.getBoundingClientRect().top < vh() * .9) return; split(h); h.classList.add('mk-split-wait'); headObs.observe(h); });

  /* 3. Product images unveil (clip + zoom out) as cards enter */
  const unveilObs = new IntersectionObserver(es => {
    let k = 0;
    es.forEach(e => { if (!e.isIntersecting) return; const el = e.target; el.style.setProperty('--d', (k++ % 4) * 110 + 'ms'); el.classList.add('mk-unveil'); el.classList.remove('mk-unveil-wait'); unveilObs.unobserve(el); setTimeout(() => { el.classList.remove('mk-unveil'); el.style.removeProperty('--d'); }, 2200); });
  }, { threshold: .15 });
  $$('main .product-photo, main .category-grid > a > div').forEach(el => { if (el.getBoundingClientRect().top < vh() * .92) return; el.classList.add('mk-unveil-wait'); unveilObs.observe(el); });

  /* 4. Scroll-driven effects: small-to-big growth + hero parallax, one rAF loop */
  const growers = new Set(), active = new Set();
  const growSel = ['.fashion-story-photo', '.diary-pair', '.story-visual', '[data-mk-grow]'];
  $$(growSel.join(',')).forEach(el => { if (el.closest('.product-card, dialog, .mk-grow')) return; el.classList.add('mk-grow', 'mk-grow-round'); growers.add(el); });
  const hero = $('main > section:first-child');
  const heroImg = hero && /hero/.test(hero.className + ' ' + (hero.dataset.mkHero ?? '')) ? $$('img', hero).find(i => !i.closest('.product-card')) : null;
  if (heroImg) heroImg.style.scale = '1.08';
  const marquee = $('.n12-running > div, [data-marquee] > div');
  const growObs = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? active.add(e.target) : active.delete(e.target)), { rootMargin: '10% 0px' });
  growers.forEach(g => growObs.observe(g));
  let ticking = false, lastY = scrollY, skew = 0;
  function frame() {
    ticking = false; const h = vh();
    active.forEach(el => {
      const r = el.getBoundingClientRect(); const p = clamp((h - r.top) / (h * .85), 0, 1); const e = 1 - Math.pow(1 - p, 3);
      el.style.scale = (0.8 + 0.2 * e).toFixed(4); el.style.setProperty('--mk-r', ((1 - e) * 36).toFixed(1) + 'px');
    });
    if (heroImg) { const r = hero.getBoundingClientRect(); if (r.bottom > 0) heroImg.style.translate = '0 ' + clamp(-r.top * .12, 0, heroImg.offsetHeight * .04).toFixed(1) + 'px'; }
    if (marquee) { const v = scrollY - lastY; skew += (clamp(v * .35, -8, 8) - skew) * .2; marquee.style.transform = `skewX(${(-skew).toFixed(2)}deg)`; if (Math.abs(skew) > .05) schedule(); }
    lastY = scrollY;
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); schedule();

  /* 5. Prices count up the first time they are seen */
  const priceObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; priceObs.unobserve(el);
    const text = el.textContent, m = text.match(/^(\D*?)(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?(\D*)$/); if (!m) return;
    const target = Number((m[2] + (m[3] || '')).replace(/,/g, '')), dec = m[3] ? m[3].length - 1 : 0; if (!(target > 0)) return;
    el.setAttribute('aria-label', text); const t0 = performance.now(), dur = 900;
    const fmt = v => m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[4];
    (function tick(now) { const p = clamp((now - t0) / dur, 0, 1), v = target * (1 - Math.pow(1 - p, 4)); el.textContent = p < 1 ? fmt(dec ? v : Math.round(v)) : text; if (p < 1) requestAnimationFrame(tick); else { el.removeAttribute('aria-label'); el.classList.add('mk-price-done'); } })(t0);
  }), { threshold: .6 });
  $$('main .price').forEach(el => { if (el.getBoundingClientRect().top > vh() * .95) priceObs.observe(el); });

  /* Image skeletons until each lazy image has loaded */
  $$('main img[loading="lazy"]').forEach(img => { if (img.complete) return; const box = img.parentElement; box.classList.add('mk-loading'); const done = () => box.classList.remove('mk-loading'); img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); });

  /* Fly-to-bag: a thumbnail glides to the bag icon after adding */
  document.addEventListener('submit', e => {
    const form = e.target.closest?.('[data-add-form]'); if (!form) return; const before = Number($('[data-bag-count]')?.textContent || 0);
    const bag = $$('[data-open="bag-dialog"]').find(b => b.offsetParent); const src = $('main .gallery img, main .product-gallery img, main [data-photo] img, main section img');
    if (!bag || !src) return;
    setTimeout(() => {
      if (Number($('[data-bag-count]')?.textContent || 0) <= before) return;
      const a = src.getBoundingClientRect(), b = bag.getBoundingClientRect(); if (a.width < 10 || a.bottom < 0 || a.top > vh()) return;
      const f = document.createElement('img'); f.src = src.currentSrc || src.src; f.alt = ''; f.className = 'mk-fly'; const w = Math.min(160, a.width * .5);
      Object.assign(f.style, { left: (a.left + a.width / 2 - w / 2) + 'px', top: (a.top + a.height / 2 - w * .65) + 'px', width: w + 'px', height: w * 1.3 + 'px' }); document.body.append(f);
      requestAnimationFrame(() => requestAnimationFrame(() => { const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2); f.style.transform = `translate(${dx}px,${dy}px) scale(.12)`; f.style.opacity = '.3'; }));
      setTimeout(() => f.remove(), 900);
    }, 30);
  }, true);

  if (!fine) return;
  /* Desktop-only: 3D tilt with sheen on product photos */
  $$('main .product-photo').forEach(card => {
    card.classList.add('mk-tilt');
    card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; card.classList.add('mk-tilting'); card.style.transform = `perspective(900px) rotateX(${((.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - .5) * 9).toFixed(2)}deg)`; card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%'); });
    card.addEventListener('pointerleave', () => { card.classList.remove('mk-tilting'); card.style.transform = ''; });
  });
  /* Magnetic buttons */
  $$('main .button, .header-actions > button').forEach(b => {
    b.classList.add('mk-magnet');
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.classList.add('mk-pull'); b.style.translate = `${((e.clientX - r.left - r.width / 2) * .22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .3).toFixed(1)}px`; });
    b.addEventListener('pointerleave', () => { b.classList.remove('mk-pull'); b.style.translate = ''; });
  });
  /* "View" bubble that follows the cursor over product photos */
  const cur = document.createElement('div'); cur.className = 'mk-cursor'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = 'View'; document.body.append(cur);
  let cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
  const follow = () => { cx += (tx - cx) * .2; cy += (ty - cy) * .2; cur.style.transform = `translate(${cx}px,${cy}px)`; raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .5 ? requestAnimationFrame(follow) : 0; };
  document.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; const over = e.target.closest?.('.product-photo > a, .category-grid > a') && !e.target.closest('button'); cur.classList.toggle('on', !!over); if (!raf) raf = requestAnimationFrame(follow); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
})();
