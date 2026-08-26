
function applyBranding(){
  const settings = getSettings();

  document.querySelectorAll('[data-brand-name]').forEach(el=>{
    el.textContent = settings.companyName;
  });
  document.querySelectorAll('[data-brand-logo]').forEach(el=>{
    el.src = settings.logoDataUrl || 'assets/img/logo.svg';
  });
  document.title = document.title.replace('RP Shirts', settings.companyName);

  if(settings.accentColor){
    document.documentElement.style.setProperty('--red', settings.accentColor);
    document.documentElement.style.setProperty('--red-dark', shadeColor(settings.accentColor, -25));
    document.documentElement.style.setProperty('--red-glow', hexToRgba(settings.accentColor, 0.55));
  }
}

function shadeColor(hex, percent){
  const num = parseInt(hex.replace('#',''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
  let b = (num & 0x0000FF) + Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1);
}

function hexToRgba(hex, alpha){
  const num = parseInt(hex.replace('#',''), 16);
  const r = num >> 16, g = (num >> 8) & 0x00FF, b = num & 0x0000FF;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ===== Toasts ===== */
function ensureToastContainer(){
  let el = document.getElementById('toastContainer');
  if(!el){
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>',
  error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7h.01"/></svg>'
};

function showToast(message, type){
  type = type || 'success';
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 250);
  }, 3200);
}

document.addEventListener('DOMContentLoaded', applyBranding);
