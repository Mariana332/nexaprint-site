(() => {
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const brl = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let artPrice = null;
  let selectedBase = 0;
  const db = window.supabase && window.NEXA_CONFIG ? window.supabase.createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY) : null;

  function addCategoryNav(){
    if(!db || document.querySelector('#categoryNav')) return;
    const style=document.createElement('style');
    style.textContent='.category-nav{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff}.category-nav-inner{display:flex;align-items:center;gap:8px;min-height:48px}.category-nav-scroll{display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;scrollbar-width:thin;flex:1;padding:5px 2px}.category-nav-scroll::-webkit-scrollbar{height:5px}.category-nav-scroll::-webkit-scrollbar-track{background:#f0f4f2;border-radius:10px}.category-nav-scroll::-webkit-scrollbar-thumb{background:#b7cbc6;border-radius:10px}.category-nav-link{flex:0 0 auto;white-space:nowrap;padding:7px 12px;border:1px solid transparent;border-radius:999px;color:var(--ink);font-size:12px;font-weight:800}.category-nav-link:hover{background:#edf7f4;border-color:#c9e1db;color:var(--primary-dark)}.category-nav-arrow{width:30px;height:30px;flex:0 0 30px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--ink);display:grid;place-items:center;font-size:18px}.category-nav-arrow:disabled{opacity:.35;cursor:default}.category-nav-label{flex:0 0 auto;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}@media(max-width:760px){.category-nav-label{display:none}.category-nav-arrow{display:none}.category-nav-scroll{scrollbar-width:none}.category-nav-scroll::-webkit-scrollbar{display:none}.category-nav-link{font-size:11px;padding:7px 10px}}';
    document.head.appendChild(style);
    const nav=document.createElement('div');nav.id='categoryNav';nav.className='category-nav';nav.setAttribute('aria-label','Categorias de produtos');
    document.querySelector('.topbar')?.insertAdjacentElement('afterend',nav);
    const params=new URLSearchParams(location.search),currentCat=params.get('categoria')||'';
    db.from('categories').select('name,slug,sort_order').eq('is_active',true).order('sort_order').order('name').then(({data})=>{
      nav.innerHTML='<div class="container category-nav-inner"><span class="category-nav-label">Produtos</span><button class="category-nav-arrow" type="button" data-dir="-1" aria-label="Categorias anteriores">‹</button><div class="category-nav-scroll"><a class="category-nav-link" href="index.html#produtos">Todos</a></div><button class="category-nav-arrow" type="button" data-dir="1" aria-label="Próximas categorias">›</button></div>';
      const scroll=nav.querySelector('.category-nav-scroll');
      scroll.insertAdjacentHTML('beforeend',(data||[]).map(c=>`<a class="category-nav-link" href="index.html?categoria=${encodeURIComponent(c.slug)}#produtos">${esc(c.name)}</a>`).join(''));
      nav.querySelectorAll('.category-nav-arrow').forEach(btn=>btn.addEventListener('click',()=>scroll.scrollBy({left:Number(btn.dataset.dir)*Math.max(240,scroll.clientWidth*.55),behavior:'smooth'})));
      const update=()=>{const b=nav.querySelectorAll('.category-nav-arrow');b[0].disabled=scroll.scrollLeft<=2;b[1].disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-2};scroll.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
    });
  }

  async function loadArtPrice(){
    if(!db) return;
    const {data} = await db.from('site_settings').select('art_creation_price').eq('id',1).maybeSingle();
    artPrice = data?.art_creation_price == null ? null : Number(data.art_creation_price);
  }

  function addHelp(){
    if(document.querySelector('.ux-help-strip')) return;
    const box=document.querySelector('.detail-layout .panel');
    if(!box) return;
    const el=document.createElement('div');
    el.className='ux-help-strip';
    el.innerHTML='<strong>Não sabe qual opção escolher?</strong><span>Você pode configurar pelo que conhece — e consultar as explicações antes de comprar.</span><div><a href="ajuda.html#faq">Dúvidas frequentes</a><a href="ajuda.html#arte">Como preparar minha arte</a><a href="ajuda.html#acabamento">Entender acabamentos</a></div>';
    box.appendChild(el);
  }

  function addArtChoice(){
    if(document.querySelector('.art-choice')) return;
    const target=document.querySelector('.detail-layout .panel');
    const qty=document.querySelector('#quantities');
    if(!target || !qty) return;
    const block=document.createElement('div');
    block.className='configuration-block art-choice';
    block.innerHTML=`<h3>3. Sua arte</h3><p class="config-helper">Você já tem o arquivo pronto ou quer que a NEXA cuide da criação?</p>
      <div class="art-options">
        <label class="art-option active"><input type="radio" name="artChoice" value="ready" checked><span><strong>Já tenho minha arte</strong><small>Vou enviar o arquivo seguindo o gabarito.</small></span></label>
        <label class="art-option"><input type="radio" name="artChoice" value="creation"><span><strong>Preciso que a NEXA faça a arte</strong><small class="art-price">${artPrice == null ? 'Preço da criação será informado pela NEXA.' : `Adicionar ${brl(artPrice)}`}</small></span></label>
      </div>
      <div class="art-note">O gabarito continua disponível para você conferir medidas, sangria e área segura.</div>`;
    const divider=document.createElement('div'); divider.className='divider';
    target.insertBefore(divider, document.querySelector('.templates'));
    target.insertBefore(block, document.querySelector('.templates'));
    block.querySelectorAll('input[name="artChoice"]').forEach(input=>input.addEventListener('change',()=>{
      block.querySelectorAll('.art-option').forEach(x=>x.classList.remove('active'));
      input.closest('.art-option')?.classList.add('active');
      recalc();
    }));
  }

  function recalc(){
    const total=document.querySelector('#total');
    if(!total) return;
    const radio=document.querySelector('input[name="qty"]:checked');
    if(!radio) return;
    selectedBase=Number(radio.dataset.price||0);
    const art=document.querySelector('input[name="artChoice"]:checked')?.value==='creation';
    const extra=art && artPrice != null ? artPrice : 0;
    total.textContent=brl(selectedBase+extra);
    let note=document.querySelector('.ux-total-note');
    if(!note){note=document.createElement('div');note.className='ux-total-note';total.insertAdjacentElement('afterend',note)}
    note.textContent=art && artPrice != null ? `Inclui criação da arte: ${brl(artPrice)}` : 'Valor da configuração selecionada.';
  }

  function enhance(){
    if(!document.querySelector('#detail:not(.hidden)')) return;
    addArtChoice();
    addHelp();
    document.querySelectorAll('#quantities input[name="qty"]').forEach(r=>{ if(!r.dataset.uxBound){r.dataset.uxBound='1';r.addEventListener('change',()=>setTimeout(recalc,0));} });
    recalc();
  }

  addCategoryNav();
  loadArtPrice().finally(()=>{
    const obs=new MutationObserver(()=>enhance());
    obs.observe(document.querySelector('#detail') || document.body,{childList:true,subtree:true});
    enhance();
  });
})();
