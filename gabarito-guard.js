(()=>{
  const SUPPLIER_HOST='oferta.atualcard.com.br';
  const isSupplier=(href)=>{try{return new URL(href||'',location.href).hostname===SUPPLIER_HOST}catch{return false}};
  const clean=()=>{
    document.querySelectorAll('#templateList,#familyV3Patterns').forEach(box=>{
      let removed=false;
      box.querySelectorAll('a[href]').forEach(a=>{
        if(isSupplier(a.getAttribute('href'))){a.remove();removed=true}
      });
      if(removed && !box.querySelector('a[href]')){
        box.innerHTML='<div class="template-empty">Este gabarito está sendo preparado para download pela NEXA PRINT.</div>';
      }
    });
  };
  document.addEventListener('click',e=>{
    const a=e.target?.closest?.('#templateList a[href],#familyV3Patterns a[href]');
    if(a&&isSupplier(a.getAttribute('href'))){e.preventDefault();e.stopPropagation();a.remove();clean()}
  },true);
  new MutationObserver(clean).observe(document.documentElement,{subtree:true,childList:true});
  clean();
})();
