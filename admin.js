const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);

const loginPanel=document.querySelector('#loginPanel');
const loginForm=document.querySelector('#loginForm');
const loginMessage=document.querySelector('#loginMessage');
const area=document.querySelector('#adminArea');
const adminMessage=document.querySelector('#adminMessage');
const sectionsList=document.querySelector('#sectionsList');
const escapeHtml=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

async function getUser(){
  const {data:{user}}=await db.auth.getUser();
  return user;
}

async function requireAdmin(){
  const user=await getUser();
  if(!user) return false;
  const {data:profile,error}=await db.from('profiles').select('is_admin,full_name').eq('id',user.id).maybeSingle();
  if(error||!profile?.is_admin){ await db.auth.signOut(); return false; }
  return true;
}

async function loadSettings(){
  const {data,error}=await db.from('site_settings').select('*').eq('id',1).maybeSingle();
  if(error||!data) return;
  const fields=['brand_name','logo_url','primary_color','secondary_color','text_color','background_color','heading_font','body_font','homepage_title','homepage_subtitle'];
  fields.forEach(k=>{const el=document.querySelector(`#${k}`);if(el)el.value=data[k]??'';});
  const mark=document.querySelector('#brandMark');
  if(mark&&data.logo_url){mark.className='brand-logo';mark.outerHTML=`<img id="brandMark" class="brand-logo" src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(data.brand_name||'NEXA PRINT')}">`;}
}

async function saveSettings(){
  const payload={};
  ['brand_name','logo_url','primary_color','secondary_color','text_color','background_color','heading_font','body_font','homepage_title','homepage_subtitle'].forEach(k=>{payload[k]=document.querySelector(`#${k}`).value.trim();});
  const {error}=await db.from('site_settings').upsert({id:1,...payload,updated_at:new Date().toISOString()},{onConflict:'id'});
  adminMessage.textContent=error?'Não foi possível salvar.': 'Configurações salvas.';
  if(error) console.error(error);
  setTimeout(()=>adminMessage.textContent='',2500);
}

async function loadSections(){
  const {data,error}=await db.from('home_sections').select('*').order('sort_order',{ascending:true});
  if(error){sectionsList.innerHTML='<div class="muted">Não foi possível carregar as seções.</div>';return;}
  if(!data?.length){sectionsList.innerHTML='<div class="empty-state" style="padding:18px"><strong>Nenhuma seção cadastrada</strong><span>Use “Adicionar seção” para criar blocos controláveis.</span></div>';return;}
  sectionsList.innerHTML=data.map(s=>`<div class="panel" style="padding:13px;background:#fbfcfd"><strong style="color:var(--ink)">${escapeHtml(s.section_type||'Seção')}</strong><div class="muted" style="margin-top:3px">${escapeHtml(s.title||'Sem título')}</div><button class="btn btn-light" style="margin-top:9px" data-section-id="${escapeHtml(s.id)}">Editar</button></div>`).join('');
}

async function addSection(){
  const section_type=prompt('Tipo da seção (ex.: oferta, banner, destaque):','destaque');
  if(!section_type) return;
  const title=prompt('Título da seção:','Nova seção');
  const {data:maxRow}=await db.from('home_sections').select('sort_order').order('sort_order',{ascending:false}).limit(1).maybeSingle();
  const sort_order=Number(maxRow?.sort_order||0)+1;
  const {error}=await db.from('home_sections').insert({section_type,title:title||'',sort_order,is_active:true,settings:{}});
  if(error){adminMessage.textContent='Não foi possível criar a seção.';console.error(error);}
  else {adminMessage.textContent='Seção criada.';await loadSections();}
  setTimeout(()=>adminMessage.textContent='',2500);
}

async function enterAdmin(){
  const ok=await requireAdmin();
  if(!ok){loginPanel.classList.remove('hidden');area.classList.add('hidden');return;}
  loginPanel.classList.add('hidden');area.classList.remove('hidden');
  await Promise.all([loadSettings(),loadSections()]);
}

loginForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  loginMessage.textContent='Entrando...';
  const email=document.querySelector('#email').value.trim();
  const password=document.querySelector('#password').value;
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){loginMessage.textContent='E-mail ou senha inválidos.';return;}
  loginMessage.textContent='';
  await enterAdmin();
});

document.querySelector('#saveSettings')?.addEventListener('click',saveSettings);
document.querySelector('#addSection')?.addEventListener('click',addSection);
document.querySelector('#logout')?.addEventListener('click',async()=>{await db.auth.signOut();location.reload();});

enterAdmin();
