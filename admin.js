const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);
const form=document.querySelector('#loginForm'), msg=document.querySelector('#loginMessage'), area=document.querySelector('#adminArea'), logout=document.querySelector('#logout');
async function check(){const {data:{session}}=await db.auth.getSession(); if(session){form.classList.add('hidden');area.classList.remove('hidden');}}
form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='Entrando...';const {error}=await db.auth.signInWithPassword({email:document.querySelector('#email').value,password:document.querySelector('#password').value});if(error){msg.textContent='Não foi possível entrar. Verifique o acesso.';return}msg.textContent='';form.classList.add('hidden');area.classList.remove('hidden');});
logout?.addEventListener('click',async()=>{await db.auth.signOut();location.reload()});
check();
