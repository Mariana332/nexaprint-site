(function(){
  const {createClient}=window.supabase;
  const db=createClient(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
  const qs=new URLSearchParams(location.search),family=qs.get('family');
  if(!family)return;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const labels={size:'Tamanho',material:'Papel / Material',printing:'Impressão',finish:'Acabamento',cut_type:'Formato / Corte'};
  const hints={size:'Escolha o formato que você precisa.',material:'Selecione o papel ou material.',printing:'Escolha frente, verso ou frente e verso.',finish:'Escolha o acabamento.',cut_type:'Escolha o corte ou formato especial.'};
  let products=[],variants=[],pricesByVariant=new Map(),selectedProductId=qs.get('id')||'',selectedVariant=null,fieldKeys=[];

  function addStyles(){
    if(document.getElementById('familyUxV2Style'))return;
    const s=document.createElement('style');s.id='familyUxV2Style';
    s.textContent=`
      .family-ux-v2{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(330px,.75fr);gap:20px;align-items:start}
      .family-ux-v2 .panel{min-width:0}
      .family-ux-v2 .product-heading{padding-bottom:14px}
      .family-ux-v2 .family-product-select{padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:2px}
      .family-ux-v2 .family-product-select label{display:block;font-size:13px;font-weight:900;margin-bottom:8px}
      .family-ux-v2 .family-product-select select{width:100%;height:48px;border:1px solid #cfdedb;border-radius:10px;background:#fff;padding:0 14px;color:var(--ink);font:inherit}
      .family-ux-v2 .family-product-help{display:block;margin-top:7px;font-size:12px;color:var(--muted)}
      .family-ux-v2 .family-badge{display:inline-flex;margin-bottom:7px;padding:5px 9px;border-radius:999px;background:#e8f7f4;color:var(--primary-dark);font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
      .family-ux-v2 .config-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .family-ux-v2 .configuration-block{padding-top:18px}
      .family-ux-v2 .step-heading{margin-bottom:14px}
      .family-ux-v2 .field select:disabled{opacity:.55}
      .family-ux-v2 .quantity-list{display:grid;gap:8px}
      .family-ux-v2 .qty{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:48px;padding:10px 14px;border:1px solid #cfdedb;border-radius:9px;background:#fff;cursor:pointer;transition:.15s}
      .family-ux-v2 .qty:hover{border-color:#79bfb4}
      .family-ux-v2 .qty.active{border-color:#18c7b5;box-shadow:0 0 0 1px #18c7b5 inset;background:#f5fbfa}
      .family-ux-v2 .qty-left{display:flex;align-items:center;gap:9px;font-size:14px}
      .family-ux-v2 .qty-left input{accent-color:#13bcae}
      .family-ux-v2 .qty-price{font-weight:900;color:#0b9f91;white-space:nowrap}
      .family-ux-v2 .patterns-box{margin-top:18px;padding:20px;border:1px solid #b8ddd7;border-radius:14px;background:#eef9f7}
      .family-ux-v2 .patterns-box .eyebrow{display:block;margin-bottom:8px}
      .family-ux-v2 .patterns-title{font-size:20px;font-weight:900;margin-bottom:5px}
      .family-ux-v2 .patterns-note{font-size:13px;color:var(--muted);margin-bottom:13px}
      .family-ux-v2 .pattern-download{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid #b8ddd7;border-radius:10px;background:#fff;text-decoration:none}
      .family-ux-v2 .pattern-download strong{display:block;color:var(--ink);font-size:13px}
      .family-ux-v2 .pattern-download span{display:block;margin-top:3px;font-size:12px;color:var(--muted)}
      .family-ux-v2 .pattern-download .pattern-button{padding:9px 12px;border-radius:8px;background:#0b9f91;color:#fff;font-size:12px;font-weight:900;white-space:nowrap}
      .family-ux-v2 .pattern-empty{padding:12px;border:1px dashed #c8d9d6;border-radius:10px;background:#fff;color:var(--muted);font-size:13px}
      .family-ux-v2 .buy-card{position:sticky;top:18px;align-self:start}
      .family-ux-v2 .buy-summary h2{font-size:21px;line-height:1.2;margin:7px 0 11px}
      .family-ux-v2 .summary-options{display:grid;gap:5px}
      .family-ux-v2 .summary-options span{font-size:12px;color:var(--muted)}
      .family-ux-v2 .selected-qty{margin-top:12px;padding:10px 12px;border-radius:9px;background:#f4faf9;font-size:12px;color:var(--muted)}
      .family-ux-v2 .selected-qty strong{color:var(--ink)}
      @media(max-width:850px){.family-ux-v2{grid-template-columns:1fr}.family-ux-v2 .buy-card{position:static}.family-ux-v2 .config-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function all(query){let out=[];for(let from=0;;from+=1000){const {data,error}=await query(from);if(error)throw error;out.push(...(data||[]));if(!data||data.length<1000)break}return out}
  function formatQty(v){const n=Number(v);if(!Number.isFinite(n))return String(v??'');return n.toLocaleString('pt-BR',{maximumFractionDigits:0})}
  function productForVariant(v){return products.find(p=>p.id===v.product_id)}
  function currentOptions(){return Object.fromEntries([...document.querySelectorAll('#familyUxV2Fields select')].map(s=>[s.dataset.key,s.value]).filter(([,v])=>v))}
  function optionsFor(key,current){const compatible=variants.filter(v=>Object.entries(current).every(([k,val])=>k===key||!val||norm(v[k])===norm(val)));return [...new Map(compatible.map(v=>[norm(v[key]),v[key]]).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='')).values()].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}))}
  function variantFor(options){return variants.find(v=>fieldKeys.every(k=>!options[k]||norm(v[k])===norm(options[k])))}

  function renderFields(){
    fieldKeys=['size','material','printing','finish','cut_type'].filter(k=>variants.some(v=>v[k]!==null&&v[k]!==undefined&&String(v[k]).trim()!==''));
    const box=document.getElementById('familyUxV2Fields');
    box.innerHTML=fieldKeys.map(k=>`<div class="field"><label><span class="field-icon">${k==='size'?'▦':k==='material'?'▤':k==='printing'?'◉':k==='finish'?'✦':'✂'}</span>${labels[k]}</label><select data-key="${k}"><option value="">Escolha uma opção</option></select><small>${hints[k]}</small></div>`).join('');
    const apply=(initial={})=>{
      let chosen={...initial};
      fieldKeys.forEach(k=>{const sel=box.querySelector(`select[data-key="${k}"]`);const vals=optionsFor(k,chosen);sel.innerHTML='<option value="">Escolha uma opção</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(chosen[k]&&vals.some(v=>norm(v)===norm(chosen[k])))sel.value=chosen[k];else if(vals.length){sel.value=vals[0];chosen[k]=vals[0]}else{sel.value='';delete chosen[k]} });
      fieldKeys.forEach(k=>{const sel=box.querySelector(`select[data-key="${k}")`);if(sel)sel.disabled=sel.options.length<=1});
      renderSelection(chosen);
    };
    box.querySelectorAll('select').forEach(sel=>sel.addEventListener('change',()=>{
      let chosen=currentOptions();
      fieldKeys.forEach(k=>{const vals=optionsFor(k,chosen),s=box.querySelector(`select[data-key="${k}"]`);const current=chosen[k];s.innerHTML='<option value="">Escolha uma opção</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(current&&vals.some(v=>norm(v)===norm(current)))s.value=current;else if(vals.length){s.value=vals[0];chosen[k]=vals[0]}else{delete chosen[k];s.value=''}});
      renderSelection(chosen);
    }));
    apply({});
  }

  async function renderPatterns(id){
    const box=document.getElementById('familyUxV2Patterns');
    box.innerHTML='<div class="pattern-empty">Carregando padrão de arte…</div>';
    const {data:links,error}=await db.from('variant_templates').select('template_id,sort_order').eq('variant_id',id).order('sort_order');
    if(error){box.innerHTML='<div class="pattern-empty">Não foi possível carregar o gabarito desta configuração.</div>';return}
    const ids=(links||[]).map(x=>x.template_id).filter(Boolean);
    if(!ids.length){box.innerHTML='<div class="pattern-empty">Gabarito ainda não cadastrado para esta configuração.</div>';return}
    const {data,error:te}=await db.from('templates').select('id,template_url,template_type,title,file_name').in('id',ids);
    if(te||!data?.length){box.innerHTML='<div class="pattern-empty">Gabarito ainda não cadastrado para esta configuração.</div>';return}
    box.innerHTML=data.map(t=>`<a class="pattern-download" href="${esc(t.template_url)}" download="${esc(t.file_name||'gabarito')}" target="_blank" rel="noopener"><span><strong>${esc(t.title||t.file_name||t.template_type||'Gabarito')}</strong><span>${esc(t.file_name||'Arquivo de gabarito')}</span></span><span class="pattern-button">Baixar Gabarito deste Produto</span></a>`).join('');
  }

  function renderQuantities(v){
    const box=document.getElementById('familyUxV2Quantities');
    const ps=[...(pricesByVariant.get(v.id)||[])].filter(p=>Number(p.selling_price)>0).sort((a,b)=>Number(a.quantity)-Number(b.quantity));
    if(!ps.length){box.innerHTML='<div class="muted">Nenhuma quantidade disponível para esta configuração.</div>';return}
    box.innerHTML=ps.map((p,i)=>`<label class="qty ${i?'':'active'}"><span class="qty-left"><input type="radio" name="nexa_qty" data-price="${esc(p.selling_price)}" data-quantity="${esc(p.quantity)}" data-unit="${esc(p.unit_suffix||'un')}" ${i?'':'checked'}> <b>${formatQty(p.quantity)}</b> ${esc(p.unit_suffix||'un')}</span><span class="qty-price">${money(p.selling_price)}</span></label>`).join('');
    box.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>{box.querySelectorAll('.qty').forEach(y=>y.classList.remove('active'));x.closest('.qty')?.classList.add('active');updateTotal()}));
  }

  function updateTotal(){
    const r=document.querySelector('#familyUxV2Quantities input[name="nexa_qty"]:checked');
    const total=document.getElementById('familyUxV2Total'),note=document.getElementById('familyUxV2TotalNote'),sq=document.getElementById('familyUxV2SelectedQty');
    if(!r){total.textContent='Selecione uma quantidade';note.textContent='Escolha a quantidade para ver o valor';if(sq)sq.innerHTML='Selecione uma quantidade';return}
    total.textContent=money(r.dataset.price);note.textContent='Valor da quantidade selecionada';if(sq)sq.innerHTML=`Quantidade selecionada: <strong>${formatQty(r.dataset.quantity)} ${esc(r.dataset.unit||'un')}</strong>`;
  }

  async function renderSelection(options){
    const summary=document.getElementById('familyUxV2Summary');
    summary.innerHTML=Object.entries(options).filter(([,v])=>v).map(([k,v])=>`<span><b>${labels[k]}:</b> ${esc(v)}</span>`).join('')||'<span>Escolha as opções</span>';
    const v=variantFor(options);
    if(!v){selectedVariant=null;window.NEXA_SELECTED_VARIANT_ID=null;document.getElementById('familyUxV2Quantities').innerHTML='<div class="muted">Escolha as opções para ver as quantidades e preços.</div>';document.getElementById('familyUxV2Patterns').innerHTML='<div class="pattern-empty">Selecione uma configuração para ver o gabarito.</div>';updateTotal();return}
    selectedVariant=v;window.NEXA_SELECTED_VARIANT_ID=v.id;window.NEXA_SELECTED_PRODUCT_ID=v.product_id;
    history.replaceState({},'',`produto.html?family=${encodeURIComponent(family)}&id=${encodeURIComponent(v.product_id)}`);
    const p=productForVariant(v);document.getElementById('familyUxV2ProductTitle').textContent=p?.name||'Produto';document.getElementById('familyUxV2Image').innerHTML=p?.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="eager">`:'<span class="preview-placeholder">Imagem do produto</span>';
    renderQuantities(v);updateTotal();await renderPatterns(v.id);
  }

  async function loadProduct(id){
    const p=products.find(x=>x.id===id);if(!p)return;
    selectedProductId=id;history.replaceState({},'',`produto.html?family=${encodeURIComponent(family)}&id=${encodeURIComponent(id)}`);
    variants=await all(from=>db.from('product_variants').select('*').eq('product_id',id).eq('is_active',true).order('size').range(from,from+999));
    const vids=variants.map(v=>v.id),prices=vids.length?await all(from=>db.from('variant_prices').select('*').in('variant_id',vids).range(from,from+999)):[];
    pricesByVariant=new Map();prices.forEach(x=>{if(!pricesByVariant.has(x.variant_id))pricesByVariant.set(x.variant_id,[]);pricesByVariant.get(x.variant_id).push(x)});
    document.getElementById('familyUxV2ProductTitle').textContent=p.name;document.getElementById('familyUxV2Image').innerHTML=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="eager">`:'<span class="preview-placeholder">Imagem do produto</span>';
    renderFields();
  }

  function mount(){
    addStyles();const detail=document.getElementById('detail');if(!detail||detail.classList.contains('hidden'))return false;
    detail.className='detail-layout family-ux-v2';
    const familyName=products[0]?.family_name||family;
    detail.innerHTML=`<section class="panel product-config-panel"><div class="product-heading"><span class="eyebrow">GUIA DE PRODUTO</span><span class="family-badge">Família ${esc(familyName)}</span><h1>${esc(familyName)}</h1><p class="muted">Escolha o tipo de produto. Depois, selecione as opções disponíveis e veja imediatamente as quantidades, preços e gabarito.</p></div><div class="family-product-select"><label for="familyUxV2Product">Tipo de produto</label><select id="familyUxV2Product"></select><span class="family-product-help">Os produtos ficam organizados por família, mas configurações e preços continuam separados por produto.</span></div><div class="configuration-block"><div class="step-heading"><span class="step-number">1</span><div><h3>Configure o produto</h3><p>As opções abaixo são filtradas conforme o produto escolhido.</p></div></div><div class="config-grid" id="familyUxV2Fields"></div></div><div class="divider"></div><div class="configuration-block"><div class="step-heading"><span class="step-number">2</span><div><h3>Quantidade</h3><p>Escolha uma das quantidades disponíveis para esta configuração.</p></div></div><div id="familyUxV2Quantities" class="quantity-list"><div class="muted">Carregando quantidades…</div></div></div><div class="patterns-box"><span class="eyebrow">PADRÕES</span><div class="patterns-title">Monte sua arte com o arquivo correto</div><div class="patterns-note">O gabarito muda automaticamente conforme a configuração selecionada.</div><div id="familyUxV2Patterns"><div class="pattern-empty">Selecione uma configuração.</div></div></div></section><aside class="panel buy-card"><div class="preview" id="familyUxV2Image"><span class="preview-placeholder">Imagem do produto</span></div><div class="buy-summary"><span class="eyebrow">RESUMO DO PEDIDO</span><h2 id="familyUxV2ProductTitle">${esc(familyName)}</h2><div id="familyUxV2Summary" class="summary-options"><span>Escolha as opções</span></div><div id="familyUxV2SelectedQty" class="selected-qty">Selecione uma quantidade</div></div><div class="price-label">TOTAL</div><div id="familyUxV2Total" class="total">Selecione uma quantidade</div><div id="familyUxV2TotalNote" class="ux-total-note">Escolha a quantidade para ver o valor</div><div class="buy-actions"><button class="btn btn-primary" id="buy">Comprar agora</button><button class="btn btn-light" id="cart">Adicionar ao carrinho</button></div><div class="secure-note">Compra segura • Você confere tudo antes de finalizar.</div></aside>`;
    const select=document.getElementById('familyUxV2Product');const current=selectedProductId&&products.some(p=>p.id===selectedProductId)?selectedProductId:products[0]?.id||'';selectedProductId=current;select.innerHTML=products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');select.value=current;select.addEventListener('change',()=>loadProduct(select.value));
    loadProduct(current).catch(e=>console.error('NEXA family product',e));return true;
  }

  async function boot(){try{let {data,error}=await db.from('products').select('*').eq('family_key',family).eq('is_active',true).order('name');if(error||!data?.length)return;if(family==='cartao-de-visita')data=data.filter(p=>norm(p.name).includes('cartao de visita'));products=data;const wait=()=>{if(mount())return;setTimeout(wait,150)};wait()}catch(e){console.error('NEXA Family UX V2',e)}}
  boot();
})();
