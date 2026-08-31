const {createClient}=window.supabase;
const db=createClient(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
const id=new URLSearchParams(location.search).get('id');
const status=document.querySelector('#status'),detail=document.querySelector('#detail'),crumb=document.querySelector('#crumb'),globalSearch=document.querySelector('#globalSearch');
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const ext=url=>((String(url).toLowerCase().match(/\.(cdr|ai|psd|pdf|zip|rar|7z|eps|svg)(?:$|\?)/)||[])[1]||'arquivo').toUpperCase();
const imageTag=(url,alt)=>url?`<img src="${esc(url)}" alt="${esc(alt)}" referrerpolicy="no-referrer" loading="eager" onerror="this.onerror=null;this.style.display='none';this.parentElement.querySelector('.preview-placeholder')?.classList.remove('hidden')">`:'<span class="preview-placeholder">Imagem do produto</span>';
let artCreationPrice=0;
let selectedVariant=null;
const masterFallback=[
 {match:['adesivo de papel 3x3cm','3x3cm','couche 90g','4x0','sem verniz'],templates:[
  ['Corel Draw - PADRÃO — Link de Arquivos','https://oferta.atualcard.com.br/arquivos/padroes/Adesivo_papel_Redondo_3x3cm.cdr'],
  ['Illustrator - PADRÃO — Link de Arquivos','https://oferta.atualcard.com.br/arquivos/padroes/ai/Adesivo_papel_Redondo_3x3cm.ai'],
  ['PDF X-1a - PADRÃO — Link de Arquivos','https://oferta.atualcard.com.br/arquivos/padroes/pdf/Adesivo_papel_Redondo_3x3cm.pdf'],
  ['Photoshop - PADRÃO — Link de Arquivos','https://oferta.atualcard.com.br/arquivos/padroes/psd/Adesivo_papel_Redondo_3x3cm.rar']
 ]}
];
function fail(m){status.textContent=m;status.classList.remove('hidden');detail.classList.add('hidden')}
function branding(d){
 if(!d)return;
 document.title=d.brand_name?`${d.brand_name} — Produto`:document.title;
 document.documentElement.style.setProperty('--primary',d.primary_color||'#19c7b5');
 document.documentElement.style.setProperty('--primary-dark',d.primary_color||'#0b9f91');
 document.documentElement.style.setProperty('--ink',d.text_color||'#102033');
 if(d.background_color)document.documentElement.style.setProperty('--white',d.background_color);
 document.body.style.fontFamily=d.body_font||'Inter,ui-sans-serif,system-ui,sans-serif';
 const m=document.querySelector('#brandMark');
 if(m&&d.logo_url)m.outerHTML=`<img id="brandMark" class="brand-logo" src="${esc(d.logo_url)}" alt="${esc(d.brand_name||'NEXA PRINT')}" referrerpolicy="no-referrer">`;
 artCreationPrice=Number(d.art_creation_price||0);
}
function setupGlobalSearch(){if(!globalSearch)return;globalSearch.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const q=globalSearch.value.trim();location.href=q?`index.html?q=${encodeURIComponent(q)}#produtos`:'index.html#produtos'})}
function masterTemplates(p,v){const hay=norm(`${p?.name||''} ${v?.size||''} ${v?.material||''} ${v?.printing||''} ${v?.finish||''}`);return masterFallback.find(x=>x.match.every(term=>hay.includes(norm(term))))?.templates||[]}
async function loadTemplates(variantId,p,v){
 const box=document.querySelector('#templateList');
 box.innerHTML='<div class="muted">Carregando gabaritos…</div>';
 const {data:links,error:e1}=await db.from('variant_templates').select('template_id,sort_order').eq('variant_id',variantId).order('sort_order');
 if(e1){console.error(e1);box.innerHTML='<div class="muted">Não foi possível carregar os gabaritos.</div>';return}
 const ids=[...(links||[])].map(x=>x.template_id).filter(Boolean);let uniqueTemplates=[];
 if(ids.length){
  const {data:ts,error:e2}=await db.from('templates').select('id,template_url,template_type,title,file_name').in('id',ids);
  if(e2){console.error(e2);box.innerHTML='<div class="muted">Não foi possível carregar os gabaritos.</div>';return}
  const map=new Map((ts||[]).map(t=>[t.id,t]));const seenTypes=new Set();
  uniqueTemplates=ids.map(x=>map.get(x)).filter(Boolean).filter(t=>{const type=norm(t.template_type||ext(t.template_url));if(seenTypes.has(type))return false;seenTypes.add(type);return true})
 }
 if(!uniqueTemplates.length)uniqueTemplates=masterTemplates(p,v).map(([title,url])=>({title,template_type:title,template_url:url,file_name:url.split('/').pop()}));
 if(!uniqueTemplates.length){box.innerHTML='<div class="muted">Gabarito ainda não cadastrado para esta configuração.</div>';return}
 box.innerHTML=uniqueTemplates.map(t=>{const u=t.template_url||'';const name=t.file_name?.split(/[\\/]/).pop()||`${norm(t.template_type||ext(u)).replace(/[^a-z0-9]+/gi,'-')}.${ext(u).toLowerCase()}`;return `<a class="template-link" href="${esc(u)}" download="${esc(name)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><span class="template-icon">${esc(ext(u).slice(0,4))}</span><span class="template-copy"><strong>${esc(t.title||t.template_type||ext(u))}</strong><span>Baixar gabarito</span></span><span class="template-ext">${esc(ext(u))}</span></a>`}).join('')
}
function friendlyLabel(key){return ({size:'Tamanho',material:'Papel / Material',printing:'Impressão',finish:'Acabamento',cut_type:'Formato / Corte'})[key]||key}
function friendlyHint(key){return ({size:'Escolha o tamanho que você precisa.',material:'Se não souber o nome do papel, veja as opções disponíveis.',printing:'Ex.: colorido frente e verso.',finish:'Escolha o efeito que deseja no material.',cut_type:'Se quiser um formato diferente do padrão, escolha aqui.'})[key]||''}
function optionIcon(key){return ({size:'▦',material:'▤',printing:'◉',finish:'✦',cut_type:'✂'})[key]||'•'}
function selectedOptions(){return Object.fromEntries([...document.querySelectorAll('#variantFields select')].map(s=>[s.dataset.key,s.value]))}
function updateChoiceStyles(){document.querySelectorAll('#variantFields .field').forEach(field=>{const s=field.querySelector('select');field.classList.toggle('is-selected',!!s?.value)})}
function renderHelpStrip(){
 const box=document.querySelector('#productHelp');if(!box)return;
 box.innerHTML=`<strong>Não sabe qual opção escolher?</strong><span>Você não precisa entender termos de gráfica. Veja explicações rápidas antes de comprar.</span><div><a href="ajuda.html#papel">Entender papéis</a><a href="ajuda.html#formato">Ver tamanhos</a><a href="ajuda.html#acabamento">Conhecer acabamentos</a><a href="ajuda.html#arte">Como preparar a arte</a><a href="ajuda.html#faq">Dúvidas frequentes</a></div>`;
}
function renderArtChoice(){
 const box=document.querySelector('#artChoice');if(!box)return;
 const price=artCreationPrice;
 box.innerHTML=`<div class="art-choice-head"><div><h3>Precisa que a NEXA faça a arte?</h3><p>Escolha uma opção. Se você já tem o arquivo pronto, não há cobrança de criação.</p></div></div><div class="art-options"><label class="art-option active"><input type="radio" name="art_option" value="ready" checked><span><strong>Já tenho minha arte</strong><small>Tenho o arquivo e quero enviar para produção.</small><small class="art-price">Sem custo de criação</small></span></label><label class="art-option"><input type="radio" name="art_option" value="create"><span><strong>Quero que a NEXA faça</strong><small>A equipe prepara a arte para este produto.</small><small class="art-price">${price>0?`+ ${brl(price)}`:'Valor a definir'}</small></span></label></div><div class="art-note">A criação da arte é opcional e cobrada uma única vez por item do carrinho.</div>`;
 box.querySelectorAll('input[name="art_option"]').forEach(r=>r.addEventListener('change',()=>{box.querySelectorAll('.art-option').forEach(x=>x.classList.remove('active'));r.closest('.art-option')?.classList.add('active');updateTotal()}));
}
function currentArtFee(){return document.querySelector('input[name="art_option"]:checked')?.value==='create'?artCreationPrice:0}
function updateTotal(){
 const radio=document.querySelector('#quantities input[name="qty"]:checked');
 const base=Number(radio?.dataset.basePrice||radio?.dataset.price||0);const fee=currentArtFee();
 const total=base+fee;const el=document.querySelector('#total');if(el)el.textContent=radio?brl(total):'Selecione uma quantidade';
 const note=document.querySelector('#totalNote');if(note)note.innerHTML=radio&&fee?`Produto ${brl(base)} + criação da arte ${brl(fee)}`:radio?'Valor do produto selecionado':'Escolha a quantidade para ver o valor';
 if(radio){document.querySelectorAll('#quantities .qty-price').forEach(x=>{const b=Number(x.dataset.base||0);x.textContent=brl(b)})}
}
async function load(){
 setupGlobalSearch();
 if(!id)return fail('Produto não informado.');
 const [{data:p,error:pe},{data:s}]=await Promise.all([db.from('products').select('*').eq('id',id).maybeSingle(),db.from('site_settings').select('*').eq('id',1).maybeSingle()]);
 if(s)branding(s);if(pe||!p)return fail('Produto não encontrado.');
 const {data:variants,error:ve}=await db.from('product_variants').select('*').eq('product_id',id).eq('is_active',true).order('size');
 if(ve)return fail('Não foi possível carregar as configurações.');
 const {data:images}=await db.from('product_images').select('*').eq('product_id',id).order('is_primary',{ascending:false}).order('sort_order');
 const cat=p.category_id?(await db.from('categories').select('name').eq('id',p.category_id).maybeSingle()).data:null;
 status.classList.add('hidden');detail.classList.remove('hidden');
 if(crumb)crumb.innerHTML=`<a href="index.html">Início</a> / ${cat?.name?esc(cat.name)+' / ':''}${esc(p.name)}`;
 const previewUrl=p.image_url||images?.[0]?.image_url||'';
 detail.innerHTML=`
 <section class="panel product-config-panel">
  <div class="product-heading"><span class="eyebrow">${esc(cat?.name||'PRODUTO')}</span><h1>${esc(p.name)}</h1>${p.short_description?`<p class="muted">${esc(p.short_description)}</p>`:''}</div>
  <div class="configuration-block"><div class="step-heading"><span class="step-number">1</span><div><h3>Escolha como você quer o produto</h3><p>Você pode selecionar pelas opções abaixo. Não precisa saber o nome técnico.</p></div></div><div class="config-grid" id="variantFields"></div></div>
  <div class="divider"></div>
  <div class="configuration-block"><div class="step-heading"><span class="step-number">2</span><div><h3>Escolha a quantidade</h3><p>Mostramos o preço de cada quantidade para você comparar.</p></div></div><div id="quantities" class="quantity-list"><div class="muted">Escolha todas as opções acima.</div></div></div>
  <div class="divider"></div>
  <div id="artChoice" class="configuration-block"></div>
  <div class="divider"></div>
  <div class="templates"><span class="eyebrow">GABARITO DE ARTE</span><div class="section-title">Quer montar a arte sozinho?</div><div class="templates-note">Baixe o modelo correto da configuração escolhida. Se preferir, você pode contratar a criação da arte acima.</div><div id="templateList" class="template-list"><div class="muted">Selecione a configuração.</div></div></div>
  <div id="productHelp" class="ux-help-strip"></div>
 </section>
 <aside class="panel buy-card">
  <div class="preview">${previewUrl?`${imageTag(previewUrl,p.image_alt||p.name)}<span class="preview-placeholder hidden">Imagem do produto</span>`:'<span class="preview-placeholder">Imagem do produto</span>'}</div>
  <div class="buy-summary"><span class="eyebrow">RESUMO</span><h2>${esc(p.name)}</h2><div id="summaryOptions" class="summary-options"><span>Escolha as opções</span></div></div>
  <div class="price-label">TOTAL</div><div id="total" class="total">Selecione uma quantidade</div><div id="totalNote" class="ux-total-note">Escolha a quantidade para ver o valor</div>
  <div class="buy-actions"><button class="btn btn-primary" id="buy">Comprar agora</button><button class="btn btn-light" id="cart">Adicionar ao carrinho</button></div>
  <div class="secure-note">Compra segura • Você confere tudo antes de finalizar.</div>
 </aside>`;
 const values={size:new Set(),material:new Set(),printing:new Set(),finish:new Set(),cut_type:new Set()};
 (variants||[]).forEach(v=>Object.keys(values).forEach(k=>v[k]&&values[k].add(v[k])));
 const labels=Object.keys(values).filter(k=>values[k].size);
 document.querySelector('#variantFields').innerHTML=labels.map(k=>`<div class="field"><label><span class="field-icon">${optionIcon(k)}</span>${friendlyLabel(k)}</label><select data-key="${k}"><option value="">Escolha uma opção</option>${[...values[k]].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select><small>${esc(friendlyHint(k))}</small></div>`).join('');
 renderArtChoice();renderHelpStrip();
 async function refresh(){
  const wanted=selectedOptions();updateChoiceStyles();
  const summary=document.querySelector('#summaryOptions');
  if(summary)summary.innerHTML=Object.entries(wanted).filter(([,v])=>v).map(([k,v])=>`<span><b>${esc(friendlyLabel(k))}:</b> ${esc(v)}</span>`).join('')||'<span>Escolha as opções do produto</span>';
  if(labels.some(k=>!wanted[k])){selectedVariant=null;window.NEXA_SELECTED_VARIANT_ID=null;document.querySelector('#quantities').innerHTML='<div class="muted">Escolha todas as opções acima para ver as quantidades e preços.</div>';document.querySelector('#templateList').innerHTML='<div class="muted">Selecione a configuração completa para consultar o gabarito.</div>';document.querySelector('#total').textContent='Selecione uma quantidade';return}
  const v=(variants||[]).find(x=>labels.every(k=>norm(x[k])===wanted[k]));
  if(!v){selectedVariant=null;window.NEXA_SELECTED_VARIANT_ID=null;document.querySelector('#quantities').innerHTML='<div class="muted">Essa combinação não está disponível. Tente outra opção.</div>';document.querySelector('#templateList').innerHTML='<div class="muted">Nenhum gabarito para essa combinação.</div>';document.querySelector('#total').textContent='Configuração indisponível';return}
  selectedVariant=v;window.NEXA_SELECTED_VARIANT_ID=v.id;
  const {data:prices}=await db.from('variant_prices').select('*').eq('variant_id',v.id).order('quantity');
  const q=document.querySelector('#quantities');
  q.innerHTML=(prices||[]).map((x,i)=>`<label class="qty ${i===0?'active':''}"><span class="qty-left"><input type="radio" name="qty" data-price="${esc(x.selling_price)}" data-base-price="${esc(x.selling_price)}" data-quantity="${esc(x.quantity)}" data-unit="${esc(x.unit_suffix||'un')}" ${i===0?'checked':''}> <b>${esc(x.quantity)}</b> ${esc(x.unit_suffix||'un')}</span><span class="qty-price" data-base="${esc(x.selling_price)}">${brl(x.selling_price)}</span></label>`).join('')||'<div class="muted">Sem quantidades cadastradas.</div>';
  q.querySelectorAll('input').forEach(r=>r.onchange=()=>{q.querySelectorAll('.qty').forEach(z=>z.classList.remove('active'));r.closest('.qty')?.classList.add('active');updateTotal()});
  updateTotal();await loadTemplates(v.id,p,v);
 }
 document.querySelectorAll('#variantFields select').forEach(s=>s.addEventListener('change',refresh));
 await refresh();
}
load().catch(e=>{console.error(e);fail('Erro ao carregar o produto.')});
