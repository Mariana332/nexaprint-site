(()=>{
  const SUPPLIER_HOST='oferta.atualcard.com.br';
  const clean=()=>{
    document.querySelectorAll('#templateList a.template-link,#familyV3Patterns a.pattern').forEach(a=>{
      try{
        const host=new URL(a.getAttribute('href')||'',location.href).hostname;
        if(host===SUPPLIER_HOST)a.remove();
      }catch{}
    });
    document.querySelectorAll('#templateList,#familyV3Patterns').forEach(box=>{
      const links=box.querySelectorAll('a.template-link,a.pattern');
      if(!links.length && !box.querySelector('.template-empty') && !normText(box.textContent).includes('gabarito ainda não cadastrado')){
        // Do not overwrite other product UI states; only act after supplier links were removed.
      }
    });
  };
  const normText=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  new MutationObserver(clean).observe(document.documentElement,{subtree:true,childList:true});
  clean();
})();
