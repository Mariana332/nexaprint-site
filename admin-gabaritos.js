const {createClient} = window.supabase;
const db = createClient(window.NEXA_CONFIG.SUPABASE_URL, window.NEXA_CONFIG.SUPABASE_KEY);
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

const BUCKET = 'gabaritos';
const CONTENT_TYPES = {ai:'application/postscript', cdr:'application/x-coreldraw', pdf:'application/pdf', psd:'image/vnd.adobe.photoshop', rar:'application/vnd.rar', zip:'application/zip'};

let PRODUCTS = new Map();     // id -> name
let PENDING_BY_PRODUCT = new Map(); // product_id -> [variant,...]
let searchTerm = '';
let sortMode = 'count';

// staging state por grupo (produto): productId -> {templateIds:Set, checkedVariants:Set}
const stage = new Map();

function msg(t, bad = false) {
  const e = $('#status');
  e.textContent = t;
  e.style.color = bad ? '#b42318' : '#087f73';
}

async function guard() {
  const {data:{user}} = await db.auth.getUser();
  if (!user) { location.href = 'admin.html'; return false; }
  const {data:p} = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!p?.is_admin) { location.href = 'admin.html'; return false; }
  return true;
}

async function fetchAll(table, select, extra) {
  const rows = [];
  const step = 1000;
  let offset = 0;
  for (;;) {
    let q = db.from(table).select(select).range(offset, offset + step - 1);
    if (extra) q = extra(q);
    const {data, error} = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < step) break;
    offset += step;
  }
  return rows;
}

function variantLabel(v) {
  const parts = [v.size, v.material, v.printing, v.finish].filter(Boolean);
  return parts.join(' · ') || (v.configuration_name || 'Configuração');
}

async function load() {
  msg('Carregando produtos, variantes e vínculos de gabarito...');
  try {
    const [products, variants, links] = await Promise.all([
      fetchAll('products', 'id,name'),
      fetchAll('product_variants', 'id,product_id,size,material,printing,finish,configuration_name'),
      fetchAll('variant_templates', 'variant_id'),
    ]);
    PRODUCTS = new Map(products.map(p => [p.id, p.name]));
    const linked = new Set(links.map(l => l.variant_id));

    PENDING_BY_PRODUCT = new Map();
    let pendCount = 0;
    for (const v of variants) {
      if (linked.has(v.id)) continue;
      pendCount++;
      if (!PENDING_BY_PRODUCT.has(v.product_id)) PENDING_BY_PRODUCT.set(v.product_id, []);
      PENDING_BY_PRODUCT.get(v.product_id).push(v);
    }

    $('#statTotal').textContent = variants.length.toLocaleString('pt-BR');
    $('#statComGabarito').textContent = (variants.length - pendCount).toLocaleString('pt-BR');
    $('#statPendentes').textContent = pendCount.toLocaleString('pt-BR');

    render();
    msg(`${PENDING_BY_PRODUCT.size} produto(s) com configurações pendentes.`);
  } catch (e) {
    console.error(e);
    msg('Não foi possível carregar os dados. Veja o console para detalhes.', true);
  }
}

function render() {
  const term = searchTerm.trim().toLowerCase();
  let entries = [...PENDING_BY_PRODUCT.entries()]
    .map(([pid, vs]) => ({pid, name: PRODUCTS.get(pid) || `Produto ${pid}`, vs}))
    .filter(e => !term || e.name.toLowerCase().includes(term));

  if (sortMode === 'name') entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  else entries.sort((a, b) => b.vs.length - a.vs.length);

  const el = $('#groups');
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state">Nenhum produto pendente encontrado com esse filtro.</div>';
    return;
  }
  el.innerHTML = entries.map(groupHtml).join('');
}

