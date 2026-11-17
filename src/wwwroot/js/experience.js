
(() => {
 const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tiles=$$('.gallery-tile'), buttons=$$('[data-gallery-photo]');let current=0;
 function showPhoto(index){const visible=buttons.filter(b=>!b.closest('figure').hidden);if(!visible.length)return;current=(index+visible.length)%visible.length;const b=visible[current],d=$('#lookbook-dialog');d.querySelector('img').src=b.dataset.galleryPhoto;d.querySelector('img').alt=b.dataset.galleryTitle;$('[data-lookbook-title]').textContent=b.dataset.galleryTitle;$('[data-lookbook-link]').href=b.dataset.galleryHref;}
 buttons.forEach(b=>b.addEventListener('click',()=>{const visible=buttons.filter(x=>!x.closest('figure').hidden);showPhoto(visible.indexOf(b));$('#lookbook-dialog').showModal();document.body.classList.add('dialog-open');}));
 $$('[data-gallery-step]').forEach(b=>b.addEventListener('click',()=>showPhoto(current+Number(b.dataset.galleryStep))));
 $('#lookbook-dialog')?.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();showPhoto(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(current-1);}});
 $$('[data-gallery-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-gallery-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});tiles.forEach(t=>t.hidden=!!b.dataset.galleryFilter&&t.dataset.galleryCategory!==b.dataset.galleryFilter);{const n=tiles.filter(t=>!t.hidden).length;$('[data-gallery-count]').textContent=n+(n===1?' photograph':' photographs')+' to explore';}}));
})();
