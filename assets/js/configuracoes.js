
let novoLogoDataUrl = null;
const CORES_DISPONIVEIS = ['#e11d2e', '#0c0c0c', '#1d4ed8', '#0f766e', '#7c3aed', '#c2410c'];
let corSelecionada = '#e11d2e';

function renderLogoPreview(){
  const settings = getSettings();
  const src = novoLogoDataUrl || settings.logoDataUrl || 'assets/img/logo.svg';
  document.getElementById('logoPreview').innerHTML = `<img src="${src}" alt="Pré-visualização da logo">`;
}

function renderLogoUpload(){
  document.getElementById('logoUploadArea').innerHTML = `
    <div class="upload-zone" style="min-height:90px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
      <span>Clique para enviar a logo oficial da empresa (PNG ou SVG)</span>
      <input type="file" accept="image/*" id="logoInput">
    </div>`;
  document.getElementById('logoInput').addEventListener('change', async e=>{
    const file = e.target.files[0];
    if(!file) return;
    const { data: userData } = await sb.auth.getUser();
    const ext = file.name.split('.').pop();
    const path = `${userData.user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('fotos').upload(path, file);
    if(error){ showToast('Não foi possível enviar a logo: ' + error.message, 'error'); return; }
    const { data } = sb.storage.from('fotos').getPublicUrl(path);
    novoLogoDataUrl = data.publicUrl;
    renderLogoPreview();
    showToast('Logo carregada. Clique em "Salvar configurações" para aplicar.', 'success');
  });
}

function renderColorSwatches(){
  document.getElementById('colorSwatches').innerHTML = CORES_DISPONIVEIS.map(cor=>`
    <button type="button" class="color-swatch ${cor===corSelecionada?'active':''}" style="background:${cor}" data-cor="${cor}" aria-label="Selecionar cor ${cor}"></button>
  `).join('');
  document.querySelectorAll('.color-swatch').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      corSelecionada = btn.dataset.cor;
      renderColorSwatches();
    });
  });
}

function carregarFormulario(){
  const s = getSettings();
  document.getElementById('cfgNome').value = s.companyName;
  document.getElementById('cfgTelefone').value = s.storeInfo.telefone || '';
  document.getElementById('cfgEndereco').value = s.storeInfo.endereco || '';
  document.getElementById('cfgInstagram').value = s.storeInfo.instagram || '';
  corSelecionada = s.accentColor;
  renderLogoPreview();
  renderLogoUpload();
  renderColorSwatches();
}

async function salvarConfiguracoes(){
  const nome = document.getElementById('cfgNome').value.trim() || 'RP Shirts';
  const settings = getSettings();

  const r = await saveSettingsCloud({
    ...settings,
    companyName: nome,
    logoDataUrl: novoLogoDataUrl || settings.logoDataUrl,
    accentColor: corSelecionada,
    storeInfo: {
      telefone: document.getElementById('cfgTelefone').value.trim(),
      endereco: document.getElementById('cfgEndereco').value.trim(),
      instagram: document.getElementById('cfgInstagram').value.trim(),
    }
  });
  if(!r.ok){ showToast(r.erro, 'error'); return; }

  applyBranding();
  showToast('Configurações salvas com sucesso!', 'success');
}

async function restaurarPadrao(){
  const r = await saveSettingsCloud({
    companyName: 'Kadu Camisas de Time',
    logoDataUrl: null,
    accentColor: '#e11d2e',
    storeInfo: { telefone:'', endereco:'', instagram:'' }
  });
  if(!r.ok){ showToast(r.erro, 'error'); return; }
  novoLogoDataUrl = null;
  corSelecionada = '#e11d2e';
  carregarFormulario();
  applyBranding();
  showToast('Configurações restauradas para o padrão.', 'success');
}

(async function(){
  await renderShell('config', { requireAuth: true });
  corSelecionada = getSettings().accentColor;
  carregarFormulario();
})();
