// ---------- Global State Variables ----------
let allRows = [];
let filteredRows = [];
let rawFileData = [];
let fileHeaders = [];
let fileRows = null;
let currentFilter = 'all';
let isBPMNMode = false;
let bpmnRows = [];
let bpmnXmlDoc = null;
let bpmnFileName = "";
let bpmnFiles = []; // Plusieurs BPMN importés : [{name, doc, rows}]
let currentSort = { key: 'status', dir: 1 };
let searchVal = '';
let currentPage = 1;
let itemsPerPage = 20;
let analysisHistory = [];
let donutChart, barChart, lineChart, historyChart, sensitivityChart, teamChart;
let activeHistoryId = null;
let dashFilterProcess = 'all';
let dashFilterTeam = 'all';
let dashFilterSensitivity = 'all';
let currentRankingSearch = '';
let currentRankingStatus = 'all';
let currentRankingSort = 'rank';
let currentRankingLimit = '50';
let rankingChart = null;

// ---------- Module & Subprocess State Variables ----------
let currentModule = 'variables'; // 'variables', 'subprocesses', 'bpmn-naming' or 'pmg'
let allSubprocessRows = [];
let filteredSubprocessRows = [];
let rawSubprocessFileData = [];
let subprocessFileHeaders = [];
let subColParentIdx = -1;
let subColSubprocessIdx = -1;
let subColElementIdIdx = -1;
let subSearchVal = '';
let subLoopFilterVal = 'all';
let subSortKey = 'impact';
let subSortDir = -1;


// ---------- Initialization ----------
(async function() {
  checkAuth();

  // Configurer Chart.js par défaut pour le thème sombre
  if (window.Chart) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
    Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif";
  }


  const sensitivityLevelsEl = document.getElementById('sensitivityLevels');
  if (sensitivityLevelsEl) sensitivityLevelsEl.value = DEFAULT_SENSITIVITY.join('\n');
  const teamTagsEl = document.getElementById('teamTags');
  if (teamTagsEl) teamTagsEl.value = DEFAULT_TEAMS.join('\n');

  // Charger le thème persisté
  const savedTheme = localStorage.getItem('pda_camunda_theme') || 'theme-sombre';
  document.body.className = savedTheme;
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) themeSelector.value = savedTheme;
  updateChartColorsForTheme(savedTheme);

  try {
    analysisHistory = await dbLoadAll();
    renderHistory();
  } catch(e) { console.error("Erreur de chargement DB", e); }
})();

function updateChartColorsForTheme(themeName) {
  if (!window.Chart) return;
  const isLight = themeName === 'theme-clair';
  const isCyber = themeName === 'theme-cyber';
  
  const textColor = isLight ? '#475569' : isCyber ? '#00ffcc' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : isCyber ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255, 255, 255, 0.08)';
  
  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;
}

window.changeTheme = function(themeName) {
  document.body.className = themeName;
  localStorage.setItem('pda_camunda_theme', themeName);
  
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) themeSelector.value = themeName;
  
  updateChartColorsForTheme(themeName);
  
  if (allRows.length > 0) {
    renderDashboard();
    renderRanking();
    renderGraph();
  }
  if (allSubprocessRows.length > 0) {
    renderSubprocessMap();
  }
}

// ---------- Main Analysis Logic ----------
async function analyze(){
  const manual=document.getElementById('manualInput').value.trim();

  if(!manual && !rawFileData.length && (!isBPMNMode || !bpmnRows.length)){
     alert('Veuillez importer un fichier ou saisir des variables.');
     return;
  }

  let tempRows=[];

  if(isBPMNMode && bpmnRows.length > 0){
    tempRows = bpmnRows;
  } else if(rawFileData.length > 0){
    const colVarIdx = parseInt(document.getElementById('colVariable').value, 10);
    const colParentIdx = parseInt(document.getElementById('colParentProcess').value, 10);
    const colCallIdx = parseInt(document.getElementById('colCallingProcess').value, 10);

    if(isNaN(colVarIdx)){
      alert("Veuillez sélectionner la colonne contenant les variables.");
      return;
    }

    rawFileData.forEach((row, index) => {
        const varName = String(row[colVarIdx] || '').trim();
        if(varName){
           tempRows.push({
             name: varName,
             parentProcess: colParentIdx >= 0 ? String(row[colParentIdx] || '').trim() : '',
             callingProcess: colCallIdx >= 0 ? String(row[colCallIdx] || '').trim() : '',
             row: index + 1
           });
        }
    });
  } else {
    tempRows=manual.split('\n').map((l,i)=>({
      name:l.trim(),
      parentProcess:'Manuel',
      callingProcess:'',
      row:i+1
    })).filter(r=>r.name);
  }

  if(tempRows.length === 0){
     alert("Aucune variable trouvée.");
     return;
  }

  // Afficher le spinner de chargement et initialiser la barre de progression
  const loader = document.getElementById('loaderOverlay');
  const progressBar = document.getElementById('loaderProgressBar');
  
  progressBar.style.transition = 'none';
  progressBar.style.width = '0%';
  
  loader.style.display = 'flex';
  // Forcer le reflow
  loader.offsetHeight; 
  loader.classList.add('active');
  
  // Remplissage progressif de la barre sur 3 secondes
  setTimeout(() => {
    progressBar.style.transition = 'width 3s linear';
    progressBar.style.width = '100%';
  }, 50);

  // Attendre 3 secondes (simulation du chargement)
  await new Promise(resolve => setTimeout(resolve, 3000));

  let rows = tempRows;
  if(rawFileData.length > 0 || isBPMNMode){
    fileRows = rows;
  } else {
    fileRows = null;
  }

  allRows=rows.map(r=>{
    const{issues,status}=checkVariable(r.name);
    const suggested=(status!=='valid')?toCamelCase(r.name):'';
    
    let sensitivity = 'Public';
    
    return{...r,issues,status,suggested,editedSuggestion:suggested,sensitivity,team:'Non assignée'};
  });

  const histItem = {
    id: Date.now(),
    date: new Date(),
    count: allRows.length,
    valid: allRows.filter(r=>r.status==='valid').length,
    label: isBPMNMode ? (bpmnFiles.length > 1 ? `${bpmnFiles.length} fichiers BPMN` : bpmnFileName) : rawFileData.length ? document.getElementById('uploadTitle').textContent : 'Saisie manuelle',
    isBPMNMode: isBPMNMode,
    bpmnXmlText: isBPMNMode && bpmnXmlDoc ? new XMLSerializer().serializeToString(bpmnXmlDoc) : null,
    bpmnFileName: isBPMNMode ? bpmnFileName : null,
    bpmnFiles: isBPMNMode ? bpmnFiles.map(f => ({ name: f.name, xmlText: new XMLSerializer().serializeToString(f.doc) })) : null,
    allRows: JSON.parse(JSON.stringify(allRows))
  };

  activeHistoryId = histItem.id;

  analysisHistory.unshift(histItem);
  try {
    await dbSave(histItem);
  } catch(e) { console.error("Erreur de sauvegarde DB", e); }

  currentFilter='all';searchVal='';currentSort={key:'status',dir:1};currentPage=1;
  document.getElementById('resultsTab').style.display='';
  document.getElementById('dashTab').style.display='';
  document.getElementById('graphTab').style.display='';
  document.getElementById('rankTab').style.display='';
  document.getElementById('resetBtn').style.display='';

  const bpmnBtn = document.getElementById('downloadBpmnBtn');
  if (bpmnBtn) bpmnBtn.style.display = isBPMNMode ? 'inline-block' : 'none';

  initGraphFilters();
  resetDashboardFilters();
  switchTab('results');
  renderResults();
  renderDashboard();
  renderRanking();
  renderHistory();

  // Cacher le spinner avec une transition fluide
  loader.classList.remove('active');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 300);
}

// ---------- UI Rendering - Results ----------
function renderResults(){
  const total=allRows.length;
  const valid=allRows.filter(r=>r.status==='valid').length;
  const invalid=allRows.filter(r=>r.status==='invalid').length;
  const warn=allRows.filter(r=>r.status==='warn').length;
  const score=Math.round((valid/total)*100)||0;
  const scoreColor=score>=90?'var(--ok-dark)':score>=70?'var(--brand-primary)':'var(--err-dark)';

  document.getElementById('statsGrid').innerHTML=`
    <div class="stat"><div class="val">${total}</div><div class="lbl">Total</div></div>
    <div class="stat ok"><div class="val">${valid}</div><div class="lbl">Conformes</div></div>
    <div class="stat err"><div class="val">${invalid}</div><div class="lbl">Non conformes</div></div>
    <div class="stat warn"><div class="val">${warn}</div><div class="lbl">Avertissements</div></div>
    <div class="stat info"><div class="val">${score}%</div><div class="lbl">Score</div></div>
  `;
  document.getElementById('scoreBar').innerHTML=`
    <span class="score-label">Score de conformité</span>
    <div class="score-track"><div class="score-fill" style="width:${score}%;background:${scoreColor}"></div></div>
    <span class="score-val" style="color:${scoreColor}">${score}%</span>
  `;

  document.getElementById('toolbarEl').innerHTML=`
    <button class="pill active" id="pAll" onclick="setFilter('all')">Tous (${total})</button>
    <button class="pill p-ok" id="pOk" onclick="setFilter('valid')">Conformes (${valid})</button>
    <button class="pill p-err" id="pErr" onclick="setFilter('invalid')">Non conformes (${invalid})</button>
    <button class="pill p-warn" id="pWarn" onclick="setFilter('warn')">Avertissements (${warn})</button>
    <input class="srch" placeholder="Rechercher..." id="searchInput" oninput="onSearch()" value="${esc(searchVal)}">
    <select class="srt" id="sortSel" onchange="onSortChange()">
      <option value="status">Trier : statut</option>
      <option value="name">Trier : nom</option>
      <option value="issues">Trier : nb problèmes</option>
    </select>
  `;
  updatePills();
  renderTable();
}

function setFilter(f){currentFilter=f;currentPage=1;updatePills();renderTable()}
function onSearch(){searchVal=document.getElementById('searchInput')?.value||'';currentPage=1;renderTable()}
function onSortChange(){currentSort.key=document.getElementById('sortSel').value;currentPage=1;renderTable()}
function sortBy(k){if(currentSort.key===k)currentSort.dir*=-1;else{currentSort.key=k;currentSort.dir=1};currentPage=1;renderTable()}

function updatePills(){
  ['All','Ok','Err','Warn'].forEach(x=>{
    const el=document.getElementById('p'+x);
    if(el)el.classList.toggle('active',
      (x==='All'&&currentFilter==='all')||(x==='Ok'&&currentFilter==='valid')||(x==='Err'&&currentFilter==='invalid')||(x==='Warn'&&currentFilter==='warn')
    );
  });
}

