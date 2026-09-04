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
  const wanted=Object.keys(labels);
  let timer=null;
  const syncFilter=()=>{
    const s=document.querySelector('#orderStatus');
    if(!s)return;
    const current=s.value;
    s.innerHTML=['all',...wanted].map(v=>`<option value="${v}">${v==='all'?'Todos os status':labels[v]}</option>`).join('');
    s.value=['all',...wanted].includes(current)?current:'all';
  };
  const renderSelect=(s,status)=>{
    const value=status==='production'?'in_production':status;
    s.innerHTML=wanted.map(v=>`<option value="${v}">${labels[v]}</option>`).join('');
    s.value=wanted.includes(value)?value:'pending';
  };
  const syncRows=async()=>{
    const rows=[...document.querySelectorAll('#ordersTable select[data-order-status]')];
    if(!rows.length)return;
    const ids=rows.map(s=>s.dataset.orderStatus).filter(Boolean);
    if(!window.supabase||!window.NEXA_CONFIG)return;
    try{
      const db=window.supabase.createClient(window.NEXA_CONFIG.SUPABASE_URL,window.NEXA_CONFIG.SUPABASE_KEY);
      const {data,error}=await db.from('orders').select('id,status').in('id',ids);
      if(error)throw error;
      const statusMap=new Map((data||[]).map(o=>[o.id,o.status]));
      rows.forEach(s=>renderSelect(s,statusMap.get(s.dataset.orderStatus)||s.value));
    }catch(e){
      console.error('Falha ao sincronizar status dos pedidos.',e);
      rows.forEach(s=>renderSelect(s,s.value));
    }
  };
  const scheduleRows=()=>{
    clearTimeout(timer);
    timer=setTimeout(syncRows,80);
  };
  const boot=()=>{
    syncFilter();
    scheduleRows();
    const table=document.querySelector('#ordersTable');
    if(table)new MutationObserver(scheduleRows).observe(table,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
