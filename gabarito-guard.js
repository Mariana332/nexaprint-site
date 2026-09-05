(()=>{
  const SUPPLIER_HOST='oferta.atualcard.com.br';
  const clean=()=>{
    const box=document.querySelector('#templateList');
    if(!box)return;
    const links=[...box.querySelectorAll('a.template-link')];
    let removed=0;
    links.forEach(a=>{
      try{
        const host=new URL(a.getAttribute('href')||'',location.href).hostname;
        if(host===SUPPLIER_HOST){a.remove();removed++}
      }catch{}
    });
    if(removed && !box.querySelector('a.template-link')){
      box.innerHTML='<div class="template-empty">Este gabarito está sendo preparado para download pela NEXA PRINT.</div>';
    }
  };
  new MutationObserver(clean).observe(document.documentElement,{subtree:true,childList:true});
  clean();
})();