function renderTable(){
  const search=searchVal.toLowerCase();
  const statusOrder={invalid:0,warn:1,valid:2};
  let rows=allRows.filter(r=>{
    if(currentFilter!=='all'&&r.status!==currentFilter)return false;
    if(search&&!r.name.toLowerCase().includes(search)&&!(r.editedSuggestion||'').toLowerCase().includes(search))return false;
    return true;
  });
  rows.sort((a,b)=>{
    let av,bv;
    if(currentSort.key==='status'){av=statusOrder[a.status];bv=statusOrder[b.status]}
    else if(currentSort.key==='issues'){av=a.issues.length;bv=b.issues.length}
    else{av=a.name.toLowerCase();bv=b.name.toLowerCase()}
    return av<bv?-currentSort.dir:av>bv?currentSort.dir:0;
  });
  filteredRows=rows;
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  if(currentPage > totalPages) currentPage = totalPages;
  if(currentPage < 1) currentPage = 1;
  
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const tbody=document.getElementById('tableBody');
  const empty=document.getElementById('emptyMsg');
  document.getElementById('rowCount').textContent=`${totalItems} variable${totalItems!==1?'s':''} trouvée${totalItems!==1?'s':''} (Page ${currentPage}/${totalPages})`;
  if(!totalItems){tbody.innerHTML='';empty.style.display='block';document.getElementById('paginationControls').innerHTML='';return}
  empty.style.display='none';
  const stLabel={valid:'Conforme',invalid:'Non conforme',warn:'Attention'};
  const sensLevels = getSensitivityLevels();
  const teamTags = getTeamTags();

  tbody.innerHTML=paginatedRows.map((r,i)=>{
    const globalIdx = allRows.indexOf(r);
    
    const sensSelectHTML = `
      <select class="gov-select ${getSensitivityClass(r.sensitivity || 'Public')}" onchange="changeRowSensitivity(${globalIdx}, this)">
        ${sensLevels.map(lvl => `
          <option value="${esc(lvl)}" ${r.sensitivity === lvl ? 'selected' : ''}>${esc(lvl)}</option>
        `).join('')}
      </select>
    `;

    const teamSelectHTML = `
      <select class="gov-select" onchange="changeRowTeam(${globalIdx}, this)">
        ${teamTags.map(t => `
          <option value="${esc(t)}" ${r.team === t ? 'selected' : ''}>${esc(t)}</option>
        `).join('')}
      </select>
    `;

    return `
      <tr>
        <td><span class="mono">${esc(r.name)}</span></td>
        <td><span class="badge ${r.status==='valid'?'ok':r.status==='warn'?'warn':'err'}">${stLabel[r.status]}</span></td>
        <td>${r.issues.length?`<div class="iss-list">${r.issues.map(iss=>`<div class="iss-item"><span class="iss-dot ${iss.sev==='warn'?'w':''}">●</span>${esc(iss.msg)}</div>`).join('')}</div>`:'<span style="color:var(--text-tertiary);font-size:11px">—</span>'}</td>
        <td>${r.status!=='valid'?`<input type="text" class="sug-input" value="${esc(r.editedSuggestion)}" onchange="updateSug(${globalIdx},this.value)">`:'<span style="color:var(--text-tertiary);font-size:11px">—</span>'}</td>
        <td>
          <div class="gov-select-container">
            ${sensSelectHTML}
            ${teamSelectHTML}
          </div>
        </td>
        <td><span style="font-size:11px;color:var(--text-secondary)">${esc(r.parentProcess||'')}</span></td>
        <td><span style="font-size:11px;color:var(--text-secondary)">${esc(r.callingProcess||'')}</span></td>
        <td>${r.status!=='valid'&&r.editedSuggestion?`<button class="copy-btn" onclick="copySug(this,'${esc(r.editedSuggestion)}')">Copier</button>`:'<span style="font-size:11px;color:var(--text-tertiary)">—</span>'}</td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationControls');
  if(totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <select class="srt" onchange="changeItemsPerPage(this.value)" style="margin-right:4px;">
      <option value="10" ${itemsPerPage==10?'selected':''}>10 / page</option>
      <option value="20" ${itemsPerPage==20?'selected':''}>20 / page</option>
      <option value="50" ${itemsPerPage==50?'selected':''}>50 / page</option>
      <option value="100" ${itemsPerPage==100?'selected':''}>100 / page</option>
    </select>
    <button class="btn-ghost" style="padding:4px 8px" onclick="changePage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}>Préc.</button>
    <span style="font-size:12px; font-weight:500; color:var(--text-secondary);"> ${currentPage} / ${totalPages} </span>
    <button class="btn-ghost" style="padding:4px 8px" onclick="changePage(currentPage + 1)" ${currentPage === totalPages ? 'disabled' : ''}>Suiv.</button>
  `;
}
function changePage(p) { currentPage = p; renderTable(); }
function changeItemsPerPage(val) { itemsPerPage = parseInt(val, 10); currentPage = 1; renderTable(); }

function updateSug(idx,val){
  allRows[idx].editedSuggestion=val;
  saveCurrentState();
}

async function saveCurrentState() {
  if (activeHistoryId) {
    const item = analysisHistory.find(h => h.id === activeHistoryId);
    if (item) {
      item.allRows = JSON.parse(JSON.stringify(allRows));
      try {
        await dbSave(item);
        renderHistory();
      } catch(e) { console.error("Erreur de sauvegarde de l'état", e); }
    }
  }
}

function getSensitivityClass(val) {
  const v = (val || '').toLowerCase();
  if (v.includes('public')) return 'public';
  if (v.includes('interne')) return 'interne';
  if (v.includes('conf')) return 'confidentiel';
  if (v.includes('critique') || v.includes('sensible')) return 'critique';
  return '';
}

function changeRowSensitivity(idx, selectEl) {
  const val = selectEl.value;
  allRows[idx].sensitivity = val;
  selectEl.className = 'gov-select ' + getSensitivityClass(val);
  saveCurrentState();
  renderDashboard();
}

function changeRowTeam(idx, selectEl) {
  const val = selectEl.value;
  allRows[idx].team = val;
  saveCurrentState();
  renderDashboard();
}

function copySug(btn,val){
  navigator.clipboard?.writeText(val).catch(()=>{});
  btn.textContent='Copié !';btn.classList.add('copied');
  setTimeout(()=>{btn.textContent='Copier';btn.classList.remove('copied')},1500);
}

function applyAllSuggestions(){
  const count=allRows.filter(r=>r.status!=='valid'&&r.editedSuggestion).length;
  const lines=allRows.map(r=>r.status!=='valid'&&r.editedSuggestion?r.editedSuggestion:r.name).join('\n');
  navigator.clipboard?.writeText(lines).catch(()=>{});
  alert(`${count} suggestion(s) copiées dans le presse-papier.`);
}

function populateDashboardFilters() {
  const processSelect = document.getElementById('dashFilterProcess');
  const teamSelect = document.getElementById('dashFilterTeam');
  const sensSelect = document.getElementById('dashFilterSensitivity');
  
  if (!processSelect || !teamSelect || !sensSelect) return;
  
  // 1. Populate process dropdown
  const uniqueProcs = new Set();
  allRows.forEach(r => {
    if (r.parentProcess && r.parentProcess.trim()) uniqueProcs.add(r.parentProcess.trim());
    if (r.callingProcess && r.callingProcess.trim()) uniqueProcs.add(r.callingProcess.trim());
  });
  
  processSelect.innerHTML = '<option value="all">Tous les processus</option>' + 
    Array.from(uniqueProcs).sort().map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  if (Array.from(uniqueProcs).includes(dashFilterProcess)) {
    processSelect.value = dashFilterProcess;
  } else {
    processSelect.value = 'all';
    dashFilterProcess = 'all';
  }
  
  // 2. Populate team dropdown
  const teams = getTeamTags();
  teamSelect.innerHTML = '<option value="all">Toutes les équipes</option>' + 
    teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  if (teams.includes(dashFilterTeam)) {
    teamSelect.value = dashFilterTeam;
  } else {
    teamSelect.value = 'all';
    dashFilterTeam = 'all';
  }
    
  // 3. Populate sensitivity dropdown
  const sensitivities = getSensitivityLevels();
  sensSelect.innerHTML = '<option value="all">Toutes les sensibilités</option>' + 
    sensitivities.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  if (sensitivities.includes(dashFilterSensitivity)) {
    sensSelect.value = dashFilterSensitivity;
  } else {
    sensSelect.value = 'all';
    dashFilterSensitivity = 'all';
  }
}

window.applyDashboardFilters = function() {
  const processSelect = document.getElementById('dashFilterProcess');
  const teamSelect = document.getElementById('dashFilterTeam');
  const sensSelect = document.getElementById('dashFilterSensitivity');
  
  if (processSelect) dashFilterProcess = processSelect.value;
  if (teamSelect) dashFilterTeam = teamSelect.value;
  if (sensSelect) dashFilterSensitivity = sensSelect.value;
  
  renderDashboard();
}

window.resetDashboardFilters = function() {
  dashFilterProcess = 'all';
  dashFilterTeam = 'all';
  dashFilterSensitivity = 'all';
  
  const processSelect = document.getElementById('dashFilterProcess');
  const teamSelect = document.getElementById('dashFilterTeam');
  const sensSelect = document.getElementById('dashFilterSensitivity');
  
  if (processSelect) processSelect.value = 'all';
  if (teamSelect) teamSelect.value = 'all';
  if (sensSelect) sensSelect.value = 'all';
}

// ---------- UI Rendering - Dashboard Charts ----------
function renderDashboard(){
  const totalRowsCount = allRows.length;
  if(!totalRowsCount) return;

  // Refresh filter dropdown options
  populateDashboardFilters();

  // Filter rows
  const filtered = allRows.filter(r => {
    if (dashFilterProcess !== 'all') {
      const matchParent = r.parentProcess && r.parentProcess.trim() === dashFilterProcess;
      const matchCalling = r.callingProcess && r.callingProcess.trim() === dashFilterProcess;
      if (!matchParent && !matchCalling) return false;
    }
    if (dashFilterTeam !== 'all') {
      if ((r.team || 'Non assignée') !== dashFilterTeam) return false;
    }
    if (dashFilterSensitivity !== 'all') {
      if ((r.sensitivity || 'Public') !== dashFilterSensitivity) return false;
    }
    return true;
  });

  const total = filtered.length;
  const valid = filtered.filter(r=>r.status==='valid').length;
  const invalid = filtered.filter(r=>r.status==='invalid').length;
  const warn = filtered.filter(r=>r.status==='warn').length;
  const score = Math.round((valid/total)*100)||0;

  // Compute KPIs
  // KPI 1: Compliance score
  const scoreElVal = document.getElementById('kpi-score-val');
  const scoreElStatus = document.getElementById('kpi-score-status');
  if (scoreElVal && scoreElStatus) {
    scoreElVal.textContent = `${score}%`;
    let statusText = 'Critique';
    let statusColor = 'var(--err-dark)';
    if (score >= 90) { statusText = 'Excellent'; statusColor = 'var(--ok-dark)'; }
    else if (score >= 70) { statusText = 'Moyen'; statusColor = 'var(--warn-dark)'; }
    scoreElStatus.textContent = statusText;
    scoreElStatus.style.color = statusColor;
  }



  // KPI 3: Governance coverage rate
  const coveredCount = filtered.filter(r => r.team && r.team !== 'Non assignée').length;
  const coverageRate = total > 0 ? Math.round((coveredCount / total) * 100) : 0;
  const covElVal = document.getElementById('kpi-coverage-val');
  const covElStatus = document.getElementById('kpi-coverage-status');
  if (covElVal && covElStatus) {
    covElVal.textContent = `${coverageRate}%`;
    let statusText = 'Insuffisante';
    let statusColor = 'var(--err-dark)';
    if (coverageRate >= 80) { statusText = 'Excellente'; statusColor = 'var(--ok-dark)'; }
    else if (coverageRate >= 50) { statusText = 'Partielle'; statusColor = 'var(--warn-dark)'; }
    covElStatus.textContent = statusText;
    covElStatus.style.color = statusColor;
  }

  // KPI 4: Average character length
  const avgLen = total > 0 ? (filtered.reduce((sum, r) => sum + r.name.length, 0) / total).toFixed(1) : 0;
  const lenElVal = document.getElementById('kpi-length-val');
  const lenElStatus = document.getElementById('kpi-length-status');
  if (lenElVal && lenElStatus) {
    lenElVal.textContent = `${avgLen} car.`;
    let statusText = 'Trop long';
    let statusColor = 'var(--warn-dark)';
    if (avgLen <= 15) { statusText = 'Très concis'; statusColor = 'var(--ok-dark)'; }
    else if (avgLen <= 25) { statusText = 'Standard'; statusColor = 'var(--info-dark)'; }
    lenElStatus.textContent = statusText;
    lenElStatus.style.color = statusColor;
  }

  Chart.defaults.font.family = "var(--font-sans)";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  const ctxDonut = document.getElementById('donutChart').getContext('2d');
  if(donutChart) donutChart.destroy();
  donutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
      labels: ['Conformes', 'Avertissements', 'Non conformes'],
      datasets: [{
        data: [valid, warn, invalid],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }
      }
    }
  });

  const freq={};
  filtered.forEach(r=>r.issues.forEach(i=>{freq[i.msg]=(freq[i.msg]||0)+1}));
  const topIssues=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,7);
  
  const ctxBar = document.getElementById('barChart').getContext('2d');
  if(barChart) barChart.destroy();
  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: topIssues.length ? topIssues.map(i => i[0].length > 30 ? i[0].substring(0,27)+'...' : i[0]) : ['Aucun problème'],
      datasets: [{
        label: 'Occurrences',
        data: topIssues.length ? topIssues.map(i => i[1]) : [0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
    }
  });

  const buckets=[0,0,0,0,0,0,0,0,0,0];
  filtered.forEach(r=>{const b=Math.min(9,Math.floor(r.name.length/3));buckets[b]++});
  const ctxLine = document.getElementById('lineChart').getContext('2d');
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: ['1-3', '4-6', '7-9', '10-12', '13-15', '16-18', '19-21', '22-24', '25-27', '28+'],
      datasets: [{
        label: 'Nombre de variables',
        data: buckets,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
    }
  });

  const ctxHist = document.getElementById('historyChart').getContext('2d');
  if(historyChart) historyChart.destroy();
  const histScores = analysisHistory.slice().reverse().map(h => Math.round((h.valid/h.count)*100) || 0);
  const histLabels = analysisHistory.slice().reverse().map(h => new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
  
  historyChart = new Chart(ctxHist, {
    type: 'line',
    data: {
      labels: histLabels.length ? histLabels : ['Maintenant'],
      datasets: [{
        label: 'Score de conformité (%)',
        data: histScores.length ? histScores : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score (%)' } }, x: { grid: { display: false } } }
    }
  });

  const sensCounts = {};
  getSensitivityLevels().forEach(lvl => { sensCounts[lvl] = 0; });
  filtered.forEach(r => {
    const s = r.sensitivity || 'Public';
    sensCounts[s] = (sensCounts[s] || 0) + 1;
  });
  
  const ctxSens = document.getElementById('sensitivityChart').getContext('2d');
  if(sensitivityChart) sensitivityChart.destroy();
  sensitivityChart = new Chart(ctxSens, {
    type: 'doughnut',
    data: {
      labels: Object.keys(sensCounts),
      datasets: [{
        data: Object.values(sensCounts),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }
      }
    }
  });

  const teamCounts = {};
  getTeamTags().forEach(t => { teamCounts[t] = 0; });
  filtered.forEach(r => {
    const t = r.team || 'Non assignée';
    teamCounts[t] = (teamCounts[t] || 0) + 1;
  });

  const ctxTeam = document.getElementById('teamChart').getContext('2d');
  if(teamChart) teamChart.destroy();
  teamChart = new Chart(ctxTeam, {
    type: 'bar',
    data: {
      labels: Object.keys(teamCounts),
      datasets: [{
        label: 'Variables',
        data: Object.values(teamCounts),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ---------- UI Rendering - Relation Graph ----------
function initGraphFilters() {
  const pSet = new Set();
  const vSet = new Set();
  allRows.forEach(r => {
     if(r.parentProcess && r.parentProcess.trim()) pSet.add(r.parentProcess.trim());
     if(r.callingProcess && r.callingProcess.trim()) pSet.add(r.callingProcess.trim());
     if(r.name && r.name.trim()) vSet.add(r.name.trim());
  });

  const pList = document.getElementById('procList');
  const vList = document.getElementById('varList');

  if(pList) {
    pList.innerHTML = Array.from(pSet).sort().map((p, i) => `
      <div class="searchable-list-item" data-value="${esc(p)}">
        <input type="checkbox" id="chk_p_${i}" value="${esc(p)}">
        <label for="chk_p_${i}" title="${esc(p)}">${esc(p)}</label>
      </div>
    `).join('');
  }

  if(vList) {
    vList.innerHTML = Array.from(vSet).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((v, i) => `
      <div class="searchable-list-item" data-value="${esc(v)}">
        <input type="checkbox" id="chk_v_${i}" value="${esc(v)}">
        <label for="chk_v_${i}" title="${esc(v)}">${esc(v)}</label>
      </div>
    `).join('');
  }

  // Vider les champs de recherche
  document.getElementById('searchProcInput').value = '';
  document.getElementById('searchVarInput').value = '';
}

function filterCheckboxes(listId, searchText) {
  const query = searchText.toLowerCase();
  const list = document.getElementById(listId);
  if (!list) return;

  const items = list.querySelectorAll('.searchable-list-item');
  items.forEach(item => {
    const val = item.getAttribute('data-value').toLowerCase();
    if (val.includes(query)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function resetGraphFilters() {
  document.querySelectorAll('#procList input[type="checkbox"], #varList input[type="checkbox"]').forEach(c => c.checked = false);
  document.getElementById('searchProcInput').value = '';
  document.getElementById('searchVarInput').value = '';
  filterCheckboxes('procList', '');
  filterCheckboxes('varList', '');

  const chk = document.getElementById('graphNonConformOnly');
  if(chk) chk.checked = false;

  renderGraph();
}

function getSelectedCheckboxValues(listId) {
  const list = document.getElementById(listId);
  if (!list) return [];
  const checked = list.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checked).map(c => c.value);
}

function renderGraph(){
  if (!window.vis) return;
  const container = document.getElementById('networkGraph');
  if (!container) return;

  const procFilters = getSelectedCheckboxValues('procList');
  const varFilters = getSelectedCheckboxValues('varList');
  const nonConformOnly = document.getElementById('graphNonConformOnly')?.checked || false;

  const isLight = document.body.className === 'theme-clair';
  const isCyber = document.body.className === 'theme-cyber';
  const nodeTextColor = isLight ? '#0f172a' : isCyber ? '#00ffcc' : '#f8fafc';
  const edgeLineColor = isLight ? 'rgba(0, 0, 0, 0.15)' : isCyber ? 'rgba(0, 255, 204, 0.25)' : '#cbd5e1';

  const nodesMap = new Map();
  const edges = [];

  allRows.forEach(r => {
    if (nonConformOnly && r.status === 'valid') return;

    let processes = [];
    if(r.parentProcess && r.parentProcess.trim()) processes.push({name: r.parentProcess.trim(), type: 'parent'});
    if(r.callingProcess && r.callingProcess.trim()) processes.push({name: r.callingProcess.trim(), type: 'appelant'});

    if(processes.length === 0) return;

    const vName = (r.name || '').trim();

    // Filtres OR inclusifs : si aucun filtre n'est coché, on affiche tout.
    // Si au moins un filtre est coché, la ligne doit satisfaire le filtre
    if(varFilters.length > 0 && !varFilters.includes(vName)) return;
    if(procFilters.length > 0 && !processes.some(p => procFilters.includes(p.name))) return;

    const vId = 'var_' + vName;

    if (!nodesMap.has(vId)) {
      let varColor = r.status === 'valid' ? '#10b981' : (r.status === 'warn' ? '#f59e0b' : '#ef4444');
      nodesMap.set(vId, {
        id: vId,
        label: vName,
        group: 'variable',
        shape: 'dot',
        size: 14,
        color: { background: varColor, border: '#ffffff', borderWidth: 2 },
        font: { size: 12, color: nodeTextColor, face: 'var(--font-mono)' }
      });
    }

    processes.forEach(p => {
      const pId = 'proc_' + p.name;
      if (!nodesMap.has(pId)) {
        nodesMap.set(pId, {
          id: pId,
          label: p.name,
          group: 'process',
          shape: 'box',
          color: { background: '#004F9F', border: '#004F9F', highlight: { background: '#0088c4', border: '#0088c4' } },
          font: { color: 'white', size: 14, face: 'var(--font-sans)', weight: '500' },
          borderWidth: 2,
          borderWidthSelected: 3
        });
      }

      edges.push({
        from: pId,
        to: vId,
        label: p.type === 'appelant' ? 'Appelant' : '',
        font: { size: 10, align: 'middle', color: '#64748b' },
        dashes: p.type === 'appelant',
        color: { color: edgeLineColor, highlight: '#3b82f6' }
      });
    });
  });

  const nodes = Array.from(nodesMap.values());

  if (nodes.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:4rem; height: 100%; display: flex; flex-direction: column; justify-content: center;"><div class="empty-icon">⚯</div>Aucune donnée à afficher (ou exclue par les filtres).</div>';
    return;
  }

  const uniqueEdges = [];
  const edgeSet = new Set();
  edges.forEach(e => {
    const key = e.from + '_' + e.to + '_' + e.label;
    if(!edgeSet.has(key)) { edgeSet.add(key); uniqueEdges.push(e); }
  });

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(uniqueEdges) };

  const options = {
    physics: {
      stabilization: { iterations: 150 },
      barnesHut: { gravitationalConstant: -4000, springLength: 150, springConstant: 0.04 }
    },
    edges: {
      smooth: { type: 'continuous' },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } }
    },
    interaction: { hover: true, tooltipDelay: 200, zoomView: true }
  };

  container.innerHTML = '';
  const network = new vis.Network(container, data, options);

  network.on("stabilizationIterationsDone", function () {
    network.setOptions( { physics: false } );
  });
}

// ---------- UI Rendering - History ----------
function renderHistory(){
  const el=document.getElementById('historyList');
  if(!analysisHistory.length){
    el.innerHTML='<div class="empty-state" style="padding:2rem"><div class="empty-icon">◷</div>Aucune analyse enregistrée</div>';
    document.getElementById('histTab').innerHTML = `Historique`;
    return;
  }

  document.getElementById('histTab').innerHTML = `Historique (${analysisHistory.length})`;

  el.innerHTML=analysisHistory.map(h=>{
    const score = Math.round(h.valid/h.count*100) || 0;
    return `
    <div class="hist-item">
      <div>
        <div style="font-size:13px;font-weight:500">${esc(h.label)}</div>
        <div class="hist-date">${new Date(h.date).toLocaleString()} — ${h.count} variables, ${h.valid} conformes</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="badge ${score>=90?'ok':score>=70?'warn':'err'}">${score}%</span>
        <button class="btn-ghost" style="padding:4px 8px; font-size:11px" onclick="loadHistoryItem(${h.id})">Ouvrir</button>
        <button class="btn-ghost" style="padding:4px 8px; font-size:11px; color:var(--err); border-color:var(--err-light)" onclick="deleteHistoryItem(${h.id})">Suppr.</button>
      </div>
    </div>
  `}).join('');
}

function loadHistoryItem(id) {
  const item = analysisHistory.find(h => h.id === id);
  if (!item) return;

  activeHistoryId = item.id;
  allRows = JSON.parse(JSON.stringify(item.allRows)).map(r => {
    if (!r.hasOwnProperty('sensitivity')) r.sensitivity = 'Public';
    if (!r.hasOwnProperty('team')) r.team = 'Non assignée';
    return r;
  });

  isBPMNMode = !!item.isBPMNMode;
  bpmnFileName = item.bpmnFileName || "";
  if (isBPMNMode && item.bpmnXmlText) {
    const parser = new DOMParser();
    bpmnXmlDoc = parser.parseFromString(item.bpmnXmlText, "application/xml");
  } else {
    bpmnXmlDoc = null;
  }

  currentFilter='all';searchVal='';currentSort={key:'status',dir:1};currentPage=1;
  document.getElementById('resultsTab').style.display='';
  document.getElementById('dashTab').style.display='';
  document.getElementById('graphTab').style.display='';
  document.getElementById('rankTab').style.display='';
  document.getElementById('resetBtn').style.display='';

  const bpmnBtn = document.getElementById('downloadBpmnBtn');
  if (bpmnBtn) bpmnBtn.style.display = isBPMNMode ? 'inline-block' : 'none';

  initGraphFilters();
  resetDashboardFilters();
  switchTab('results');
  renderResults();
  renderDashboard();
  renderGraph();
  renderRanking();
}

async function deleteHistoryItem(id) {
  if(!confirm("Êtes-vous sûr de vouloir supprimer cet historique ?")) return;
  try {
    await dbDelete(id);
    analysisHistory = analysisHistory.filter(h => h.id !== id);
    renderHistory();
  } catch(e) { console.error("Erreur suppression DB", e); }
}

async function clearHistory() {
  if(!confirm("Êtes-vous sûr de vouloir vider TOUT l'historique ?")) return;
  try {
    await dbClear();
    analysisHistory = [];
    renderHistory();
  } catch(e) { console.error("Erreur de vidage DB", e); }
}

async function exportHistoryToFile() {
  if(!analysisHistory.length) { alert("L'historique est vide."); return; }
  const dataStr = JSON.stringify(analysisHistory, null, 4);
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'historique_audits.json',
        types: [{ description: 'Fichier d\'historique JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      alert("L'historique a été sauvegardé avec succès !");
    } else {
      dl(dataStr, 'historique_audits.json', 'application/json');
    }
  } catch (err) { console.warn("Sauvegarde annulée ou échouée.", err); }
}

// ---------- UI Rendering - Configuration ----------
function renderRules(){
  document.getElementById('rulesGrid').innerHTML=rules.map((r,i)=>`
    <div class="conf-item">
      <input type="checkbox" id="rule_${i}" ${r.enabled?'checked':''} onchange="toggleRule(${i})">
      <label for="rule_${i}">${esc(r.label)}<small>${esc(r.desc)}</small></label>
    </div>
  `).join('');
}

// ---------- Tab & UI State management ----------
function switchTab(name){
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.remove('active');
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${name}'`)) {
      t.classList.add('active');
    }
  });
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const panel = document.getElementById('panel-'+name);
  if(panel) panel.classList.add('active');

  // Gérer l'état actif du menu latéral pour le guide d'utilisation
  if (name === 'guide') {
    document.querySelectorAll('.menu-header').forEach(h => {
      if (h.id === 'btn-mod-guide') {
        h.classList.add('active');
      } else if (!h.closest('#group-guide')) {
        h.classList.remove('active');
      }
    });
  } else {
    const guideHeader = document.getElementById('btn-mod-guide');
    if (guideHeader) guideHeader.classList.remove('active');
  }

  // Mise à jour dynamique du titre dans l'en-tête principal
  const titles = {
    'import': 'Importation des données',
    'config': 'Configuration des règles',
    'results': 'Résultats de l\'audit',
    'dashboard': 'Tableau de bord',
    'graph': 'Schéma des relations',
    'ranking': 'Classement d\'utilisation',
    'history': 'Historique des audits',
    'sub-import': 'Importation des Sous-processus',
    'sub-analysis': 'Analyse d\'Impact des Sous-processus',
    'sub-map': 'Cartographie des Call Activities',
    'bpmn-naming-import': 'Importation du BPMN (Nommage)',
    'bpmn-naming-config': 'Configuration des Règles de Nommage',
    'bpmn-naming-results': 'Rapport d\'Audit de Nommage BPMN',
    'pmg-import': 'Importation du BPMN (PMG)',
    'pmg-dashboard': 'Étude & Gouvernance PMG',
    'pmg-matrix': 'Matrice des Activités PMG',
    'roi-calculator': 'Calculateur de ROI & Gain de Temps',
    'roi-config': 'Configuration du Calculateur ROI',
    'guide': 'Guide d\'utilisation'
  };
  const pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl && titles[name]) {
    pageTitleEl.textContent = titles[name];
  }
}

function populateMappingDropdowns(){
  const selects = [
    document.getElementById('colVariable'),
    document.getElementById('colParentProcess'),
    document.getElementById('colCallingProcess')
  ];

  selects.forEach(sel => {
    const defOpt = sel.querySelector('option[value="-1"]');
    sel.innerHTML = defOpt ? '<option value="-1">-- Non défini --</option>' : '';

    fileHeaders.forEach((header, index) => {
       const opt = document.createElement('option');
       opt.value = index;
       opt.textContent = `${header} (Col ${index})`;
       sel.appendChild(opt);
    });
  });

  const varLower = fileHeaders.map(h => String(h).toLowerCase());

  const varIdx = varLower.findIndex(h => h.includes('variable') || h.includes('nom'));
  if(varIdx >= 0) document.getElementById('colVariable').value = varIdx;
  else if(fileHeaders.length > 0) document.getElementById('colVariable').value = 0;

  const parentIdx = varLower.findIndex(h => h.includes('parent') || h.includes('processus') || h.includes('process'));
  if(parentIdx >= 0) document.getElementById('colParentProcess').value = parentIdx;

  const callIdx = varLower.findIndex(h => h.includes('appelant') || h.includes('caller'));
  if(callIdx >= 0) document.getElementById('colCallingProcess').value = callIdx;

  updatePreview();
}

function updatePreview(){
  if(!rawFileData.length) return;
  const colVarIdx = parseInt(document.getElementById('colVariable').value, 10);
  const colParentIdx = parseInt(document.getElementById('colParentProcess').value, 10);
  const colCallIdx = parseInt(document.getElementById('colCallingProcess').value, 10);

  let previewHTML = '';
  let validCount = 0;
  const maxPreview = 5;

  for(let i=0; i<rawFileData.length; i++){
    if(validCount >= maxPreview) break;
    const row = rawFileData[i];
    const varName = row[colVarIdx];
    if(varName) {
      let details = [];
      if(colParentIdx >= 0 && row[colParentIdx]) details.push(`Parent: ${row[colParentIdx]}`);
      if(colCallIdx >= 0 && row[colCallIdx]) details.push(`Appelant: ${row[colCallIdx]}`);

      previewHTML += `<div style="margin-bottom:4px"><strong style="color:var(--brand-primary)">${esc(varName)}</strong> <span style="color:var(--text-tertiary);font-size:10px">${details.join(' | ')}</span></div>`;
      validCount++;
    }
  }

  const totalVars = rawFileData.filter(r => r[colVarIdx] && String(r[colVarIdx]).trim() !== '').length;

  document.getElementById('previewBox').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucune donnée à afficher avec ce mappage...</span>';
  document.getElementById('colHint').textContent = `Mappage configuré.`;
  document.getElementById('countHint').textContent = `${totalVars} variables détectées`;
}

function handleFiles(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean);
  if (!selectedFiles.length) return;
  const hasBpmn = selectedFiles.some(f => /\.(bpmn|xml)$/i.test(f.name));
  if (hasBpmn) {
    const invalid = selectedFiles.filter(f => !/\.(bpmn|xml)$/i.test(f.name));
    if (invalid.length) { alert("Pour un import multiple, sélectionnez uniquement des fichiers .bpmn ou .xml."); return; }
    return handleBPMNFiles(selectedFiles);
  }
  return handleFile(selectedFiles[0]);
}

function handleSubprocessFiles(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean);
  if (!selectedFiles.length) return;
  const hasBpmn = selectedFiles.some(f => /\.(bpmn|xml)$/i.test(f.name));
  if (hasBpmn) {
    const invalid = selectedFiles.filter(f => !/\.(bpmn|xml)$/i.test(f.name));
    if (invalid.length) { alert("Pour un import multiple, sélectionnez uniquement des fichiers .bpmn ou .xml."); return; }
    return handleBPMNSubprocessFiles(selectedFiles);
  }
  return handleSubprocessFile(selectedFiles[0]);
}

function handleFile(file){
  if(!file)return;
  const name = file.name.toLowerCase();
  if (name.endsWith('.bpmn') || name.endsWith('.xml')) {
    handleBPMNFile(file);
  } else {
    handleExcelCSVFile(file);
  }
}

function handleExcelCSVFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    rawFileData = [];
    fileHeaders = [];

    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(ws,{header:1,defval:''});

    if(sheetData.length > 0){
       fileHeaders = sheetData[0].map((h, i) => h ? String(h).trim() : `Colonne ${i}`);
       if(fileHeaders.filter(h => !h.startsWith('Colonne')).length === 0){
          fileHeaders = sheetData[0].map((_, i) => `Colonne ${i}`);
          rawFileData = sheetData;
       } else {
          rawFileData = sheetData.slice(1);
       }
    }

    isBPMNMode = false;
    bpmnRows = [];
    bpmnXmlDoc = null;
    bpmnFileName = "";
    const bpmnBtn = document.getElementById('downloadBpmnBtn');
    if (bpmnBtn) bpmnBtn.style.display = 'none';

    document.getElementById('uploadTitle').textContent=file.name;
    document.getElementById('uploadSub').textContent='Données chargées, veuillez vérifier le mappage';
    document.getElementById('manualInput').value='';

    document.getElementById('mappingSection').style.display='block';

    populateMappingDropdowns();
  };
  reader.readAsArrayBuffer(file);
}

