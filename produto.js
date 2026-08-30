const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);

const id = new URLSearchParams(location.search).get('id');
const status = document.querySelector('#status');
const detail = document.querySelector('#detail');
const crumb = document.querySelector('#crumb');

const esc = (v='') => String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const brl = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function extLabel(url=''){ const m=url.toLowerCase().match(/\.(cdr|ai|psd|pdf|zip|rar|7z|eps|svg)(?:$|\?)/); return m ? m[1].toUpperCase() : 'ARQUIVO'; }
function showError(message){ status.textContent=message; status.classList.remove('hidden'); detail.classList.add('hidden'); }
function applyBranding(data){
  if(!data) return;
  document.title = data.brand_name ? `${data.brand_name} — Produto` : document.title;
  document.documentElement.style.setProperty('--primary',data.primary_color||'#19c7b5');
  document.documentElement.style.setProperty('--primary-dark',data.primary_color||'#0b9f91');
  document.documentElement.style.setProperty('--ink',data.text_color||'#102033');
  document.body.style.fontFamily=data.body_font||'Inter, ui-sans-serif, system-ui, sans-serif';
  const brand=document.querySelector('#footerBrand'); if(brand&&data.brand_name) brand.textContent=data.brand_name;
  const mark=document.querySelector('#brandMark');
  if(mark&&data.logo_url){ mark.className='brand-logo'; mark.outerHTML=`<img id="brandMark" class="brand-logo" src="${esc(data.logo_url)}" alt="${esc(data.brand_name||'NEXA PRINT')}">`; }
  if(data.heading_font) document.querySelectorAll('h1,h2,h3,.brand-name strong,.brand-name b').forEach(el=>el.style.fontFamily=data.heading_font);
}

