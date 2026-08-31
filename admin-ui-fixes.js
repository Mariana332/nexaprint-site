document.addEventListener('DOMContentLoaded',()=>{
  const b=document.querySelector('#addSection');
  if(b)b.addEventListener('click',()=>{if(typeof addSection==='function')addSection();});

  /* Ajustes visuais e funcionais do painel */
  const style=document.createElement('style');
  style.textContent=`
    #modal.modal-backdrop,#shippingModal.modal-backdrop{position:fixed!important;inset:0!important;display:none;align-items:flex-start!important;justify-content:center!important;padding:6vh 20px 30px!important;overflow-y:auto!important;z-index:9999!important}
    #modal.modal-backdrop.open,#shippingModal.modal-backdrop.open{display:flex!important}
    #modal .modal,#shippingModal .modal{width:min(900px,100%)!important;max-height:88vh!important;overflow:auto!important;margin:0 auto!important;border-radius:18px!important}
    #modal .modal-head,#shippingModal .modal-head{position:sticky;top:0;background:#fff;z-index:2;padding-bottom:14px;border-bottom:1px solid #edf2f1}
    #modal .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .price-margin-input{width:105px!important;padding:8px!important;border:1px solid var(--admin-line)!important;border-radius:8px!important;background:#fff!important}
    .price-margin-input:focus{outline:0;border-color:var(--admin-primary)!important;box-shadow:0 0 0 3px rgba(18,185,170,.12)}
    .margin-help{display:block;font-size:10px;color:var(--admin-muted);margin-top:3px}
    @media(max-width:720px){#modal .form-grid{grid-template-columns:1fr!important}#modal.modal-backdrop,#shippingModal.modal-backdrop{padding:18px 12px!important}}
  `;
  document.head.appendChild(style);
});

/* Margem editável: a margem é calculada sobre o preço de venda.
   Ex.: custo R$ 10 e margem 50% => preço de venda R$ 20. */
function nexaprintCalcSale(cost,margin){
  const c=Number(cost||0),m=Number(margin||0);
  if(!Number.isFinite(c)||!Number.isFinite(m)||c<0||m<0||m>=100)return null;
  return c/(1-(m/100));
}
function nexaprintMargin(cost,sale){
  const c=Number(cost||0),s=Number(sale||0);
  return s>0?((s-c)/s)*100:0;
}

window.loadPrices=async function(id){
  const b=document.querySelector('#prices-'+id);
  if(!b)return;
  const {data:ps,error}=await db.from('variant_prices').select('id,quantity,unit_suffix,cost_price,selling_price').eq('variant_id',id).order('quantity');
  if(error){b.innerHTML='<div class="muted" style="padding:10px">Não foi possível carregar os preços.</div>';return;}
  if(!ps?.length){b.innerHTML='<div class="muted" style="padding:10px">Sem preços.</div>';return;}
  b.innerHTML=`<table class="table"><thead><tr><th>Quantidade</th><th>Custo / revendedor</th><th>Preço cliente</th><th>Margem de lucro</th><th></th></tr></thead><tbody>${ps.map(p=>{
    const c=Number(p.cost_price||0),s=Number(p.selling_price||0),m=nexaprintMargin(c,s);
    return `<tr><td>${esc(p.quantity)} ${esc(p.unit_suffix||'un')}</td><td><input data-cost="${p.id}" value="${p.cost_price??''}" class="mini-input" inputmode="decimal"></td><td><input data-sale="${p.id}" value="${p.selling_price??''}" class="mini-input" inputmode="decimal"></td><td><input data-margin="${p.id}" value="${m.toFixed(1)}" class="price-margin-input" type="number" min="0" max="99.99" step="0.1"><span class="margin-help">Altera o preço automaticamente</span></td><td><button class="btn icon-btn" data-save-price="${p.id}">Salvar</button></td></tr>`;
  }).join('')}</tbody></table>`;

  ps.forEach(p=>{
    const marginInput=b.querySelector(`[data-margin="${p.id}"]`),saleInput=b.querySelector(`[data-sale="${p.id}"]`),costInput=b.querySelector(`[data-cost="${p.id}"]`);
    marginInput?.addEventListener('input',()=>{
      const sale=nexaprintCalcSale(costInput?.value.replace(',','.'),marginInput.value.replace(',','.'));
      if(sale!==null&&saleInput)saleInput.value=sale.toFixed(2);
    });
    saleInput?.addEventListener('input',()=>{
      const m=nexaprintMargin(costInput?.value.replace(',','.'),saleInput.value.replace(',','.'));
      if(Number.isFinite(m)&&m>=0&&m<100&&marginInput)marginInput.value=m.toFixed(1);
    });
  });
};

async function nexaprintSavePrice(id){
  const costEl=document.querySelector(`[data-cost="${id}"]`),saleEl=document.querySelector(`[data-sale="${id}"]`),marginEl=document.querySelector(`[data-margin="${id}"]`);
  if(!costEl||!saleEl||!marginEl)return;
  const cost=Number(String(costEl.value).replace(',','.'));
  let sale=Number(String(saleEl.value).replace(',','.'));
  const margin=Number(String(marginEl.value).replace(',','.'));
  if(!Number.isFinite(cost)||cost<0||!Number.isFinite(margin)||margin<0||margin>=100){flash('Informe custo e uma margem entre 0% e 99,99%.',false);return;}
  const calculated=nexaprintCalcSale(cost,margin);
  if(calculated===null){flash('Não foi possível calcular o preço.',false);return;}
  sale=calculated;
  saleEl.value=sale.toFixed(2);
  const {error}=await db.from('variant_prices').update({cost_price:cost,selling_price:sale,updated_at:new Date().toISOString()}).eq('id',id);
  flash(error?'Não foi possível salvar.':`Preço atualizado para ${money(sale)} com margem de ${margin.toFixed(1)}%.`,!error);
}

/* Captura antes do listener antigo para garantir que o novo fluxo de margem seja usado. */
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-save-price]');
  if(!btn)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  nexaprintSavePrice(btn.dataset.savePrice);
},true);