function handleBPMNFile(file) {
  return handleBPMNFiles([file]);
}

async function handleBPMNFiles(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean);
  if (!selectedFiles.length) return;

  bpmnFiles = [];
  bpmnRows = [];
  bpmnXmlDoc = null;
  bpmnFileName = "";
  isBPMNMode = true;
  rawFileData = [];
  fileHeaders = [];

  const errors = [];
  for (const file of selectedFiles) {
    try {
      const xmlText = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) throw new Error(parserError.textContent || 'XML invalide');
      const rows = extractBPMNVariables(xmlDoc).map(row => ({ ...row, sourceFile: file.name }));
      bpmnFiles.push({ name: file.name, doc: xmlDoc, rows });
      bpmnRows.push(...rows);
    } catch (err) {
      console.error(`Erreur de lecture BPMN (${file.name})`, err);
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  if (!bpmnFiles.length) {
    isBPMNMode = false;
    alert("Aucun fichier BPMN valide n'a pu être importé.");
    return;
  }

  bpmnXmlDoc = bpmnFiles[0].doc;
  bpmnFileName = bpmnFiles.length === 1 ? bpmnFiles[0].name : `${bpmnFiles.length} fichiers BPMN`;
  const uploadTitle = document.getElementById('uploadTitle');
  const uploadSub = document.getElementById('uploadSub');
  const countHint = document.getElementById('countHint');
  if (uploadTitle) uploadTitle.textContent = bpmnFiles.length === 1 ? bpmnFiles[0].name : `${bpmnFiles.length} fichiers BPMN sélectionnés`;
  if (uploadSub) uploadSub.textContent = `${bpmnFiles.length} fichier${bpmnFiles.length > 1 ? 's' : ''} BPMN chargé${bpmnFiles.length > 1 ? 's' : ''} — ${bpmnRows.length} variables détectées`;
  document.getElementById('manualInput').value = '';
  document.getElementById('mappingSection').style.display = 'none';
  if (countHint) countHint.textContent = `${bpmnFiles.length} BPMN · ${bpmnRows.length} variables détectées`;
  updateBPMNPreview();
  if (errors.length) alert(`Certains fichiers n'ont pas pu être importés :\n\n${errors.join('\n')}`);
}

function updateBPMNPreview(){
  let previewHTML = '';
  const maxPreview = 5;
  const count = Math.min(bpmnRows.length, maxPreview);
  
  for(let i=0; i<count; i++){
    const r = bpmnRows[i];
    let details = [];
    if(r.parentProcess) details.push(`Proc: ${r.parentProcess}`);
    if(r.callingProcess) details.push(`Elément: ${r.callingProcess}`);
    if(r.sourceFile) details.push(`Fichier: ${r.sourceFile}`);
    previewHTML += `<div style="margin-bottom:4px"><strong style="color:var(--brand-primary)">${esc(r.name)}</strong> <span style="color:var(--text-tertiary);font-size:10px">${details.join(' | ')}</span></div>`;
  }
  
  document.getElementById('previewBox').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucune variable trouvée dans le BPMN...</span>';
}

function extractBPMNVariables(xmlDoc) {
  const rows = [];
  
  function getParentProcessInfo(node) {
    let parent = node.parentNode;
    while (parent) {
      const ln = parent.localName ? parent.localName.toLowerCase() : '';
      if (ln === 'process') {
        const id = parent.getAttribute('id') || '';
        const name = parent.getAttribute('name') || '';
        return name ? `${name} (${id})` : id;
      }
      parent = parent.parentNode;
    }
    return 'Processus inconnu';
  }
  
  function getTaskInfo(node) {
    let parent = node.parentNode;
    while (parent) {
      const ln = parent.localName ? parent.localName.toLowerCase() : '';
      if (['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent'].includes(ln)) {
        const id = parent.getAttribute('id') || '';
        const name = parent.getAttribute('name') || '';
        const typeLabel = parent.localName;
        return name ? `${typeLabel}: ${name} (${id})` : `${typeLabel}: ${id}`;
      }
      parent = parent.parentNode;
    }
    return '';
  }

  const IGNORED_IDENTIFIERS = new Set([
    'if', 'then', 'else', 'true', 'false', 'null', 'and', 'or', 'not', 'for', 'in', 'return', 
    'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 
    'append', 'insert', 'sublist', 'contains', 'string', 'number', 'boolean', 'date', 'time', 
    'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds'
  ]);

  function extractVarsFromExpr(expr) {
    if (!expr) return [];
    let cleanExpr = expr.trim();
    if (cleanExpr.startsWith('=')) {
      cleanExpr = cleanExpr.substring(1);
    } else {
      const juelMatch = cleanExpr.match(/\${([^}]+)}/);
      if (juelMatch) {
        cleanExpr = juelMatch[1];
      }
    }
    cleanExpr = cleanExpr.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '')
                         .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, '');
    
    const matches = cleanExpr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (!matches) return [];
    
    return Array.from(new Set(matches)).filter(w => !IGNORED_IDENTIFIERS.has(w.toLowerCase()));
  }

  const allElements = xmlDoc.getElementsByTagName('*');
  let rowId = 1;

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const localName = el.localName ? el.localName.toLowerCase() : '';
    
    if (localName === 'property') {
      const nameAttr = el.getAttribute('name') || el.getAttribute('key') || '';
      const valueAttr = el.getAttribute('value') || '';
      
      const parentProcess = getParentProcessInfo(el);
      const callingProcess = getTaskInfo(el) || 'Propriété';
      
      if (nameAttr) {
        rows.push({
          name: nameAttr,
          parentProcess,
          callingProcess,
          row: rowId++,
          bpmnMeta: {
            node: el,
            attr: el.hasAttribute('name') ? 'name' : 'key',
            originalValue: nameAttr,
            type: 'attribute'
          }
        });
      }
      
      if (valueAttr) {
        const vars = extractVarsFromExpr(valueAttr);
        vars.forEach(v => {
          rows.push({
            name: v,
            parentProcess,
            callingProcess: `${callingProcess} (Valeur Propriété)`,
            row: rowId++,
            bpmnMeta: {
              node: el,
              attr: 'value',
              originalValue: valueAttr,
              type: 'expression'
            }
          });
        });
      }
    }

    if (localName === 'input' || localName === 'output') {
      const sourceAttr = el.getAttribute('source');
      const targetAttr = el.getAttribute('target');
      
      const parentProcess = getParentProcessInfo(el);
      const callingProcess = getTaskInfo(el) || 'Mappage I/O';

      if (targetAttr) {
        rows.push({
          name: targetAttr,
          parentProcess,
          callingProcess: `${callingProcess} (Mappage Target)`,
          row: rowId++,
          bpmnMeta: {
            node: el,
            attr: 'target',
            originalValue: targetAttr,
            type: 'attribute'
          }
        });
      }

      if (sourceAttr) {
        const vars = extractVarsFromExpr(sourceAttr);
        vars.forEach(v => {
          rows.push({
            name: v,
            parentProcess,
            callingProcess: `${callingProcess} (Mappage Source)`,
            row: rowId++,
            bpmnMeta: {
              node: el,
              attr: 'source',
              originalValue: sourceAttr,
              type: 'expression'
            }
          });
        });
      }
    }

    if (localName === 'inputparameter' || localName === 'outputparameter') {
      const nameAttr = el.getAttribute('name');
      const textContent = el.textContent || '';
      
      const parentProcess = getParentProcessInfo(el);
      const callingProcess = getTaskInfo(el) || 'Paramètre I/O';

      if (nameAttr) {
        rows.push({
          name: nameAttr,
          parentProcess,
          callingProcess: `${callingProcess} (Paramètre ${localName === 'inputparameter' ? 'Input' : 'Output'})`,
          row: rowId++,
          bpmnMeta: {
            node: el,
            attr: 'name',
            originalValue: nameAttr,
            type: 'attribute'
          }
        });
      }

      if (textContent.trim()) {
        const vars = extractVarsFromExpr(textContent);
        vars.forEach(v => {
          rows.push({
            name: v,
            parentProcess,
            callingProcess: `${callingProcess} (Expression Paramètre)`,
            row: rowId++,
            bpmnMeta: {
              node: el,
              attr: null,
              originalValue: textContent,
              type: 'expression'
            }
          });
        });
      }
    }

    if (localName === 'formfield') {
      const idAttr = el.getAttribute('id');
      const parentProcess = getParentProcessInfo(el);
      const callingProcess = getTaskInfo(el) || 'Champ Formulaire';

      if (idAttr) {
        rows.push({
          name: idAttr,
          parentProcess,
          callingProcess: `${callingProcess} (Form Field ID)`,
          row: rowId++,
          bpmnMeta: {
            node: el,
            attr: 'id',
            originalValue: idAttr,
            type: 'attribute'
          }
        });
      }
    }

    if (localName === 'conditionexpression') {
      const textContent = el.textContent || '';
      const parentProcess = getParentProcessInfo(el);
      const callingProcess = getTaskInfo(el) || 'Condition Transition';

      if (textContent.trim()) {
        const vars = extractVarsFromExpr(textContent);
        vars.forEach(v => {
          rows.push({
            name: v,
            parentProcess,
            callingProcess: `${callingProcess} (Expression Condition)`,
            row: rowId++,
            bpmnMeta: {
              node: el,
              attr: null,
              originalValue: textContent,
              type: 'expression'
            }
          });
        });
      }
    }
  }

  return rows;
}

