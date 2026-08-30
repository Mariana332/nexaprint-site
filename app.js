const { createClient } = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);

const categoryGrid = document.querySelector('#categoryGrid');
const productGrid = document.querySelector('#productGrid');
const emptyState = document.querySelector('#emptyState');
const catalogCount = document.querySelector('#catalogCount');
const searchInput = document.querySelector('#search');

let allProducts = [];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
}

function formatBRL(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '';
}

async function loadSettings() {
  const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return;
  document.title = data.brand_name ? `${data.brand_name} — Gráfica Profissional` : document.title;
  document.documentElement.style.setProperty('--primary', data.primary_color || '#11bfae');
  document.documentElement.style.setProperty('--secondary', data.secondary_color || '#000000');
  document.documentElement.style.setProperty('--text', data.text_color || '#16213a');
  document.documentElement.style.setProperty('--white', data.background_color || '#FFFFFF');
  const title = document.querySelector('.hero h1');
  const subtitle = document.querySelector('.hero p');
  if (data.homepage_title && title) title.textContent = data.homepage_title;
  if (data.homepage_subtitle && subtitle) subtitle.textContent = data.homepage_subtitle;
  const img = document.querySelector('[data-brand-logo]');
  if (img && data.logo_url) img.src = data.logo_url;
}

async function loadCategories() {
  const { data, error } = await db.from('categories').select('id,name,slug,image_url,sort_order').eq('is_active', true).order('sort_order', {ascending:true}).order('name', {ascending:true}).limit(30);
  if (error) throw error;
  categoryGrid.innerHTML = (data || []).map(c => `
    <a class="category-card" href="#produtos" data-category="${escapeHtml(c.id)}">
      ${c.image_url ? `<div class="category-thumb"><img src="${escapeHtml(c.image_url)}" alt=""></div>` : ''}
      <strong>${escapeHtml(c.name)}</strong>
      <span>Ver produtos</span>
    </a>`).join('');
  categoryGrid.querySelectorAll('.category-card').forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.category;
    searchInput.value = '';
    renderProducts(allProducts.filter(p => p.category_id === id));
  }));
}

async function loadProducts() {
  const { data, error } = await db.from('products').select('id,name,slug,category_id,image_url,short_description,is_featured,is_offer').eq('is_active', true).order('is_featured', {ascending:false}).order('name', {ascending:true}).limit(200);
  if (error) throw error;
  allProducts = data || [];
  renderProducts(allProducts);
}

async function getStartingPrice(productId) {
  const { data } = await db.from('product_variants').select('id').eq('product_id', productId).eq('is_active', true).limit(1).maybeSingle();
  if (!data) return null;
  const { data: price } = await db.from('variant_prices').select('selling_price').eq('variant_id', data.id).order('selling_price', {ascending:true}).limit(1).maybeSingle();
  return price?.selling_price ?? null;
}

async function renderProducts(products) {
  catalogCount.textContent = `${products.length} produto${products.length === 1 ? '' : 's'}`;
  emptyState.classList.toggle('hidden', products.length !== 0);
  if (!products.length) { productGrid.innerHTML = ''; return; }
  productGrid.innerHTML = products.map(p => `
    <a class="product-card" href="produto.html?id=${encodeURIComponent(p.id)}">
      <div class="product-image">${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">` : '<span class="muted">Imagem em breve</span>'}</div>
      <div class="product-body"><div class="cat">NEXAPRINT</div><h3>${escapeHtml(p.name)}</h3><div class="price" data-start-price="${escapeHtml(p.id)}">Consulte</div><div class="hint">Escolha a configuração</div></div>
    </a>`).join('');
  await Promise.all(products.slice(0, 40).map(async p => {
    const price = await getStartingPrice(p.id);
    const node = document.querySelector(`[data-start-price="${CSS.escape(p.id)}"]`);
    if (node && price != null) node.textContent = `A partir de ${formatBRL(price)}`;
  }));
}

searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = !q ? allProducts : allProducts.filter(p => `${p.name} ${p.short_description || ''}`.toLowerCase().includes(q));
  renderProducts(filtered);
});

(async function init(){
  try {
    await loadSettings();
    await loadCategories();
    await loadProducts();
  } catch (error) {
    console.error(error);
    catalogCount.textContent = 'O catálogo será carregado após a importação.';
    emptyState.classList.remove('hidden');
  }
})();
