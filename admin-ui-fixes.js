document.addEventListener('DOMContentLoaded',()=>{
  const b=document.querySelector('#addSection');
  if(b)b.addEventListener('click',()=>{if(typeof addSection==='function')addSection();});

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
    .price-panel-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
    .price-panel-title .hint{font-size:11px}
    @media(max-width:720px){#modal .form-grid{grid-template-columns:1fr!important}#modal.modal-backdrop,#shippingModal.modal-backdrop{padding:18px 12px!important}}
  `;
  document.head.appendChild(style);

  /* O admin.js original possui loadPrices como função local. Por isso apenas
     sobrescrever window.loadPrices não altera o HTML que ele renderiza.
     O observador abaixo completa as linhas depois que o preço é renderizado. */
  const priceBox=document.querySelector('#priceProducts');
  if(priceBox){
    const enhance=()=>{
      priceBox.querySelectorAll('table tbody tr').forEach(row=>{
        const save=row.querySelector('[data-save-price]');
        const cost=row.querySelector('[data-cost]');
        const sale=row.querySelector('[data-sale]');
        if(!save||!cost||!sale||row.querySelector('[data-margin]'))return;
        const id=save.dataset.savePrice;
        const c=Number(String(cost.value).replace(',','.'))||0;
        const s=Number(String(sale.value).replace(',','.'))||0;
        const margin=s>0?((s-c)/s)*100:0;
        const cell=document.createElement('td');
        cell.innerHTML=`<input data-margin="${id}" value="${margin.toFixed(1)}" class="price-margin-input" type="number" min="0" max="99.99" step="0.1"><span class="margin-help">Define o preço automaticamente</span>`;
        const saveCell=save.closest('td');
        row.insertBefore(cell,saveCell);
        const marginInput=cell.querySelector('[data-margin]');
        marginInput.addEventListener('input',()=>{
          const costValue=Number(String(cost.value).replace(',','.'))||0;
          const m=Number(String(marginInput.value).replace(',','.'))||0;
          if(costValue>=0&&m>=0&&m<100)sale.value=(costValue/(1-m/100)).toFixed(2);
        });
        sale.addEventListener('input',()=>{
          const costValue=Number(String(cost.value).replace(',','.'))||0;
          const saleValue=Number(String(sale.value).replace(',','.'))||0;
          if(saleValue>0&&saleValue>=costValue)marginInput.value=(((saleValue-costValue)/saleValue)*100).toFixed(1);
        });
      });
      const table=priceBox.querySelector('table');
      if(table&&!table.querySelector('thead th[data-margin-head]')){
        const th=document.createElement('th');th.dataset.marginHead='1';th.textContent='Margem de lucro';
        const heads=table.querySelectorAll('thead th');
        const last=table.querySelector('thead th:last-child');
        if(last)table.querySelector('thead tr').insertBefore(th,last);else table.querySelector('thead tr').appendChild(th);
      }
    };
    new MutationObserver(enhance).observe(priceBox,{childList:true,subtree:true});
    enhance();
  }

  /* Delegação em fase de captura: o botão de preço passa a respeitar a margem. */
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-save-price]');
    if(!btn)return;
    const row=btn.closest('tr');
    const marginEl=row?.querySelector('[data-margin]');
    if(!marginEl)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const costEl=row.querySelector('[data-cost]');
    const saleEl=row.querySelector('[data-sale]');
    const cost=Number(String(costEl?.value||'').replace(',','.'));
    const margin=Number(String(marginEl.value||'').replace(',','.'));
    if(!Number.isFinite(cost)||cost<0||!Number.isFinite(margin)||margin<0||margin>=100){flash('Informe custo e uma margem entre 0% e 99,99%.',false);return;}
    const sale=cost/(1-margin/100);
    saleEl.value=sale.toFixed(2);
    db.from('variant_prices').update({cost_price:cost,selling_price:sale,updated_at:new Date().toISOString()}).eq('id',btn.dataset.savePrice)
      .then(({error})=>flash(error?'Não foi possível salvar.':`Preço atualizado para ${money(sale)} com margem de ${margin.toFixed(1)}%.`,!error));
  },true);
});