async function downloadCorrectedBPMN() {
  if (!isBPMNMode || !bpmnFiles.length) {
    alert("Aucun fichier BPMN n'est actuellement chargé.");
    return;
  }

  const serializer = new XMLSerializer();
  const outputs = [];

  for (const bpmnFile of bpmnFiles) {
    const fileRows = allRows.filter(r => r.sourceFile === bpmnFile.name);
    if (!fileRows.length) continue;

    let tempIdCounter = 1;
    fileRows.forEach(r => {
      if (r.bpmnMeta && r.bpmnMeta.node && !r.bpmnMeta.node.hasAttribute('data-auditor-temp-id')) {
        r.bpmnMeta.node.setAttribute('data-auditor-temp-id', `id_${tempIdCounter++}`);
      }
    });

    const clonedDoc = bpmnFile.doc.cloneNode(true);
    const nameMap = new Map();
    fileRows.forEach(r => {
      if (r.status !== 'valid' && r.editedSuggestion && r.editedSuggestion.trim() !== r.name) {
        nameMap.set(r.name.trim(), r.editedSuggestion.trim());
      }
    });

    fileRows.forEach(r => {
      if (!r.bpmnMeta || !r.bpmnMeta.node) return;
      const tempId = r.bpmnMeta.node.getAttribute('data-auditor-temp-id');
      const clonedNode = clonedDoc.querySelector(`[data-auditor-temp-id="${tempId}"]`);
      if (!clonedNode) return;

      const { attr, type } = r.bpmnMeta;
      if (type === 'attribute') {
        const newName = nameMap.get(r.name);
        if (newName) clonedNode.setAttribute(attr, newName);
      } else if (type === 'expression') {
        let currentValue = attr ? clonedNode.getAttribute(attr) : clonedNode.textContent;
        if (currentValue) {
          let updatedValue = currentValue;
          nameMap.forEach((newValue, oldValue) => {
            const escapedOld = oldValue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            updatedValue = updatedValue.replace(new RegExp('\\b' + escapedOld + '\\b', 'g'), newValue);
          });
          if (attr) clonedNode.setAttribute(attr, updatedValue);
          else clonedNode.textContent = updatedValue;
        }
      }
    });

    fileRows.forEach(r => {
      if (r.bpmnMeta && r.bpmnMeta.node) r.bpmnMeta.node.removeAttribute('data-auditor-temp-id');
    });
    clonedDoc.querySelectorAll('[data-auditor-temp-id]').forEach(n => n.removeAttribute('data-auditor-temp-id'));

    const updatedXmlText = serializer.serializeToString(clonedDoc);
    const correctedFileName = bpmnFile.name
      .replace(/\.bpmn$/i, '_corrected.bpmn')
      .replace(/\.xml$/i, '_corrected.xml');
    outputs.push({ name: correctedFileName, content: updatedXmlText });
  }

  if (!outputs.length) {
    alert("Aucun BPMN corrigé à exporter.");
    return;
  }

  if (outputs.length === 1 || !window.JSZip) {
    outputs.forEach((item, index) => {
      setTimeout(() => dl(item.content, item.name, 'application/xml'), index * 150);
    });
    if (outputs.length > 1 && !window.JSZip) {
      alert("Les fichiers corrigés seront téléchargés séparément (JSZip n'est pas disponible).");
    }
    return;
  }

  const zip = new JSZip();
  outputs.forEach(item => zip.file(item.name, item.content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bpmn_variables_corrected.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function loadDemo(){
  document.getElementById('manualInput').value='';
  rawFileData = [
    ["customer_name", "OrderProcess", ""],
    ["Invoice Amount", "InvoiceProcess", "OrderProcess"],
    ["2ndStep", "InvoiceProcess", ""],
    ["MonVariable", "PaymentProcess", "InvoiceProcess"],
    ["orderId", "OrderProcess", ""],
    ["prénom_client", "OrderProcess", ""],
    ["processInstanceKey", "PaymentProcess", ""],
    ["order_status", "OrderProcess", ""],
    ["IS_ACTIVE", "ShippingProcess", "OrderProcess"],
    ["createdAt", "ShippingProcess", ""]
  ];
  fileHeaders = ["Variable", "Processus Parent", "Processus Appelant"];

  document.getElementById('mappingSection').style.display='block';
  setTimeout(() => {
    populateMappingDropdowns();
    document.getElementById('colVariable').value = "0";
    document.getElementById('colParentProcess').value = "1";
    document.getElementById('colCallingProcess').value = "2";
    updatePreview();
  }, 100);

  document.getElementById('uploadTitle').textContent="demo_data.xlsx";
  document.getElementById('uploadSub').textContent="Données de démonstration chargées";
  document.getElementById('countHint').textContent='10 variables de démonstration';
}

function resetAll(){
  allRows=[];fileRows=null;rawFileData=[];currentFilter='all';searchVal='';currentPage=1;
  isBPMNMode = false;
  bpmnRows = [];
  bpmnXmlDoc = null;
  bpmnFileName = "";
  bpmnFiles = [];
  const bpmnBtn = document.getElementById('downloadBpmnBtn');
  if (bpmnBtn) bpmnBtn.style.display = 'none';

  document.getElementById('manualInput').value='';
  document.getElementById('uploadTitle').textContent='Déposer un fichier Excel, CSV ou BPMN';
  document.getElementById('uploadSub').textContent='Formats acceptés : .xlsx, .xls, .csv, .bpmn — glissez ou cliquez';
  document.getElementById('previewBox').innerHTML='<span style="color:var(--text-tertiary)">L\'aperçu apparaîtra ici après import d\'un fichier...</span>';
  document.getElementById('countHint').textContent='';
  document.getElementById('mappingSection').style.display='none';
  document.getElementById('resultsTab').style.display='none';
  document.getElementById('dashTab').style.display='none';
  document.getElementById('graphTab').style.display='none';
  document.getElementById('rankTab').style.display='none';
  document.getElementById('resetBtn').style.display='none';

  // Clear ranking filters
  const rankSearch = document.getElementById('rankingSearchInput');
  if (rankSearch) rankSearch.value = '';
  const rankStatus = document.getElementById('rankingStatusFilter');
  if (rankStatus) rankStatus.value = 'all';
  const rankSort = document.getElementById('rankingSortSel');
  if (rankSort) rankSort.value = 'rank';
  const rankLimit = document.getElementById('rankingLimitSel');
  if (rankLimit) rankLimit.value = '50';
  
  currentRankingSearch = '';
  currentRankingStatus = 'all';
  currentRankingSort = 'rank';
  currentRankingLimit = '50';

  if (rankingChart) {
    rankingChart.destroy();
    rankingChart = null;
  }
  if (sensitivityChart) {
    sensitivityChart.destroy();
    sensitivityChart = null;
  }
  if (teamChart) {
    teamChart.destroy();
    teamChart = null;
  }
  activeHistoryId = null;

  const pList = document.getElementById('procList');
  if(pList) pList.innerHTML = '';
  const vList = document.getElementById('varList');
  if(vList) vList.innerHTML = '';
  const chk = document.getElementById('graphNonConformOnly');
  if(chk) chk.checked = false;

  const graphContainer = document.getElementById('networkGraph');
  if(graphContainer) graphContainer.innerHTML = '';
  switchTab('import');
}

// ---------- Exporters ----------
function exportCSV(){
  const header='Fichier source,Variable originale,Statut,Problèmes,Suggestion,Sensibilité,Équipe Propriétaire,Processus Parent,Processus Appelant\n';
  const body=allRows.map(r=>[
    qq(r.sourceFile || ''),
    qq(r.name),
    qq(r.status==='valid'?'Conforme':r.status==='warn'?'Avertissement':'Non conforme'),
    qq(r.issues.map(i=>i.msg).join('; ')),
    qq(r.editedSuggestion||''),
    qq(r.sensitivity||'Public'),
    qq(r.team||'Non assignée'),
    qq(r.parentProcess||''),
    qq(r.callingProcess||'')
  ].join(',')).join('\n');
  dl(header+body,'camunda_variables_rapport.csv','text/csv');
}

function exportExcel(){
  if(!window.XLSX){alert('Bibliothèque XLSX non chargée');return}
  const data=[['Fichier source','Variable originale','Statut','Problèmes','Suggestion','Sensibilité','Équipe Propriétaire','Processus Parent','Processus Appelant']];
  allRows.forEach(r=>data.push([
    r.sourceFile || '',
    r.name,
    r.status==='valid'?'Conforme':r.status==='warn'?'Avertissement':'Non conforme',
    r.issues.map(i=>i.msg).join('; '),
    r.editedSuggestion||'',
    r.sensitivity||'Public',
    r.team||'Non assignée',
    r.parentProcess||'',
    r.callingProcess||''
  ]));
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:30},{wch:25},{wch:12},{wch:45},{wch:20},{wch:18},{wch:18},{wch:20},{wch:20}];
  XLSX.utils.book_append_sheet(wb,ws,'Rapport');
  XLSX.writeFile(wb,'camunda_variables_rapport.xlsx');
}

// ---------- Classement d'utilisation des variables ----------
function computeRankingData() {
  const map = new Map();
  
  allRows.forEach(r => {
    const key = r.name;
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        count: 0,
        status: r.status,
        processes: new Set(),
        suggested: r.suggested,
        editedSuggestion: r.editedSuggestion
      });
    }
    const entry = map.get(key);
    entry.count++;
    if (r.parentProcess && r.parentProcess.trim()) {
      entry.processes.add(r.parentProcess.trim());
    }
    if (r.callingProcess && r.callingProcess.trim()) {
      entry.processes.add(r.callingProcess.trim());
    }
  });

  const list = [];
  map.forEach((value, name) => {
    list.push({
      name: name,
      count: value.count,
      status: value.status,
      processes: Array.from(value.processes),
      suggested: value.suggested,
      editedSuggestion: value.editedSuggestion
    });
  });

  // Tri par fréquence décroissante, puis nom de variable croissant
  list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  // Assigner les rangs
  list.forEach((item, index) => {
    item.rank = index + 1;
  });

  return list;
}

function renderRanking() {
  const fullRanking = computeRankingData();
  
  // Mettre à jour les cartes statistiques
  const totalUnique = fullRanking.length;
  const totalOccurrences = allRows.length;
  const avgOccurrences = totalUnique > 0 ? (totalOccurrences / totalUnique).toFixed(1) : 0;
  
  let mostUsedStr = "Aucune variable";
  let mostUsedPercent = 0;
  if (totalUnique > 0) {
    const topVar = fullRanking[0];
    mostUsedStr = `${esc(topVar.name)} (${topVar.count} fois)`;
    mostUsedPercent = Math.round((topVar.count / totalOccurrences) * 100);
  }

  const statsGrid = document.getElementById('rankingStatsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="stat"><div class="val">${totalUnique}</div><div class="lbl">Variables uniques</div></div>
      <div class="stat info"><div class="val">${mostUsedStr}</div><div class="lbl">Variable la plus utilisée</div></div>
      <div class="stat ok"><div class="val">${avgOccurrences}</div><div class="lbl">Fréquence moyenne</div></div>
      <div class="stat warn"><div class="val">${mostUsedPercent}%</div><div class="lbl">Part de la variable top 1</div></div>
    `;
  }

  // Rendre le graphique
  renderRankingChart(fullRanking);

  // Rendre le tableau
  renderRankingTableOnly(fullRanking);
}

function renderRankingChart(fullRanking) {
  const top10 = fullRanking.slice(0, 10);
  const canvas = document.getElementById('rankingChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (rankingChart) rankingChart.destroy();
  
  if (top10.length === 0) {
    return;
  }

  rankingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(item => item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name),
      datasets: [{
        label: "Nombre d'utilisations",
        data: top10.map(item => item.count),
        backgroundColor: 'rgba(0, 159, 227, 0.8)',
        hoverBackgroundColor: 'var(--brand-primary)',
        borderRadius: 4,
        borderWidth: 0,
        barThickness: 15
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Utilisé ${context.parsed.x} fois`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'var(--border-color)' },
          ticks: { stepSize: 1, color: 'var(--text-secondary)' }
        },
        y: {
          grid: { display: false },
          ticks: { color: 'var(--text-primary)', font: { weight: 'bold' } }
        }
      }
    }
  });
}

function renderRankingTableOnly(providedRanking) {
  const fullRanking = providedRanking || computeRankingData();
  const search = currentRankingSearch;
  const statusFilter = currentRankingStatus;
  const sortBy = currentRankingSort;
  const limitVal = currentRankingLimit;

  // Filtrer
  let rows = fullRanking.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !r.name.toLowerCase().includes(search)) return false;
    return true;
  });

  // Trier
  if (sortBy === 'name') {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'processes') {
    rows.sort((a, b) => {
      if (b.processes.length !== a.processes.length) return b.processes.length - a.processes.length;
      return b.count - a.count;
    });
  } else {
    // Par défaut : classement (rang décroissant de fréquence)
    rows.sort((a, b) => a.rank - b.rank);
  }

  // Limiter
  if (limitVal !== 'all') {
    const limit = parseInt(limitVal, 10);
    rows = rows.slice(0, limit);
  }

  const tbody = document.getElementById('rankingTableBody');
  const empty = document.getElementById('rankingEmptyMsg');
  
  if (!tbody) return;
  
  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  
  if (empty) empty.style.display = 'none';

  const maxFreq = fullRanking.length > 0 ? Math.max(...fullRanking.map(r => r.count)) : 1;
  const stLabel = {valid: 'Conforme', invalid: 'Non conforme', warn: 'Attention'};

  tbody.innerHTML = rows.map(r => {
    let rankBadge = '';
    if (r.rank === 1) rankBadge = '<span style="font-size:18px;margin-right:2px;">🥇</span>';
    else if (r.rank === 2) rankBadge = '<span style="font-size:18px;margin-right:2px;">🥈</span>';
    else if (r.rank === 3) rankBadge = '<span style="font-size:18px;margin-right:2px;">🥉</span>';
    else rankBadge = `<span style="font-weight:600; color:var(--text-secondary); padding: 2px 6px;">#${r.rank}</span>`;

    const widthPercent = Math.max(5, (r.count / maxFreq) * 100);

    const procBadges = r.processes.length > 0 
      ? r.processes.map(p => `<span class="badge badge-process">${esc(p)}</span>`).join(' ') 
      : '<span style="color:var(--text-tertiary);font-size:11px">—</span>';

    return `
      <tr>
        <td style="vertical-align: middle; text-align: center;">${rankBadge}</td>
        <td style="vertical-align: middle;"><span class="mono" style="font-weight:600;">${esc(r.name)}</span></td>
        <td style="vertical-align: middle; font-weight: 500;">${r.count} fois</td>
        <td style="vertical-align: middle;">
          <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; max-width: 150px;">
            <div style="width: ${widthPercent}%; height: 100%; background: linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-dark) 100%); border-radius: 4px;"></div>
          </div>
        </td>
        <td style="vertical-align: middle;"><span class="badge ${r.status==='valid'?'ok':r.status==='warn'?'warn':'err'}">${stLabel[r.status]}</span></td>
        <td style="vertical-align: middle; line-height: 1.5;">${procBadges}</td>
      </tr>
    `;
  }).join('');
}