function groupHtml({pid, name, vs}) {
  const st = stage.get(pid) || {templateIds: new Map(), checkedVariants: new Set(vs.map(v => v.id))};
  stage.set(pid, st);

  const rows = vs.map(v => `
    <label class="variant-row">
      <input type="checkbox" data-check="${pid}" value="${v.id}" ${st.checkedVariants.has(v.id) ? 'checked' : ''}>
      <span class="cfg">${esc(v.configuration_name || variantLabel(v))}<small>${esc(variantLabel(v))}</small></span>
    </label>`).join('');

  const chips = [...st.templateIds.entries()].map(([tid, label]) => `
    <span class="chip" data-chip="${pid}" data-tid="${tid}">${esc(label)}<button type="button" data-remove-chip="${tid}">×</button></span>`).join('');

  return `<details class="product-group" data-group="${pid}">
    <summary><span>${esc(name)}</span><span class="count">${vs.length} pendente(s)</span></summary>
    <div class="product-body">
      <div>${rows}</div>
      <div class="stage-box">
        <h4>Gabarito(s) a aplicar nas configurações marcadas acima</h4>
        <div class="chips" data-chips="${pid}">${chips}</div>
        <div class="stage-search">
          <input type="text" placeholder="Buscar gabarito já existente (nome do arquivo)..." data-search-tpl="${pid}">
          <button type="button" class="btn" data-do-search="${pid}">Buscar</button>
        </div>
        <div class="stage-results" data-results="${pid}"></div>
        <label class="file-drop">
          Clique para enviar novo(s) arquivo(s) (.ai .cdr .pdf .psd .rar)
          <input type="file" multiple accept=".ai,.cdr,.pdf,.psd,.rar,.zip" data-upload="${pid}">
        </label>
        <div class="actions">
          <button class="btn primary" data-apply="${pid}">Vincular às configurações marcadas</button>
        </div>
      </div>
    </div>
  </details>`;
}

async function searchTemplates(pid) {
  const input = document.querySelector(`[data-search-tpl="${pid}"]`);
  const term = input.value.trim();
  const box = document.querySelector(`[data-results="${pid}"]`);
  if (!term) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="muted" style="font-size:12px">Buscando...</div>';
  const {data, error} = await db.from('templates').select('id,file_name,title,template_url')
    .or(`file_name.ilike.%${term}%,title.ilike.%${term}%`).limit(20);
  if (error) { box.innerHTML = '<div class="muted" style="font-size:12px">Erro na busca.</div>'; return; }
  if (!data.length) { box.innerHTML = '<div class="muted" style="font-size:12px">Nada encontrado.</div>'; return; }
  box.innerHTML = data.map(t => `
    <div class="stage-result">
      <span>${esc(t.file_name || t.title || ('#' + t.id))}</span>
      <button type="button" class="btn" data-pick="${pid}" data-tid="${t.id}" data-label="${esc(t.file_name || t.title || ('#' + t.id))}">Usar este</button>
    </div>`).join('');
}

function addStagedTemplate(pid, tid, label) {
  const st = stage.get(pid);
  st.templateIds.set(String(tid), label);
  render();
  reopenGroup(pid);
}

function reopenGroup(pid) {
  const d = document.querySelector(`details[data-group="${pid}"]`);
  if (d) d.open = true;
}

