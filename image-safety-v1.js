(()=>{
 const bad=u=>/cdn\.atualcard\.com\.br\/arquivos\/menu\/normais\//i.test(String(u||''));
 const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
 const make=(label,sub='')=>`<div class="nexa-visual"><span class="nexa-visual-mark">NEXA PRINT</span><strong>${esc(label||'Produto gráfico')}</strong>${sub?`<small>${esc(sub)}</small>`:''}</div>`;
 const clean=()=>{
   document.querySelectorAll('img[src]').forEach(img=>{
     if(!bad(img.currentSrc||img.src))return;
     const parent=img.parentElement;if(!parent)return;
     let label='Produto gráfico',sub='';
     const card=img.closest('.product-card,.category-card');
     if(card){label=card.querySelector('h3,strong')?.textContent?.trim()||label;sub=card.classList.contains('category-card')?'Explore a categoria':'Configure e compre';}
     const detail=img.closest('#familyV3Image');
     if(detail){label=document.querySelector('#familyV3Title')?.textContent?.trim()||label;sub='Imagem ilustrativa';}
     parent.innerHTML=make(label,sub);
   });
 };
 const boot=()=>{clean();new MutationObserver(clean).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();