function onRankingSearch() {
  const input = document.getElementById('rankingSearchInput');
  currentRankingSearch = input ? input.value.trim().toLowerCase() : '';
  renderRankingTableOnly();
}

function onRankingFilterChange() {
  const statusEl = document.getElementById('rankingStatusFilter');
  currentRankingStatus = statusEl ? statusEl.value : 'all';
  const limitEl = document.getElementById('rankingLimitSel');
  currentRankingLimit = limitEl ? limitEl.value : '50';
  renderRankingTableOnly();
}

function onRankingSortChange() {
  const sortEl = document.getElementById('rankingSortSel');
  currentRankingSort = sortEl ? sortEl.value : 'rank';
  renderRankingTableOnly();
}

function exportRankingCSV() {
  const ranking = computeRankingData();
  if(!ranking.length) { alert("Le classement est vide."); return; }
  const header = 'Rang,Variable,Fréquence d\'utilisation,Statut,Processus associés\n';
  const body = ranking.map(r => [
    r.rank,
    qq(r.name),
    r.count,
    qq(r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme'),
    qq(r.processes.join('; '))
  ].join(',')).join('\n');
  dl(header + body, 'camunda_variables_classement.csv', 'text/csv');
}

// ---------- Helper functions ----------
function qq(s){return '"'+String(s).replace(/"/g,'""')+'"'}
function dl(content,filename,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=filename;a.click()}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ---------- Event Listeners & initialization ----------
const dz=document.getElementById('dropZone');
if (document.getElementById('fileInput')) {
  document.getElementById('fileInput').addEventListener('change',e=>handleFiles(e.target.files));
}
if (dz) {
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files)});
}

const dzSub=document.getElementById('dropZoneSub');
const fileInputSub=document.getElementById('fileInputSub');
if (fileInputSub) {
  fileInputSub.addEventListener('change',e=>handleSubprocessFiles(e.target.files));
}
if (dzSub) {
  dzSub.addEventListener('dragover',e=>{e.preventDefault();dzSub.classList.add('drag')});
  dzSub.addEventListener('dragleave',()=>dzSub.classList.remove('drag'));
  dzSub.addEventListener('drop',e=>{e.preventDefault();dzSub.classList.remove('drag');handleSubprocessFiles(e.dataTransfer.files)});
}

renderRules();

// ---------- Fonctions d'Authentification ----------
function checkAuth() {
  const isLoggedIn = localStorage.getItem('pda_camunda_logged_in') === 'true';
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  if (isLoggedIn) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    switchModule(currentModule);
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
  }
}

window.handleLogin = function(e) {
  if (e) e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');

  // Accepte à la fois 'pdacamunda' et 'user' en identifiant, et 'pdacamunda' en mot de passe
  if ((user === 'pdacamunda' || user === 'user') && pass === 'pdacamunda') {
    localStorage.setItem('pda_camunda_logged_in', 'true');
    checkAuth();
    if (errorEl) errorEl.style.display = 'none';
  } else {
    if (errorEl) {
      errorEl.textContent = "Identifiant ou mot de passe incorrect.";
      errorEl.style.display = 'block';
      errorEl.classList.remove('shake');
      void errorEl.offsetWidth; // Déclencher le reflow pour relancer l'animation
      errorEl.classList.add('shake');
    }
  }
}

window.handleLogout = function() {
  localStorage.removeItem('pda_camunda_logged_in');
  checkAuth();
  
  // Vider les champs
  const user = document.getElementById('loginUser');
  const pass = document.getElementById('loginPass');
  if (user) user.value = '';
  if (pass) pass.value = '';
}

// ---------- Subprocesses Module Logic ----------

window.switchModule = function(moduleName) {
  currentModule = moduleName;
  
  // Mettre à jour les boutons du sélecteur (en-têtes de catégorie)
  const btnVars = document.getElementById('btn-mod-variables');
  const btnSubs = document.getElementById('btn-mod-subprocesses');
  const btnBpmn = document.getElementById('btn-mod-bpmn-naming');
  const btnPmg = document.getElementById('btn-mod-pmg');
  const btnRoi = document.getElementById('btn-mod-roi');
  if (btnVars) btnVars.classList.toggle('active', moduleName === 'variables');
  if (btnSubs) btnSubs.classList.toggle('active', moduleName === 'subprocesses');
  if (btnBpmn) btnBpmn.classList.toggle('active', moduleName === 'bpmn-naming');
  if (btnPmg) btnPmg.classList.toggle('active', moduleName === 'pmg');
  if (btnRoi) btnRoi.classList.toggle('active', moduleName === 'roi');
  const guideHeader = document.getElementById('btn-mod-guide');
  if (guideHeader) guideHeader.classList.remove('active');

  // Mettre à jour l'expansion des groupes de menu
  const groupVars = document.getElementById('group-variables');
  const groupSubs = document.getElementById('group-subprocesses');
  const groupBpmn = document.getElementById('group-bpmn-naming');
  const groupPmg = document.getElementById('group-pmg');
  const groupRoi = document.getElementById('group-roi');
  if (groupVars) groupVars.classList.toggle('expanded', moduleName === 'variables');
  if (groupSubs) groupSubs.classList.toggle('expanded', moduleName === 'subprocesses');
  if (groupBpmn) groupBpmn.classList.toggle('expanded', moduleName === 'bpmn-naming');
  if (groupPmg) groupPmg.classList.toggle('expanded', moduleName === 'pmg');
  if (groupRoi) groupRoi.classList.toggle('expanded', moduleName === 'roi');

  // Onglets variables
  const varTabIds = ['import', 'config', 'resultsTab', 'dashTab', 'graphTab', 'rankTab', 'histTab'];
  // Onglets sous-processus
  const subTabIds = ['subImportTab', 'subAnalysisTab', 'subMapTab'];
  // Onglets nommage BPMN
  const bpmnTabIds = ['bpmnNamingImportTab', 'bpmnNamingConfigTab', 'bpmnNamingResultsTab'];
  // Onglets PMG
  const pmgTabIds = ['pmgImportTab', 'pmgMatrixTab'];

  // Afficher / masquer les onglets de la sidebar
  varTabIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (moduleName === 'variables') {
        if (['resultsTab', 'dashTab', 'graphTab', 'rankTab'].includes(id)) {
          el.style.display = allRows.length > 0 ? '' : 'none';
        } else {
          el.style.display = '';
        }
      } else {
        el.style.display = 'none';
      }
    }
  });

  subTabIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (moduleName === 'subprocesses') {
        if (['subAnalysisTab', 'subMapTab'].includes(id)) {
          el.style.display = allSubprocessRows.length > 0 ? '' : 'none';
        } else {
          el.style.display = '';
        }
      } else {
        el.style.display = 'none';
      }
    }
  });

  bpmnTabIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (moduleName === 'bpmn-naming') {
        if (id === 'bpmnNamingResultsTab') {
          el.style.display = (window.bpmnNamingElements && window.bpmnNamingElements.length > 0) ? '' : 'none';
        } else {
          el.style.display = '';
        }
      } else {
        el.style.display = 'none';
      }
    }
  });

  pmgTabIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (moduleName === 'pmg') {
        if (id === 'pmgMatrixTab') {
          el.style.display = (window.pmgActivities && window.pmgActivities.length > 0) ? '' : 'none';
        } else {
          el.style.display = '';
        }
      } else {
        el.style.display = 'none'; // Fixed bug from original code where this was ''
      }
    }
  });

  const roiTabIds = ['roiCalcTab', 'roiConfigTab'];
  roiTabIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = moduleName === 'roi' ? '' : 'none';
    }
  });

  // Basculer sur l'onglet par défaut du module
  if (moduleName === 'variables') {
    switchTab('import');
  } else if (moduleName === 'subprocesses') {
    switchTab('sub-import');
  } else if (moduleName === 'bpmn-naming') {
    switchTab('bpmn-naming-import');
    initBpmnNamingModule();
  } else if (moduleName === 'pmg') {
    switchTab('pmg-import');
    if (typeof initPmgModule === 'function') {
      initPmgModule();
    }
  } else if (moduleName === 'roi') {
    switchTab('roi-calculator');
    if (typeof initRoiModule === 'function') {
      initRoiModule();
    }
  }
}

function handleSubprocessFile(file) {
  if(!file) return;
  const name = file.name.toLowerCase();
  if (name.endsWith('.bpmn') || name.endsWith('.xml')) {
    handleBPMNSubprocessFile(file);
  } else {
    handleExcelCSVSubprocessFile(file);
  }
}

function handleExcelCSVSubprocessFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result,{type:'array'});
    rawSubprocessFileData = [];
    subprocessFileHeaders = [];

    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(ws,{header:1,defval:''});

    if(sheetData.length > 0){
       subprocessFileHeaders = sheetData[0].map((h, i) => h ? String(h).trim() : `Colonne ${i}`);
       if(subprocessFileHeaders.filter(h => !h.startsWith('Colonne')).length === 0){
          subprocessFileHeaders = sheetData[0].map((_, i) => `Colonne ${i}`);
          rawSubprocessFileData = sheetData;
       } else {
          rawSubprocessFileData = sheetData.slice(1);
       }
    }

    allSubprocessRows = [];
    const bpmnBtn = document.getElementById('downloadBpmnBtn');
    if (bpmnBtn) bpmnBtn.style.display = 'none';

    document.getElementById('uploadTitleSub').textContent = file.name;
    document.getElementById('uploadSubSub').textContent = 'Données chargées, veuillez vérifier le mappage';
    document.getElementById('manualInputSub').value = '';

    document.getElementById('mappingSectionSub').style.display = 'block';

    populateSubMappingDropdowns();
  };
  reader.readAsArrayBuffer(file);
}

function populateSubMappingDropdowns() {
  const selects = [
    document.getElementById('colSubParent'),
    document.getElementById('colSubChild'),
    document.getElementById('colSubElementId')
  ];

  selects.forEach((sel, i) => {
    if (!sel) return;
    const defOpt = sel.querySelector('option[value="-1"]');
    sel.innerHTML = defOpt ? '<option value="-1">-- Non défini --</option>' : '';

    subprocessFileHeaders.forEach((header, index) => {
       const opt = document.createElement('option');
       opt.value = index;
       opt.textContent = `${header} (Col ${index})`;
       sel.appendChild(opt);
    });

    // Pré-sélection intelligente
    if (i === 0) {
      const found = subprocessFileHeaders.findIndex(h => h.toLowerCase().includes('parent') || h.toLowerCase().includes('caller') || h.toLowerCase().includes('source'));
      if (found >= 0) sel.value = found;
    } else if (i === 1) {
      const found = subprocessFileHeaders.findIndex(h => h.toLowerCase().includes('sous') || h.toLowerCase().includes('sub') || h.toLowerCase().includes('child') || h.toLowerCase().includes('called') || h.toLowerCase().includes('target'));
      if (found >= 0) sel.value = found;
    }
  });

  updateSubPreview();
}

window.updateSubPreview = function() {
  const colParentIdx = parseInt(document.getElementById('colSubParent').value, 10);
  const colChildIdx = parseInt(document.getElementById('colSubChild').value, 10);
  const colElementIdIdx = parseInt(document.getElementById('colSubElementId').value, 10);

  if (isNaN(colParentIdx) || isNaN(colChildIdx) || colParentIdx < 0 || colChildIdx < 0) {
    document.getElementById('previewBoxSub').innerHTML = '<span style="color:var(--text-tertiary)">Sélectionnez les colonnes requises...</span>';
    return;
  }

  let previewHTML = '';
  const maxPreview = 5;
  const count = Math.min(rawSubprocessFileData.length, maxPreview);

  for(let i=0; i<count; i++){
    const row = rawSubprocessFileData[i];
    const parentVal = row[colParentIdx];
    const childVal = row[colChildIdx];
    if(parentVal && childVal) {
      let details = [];
      if(colElementIdIdx >= 0 && row[colElementIdIdx]) details.push(`ID: ${row[colElementIdIdx]}`);

      previewHTML += `<div style="margin-bottom:4px"><strong style="color:var(--brand-primary)">${esc(parentVal)}</strong> ➔ <strong style="color:#10b981">${esc(childVal)}</strong> <span style="color:var(--text-tertiary);font-size:10px">${details.join(' | ')}</span></div>`;
    }
  }

  const totalRows = rawSubprocessFileData.filter(r => r[colParentIdx] && r[colChildIdx]).length;

  document.getElementById('previewBoxSub').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucune relation détectée...</span>';
  document.getElementById('colHintSub').textContent = `Mappage configuré.`;
  document.getElementById('countHintSub').textContent = `${totalRows} relations détectées`;
}

function handleBPMNSubprocessFile(file) {
  return handleBPMNSubprocessFiles([file]);
}

async function handleBPMNSubprocessFiles(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean);
  if (!selectedFiles.length) return;
  rawSubprocessFileData = [];
  subprocessFileHeaders = [];
  allSubprocessRows = [];
  const errors = [];

  for (const file of selectedFiles) {
    try {
      const xmlText = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) throw new Error(parserError.textContent || 'XML invalide');
      const relations = [];
      const allElements = xmlDoc.getElementsByTagName('*');
      let rowId = 1;
      function getParentProcessInfoLocal(node) {
        let parent = node.parentNode;
        while (parent) {
          const ln = parent.localName ? parent.localName.toLowerCase() : '';
          if (ln === 'process') {
            const id = parent.getAttribute('id') || '';
            const name = parent.getAttribute('name') || '';
            return name ? `${name} (${id})` : id;
          }
          parent = parent.parentNode;
        }
        return 'Processus inconnu';
      }
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const localName = el.localName ? el.localName.toLowerCase() : '';
        if (localName === 'callactivity') {
          const calledElement = el.getAttribute('calledElement') || '';
          const activityId = el.getAttribute('id') || '';
          const activityName = el.getAttribute('name') || '';
          relations.push({ parentProcess: getParentProcessInfoLocal(el), subprocess: calledElement || '(Sous-processus non défini)', elementId: activityName ? `${activityName} (${activityId})` : activityId, row: rowId++, sourceFile: file.name });
        }
      }
      allSubprocessRows.push(...relations.map(r => ({ ...r, status: r.subprocess === '(Sous-processus non défini)' ? 'invalid' : 'valid', issues: r.subprocess === '(Sous-processus non défini)' ? ['Sous-processus non défini (appel vide)'] : [] })));
    } catch (err) {
      console.error(`Erreur de lecture BPMN sous-processus (${file.name})`, err);
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  const uploadTitle = document.getElementById('uploadTitleSub');
  const uploadSub = document.getElementById('uploadSubSub');
  const countHint = document.getElementById('countHintSub');
  if (uploadTitle) uploadTitle.textContent = selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} fichiers BPMN sélectionnés`;
  if (uploadSub) uploadSub.textContent = `${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''} BPMN chargé${selectedFiles.length > 1 ? 's' : ''} — ${allSubprocessRows.length} Call Activities trouvées`;
  document.getElementById('manualInputSub').value = '';
  document.getElementById('mappingSectionSub').style.display = 'none';
  if (countHint) countHint.textContent = `${selectedFiles.length} BPMN · ${allSubprocessRows.length} relations détectées`;
  let previewHTML = '';
  const count = Math.min(allSubprocessRows.length, 10);
  for (let i = 0; i < count; i++) {
    const r = allSubprocessRows[i];
    previewHTML += `<div style="margin-bottom:4px"><strong style="color:var(--brand-primary)">${esc(r.parentProcess)}</strong> ➔ <strong style="color:#10b981">${esc(r.subprocess)}</strong> <span style="color:var(--text-tertiary);font-size:10px">(${esc(r.elementId)}) — ${esc(r.sourceFile || '')}</span></div>`;
  }
  document.getElementById('previewBoxSub').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucun Call Activity trouvé...</span>';
  if (errors.length) alert(`Certains fichiers n'ont pas pu être importés :\n\n${errors.join('\n')}`);
}

