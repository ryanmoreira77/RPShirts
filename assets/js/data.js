
const LOW_STOCK = 5;
const PARADO_DIAS = 30;

const SIZES = ['PP','P','M','G','XL','2XL','3XL','4XL'];

function tamanhosVazios(){
  const obj = {};
  SIZES.forEach(t => obj[t] = 0);
  return obj;
}

function totalQtd(produto){
  return Object.values(produto.tamanhos || {}).reduce((s,n)=>s+(Number(n)||0), 0);
}


async function getProducts(){
  const { data: produtosRows, error } = await sb
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending:false });
  if(error){ console.error(error); return []; }

  const { data: tamanhosRows } = await sb.from('tamanhos_estoque').select('*');
  const porProduto = {};
  (tamanhosRows || []).forEach(t=>{
    if(!porProduto[t.produto_id]) porProduto[t.produto_id] = tamanhosVazios();
    porProduto[t.produto_id][t.tamanho] = Number(t.qtd);
  });

  return produtosRows.map(p => ({
    ...p,
    foto: p.foto_url || null,
    tamanhos: porProduto[p.id] || tamanhosVazios(),
  }));
}

async function getProduct(id){
  const lista = await getProducts();
  return lista.find(p => p.id === id) || null;
}

async function gerarProximoSku(){
  const { data } = await sb.from('produtos').select('sku');
  const nums = (data || []).map(x => parseInt((x.sku || 'KC-0000').split('-')[1], 10) || 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return 'KC-' + String(next).padStart(4, '0');
}

async function addProduct(p){
  const sku = p.sku && p.sku.trim() ? p.sku.trim() : await gerarProximoSku();

  const insertPayload = {
    sku, nome: p.nome, team: p.team, liga: p.liga, temporada: p.temporada,
    marca: p.marca, modelo: p.modelo, categoria: p.categoria,
    custo: p.custo, preco: p.preco, foto_url: p.foto || null,
    observacoes: p.observacoes || '',
  };

  const { data: novo, error } = await sb.from('produtos').insert(insertPayload).select().single();
  if(error) return { ok:false, erro: error.message };

  const tamanhos = { ...tamanhosVazios(), ...(p.tamanhos || {}) };
  const linhas = SIZES.filter(t => tamanhos[t] > 0).map(t => ({ produto_id: novo.id, tamanho: t, qtd: tamanhos[t] }));
  if(linhas.length) await sb.from('tamanhos_estoque').insert(linhas);

  return { ok:true, data: { ...novo, foto: novo.foto_url, tamanhos } };
}

async function updateProduct(id, patch){
  const produtoPatch = {};
  ['sku','nome','team','liga','temporada','marca','modelo','categoria','custo','preco','observacoes'].forEach(k=>{
    if(patch[k] !== undefined) produtoPatch[k] = patch[k];
  });
  if(patch.foto !== undefined) produtoPatch.foto_url = patch.foto;

  if(Object.keys(produtoPatch).length){
    const { error } = await sb.from('produtos').update(produtoPatch).eq('id', id);
    if(error) return { ok:false, erro: error.message };
  }

  if(patch.tamanhos){
    for(const t of SIZES){
      const qtd = patch.tamanhos[t] || 0;
      await sb.from('tamanhos_estoque').upsert({ produto_id:id, tamanho:t, qtd }, { onConflict:'produto_id,tamanho' });
    }
  }
  return { ok:true };
}

async function deleteProduct(id){
  const { error } = await sb.from('produtos').delete().eq('id', id);
  if(error) return { ok:false, erro: error.message };
  return { ok:true };
}


async function uploadFotoProduto(file){
  const { data: userData } = await sb.auth.getUser();
  const ext = file.name.split('.').pop();
  const path = `${userData.user.id}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('fotos').upload(path, file);
  if(error) return { ok:false, erro: error.message };
  const { data } = sb.storage.from('fotos').getPublicUrl(path);
  return { ok:true, url: data.publicUrl };
}


function getEstoqueLinhas(produtos){
  const linhas = [];
  produtos.forEach(p=>{
    SIZES.forEach(tamanho=>{
      const qtd = (p.tamanhos && p.tamanhos[tamanho]) || 0;
      if(qtd > 0) linhas.push({ produtoId: p.id, produto: p, tamanho, qtd });
    });
  });
  return linhas;
}


async function registrarMovimentacao({ produtoId, tamanho, tipo, quantidade, motivo, observacao }){
  const { data, error } = await sb.rpc('registrar_movimentacao', {
    p_produto_id: produtoId,
    p_tamanho: tamanho,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_motivo: motivo || '',
    p_observacao: observacao || ''
  });
  if(error) return { ok:false, erro: error.message };
  return data;
}

async function getMovements(){
  const { data, error } = await sb.from('movimentacoes').select('*').order('data', { ascending:false });
  if(error){ console.error(error); return []; }
  return data.map(m => ({
    id: m.id,
    produtoId: m.produto_id,
    tamanho: m.tamanho,
    tipo: m.tipo,
    quantidade: Number(m.quantidade),
    data: m.data,
    motivo: m.motivo || '',
    observacao: m.observacao || '',
    valorUnitario: m.valor_unitario != null ? Number(m.valor_unitario) : undefined,
  }));
}

async function getHistoricoProduto(produtoId){
  const { data, error } = await sb.from('movimentacoes').select('*').eq('produto_id', produtoId).order('data', { ascending:false });
  if(error){ console.error(error); return []; }
  return data.map(m => ({
    id: m.id, produtoId: m.produto_id, tamanho: m.tamanho, tipo: m.tipo,
    quantidade: Number(m.quantidade), data: m.data, motivo: m.motivo || '', observacao: m.observacao || '',
  }));
}

/* =================== ESTATÍSTICAS =================== */
/* Agora recebem os arrays já carregados (produtos/movements) em vez
   de buscar no banco de novo a cada chamada. */

function isMesmoMes(dataISO){
  const d = new Date(dataISO);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function vendasDoMes(movements){
  return movements.filter(m => m.tipo === 'Venda' && isMesmoMes(m.data));
}

function unidadesVendidasNoMes(movements){
  return vendasDoMes(movements).reduce((s,m)=>s+m.quantidade, 0);
}

function camisasMaisVendidas(movements, produtos, limit){
  const vendas = movements.filter(m => m.tipo === 'Venda');
  const porProduto = {};
  vendas.forEach(m=>{
    porProduto[m.produtoId] = (porProduto[m.produtoId] || 0) + m.quantidade;
  });
  return Object.entries(porProduto)
    .map(([id, qtd]) => ({ produto: produtos.find(p=>p.id===Number(id)), qtd }))
    .filter(x => x.produto)
    .sort((a,b)=>b.qtd-a.qtd)
    .slice(0, limit || 5);
}

function receitaTotal(movements){
  return movements
    .filter(m => m.tipo === 'Venda')
    .reduce((s,m)=>s + m.quantidade * (m.valorUnitario || 0), 0);
}

function produtosParados(produtos, movements){
  const limite = Date.now() - PARADO_DIAS*86400000;
  const vendasRecentesPorProduto = new Set(
    movements
      .filter(m => m.tipo === 'Venda' && new Date(m.data).getTime() >= limite)
      .map(m => m.produtoId)
  );
  return produtos.filter(p => totalQtd(p) > 0 && !vendasRecentesPorProduto.has(p.id));
}

function formatBRL(v){
  return Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function formatDataBR(iso){
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function removeAccents(str){
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/* =================== CONFIGURAÇÕES / MARCA =================== */
/* Cache local para uso síncrono (brand.js chama getSettings() sem
   await); shell.js carrega do banco com loadSettingsFromCloud()
   antes de aplicar a marca em cada página. */
let _settingsCache = {
  companyName: 'Kadu Camisas de Time',
  logoDataUrl: null,
  accentColor: '#e11d2e',
  storeInfo: { telefone:'', endereco:'', instagram:'' }
};

function getSettings(){
  return _settingsCache;
}

async function loadSettingsFromCloud(){
  const { data: userData } = await sb.auth.getUser();
  if(!userData?.user) return _settingsCache;

  const { data, error } = await sb.from('configuracoes').select('*').eq('user_id', userData.user.id).maybeSingle();
  if(!error && data){
    _settingsCache = {
      companyName: data.company_name || 'Kadu Camisas de Time',
      logoDataUrl: data.logo_url || null,
      accentColor: data.accent_color || '#e11d2e',
      storeInfo: {
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        instagram: data.instagram || '',
      }
    };
  }
  return _settingsCache;
}

async function saveSettingsCloud(settings){
  const { data: userData } = await sb.auth.getUser();
  if(!userData?.user) return { ok:false, erro:'Sessão inválida.' };

  const { error } = await sb.from('configuracoes').upsert({
    user_id: userData.user.id,
    company_name: settings.companyName,
    logo_url: settings.logoDataUrl,
    accent_color: settings.accentColor,
    telefone: settings.storeInfo?.telefone || '',
    endereco: settings.storeInfo?.endereco || '',
    instagram: settings.storeInfo?.instagram || '',
  });
  if(error) return { ok:false, erro: error.message };
  _settingsCache = settings;
  return { ok:true };
}
