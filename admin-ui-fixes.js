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
    .art-setting{margin-top:18px;padding:18px;border:1px solid var(--admin-line);border-radius:14px;background:#fbfdfc}
    .art-setting h3{margin:0 0 5px}.art-setting p{margin:0 0 12px;font-size:13px;color:var(--admin-muted)}
    .art-setting-row{display:flex;align-items:end;gap:12px;max-width:420px}.art-setting-row .field{flex:1}.art-setting-row input{width:100%}
    .options-admin{margin-top:24px}.options-admin-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:14px}.options-admin-head h2{margin:0 0 4px}.options-admin-head p{margin:0;color:var(--admin-muted);font-size:13px}.options-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.options-toolbar select,.options-toolbar input{min-height:42px}.options-list{display:grid;gap:10px}.option-admin-row{display:grid;grid-template-columns:minmax(180px,1.5fr) 150px minmax(220px,2fr) 90px auto;gap:12px;align-items:center;padding:14px;border:1px solid var(--admin-line);border-radius:12px;background:#fff}.option-admin-row .mini-input{width:100%}.option-admin-row .option-label{font-weight:700}.option-admin-row .option-type{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--admin-muted)}.option-admin-row .option-desc{font-size:12px;color:var(--admin-muted)}.option-admin-row .actions{justify-content:flex-end}.option-admin-form{display:grid;grid-template-columns:1fr 180px 130px 2fr auto;gap:10px;align-items:end;padding:16px;border:1px dashed var(--admin-line);border-radius:12px;background:#fbfdfc;margin-bottom:14px}.option-admin-form .field{margin:0}.option-admin-form button{height:42px}.option-admin-empty{padding:18px;border:1px dashed var(--admin-line);border-radius:12px;color:var(--admin-muted);text-align:center}
    .price-summary{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px}.price-summary span{padding:6px 9px;border-radius:999px;background:#f2f7f6;font-size:11px;color:var(--admin-muted)}
    @media(max-width:900px){.option-admin-row{grid-template-columns:1fr 1fr}.option-admin-form{grid-template-columns:1fr 1fr}.option-admin-form .fullish{grid-column:1/-1}}
    @media(max-width:720px){#modal .form-grid{grid-template-columns:1fr!important}#modal.modal-backdrop,#shippingModal.modal-backdrop{padding:18px 12px!important}.art-setting-row{display:block}.options-admin-head{display:block}.option-admin-row,.option-admin-form{grid-template-columns:1fr}.option-admin-form .fullish{grid-column:auto}}
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

  function optionLabel(type){return ({art:'Criação de arte',finish:'Acabamento',cut:'Corte',service:'Serviço',other:'Outro'})[type]||type}
  let optionEditing=null;
  async function loadOptions(){
    const box=document.querySelector('#nexaOptionsList');if(!box)return;
    const filter=document.querySelector('#nexaOptionFilter')?.value||'all';
    let q=db.from('option_library').select('*').order('option_type').order('sort_order').order('label');
    if(filter!=='all')q=q.eq('option_type',filter);
    const {data,error}=await q;if(error){box.innerHTML='<div class="option-admin-empty">Não foi possível carregar os serviços.</div>';return}
    box.innerHTML=(data||[]).map(o=>`<div class="option-admin-row"><div><div class="option-label">${esc(o.label)}</div><div class="option-type">${esc(optionLabel(o.option_type))}</div></div><div><input class="mini-input" data-opt-price="${o.id}" type="number" min="0" step="0.01" value="${o.price_add??0}" aria-label="Preço"></div><div class="option-desc">${esc(o.description||'Sem descrição')}</div><div><span class="pill">${o.is_active?'Ativo':'Inativo'}</span></div><div class="actions"><button class="btn" data-opt-edit="${o.id}">Editar</button><button class="btn" data-opt-toggle="${o.id}">${o.is_active?'Desativar':'Ativar'}</button></div></div>`).join('')||'<div class="option-admin-empty">Nenhum adicional cadastrado. Cadastre os adicionais que a NEXA oferece.</div>';
    box.querySelectorAll('[data-opt-price]').forEach(input=>input.addEventListener('change',async()=>{const price=Number(String(input.value).replace(',','.'));if(!Number.isFinite(price)||price<0){flash('Informe um preço válido.',false);return}const {error}=await db.from('option_library').update({price_add:price}).eq('id',input.dataset.optPrice);flash(error?'Não foi possível atualizar o preço.':'Preço do adicional atualizado.',!error)}));
  }
  async function saveOption(){
    const label=document.querySelector('#nexaOptionLabel')?.value.trim();const type=document.querySelector('#nexaOptionType')?.value;const price=Number(String(document.querySelector('#nexaOptionPrice')?.value||'0').replace(',','.'));const desc=document.querySelector('#nexaOptionDesc')?.value.trim()||null;
    if(!label||!type||!Number.isFinite(price)||price<0){flash('Preencha nome, tipo e um preço válido.',false);return}
    const payload={label,option_type:type,price_add:price,description:desc,is_active:true,sort_order:0};let r;
    if(optionEditing){r=await db.from('option_library').update(payload).eq('id',optionEditing)}else{r=await db.from('option_library').insert(payload)}
    if(r.error){console.error(r.error);flash('Não foi possível salvar o adicional.',false);return}
    optionEditing=null;document.querySelector('#nexaOptionLabel').value='';document.querySelector('#nexaOptionPrice').value='0';document.querySelector('#nexaOptionDesc').value='';document.querySelector('#nexaOptionSave').textContent='Adicionar adicional';flash('Adicional salvo.');loadOptions();
  }
  async function editOption(id){const {data}=await db.from('option_library').select('*').eq('id',id).maybeSingle();if(!data)return;optionEditing=id;document.querySelector('#nexaOptionLabel').value=data.label||'';document.querySelector('#nexaOptionType').value=data.option_type||'service';document.querySelector('#nexaOptionPrice').value=data.price_add??0;document.querySelector('#nexaOptionDesc').value=data.description||'';document.querySelector('#nexaOptionSave').textContent='Salvar alteração';document.querySelector('#nexaOptionLabel')?.focus()}
  async function toggleOption(id){const {data}=await db.from('option_library').select('is_active').eq('id',id).maybeSingle();if(!data)return;const {error}=await db.from('option_library').update({is_active:!data.is_active}).eq('id',id);flash(error?'Não foi possível alterar o adicional.':'Status do adicional atualizado.',!error);if(!error)loadOptions()}

  function mountOptionsPanel(){
    const pricesPanel=document.querySelector('[data-panel="prices"] .panel');if(!pricesPanel||document.querySelector('#nexaOptionsAdmin'))return;
    const section=document.createElement('section');section.id='nexaOptionsAdmin';section.className='options-admin';
    section.innerHTML=`<div class="options-admin-head"><div><h2>Serviços e adicionais</h2><p>Cadastre valores extras que podem ser oferecidos ao cliente, sem misturar com o preço de produção.</p></div></div><div class="option-admin-form"><div class="field"><label>NOME</label><input id="nexaOptionLabel" placeholder="Ex.: Corte especial"></div><div class="field"><label>TIPO</label><select id="nexaOptionType"><option value="finish">Acabamento</option><option value="cut">Corte</option><option value="service" selected>Serviço</option><option value="art">Criação de arte</option><option value="other">Outro</option></select></div><div class="field"><label>ACRÉSCIMO</label><input id="nexaOptionPrice" type="number" min="0" step="0.01" value="0"></div><div class="field fullish"><label>DESCRIÇÃO</label><input id="nexaOptionDesc" placeholder="Explique em linguagem simples o que o cliente recebe"></div><button id="nexaOptionSave" class="btn primary" type="button">Adicionar adicional</button></div><div class="options-toolbar"><input id="nexaOptionSearch" placeholder="Filtrar por nome..." style="flex:1"><select id="nexaOptionFilter"><option value="all">Todos os tipos</option><option value="finish">Acabamentos</option><option value="cut">Cortes</option><option value="service">Serviços</option><option value="art">Criação de arte</option><option value="other">Outros</option></select></div><div id="nexaOptionsList" class="options-list"></div>`;
    pricesPanel.appendChild(section);
    document.querySelector('#nexaOptionSave').onclick=saveOption;document.querySelector('#nexaOptionFilter').onchange=loadOptions;
    document.querySelector('#nexaOptionSearch').oninput=()=>{const term=norm(document.querySelector('#nexaOptionSearch').value);document.querySelectorAll('#nexaOptionsList .option-admin-row').forEach(r=>r.style.display=norm(r.textContent).includes(term)?'':'none')};
    loadOptions();
  }
  mountOptionsPanel();
  document.addEventListener('click',e=>{const edit=e.target.closest?.('[data-opt-edit]');if(edit){editOption(edit.dataset.optEdit);return}const toggle=e.target.closest?.('[data-opt-toggle]');if(toggle)toggleOption(toggle.dataset.optToggle)});
});