window.analyzeSubprocesses = function() {
  const manual = document.getElementById('manualInputSub').value.trim();
  let relations = [];

  if (allSubprocessRows.length > 0 && rawSubprocessFileData.length === 0 && !manual) {
    relations = allSubprocessRows;
  } else if (rawSubprocessFileData.length > 0) {
    const colParentIdx = parseInt(document.getElementById('colSubParent').value, 10);
    const colChildIdx = parseInt(document.getElementById('colSubChild').value, 10);
    const colElementIdIdx = parseInt(document.getElementById('colSubElementId').value, 10);

    if (isNaN(colParentIdx) || isNaN(colChildIdx) || colParentIdx < 0 || colChildIdx < 0) {
      alert("Veuillez mapper les colonnes requises.");
      return;
    }

    rawSubprocessFileData.forEach((row, index) => {
      const parentVal = String(row[colParentIdx] || '').trim();
      const childVal = String(row[colChildIdx] || '').trim();
      const elemId = colElementIdIdx >= 0 ? String(row[colElementIdIdx] || '').trim() : '';
      if (parentVal) {
        relations.push({
          parentProcess: parentVal,
          subprocess: childVal || '(Sous-processus non défini)',
          elementId: elemId || `Ligne ${index + 1}`,
          row: index + 1
        });
      }
    });
  } else if (manual) {
    manual.split('\n').forEach((l, i) => {
      const parts = l.split(';');
      const parentVal = parts[0] ? parts[0].trim() : '';
      const childVal = parts[1] ? parts[1].trim() : '';
      if (parentVal) {
        relations.push({
          parentProcess: parentVal,
          subprocess: childVal || '(Sous-processus non défini)',
          elementId: `Saisie manuelle L${i+1}`,
          row: i + 1
        });
      }
    });
  }

  if (relations.length === 0) {
    alert("Aucune relation à analyser. Importez un fichier ou saisissez manuellement.");
    return;
  }

  // Détecter les boucles circulaires via DFS
  const adj = {};
  relations.forEach(r => {
    if (r.parentProcess && r.subprocess && r.subprocess !== '(Sous-processus non défini)') {
      const p = r.parentProcess;
      const c = r.subprocess;
      if (!adj[p]) adj[p] = new Set();
      adj[p].add(c);
    }
  });

  const visited = {};
  const recStack = {};
  const nodesInLoops = new Set();

  function findCycles(node) {
    visited[node] = true;
    recStack[node] = true;

    const neighbors = adj[node] || [];
    for (let neighbor of neighbors) {
      if (!visited[neighbor]) {
        if (findCycles(neighbor)) {
          nodesInLoops.add(node);
          nodesInLoops.add(neighbor);
          return true;
        }
      } else if (recStack[neighbor]) {
        nodesInLoops.add(node);
        nodesInLoops.add(neighbor);
        return true;
      }
    }

    recStack[node] = false;
    return false;
  }

  const allNodes = new Set([...Object.keys(adj), ...relations.map(r => r.subprocess)]);
  for (let node of allNodes) {
    if (!visited[node]) {
      findCycles(node);
    }
  }

  allSubprocessRows = relations.map(r => {
    const issues = [];
    if (r.subprocess === '(Sous-processus non défini)') {
      issues.push('Sous-processus non défini');
    }
    const isParentInLoop = nodesInLoops.has(r.parentProcess);
    const isChildInLoop = nodesInLoops.has(r.subprocess);
    if (isParentInLoop && isChildInLoop) {
      issues.push('Dépendance circulaire détectée (boucle infinie)');
    }

    let status = 'valid';
    if (issues.some(i => i.includes('non défini'))) {
      status = 'invalid';
    } else if (issues.length > 0) {
      status = 'warn';
    }

    return {
      ...r,
      issues,
      status,
      inLoop: isParentInLoop && isChildInLoop
    };
  });

  // Afficher les onglets d'analyse
  const subAnalysisTab = document.getElementById('subAnalysisTab');
  const subMapTab = document.getElementById('subMapTab');
  if (subAnalysisTab) subAnalysisTab.style.display = '';
  if (subMapTab) subMapTab.style.display = '';

  initSubGraphFilters();
  switchTab('sub-analysis');
  renderSubprocessResults();
  renderSubprocessMap();
}

function renderSubprocessResults() {
  const totalRelations = allSubprocessRows.length;
  const uniqueParents = new Set(allSubprocessRows.map(r => r.parentProcess)).size;
  const uniqueChildren = new Set(allSubprocessRows.filter(r => r.subprocess !== '(Sous-processus non défini)').map(r => r.subprocess)).size;
  const loopsCount = allSubprocessRows.filter(r => r.inLoop).length;

  document.getElementById('kpi-sub-total').textContent = totalRelations;
  document.getElementById('kpi-sub-total-status').textContent = 'Relations';
  document.getElementById('kpi-sub-parents').textContent = uniqueParents;
  document.getElementById('kpi-sub-parents-status').textContent = 'Parents';
  document.getElementById('kpi-sub-children').textContent = uniqueChildren;
  document.getElementById('kpi-sub-children-status').textContent = 'Sous-processus';
  document.getElementById('kpi-sub-loops').textContent = loopsCount;
  document.getElementById('kpi-sub-loops-status').textContent = loopsCount > 0 ? 'Boucles Actives' : 'Sain';
  document.getElementById('kpi-sub-loops-status').style.color = loopsCount > 0 ? 'var(--err-dark)' : 'var(--ok-dark)';

  renderSubprocessTable();
}

function renderSubprocessTable() {
  const search = document.getElementById('subSearchInput').value.trim().toLowerCase();
  const loopFilter = document.getElementById('subLoopFilter').value;
  const sortKey = subSortKey;

  const subMap = {};
  allSubprocessRows.forEach(r => {
    const c = r.subprocess;
    if (!subMap[c]) {
      subMap[c] = {
        name: c,
        parents: new Set(),
        issues: new Set(),
        inLoop: false
      };
    }
    if (r.parentProcess) subMap[c].parents.add(r.parentProcess);
    r.issues.forEach(iss => subMap[c].issues.add(iss));
    if (r.inLoop) subMap[c].inLoop = true;
  });

  let uniqueSubs = Object.values(subMap);

  // Filtrer
  uniqueSubs = uniqueSubs.filter(sub => {
    if (search && !sub.name.toLowerCase().includes(search) && !Array.from(sub.parents).some(p => p.toLowerCase().includes(search))) return false;
    if (loopFilter === 'loop' && !sub.inLoop) return false;
    if (loopFilter === 'noLoop' && sub.inLoop) return false;
    return true;
  });

  // Trier
  uniqueSubs.sort((a, b) => {
    if (sortKey === 'impact') {
      return (b.parents.size - a.parents.size) * (subSortDir);
    } else {
      return a.name.localeCompare(b.name) * (-subSortDir);
    }
  });

  const tbody = document.getElementById('subTableBody');
  const empty = document.getElementById('subEmptyMsg');

  if (!tbody) return;

  if (uniqueSubs.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = uniqueSubs.map(sub => {
    const parentBadges = Array.from(sub.parents).map(p => 
      `<span class="badge badge-process">${esc(p)}</span>`
    ).join(' ');

    let statusBadge = '<span class="badge ok">Sain</span>';
    let issuesList = '';
    if (sub.name === '(Sous-processus non défini)') {
      statusBadge = '<span class="badge err">Incomplet</span>';
      issuesList = '<div class="iss-item" style="color:var(--err-dark)">● Appel vide (non défini)</div>';
    } else if (sub.inLoop) {
      statusBadge = '<span class="badge err">Erreur</span>';
      issuesList = '<div class="iss-item" style="color:var(--err-dark)">● Dépendance circulaire</div>';
    } else if (sub.issues.size > 0) {
      statusBadge = '<span class="badge warn">Attention</span>';
      issuesList = Array.from(sub.issues).map(iss => `<div class="iss-item">● ${esc(iss)}</div>`).join('');
    }

    return `
      <tr>
        <td><strong class="mono">${esc(sub.name)}</strong></td>
        <td><span style="font-weight:600;">${sub.parents.size} parent(s)</span></td>
        <td>${parentBadges || '<span style="color:var(--text-tertiary);font-size:11px">— (Orphelin)</span>'}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px">
            ${statusBadge}
            ${issuesList ? `<div class="iss-list">${issuesList}</div>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.subSortBy = function(key) {
  if (subSortKey === key) {
    subSortDir *= -1;
  } else {
    subSortKey = key;
    subSortDir = -1;
  }
  renderSubprocessTable();
}

window.onSubSearch = function() {
  renderSubprocessTable();
}

window.onSubFilterChange = function() {
  renderSubprocessTable();
}

window.onSubSortChange = function() {
  const select = document.getElementById('subSortSel');
  if (select) {
    subSortKey = select.value;
    subSortDir = -1;
    renderSubprocessTable();
  }
}

window.renderSubprocessMap = function() {
  if (!window.vis) return;
  const container = document.getElementById('subNetworkGraph');
  if (!container) return;

  const showLoopsOnly = document.getElementById('subGraphLoopsOnly')?.checked || false;
  const showCommonOnly = document.getElementById('subGraphCommonOnly')?.checked || false;
  const parentFilters = getSelectedCheckboxValues('subParentList');
  const childFilters = getSelectedCheckboxValues('subChildList');

  const isLight = document.body.className === 'theme-clair';
  const isCyber = document.body.className === 'theme-cyber';
  const nodeTextColor = isLight ? '#0f172a' : isCyber ? '#00ffcc' : '#f8fafc';
  const edgeLineColor = isLight ? 'rgba(0, 0, 0, 0.2)' : isCyber ? 'rgba(0, 255, 204, 0.3)' : '#cbd5e1';

  const nodesMap = new Map();
  const edges = [];

  // Précalculer le nombre de parents par sous-processus
  const subToParents = {};
  allSubprocessRows.forEach(r => {
    const child = r.subprocess;
    const parent = r.parentProcess;
    if (child && child !== '(Sous-processus non défini)' && parent) {
      if (!subToParents[child]) {
        subToParents[child] = new Set();
      }
      subToParents[child].add(parent);
    }
  });

  allSubprocessRows.forEach(r => {
    if (showLoopsOnly && !r.inLoop) return;

    const parent = r.parentProcess;
    const child = r.subprocess;

    if (!parent) return;

    if (showCommonOnly) {
      if (!child || child === '(Sous-processus non défini)' || !subToParents[child] || subToParents[child].size <= 1) {
        return;
      }
    }

    if (parentFilters.length > 0 && !parentFilters.includes(parent)) return;
    if (childFilters.length > 0 && child && !childFilters.includes(child)) return;

    // Ajouter le parent
    const pId = 'subproc_' + parent;
    if (!nodesMap.has(pId)) {
      const isParentInLoop = allSubprocessRows.some(row => row.parentProcess === parent && row.inLoop);
      const nodeColor = isParentInLoop ? '#ef4444' : '#004F9F';
      nodesMap.set(pId, {
        id: pId,
        label: parent,
        group: 'process',
        shape: 'box',
        color: { background: nodeColor, border: nodeColor, highlight: { background: '#0088c4', border: '#0088c4' } },
        font: { color: 'white', size: 13, face: 'var(--font-sans)', weight: '500' },
        borderWidth: 2
      });
    }

    if (child && child !== '(Sous-processus non défini)') {
      // Ajouter l'enfant
      const cId = 'subproc_' + child;
      if (!nodesMap.has(cId)) {
        const isChildInLoop = allSubprocessRows.some(row => row.subprocess === child && row.inLoop);
        const nodeColor = isChildInLoop ? '#ef4444' : '#10b981';
        nodesMap.set(cId, {
          id: cId,
          label: child,
          group: 'subprocess',
          shape: 'box',
          color: { background: nodeColor, border: nodeColor },
          font: { color: 'white', size: 12, face: 'var(--font-sans)' },
          borderWidth: 2
        });
      }

      edges.push({
        from: pId,
        to: cId,
        color: { color: r.inLoop ? '#ef4444' : edgeLineColor, highlight: '#3b82f6' }
      });
    }
  });

  const nodes = Array.from(nodesMap.values());

  const kpiGrid = document.getElementById('subMapKpiGrid');
  const sidebarContent = document.getElementById('subMapAnalysisContent');

  if (nodes.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:4rem; height: 100%; display: flex; flex-direction: column; justify-content: center;"><div class="empty-icon">⚯</div>Aucune relation à cartographier.</div>';
    if (kpiGrid) kpiGrid.style.display = 'none';
    if (sidebarContent) sidebarContent.innerHTML = '<p style="font-style: italic; color: var(--text-tertiary);">Aucune donnée disponible avec les filtres actuels.</p>';
    return;
  }

  const uniqueEdges = [];
  const edgeSet = new Set();
  edges.forEach(e => {
    const key = e.from + '_' + e.to;
    if(!edgeSet.has(key)) { edgeSet.add(key); uniqueEdges.push(e); }
  });

  // Mettre à jour les KPIs
  const visibleParents = nodes.filter(n => n.group === 'process').length;
  const visibleChildren = nodes.filter(n => n.group === 'subprocess').length;
  const visibleRelations = uniqueEdges.length;
  const reusabilityRate = visibleChildren > 0 ? (visibleRelations / visibleChildren).toFixed(1) : '0.0';

  if (kpiGrid) {
    kpiGrid.style.display = 'grid';
    document.getElementById('kpi-sub-map-parents').textContent = visibleParents;
    document.getElementById('kpi-sub-map-children').textContent = visibleChildren;
    document.getElementById('kpi-sub-map-reusability').textContent = reusabilityRate;
    document.getElementById('kpi-sub-map-relations').textContent = visibleRelations;
  }

  // Générer les analyses détaillées
  if (sidebarContent) {
    let analysisHtml = '';

    // Groupement enfant -> parents
    const childToParentsMap = {};
    // Groupement parent -> enfants
    const parentToChildrenMap = {};
    let visibleLoops = 0;

    uniqueEdges.forEach(e => {
      const parentName = nodesMap.get(e.from)?.label;
      const childName = nodesMap.get(e.to)?.label;
      if (parentName && childName) {
        if (!childToParentsMap[childName]) childToParentsMap[childName] = [];
        childToParentsMap[childName].push(parentName);

        if (!parentToChildrenMap[parentName]) parentToChildrenMap[parentName] = [];
        parentToChildrenMap[parentName].push(childName);
        
        const edgeRow = allSubprocessRows.find(r => r.parentProcess === parentName && r.subprocess === childName);
        if (edgeRow && edgeRow.inLoop) {
          visibleLoops++;
        }
      }
    });

    // 1. Alerte boucles circulaires
    if (visibleLoops > 0) {
      analysisHtml += `
        <div style="background:var(--err-light); border:1px solid var(--err); color:var(--text-primary); padding:10px; border-radius:var(--border-radius-md); margin-bottom:10px;">
          <span style="font-weight:600; color:var(--err); display:flex; align-items:center; gap:4px;">⚠️ Dépendances Circulaires</span>
          <p style="margin-top:4px; font-size:11px; line-height:1.4;">Il y a <strong>${visibleLoops}</strong> liaison(s) impliquée(s) dans une boucle infinie de dépendance dans la vue actuelle.</p>
        </div>
      `;
    }

    // 2. Sous-processus partagés
    const sortedChildren = Object.entries(childToParentsMap)
      .sort((a, b) => b[1].length - a[1].length);

    analysisHtml += `
      <div style="margin-bottom: 10px;">
        <h5 style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
          <span>🔗 Réutilisation (Top Partagés)</span>
          <span style="font-size:10px; color:var(--text-tertiary); font-weight:normal;">Total: ${sortedChildren.filter(c => c[1].length > 1).length}</span>
        </h5>
    `;

    if (sortedChildren.length > 0) {
      analysisHtml += '<div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:2px;">';
      sortedChildren.slice(0, 5).forEach(([name, parents]) => {
        const isShared = parents.length > 1;
        analysisHtml += `
          <div style="background:var(--bg-card-hover); border:1px solid var(--border-color); padding:8px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
              <span style="font-weight:600; color:${isShared ? 'var(--brand-primary)' : 'var(--text-primary)'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</span>
              <span style="font-size:9px; background:${isShared ? 'var(--brand-light)' : 'var(--border-color)'}; color:${isShared ? 'var(--brand-primary)' : 'var(--text-secondary)'}; padding:1px 5px; border-radius:10px; font-weight:bold; flex-shrink:0;">
                ${parents.length} parent${parents.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style="font-size:10px; color:var(--text-tertiary); overflow:hidden; text-overflow:ellipsis; display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
              ${parents.map(p => `<span style="background:var(--bg-card); border:1px solid var(--border-color); padding:1px 4px; border-radius:3px; font-size:9px;">${esc(p)}</span>`).join('')}
            </div>
          </div>
        `;
      });
      analysisHtml += '</div>';
    } else {
      analysisHtml += '<p style="font-style:italic; font-size:11px; color:var(--text-tertiary);">Aucun sous-processus visible.</p>';
    }
    analysisHtml += '</div>';

    // 3. Processus parents complexes
    const sortedParents = Object.entries(parentToChildrenMap)
      .sort((a, b) => b[1].length - a[1].length);

    analysisHtml += `
      <div>
        <h5 style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
          <span>⚙️ Complexité (Top Appels)</span>
          <span style="font-size:10px; color:var(--text-tertiary); font-weight:normal;">Total: ${sortedParents.length}</span>
        </h5>
    `;

    if (sortedParents.length > 0) {
      analysisHtml += '<div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:2px;">';
      sortedParents.slice(0, 5).forEach(([name, children]) => {
        analysisHtml += `
          <div style="background:var(--bg-card-hover); border:1px solid var(--border-color); padding:8px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
              <span style="font-weight:600; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</span>
              <span style="font-size:9px; background:var(--info-light); color:var(--info); padding:1px 5px; border-radius:10px; font-weight:bold; flex-shrink:0;">
                ${children.length} appel${children.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style="font-size:10px; color:var(--text-tertiary); overflow:hidden; text-overflow:ellipsis; display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
              ${children.map(c => `<span style="background:var(--bg-card); border:1px solid var(--border-color); padding:1px 4px; border-radius:3px; font-size:9px;">${esc(c)}</span>`).join('')}
            </div>
          </div>
        `;
      });
      analysisHtml += '</div>';
    } else {
      analysisHtml += '<p style="font-style:italic; font-size:11px; color:var(--text-tertiary);">Aucun processus parent visible.</p>';
    }
    analysisHtml += '</div>';

    sidebarContent.innerHTML = analysisHtml;
  }

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(uniqueEdges) };

  const options = {
    physics: {
      stabilization: { iterations: 150 },
      barnesHut: { gravitationalConstant: -3000, springLength: 100, springConstant: 0.05 }
    },
    edges: {
      smooth: { type: 'continuous' },
      arrows: { to: { enabled: true, scaleFactor: 0.6 } }
    },
    interaction: { hover: true, tooltipDelay: 200, zoomView: true }
  };

  container.innerHTML = '';
  const network = new vis.Network(container, data, options);

  network.on("stabilizationIterationsDone", function () {
    network.setOptions( { physics: false } );
  });
}

function initSubGraphFilters() {
  const parentSet = new Set();
  const childSet = new Set();
  
  allSubprocessRows.forEach(r => {
    if (r.parentProcess && r.parentProcess.trim()) parentSet.add(r.parentProcess.trim());
    if (r.subprocess && r.subprocess.trim() && r.subprocess !== '(Sous-processus non défini)') {
      childSet.add(r.subprocess.trim());
    }
  });

  const parentList = document.getElementById('subParentList');
  const childList = document.getElementById('subChildList');

  if (parentList) {
    parentList.innerHTML = Array.from(parentSet).sort().map((p, i) => `
      <div class="searchable-list-item" data-value="${esc(p)}">
        <input type="checkbox" id="chk_sub_p_${i}" value="${esc(p)}">
        <label for="chk_sub_p_${i}" title="${esc(p)}">${esc(p)}</label>
      </div>
    `).join('');
  }

  if (childList) {
    childList.innerHTML = Array.from(childSet).sort().map((c, i) => `
      <div class="searchable-list-item" data-value="${esc(c)}">
        <input type="checkbox" id="chk_sub_c_${i}" value="${esc(c)}">
        <label for="chk_sub_c_${i}" title="${esc(c)}">${esc(c)}</label>
      </div>
    `).join('');
  }

  const pInput = document.getElementById('searchSubParentInput');
  const cInput = document.getElementById('searchSubChildInput');
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';
}

window.resetSubGraphFilters = function() {
  const parentList = document.getElementById('subParentList');
  const childList = document.getElementById('subChildList');
  if (parentList) {
    parentList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  }
  if (childList) {
    childList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  }
  const checkLoop = document.getElementById('subGraphLoopsOnly');
  if (checkLoop) checkLoop.checked = false;
  const checkCommon = document.getElementById('subGraphCommonOnly');
  if (checkCommon) checkCommon.checked = false;
  
  const pInput = document.getElementById('searchSubParentInput');
  const cInput = document.getElementById('searchSubChildInput');
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';
  
  filterCheckboxes('subParentList', '');
  filterCheckboxes('subChildList', '');
  
  renderSubprocessMap();
}

// ---------- Fullscreen Management ----------
window.toggleFullscreen = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isNative = !!document.fullscreenEnabled;
  const isCurrentlyFullscreen = container.classList.contains('is-fullscreen') || document.fullscreenElement === container;

  if (isCurrentlyFullscreen) {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.classList.remove('is-fullscreen');
      setTimeout(() => {
        if (containerId === 'varsCartoContainer') {
          renderGraph();
        } else if (containerId === 'subCartoContainer') {
          renderSubprocessMap();
        }
      }, 150);
    }
  } else {
    if (isNative) {
      container.requestFullscreen().then(() => {
        container.classList.add('is-fullscreen');
        setTimeout(() => {
          if (containerId === 'varsCartoContainer') {
            renderGraph();
          } else if (containerId === 'subCartoContainer') {
            renderSubprocessMap();
          }
        }, 150);
      }).catch(err => {
        console.warn("API plein écran refusée, utilisation du fallback CSS", err);
        container.classList.add('is-fullscreen');
        setTimeout(() => {
          if (containerId === 'varsCartoContainer') {
            renderGraph();
          } else if (containerId === 'subCartoContainer') {
            renderSubprocessMap();
          }
        }, 150);
      });
    } else {
      container.classList.add('is-fullscreen');
      setTimeout(() => {
        if (containerId === 'varsCartoContainer') {
          renderGraph();
        } else if (containerId === 'subCartoContainer') {
          renderSubprocessMap();
        }
      }, 150);
    }
  }
};

document.addEventListener('fullscreenchange', () => {
  const containers = ['varsCartoContainer', 'subCartoContainer'];
  containers.forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    if (document.fullscreenElement === container) {
      container.classList.add('is-fullscreen');
    } else {
      if (container.classList.contains('is-fullscreen') && !document.fullscreenElement) {
        container.classList.remove('is-fullscreen');
        setTimeout(() => {
          if (id === 'varsCartoContainer') {
            renderGraph();
          } else if (id === 'subCartoContainer') {
            renderSubprocessMap();
          }
        }, 150);
      }
    }
  });
});