function slugFileName(name) {
  const parts = name.split('.');
  const ext = (parts.length > 1 ? parts.pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const stem = parts.join('.').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'gabarito';
  return ext ? `${stem}.${ext}` : stem;
}

async function uploadFiles(pid, files) {
  const st = stage.get(pid);
  for (const f of files) {
    const fname = slugFileName(f.name);
    const path = `${pid}/${Date.now()}-${fname}`;
    const ext = (fname.split('.').pop() || '').toLowerCase();
    msg(`Enviando ${fname}...`);
    const {error: upErr} = await db.storage.from(BUCKET).upload(path, f, {upsert: true, contentType: CONTENT_TYPES[ext] || f.type || undefined});
    if (upErr) { msg(`Falha ao enviar ${fname}.`, true); console.error(upErr); continue; }
    const {data: pub} = db.storage.from(BUCKET).getPublicUrl(path);
    const {data: tpl, error: tplErr} = await db.from('templates')
      .insert({template_url: pub.publicUrl, file_name: fname, template_type: ext.toUpperCase(), title: PRODUCTS.get(pid) || ''})
      .select('id').single();
    if (tplErr) { msg(`Arquivo enviado, mas não criou o registro do gabarito (${fname}).`, true); console.error(tplErr); continue; }
    st.templateIds.set(String(tpl.id), fname);
  }
  render();
  reopenGroup(pid);
  msg('Arquivo(s) enviado(s). Confira os gabaritos selecionados abaixo antes de vincular.');
}

async function applyGroup(pid) {
  const st = stage.get(pid);
  const tids = [...st.templateIds.keys()];
  const variantIds = [...document.querySelectorAll(`[data-check="${pid}"]:checked`)].map(el => el.value);
  if (!tids.length) { msg('Escolha ou envie ao menos um gabarito antes de vincular.', true); return; }
  if (!variantIds.length) { msg('Marque ao menos uma configuração para vincular.', true); return; }

  msg(`Vinculando ${tids.length} arquivo(s) a ${variantIds.length} configuração(ões)...`);
  for (const variantId of variantIds) {
    await db.from('variant_templates').delete().eq('variant_id', variantId);
    const rows = tids.map((tid, i) => ({variant_id: variantId, template_id: tid, sort_order: i}));
    const {error} = await db.from('variant_templates').insert(rows);
    if (error) { console.error(error); msg('Erro ao vincular uma das configurações. Veja o console.', true); return; }
  }

  // remove as variantes recem-vinculadas da lista de pendentes local
  const list = PENDING_BY_PRODUCT.get(pid) || [];
  const remaining = list.filter(v => !variantIds.includes(String(v.id)));
  if (remaining.length) PENDING_BY_PRODUCT.set(pid, remaining);
  else PENDING_BY_PRODUCT.delete(pid);
  stage.delete(pid);

  const totalPend = [...PENDING_BY_PRODUCT.values()].reduce((n, a) => n + a.length, 0);
  $('#statPendentes').textContent = totalPend.toLocaleString('pt-BR');
  $('#statComGabarito').textContent = (Number($('#statTotal').textContent.replace(/\D/g,'')) - totalPend).toLocaleString('pt-BR');

  render();
  msg('Vinculado com sucesso.');
}

document.addEventListener('click', e => {
  const search = e.target.closest('[data-do-search]');
  if (search) searchTemplates(search.dataset.doSearch);

  const pick = e.target.closest('[data-pick]');
  if (pick) addStagedTemplate(pick.dataset.pick, pick.dataset.tid, pick.dataset.label);

  const removeChip = e.target.closest('[data-remove-chip]');
  if (removeChip) {
    const chip = removeChip.closest('[data-chip]');
    const pid = chip.dataset.chip;
    stage.get(pid).templateIds.delete(removeChip.dataset.removeChip);
    render();
    reopenGroup(pid);
  }

  const apply = e.target.closest('[data-apply]');
  if (apply) applyGroup(apply.dataset.apply);
});

document.addEventListener('change', e => {
  if (e.target.matches('[data-upload]')) {
    const pid = e.target.dataset.upload;
    const files = [...e.target.files];
    if (files.length) uploadFiles(pid, files);
    e.target.value = '';
  }
  if (e.target.matches('[data-check]')) {
    const pid = e.target.dataset.check;
    const st = stage.get(pid);
    if (e.target.checked) st.checkedVariants.add(e.target.value);
    else st.checkedVariants.delete(e.target.value);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('[data-search-tpl]')) {
    e.preventDefault();
    searchTemplates(e.target.dataset.searchTpl);
  }
});

$('#search').addEventListener('input', () => { searchTerm = $('#search').value; render(); });
$('#sortMode').addEventListener('change', () => { sortMode = $('#sortMode').value; render(); });

(async () => { if (await guard()) load(); })();
