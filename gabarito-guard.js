(()=>{
  const SUPPLIER_HOST='oferta.atualcard.com.br';
  const clean=()=>{
    document.querySelectorAll('#templateList,#familyV3Patterns').forEach(box=>{
      let removed=false;
      box.querySelectorAll('a.template-link,a.pattern').forEach(a=>{
        try{
          const host=new URL(a.getAttribute('href')||'',location.href).hostname;
          if(host===SUPPLIER_HOST){a.remove();removed=true}
        }catch{}
      });
      if(removed && !box.querySelector('a.template-link,a.pattern')){
        box.innerHTML='<div class="template-empty">Este gabarito está sendo preparado para download pela NEXA PRINT.</div>';
      }
    });
  };
  new MutationObserver(clean).observe(document.documentElement,{subtree:true,childList:true});
  clean();
})();