// ==========================================
//   BPMN NAMING AUDIT ENGINE & UI LOGIC
// ==========================================

// Global State
window.bpmnNamingElements = [];
window.filteredBpmnNamingElements = [];
window.bpmnNamingXmlDoc = null;
window.bpmnNamingFileName = "";
window.bpmnNamingFiles = []; // Plusieurs BPMN importés : [{name, doc, elements}]
window.bpmnNamingFilter = 'all';
window.bpmnNamingSearch = '';
window.bpmnNamingSort = { key: 'status', dir: 1 };
window.bpmnNamingPage = 1;
window.bpmnNamingItemsPerPage = 20;

let bpmnDonutChartInstance = null;
let bpmnBarChartInstance = null;

// Initialize the BPMN module elements
function initBpmnNamingModule() {
  loadBpmnRules();
  renderBpmnNamingImportRules();
  renderBpmnConfigRules();
  setupBpmnNamingEventListeners();
}

// Render rules on the import page to let the user check/uncheck them
function renderBpmnNamingImportRules() {
  const grid = document.getElementById('bpmnNamingImportRulesGrid');
  if (!grid) return;
  
  grid.innerHTML = bpmnRules.map((rule, idx) => `
    <div class="conf-item" style="padding:8px 12px; margin-bottom:0;">
      <input type="checkbox" id="chk_import_bpmn_rule_${idx}" ${rule.enabled ? 'checked' : ''} onchange="toggleBpmnRuleEnabled(${idx}, this.checked)">
      <label for="chk_import_bpmn_rule_${idx}" style="font-size:12px;">
        ${esc(rule.label)}
        <small style="font-size:10px; margin-top:0;">${esc(rule.desc)}</small>
      </label>
    </div>
  `).join('');
}

// Helper to toggle rule and sync both screens
window.toggleBpmnRuleEnabled = function(idx, isChecked) {
  bpmnRules[idx].enabled = isChecked;
  saveBpmnRules();
  renderBpmnConfigRules();
  renderBpmnNamingImportRules();
};

// Event Listeners setup
let bpmnListenersAttached = false;
function setupBpmnNamingEventListeners() {
  if (bpmnListenersAttached) return;
  const dz = document.getElementById('dropZoneBpmnNaming');
  const input = document.getElementById('fileInputBpmnNaming');
  if (input) {
    input.addEventListener('change', e => {
      if (e.target.files.length > 0) handleBpmnNamingFiles(e.target.files);
    });
  }
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files.length > 0) handleBpmnNamingFiles(e.dataTransfer.files);
    });
  }
  bpmnListenersAttached = true;
}

async function handleBpmnNamingFiles(files) {
  const selectedFiles = Array.from(files || []).filter(Boolean);
  if (!selectedFiles.length) return;

  bpmnNamingFiles = [];
  bpmnNamingElements = [];
  bpmnNamingXmlDoc = null;
  bpmnNamingFileName = '';
  const errors = [];

  for (const file of selectedFiles) {
    try {
      const xmlText = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) throw new Error(parserError.textContent || 'XML invalide');
      const elements = auditBpmnXmlDoc(xmlDoc).map(el => ({ ...el, sourceFile: file.name }));
      bpmnNamingFiles.push({ name: file.name, doc: xmlDoc, elements });
      bpmnNamingElements.push(...elements);
    } catch (err) {
      console.error(`Erreur parsing BPMN pour nommage (${file.name})`, err);
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  if (!bpmnNamingFiles.length) {
    alert("Aucun fichier BPMN valide n'a pu être importé.");
    return;
  }

  bpmnNamingXmlDoc = bpmnNamingFiles[0].doc;
  bpmnNamingFileName = bpmnNamingFiles.length === 1 ? bpmnNamingFiles[0].name : `${bpmnNamingFiles.length} fichiers BPMN`;
  const btn = document.getElementById('analyzeBpmnNamingBtn');
  if (btn) btn.removeAttribute('disabled');
  document.getElementById('uploadTitleBpmnNaming').textContent = bpmnNamingFiles.length === 1 ? bpmnNamingFiles[0].name : `${bpmnNamingFiles.length} fichiers BPMN sélectionnés`;
  document.getElementById('uploadSubBpmnNaming').textContent = `${bpmnNamingFiles.length} fichier${bpmnNamingFiles.length > 1 ? 's' : ''} BPMN chargé${bpmnNamingFiles.length > 1 ? 's' : ''} (${bpmnNamingElements.length} éléments identifiés)`;
  updateBpmnNamingSummary();
  updateBpmnNamingPreview();
  if (errors.length) alert(`Certains fichiers n'ont pas pu être importés :\n\n${errors.join('\n')}`);
}

function handleBpmnNamingFile(file) {
  return handleBpmnNamingFiles([file]);
}

// Read the BPMN file
function handleBpmnNamingFile(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    const xmlText = e.target.result;
    bpmnNamingFileName = file.name;
    
    try {
      const parser = new DOMParser();
      bpmnNamingXmlDoc = parser.parseFromString(xmlText, "application/xml");
      
      const parserError = bpmnNamingXmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent);
      }
      
      // Perform extraction
      bpmnNamingElements = auditBpmnXmlDoc(bpmnNamingXmlDoc);
      
      // Enable analyze button
      const btn = document.getElementById('analyzeBpmnNamingBtn');
      if (btn) btn.removeAttribute('disabled');
      
      document.getElementById('uploadTitleBpmnNaming').textContent = file.name;
      document.getElementById('uploadSubBpmnNaming').textContent = `Fichier BPMN chargé (${bpmnNamingElements.length} éléments identifiés)`;
      
      // Update details
      updateBpmnNamingSummary();
      updateBpmnNamingPreview();
      
    } catch(err) {
      console.error("Erreur parsing BPMN pour nommage", err);
      alert("Erreur de parsing XML : " + err.message);
    }
  };
  reader.readAsText(file);
}

// Draw Summary Counts
function updateBpmnNamingSummary() {
  const container = document.getElementById('bpmnNamingSummarySection');
  const countSpan = document.getElementById('bpmnNamingCountHint');
  const summaryEl = document.getElementById('bpmnNamingElementSummary');
  
  if (!container || !summaryEl) return;
  
  const stats = {};
  bpmnNamingElements.forEach(item => {
    stats[item.typeLabel] = (stats[item.typeLabel] || 0) + 1;
  });
  
  const total = bpmnNamingElements.length;
  if (countSpan) countSpan.textContent = `${total} éléments détectés`;
  
  if (total === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  summaryEl.innerHTML = Object.entries(stats).map(([label, count]) => `
    <div style="background:var(--bg-main); padding:6px 12px; border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
      <strong style="color:var(--brand-primary);">${count}</strong> ${label}
    </div>
  `).join('');
}

// Show preview of nodes
function updateBpmnNamingPreview() {
  const box = document.getElementById('bpmnNamingPreviewBox');
  if (!box) return;
  
  if (bpmnNamingElements.length === 0) {
    box.innerHTML = '<span style="color:var(--text-tertiary)">Aucun élément trouvé...</span>';
    return;
  }
  
  let html = '';
  const count = Math.min(bpmnNamingElements.length, 10);
  for (let i = 0; i < count; i++) {
    const el = bpmnNamingElements[i];
    html += `<div style="margin-bottom:6px; line-height:1.5;">
      <span class="badge-bpmn type-${el.type}">${esc(el.typeLabel)}</span>
      <strong style="color:var(--text-primary); font-size:11px;">${esc(el.id)}</strong>
      <span style="color:var(--text-secondary); font-size:11px;">: "${esc(el.name || '[Sans nom]')}"</span>
      <span style="color:var(--text-tertiary); font-size:10px;"> — ${esc(el.sourceFile || '')}</span>
    </div>`;
  }
  
  if (bpmnNamingElements.length > 10) {
    html += `<div style="color:var(--text-tertiary); font-size:11px; margin-top:4px;">... et ${bpmnNamingElements.length - 10} autres éléments.</div>`;
  }
  
  box.innerHTML = html;
}

// Trigger Analysis
window.analyzeBpmnNaming = async function() {
  if (bpmnNamingElements.length === 0) return;
  
  // Show spinner
  const loader = document.getElementById('loaderOverlay');
  const progressBar = document.getElementById('loaderProgressBar');
  
  progressBar.style.transition = 'none';
  progressBar.style.width = '0%';
  loader.style.display = 'flex';
  loader.offsetHeight; // force reflow
  loader.classList.add('active');
  
  setTimeout(() => {
    progressBar.style.transition = 'width 2s linear';
    progressBar.style.width = '100%';
  }, 50);
  
  // Wait 2 seconds (simulated loader)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Re-audit tous les BPMN importés avec les règles courantes
  bpmnNamingElements = [];
  bpmnNamingFiles.forEach(file => {
    file.elements = auditBpmnXmlDoc(file.doc).map(el => ({ ...el, sourceFile: file.name }));
    bpmnNamingElements.push(...file.elements);
  });
  
  // Reset pagination/filters
  bpmnNamingFilter = 'all';
  bpmnNamingSearch = '';
  bpmnNamingSort = { key: 'status', dir: 1 };
  bpmnNamingPage = 1;
  
  // Display tab results link
  const tab = document.getElementById('bpmnNamingResultsTab');
  if (tab) tab.style.display = '';
  
  switchTab('bpmn-naming-results');
  renderBpmnNamingResults();
  
  // Hide loader
  loader.classList.remove('active');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 300);
};

// Render Audit Results
function renderBpmnNamingResults() {
  const total = bpmnNamingElements.length;
  const valid = bpmnNamingElements.filter(r => r.status === 'valid').length;
  const warn = bpmnNamingElements.filter(r => r.status === 'warn').length;
  const invalid = bpmnNamingElements.filter(r => r.status === 'invalid').length;
  
  const score = Math.round((valid / total) * 100) || 0;
  const scoreColor = score >= 90 ? 'var(--ok-dark)' : score >= 70 ? 'var(--brand-primary)' : 'var(--err-dark)';
  
  // KPIs
  document.getElementById('kpi-bpmn-total').textContent = total;
  document.getElementById('kpi-bpmn-score').textContent = `${score}%`;
  document.getElementById('kpi-bpmn-score').style.color = scoreColor;
  
  const scoreStatus = document.getElementById('kpi-bpmn-score-status');
  if (scoreStatus) {
    let text = 'Insuffisant';
    if (score >= 90) text = 'Excellent';
    else if (score >= 70) text = 'Acceptable';
    scoreStatus.textContent = text;
    scoreStatus.style.color = scoreColor;
  }
  
  document.getElementById('kpi-bpmn-errors').textContent = invalid;
  document.getElementById('kpi-bpmn-warnings').textContent = warn;
  
  // Score Bar
  document.getElementById('bpmnScoreBar').innerHTML = `
    <span class="score-label">Score de conformité de nommage</span>
    <div class="score-track"><div class="score-fill" style="width:${score}%;background:${scoreColor}"></div></div>
    <span class="score-val" style="color:${scoreColor}">${score}%</span>
  `;
  
  // Toolbar
  document.getElementById('bpmnToolbarEl').innerHTML = `
    <button class="pill active" id="pbAll" onclick="setBpmnFilter('all')">Tous (${total})</button>
    <button class="pill p-ok" id="pbOk" onclick="setBpmnFilter('valid')">Conformes (${valid})</button>
    <button class="pill p-err" id="pbErr" onclick="setBpmnFilter('invalid')">Non conformes (${invalid})</button>
    <button class="pill p-warn" id="pbWarn" onclick="setBpmnFilter('warn')">Avertissements (${warn})</button>
    <input class="srch" placeholder="Rechercher..." id="bpmnSearchInput" oninput="onBpmnSearch()" value="${esc(bpmnNamingSearch)}">
    <select class="srt" id="bpmnSortSel" onchange="onBpmnSortChange()" style="height:36px;">
      <option value="status">Trier : statut</option>
      <option value="type">Trier : type d'élément</option>
      <option value="name">Trier : nom</option>
    </select>
  `;
  
  updateBpmnPills();
  renderBpmnCharts(valid, warn, invalid);
  renderBpmnNamingTable();
}

