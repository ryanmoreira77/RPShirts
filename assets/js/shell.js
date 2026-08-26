
const OWNER_EMAIL = 'jenniferrodriguesruffo@gmail.com';

const NAV_ICONS = {
  dashboard:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  produtos:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></svg>`,
  estoque:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M8 12h8"/></svg>`,
  financeiro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  relatorios: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h6M9 8h2"/></svg>`,
  catalogo:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M21 15l-5-5-9 9"/></svg>`,
  config:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9c.1.6.6 1.1 1.5 1.5H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z"/></svg>`,
  logout:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  menu:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
};

const NAV_ITEMS = [
  { key:'dashboard',  label:'Dashboard',   file:'dashboard.html' },
  { key:'produtos',   label:'Produtos',    file:'produtos.html' },
  { key:'catalogo',   label:'Catálogo',    file:'catalogo.html' },
  { key:'config',     label:'Configurações', file:'configuracoes.html' },
];

const PAGE_META = {
  dashboard:  { title:'Dashboard',   sub:'Visão geral do seu estoque' },
  produtos:   { title:'Produtos',    sub:'Cadastro e controle de camisas em estoque' },
  catalogo:   { title:'Catálogo',    sub:'Monte um catálogo em PDF com fotos para enviar aos clientes' },
  config:     { title:'Configurações', sub:'Logo, nome da empresa, cores e dados da loja' },
};


function renderPasswordGate(onSuccess){
  const wrap = document.createElement('div');
  wrap.className = 'overlay open';
  wrap.style.zIndex = '500';
  wrap.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header"><h2>Área restrita</h2></div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-dim);margin:0 0 16px;">Digite a senha da loja para gerenciar essa área.</p>
        <div class="field" id="gate-f-senha">
          <label for="gateSenha">Senha</label>
          <input id="gateSenha" type="password" placeholder="••••••••" autocomplete="current-password">
          <div class="field-error">Senha incorreta. Tente novamente.</div>
        </div>
        <button class="btn-primary" id="gateBtn" style="margin-top:6px;">
          <span class="spinner"></span><span class="btn-label">Entrar</span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const input = wrap.querySelector('#gateSenha');
  const btn = wrap.querySelector('#gateBtn');
  const fieldBox = wrap.querySelector('#gate-f-senha');
  input.focus();

  async function tentar(){
    fieldBox.classList.remove('invalid');
    const senha = input.value;
    if(!senha){ fieldBox.classList.add('invalid'); return; }

    btn.classList.add('loading');
    btn.disabled = true;
    const { error } = await signIn(OWNER_EMAIL, senha);
    btn.classList.remove('loading');
    btn.disabled = false;

    if(error){
      fieldBox.classList.add('invalid');
      input.value = '';
      input.focus();
      return;
    }
    wrap.remove();
    onSuccess();
  }

  btn.addEventListener('click', tentar);
  input.addEventListener('keydown', e=>{ if(e.key === 'Enter') tentar(); });
}


async function renderShell(active, opts){
  const requireAuth = !!(opts && opts.requireAuth);
  let session = await getSession();

  if(requireAuth && !session){
    session = await new Promise(resolve=>{
      renderPasswordGate(async ()=>{
        resolve(await getSession());
      });
    });
  }

  await loadSettingsFromCloud();

  document.getElementById('sidebar-root').innerHTML = `
    <aside class="sidebar" id="sidebarEl">
      <div class="sidebar-brand">
        <img class="badge" data-brand-logo src="assets/img/logo.svg" alt="Logo">
        <div class="brand-text">
          <div class="name display" data-brand-name>Kadu Camisas de Time</div>
          <div class="tag">Painel de gestão</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <a class="nav-item ${active===item.key?'active':''}" href="${item.file}">
            ${NAV_ICONS[item.key]}${item.label}
          </a>`).join('')}
      </nav>
      <div class="sidebar-footer">
        ${session ? `<button class="nav-item logout" id="logoutBtn">${NAV_ICONS.logout}Sair</button>` : ''}
      </div>
    </aside>`;

  const meta = PAGE_META[active] || { title:'', sub:'' };

  document.getElementById('header-root').innerHTML = `
    <header class="topheader">
      <div style="display:flex;align-items:center;">
        <button class="menu-toggle" id="menuToggle">${NAV_ICONS.menu}</button>
        <div class="title-block">
          <h1>${meta.title}</h1>
          <p>${meta.sub}</p>
        </div>
      </div>
      <div class="user-chip">
        ${session
          ? `<span class="user-avatar">${userInitials(session.user.email)}</span><span>${session.user.email}</span>`
          : `<span style="font-size:12.5px;color:var(--text-dim);">Catálogo público</span>`}
      </div>
    </header>`;

  document.getElementById('logoutBtn')?.addEventListener('click', signOutCloud);

  const toggle = document.getElementById('menuToggle');
  const sidebarEl = document.getElementById('sidebarEl');
  if(toggle){
    toggle.addEventListener('click', () => sidebarEl.classList.toggle('open'));
  }

  applyBranding();
  return session;
}
