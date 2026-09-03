(()=>{
  const labels={
    pending:'Pendente',
    awaiting_payment:'Aguardando pagamento',
    paid:'Pago',
    in_production:'Em produção',
    ready:'Pronto',
    shipped:'Enviado',
    completed:'Concluído',
    cancelled:'Cancelado'
  };
  const syncFilter=()=>{
    const s=document.querySelector('#orderStatus');
    if(!s)return;
    const wanted=['all','pending','awaiting_payment','paid','in_production','ready','shipped','completed','cancelled'];
    const current=s.value;
    s.innerHTML=wanted.map(v=>`<option value="${v}">${v==='all'?'Todos os status':labels[v]}</option>`).join('');
    s.value=wanted.includes(current)?current:'all';
  };
  const syncRows=()=>document.querySelectorAll('#ordersTable select[data-order-status]').forEach(s=>{
    const current=s.value;
    s.innerHTML=Object.entries(labels).map(([v,label])=>`<option value="${v}">${label}</option>`).join('');
    s.value=current;
  });
  const boot=()=>{
    syncFilter();
    syncRows();
    const table=document.querySelector('#ordersTable');
    if(table)new MutationObserver(syncRows).observe(table,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
