'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const node = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let toastTimer;
  function notify(message) { const e = $('.toast'); e.textContent = message; e.hidden = false; void e.offsetWidth; e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.classList.remove('show'); toastTimer = setTimeout(() => { e.hidden = true; }, 300); }, 4500); }
  const SHOP_PHONE = document.body.dataset.shopPhone || '';
  const USE_WHATSAPP=document.body.dataset.contactMode==='whatsapp';
  const CONTACT_URL=document.body.dataset.contactUrl;
  const contactHref=message=>USE_WHATSAPP?'https://wa.me/'+SHOP_PHONE+'?text='+encodeURIComponent(message):CONTACT_URL;
  function openDialog(id) { const d = document.getElementById(id); if (!d || d.open) return; d.showModal(); document.body.classList.add('dialog-open'); }
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.open)));
  $$('dialog').forEach(d => {
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', e => { if (e.target === d) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } });
    d.addEventListener('close', () => { if (!$$('dialog[open]').length) document.body.classList.remove('dialog-open'); });
  });
  const menu = $('.menu-button'), navigation = $('#navigation');
  function closeMenu() { menu?.setAttribute('aria-expanded', 'false'); navigation?.classList.remove('open'); }
  menu?.addEventListener('click', () => { const opening = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(opening)); navigation.classList.toggle('open', opening); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });
  $$('[data-photo]').forEach(b => b.addEventListener('click', () => {
    const photo = $('#detail-photo'); if (photo.getAttribute('src') !== b.dataset.photo) { photo.classList.add('swapping'); const done = () => photo.classList.remove('swapping'); photo.addEventListener('load', done, { once: true }); setTimeout(done, 600); photo.src = b.dataset.photo; }
    $$('[data-photo]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
  }));
  $('[data-open-photo]')?.addEventListener('click', () => { $('#photo-dialog img').src = $('#detail-photo').src; openDialog('photo-dialog'); });
  $$('[data-quantity-step]').forEach(b => b.addEventListener('click', () => { const input = $('input', b.closest('.quantity')); input.value = String(Math.max(1, Math.min(10, (Number(input.value) || 1) + Number(b.dataset.quantityStep)))); }));
  $$('.purchase-row .quantity input').forEach(input => input.addEventListener('change', () => { input.value = String(Math.max(1, Math.min(10, Math.round(Number(input.value) || 1)))); }));

  const filters = $('#filters');
  if (filters) {
    document.body.classList.add('js');
    const slots = $$('#shop-grid .product-slot'), original = new Map(slots.map((s, i) => [s, i]));
    function applyFilters(push = true) {
      const data = new FormData(filters), terms = String(data.get('q') || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      slots.forEach(slot => {
        const c = $('.product-card', slot), text = c.dataset.search.toLocaleLowerCase();
        const match = terms.every(t => text.includes(t)) && ['collection', 'audience', 'family'].every(key => !data.get(key) || c.dataset[key] === data.get(key));
        slot.hidden = !match; if (match) count++;
      });
      const sort = data.get('sort');
      const sorted = [...slots].sort((a, b) => {
        const ca = $('.product-card', a).dataset, cb = $('.product-card', b).dataset;
        if (sort === 'az') return ca.name.localeCompare(cb.name);
        if (sort === 'price-asc' || sort === 'price-desc') { const pa = ca.price ? Number(ca.price) : null, pb = cb.price ? Number(cb.price) : null; if (pa === null) return pb === null ? 0 : 1; if (pb === null) return -1; return sort === 'price-asc' ? pa - pb : pb - pa; }
        return original.get(a) - original.get(b);
      });
      sorted.forEach(s => $('#shop-grid').append(s));
      $('[data-results-count]').textContent = `${count} piece${count === 1 ? '' : 's'} to discover`;
      $('[data-empty-results]').hidden = count !== 0;
      if (push) { const params = new URLSearchParams(); for (const [key, value] of data) if (String(value).trim()) params.set(key, String(value).trim()); history.replaceState(null, '', '/shop' + (params.size ? '?' + params : '')); }
    }
    filters.addEventListener('input', () => applyFilters()); filters.addEventListener('change', () => applyFilters());
    filters.addEventListener('submit', e => { e.preventDefault(); applyFilters(); });
    $$('[data-reset-filters]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); $$('input', filters).forEach(i => { i.value = ''; }); $$('select', filters).forEach(s => { s.value = ''; }); applyFilters(); }));
    window.addEventListener('popstate', () => { const p = new URLSearchParams(location.search); $$('input,select', filters).forEach(i => { i.value = p.get(i.name) || ''; }); applyFilters(false); });
    applyFilters(false);
  }
  const finder = $('[data-style-finder]');
  finder?.addEventListener('submit', e => {
    e.preventDefault(); if (!finder.reportValidity()) return;
    const data = new FormData(finder), direction = String(data.get('direction')), occasion = String(data.get('occasion')), preferences = String(data.get('preferences') || '');
    const result = $('.finder-result'); result.hidden = false;
    $('[data-finder-title]').textContent = 'Your edit: ' + direction.toLowerCase() + '.';
    $('[data-finder-copy]').textContent = 'Explore ' + direction.toLowerCase() + ' for ' + occasion.toLowerCase() + ', or share your preferences with the boutique.';
    $('[data-finder-shop]').href = '/shop?collection=' + encodeURIComponent(direction);
    const message = 'Hello ' + document.body.dataset.shopName + '! Could you help me choose?\nCategory: ' + direction + '\nOccasion: ' + occasion + (preferences ? '\nPreferences: ' + preferences : '') + '\nPlease confirm current options and prices.';
    $('[data-finder-chat]').href = contactHref(message);
    if(!USE_WHATSAPP){$('[data-finder-draft]').hidden=false;$('[data-finder-message]').value=message;}
    result.focus(); result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');entry.target.classList.add('reveal-done');observer.unobserve(entry.target);} }), {threshold:0.08});
    $$('[data-reveal]').forEach(el => {if(el.getBoundingClientRect().top > innerHeight){el.classList.add('reveal-pending');observer.observe(el);}});
  }
  function progress(){const range=document.documentElement.scrollHeight-innerHeight;$('.scroll-progress').style.transform='scaleX('+(range>0?Math.max(0,Math.min(1,scrollY/range)):0)+')';$('.header').classList.toggle('scrolled',scrollY>20);}
  addEventListener('scroll',progress,{passive:true}); progress();
  const BAG = 'zahr-boutique.bag.v1', SAVED = 'zahr-boutique.saved.v1';
  let catalog = [], bag = [], saved = [], requestVersion = 0;
  function read(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notify('This browser could not save your changes. They apply only on this page.'); return false; } }
  const product = id => catalog.find(p => p.id === id);
  const money = amount => '$' + amount.toFixed(2);
  function sanitise() {
    saved = [...new Set(read(SAVED))].filter(id => typeof id === 'string' && product(id));
    bag = [];
    read(BAG).slice(0, 30).forEach(item => { const p = product(item?.id); if (!p || !p.sizes.includes(item.size)) return; const quantity = Number(item.quantity); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return; const previous = bag.find(b => b.id === item.id && b.size === item.size); const room = 30 - bag.reduce((s, x) => s + x.quantity, 0); if (room <= 0) return; if (previous) previous.quantity = Math.min(10, previous.quantity + Math.min(quantity, room)); else bag.push({ id: p.id, size: item.size, quantity: Math.min(quantity, room) }); });
  }
  function cartRow(item) {
    const p = product(item.id), row = node('article', 'cart-item'), img = node('img'); img.src = p.images[0]; img.loading = 'lazy'; img.alt = p.name; img.width = 80; img.height = 104;
    const content = node('div'), heading = node('h3'), link = node('a', '', p.name); link.href = '/product/' + encodeURIComponent(p.id); heading.append(link); content.append(heading, node('p', '', item.size));
    const quantity = node('div', 'quantity'), minus = node('button', '', '−'), count = node('input'), plus = node('button', '', '+');
    minus.type = plus.type = 'button'; minus.setAttribute('aria-label', 'Decrease ' + p.name + ' quantity'); plus.setAttribute('aria-label', 'Increase ' + p.name + ' quantity');
    count.type = 'number'; count.min = '1'; count.max = '10'; count.value = item.quantity; count.inputMode = 'numeric'; count.setAttribute('aria-label', p.name + ' quantity');
    function change(value) { const v = Math.max(1, Math.min(10, Math.round(Number(value) || 1))); if (bag.reduce((s, x) => s + (x === item ? v : x.quantity), 0) > 30) { notify('For more than 30 items, please contact Zahr Boutique directly.'); count.value = item.quantity; return; } item.quantity = v; persist(BAG, bag); refresh(); invalidateDraft(); }
    minus.addEventListener('click', () => change(item.quantity - 1)); plus.addEventListener('click', () => change(item.quantity + 1)); count.addEventListener('change', () => change(count.value)); quantity.append(minus, count, plus); content.append(quantity, node('span', 'cart-price', p.price === null ? 'Price to confirm' : money(p.price * item.quantity)));
    const remove = node('button', '', 'Remove'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + p.name + ' from bag'); remove.addEventListener('click', () => { bag = bag.filter(x => x !== item); persist(BAG, bag); refresh(); invalidateDraft(); }); row.append(img, content, remove); return row;
  }
  function refresh() {
    const count = bag.reduce((s, x) => s + x.quantity, 0);
    $$('[data-bag-count]').forEach(e => { e.textContent = count; if (e.classList.contains('counter')) e.hidden = !count; });
    $$('[data-saved-count]').forEach(e => { e.textContent = saved.length; e.hidden = !saved.length; });
    $$('[data-save]').forEach(b => { const yes = saved.includes(b.dataset.save), p = product(b.dataset.save); b.disabled = false; b.setAttribute('aria-pressed', String(yes)); b.setAttribute('aria-label', (yes ? 'Unsave ' : 'Save ') + (p?.name || 'piece')); if (b.classList.contains('detail-save')) { const text = [...b.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (text) text.textContent = yes ? (b.dataset.savedText || ' Saved to your favourites') : (b.dataset.saveText || ' Save to your favourites'); } });
    $$('[data-add-form] button[type="submit"]').forEach(b => { b.disabled = false; });
    $$('[data-saved-slot]').forEach(e => { e.hidden = !saved.includes(e.dataset.savedSlot); });
    const emptySaved = $('[data-empty-saved]'); if (emptySaved) emptySaved.hidden = !!saved.length;
    const clearSaved = $('[data-clear-saved]'); if (clearSaved) clearSaved.hidden = !saved.length;
    const label = $('[data-saved-label]'); if (label) label.textContent = `${saved.length} saved piece${saved.length === 1 ? '' : 's'}`;
    $$('[data-cart-items]').forEach(container => {
      container.replaceChildren();
      if (!bag.length) { const empty = node('div', 'cart-empty'); empty.append(node('h3', '', 'Your next style awaits.'), node('p', '', 'Explore the collection and add a piece you love.')); const a = node('a', 'text-link', 'Explore pieces ↗'); a.href = '/shop'; empty.append(a); container.append(empty); }
      else bag.forEach(item => container.append(cartRow(item)));
    });
    const subtotal = bag.reduce((s, b) => s + (product(b.id).price || 0) * b.quantity, 0), allPriced = bag.every(b => product(b.id).price !== null);
    $$('[data-cart-summary]').forEach(container => { container.replaceChildren(); if (!bag.length) return; const line = node('div', 'subtotal'); line.append(node('span', '', allPriced ? 'Product subtotal' : subtotal > 0 ? 'Known-price items' : 'Prices'), node('span', '', !allPriced && subtotal === 0 ? 'To confirm' : money(subtotal))); const delivery = node('div'); delivery.append(node('span', '', 'Delivery'), node('span', '', 'Confirmed by store')); container.append(line, delivery); if (!allPriced) container.append(node('p', '', 'Some items need a price confirmation. Your final total will be confirmed by Zahr Boutique.')); });
    $$('[data-checkout-link]').forEach(a => { a.hidden = !bag.length; });
    const prepare = $('[data-prepare-order]'); if (prepare) prepare.disabled = !bag.length;
  }
  function invalidateDraft() { requestVersion++; const ready = $('#prepared-request'), form = $('#checkout-form'); if (ready && !ready.hidden) { ready.hidden = true; form.hidden = false; $('#send-order').removeAttribute('href'); $('#order-message').value = ''; } }
  async function startShop() {
    try { const response = await fetch('/api/catalog'); if (!response.ok) throw new Error(); catalog = await response.json(); if (!Array.isArray(catalog)) throw new Error(); sanitise(); refresh(); suggest(); }
    catch { notify('The collection could not load. Please refresh before updating your bag.'); return; }
    $$('[data-save]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.save, adding = !saved.includes(id); saved = adding ? [...saved, id] : saved.filter(x => x !== id); const ok = persist(SAVED, saved); refresh(); if (adding) pop(b); if (ok) notify(adding ? 'Added to your favourites.' : 'Removed from your favourites.'); }));
    $('[data-clear-saved]')?.addEventListener('click', () => { saved = []; const ok = persist(SAVED, saved); refresh(); if (ok) notify('Your favourites have been cleared.'); });
    $$('[data-add-form]').forEach(form => form.addEventListener('submit', e => {
      e.preventDefault(); const p = product(form.dataset.productId), data = new FormData(form), size = String(data.get('size')), quantity = Number(data.get('quantity'));
      if (!p || !p.sizes.includes(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) { notify('Please choose an option and a quantity from 1 to 10.'); return; }
      const previous = bag.find(x => x.id === p.id && x.size === size);
      if ((previous?.quantity || 0) + quantity > 10 || bag.reduce((s, x) => s + x.quantity, 0) + quantity > 30) { notify('You can request up to 10 of each piece and 30 items per bag. Contact Zahr Boutique for larger orders.'); return; }
      if (previous) previous.quantity += quantity; else bag.push({ id: p.id, size, quantity });
      const ok = persist(BAG, bag); refresh(); invalidateDraft(); confirmAdded($('button[type="submit"]', form)); $$('[data-open="bag-dialog"]').forEach(pop); if (ok) setTimeout(() => openDialog('bag-dialog'), 450);
    }));
    window.addEventListener('storage', e => { if (e.key === BAG || e.key === SAVED || e.key === null) { sanitise(); refresh(); invalidateDraft(); } });
    const checkout = $('#checkout-form');
    checkout?.addEventListener('submit', async e => {
      e.preventDefault(); if (!checkout.reportValidity()) return;
      const error = $('.form-error', checkout), button = $('[data-prepare-order]'); error.hidden = true; button.disabled = true; button.textContent = 'Preparing your request…';
      try {
        const version = requestVersion, data = new FormData(checkout), payload = Object.fromEntries(data); payload.items = bag;
        const response = await fetch('/api/order-draft', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').content }, body: JSON.stringify(payload) });
        let result; try { result = await response.json(); } catch { throw new Error(response.status === 429 ? 'Please wait a minute before trying again.' : 'The request could not be prepared. Please refresh and try again.'); }
        if (!response.ok) throw new Error(result.error || 'Please try again in a moment.');
        if (version !== requestVersion) throw new Error('Your bag changed. Please prepare your request again.');
        const destination = new URL(result.url); if (USE_WHATSAPP ? destination.origin !== 'https://wa.me' || destination.pathname !== '/' + SHOP_PHONE : destination.href !== CONTACT_URL) throw new Error('The contact destination could not be verified.');
        $('#order-message').value = result.message; $('#send-order').href = result.url; checkout.hidden = true; $('#prepared-request').hidden = false; $('#prepared-request').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
      } catch (err) { error.textContent = err.message || 'Please try again.'; error.hidden = false; }
      finally { button.disabled = !bag.length; button.replaceChildren('Prepare my order request ', node('span', '', '↗')); }
    });
    $('[data-edit-request]')?.addEventListener('click', () => { invalidateDraft(); $('#customer-name').focus(); });
  }
  /* ---------- Feedback, search, gallery and other small comforts ---------- */
  const lessMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 650); }
  function confirmAdded(button) {
    if (!button || button.dataset.busy) return;
    const original = [...button.childNodes].map(n => n.cloneNode(true));
    button.dataset.busy = '1'; button.classList.add('added');
    button.replaceChildren('Added to your bag ', node('span', '', '✓'));
    setTimeout(() => { button.replaceChildren(...original); button.classList.remove('added'); delete button.dataset.busy; }, 1600);
  }

  // Cards rise into view one after another as you scroll.
  if (!lessMotion() && 'IntersectionObserver' in window) {
    const cardObserver = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        const el = e.target; cardObserver.unobserve(el);
        el.style.setProperty('--reveal-delay', Math.min(i, 6) * 80 + 'ms'); el.classList.add('in');
        setTimeout(() => { el.classList.remove('card-reveal', 'in'); el.style.removeProperty('--reveal-delay'); }, 1400);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
    $$('main .product-card, .category-grid > a, .journal-grid > a').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * 0.92) return; el.classList.add('card-reveal'); cardObserver.observe(el); });
  }

  // Photos fade in once loaded.
  $$('.product-photo img, .category-grid img, .journal-grid img, .story-visual img, .thumbnails img').forEach(img => {
    if (img.complete) return;
    img.classList.add('img-pending');
    const show = () => img.classList.remove('img-pending');
    img.addEventListener('load', show, { once: true }); img.addEventListener('error', show, { once: true });
  });

  // Back to top.
  const toTop = $('[data-to-top]');
  let ticking = false;
  const onScroll = () => { ticking = false; if (toTop) toTop.hidden = scrollY < 900; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => { scrollTo({ top: 0, behavior: lessMotion() ? 'auto' : 'smooth' }); $('.wordmark')?.focus({ preventScroll: true }); });

  // Press "/" anywhere to search.
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || $('dialog[open]')) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault(); openDialog('search-dialog'); $('#global-search')?.focus();
  });

  // Live suggestions in the search window.
  const searchInput = $('#global-search'), suggestions = $('[data-search-suggestions]');
  function suggest() {
    if (!searchInput || !suggestions) return;
    const words = searchInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    suggestions.replaceChildren();
    if (!words.length || !catalog.length) return;
    const found = catalog.filter(p => { const text = [p.name, p.description, p.collection, p.family, ...(p.notes || [])].join(' ').toLocaleLowerCase(); return words.every(w => text.includes(w)); });
    if (!found.length) { suggestions.append(node('p', 'suggestion-empty', 'Nothing matches “' + searchInput.value.trim() + '” yet. Press Enter to search the collection, or ask the boutique.')); return; }
    found.slice(0, 5).forEach((p, i) => {
      const a = node('a', 'suggestion'); a.href = '/product/' + encodeURIComponent(p.id); a.style.setProperty('--i', i);
      const img = node('img'); img.src = p.images[0]; img.alt = ''; img.width = 48; img.height = 64;
      const text = node('span'); text.append(node('b', '', p.name), node('small', '', p.collection));
      a.append(img, text, node('span', 'suggestion-price', p.price === null ? 'Ask for price' : money(p.price)));
      suggestions.append(a);
    });
    if (found.length > 5) { const more = node('a', 'suggestion-more', 'See all ' + found.length + ' results ↗'); more.href = '/shop?q=' + encodeURIComponent(searchInput.value.trim()); suggestions.append(more); }
  }
  searchInput?.addEventListener('input', suggest);
  $('#search-dialog')?.addEventListener('close', () => { if (searchInput) searchInput.value = ''; suggestions?.replaceChildren(); });

  // Product photos: swipe on phones, arrows in the enlarged view.
  const photoButtons = $$('[data-photo]');
  function stepPhoto(step) {
    if (photoButtons.length < 2) return;
    const current = Math.max(0, photoButtons.findIndex(b => b.classList.contains('active')));
    const next = photoButtons[(current + step + photoButtons.length) % photoButtons.length];
    next.click();
    const big = $('#photo-dialog img'); if (big && $('#photo-dialog').open) big.src = next.dataset.photo;
  }
  const mainPhoto = $('[data-open-photo]');
  let touchX = null, swiped = false;
  mainPhoto?.addEventListener('touchstart', e => { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; swiped = false; }, { passive: true });
  mainPhoto?.addEventListener('touchend', e => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; touchX = null; if (Math.abs(dx) > 45) { swiped = true; stepPhoto(dx < 0 ? 1 : -1); } }, { passive: true });
  mainPhoto?.addEventListener('click', e => { if (swiped) { e.stopImmediatePropagation(); swiped = false; } }, true);
  $$('[data-photo-step]').forEach(b => b.addEventListener('click', () => stepPhoto(Number(b.dataset.photoStep))));
  $('#photo-dialog')?.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); stepPhoto(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); stepPhoto(-1); } });

  // Share a piece with a friend.
  $$('[data-share]').forEach(b => b.addEventListener('click', async () => {
    const data = { title: b.dataset.title + ' · ' + document.body.dataset.shopName, text: b.dataset.title + ' from ' + document.body.dataset.shopName, url: location.href.split('#')[0] };
    if (navigator.share) { try { await navigator.share(data); return; } catch (error) { if (error && error.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(data.url); notify('Link copied. Paste it anywhere to share.'); }
    catch { notify('Copy this link to share: ' + data.url); }
  }));

  async function copyDraft(field){const target=$(field);try{await navigator.clipboard.writeText(target.value);notify('Message copied. Paste it into your conversation.');}catch{target.focus();target.select();notify('Select and copy the message, then paste it into your conversation.');}}
  $('[data-copy-message]')?.addEventListener('click',()=>copyDraft('#order-message'));
  $('[data-copy-finder]')?.addEventListener('click',()=>copyDraft('[data-finder-message]'));
  startShop();
})();
