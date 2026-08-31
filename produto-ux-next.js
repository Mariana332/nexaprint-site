(() => {
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const brl = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let artPrice = null;
  let selectedBase = 0;
  const db = window.supabase && window.NEXA_CONFIG ? window.supabase.createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY) : null;

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

  loadArtPrice().finally(()=>{
    const obs=new MutationObserver(()=>enhance());
    obs.observe(document.querySelector('#detail') || document.body,{childList:true,subtree:true});
    enhance();
  });
})();
