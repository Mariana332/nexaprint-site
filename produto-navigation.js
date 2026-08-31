(function(){
  function reorganizeHeader(){
    const topbar=document.querySelector('.topbar');
    const nav=topbar?.querySelector('.nav-bar');
    if(!topbar||!nav)return;
    topbar.insertAdjacentElement('afterend',nav);
    nav.classList.add('nexa-primary-nav-sticky');
  }
  function renderCategoryNav(categories){
    if(document.querySelector('.nexa-category-nav'))return;
    const bar=document.createElement('div');
    bar.className='nexa-category-nav';
    bar.setAttribute('aria-label','Categorias de produtos');
    bar.innerHTML=`<div class="nexa-category-nav-inner"><span class="nexa-category-nav-label">Produtos</span><button class="nexa-category-arrow" type="button" data-dir="-1" aria-label="Categorias anteriores">‹</button><div class="nexa-category-nav-scroll" id="nexaCategoryScroll"><a class="nexa-category-link active" href="index.html#produtos">Todos</a></div><button class="nexa-category-arrow" type="button" data-dir="1" aria-label="Próximas categorias">›</button></div>`;
    document.querySelector('.nav-bar')?.insertAdjacentElement('afterend',bar);
    const scroll=bar.querySelector('#nexaCategoryScroll');
    (categories||[]).forEach(c=>{const a=document.createElement('a');a.className='nexa-category-link';a.href=`index.html?categoria=${encodeURIComponent(c.slug||'')}#produtos`;a.textContent=c.name||'';scroll.appendChild(a)});
    bar.querySelectorAll('.nexa-category-arrow').forEach(btn=>btn.addEventListener('click',()=>scroll.scrollBy({left:Number(btn.dataset.dir)*Math.max(220,scroll.clientWidth*.55),behavior:'smooth'})));
    const update=()=>{const b=bar.querySelectorAll('.nexa-category-arrow');if(!b.length)return;b[0].disabled=scroll.scrollLeft<=2;b[1].disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-2};
    scroll.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
  }
  function setBuyDisabled(disabled){
    document.querySelectorAll('.buy-actions .btn').forEach(b=>{
      b.classList.toggle('is-disabled',disabled);
      if(disabled){b.setAttribute('aria-disabled','true');b.title='Indisponível até o cadastro de preço e quantidade'}
      else{b.removeAttribute('aria-disabled');b.removeAttribute('title')}
    });
  }
  function fixDataGaps(){
    const qty=document.querySelector('#quantities');
    const text=qty?.textContent||'';
    if(qty && /Sem quantidades cadastradas/i.test(text)){
      qty.innerHTML='<div class="data-gap"><strong>Quantidade e preço em atualização</strong>Esta configuração ainda não teve as quantidades e preços cadastrados. Você já pode conhecer o produto e voltar quando a configuração estiver disponível.</div>';
      setBuyDisabled(true);
    }else if(qty && !/Escolha todas as opções|Essa combinação não está disponível|Selecione uma configuração/i.test(text) && qty.querySelector('input[name="qty"]')){
      setBuyDisabled(false);
    }else if(qty && /Essa combinação não está disponível/i.test(text)){
      setBuyDisabled(true);
    }
    const templates=document.querySelector('#templateList');
    if(templates && /Nenhum gabarito|Gabarito ainda não cadastrado/i.test(templates.textContent||'')){
      templates.innerHTML='<div class="data-gap"><strong>Gabarito não disponível para esta configuração</strong>Nem todo produto possui gabarito para download. Se precisar, a NEXA pode orientar você sobre a preparação da arte.</div>';
    }
  }
  async function loadCategories(){
    try{
      const db=window.supabase?.createClient?.(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
      if(!db)return;
      const {data}=await db.from('categories').select('id,name,slug').eq('is_active',true).order('sort_order').order('name');
      renderCategoryNav(data||[]);
    }catch(e){console.warn('Navegação de categorias:',e)}
  }
  reorganizeHeader();
  loadCategories();
  const observer=new MutationObserver(()=>fixDataGaps());
  const target=document.querySelector('#detail')||document.body;
  observer.observe(target,{childList:true,subtree:true});
  setTimeout(fixDataGaps,600);setTimeout(fixDataGaps,1500);
})();
