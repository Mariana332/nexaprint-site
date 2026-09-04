(function(){
const {createClient}=window.supabase,db=createClient(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const dims=v=>{const m=String(v??'').replace(',','.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);return m?[Number(m[1]),Number(m[2])]:null};
const sameDim=(a,b)=>a&&b&&((Math.abs(a[0]-b[0])<.01&&Math.abs(a[1]-b[1])<.01)||(Math.abs(a[0]-b[1])<.01&&Math.abs(a[1]-b[0])<.01));
async function fallback(){
 const box=document.getElementById('familyV3Patterns'),id=window.NEXA_SELECTED_VARIANT_ID;
 if(!box||!id||!norm(box.textContent).includes('gabarito ainda nao cadastrado'))return;
 try{
  const {data:v,error}=await db.from('product_variants').select('id,source_url,size').eq('id',id).maybeSingle();
  if(error||!v?.source_url)return;
  const {data:pageVariants}=await db.from('product_variants').select('id').eq('source_url',v.source_url).eq('is_active',true);
  const ids=(pageVariants||[]).map(x=>x.id); if(!ids.length)return;
  const {data:links}=await db.from('variant_templates').select('template_id').in('variant_id',ids);
  const tids=[...new Set((links||[]).map(x=>x.template_id).filter(Boolean))]; if(!tids.length)return;
  const {data:templates}=await db.from('templates').select('id,template_url,template_type,title,file_name').in('id',tids);
  const vd=dims(v.size);
  const usable=(templates||[]).filter(t=>{const td=dims(`${t.title||''} ${t.file_name||''}`);return !td||!vd||sameDim(td,vd)});
  if(!usable.length)return;
  box.innerHTML=usable.map(t=>`<a class="pattern" href="${esc(t.template_url)}" download="${esc(t.file_name||'gabarito')}" target="_blank" rel="noopener"><span><strong>${esc(t.title||t.file_name||t.template_type||'Gabarito')}</strong><small>${esc(t.file_name||'Arquivo de gabarito')}</small></span><span class="pattern-btn">Baixar Gabarito deste Produto</span></a>`).join('');
 }catch(e){console.error('NEXA gabarito fallback',e)}
}
setInterval(fallback,500);
})();
