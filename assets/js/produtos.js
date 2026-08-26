
let produtosCache = [];
let editingId = null;
let deletingId = null;
let novaFotoFile = null;
let novaFotoPreviewUrl = null;
let currentView = 'cards';
let activeChip = null;
let page = 1;
const PAGE_SIZE = 12;

const TABLE_COLUMNS = [
  { key:'liga', label:'Liga', defaultOn:false },
  { key:'marca', label:'Marca', defaultOn:true },
  { key:'temporada', label:'Temporada', defaultOn:false },
];
let colVisibility = {};
TABLE_COLUMNS.forEach(c => colVisibility[c.key] = c.defaultOn);

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

function jerseyIcon(categoria){
  const shirtPath = "M18 4 L8 10 L4 20 L11 24 L11 58 L45 58 L45 24 L52 20 L48 10 L38 4 L32 10 L26 10 Z";
  let fills;
  if(categoria === "Titular")       fills = { body:"#e11d2e", trim:"#0c0c0c" };
  else if(categoria === "Reserva")  fills = { body:"#ffffff", trim:"#0c0c0c" };
  else if(categoria === "Terceiro") fills = { body:"#0c0c0c", trim:"#e11d2e" };
  else                               fills = { body:"#f3f1ee", trim:"#e11d2e" };
  return `<svg class="jersey-icon" viewBox="0 0 56 62" fill="none" style="opacity:.35">
    <path d="${shirtPath}" fill="${fills.body}" stroke="${fills.trim}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}

function tamanhosResumo(p){
  return SIZES.filter(t => (p.tamanhos && p.tamanhos[t]) > 0)
    .map(t => `${t}:${p.tamanhos[t]}`)
    .join(', ') || 'Sem estoque';
}

function statusEstoque(p){
  const total = totalQtd(p);
  if(total === 0) return 'out';
  if(total <= LOW_STOCK) return 'low';
  return 'ok';
}

async function recarregarProdutos(){
  produtosCache = await getProducts();
  renderChips();
  renderAtual();
}

/* ===== filtros ===== */
function getFiltered(){
  const q = removeAccents(document.getElementById('searchInput').value.trim());
  const cat = document.getElementById('filterCategoria').value;
  const tamanho = document.getElementById('filterTamanho').value;
  const status = document.getElementById('filterStatus').value;

  return produtosCache.filter(p=>{
    const haystack = removeAccents(`${p.nome||''} ${p.team} ${p.liga||''} ${p.temporada||''} ${p.marca||''} ${p.sku||''}`);
    const matchQ = !q || haystack.includes(q);
    const matchCat = !cat || p.categoria === cat;
    const matchTamanho = !tamanho || (p.tamanhos && p.tamanhos[tamanho] > 0);
    const matchStatus = !status || statusEstoque(p) === status;
    return matchQ && matchCat && matchTamanho && matchStatus;
  });
}

function renderChips(){
  const categorias = ['Titular','Reserva','Terceiro','Retrô'];
  const chips = [
    ...categorias.map(c => ({ id:'cat:'+c, label:c, apply:()=>{ document.getElementById('filterCategoria').value = c; } })),
    { id:'status:low', label:'Estoque baixo', apply:()=>{ document.getElementById('filterStatus').value = 'low'; } },
    { id:'status:out', label:'Esgotado', apply:()=>{ document.getElementById('filterStatus').value = 'out'; } },
  ];
  document.getElementById('chipsRow').innerHTML = chips.map(c=>
    `<button type="button" class="chip ${activeChip===c.id?'active':''}" data-chip="${c.id}">${c.label}</button>`
  ).join('');
  document.querySelectorAll('[data-chip]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const chipId = btn.dataset.chip;
      if(activeChip === chipId){
        activeChip = null;
        document.getElementById('filterCategoria').value = '';
        document.getElementById('filterStatus').value = '';
      } else {
        activeChip = chipId;
        document.getElementById('filterCategoria').value = '';
        document.getElementById('filterStatus').value = '';
        chips.find(c=>c.id===chipId).apply();
      }
      page = 1;
      renderChips();
      renderAtual();
    });
  });
}

function renderAtual(){
  if(currentView === 'cards') renderGrid();
  else renderTable();
}

/* ===== visualização em cards ===== */
function renderGrid(){
  const list = getFiltered();
  const grid = document.getElementById('grid');
  document.getElementById('grid').style.display = '';
  document.getElementById('tableWrap').style.display = 'none';

  if(list.length === 0){
    grid.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <h3>Nenhuma camisa encontrada</h3>
        <p>Ajuste a busca ou os filtros.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p,i)=>{
    const temFoto = !!p.foto;
    const st = statusEstoque(p);
    const media = temFoto
      ? `<img src="${p.foto}" alt="Foto da camisa ${escapeHtml(p.team)}" style="cursor:pointer" onclick="openLightbox('${p.foto}')">`
      : jerseyIcon(p.categoria);

    return `
      <div class="card" style="animation-delay:${Math.min(i*0.03,0.35)}s">
        <div class="card-top">
          <span class="sku-tag mono">${escapeHtml(p.sku||'')}</span>
          ${media}
          <div class="card-name">
            <div class="team">${escapeHtml(p.team)}</div>
            <div class="cat">${escapeHtml(p.marca||'')} • ${p.categoria}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="row-between">
            <span><span class="dot ${st==='ok'?'':st}"></span>${st==='out'?'Esgotado':st==='low'?'Baixo':'Em estoque'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Tamanhos: ${tamanhosResumo(p)}</div>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary" style="flex:1;padding:7px 0;font-size:12px;" onclick="openHistorico(${p.id})">Histórico</button>
            <button class="btn-secondary" style="flex:1;padding:7px 0;font-size:12px;" onclick="openEditModal(${p.id})">Editar</button>
            <button class="btn-secondary" style="padding:7px 10px;color:var(--red);border-color:var(--red);" onclick="openConfirmModal(${p.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ===== visualização em tabela ===== */
function renderColToggle(){
  document.getElementById('colTogglePanel').innerHTML = TABLE_COLUMNS.map(c=>`
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 0;">
      <input type="checkbox" data-col="${c.key}" ${colVisibility[c.key]?'checked':''}>
      ${c.label}
    </label>
  `).join('');
  document.querySelectorAll('[data-col]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      colVisibility[chk.dataset.col] = chk.checked;
      renderTable();
    });
  });
}