function updateBpmnPills() {
  ['All', 'Ok', 'Err', 'Warn'].forEach(x => {
    const el = document.getElementById('pb' + x);
    if (el) el.classList.toggle('active',
      (x === 'All' && bpmnNamingFilter === 'all') || 
      (x === 'Ok' && bpmnNamingFilter === 'valid') || 
      (x === 'Err' && bpmnNamingFilter === 'invalid') || 
      (x === 'Warn' && bpmnNamingFilter === 'warn')
    );
  });
}

// Donut & Bar Charts for Naming Results
function renderBpmnCharts(valid, warn, invalid) {
  if (!window.Chart) return;
  
  // Donut Chart
  const ctxDonut = document.getElementById('bpmnDonutChart').getContext('2d');
  if (bpmnDonutChartInstance) bpmnDonutChartInstance.destroy();
  
  bpmnDonutChartInstance = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
      labels: ['Conformes', 'Avertissements', 'Non conformes'],
      datasets: [{
        data: [valid, warn, invalid],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 12 } }
      }
    }
  });
  
  // Bar Chart of Violations by Element Type
  const elViolations = {};
  bpmnNamingElements.forEach(el => {
    if (el.status !== 'valid') {
      elViolations[el.typeLabel] = (elViolations[el.typeLabel] || 0) + el.issues.length;
    }
  });
  
  const labels = Object.keys(elViolations);
  const data = Object.values(elViolations);
  
  const ctxBar = document.getElementById('bpmnBarChart').getContext('2d');
  if (bpmnBarChartInstance) bpmnBarChartInstance.destroy();
  
  bpmnBarChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Aucune'],
      datasets: [{
        label: 'Violations de règles',
        data: data.length ? data : [0],
        backgroundColor: 'rgba(139, 92, 246, 0.75)',
        borderRadius: 4,
        barThickness: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// Results Table
function renderBpmnNamingTable() {
  const search = bpmnNamingSearch.toLowerCase();
  const statusOrder = { invalid: 0, warn: 1, valid: 2 };
  
  let rows = bpmnNamingElements.filter(r => {
    if (bpmnNamingFilter !== 'all' && r.status !== bpmnNamingFilter) return false;
    if (search && !r.name.toLowerCase().includes(search) && !r.id.toLowerCase().includes(search)) return false;
    return true;
  });
  
  // Sorting
  rows.sort((a, b) => {
    let av, bv;
    if (bpmnNamingSort.key === 'status') {
      av = statusOrder[a.status];
      bv = statusOrder[b.status];
    } else if (bpmnNamingSort.key === 'type') {
      av = a.typeLabel;
      bv = b.typeLabel;
    } else {
      av = a.name.toLowerCase();
      bv = b.name.toLowerCase();
    }
    return av < bv ? -bpmnNamingSort.dir : av > bv ? bpmnNamingSort.dir : 0;
  });
  
  filteredBpmnNamingElements = rows;
  const totalItems = filteredBpmnNamingElements.length;
  const totalPages = Math.ceil(totalItems / bpmnNamingItemsPerPage) || 1;
  
  if (bpmnNamingPage > totalPages) bpmnNamingPage = totalPages;
  if (bpmnNamingPage < 1) bpmnNamingPage = 1;
  
  const paginatedRows = filteredBpmnNamingElements.slice((bpmnNamingPage - 1) * bpmnNamingItemsPerPage, bpmnNamingPage * bpmnNamingItemsPerPage);
  
  const tbody = document.getElementById('bpmnTableBody');
  const empty = document.getElementById('bpmnEmptyMsg');
  document.getElementById('bpmnRowCount').textContent = `${totalItems} élément${totalItems !== 1 ? 's' : ''} trouvé${totalItems !== 1 ? 's' : ''} (Page ${bpmnNamingPage}/${totalPages})`;
  
  if (!totalItems) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('bpmnPaginationControls').innerHTML = '';
    return;
  }
  
  empty.style.display = 'none';
  const stLabel = { valid: 'Conforme', invalid: 'Erreur', warn: 'Avertissement' };
  
  tbody.innerHTML = paginatedRows.map(r => {
    const globalIdx = bpmnNamingElements.indexOf(r);
    
    const issuesHTML = r.issues.length 
      ? `<div class="iss-list">${r.issues.map(iss => `<div class="iss-item"><span class="iss-dot ${iss.sev === 'warn' ? 'w' : ''}">●</span><strong>${esc(iss.ruleLabel)}</strong>: ${esc(iss.msg)}</div>`).join('')}</div>`
      : '<span style="color:var(--text-tertiary);font-size:11px">—</span>';
      
    const suggestionHTML = r.status !== 'valid'
      ? `<input type="text" value="${esc(r.editedSuggestion)}" onchange="updateBpmnSuggestion(${globalIdx}, this.value)" style="border:0.5px solid var(--border-color);border-radius:4px;padding:4px 8px;font-size:11px;font-family:var(--font-mono);width:100%;background:var(--bg-main);color:var(--ok-dark)">`
      : '<span style="color:var(--text-tertiary);font-size:11px">—</span>';
      
    return `
      <tr>
        <td><span style="font-size:11px; color:var(--text-secondary);">${esc(r.sourceFile || '')}</span></td>
        <td><span class="badge-bpmn type-${r.type}">${esc(r.typeLabel)}</span></td>
        <td><span class="mono" style="font-weight:600; font-size:11px;">${esc(r.id)}</span></td>
        <td><span style="font-size:12px;">${esc(r.name || '[Sans nom]')}</span></td>
        <td><span class="badge ${r.status === 'valid' ? 'ok' : r.status === 'warn' ? 'warn' : 'err'}">${stLabel[r.status]}</span></td>
        <td>${issuesHTML}</td>
        <td>${suggestionHTML}</td>
      </tr>
    `;
  }).join('');
  
  renderBpmnNamingPagination(totalPages);
}

function renderBpmnNamingPagination(totalPages) {
  const container = document.getElementById('bpmnPaginationControls');
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <select class="srt" onchange="changeBpmnItemsPerPage(this.value)" style="margin-right:4px; height:34px;">
      <option value="10" ${bpmnNamingItemsPerPage === 10 ? 'selected' : ''}>10 / page</option>
      <option value="20" ${bpmnNamingItemsPerPage === 20 ? 'selected' : ''}>20 / page</option>
      <option value="50" ${bpmnNamingItemsPerPage === 50 ? 'selected' : ''}>50 / page</option>
      <option value="100" ${bpmnNamingItemsPerPage === 100 ? 'selected' : ''}>100 / page</option>
    </select>
    <button class="btn-ghost" style="padding:4px 8px" onclick="changeBpmnPage(bpmnNamingPage - 1)" ${bpmnNamingPage === 1 ? 'disabled' : ''}>Préc.</button>
    <span style="font-size:12px; font-weight:500; color:var(--text-secondary);"> ${bpmnNamingPage} / ${totalPages} </span>
    <button class="btn-ghost" style="padding:4px 8px" onclick="changeBpmnPage(bpmnNamingPage + 1)" ${bpmnNamingPage === totalPages ? 'disabled' : ''}>Suiv.</button>
  `;
}

window.changeBpmnPage = function(p) { bpmnNamingPage = p; renderBpmnNamingTable(); };
window.changeBpmnItemsPerPage = function(val) { bpmnNamingItemsPerPage = parseInt(val, 10); bpmnNamingPage = 1; renderBpmnNamingTable(); };

window.onBpmnSearch = function() {
  const input = document.getElementById('bpmnSearchInput');
  bpmnNamingSearch = input ? input.value : '';
  bpmnNamingPage = 1;
  renderBpmnNamingTable();
};

window.onBpmnSortChange = function() {
  const sel = document.getElementById('bpmnSortSel');
  if (sel) {
    bpmnNamingSort.key = sel.value;
    bpmnNamingPage = 1;
    renderBpmnNamingTable();
  }
};

window.sortBpmnResults = function(k) {
  if (bpmnNamingSort.key === k) bpmnNamingSort.dir *= -1;
  else {
    bpmnNamingSort.key = k;
    bpmnNamingSort.dir = 1;
  }
  bpmnNamingPage = 1;
  
  // Set dropdown value
  const sel = document.getElementById('bpmnSortSel');
  if (sel) sel.value = k;
  
  renderBpmnNamingTable();
};

window.setBpmnFilter = function(f) {
  bpmnNamingFilter = f;
  bpmnNamingPage = 1;
  updateBpmnPills();
  renderBpmnNamingTable();
};

window.updateBpmnSuggestion = function(idx, val) {
  bpmnNamingElements[idx].editedSuggestion = val;
};

// ==========================================
//   BPMN CONFIGURATION CRUD LOGIC
// ==========================================

function renderBpmnConfigRules() {
  const tbody = document.getElementById('bpmnRulesTableBody');
  if (!tbody) return;
  
  const targetLabels = {
    'process-id': 'Process ID',
    'process-name': 'Nom de processus',
    'task': 'Tâche / Activité',
    'subprocess': 'Sous-processus',
    'gateway-divergent': 'Gateway Divergente',
    'gateway-parallel': 'Gateway Parallel (AND)',
    'sequence-flow': 'Transition (Flow)',
    'event-start': 'Event Début',
    'event-catch': 'Event Attente',
    'event-end': 'Event Fin',
    'event-boundary': 'Event Bordure',
    'message': 'Message',
    'signal': 'Signal',
    'variable': 'Variable',
    'variable-collection': 'Variable Collection'
  };
  
  tbody.innerHTML = bpmnRules.map((rule, idx) => `
    <tr>
      <td style="text-align:center;">
        <input type="checkbox" id="rule_bpmn_active_${idx}" ${rule.enabled ? 'checked' : ''} onchange="toggleBpmnRuleEnabled(${idx}, this.checked)">
      </td>
      <td><strong>${esc(rule.label)}</strong></td>
      <td><span class="badge-bpmn type-${rule.target}">${esc(targetLabels[rule.target] || rule.target)}</span></td>
      <td><span style="font-size:12px;color:var(--text-secondary);">${esc(rule.desc)}</span></td>
      <td><span class="badge ${rule.severity === 'err' ? 'err' : 'warn'}">${rule.severity === 'err' ? 'Erreur (Critique)' : 'Avertissement'}</span></td>
      <td><code style="font-size:11px;font-family:var(--font-mono);">${rule.type === 'regex' ? esc(rule.pattern) : 'Fonction custom'}</code></td>
      <td style="text-align:center;">
        <div style="display:flex; gap:6px; justify-content:center;">
          <button class="edit-rule-btn" onclick="openEditBpmnRuleModal(${idx})">Modifier</button>
          <button class="delete-rule-btn" onclick="deleteBpmnRule(${idx})">Suppr.</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.resetBpmnRules = function() {
  if (confirm("Êtes-vous sûr de vouloir réinitialiser les règles de nommage BPMN par défaut ?")) {
    resetBpmnRulesToDefault();
    renderBpmnConfigRules();
    renderBpmnNamingImportRules();
    alert("Les règles de nommage ont été réinitialisées !");
  }
};

window.deleteBpmnRule = function(idx) {
  if (confirm(`Êtes-vous sûr de vouloir supprimer la règle "${bpmnRules[idx].label}" ?`)) {
    bpmnRules.splice(idx, 1);
    saveBpmnRules();
    renderBpmnConfigRules();
    renderBpmnNamingImportRules();
  }
};

window.openAddBpmnRuleModal = function() {
  document.getElementById('bpmnModalTitle').textContent = "Ajouter une règle de nommage";
  document.getElementById('bpmnModalRuleId').value = "";
  document.getElementById('bpmnRuleForm').reset();
  toggleBpmnRuleTypeField('regex');
  document.getElementById('bpmnRuleModal').style.display = 'flex';
};

window.openEditBpmnRuleModal = function(idx) {
  const rule = bpmnRules[idx];
  document.getElementById('bpmnModalTitle').textContent = "Modifier la règle de nommage";
  document.getElementById('bpmnModalRuleId').value = idx;
  document.getElementById('bpmnRuleLabel').value = rule.label;
  document.getElementById('bpmnRuleDesc').value = rule.desc;
  document.getElementById('bpmnRuleTarget').value = rule.target;
  document.getElementById('bpmnRuleSeverity').value = rule.severity;
  document.getElementById('bpmnRuleType').value = rule.type;
  document.getElementById('bpmnRulePattern').value = rule.pattern || "";
  document.getElementById('bpmnRuleError').value = rule.errorMessage;
  
  toggleBpmnRuleTypeField(rule.type);
  document.getElementById('bpmnRuleModal').style.display = 'flex';
};

window.closeBpmnRuleModal = function() {
  document.getElementById('bpmnRuleModal').style.display = 'none';
};

window.toggleBpmnRuleTypeField = function(val) {
  const group = document.getElementById('bpmnRulePatternGroup');
  const input = document.getElementById('bpmnRulePattern');
  if (group && input) {
    if (val === 'regex') {
      group.style.display = 'block';
      input.setAttribute('required', 'required');
    } else {
      group.style.display = 'none';
      input.removeAttribute('required');
    }
  }
};

window.saveBpmnRuleForm = function(e) {
  if (e) e.preventDefault();
  
  const idVal = document.getElementById('bpmnModalRuleId').value;
  const label = document.getElementById('bpmnRuleLabel').value.trim();
  const desc = document.getElementById('bpmnRuleDesc').value.trim();
  const target = document.getElementById('bpmnRuleTarget').value;
  const severity = document.getElementById('bpmnRuleSeverity').value;
  const type = document.getElementById('bpmnRuleType').value;
  const pattern = document.getElementById('bpmnRulePattern').value.trim();
  const errorMessage = document.getElementById('bpmnRuleError').value.trim();
  
  const newRule = {
    id: idVal !== "" ? bpmnRules[parseInt(idVal)].id : 'rule_' + Date.now(),
    label,
    desc,
    target,
    severity,
    type,
    pattern: type === 'regex' ? pattern : null,
    errorMessage,
    enabled: idVal !== "" ? bpmnRules[parseInt(idVal)].enabled : true
  };
  
  if (idVal !== "") {
    bpmnRules[parseInt(idVal)] = newRule;
  } else {
    bpmnRules.push(newRule);
  }
  
  saveBpmnRules();
  renderBpmnConfigRules();
  renderBpmnNamingImportRules();
  closeBpmnRuleModal();
};

// ==========================================
//   BPMN NAMING EXPORTS & XML WRITER
// ==========================================

window.exportBpmnCSV = function() {
  if (!bpmnNamingElements.length) { alert("Le rapport est vide."); return; }
  const header = 'Fichier source,Type,ID technique,Libellé actuel,Statut,Problèmes,Suggestion\n';
  const body = bpmnNamingElements.map(r => [
    qq(r.sourceFile || ''),
    qq(r.typeLabel),
    qq(r.id),
    qq(r.name || ''),
    qq(r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme'),
    qq(r.issues.map(i => i.msg).join('; ')),
    qq(r.editedSuggestion || '')
  ].join(',')).join('\n');
  dl(header + body, 'bpmn_naming_audit_rapport.csv', 'text/csv');
};

window.exportBpmnExcel = function() {
  if (!window.XLSX) { alert('Bibliothèque XLSX non chargée'); return; }
  if (!bpmnNamingElements.length) { alert("Le rapport est vide."); return; }
  
  const data = [['Fichier source', 'Type d\'élément', 'ID technique', 'Libellé actuel', 'Statut', 'Problèmes', 'Suggestion corrective']];
  bpmnNamingElements.forEach(r => data.push([
    r.sourceFile || '',
    r.typeLabel,
    r.id,
    r.name || '',
    r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme',
    r.issues.map(i => i.msg).join('; '),
    r.editedSuggestion || ''
  ]));
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Nommage');
  XLSX.writeFile(wb, 'bpmn_naming_audit_rapport.xlsx');
};

window.downloadCorrectedBpmnFile = async function() {
  if (!bpmnNamingFiles.length) {
    alert("Aucun fichier BPMN n'est actuellement chargé.");
    return;
  }

  const serializer = new XMLSerializer();
  const outputs = [];

  for (const bpmnFile of bpmnNamingFiles) {
    const fileElements = bpmnNamingElements.filter(el => el.sourceFile === bpmnFile.name);
    const clonedDoc = bpmnFile.doc.cloneNode(true);
    const updatedXmlText = generateCorrectedBpmnXml(clonedDoc, fileElements);
    const correctedFileName = bpmnFile.name
      .replace(/\.bpmn$/i, '_naming_corrected.bpmn')
      .replace(/\.xml$/i, '_naming_corrected.xml');
    outputs.push({ name: correctedFileName, content: serializer.serializeToString(clonedDoc) || updatedXmlText });
  }

  if (outputs.length === 1 || !window.JSZip) {
    outputs.forEach((item, index) => setTimeout(() => dl(item.content, item.name, 'application/xml'), index * 150));
    if (outputs.length > 1 && !window.JSZip) alert("Les fichiers corrigés seront téléchargés séparément (JSZip n'est pas disponible).");
    return;
  }

  const zip = new JSZip();
  outputs.forEach(item => zip.file(item.name, item.content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bpmn_naming_corrected.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};




