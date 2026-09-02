(function(){
const qs=new URLSearchParams(location.search);if(!qs.get('family'))return;
const KEY='nexa_print_cart_v1';const esc=v=>String(v??'').trim();
function cart(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(c){localStorage.setItem(KEY,JSON.stringify(c));document.querySelectorAll('[data-cart-count]').forEach(x=>x.textContent=c.reduce((n,i)=>n+Number(i.quantity||0),0))}
function go(mode){const id=qs.get('id'),name=document.querySelector('#familyV3Title')?.textContent?.trim(),v=window.NEXA_SELECTED_VARIANT_ID,r=document.querySelector('#familyV3Qty input[name="nexaQty"]:checked');if(!id||!name||!v||!r){alert('Selecione a configuração e a quantidade antes de continuar.');return}const options=Object.fromEntries([...document.querySelectorAll('#familyV3Fields select')].map(s=>[s.dataset.key,s.value]).filter(([,x])=>x));const quantity=Number(r.dataset.q),price=Number(r.dataset.price),item={id,name,variantId:v,options,quantity,price,basePrice:price,artFee:0,qtyLabel:`${r.dataset.q} ${r.dataset.unit||'un'}`,key:`${id}|${v}|${quantity}|ready`};const c=cart(),i=c.findIndex(x=>x.key===item.key);if(i>=0)c[i].quantity+=quantity;else c.push(item);save(c);location.href='carrinho.html'+(mode==='buy'?'?checkout=1':'')}
document.addEventListener('click',e=>{const b=e.target.closest('#buy,#cart');if(!b)return;e.preventDefault();e.stopImmediatePropagation();go(b.id==='buy'?'buy':'cart')},true);
})();
