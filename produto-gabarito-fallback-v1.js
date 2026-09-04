(function(){
const {createClient}=window.supabase,db=createClient(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const dims=v=>{const m=String(v??'').replace(',','.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);return m?[Number(m[1]),Number(m[2])]:null};
const sameDim=(a,b)=>a&&b&&((Math.abs(a[0]-b[0])<.01&&Math.abs(a[1]-b[1])<.01)||(Math.abs(a[0]-b[1])<.01&&Math.abs(a[1]-b[0])<.01));
const officialFallback=url=>url&&/^https:\/\/oferta\.atualcard\.com\.br\//i.test(url);
async function fallback(){
 const box=document.getElementById('familyV3Patterns'),id=window.NEXA_SELECTED_VARIANT_ID;
 if(!box||!id||!norm(box.textContent).includes('gabarito ainda nao cadastrado'))return;
 try{
  const {data:v,error}=await db.from('product_variants').select('id,source_url,size').eq('id',id).maybeSingle();
  if(error||!v?.source_url)return;
  const {data:pageVariants}=await db.from('product_variants').select('id').eq('source_url',v.source_url).eq('is_active',true);
  const ids=(pageVariants||[]).map(x=>x.id); 
  let usable=[];
  if(ids.length){
   const {data:links}=await db.from('variant_templates').select('template_id').in('variant_id',ids);
   const tids=[...new Set((links||[]).map(x=>x.template_id).filter(Boolean))];
   if(tids.length){
    const {data:templates}=await db.from('templates').select('id,template_url,template_type,title,file_name').in('id',tids);
    const vd=dims(v.size);
    usable=(templates||[]).filter(t=>{const td=dims(`${t.title||''} ${t.file_name||''}`);return !td||!vd||sameDim(td,vd)});
   }
  }
  if(usable.length){
   box.innerHTML=usable.map(t=>`<a class="pattern" href="${esc(t.template_url)}" download="${esc(t.file_name||'gabarito')}" target="_blank" rel="noopener"><span><strong>${esc(t.title||t.file_name||t.template_type||'Gabarito')}</strong><small>${esc(t.file_name||'Arquivo de gabarito')}</small></span><span class="pattern-btn">Baixar Gabarito deste Produto</span></a>`).join('');
   return;
  }
  if(officialFallback(v.source_url)){
   box.innerHTML=`<div class="pattern" style="display:block"><strong>Gabarito disponível na Atual Card</strong><small>Esta configuração não possui arquivo direto cadastrado na NEXA PRINT. A Atual Card disponibiliza o gabarito na própria página oficial do produto.</small><a class="pattern-btn" href="${esc(v.source_url)}" target="_blank" rel="noopener noreferrer">Abrir página e baixar gabarito</a></div>`;
  }
 }catch(e){console.error('NEXA gabarito fallback',e)}
}
setInterval(fallback,500);
})();
