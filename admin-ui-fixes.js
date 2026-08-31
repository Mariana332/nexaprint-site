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
    .art-setting{margin-top:18px;padding:18px;border:1px solid var(--admin-line);border-radius:14px;background:#fbfdfc}
    .art-setting h3{margin:0 0 5px}.art-setting p{margin:0 0 12px;font-size:13px;color:var(--admin-muted)}
    .art-setting-row{display:flex;align-items:end;gap:12px;max-width:420px}.art-setting-row .field{flex:1}.art-setting-row input{width:100%}
    @media(max-width:720px){#modal .form-grid{grid-template-columns:1fr!important}#modal.modal-backdrop,#shippingModal.modal-backdrop{padding:18px 12px!important}.art-setting-row{display:block}}
  `;
  document.head.appendChild(style);

  const settingsPanel=document.querySelector('[data-panel="settings"] .form-grid');
  if(settingsPanel && !document.querySelector('#art_creation_price')){
    const wrap=document.createElement('div');wrap.className='art-setting full';
    wrap.innerHTML='<h3>Criação da arte</h3><p>Defina o valor cobrado quando o cliente pedir para a NEXA criar a arte do produto.</p><div class="art-setting-row"><div class="field"><label>VALOR DA CRIAÇÃO</label><input id="art_creation_price" type="number" min="0" step="0.01" placeholder="Ex.: 35,00"></div></div>';
    settingsPanel.parentElement.insertBefore(wrap,settingsPanel.nextSibling);
    const loadArtSetting=async()=>{const {data}=await db.from('site_settings').select('art_creation_price').eq('id',1).maybeSingle();if(data?.art_creation_price!=null)document.querySelector('#art_creation_price').value=data.art_creation_price};
    loadArtSetting();
    const saveBtn=document.querySelector('#saveSettings');
    saveBtn?.addEventListener('click',async()=>{const value=document.querySelector('#art_creation_price').value.trim();const price=value===''?null:Number(value.replace(',','.'));if(price!==null&&!Number.isFinite(price)){flash('Informe um valor válido para a criação da arte.',false);return}const {error}=await db.from('site_settings').update({art_creation_price:price,updated_at:new Date().toISOString()}).eq('id',1);if(error)flash('Não foi possível salvar o valor da criação da arte.',false);else flash(price===null?'Valor da criação da arte removido.':`Criação da arte definida em ${money(price)}.`)});
  }

  const priceBox=document.querySelector('#priceProducts');
  if(priceBox){
    const enhance=()=>{
      priceBox.querySelectorAll('table tbody tr').forEach(row=>{
        const save=row.querySelector('[data-save-price]');const cost=row.querySelector('[data-cost]');const sale=row.querySelector('[data-sale]');
        if(!save||!cost||!sale||row.querySelector('[data-margin]'))return;
        const id=save.dataset.savePrice,c=Number(String(cost.value).replace(',','.'))||0,s=Number(String(sale.value).replace(',','.'))||0,margin=s>0?((s-c)/s)*100:0;
        const cell=document.createElement('td');cell.innerHTML=`<input data-margin="${id}" value="${margin.toFixed(1)}" class="price-margin-input" type="number" min="0" max="99.99" step="0.1"><span class="margin-help">Define o preço automaticamente</span>`;
        const saveCell=save.closest('td');row.insertBefore(cell,saveCell);
        const marginInput=cell.querySelector('[data-margin]');
        marginInput.addEventListener('input',()=>{const costValue=Number(String(cost.value).replace(',','.'))||0,m=Number(String(marginInput.value).replace(',','.'))||0;if(costValue>=0&&m>=0&&m<100)sale.value=(costValue/(1-m/100)).toFixed(2)});
        sale.addEventListener('input',()=>{const costValue=Number(String(cost.value).replace(',','.'))||0,saleValue=Number(String(sale.value).replace(',','.'))||0;if(saleValue>0&&saleValue>=costValue)marginInput.value=(((saleValue-costValue)/saleValue)*100).toFixed(1)});
      });
      const table=priceBox.querySelector('table');if(table&&!table.querySelector('thead th[data-margin-head]')){const th=document.createElement('th');th.dataset.marginHead='1';th.textContent='Margem de lucro';const last=table.querySelector('thead th:last-child');if(last)table.querySelector('thead tr').insertBefore(th,last);else table.querySelector('thead tr').appendChild(th)}
    };
    new MutationObserver(enhance).observe(priceBox,{childList:true,subtree:true});enhance();
  }

  document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-save-price]');if(!btn)return;const row=btn.closest('tr'),marginEl=row?.querySelector('[data-margin]');if(!marginEl)return;e.preventDefault();e.stopImmediatePropagation();const costEl=row.querySelector('[data-cost]'),saleEl=row.querySelector('[data-sale]'),cost=Number(String(costEl?.value||'').replace(',','.')),margin=Number(String(marginEl.value||'').replace(',','.'));if(!Number.isFinite(cost)||cost<0||!Number.isFinite(margin)||margin<0||margin>=100){flash('Informe custo e uma margem entre 0% e 99,99%.',false);return}const sale=cost/(1-margin/100);saleEl.value=sale.toFixed(2);db.from('variant_prices').update({cost_price:cost,selling_price:sale,updated_at:new Date().toISOString()}).eq('id',btn.dataset.savePrice).then(({error})=>flash(error?'Não foi possível salvar.':`Preço atualizado para ${money(sale)} com margem de ${margin.toFixed(1)}%.`,!error))},true);
});