async function load(){
  if(!id) return showError('Produto não informado.');
  const [{data:p,error:pe},{data:settings}] = await Promise.all([
    db.from('products').select('*').eq('id',id).maybeSingle(),
    db.from('site_settings').select('*').eq('id',1).maybeSingle()
  ]);
  if(settings) applyBranding(settings);
  if(pe||!p) return showError('Produto não encontrado.');

  const {data:variants,error:ve}=await db.from('product_variants').select('*').eq('product_id',id).eq('is_active',true).order('size',{ascending:true});
  if(ve) return showError('Não foi possível carregar as configurações.');
  const {data:images}=await db.from('product_images').select('*').eq('product_id',id).order('is_primary',{ascending:false}).order('sort_order',{ascending:true});
  const category = p.category_id ? (await db.from('categories').select('name').eq('id',p.category_id).maybeSingle()).data : null;

  status.classList.add('hidden'); detail.classList.remove('hidden');
  if(crumb) crumb.innerHTML=`<a href="index.html">Início</a> / ${category?.name ? `<span>${esc(category.name)}</span> / ` : ''}<span>${esc(p.name)}</span>`;

  detail.innerHTML=`
    <section class="panel">
      <span class="eyebrow">${esc(category?.name||'PRODUTO')}</span>
      <h1>${esc(p.name)}</h1>
      <div class="product-meta">${p.source_name?`<span class="meta-pill">Catálogo Atual Card</span>`:''}${p.production_days?`<span class="meta-pill">Produção: ${esc(p.production_days)} dias</span>`:''}</div>
      ${p.short_description?`<p class="muted" style="margin:11px 0 0">${esc(p.short_description)}</p>`:''}
      <div class="divider"></div>

      <div class="configuration-block">
        <h3>1. Configure o produto</h3>
        <div class="config-grid" id="variantFields"></div>
      </div>

      <div class="divider"></div>
      <div class="configuration-block"><h3>2. Escolha a quantidade</h3><div id="quantities" class="quantity-list"><div class="muted">Escolha uma configuração.</div></div></div>

      <div class="divider"></div>
      <div class="templates">
        <div class="templates-head"><div><span class="eyebrow" style="margin-bottom:4px">GABARITOS DE ARTE</span><div class="section-title">Baixe o modelo correto antes de montar sua arte.</div><div class="templates-note">Os arquivos abaixo correspondem à configuração selecionada.</div></div></div>
        <div id="templateList" class="template-list"><div class="muted">Selecione a configuração para consultar os gabaritos.</div></div>
      </div>

      <div class="divider"></div>
      <div><h3 class="section-title">Envio da arte</h3><div class="upload-box" style="margin-top:10px"><strong>Depois de montar sua arte, envie o arquivo no checkout.</strong> Aceitamos PDF, AI, CDR e PSD conforme o produto.</div></div>
    </section>

    <aside class="panel buy-card">
      <div class="preview">${images?.[0]?.image_url?`<img src="${esc(images[0].image_url)}" alt="${esc(p.name)}">`:'<span class="preview-placeholder">Imagem do produto</span>'}</div>
      <div class="price-label">VALOR DA CONFIGURAÇÃO</div>
      <div id="total" class="total">Selecione uma quantidade</div>
      <div class="payment-note">Preço exibido conforme quantidade escolhida.</div>
      <div class="buy-actions"><button class="btn btn-primary" id="buy">Comprar agora</button><button class="btn btn-light" id="cart">Adicionar ao carrinho</button></div>
      <div class="buy-hint">Você poderá revisar configuração, quantidade, arte e entrega antes de finalizar.</div>
    </aside>`;

  const values={size:new Set(),material:new Set(),printing:new Set(),finish:new Set(),cut_type:new Set()};
  (variants||[]).forEach(v=>Object.keys(values).forEach(k=>v[k]&&values[k].add(v[k])));
  const labels={size:'Tamanho',material:'Material',printing:'Impressão / Cor',finish:'Cobertura / Acabamento',cut_type:'Corte'};
  const keys=Object.keys(values).filter(k=>values[k].size);
  document.querySelector('#variantFields').innerHTML=keys.map(k=>`<div class="field"><label>${labels[k]}</label><select data-key="${k}"><option value="">Escolha</option>${[...values[k]].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></div>`).join('');

  let selectedVariant=null,selectedPrice=null;
  async function refreshVariant(){
    const wanted={}; document.querySelectorAll('#variantFields select').forEach(s=>wanted[s.dataset.key]=s.value);
    selectedVariant=(variants||[]).find(v=>keys.every(k=>!wanted[k]||v[k]===wanted[k]))||null;
    const qBox=document.querySelector('#quantities'),tBox=document.querySelector('#templateList');
    if(!selectedVariant){ qBox.innerHTML='<div class="muted">Escolha as opções acima para ver quantidades e preços.</div>'; tBox.innerHTML='<div class="muted">Selecione a configuração para consultar os gabaritos.</div>'; document.querySelector('#total').textContent='Selecione uma quantidade'; return; }
    const {data:prices}=await db.from('variant_prices').select('*').eq('variant_id',selectedVariant.id).order('quantity',{ascending:true});
    qBox.innerHTML=(prices||[]).map((x,i)=>`<label class="qty ${i===0?'active':''}"><span class="qty-left"><input type="radio" name="qty" value="${esc(x.id)}" data-price="${esc(x.selling_price)}" ${i===0?'checked':''}> ${esc(x.quantity)} ${esc(x.unit_suffix||'un')}</span><span class="qty-price">${brl(x.selling_price)}</span></label>`).join('')||'<div class="muted">Sem quantidades cadastradas.</div>';
    const pick=inp=>{selectedPrice=Number(inp.dataset.price);document.querySelectorAll('.qty').forEach(x=>x.classList.remove('active'));inp.closest('.qty')?.classList.add('active');document.querySelector('#total').textContent=brl(selectedPrice)};
    const first=qBox.querySelector('input[type=radio]'); if(first) pick(first);
    qBox.querySelectorAll('input').forEach(r=>r.addEventListener('change',()=>pick(r)));
    const {data:links,error:le}=await db.from('variant_templates').select('template_id,sort_order,templates(id,template_url,template_type,title,file_name)').eq('variant_id',selectedVariant.id).order('sort_order',{ascending:true});
    if(le){tBox.innerHTML='<div class="muted">Não foi possível carregar os gabaritos.</div>';return;}
    tBox.innerHTML=(links||[]).map(x=>x.templates).filter(Boolean).map(t=>`<a class="template-link" href="${esc(t.template_url)}" target="_blank" rel="noopener noreferrer"><span class="template-icon">${extLabel(t.template_url).slice(0,4)}</span><span class="template-copy"><strong>${esc(t.title||t.template_type||extLabel(t.template_url))}</strong><span>Baixar gabarito</span></span><span class="template-ext">${extLabel(t.template_url)}</span></a>`).join('')||'<div class="muted">Nenhum gabarito cadastrado para esta configuração.</div>';
  }

  document.querySelectorAll('#variantFields select').forEach(s=>s.addEventListener('change',refreshVariant));
  document.querySelector('#buy').addEventListener('click',()=>alert('Checkout será conectado na próxima etapa.'));
  document.querySelector('#cart').addEventListener('click',()=>alert('Carrinho será conectado na próxima etapa.'));
  if(keys.length===0&&variants?.[0]) await refreshVariant();
}
load().catch(e=>{console.error(e);showError('Erro ao carregar o produto.');});
