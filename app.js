const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);

const categoryGrid = document.querySelector('#categoryGrid');
const productGrid = document.querySelector('#productGrid');
const emptyState = document.querySelector('#emptyState');
const catalogCount = document.querySelector('#catalogCount');
const searchInput = document.querySelector('#search');
const activeFilter = document.querySelector('#activeFilter');

let allProducts = [];
let activeCategory = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const formatBRL = value => { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : ''; };

function applyBranding(data){
  if (!data) return;
  document.title = data.brand_name ? `${data.brand_name} — Gráfica Profissional` : document.title;
  document.documentElement.style.setProperty('--primary', data.primary_color || '#19c7b5');
  document.documentElement.style.setProperty('--primary-dark', data.primary_color || '#0b9f91');
  document.documentElement.style.setProperty('--ink', data.text_color || '#102033');
  document.body.style.fontFamily = data.body_font || 'Inter, ui-sans-serif, system-ui, sans-serif';
  const title = document.querySelector('#heroTitle');
  const subtitle = document.querySelector('#heroSubtitle');
  if (title && data.homepage_title) title.textContent = data.homepage_title;
  if (subtitle && data.homepage_subtitle) subtitle.textContent = data.homepage_subtitle;
  const brand = document.querySelector('#footerBrand');
  if (brand && data.brand_name) brand.textContent = data.brand_name;
  const mark = document.querySelector('#brandMark');
  if (mark && data.logo_url){
    mark.className = 'brand-logo';
    mark.outerHTML = `<img id="brandMark" class="brand-logo" src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(data.brand_name || 'NEXA PRINT')}">`;
  }
  if (data.heading_font) {
    document.querySelectorAll('h1,h2,h3,.brand-name strong,.brand-name b').forEach(el => { el.style.fontFamily = data.heading_font; });
  }
}

async function loadSettings(){
  const { data, error } = await db.from('site_settings').select('*').eq('id',1).maybeSingle();
  if (!error) applyBranding(data);
}

async function loadCategories(){
  const { data, error } = await db.from('categories').select('id,name,slug,image_url,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('name',{ascending:true});
  if (error) throw error;
  categoryGrid.innerHTML = (data || []).map(c => `
    <a class="category-card" href="#produtos" data-category="${escapeHtml(c.id)}">
      <div class="category-thumb">${c.image_url ? `<img src="${escapeHtml(c.image_url)}" alt="" loading="lazy">` : '<span class="muted">NEXA</span>'}</div>
      <strong>${escapeHtml(c.name)}</strong>
      <span>Ver produtos</span>
    </a>`).join('');
  categoryGrid.querySelectorAll('.category-card').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    activeCategory = el.dataset.category;
    activeFilter.textContent = el.querySelector('strong')?.textContent || 'Categoria';
    activeFilter.classList.add('active');
    renderProducts();
    document.querySelector('#produtos')?.scrollIntoView({behavior:'smooth'});
  }));
}

async function loadProducts(){
  const { data, error } = await db.from('products').select('id,name,slug,category_id,image_url,short_description,is_featured,is_offer').eq('is_active',true).order('is_featured',{ascending:false}).order('is_offer',{ascending:false}).order('name',{ascending:true}).limit(200);
  if (error) throw error;
  allProducts = data || [];
  renderProducts();
}

async function getStartingPrice(productId){
  const { data: v } = await db.from('product_variants').select('id').eq('product_id',productId).eq('is_active',true).order('id').limit(1).maybeSingle();
  if (!v) return null;
  const { data: p } = await db.from('variant_prices').select('selling_price').eq('variant_id',v.id).order('selling_price',{ascending:true}).limit(1).maybeSingle();
  return p?.selling_price ?? null;
}

function filteredProducts(){
  const q = searchInput?.value.trim().toLowerCase() || '';
  return allProducts.filter(p => (!activeCategory || p.category_id === activeCategory) && (!q || `${p.name} ${p.short_description || ''}`.toLowerCase().includes(q)));
}

async function renderProducts(){
  const products = filteredProducts();
  catalogCount.textContent = `${products.length} produto${products.length===1?'':'s'}`;
  emptyState.classList.toggle('hidden', products.length !== 0);
  if (!products.length){ productGrid.innerHTML=''; return; }
  productGrid.innerHTML = products.map(p => `
    <a class="product-card" href="produto.html?id=${encodeURIComponent(p.id)}">
      <div class="product-image">${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">` : '<span class="image-placeholder">Imagem em breve</span>'}</div>
      <div class="product-body">
        <div class="cat">NEXA PRINT</div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price" data-start-price="${escapeHtml(p.id)}">Consultando preço…</div>
        <div class="hint">Configure quantidade e acabamento</div>
        ${p.is_offer ? '<span class="offer-badge">Oferta</span>' : ''}
      </div>
    </a>`).join('');

  await Promise.all(products.slice(0,40).map(async p => {
    const price = await getStartingPrice(p.id);
    const node = document.querySelector(`[data-start-price="${CSS.escape(p.id)}"]`);
    if (node) node.textContent = price != null ? `A partir de ${formatBRL(price)}` : 'Consulte as opções';
  }));
}

searchInput?.addEventListener('input', renderProducts);

(async function init(){
  try {
    await loadSettings();
    await loadCategories();
    await loadProducts();
  } catch (error) {
    console.error(error);
    catalogCount.textContent = 'Não foi possível carregar o catálogo';
    emptyState.classList.remove('hidden');
    emptyState.querySelector('strong').textContent = 'Catálogo indisponível';
    emptyState.querySelector('span').textContent = 'Verifique a conexão com o catálogo.';
  }
})();
