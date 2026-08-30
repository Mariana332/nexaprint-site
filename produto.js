const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);
const id = new URLSearchParams(location.search).get('id');
const status = document.querySelector('#status');
const detail = document.querySelector('#detail');

const esc = (v='') => String(v).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const brl = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function extLabel(url='') { const m=url.toLowerCase().match(/\.(cdr|ai|psd|pdf|zip|rar|7z|eps|svg)(?:$|\?)/); return m ? m[1].toUpperCase() : 'Arquivo'; }
function showError(message){status.textContent=message; status.classList.remove('hidden'); detail.classList.add('hidden');}

async function load() {
  if (!id) return showError('Produto não informado.');
  const { data: p, error: pe } = await db.from('products').select('*').eq('id', id).maybeSingle();
  if (pe || !p) return showError('Produto não encontrado.');
  const { data: variants, error: ve } = await db.from('product_variants').select('*').eq('product_id', id).eq('is_active', true).order('size', {ascending:true});
  if (ve) return showError('Não foi possível carregar as configurações.');
  const { data: images } = await db.from('product_images').select('*').eq('product_id', id).order('is_primary',{ascending:false}).order('sort_order',{ascending:true});
  status.classList.add('hidden'); detail.classList.remove('hidden');
  detail.innerHTML = `
    <section class="panel">
      <h1>${esc(p.name)}</h1>
      <div class="divider"></div>
      ${p.short_description ? `<p class="muted">${esc(p.short_description)}</p><div class="divider"></div>` : ''}
      <div class="field-grid" id="variantFields"></div>
      <div class="divider"></div>
      <span class="eyebrow">QUANTIDADE</span>
      <div class="quantity-list" id="quantities"><div class="muted">Escolha uma configuração.</div></div>
      <div class="divider"></div>
      <div class="templates"><span class="eyebrow">GABARITOS DE ARTE</span><h3 style="margin:0;color:var(--ink)">Baixe o modelo antes de montar sua arte.</h3><div id="templateList" class="template-list"><div class="muted">Selecione a configuração para ver os gabaritos.</div></div></div>
      <div class="divider"></div>
      <span class="eyebrow">ENVIO DA ARTE</span><div class="upload">Depois de montar a arte no gabarito, envie seu PDF/AI/CDR/PSD no checkout.</div>
    </section>
    <aside class="panel buy-card">
      <div class="preview">${images?.[0]?.image_url ? `<img src="${esc(images[0].image_url)}" alt="${esc(p.name)}">` : '<span class="muted">Imagem do produto</span>'}</div>
      <div class="total"><small>VALOR TOTAL</small><strong id="total">Selecione uma quantidade</strong></div>
      <div class="buy-actions"><button class="btn btn-primary" id="buy">Comprar agora</button><button class="btn btn-light" id="cart">Adicionar ao carrinho</button></div>
    </aside>`;

  const fieldValues = { size:new Set(), material:new Set(), printing:new Set(), finish:new Set(), cut_type:new Set() };
  (variants || []).forEach(v => Object.keys(fieldValues).forEach(k => v[k] && fieldValues[k].add(v[k])));
  const fieldNames={size:'Tamanho',material:'Material / Papel',printing:'Cor / Impressão',finish:'Cobertura / Acabamento',cut_type:'Corte'};
  const keys=Object.keys(fieldValues).filter(k=>fieldValues[k].size);
  document.querySelector('#variantFields').innerHTML=keys.map(k=>`<div class="field"><label>${fieldNames[k]}</label><select data-key="${k}"><option value="">Escolha</option>${[...fieldValues[k]].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`).join('');

  let selectedVariant = null;
  let selectedPrice = null;
  async function refreshVariant(){
    const wanted={};document.querySelectorAll('#variantFields select').forEach(s=>wanted[s.dataset.key]=s.value);
    selectedVariant = (variants||[]).find(v => keys.every(k => !wanted[k] || v[k]===wanted[k])) || null;
    const qBox=document.querySelector('#quantities'), tBox=document.querySelector('#templateList');
    if (!selectedVariant){qBox.innerHTML='<div class="muted">Escolha a configuração.</div>';tBox.innerHTML='<div class="muted">Selecione a configuração para ver os gabaritos.</div>';document.querySelector('#total').textContent='Selecione uma quantidade';return;}
    const {data: prices}=await db.from('variant_prices').select('*').eq('variant_id',selectedVariant.id).order('quantity',{ascending:true});
    qBox.innerHTML=(prices||[]).map((x,i)=>`<label class="qty ${i===0?'active':''}"><span class="qty-left"><input type="radio" name="qty" value="${esc(x.id)}" data-price="${esc(x.selling_price)}" ${i===0?'checked':''}> ${esc(x.quantity)} ${esc(x.unit_suffix||'un')}</span><span class="qty-price">${brl(x.selling_price)}</span></label>`).join('') || '<div class="muted">Sem quantidades cadastradas.</div>';
    function pickPrice(input){selectedPrice=Number(input.dataset.price);document.querySelectorAll('.qty').forEach(x=>x.classList.remove('active'));input.closest('.qty')?.classList.add('active');document.querySelector('#total').textContent=brl(selectedPrice)}
    const first=qBox.querySelector('input[type=radio]'); if(first) pickPrice(first);
    qBox.querySelectorAll('input').forEach(r=>r.addEventListener('change',()=>pickPrice(r)));
    const {data: links}=await db.from('variant_templates').select('template_id,sort_order,templates(id,template_url,template_type,title,file_name)').eq('variant_id',selectedVariant.id).order('sort_order',{ascending:true});
    tBox.innerHTML=(links||[]).map(x=>x.templates).filter(Boolean).map(t=>`<a class="template-link" href="${esc(t.template_url)}" target="_blank" rel="noopener"><span><strong>${esc(t.title||t.template_type||extLabel(t.template_url))}</strong><br><span>Baixar gabarito</span></span><b>${esc(extLabel(t.template_url))}</b></a>`).join('') || '<div class="muted">Nenhum gabarito cadastrado para esta configuração.</div>';
  }
  document.querySelectorAll('#variantFields select').forEach(s=>s.addEventListener('change',refreshVariant));
  document.querySelector('#buy').addEventListener('click',()=>alert('Checkout será conectado na próxima etapa.'));
  document.querySelector('#cart').addEventListener('click',()=>alert('Carrinho será conectado na próxima etapa.'));
  if (keys.length===0 && variants?.[0]) { selectedVariant=variants[0]; await refreshVariant(); }
}
load().catch(e=>{console.error(e);showError('Erro ao carregar o produto.');});
