(function(){
  const db=window.supabase?.createClient?.(window.NEXA_CONFIG?.SUPABASE_URL,window.NEXA_CONFIG?.SUPABASE_KEY);
  if(!db)return;
  const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let artFee=0,lastVariant='',prices={};
  const setBuyDisabled=disabled=>document.querySelectorAll('.buy-actions .btn').forEach(b=>{
    b.classList.toggle('is-disabled',disabled);
    if(disabled){b.setAttribute('aria-disabled','true');b.title='Indisponível até o cadastro do preço NEXA';}
    else{b.removeAttribute('aria-disabled');b.removeAttribute('title');}
  });
  const setTotal=(text,note)=>{const t=document.querySelector('#total');if(t)t.textContent=text;const n=document.querySelector('#totalNote');if(n)n.textContent=note;};
  async function sync(){
    const q=document.querySelector('#quantities'),variant=window.NEXA_SELECTED_VARIANT_ID;
    if(!q||!variant)return;
    if(variant!==lastVariant){lastVariant=variant;prices={};}
    if(!Object.keys(prices).length){
      const {data,error}=await db.from('variant_prices').select('quantity,selling_price').eq('variant_id',variant).order('quantity');
      if(error)return;
      (data||[]).forEach(p=>prices[String(Number(p.quantity))]=p.selling_price==null?null:Number(p.selling_price));
    }
    q.querySelectorAll('input[name="qty"]').forEach(r=>{
      const sale=prices[String(Number(r.dataset.quantity||0))],configured=sale!=null&&sale>0;
      r.dataset.saleConfigured=configured?'1':'0';
      const row=r.closest('.qty'),el=row?.querySelector('.qty-price');
      if(el){el.dataset.base=sale??'';el.textContent=configured?brl(sale):'Preço NEXA a definir';el.classList.toggle('price-pending',!configured);}
    });
    const selected=q.querySelector('input[name="qty"]:checked');
    if(!selected){setBuyDisabled(true);return;}
    const sale=prices[String(Number(selected.dataset.quantity||0))],configured=sale!=null&&sale>0;
    const createArt=document.querySelector('input[name="art_option"]:checked')?.value==='create';
    if(configured){
      const total=sale+(createArt?artFee:0);
      setTotal(brl(total),createArt?`Produto ${brl(sale)} + criação da arte ${brl(artFee)}`:'Valor do produto selecionado');
      setBuyDisabled(false);
    }else{
      setTotal('Preço NEXA a definir','Quantidade disponível no fornecedor; preço de venda da NEXA ainda não cadastrado.');
      setBuyDisabled(true);
    }
  }
  async function boot(){
    const s=await db.from('site_settings').select('art_creation_price').eq('id',1).maybeSingle();
    artFee=Number(s.data?.art_creation_price||0);
    const q=document.querySelector('#quantities');if(!q)return;
    new MutationObserver(()=>setTimeout(sync,0)).observe(q,{childList:true,subtree:true});
    q.addEventListener('change',()=>setTimeout(sync,0));
    document.addEventListener('change',e=>{if(e.target.matches('input[name="art_option"]'))setTimeout(sync,0);});
    setTimeout(sync,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