function renderTable(){
  document.getElementById('grid').style.display = 'none';
  document.getElementById('tableWrap').style.display = '';

  const list = getFiltered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  const pageItems = list.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const headCols = ['Foto','Time','Categoria', ...TABLE_COLUMNS.filter(c=>colVisibility[c.key]).map(c=>c.label), 'Tamanhos','Status',''];
  document.getElementById('tableHeadRow').innerHTML = headCols.map(h=>`<th>${h}</th>`).join('');

  const body = document.getElementById('tableBody');
  if(pageItems.length === 0){
    body.innerHTML = `<tr><td colspan="${headCols.length}" style="text-align:center;color:var(--text-dim);padding:40px 10px;">Nenhuma camisa encontrada.</td></tr>`;
  } else {
    body.innerHTML = pageItems.map(p=>{
      const st = statusEstoque(p);
      const statusLabel = st==='out'?'Esgotado':(st==='low'?'Estoque baixo':'Em estoque');
      const extraCols = TABLE_COLUMNS.filter(c=>colVisibility[c.key]).map(c=>`<td>${escapeHtml(p[c.key]||'—')}</td>`).join('');
      return `
        <tr>
          <td>${p.foto ? `<img src="${p.foto}" style="width:36px;height:36px;border-radius:7px;object-fit:cover;cursor:pointer" onclick="openLightbox('${p.foto}')">` : `<div style="width:36px;height:36px;border-radius:7px;background:var(--bg)"></div>`}</td>
          <td><strong>${escapeHtml(p.team)}</strong><div style="font-size:11px;color:var(--text-dim)" class="mono">${escapeHtml(p.sku||'')}</div></td>
          <td>${p.categoria}</td>
          ${extraCols}
          <td style="font-size:12px;">${tamanhosResumo(p)}</td>
          <td><span class="dot ${st==='ok'?'':st}"></span>${statusLabel}</td>
          <td style="white-space:nowrap;">
            <button title="Histórico" onclick="openHistorico(${p.id})" style="background:none;border:none;padding:5px;color:var(--text-dim);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </button>
            <button title="Editar" onclick="openEditModal(${p.id})" style="background:none;border:none;padding:5px;color:var(--text-dim);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button title="Remover" onclick="openConfirmModal(${p.id})" style="background:none;border:none;padding:5px;color:var(--red);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  const start = list.length === 0 ? 0 : (page-1)*PAGE_SIZE + 1;
  const end = Math.min(page*PAGE_SIZE, list.length);
  let pageButtons = '';
  for(let i=1;i<=totalPages;i++) pageButtons += `<button class="${i===page?'active':''}" data-page="${i}">${i}</button>`;
  document.getElementById('pagination').innerHTML = `
    <div class="info">Mostrando ${start}–${end} de ${list.length}</div>
    <div class="pages">
      <button data-page="${page-1}" ${page<=1?'disabled':''}>‹</button>
      ${pageButtons}
      <button data-page="${page+1}" ${page>=totalPages?'disabled':''}>›</button>
    </div>`;
  document.querySelectorAll('#pagination button[data-page]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const p = Number(btn.dataset.page);
      if(p>=1 && p<=totalPages){ page = p; renderTable(); }
    });
  });

  renderColToggle();
}

/* ===== toggle cards/tabela ===== */
document.getElementById('btnViewCards').addEventListener('click', ()=>{
  currentView = 'cards';
  document.getElementById('btnViewCards').classList.add('active');
  document.getElementById('btnViewTable').classList.remove('active');
  renderAtual();
});
document.getElementById('btnViewTable').addEventListener('click', ()=>{
  currentView = 'table';
  document.getElementById('btnViewTable').classList.add('active');
  document.getElementById('btnViewCards').classList.remove('active');
  renderAtual();
});
document.getElementById('colToggleBtn').addEventListener('click', ()=>{
  document.getElementById('colTogglePanel').classList.toggle('open');
});

/* ===== upload de foto ===== */
function renderUploadArea(){
  const src = novaFotoPreviewUrl;
  document.getElementById('uploadArea').innerHTML = src
    ? `<img class="upload-preview" src="${src}" alt="Pré-visualização">
       <div class="upload-zone" style="min-height:auto;padding:10px;">
         <span>Clique para trocar a foto</span>
         <input type="file" accept="image/*" id="fotoInput">
       </div>`
    : `<div class="upload-zone">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
         <span>Clique para enviar uma foto da camisa</span>
         <input type="file" accept="image/*" id="fotoInput">
       </div>`;
  document.getElementById('fotoInput').addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    novaFotoFile = file;
    novaFotoPreviewUrl = URL.createObjectURL(file);
    renderUploadArea();
  });
}

/* ===== grade de tamanhos ===== */
function renderSizeGrid(tamanhos){
  const t = tamanhos || tamanhosVazios();
  document.getElementById('sizeGrid').innerHTML = SIZES.map(s=>`
    <div class="field" style="margin-bottom:0;">
      <label for="qtd_${s}" style="font-size:11px;">${s}</label>
      <input type="number" min="0" id="qtd_${s}" value="${t[s]||0}">
    </div>
  `).join('');
  atualizarQtdHint();
  SIZES.forEach(s=>document.getElementById(`qtd_${s}`).addEventListener('input', atualizarQtdHint));
}
function lerSizeGrid(){
  const t = {};
  SIZES.forEach(s=> t[s] = Number(document.getElementById(`qtd_${s}`).value) || 0);
  return t;
}
function atualizarQtdHint(){
  const total = Object.values(lerSizeGrid()).reduce((s,n)=>s+n,0);
  document.getElementById('qtdHint').textContent = `Total em estoque: ${total} unidade(s)`;
}

/* ===== modal de cadastro/edição ===== */
function openAddModal(){
  editingId = null;
  novaFotoFile = null;
  novaFotoPreviewUrl = null;
  document.getElementById('formTitle').textContent = 'Nova Camisa';
  ['inNome','inTeam','inLiga','inTemporada','inMarca','inSku','inObs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('inModelo').value = 'Torcedor';
  document.getElementById('inCategoria').value = 'Titular';
  renderUploadArea();
  renderSizeGrid();
  document.getElementById('formOverlay').classList.add('open');
}

function openEditModal(id){
  const p = produtosCache.find(x=>x.id===id);
  if(!p) return;
  editingId = id;
  novaFotoFile = null;
  novaFotoPreviewUrl = p.foto || null;
  document.getElementById('formTitle').textContent = 'Editar Camisa';
  document.getElementById('inNome').value = p.nome || '';
  document.getElementById('inTeam').value = p.team || '';
  document.getElementById('inLiga').value = p.liga || '';
  document.getElementById('inTemporada').value = p.temporada || '';
  document.getElementById('inMarca').value = p.marca || '';
  document.getElementById('inModelo').value = p.modelo || 'Torcedor';
  document.getElementById('inCategoria').value = p.categoria || 'Titular';
  document.getElementById('inSku').value = p.sku || '';
  document.getElementById('inObs').value = p.observacoes || '';
  renderUploadArea();
  renderSizeGrid(p.tamanhos);
  document.getElementById('formOverlay').classList.add('open');
}

function closeFormModal(){
  document.getElementById('formOverlay').classList.remove('open');
}

async function uploadFotoSeNecessario(){
  if(!novaFotoFile) return null;
  const r = await uploadFotoProduto(novaFotoFile);
  if(!r.ok){ showToast('Não foi possível enviar a foto: ' + r.erro, 'error'); return null; }
  return r.url;
}

async function saveProduct(){
  ['f-nome','f-team'].forEach(id=>document.getElementById(id).classList.remove('invalid'));

  const nome = document.getElementById('inNome').value.trim();
  const team = document.getElementById('inTeam').value.trim();

  let valido = true;
  if(!nome){ document.getElementById('f-nome').classList.add('invalid'); valido = false; }
  if(!team){ document.getElementById('f-team').classList.add('invalid'); valido = false; }
  if(!valido){ showToast('Preencha os campos obrigatórios corretamente.', 'error'); return; }

  const fotoUrl = await uploadFotoSeNecessario();

  const payload = {
    nome, team,
    liga: document.getElementById('inLiga').value.trim(),
    temporada: document.getElementById('inTemporada').value.trim(),
    marca: document.getElementById('inMarca').value.trim(),
    modelo: document.getElementById('inModelo').value,
    categoria: document.getElementById('inCategoria').value,
    sku: document.getElementById('inSku').value.trim(),
    observacoes: document.getElementById('inObs').value.trim(),
    tamanhos: lerSizeGrid(),
  };
  if(fotoUrl) payload.foto = fotoUrl;

  if(editingId){
    const r = await updateProduct(editingId, payload);
    if(!r.ok){ showToast(r.erro, 'error'); return; }
    showToast('Camisa atualizada com sucesso!', 'success');
  } else {
    const r = await addProduct(payload);
    if(!r.ok){ showToast(r.erro, 'error'); return; }
    showToast('Camisa cadastrada com sucesso!', 'success');
  }

  closeFormModal();
  await recarregarProdutos();
}

/* ===== exclusão ===== */
function openConfirmModal(id){
  deletingId = id;
  const p = produtosCache.find(x=>x.id===id);
  document.getElementById('confirmTeamName').textContent = p ? p.team : '';
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirmModal(){
  document.getElementById('confirmOverlay').classList.remove('open');
}
async function confirmDelete(){
  const r = await deleteProduct(deletingId);
  closeConfirmModal();
  if(!r.ok){ showToast(r.erro, 'error'); return; }
  showToast('Camisa removida.', 'success');
  await recarregarProdutos();
}

/* ===== histórico ===== */
async function openHistorico(id){
  const p = produtosCache.find(x=>x.id===id);
  document.getElementById('historicoTitle').textContent = `Histórico — ${p ? p.team : ''}`;
  document.getElementById('historicoOverlay').classList.add('open');
  const movs = await getHistoricoProduto(id);
  const body = document.getElementById('timelineBody');
  if(movs.length === 0){
    body.innerHTML = `<p style="color:var(--text-dim);font-size:13.5px;">Nenhuma movimentação registrada para essa camisa ainda.</p>`;
  } else {
    body.innerHTML = movs.map(m=>`
      <div class="timeline-item">
        <div class="t-top"><span>${m.tipo} — ${m.tamanho}</span><span class="mono">${m.quantidade} un.</span></div>
        <div class="t-meta">${formatDataBR(m.data)} ${m.motivo ? '• ' + escapeHtml(m.motivo) : ''}</div>
      </div>
    `).join('');
  }
}
function closeHistoricoModal(){
  document.getElementById('historicoOverlay').classList.remove('open');
}

/* ===== lightbox ===== */
function openLightbox(src){
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
}
document.getElementById('lightbox').addEventListener('click', e=>{
  if(e.target.id === 'lightbox') closeLightbox();
});

/* ===== filtros / atalhos ===== */
document.getElementById('searchInput').addEventListener('input', ()=>{ page=1; renderAtual(); });
document.getElementById('filterCategoria').addEventListener('change', ()=>{ activeChip=null; renderChips(); page=1; renderAtual(); });
document.getElementById('filterTamanho').addEventListener('change', ()=>{ page=1; renderAtual(); });
document.getElementById('filterStatus').addEventListener('change', ()=>{ activeChip=null; renderChips(); page=1; renderAtual(); });

document.addEventListener('keydown', e=>{
  const tag = document.activeElement.tagName;
  const isTyping = tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';
  if(e.key === '/' && !isTyping){ e.preventDefault(); document.getElementById('searchInput').focus(); }
  if(e.key.toLowerCase() === 'n' && !isTyping){ openAddModal(); }
  if(e.key === 'Escape'){ closeFormModal(); closeConfirmModal(); closeHistoricoModal(); closeLightbox(); document.getElementById('colTogglePanel').classList.remove('open'); }
});

(async function(){
  await renderShell('produtos', { requireAuth: true });
  await recarregarProdutos();
})();
