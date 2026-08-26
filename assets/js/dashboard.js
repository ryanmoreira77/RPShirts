
(async function(){
  await renderShell('dashboard');

  const CHART_RED = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#e11d2e';
  const CHART_BLACK = '#0c0c0c';
  const CHART_GRAY = '#c9c9c9';

  function countUp(el, target){
    const duration = 700;
    const start = performance.now();
    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = Math.round(value).toString();
      if(progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderKPIs(products){
    const totalProdutos = products.length;
    const totalUnidades = products.reduce((s,p)=>s+totalQtd(p),0);
    const estoqueBaixo = getEstoqueLinhas(products).filter(l=>l.qtd>0 && l.qtd<=LOW_STOCK).length;

    const kpis = [
      { icon:'👕', label:'Produtos cadastrados', id:'kpiTotalProdutos', value:totalProdutos },
      { icon:'📦', label:'Unidades em estoque', id:'kpiTotalUnidades', value:totalUnidades },
      { icon:'⚠️', label:'Estoque baixo', id:'kpiBaixo', value:estoqueBaixo, alert:estoqueBaixo>0 },
    ];

    document.getElementById('kpiGrid').innerHTML = kpis.map((k,i)=>`
      <div class="kpi-card anim-fade-up" style="animation-delay:${i*0.05}s">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value ${k.alert?'alert':''}" id="${k.id}">0</div>
      </div>
    `).join('');

    kpis.forEach(k => countUp(document.getElementById(k.id), k.value));
  }

  function renderCharts(products){
    const porCategoria = {};
    const porTamanho = {};
    products.forEach(p=>{
      porCategoria[p.categoria] = (porCategoria[p.categoria]||0) + totalQtd(p);
      SIZES.forEach(t=>{
        const q = (p.tamanhos && p.tamanhos[t]) || 0;
        if(q>0) porTamanho[t] = (porTamanho[t]||0) + q;
      });
    });

    new Chart(document.getElementById('chartCategoria'), {
      type:'bar',
      data:{
        labels:Object.keys(porCategoria),
        datasets:[{ data:Object.values(porCategoria), backgroundColor:CHART_RED, borderRadius:6, maxBarThickness:46 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          y:{beginAtZero:true, grid:{color:'#eee'}, ticks:{font:{family:'Inter'}}},
          x:{grid:{display:false}, ticks:{font:{family:'Inter'}}}
        }
      }
    });

    new Chart(document.getElementById('chartTamanho'), {
      type:'doughnut',
      data:{
        labels:Object.keys(porTamanho),
        datasets:[{
          data:Object.values(porTamanho),
          backgroundColor:[CHART_RED, CHART_BLACK, '#5c5c5c', CHART_GRAY, '#f2a7ad', '#8a2530', '#3a3a3a', '#d68e94'],
          borderWidth:2, borderColor:'#ffffff'
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{position:'bottom', labels:{font:{family:'Inter'}, boxWidth:12, padding:14}}},
        cutout:'62%'
      }
    });
  }

  function escapeHtml(s){
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderLowStockTable(products){
    const linhas = getEstoqueLinhas(products).filter(l=>l.qtd<=LOW_STOCK).sort((a,b)=>a.qtd-b.qtd);
    document.getElementById('lowStockSub').textContent = `Quantidade igual ou menor que ${LOW_STOCK} unidades, por tamanho`;

    const table = document.getElementById('lowStockTable');
    if(linhas.length===0){
      table.innerHTML = `<tr><td style="color:var(--text-dim);padding:16px 10px;">Nenhuma camisa com estoque baixo no momento.</td></tr>`;
      return;
    }
    table.innerHTML = `
      <tr><th>Time</th><th>Tamanho</th><th>Estoque</th><th>Status</th></tr>
      ${linhas.map(l=>`
        <tr>
          <td>${escapeHtml(l.produto.team)}</td>
          <td class="mono">${l.tamanho}</td>
          <td class="mono">${l.qtd}</td>
          <td><span class="dot ${l.qtd===0?'out':'low'}"></span>${l.qtd===0?'Esgotado':'Estoque baixo'}</td>
        </tr>`).join('')}
    `;
  }

  const products = await getProducts();
  renderKPIs(products);
  renderCharts(products);
  renderLowStockTable(products);
})();
