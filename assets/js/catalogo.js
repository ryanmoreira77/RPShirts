
let produtosCat = [];
let selecionados = new Set();

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

function getFilteredCat(){
  const q = removeAccents(document.getElementById('searchCatalogo').value.trim());
  const cat = document.getElementById('filterCategoriaCat').value;
  return produtosCat.filter(p=>{
    const haystack = removeAccents(`${p.nome} ${p.team} ${p.marca} ${p.temporada}`);
    const matchQ = !q || haystack.includes(q);
    const matchCat = !cat || p.categoria === cat;
    return matchQ && matchCat;
  });
}

function renderCatalogoGrid(){
  const list = getFilteredCat();
  const grid = document.getElementById('catalogoGrid');

  const semFoto = list.filter(p=>!p.foto).length;
  document.getElementById('semFotoAviso').textContent = semFoto > 0
    ? `${semFoto} camisa(s) sem foto cadastrada não podem entrar no catálogo — adicione uma foto na tela de Produtos.`
    : '';

  if(list.length === 0){
    grid.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <h3>Nenhuma camisa encontrada</h3>
        <p>Ajuste a busca ou o filtro de categoria.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p,i)=>{
    const temFoto = !!p.foto;
    const marcado = selecionados.has(p.id);
    const media = temFoto
      ? `<img src="${p.foto}" alt="Foto da camisa ${escapeHtml(p.team)}" style="cursor:pointer" onclick="openLightbox('${p.foto}')">`
      : `${jerseyIcon(p.categoria)}<div class="no-photo-badge">Sem foto<br>cadastrada</div>`;

    return `
      <div class="card ${marcado?'selecionado':''}" style="animation-delay:${Math.min(i*0.03,0.35)}s">
        <div class="card-top">
          <div class="catalog-check ${temFoto?'':'disabled'}" data-id="${p.id}" title="${temFoto?'Selecionar para o catálogo':'Sem foto — não pode ir para o catálogo'}">
            <input type="checkbox" ${marcado?'checked':''} ${temFoto?'':'disabled'} data-check="${p.id}">
          </div>
          <span class="sku-tag mono">${p.sku}</span>
          ${media}
          <div class="card-name">
            <div class="team">${escapeHtml(p.team)}</div>
            <div class="cat">${p.marca || ''} • ${p.categoria}</div>
          </div>
        </div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--text-dim);">Tamanhos: ${tamanhosResumo(p)}</div>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('[data-check]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      const id = Number(chk.dataset.check);
      if(chk.checked) selecionados.add(id);
      else selecionados.delete(id);
      renderCatalogoGrid();
    });
  });
}

/* ===== Lightbox ===== */
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

/* ===== ações de seleção ===== */
document.getElementById('btnSelecionarTodos').addEventListener('click', ()=>{
  getFilteredCat().forEach(p=>{ if(p.foto) selecionados.add(p.id); });
  renderCatalogoGrid();
});
document.getElementById('btnLimparSelecao').addEventListener('click', ()=>{
  selecionados.clear();
  renderCatalogoGrid();
});
document.getElementById('searchCatalogo').addEventListener('input', renderCatalogoGrid);
document.getElementById('filterCategoriaCat').addEventListener('change', renderCatalogoGrid);

/* ===== geração do PDF ===== */
function getImageFormat(dataUrl){
  if(dataUrl.startsWith('data:image/png')) return 'PNG';
  if(dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

async function gerarCatalogoPdf(){
  let itens = produtosCat.filter(p => selecionados.has(p.id) && p.foto);

  if(itens.length === 0){
    itens = getFilteredCat().filter(p => p.foto);
    if(itens.length === 0){
      showToast('Nenhuma camisa com foto disponível para gerar o catálogo.', 'error');
      return;
    }
    showToast('Nenhum item selecionado — gerando catálogo com todas as camisas filtradas que têm foto.', 'success');
  }

  itens = [...itens].sort((a, b) => a.team.localeCompare(b.team, 'pt-BR'));

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const settings = getSettings();
  const pageW = 210, pageH = 297, margin = 15;

  // Capa
  doc.setFillColor(12,12,12);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(26);
  doc.text(settings.companyName, pageW/2, 130, { align:'center' });
  doc.setFontSize(14);
  doc.setTextColor(225,29,46);
  doc.text('CATÁLOGO DE CAMISAS', pageW/2, 142, { align:'center' });
  doc.setFontSize(10);
  doc.setTextColor(180,180,180);
  doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR'), pageW/2, 152, { align:'center' });
  if(settings.storeInfo && (settings.storeInfo.telefone || settings.storeInfo.instagram)){
    const contato = [settings.storeInfo.telefone, settings.storeInfo.instagram].filter(Boolean).join('  •  ');
    doc.text(contato, pageW/2, 162, { align:'center' });
  }

  // Grade de produtos: 2 colunas x 3 linhas por página
  const cols = 2, rows = 3;
  const cellW = (pageW - margin*2) / cols;
  const cellH = (pageH - margin*2) / rows;
  const imgSize = Math.min(cellW, cellH) - 26;

  // As fotos agora vêm do Supabase Storage (URL pública) — precisamos
  // carregá-las como dataURL antes de inserir no PDF.
  async function urlParaDataUrl(url){
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise(resolve=>{
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  for(let i=0;i<itens.length;i++){
    const p = itens[i];
    if(i % (cols*rows) === 0) doc.addPage();
    const posNaPagina = i % (cols*rows);
    const col = posNaPagina % cols;
    const row = Math.floor(posNaPagina / cols);
    const x = margin + col*cellW;
    const y = margin + row*cellH;

    try{
      const fotoDataUrl = p.foto.startsWith('data:') ? p.foto : await urlParaDataUrl(p.foto);
      doc.addImage(fotoDataUrl, getImageFormat(fotoDataUrl), x + (cellW-imgSize)/2, y, imgSize, imgSize);
    }catch(e){
      doc.setDrawColor(220,220,220);
      doc.rect(x + (cellW-imgSize)/2, y, imgSize, imgSize);
    }

    doc.setTextColor(12,12,12);
    doc.setFontSize(11);
    doc.text(p.team, x + cellW/2, y + imgSize + 7, { align:'center', maxWidth: cellW-6 });

    doc.setFontSize(9);
    doc.setTextColor(120,120,120);
    doc.text(`${p.marca || ''} • ${p.categoria}`, x + cellW/2, y + imgSize + 12.5, { align:'center', maxWidth: cellW-6 });

    doc.setFontSize(9);
    doc.setTextColor(120,120,120);
    doc.text(`Tamanhos: ${tamanhosResumo(p)}`, x + cellW/2, y + imgSize + 17.5, { align:'center', maxWidth: cellW-6 });
  }

  doc.save(`kadu-catalogo-${new Date().toISOString().slice(0,10)}.pdf`);
  showToast(`Catálogo gerado com ${itens.length} camisa(s)!`, 'success');
}

document.getElementById('btnGerarPdf').addEventListener('click', gerarCatalogoPdf);

(async function(){
  await renderShell('catalogo');
  produtosCat = await getProducts();
  renderCatalogoGrid();
})();
