// ---------- Suite de Sécurité & Sanitisation Globale (XSS, CSV/Formula Injection, JSON) ----------
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}
const escHtml = esc;
window.esc = esc;
window.escHtml = escHtml;

function escAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
window.escAttr = escAttr;

function escJs(s) {
  if (s == null) return "''";
  return JSON.stringify(String(s));
}
window.escJs = escJs;

// Protection contre l'injection de formules CSV/Excel (CWE-1236)
function sanitizeFormula(s) {
  if (s == null) return '';
  let str = String(s);
  if (/^[=+\-@\t\r;]/.test(str)) {
    return "'" + str;
  }
  return str;
}
window.sanitizeFormula = sanitizeFormula;

function sanitizeAoA(aoa) {
  if (!Array.isArray(aoa)) return [];
  return aoa.map(row => {
    if (!Array.isArray(row)) return row;
    return row.map(cell => typeof cell === 'string' ? sanitizeFormula(cell) : cell);
  });
}
window.sanitizeAoA = sanitizeAoA;

function qq(s) {
  if (s == null) return '""';
  const clean = sanitizeFormula(s);
  return '"' + String(clean).replace(/"/g, '""') + '"';
}
window.qq = qq;

function dl(content, filename, mime) {
  const a = document.createElement('a');
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
window.dl = dl;

// Limite maximale de taille de fichier autorisée (25 Mo)
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
function validateFileSize(file) {
  if (file && file.size > MAX_FILE_SIZE_BYTES) {
    alert(`Le fichier "${file.name}" dépasse la limite de sécurité autorisée de 25 Mo (taille: ${(file.size / (1024 * 1024)).toFixed(1)} Mo).`);
    return false;
  }
  return true;
}
window.validateFileSize = validateFileSize;

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

// Multi-BPMN Batch State (1 à N BPMN)
let bpmnBatch = []; // Array of { id, fileName, rawXml, xmlDoc, processId, processName, activities: [], variables: [], callActivities: [], isRoot: true }
let procHierarchyData = { roots: [], allProcesses: {}, callRelations: [], missingSubprocesses: [], maxDepth: 1 };
let currentProcRelSubView = 'tree'; // 'tree', 'graph', 'matrix'
let filterProcVal = 'all';
let filterRoleVal = 'all';
let selectedVarForInspection = null;
let procNetworkGraph = null;

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


const MAX_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 heures

// ---------- Initialization ----------
(async function() {
  checkAuth();

  // Configurer Chart.js par défaut pour le thème sombre
  if (window.Chart) {
    Chart.defaults.color = '#475569';
    Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.08)';
    Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif";
  }

  const sensitivityLevelsEl = document.getElementById('sensitivityLevels');
  if (sensitivityLevelsEl) sensitivityLevelsEl.value = DEFAULT_SENSITIVITY.join('\n');
  const teamTagsEl = document.getElementById('teamTags');
  if (teamTagsEl) teamTagsEl.value = DEFAULT_TEAMS.join('\n');

  // Application exclusive du thème clair Paprika AuditFlow Pro
  document.body.className = '';
  localStorage.removeItem('pda_camunda_theme');
  updateChartColorsForTheme();

  // Initialiser l'état de la barre de menu (réduite/agrandie)
  initSidebarState();

  try {
    analysisHistory = await dbLoadAll();
    renderHistory();
  } catch(e) { console.error("Erreur de chargement DB", e); }
})();

// ---------- Gestion de la Réduction de la Sidebar ----------
window.toggleSidebar = function() {
  const sidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('paprika_sidebar_collapsed', isCollapsed ? 'true' : 'false');

  // Ajuster le graphe réseau si visible
  setTimeout(() => {
    if (window.networkGraph && typeof window.networkGraph.fit === 'function') {
      window.networkGraph.fit();
    }
    if (window.subNetworkGraph && typeof window.subNetworkGraph.fit === 'function') {
      window.subNetworkGraph.fit();
    }
  }, 280);
};

function initSidebarState() {
  const isCollapsed = localStorage.getItem('paprika_sidebar_collapsed') === 'true';
  const sidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
  if (sidebar && isCollapsed) {
    sidebar.classList.add('collapsed');
  }
}

// Raccourci clavier Ctrl+B / Cmd+B pour basculer la sidebar
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    toggleSidebar();
  }
});

function updateChartColorsForTheme() {
  if (!window.Chart) return;
  Chart.defaults.color = '#475569';
  Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.06)';
}

window.changeTheme = function() {
  document.body.className = '';
  updateChartColorsForTheme();
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
     alert('Veuillez importer un ou plusieurs fichiers BPMN, un fichier Excel ou saisir des variables.');
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
             fileName: rawFileData.length ? document.getElementById('uploadTitle').textContent : '',
             role: 'consumer',
             row: index + 1
           });
        }
    });
  } else {
    tempRows=manual.split('\n').map((l,i)=>({
      name:l.trim(),
      parentProcess:'Manuel',
      callingProcess:'',
      fileName:'Saisie manuelle',
      role:'consumer',
      row:i+1
    })).filter(r=>r.name);
  }

  if(tempRows.length === 0){
     alert("Aucune variable trouvée.");
     return;
  }

  // Afficher le spinner de chargement animé Bouygues Telecom
  showAppLoader({
    durationMs: 2000
  });

  // Attendre 2 secondes
  await new Promise(resolve => setTimeout(resolve, 2000));

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
    
    return {
      ...r,
      issues,
      status,
      suggested,
      editedSuggestion: suggested,
      sensitivity,
      team: 'Non assignée',
      role: r.role || 'consumer'
    };
  });

  const histItem = {
    id: Date.now(),
    date: new Date(),
    count: allRows.length,
    valid: allRows.filter(r=>r.status==='valid').length,
    label: isBPMNMode ? (bpmnBatch.length > 1 ? `${bpmnBatch.length} fichiers BPMN` : bpmnFileName) : rawFileData.length ? document.getElementById('uploadTitle').textContent : 'Saisie manuelle',
    isBPMNMode: isBPMNMode,
    bpmnXmlText: isBPMNMode && bpmnXmlDoc ? new XMLSerializer().serializeToString(bpmnXmlDoc) : null,
    bpmnFileName: isBPMNMode ? bpmnFileName : null,
    allRows: JSON.parse(JSON.stringify(allRows))
  };

  activeHistoryId = histItem.id;

  analysisHistory.unshift(histItem);
  try {
    await dbSave(histItem);
  } catch(e) { console.error("Erreur de sauvegarde DB", e); }

  currentFilter='all';searchVal='';currentSort={key:'status',dir:1};currentPage=1;
  filterProcVal='all';filterRoleVal='all';

  // Activer les onglets
  document.getElementById('resultsTab').style.display='';
  document.getElementById('dashTab').style.display='';
  document.getElementById('graphTab').style.display='';
  document.getElementById('rankTab').style.display='';
  const dupTab = document.getElementById('duplicatesTab');
  if (dupTab) dupTab.style.display = '';
  document.getElementById('resetBtn').style.display='';

  const procRelTab = document.getElementById('procRelTab');
  if (procRelTab) {
    procRelTab.style.display = isBPMNMode ? '' : 'none';
  }

  const bpmnBtn = document.getElementById('downloadBpmnBtn');
  if (bpmnBtn) {
    bpmnBtn.style.display = isBPMNMode ? 'inline-block' : 'none';
    bpmnBtn.textContent = bpmnBatch.length > 1 ? '📦 Auto-Fix & Télécharger Pack ZIP' : '✨ Auto-Fix & Exporter BPMN';
  }

  if (isBPMNMode) {
    renderProcessHierarchy();

    const deadVars = allRows.filter(r => r.role === 'dead');
    const ghostBanner = document.getElementById('ghostVariablesBanner');
    if (ghostBanner) {
      ghostBanner.style.display = deadVars.length > 0 ? 'block' : 'none';
      const gCountEl = document.getElementById('ghostVarTitle');
      if (gCountEl) gCountEl.textContent = `${deadVars.length} Variable(s) Morte(s) Détectée(s) dans le lot BPMN`;
    }

    const autofixBanner = document.getElementById('autofixBanner');
    if (autofixBanner) {
      autofixBanner.style.display = 'flex';
    }
  } else {
    const autofixBanner = document.getElementById('autofixBanner');
    if (autofixBanner) autofixBanner.style.display = 'none';
    const ghostBanner = document.getElementById('ghostVariablesBanner');
    if (ghostBanner) ghostBanner.style.display = 'none';
  }

  // Analyse et alerte des doublons & cohérence
  const dupAnalysis = runDuplicatesAnalysis();
  const dupBanner = document.getElementById('duplicatesAlertBanner');
  if (dupBanner) {
    if (dupAnalysis && dupAnalysis.clusters.length > 0) {
      dupBanner.style.display = 'block';
      const bTitle = document.getElementById('duplicatesBannerTitle');
      const bDesc = document.getElementById('duplicatesBannerDesc');
      if (bTitle) bTitle.textContent = `${dupAnalysis.totalClustersCount} Cluster(s) de Doublons & Incohérences Sémantiques Détecté(s)`;
      if (bDesc) bDesc.textContent = `${dupAnalysis.totalDuplicatesCount} variable(s) impactée(s) dont ${dupAnalysis.interProcessConflictsCount} conflit(s) inter-processus à harmoniser.`;
    } else {
      dupBanner.style.display = 'none';
    }
  }

  initGraphFilters();
  resetDashboardFilters();
  switchTab('results');
  renderResults();
  renderDashboard();
  renderRanking();
  renderDuplicatesUI();
  renderHistory();
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
    <div class="stat"><div class="val">${total}</div><div class="lbl">Total Variables</div></div>
    <div class="stat ok"><div class="val">${valid}</div><div class="lbl">Conformes</div></div>
    <div class="stat err"><div class="val">${invalid}</div><div class="lbl">Non conformes</div></div>
    <div class="stat warn"><div class="val">${warn}</div><div class="lbl">Avertissements</div></div>
    <div class="stat info"><div class="val">${score}%</div><div class="lbl">Score Global</div></div>
  `;
  document.getElementById('scoreBar').innerHTML=`
    <span class="score-label">Score de conformité global</span>
    <div class="score-track"><div class="score-fill" style="width:${score}%;background:${scoreColor}"></div></div>
    <span class="score-val" style="color:${scoreColor}">${score}%</span>
  `;

  // Récupérer la liste des processus uniques
  const uniqueProcesses = Array.from(new Set(allRows.map(r => r.parentProcess).filter(Boolean)));

  const procOptionsHTML = uniqueProcesses.map(p => 
    `<option value="${esc(p)}" ${filterProcVal === p ? 'selected' : ''}>Proc : ${esc(p)}</option>`
  ).join('');

  document.getElementById('toolbarEl').innerHTML=`
    <button class="pill active" id="pAll" onclick="setFilter('all')">Tous (${total})</button>
    <button class="pill p-ok" id="pOk" onclick="setFilter('valid')">Conformes (${valid})</button>
    <button class="pill p-err" id="pErr" onclick="setFilter('invalid')">Non conformes (${invalid})</button>
    <button class="pill p-warn" id="pWarn" onclick="setFilter('warn')">Avertissements (${warn})</button>
    
    <select class="srt" id="filterProcSel" onchange="onProcFilterChange()" style="max-width:180px;">
      <option value="all">Tous les processus</option>
      ${procOptionsHTML}
    </select>

    <select class="srt" id="filterRoleSel" onchange="onRoleFilterChange()" style="max-width:180px;">
      <option value="all" ${filterRoleVal==='all'?'selected':''}>Tous les rôles</option>
      <option value="producer" ${filterRoleVal==='producer'?'selected':''}>🟢 Producteur (Write)</option>
      <option value="consumer" ${filterRoleVal==='consumer'?'selected':''}>🔵 Consommateur (Read)</option>
      <option value="inout" ${filterRoleVal==='inout'?'selected':''}>🟣 Flux In/Out</option>
      <option value="dead" ${filterRoleVal==='dead'?'selected':''}>👻 Variable Morte</option>
      <option value="orphan" ${filterRoleVal==='orphan'?'selected':''}>⚠️ Non Initialisée</option>
    </select>

    <input class="srch" placeholder="Rechercher une variable..." id="searchInput" oninput="onSearch()" value="${esc(searchVal)}">
    
    <select class="srt" id="sortSel" onchange="onSortChange()">
      <option value="status">Trier : statut</option>
      <option value="name">Trier : nom</option>
      <option value="issues">Trier : nb problèmes</option>
      <option value="role">Trier : rôle cycle de vie</option>
    </select>
  `;
  updatePills();
  renderTable();
}

function setFilter(f){currentFilter=f;currentPage=1;updatePills();renderTable()}
function onProcFilterChange(){filterProcVal=document.getElementById('filterProcSel')?.value||'all';currentPage=1;renderTable()}
function onRoleFilterChange(){filterRoleVal=document.getElementById('filterRoleSel')?.value||'all';currentPage=1;renderTable()}
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
    if(filterProcVal!=='all'&&r.parentProcess!==filterProcVal)return false;
    if(filterRoleVal!=='all'&&r.role!==filterRoleVal)return false;
    if(search&&!r.name.toLowerCase().includes(search)&&!(r.editedSuggestion||'').toLowerCase().includes(search))return false;
    return true;
  });

  rows.sort((a,b)=>{
    let av,bv;
    if(currentSort.key==='status'){av=statusOrder[a.status];bv=statusOrder[b.status]}
    else if(currentSort.key==='issues'){av=a.issues.length;bv=b.issues.length}
    else if(currentSort.key==='role'){av=a.role||'';bv=b.role||''}
    else if(currentSort.key==='parentProcess'){av=a.parentProcess||'';bv=b.parentProcess||''}
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

  tbody.innerHTML=paginatedRows.map((r,i)=>{
    const globalIdx = allRows.indexOf(r);
    const lifecycleBadge = getLifecycleBadgeHTML(r.role);

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="mono" style="font-weight:700; cursor:pointer; color:var(--brand-primary);" data-var="${escAttr(r.name)}" onclick="openVarInspectorFromEl(this)" title="Cliquer pour ouvrir l'inspecteur de traçabilité">
              ${escHtml(r.name)}
            </span>
            <button class="btn-ghost" data-var="${escAttr(r.name)}" onclick="openVarInspectorFromEl(this)" style="padding:1px 5px; font-size:11px; border-radius:3px;" title="Inspecter le cycle de vie">🔍</button>
          </div>
        </td>
        <td><span class="badge ${r.status==='valid'?'ok':r.status==='warn'?'warn':'err'}">${stLabel[r.status]}</span></td>
        <td>${r.issues.length?`<div class="iss-list">${r.issues.map(iss=>`<div class="iss-item"><span class="iss-dot ${iss.sev==='warn'?'w':''}">●</span>${escHtml(iss.msg)}</div>`).join('')}</div>`:'<span style="color:var(--text-tertiary);font-size:11px">—</span>'}</td>
        <td>${r.status!=='valid'?`<input type="text" class="sug-input" value="${escAttr(r.editedSuggestion)}" onchange="updateSug(${globalIdx},this.value)">`:'<span style="color:var(--text-tertiary);font-size:11px">—</span>'}</td>
        <td>${lifecycleBadge}</td>
        <td>
          <div style="font-size:11.5px; font-weight:600; color:var(--text-primary);">${escHtml(r.parentProcess||'')}</div>
          ${r.fileName ? `<div style="font-size:10px; color:var(--text-tertiary);">${escHtml(r.fileName)}</div>` : ''}
        </td>
        <td><span style="font-size:11px;color:var(--text-secondary)">${escHtml(r.callingProcess||'')}</span></td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn-ghost" data-var="${escAttr(r.name)}" onclick="openVarInspectorFromEl(this)" style="font-size:11px; padding:3px 7px;">🔍 Trace</button>
            ${r.status!=='valid'&&r.editedSuggestion?`<button class="copy-btn" data-sug="${escAttr(r.editedSuggestion)}" onclick="copySugFromEl(this)">Copier</button>`:''}
          </div>
        </td>
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

  const nodeTextColor = '#0f172a';
  const edgeLineColor = '#94a3b8';

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

// ==========================================================================
// ---------- Export Avancé Cartographie & Relations Processus ➔ Variables ----------
// ==========================================================================

let currentExportFormat = 'excel';

function setExportFormat(fmt) {
  currentExportFormat = fmt;
  const cards = ['excel', 'csv', 'json', 'pdf'];
  cards.forEach(c => {
    const el = document.getElementById(`fmtCard_${c}`);
    if (el) el.classList.toggle('active', c === fmt);

    const opts = document.getElementById(`exportFormatOpts_${c}`);
    if (opts) opts.style.display = (c === fmt) ? 'block' : 'none';
  });

  const btn = document.getElementById('btnExecuteGraphExport');
  if (btn) {
    const labels = {
      excel: '📥 Télécharger l\'export (Excel .xlsx)',
      csv: '📥 Télécharger l\'export (CSV)',
      json: '📥 Télécharger l\'export (JSON)',
      pdf: '📑 Générer le Dossier PDF / Imprimer'
    };
    btn.innerHTML = `<span>${labels[fmt] || '📥 Télécharger l\'export'}</span>`;
  }

  updateGraphExportPreview();
}

function toggleAllExportProps(checked) {
  const propIds = [
    'expProp_varName', 'expProp_status', 'expProp_parentProcess',
    'expProp_callingProcess', 'expProp_callRole', 'expProp_suggestion',
    'expProp_issues', 'expProp_team', 'expProp_sensitivity', 'expProp_fileName'
  ];
  propIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
  updateGraphExportPreview();
}

function resetExportPropsDefault() {
  const defaults = {
    expProp_varName: true,
    expProp_status: true,
    expProp_parentProcess: true,
    expProp_callingProcess: true,
    expProp_callRole: true,
    expProp_suggestion: true,
    expProp_issues: true,
    expProp_team: false,
    expProp_sensitivity: false,
    expProp_fileName: true
  };
  Object.keys(defaults).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = defaults[id];
  });
  updateGraphExportPreview();
}

function getSelectedExportProps() {
  return {
    varName: document.getElementById('expProp_varName')?.checked ?? true,
    status: document.getElementById('expProp_status')?.checked ?? true,
    parentProcess: document.getElementById('expProp_parentProcess')?.checked ?? true,
    callingProcess: document.getElementById('expProp_callingProcess')?.checked ?? true,
    callRole: document.getElementById('expProp_callRole')?.checked ?? true,
    suggestion: document.getElementById('expProp_suggestion')?.checked ?? true,
    issues: document.getElementById('expProp_issues')?.checked ?? true,
    team: document.getElementById('expProp_team')?.checked ?? false,
    sensitivity: document.getElementById('expProp_sensitivity')?.checked ?? false,
    fileName: document.getElementById('expProp_fileName')?.checked ?? true
  };
}

function getFilteredGraphRelationsData() {
  const procFilters = getSelectedCheckboxValues('procList');
  const varFilters = getSelectedCheckboxValues('varList');
  const nonConformOnly = document.getElementById('graphNonConformOnly')?.checked || false;

  const statusFilter = document.getElementById('expFilterStatus')?.value || 'all';
  const linkTypeFilter = document.getElementById('expFilterLinkType')?.value || 'all';

  const relations = [];
  const uniqueVarsSet = new Set();
  const uniqueProcSet = new Set();

  (allRows || []).forEach(r => {
    if (nonConformOnly && r.status === 'valid') return;

    if (statusFilter === 'valid' && r.status !== 'valid') return;
    if (statusFilter === 'non_valid' && r.status === 'valid') return;
    if (statusFilter === 'invalid' && r.status !== 'invalid') return;
    if (statusFilter === 'warn' && r.status !== 'warn') return;

    const vName = (r.name || '').trim();
    let parent = (r.parentProcess || '').trim();
    let calling = (r.callingProcess || '').trim();

    // Si aucun processus parent ou appelant explicite, fallback sur le nom du fichier ou processus par défaut
    if (!parent && !calling) {
      parent = (r.fileName || bpmnFileName || 'Processus Principal').replace(/\.bpmn$/i, '');
    }

    if (varFilters.length > 0 && !varFilters.includes(vName)) return;
    if (procFilters.length > 0 && !procFilters.includes(parent) && !procFilters.includes(calling)) return;

    if (linkTypeFilter === 'caller_only' && !calling) return;
    if (linkTypeFilter === 'parent_only' && !parent) return;

    if (vName) uniqueVarsSet.add(vName);
    if (parent) uniqueProcSet.add(parent);
    if (calling) uniqueProcSet.add(calling);

    let linkDesc = 'Définition & Exécution';
    if (parent && calling) linkDesc = 'Inter-Processus (Parent & Appelant)';
    else if (calling && !parent) linkDesc = 'Invocation Call Activity';

    relations.push({
      name: vName,
      status: r.status || 'valid',
      parentProcess: parent || '-',
      callingProcess: calling || '-',
      linkType: linkDesc,
      role: r.role || 'local',
      roleLabel: typeof getLifecycleLabel === 'function' ? getLifecycleLabel(r.role) : (r.role || 'Standard'),
      suggestion: r.editedSuggestion || r.suggestion || '',
      issues: (r.issues || []).map(i => i.msg || i).join('; '),
      team: r.team || 'Non assignée',
      sensitivity: r.sensitivity || 'Public',
      fileName: r.fileName || bpmnFileName || '-'
    });
  });

  const totalValid = relations.filter(r => r.status === 'valid').length;
  const totalWarn = relations.filter(r => r.status === 'warn').length;
  const totalInvalid = relations.filter(r => r.status === 'invalid').length;
  const conformityScore = relations.length > 0 ? Math.round((totalValid / relations.length) * 100) : 0;

  return {
    relations,
    uniqueVars: Array.from(uniqueVarsSet),
    uniqueProcesses: Array.from(uniqueProcSet),
    totalValid,
    totalWarn,
    totalInvalid,
    conformityScore,
    filtersInfo: {
      graphNonConformOnly: nonConformOnly,
      selectedProcessesCount: procFilters.length,
      selectedVarsCount: varFilters.length,
      statusFilter,
      linkTypeFilter
    }
  };
}

function openGraphExportModal() {
  const modal = document.getElementById('graphExportModal');
  if (!modal) {
    console.error("Modal #graphExportModal introuvable dans le document.");
    alert("Impossible d'ouvrir la fenêtre d'exportation (élément introuvable).");
    return;
  }

  // Si aucune donnée n'est chargée, avertir gentiment
  if (!allRows || allRows.length === 0) {
    alert("Aucune variable chargée pour le moment. Veuillez d'abord importer un fichier BPMN ou Excel d'audit.");
    return;
  }

  try {
    const data = getFilteredGraphRelationsData();

    // Mise à jour des badges de périmètre
    const relCountEl = document.getElementById('exportScopeRelationsCount');
    const varCountEl = document.getElementById('exportScopeVarsCount');
    const procCountEl = document.getElementById('exportScopeProcCount');
    const filterDescEl = document.getElementById('exportScopeFilterText');

    if (relCountEl) relCountEl.textContent = `⚡ ${data.relations.length} relation${data.relations.length > 1 ? 's' : ''}`;
    if (varCountEl) varCountEl.textContent = `📦 ${data.uniqueVars.length} variable${data.uniqueVars.length > 1 ? 's' : ''}`;
    if (procCountEl) procCountEl.textContent = `🔄 ${data.uniqueProcesses.length} processus`;

    if (filterDescEl) {
      const f = data.filtersInfo;
      const parts = [];
      if (f.graphNonConformOnly) parts.push("Non conformes uniquement");
      if (f.selectedProcessesCount > 0) parts.push(`${f.selectedProcessesCount} processus ciblé(s)`);
      if (f.selectedVarsCount > 0) parts.push(`${f.selectedVarsCount} variable(s) ciblée(s)`);
      filterDescEl.textContent = parts.length > 0 ? `Filtres actifs : ${parts.join(' • ')}` : "Toutes les relations du graphe (aucun filtre restrictif)";
    }

    setExportFormat(currentExportFormat || 'excel');
    modal.style.display = 'flex';
    updateGraphExportPreview();
  } catch (e) {
    console.error("Erreur lors de l'ouverture de la modale d'export :", e);
    modal.style.display = 'flex';
  }
}

function closeGraphExportModal() {
  const modal = document.getElementById('graphExportModal');
  if (modal) modal.style.display = 'none';
}

function updateGraphExportPreview() {
  const data = getFilteredGraphRelationsData();
  const props = getSelectedExportProps();

  const previewCountEl = document.getElementById('exportPreviewCount');
  if (previewCountEl) {
    previewCountEl.innerHTML = `Aperçu des données (<strong>${data.relations.length}</strong> relation${data.relations.length > 1 ? 's' : ''} filtrée${data.relations.length > 1 ? 's' : ''}, affichage des 5 premières)`;
  }

  const thead = document.getElementById('exportPreviewHead');
  const tbody = document.getElementById('exportPreviewBody');
  if (!thead || !tbody) return;

  // En-têtes
  const headers = [];
  if (props.varName) headers.push('Variable');
  if (props.status) headers.push('Statut');
  if (props.parentProcess) headers.push('Proc. Parent');
  if (props.callingProcess) headers.push('Proc. Appelant');
  if (props.callRole) headers.push('Rôle / Flux');
  if (props.suggestion) headers.push('Suggestion');
  if (props.issues) headers.push('Anomalies');
  if (props.team) headers.push('Équipe');
  if (props.sensitivity) headers.push('Sensibilité');
  if (props.fileName) headers.push('Fichier');

  thead.innerHTML = `<tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;

  if (data.relations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${Math.max(headers.length, 1)}" style="text-align:center; padding:20px; color:var(--text-tertiary);">Aucune relation ne correspond aux filtres sélectionnés.</td></tr>`;
    return;
  }

  const sample = data.relations.slice(0, 5);
  tbody.innerHTML = sample.map(r => {
    const statusBadge = r.status === 'valid'
      ? `<span class="badge ok">Conforme</span>`
      : (r.status === 'warn' ? `<span class="badge warn">Avertissement</span>` : `<span class="badge err">Non conforme</span>`);

    const cells = [];
    if (props.varName) cells.push(`<td style="font-family:var(--font-mono); font-weight:600; color:var(--brand-primary);">${esc(r.name)}</td>`);
    if (props.status) cells.push(`<td>${statusBadge}</td>`);
    if (props.parentProcess) cells.push(`<td>${esc(r.parentProcess)}</td>`);
    if (props.callingProcess) cells.push(`<td>${esc(r.callingProcess)}</td>`);
    if (props.callRole) cells.push(`<td><span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${esc(r.roleLabel)}</span></td>`);
    if (props.suggestion) cells.push(`<td style="font-family:var(--font-mono); color:#16a34a;">${esc(r.suggestion || '-')}</td>`);
    if (props.issues) cells.push(`<td style="color:var(--err); max-width:200px; overflow:hidden; text-overflow:ellipsis;" title="${esc(r.issues)}">${esc(r.issues || '-')}</td>`);
    if (props.team) cells.push(`<td>${esc(r.team)}</td>`);
    if (props.sensitivity) cells.push(`<td>${esc(r.sensitivity)}</td>`);
    if (props.fileName) cells.push(`<td style="font-size:10.5px; color:var(--text-tertiary);">${esc(r.fileName)}</td>`);

    return `<tr>${cells.join('')}</tr>`;
  }).join('');
}

function executeGraphExport() {
  const data = getFilteredGraphRelationsData();
  if (data.relations.length === 0) {
    alert("Aucune relation à exporter avec les filtres sélectionnés.");
    return;
  }

  const props = getSelectedExportProps();
  const btn = document.getElementById('btnExecuteGraphExport');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = `<span>⏳ Génération en cours...</span>`;

  try {
    if (currentExportFormat === 'excel') {
      generateGraphRelationsExcel(data, props);
    } else if (currentExportFormat === 'csv') {
      generateGraphRelationsCSV(data, props);
    } else if (currentExportFormat === 'json') {
      generateGraphRelationsJSON(data, props);
    } else if (currentExportFormat === 'pdf') {
      generateGraphRelationsPDF(data, props);
    }
  } catch (err) {
    console.error("Erreur lors de l'exportation des relations :", err);
    alert("Une erreur est survenue lors de la génération de l'export : " + (err.message || err));
  } finally {
    if (btn) btn.innerHTML = originalText;
  }
}

// ---------- Générateur 1 : Excel Multi-Feuilles Intelligent (.xlsx) ----------
function generateGraphRelationsExcel(data, props) {
  if (!window.XLSX) {
    alert("Bibliothèque SheetJS (XLSX) non disponible.");
    return;
  }

  const wb = XLSX.utils.book_new();
  const theme = document.getElementById('expExcelTheme')?.value || 'bouygues';
  const includeSummary = document.getElementById('expExcelIncludeSummary')?.checked ?? true;
  const includeMatrix = document.getElementById('expExcelIncludeMatrix')?.checked ?? true;
  const autofit = document.getElementById('expExcelAutofit')?.checked ?? true;
  const freezeHeader = document.getElementById('expExcelFreezeHeader')?.checked ?? true;

  const nowStr = new Date().toLocaleString('fr-FR');
  const dateFile = new Date().toISOString().slice(0, 10);

  // 1. Feuille de Synthèse & KPIs
  if (includeSummary) {
    const summaryAoa = [
      ['AUDITFLOW PRO - CARTOGRAPHIE DES RELATIONS PROCESSUS ➔ VARIABLES'],
      ['Date d\'extraction', nowStr],
      ['Périmètre Fichiers', bpmnBatch && bpmnBatch.length > 0 ? `${bpmnBatch.length} fichier(s) BPMN analysé(s)` : (bpmnFileName || 'Analyse en cours')],
      ['Thème Visuel Appliqué', theme.toUpperCase()],
      [],
      ['INDICATEURS CLÉS DE LA CARTOGRAPHIE', 'VALEUR', 'REMARQUE'],
      ['Total des Liaisons / Relations', data.relations.length, 'Nombre d\'occurrences Processus-Variables'],
      ['Variables Uniques Concernées', data.uniqueVars.length, 'Nombre distinct de variables identifiées'],
      ['Processus Concernés (Parents & Appelants)', data.uniqueProcesses.length, 'Nombre distinct de processus impliqués'],
      ['Score de Conformité Global', `${data.conformityScore}%`, 'Pourcentage de relations conformes'],
      ['Relations Conformes', data.totalValid, 'Variables respectant la convention'],
      ['Relations avec Avertissements', data.totalWarn, 'Conventions mineures à vérifier'],
      ['Relations Non Conformes (Erreurs)', data.totalInvalid, 'Non conformités bloquantes'],
      [],
      ['PARAMÈTRES DES FILTRES ACTIFS', 'ÉTAT'],
      ['Filtre Non Conformes Uniquement', data.filtersInfo.graphNonConformOnly ? 'Activé (Exclusion des conformes)' : 'Désactivé (Tous les statuts)'],
      ['Filtre Spécifique par Statut', data.filtersInfo.statusFilter.toUpperCase()],
      ['Filtre Type de Liaison', data.filtersInfo.linkTypeFilter.toUpperCase()],
      ['Processus Filtrés', data.filtersInfo.selectedProcessesCount > 0 ? `${data.filtersInfo.selectedProcessesCount} sélectionné(s)` : 'Tous les processus'],
      ['Variables Filtrées', data.filtersInfo.selectedVarsCount > 0 ? `${data.filtersInfo.selectedVarsCount} sélectionnée(s)` : 'Toutes les variables']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(sanitizeAoA(summaryAoa));
    if (autofit) {
      wsSummary['!cols'] = [
        { wch: 42 },
        { wch: 32 },
        { wch: 45 }
      ];
    }
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse & Périmètre');
  }

  // 2. Feuille Détail des Relations
  const headers = [];
  if (props.varName) headers.push('Variable Originale');
  if (props.status) headers.push('Statut de Conformité');
  if (props.parentProcess) headers.push('Processus Parent (Définition)');
  if (props.callingProcess) headers.push('Processus Appelant (Call Activity)');
  if (props.callRole) headers.push('Type de Liaison / Rôle');
  if (props.suggestion) headers.push('Suggestion Standard (camelCase)');
  if (props.issues) headers.push('Anomalies Détectées');
  if (props.team) headers.push('Équipe Propriétaire');
  if (props.sensitivity) headers.push('Niveau de Sensibilité');
  if (props.fileName) headers.push('Fichier Source');

  const rowsData = [headers];

  data.relations.forEach(r => {
    const row = [];
    const statusLabel = r.status === 'valid' ? 'Conforme' : (r.status === 'warn' ? 'Avertissement' : 'Non conforme');

    if (props.varName) row.push(r.name);
    if (props.status) row.push(statusLabel);
    if (props.parentProcess) row.push(r.parentProcess);
    if (props.callingProcess) row.push(r.callingProcess);
    if (props.callRole) row.push(r.roleLabel || r.linkType);
    if (props.suggestion) row.push(r.suggestion || '');
    if (props.issues) row.push(r.issues || 'Aucune anomalie');
    if (props.team) row.push(r.team || 'Non assignée');
    if (props.sensitivity) row.push(r.sensitivity || 'Public');
    if (props.fileName) row.push(r.fileName || '-');

    rowsData.push(row);
  });

  const wsDetails = XLSX.utils.aoa_to_sheet(sanitizeAoA(rowsData));

  // Auto-fit des colonnes
  if (autofit) {
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rowsData.forEach(r => {
        const val = r[colIdx] != null ? String(r[colIdx]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 65) };
    });
    wsDetails['!cols'] = colWidths;
  }

  // Auto-filter
  if (rowsData.length > 1) {
    wsDetails['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: headers.length - 1, r: rowsData.length - 1 }
      })
    };
  }

  // Freeze Header Panes
  if (freezeHeader) {
    wsDetails['!views'] = [{ state: 'frozen', ySplit: 1 }];
  }

  XLSX.utils.book_append_sheet(wb, wsDetails, 'Relations Processus-Variables');

  // 3. Feuille Matrice Croisée Pivot (Processus × Variables)
  if (includeMatrix && data.uniqueProcesses.length > 0 && data.uniqueVars.length > 0) {
    const sortedProcesses = [...data.uniqueProcesses].sort();
    const sortedVars = [...data.uniqueVars].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const matrixHeader = ['Variable', 'Statut Global', ...sortedProcesses, 'Total Processus Impliqués'];
    const matrixRows = [matrixHeader];

    sortedVars.forEach(v => {
      const varOccurrences = data.relations.filter(r => r.name === v);
      const mainStatus = varOccurrences.some(r => r.status === 'invalid')
        ? 'Non conforme'
        : (varOccurrences.some(r => r.status === 'warn') ? 'Avertissement' : 'Conforme');

      const processMap = new Map();
      varOccurrences.forEach(r => {
        if (r.parentProcess && r.parentProcess !== '-') {
          const cur = processMap.get(r.parentProcess) || [];
          cur.push('Parent');
          processMap.set(r.parentProcess, cur);
        }
        if (r.callingProcess && r.callingProcess !== '-') {
          const cur = processMap.get(r.callingProcess) || [];
          cur.push('Appelant');
          processMap.set(r.callingProcess, cur);
        }
      });

      const row = [v, mainStatus];
      let procCount = 0;

      sortedProcesses.forEach(p => {
        const roles = processMap.get(p);
        if (roles && roles.length > 0) {
          procCount++;
          if (roles.includes('Parent') && roles.includes('Appelant')) row.push('Parent & Appelant');
          else if (roles.includes('Parent')) row.push('Parent (Définition)');
          else row.push('Appelant (CallActivity)');
        } else {
          row.push('-');
        }
      });

      row.push(procCount);
      matrixRows.push(row);
    });

    const wsMatrix = XLSX.utils.aoa_to_sheet(sanitizeAoA(matrixRows));
    if (autofit) {
      wsMatrix['!cols'] = matrixHeader.map((h, i) => ({
        wch: i === 0 ? 30 : (i === 1 ? 16 : Math.min(Math.max(h.length + 3, 14), 40))
      }));
    }
    if (freezeHeader) {
      wsMatrix['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
    }
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matrice Croisée Processus x Var');
  }

  // Écriture du fichier Excel
  const filename = `Cartographie_Relations_Variables_${dateFile}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ---------- Générateur 2 : Fichier CSV Standardisé (.csv) ----------
function generateGraphRelationsCSV(data, props) {
  const delimiter = document.getElementById('expCsvDelimiter')?.value || ';';
  const withBom = document.getElementById('expCsvBom')?.checked ?? true;
  const dateFile = new Date().toISOString().slice(0, 10);

  const headers = [];
  if (props.varName) headers.push('Variable');
  if (props.status) headers.push('Statut');
  if (props.parentProcess) headers.push('Processus_Parent');
  if (props.callingProcess) headers.push('Processus_Appelant');
  if (props.callRole) headers.push('Role_Flux');
  if (props.suggestion) headers.push('Suggestion_camelCase');
  if (props.issues) headers.push('Anomalies');
  if (props.team) headers.push('Equipe');
  if (props.sensitivity) headers.push('Sensibilite');
  if (props.fileName) headers.push('Fichier_Source');

  const csvRows = [headers.map(h => qq(h)).join(delimiter)];

  data.relations.forEach(r => {
    const row = [];
    const statusLabel = r.status === 'valid' ? 'Conforme' : (r.status === 'warn' ? 'Avertissement' : 'Non conforme');

    if (props.varName) row.push(qq(r.name));
    if (props.status) row.push(qq(statusLabel));
    if (props.parentProcess) row.push(qq(r.parentProcess));
    if (props.callingProcess) row.push(qq(r.callingProcess));
    if (props.callRole) row.push(qq(r.roleLabel || r.linkType));
    if (props.suggestion) row.push(qq(r.suggestion || ''));
    if (props.issues) row.push(qq(r.issues || ''));
    if (props.team) row.push(qq(r.team || 'Non assignée'));
    if (props.sensitivity) row.push(qq(r.sensitivity || 'Public'));
    if (props.fileName) row.push(qq(r.fileName || ''));

    csvRows.push(row.join(delimiter));
  });

  let csvContent = csvRows.join('\r\n');
  if (withBom) {
    csvContent = '\uFEFF' + csvContent;
  }

  const filename = `Cartographie_Relations_Variables_${dateFile}.csv`;
  dl(csvContent, filename, 'text/csv;charset=utf-8;');
}

// ---------- Générateur 3 : Données Structurées JSON (.json) ----------
function generateGraphRelationsJSON(data, props) {
  const structure = document.getElementById('expJsonStructure')?.value || 'hierarchical_process';
  const isPretty = document.getElementById('expJsonPretty')?.checked ?? true;
  const dateFile = new Date().toISOString().slice(0, 10);

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: "Bouygues Telecom AuditFlow Pro - Cartographie des Relations",
      version: "2.4.0",
      stats: {
        totalRelations: data.relations.length,
        uniqueVariables: data.uniqueVars.length,
        uniqueProcesses: data.uniqueProcesses.length,
        conformityScore: `${data.conformityScore}%`,
        validCount: data.totalValid,
        warnCount: data.totalWarn,
        invalidCount: data.totalInvalid
      },
      filtersApplied: data.filtersInfo
    }
  };

  if (structure === 'hierarchical_process') {
    const processesObj = {};
    data.uniqueProcesses.forEach(p => {
      processesObj[p] = {
        processName: p,
        asParentRelations: data.relations.filter(r => r.parentProcess === p),
        asCallingRelations: data.relations.filter(r => r.callingProcess === p)
      };
    });
    payload.processes = processesObj;
  } else if (structure === 'hierarchical_variable') {
    const varsObj = {};
    data.uniqueVars.forEach(v => {
      const occurrences = data.relations.filter(r => r.name === v);
      varsObj[v] = {
        variableName: v,
        status: occurrences[0]?.status || 'valid',
        suggestion: occurrences[0]?.suggestion || '',
        issues: occurrences[0]?.issues || '',
        relations: occurrences
      };
    });
    payload.variables = varsObj;
  } else {
    payload.relations = data.relations;
  }

  const jsonStr = isPretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  const filename = `Cartographie_Relations_Variables_${dateFile}.json`;
  dl(jsonStr, filename, 'application/json;charset=utf-8;');
}

// ---------- Générateur 4 : Dossier Exécutif PDF / Impression (.pdf) ----------
function generateGraphRelationsPDF(data, props) {
  const orientation = document.getElementById('expPdfOrientation')?.value || 'landscape';
  const includeSummaryCard = document.getElementById('expPdfSummaryCard')?.checked ?? true;
  const nowStr = new Date().toLocaleString('fr-FR');

  const headers = [];
  if (props.varName) headers.push('Variable');
  if (props.status) headers.push('Statut');
  if (props.parentProcess) headers.push('Processus Parent');
  if (props.callingProcess) headers.push('Processus Appelant');
  if (props.callRole) headers.push('Rôle / Flux');
  if (props.suggestion) headers.push('Suggestion camelCase');
  if (props.issues) headers.push('Anomalies');
  if (props.team) headers.push('Équipe');
  if (props.fileName) headers.push('Fichier');

  const rowsHtml = data.relations.map(r => {
    const statusBadge = r.status === 'valid'
      ? `<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;">Conforme</span>`
      : (r.status === 'warn'
        ? `<span style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;">Avertissement</span>`
        : `<span style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;">Non conforme</span>`);

    const cells = [];
    if (props.varName) cells.push(`<td style="font-family:monospace; font-weight:700; color:#003882;">${esc(r.name)}</td>`);
    if (props.status) cells.push(`<td>${statusBadge}</td>`);
    if (props.parentProcess) cells.push(`<td>${esc(r.parentProcess)}</td>`);
    if (props.callingProcess) cells.push(`<td>${esc(r.callingProcess)}</td>`);
    if (props.callRole) cells.push(`<td><span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${esc(r.roleLabel)}</span></td>`);
    if (props.suggestion) cells.push(`<td style="font-family:monospace; color:#16a34a;">${esc(r.suggestion || '-')}</td>`);
    if (props.issues) cells.push(`<td style="color:#b91c1c; font-size:11px;">${esc(r.issues || '-')}</td>`);
    if (props.team) cells.push(`<td>${esc(r.team)}</td>`);
    if (props.fileName) cells.push(`<td style="font-size:10px; color:#64748b;">${esc(r.fileName)}</td>`);

    return `<tr>${cells.join('')}</tr>`;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser l'ouverture des fenêtres pop-up pour générer le dossier PDF d'impression.");
    return;
  }

  const htmlDoc = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>AuditFlow Pro - Cartographie des Relations BPMN</title>
  <style>
    @page {
      size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
      margin: 12mm 15mm;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #003882;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .logo-title {
      font-size: 20px;
      font-weight: 800;
      color: #003882;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sub-title {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      text-align: center;
    }
    .kpi-val {
      font-size: 22px;
      font-weight: 800;
      color: #003882;
    }
    .kpi-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 10px;
    }
    th {
      background: #003882;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .no-print {
      margin-bottom: 15px;
      padding: 10px 16px;
      background: #ea5b0c;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div style="display:flex; justify-content:flex-end;" class="no-print">
    <button class="no-print" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="header-bar">
    <div>
      <div class="logo-title">
        <span>Bouygues Telecom • AuditFlow Pro</span>
      </div>
      <div class="sub-title">Dossier Technique : Cartographie &amp; Relations Inter-Processus BPMN ➔ Variables</div>
    </div>
    <div style="text-align:right; font-size:11px; color:#64748b;">
      <div><strong>Date d'export :</strong> ${nowStr}</div>
      <div><strong>Statut :</strong> ${data.filtersInfo.graphNonConformOnly ? 'Variables non conformes' : 'Audit global'}</div>
    </div>
  </div>

  ${includeSummaryCard ? `
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-val">${data.relations.length}</div>
      <div class="kpi-lbl">Relations Analysées</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val">${data.uniqueVars.length}</div>
      <div class="kpi-lbl">Variables Uniques</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val">${data.uniqueProcesses.length}</div>
      <div class="kpi-lbl">Processus Impliqués</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val" style="color:${data.conformityScore >= 80 ? '#16a34a' : '#ea5b0c'}">${data.conformityScore}%</div>
      <div class="kpi-lbl">Taux de Conformité</div>
    </div>
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="margin-top:25px; border-top:1px solid #e2e8f0; padding-top:10px; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between;">
    <span>AuditFlow Pro — Moteur d'Audit de Variables &amp; Gouvernance BPMN</span>
    <span>Page 1 sur 1</span>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  <\/script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlDoc);
  printWindow.document.close();
}

// Exposer globalement les fonctions d'exportation
window.openGraphExportModal = openGraphExportModal;
window.closeGraphExportModal = closeGraphExportModal;
window.setExportFormat = setExportFormat;
window.toggleAllExportProps = toggleAllExportProps;
window.resetExportPropsDefault = resetExportPropsDefault;
window.updateGraphExportPreview = updateGraphExportPreview;
window.executeGraphExport = executeGraphExport;

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

let loaderTimeout = null;

window.showAppLoader = function({ durationMs = 2000, onComplete = null } = {}) {
  const overlay = document.getElementById('loaderOverlay');
  if (!overlay) {
    if (onComplete) onComplete();
    return;
  }

  if (loaderTimeout) clearTimeout(loaderTimeout);

  overlay.style.display = 'flex';
  // Force reflow for smooth CSS transitions
  void overlay.offsetWidth;
  overlay.classList.add('active');

  if (durationMs > 0) {
    loaderTimeout = setTimeout(() => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
        if (onComplete) onComplete();
      }, 250);
    }, durationMs);
  }
};

window.hideAppLoader = function() {
  const overlay = document.getElementById('loaderOverlay');
  if (loaderTimeout) clearTimeout(loaderTimeout);
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 250);
  }
};

// ---------- Tab & UI State management ----------
function switchTab(name, skipLoader = false){
  const titles = {
    'import': 'Importation des données',
    'config': 'Configuration des règles',
    'proc-relations': 'Relations & Hiérarchie Inter-Processus BPMN',
    'results': 'Résultats de l\'audit',
    'dashboard': 'Tableau de bord',
    'graph': 'Schéma des relations',
    'ranking': 'Classement d\'utilisation',
    'duplicates': 'Détection des Doublons & Cohérence',
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
    'diff': 'Comparateur de Versions BPMN (Diff)',
    'guide': 'Guide d\'utilisation'
  };

  const executeTabSwitch = () => {
    document.querySelectorAll('.tab').forEach(t=>{
      t.classList.remove('active');
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${name}'`)) {
        t.classList.add('active');
      }
    });
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    const panel = document.getElementById('panel-'+name);
    if(panel) panel.classList.add('active');

    // Gérer l'état actif du menu latéral pour le guide d'utilisation et le comparateur
    if (name === 'guide') {
      document.querySelectorAll('.menu-header').forEach(h => {
        if (h.id === 'btn-mod-guide') {
          h.classList.add('active');
        } else if (!h.closest('#group-guide')) {
          h.classList.remove('active');
        }
      });
    } else if (name === 'diff') {
      document.querySelectorAll('.menu-header').forEach(h => {
        if (h.id === 'btn-mod-diff') {
          h.classList.add('active');
        } else if (!h.closest('#group-diff')) {
          h.classList.remove('active');
        }
      });
    } else {
      const guideHeader = document.getElementById('btn-mod-guide');
      if (guideHeader) guideHeader.classList.remove('active');
      const diffHeader = document.getElementById('btn-mod-diff');
      if (diffHeader) diffHeader.classList.remove('active');
    }

    // Mise à jour dynamique du titre dans l'en-tête principal
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl && titles[name]) {
      pageTitleEl.textContent = titles[name];
    }

    // Gérer le déclenchement de rendu spécifique selon l'onglet
    if (name === 'duplicates') {
      renderDuplicatesUI();
    }
  };

  if (!skipLoader) {
    showAppLoader({ durationMs: 2000 });
    executeTabSwitch();
  } else {
    executeTabSwitch();
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

function handleFile(file){
  if(!file)return;
  const name = file.name.toLowerCase();
  if (name.endsWith('.bpmn') || name.endsWith('.xml')) {
    handleBPMNFile(file);
  } else {
    handleExcelCSVFile(file);
  }
}

function handleFile(file){
  if(!file) return;
  handleFiles([file]);
}

function handleFiles(files){
  if(!files || !files.length) return;
  const fileArray = Array.from(files).filter(f => validateFileSize(f));
  if (!fileArray.length) return;

  const bpmnFiles = fileArray.filter(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.bpmn') || name.endsWith('.xml');
  });

  if (bpmnFiles.length > 0) {
    handleBPMNFiles(bpmnFiles);
  } else if (fileArray.length > 0) {
    handleExcelCSVFile(fileArray[0]);
  }
}

function handleExcelCSVFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'array' });
    rawFileData = [];
    fileHeaders = [];

    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

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
    bpmnBatch = [];
    bpmnXmlDoc = null;
    bpmnFileName = "";
    const bpmnBtn = document.getElementById('downloadBpmnBtn');
    if (bpmnBtn) bpmnBtn.style.display = 'none';

    document.getElementById('uploadTitle').textContent = file.name;
    document.getElementById('uploadSub').textContent = 'Données chargées, veuillez vérifier le mappage des colonnes';
    document.getElementById('manualInput').value = '';

    const batchSec = document.getElementById('bpmnBatchSection');
    if (batchSec) batchSec.style.display = 'none';

    document.getElementById('mappingSection').style.display = 'block';
    populateMappingDropdowns();
  };
  reader.readAsArrayBuffer(file);
}

async function handleBPMNFiles(files) {
  rawFileData = [];
  fileHeaders = [];
  document.getElementById('manualInput').value = '';
  document.getElementById('mappingSection').style.display = 'none';

  for (const file of files) {
    try {
      const xmlText = await file.text();
      const parsed = parseSingleBpmnDoc(xmlText, file.name);
      if (parsed) {
        const existingIdx = bpmnBatch.findIndex(b => b.fileName.toLowerCase() === file.name.toLowerCase());
        if (existingIdx >= 0) {
          bpmnBatch[existingIdx] = parsed;
        } else {
          bpmnBatch.push(parsed);
        }
      }
    } catch(err) {
      console.error(`Erreur de lecture BPMN (${file.name}):`, err);
      alert(`Erreur de lecture du fichier ${file.name} : ${err.message}`);
    }
  }

  updateBpmnBatchState();
}

function parseSingleBpmnDoc(xmlText, fileName) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent);
  }

  // Identifier le ou les processus
  let processId = "Process_" + Math.random().toString(36).substr(2, 5);
  let processName = fileName.replace(/\.bpmn$/i, '').replace(/\.xml$/i, '');
  
  const procEl = xmlDoc.querySelector('process, bpmn\\:process');
  if (procEl) {
    processId = procEl.getAttribute('id') || processId;
    processName = procEl.getAttribute('name') || processName || processId;
  }

  // Identifier les activités & Call Activities
  const activities = [];
  const callActivities = [];
  const variables = [];

  const IGNORED_IDENTIFIERS = new Set([
    'if', 'then', 'else', 'true', 'false', 'null', 'and', 'or', 'not', 'for', 'in', 'return', 
    'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 
    'append', 'insert', 'sublist', 'contains', 'string', 'number', 'boolean', 'date', 'time', 
    'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds'
  ]);

  function extractVarsFromExpr(expr) {
    if (!expr) return [];
    let cleanExpr = String(expr).trim();
    if (cleanExpr.startsWith('=')) {
      cleanExpr = cleanExpr.substring(1);
    } else {
      const juelMatch = cleanExpr.match(/\${([^}]+)}/);
      if (juelMatch) cleanExpr = juelMatch[1];
    }
    cleanExpr = cleanExpr.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '')
                         .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, '');
    const matches = cleanExpr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (!matches) return [];
    return Array.from(new Set(matches)).filter(w => !IGNORED_IDENTIFIERS.has(w.toLowerCase()));
  }

  function getParentProcessInfo(node) {
    let parent = node.parentNode;
    while (parent) {
      const ln = (parent.localName || '').toLowerCase();
      if (ln === 'process') {
        const id = parent.getAttribute('id') || '';
        const name = parent.getAttribute('name') || '';
        return name ? `${name} (${id})` : id;
      }
      parent = parent.parentNode;
    }
    return processName ? `${processName} (${processId})` : processId;
  }

  function getTaskInfo(node) {
    let parent = node.parentNode;
    while (parent) {
      const ln = (parent.localName || '').toLowerCase();
      if (['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent'].includes(ln)) {
        const id = parent.getAttribute('id') || '';
        const name = parent.getAttribute('name') || '';
        const typeLabel = parent.localName;
        return { id, name, type: typeLabel, label: name ? `${typeLabel}: ${name} (${id})` : `${typeLabel}: ${id}` };
      }
      parent = parent.parentNode;
    }
    return { id: '', name: '', type: 'element', label: '' };
  }

  const allElements = xmlDoc.getElementsByTagName('*');
  let rowId = 1;

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const localName = (el.localName || '').toLowerCase();

    // Enregistrer les activités principales
    if (['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'subprocess', 'startevent', 'endevent', 'callactivity'].includes(localName)) {
      activities.push({
        id: el.getAttribute('id') || ('act_' + rowId),
        name: el.getAttribute('name') || el.getAttribute('id') || localName,
        type: localName
      });
    }

    // Extraction spécifique des Call Activities et de leurs liaisons
    if (localName === 'callactivity') {
      const actId = el.getAttribute('id') || '';
      const actName = el.getAttribute('name') || actId;
      
      // Camunda 7 calledElement ou Zeebe calledElement
      let calledElement = el.getAttribute('calledElement') || '';
      const zeebeCalled = el.querySelector('calledElement, zeebe\\:calledElement');
      if (zeebeCalled && !calledElement) {
        calledElement = zeebeCalled.getAttribute('processId') || '';
      }

      // Extraction des mappages In / Out
      const inMappings = [];
      const outMappings = [];

      // Camunda 7 <camunda:in> / <camunda:out>
      const camInNodes = el.querySelectorAll('in, camunda\\:in');
      camInNodes.forEach(cin => {
        const src = cin.getAttribute('source') || cin.getAttribute('sourceExpression') || '';
        const tgt = cin.getAttribute('target') || '';
        if (src || tgt) inMappings.push({ source: src, target: tgt });
      });

      const camOutNodes = el.querySelectorAll('out, camunda\\:out');
      camOutNodes.forEach(cout => {
        const src = cout.getAttribute('source') || cout.getAttribute('sourceExpression') || '';
        const tgt = cout.getAttribute('target') || '';
        if (src || tgt) outMappings.push({ source: src, target: tgt });
      });

      // Zeebe <zeebe:ioMapping>
      const zeebeIo = el.querySelectorAll('input, zeebe\\:input, output, zeebe\\:output');
      zeebeIo.forEach(zio => {
        const isInput = (zio.localName || '').toLowerCase() === 'input';
        const src = zio.getAttribute('source') || '';
        const tgt = zio.getAttribute('target') || '';
        if (isInput) inMappings.push({ source: src, target: tgt });
        else outMappings.push({ source: src, target: tgt });
      });

      callActivities.push({
        activityId: actId,
        activityName: actName,
        calledElement: calledElement || '(Non défini)',
        inMappings,
        outMappings,
        parentProcessId: processId,
        parentProcessName: processName,
        fileName
      });
    }

    // Propriétés
    if (localName === 'property') {
      const nameAttr = el.getAttribute('name') || el.getAttribute('key') || '';
      const valueAttr = el.getAttribute('value') || '';
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);

      if (nameAttr) {
        variables.push({
          name: nameAttr,
          parentProcess: parentProc,
          callingProcess: taskObj.label || 'Propriété Globale',
          fileName,
          processId,
          role: 'property',
          row: rowId++,
          bpmnMeta: { node: el, attr: el.hasAttribute('name') ? 'name' : 'key', originalValue: nameAttr, type: 'attribute' }
        });
      }
      if (valueAttr) {
        extractVarsFromExpr(valueAttr).forEach(v => {
          variables.push({
            name: v,
            parentProcess: parentProc,
            callingProcess: `${taskObj.label || 'Propriété'} (Valeur)`,
            fileName,
            processId,
            role: 'consumer',
            row: rowId++,
            bpmnMeta: { node: el, attr: 'value', originalValue: valueAttr, type: 'expression' }
          });
        });
      }
    }

    // Zeebe I/O Mappings
    if (localName === 'input' || localName === 'output') {
      const sourceAttr = el.getAttribute('source');
      const targetAttr = el.getAttribute('target');
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);
      const isInput = localName === 'input';

      if (targetAttr) {
        variables.push({
          name: targetAttr,
          parentProcess: parentProc,
          callingProcess: `${taskObj.label || 'Mappage I/O'} (${isInput ? 'Entrée Param' : 'Sortie Résultat'})`,
          fileName,
          processId,
          role: isInput ? 'consumer' : 'producer',
          row: rowId++,
          bpmnMeta: { node: el, attr: 'target', originalValue: targetAttr, type: 'attribute' }
        });
      }
      if (sourceAttr) {
        extractVarsFromExpr(sourceAttr).forEach(v => {
          variables.push({
            name: v,
            parentProcess: parentProc,
            callingProcess: `${taskObj.label || 'Mappage I/O'} (Expression Source)`,
            fileName,
            processId,
            role: 'consumer',
            row: rowId++,
            bpmnMeta: { node: el, attr: 'source', originalValue: sourceAttr, type: 'expression' }
          });
        });
      }
    }

    // Camunda 7 Input/Output Parameters
    if (localName === 'inputparameter' || localName === 'outputparameter') {
      const nameAttr = el.getAttribute('name');
      const textContent = (el.textContent || '').trim();
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);
      const isInput = localName === 'inputparameter';

      if (nameAttr) {
        variables.push({
          name: nameAttr,
          parentProcess: parentProc,
          callingProcess: `${taskObj.label || 'Paramètre I/O'} (${isInput ? 'Input' : 'Output'})`,
          fileName,
          processId,
          role: isInput ? 'consumer' : 'producer',
          row: rowId++,
          bpmnMeta: { node: el, attr: 'name', originalValue: nameAttr, type: 'attribute' }
        });
      }
      if (textContent) {
        extractVarsFromExpr(textContent).forEach(v => {
          variables.push({
            name: v,
            parentProcess: parentProc,
            callingProcess: `${taskObj.label || 'Paramètre I/O'} (Expression)`,
            fileName,
            processId,
            role: 'consumer',
            row: rowId++,
            bpmnMeta: { node: el, attr: null, originalValue: textContent, type: 'expression' }
          });
        });
      }
    }

    // Form Fields
    if (localName === 'formfield') {
      const idAttr = el.getAttribute('id');
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);
      if (idAttr) {
        variables.push({
          name: idAttr,
          parentProcess: parentProc,
          callingProcess: `${taskObj.label || 'Formulaire'} (Champ Form)`,
          fileName,
          processId,
          role: 'producer',
          row: rowId++,
          bpmnMeta: { node: el, attr: 'id', originalValue: idAttr, type: 'attribute' }
        });
      }
    }

    // Condition Expressions
    if (localName === 'conditionexpression') {
      const textContent = (el.textContent || '').trim();
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);
      if (textContent) {
        extractVarsFromExpr(textContent).forEach(v => {
          variables.push({
            name: v,
            parentProcess: parentProc,
            callingProcess: `${taskObj.label || 'Transition Conditionnelle'} (Condition)`,
            fileName,
            processId,
            role: 'consumer',
            row: rowId++,
            bpmnMeta: { node: el, attr: null, originalValue: textContent, type: 'expression' }
          });
        });
      }
    }

    // Script Tasks
    if (localName === 'script') {
      const textContent = (el.textContent || '').trim();
      const parentProc = getParentProcessInfo(el);
      const taskObj = getTaskInfo(el);
      if (textContent) {
        extractVarsFromExpr(textContent).forEach(v => {
          variables.push({
            name: v,
            parentProcess: parentProc,
            callingProcess: `${taskObj.label || 'Script Task'} (Script)`,
            fileName,
            processId,
            role: 'consumer',
            row: rowId++,
            bpmnMeta: { node: el, attr: null, originalValue: textContent, type: 'expression' }
          });
        });
      }
    }
  }

  return {
    id: 'bpmn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    fileName,
    rawXml: xmlText,
    xmlDoc,
    processId,
    processName,
    activities,
    callActivities,
    variables,
    isRoot: true
  };
}

function updateBpmnBatchState() {
  isBPMNMode = bpmnBatch.length > 0;
  bpmnXmlDoc = bpmnBatch.length === 1 ? bpmnBatch[0].xmlDoc : null;
  bpmnFileName = bpmnBatch.length === 1 ? bpmnBatch[0].fileName : (bpmnBatch.length + " fichiers BPMN");

  correlateMultiBpmnBatch();

  // Agréger toutes les variables
  bpmnRows = [];
  bpmnBatch.forEach(b => {
    b.variables.forEach(v => bpmnRows.push(v));
  });

  const batchSec = document.getElementById('bpmnBatchSection');
  if (batchSec) batchSec.style.display = bpmnBatch.length > 0 ? 'block' : 'none';

  if (bpmnBatch.length > 0) {
    document.getElementById('uploadTitle').textContent = `${bpmnBatch.length} fichier(s) BPMN chargé(s)`;
    document.getElementById('uploadSub').textContent = `Total de ${bpmnRows.length} variable(s) et ${procHierarchyData.callRelations.length} relation(s) inter-processus détectée(s)`;
    document.getElementById('countHint').textContent = `${bpmnRows.length} variables prêtes pour l'audit`;
  } else {
    document.getElementById('uploadTitle').textContent = 'Déposer 1 à n fichiers BPMN, XML, Excel ou CSV';
    document.getElementById('uploadSub').textContent = 'Importez un ou plusieurs modèles BPMN (.bpmn, .xml) pour auditer les flux et cartographier les sous-processus — glissez ou cliquez';
    document.getElementById('countHint').textContent = '';
  }

  renderBpmnBatchUI();
  updateBPMNPreview();
}

function correlateMultiBpmnBatch() {
  const procMap = {};
  bpmnBatch.forEach(b => {
    procMap[b.processId] = {
      ...b,
      parents: [],
      children: [],
      isRoot: true
    };
  });

  const callRelations = [];
  const missingSubprocesses = [];

  bpmnBatch.forEach(callerBpmn => {
    callerBpmn.callActivities.forEach(ca => {
      const targetProcId = ca.calledElement;
      const targetProc = procMap[targetProcId];

      const rel = {
        callerId: callerBpmn.processId,
        callerName: callerBpmn.processName,
        callerFile: callerBpmn.fileName,
        activityId: ca.activityId,
        activityName: ca.activityName,
        calledElement: targetProcId,
        inMappings: ca.inMappings,
        outMappings: ca.outMappings,
        isResolved: !!targetProc
      };
      callRelations.push(rel);

      if (targetProc) {
        targetProc.isRoot = false;
        if (!targetProc.parents.includes(callerBpmn.processId)) {
          targetProc.parents.push(callerBpmn.processId);
        }
        if (!procMap[callerBpmn.processId].children.includes(targetProcId)) {
          procMap[callerBpmn.processId].children.push(targetProcId);
        }
      } else if (targetProcId && targetProcId !== '(Non défini)') {
        if (!missingSubprocesses.some(m => m.calledElement === targetProcId)) {
          missingSubprocesses.push({
            calledElement: targetProcId,
            calledBy: callerBpmn.processName,
            activity: ca.activityName
          });
        }
      }
    });
  });

  // Mettre à jour isRoot sur les éléments du batch
  bpmnBatch.forEach(b => {
    if (procMap[b.processId]) {
      b.isRoot = procMap[b.processId].isRoot;
    }
  });

  // Calcul de la profondeur maximale
  let maxDepth = 1;
  const roots = Object.values(procMap).filter(p => p.isRoot);

  function getDepth(procId, visited = new Set()) {
    if (visited.has(procId)) return 1;
    visited.add(procId);
    const proc = procMap[procId];
    if (!proc || !proc.children.length) return 1;
    let childMax = 0;
    proc.children.forEach(cId => {
      childMax = Math.max(childMax, getDepth(cId, new Set(visited)));
    });
    return 1 + childMax;
  }

  roots.forEach(r => {
    maxDepth = Math.max(maxDepth, getDepth(r.processId));
  });

  // Traçabilité du Cycle de Vie Global des Variables
  const varGlobalStats = new Map();
  bpmnBatch.forEach(b => {
    b.variables.forEach(v => {
      const name = v.name;
      if (!varGlobalStats.has(name)) {
        varGlobalStats.set(name, { writes: 0, reads: 0, inouts: 0, processes: new Set() });
      }
      const st = varGlobalStats.get(name);
      st.processes.add(b.processId);
      if (v.role === 'producer') st.writes++;
      else if (v.role === 'consumer') st.reads++;
    });
  });

  // Analyser si les variables sont passées en Call Activity
  callRelations.forEach(rel => {
    (rel.inMappings || []).forEach(m => {
      if (m.source && varGlobalStats.has(m.source)) varGlobalStats.get(m.source).inouts++;
      if (m.target && varGlobalStats.has(m.target)) varGlobalStats.get(m.target).inouts++;
    });
    (rel.outMappings || []).forEach(m => {
      if (m.source && varGlobalStats.has(m.source)) varGlobalStats.get(m.source).inouts++;
      if (m.target && varGlobalStats.has(m.target)) varGlobalStats.get(m.target).inouts++;
    });
  });

  // Assigner les statuts de cycle de vie précis
  bpmnBatch.forEach(b => {
    b.variables.forEach(v => {
      const st = varGlobalStats.get(v.name);
      if (st) {
        if (st.writes > 0 && st.reads === 0 && v.role !== 'property') {
          v.role = 'dead'; // Variable Morte
        } else if (st.writes === 0 && st.reads > 0 && v.role !== 'property') {
          v.role = 'orphan'; // Variable Non Initialisée
        } else if (st.inouts > 0) {
          v.role = 'inout'; // Flux Inter-Processus
        }
      }
    });
  });

  procHierarchyData = {
    roots,
    allProcesses: procMap,
    callRelations,
    missingSubprocesses,
    maxDepth
  };
}

function renderBpmnBatchUI() {
  const container = document.getElementById('bpmnBatchGrid');
  const countBadge = document.getElementById('bpmnBatchCount');
  const summaryText = document.getElementById('bpmnBatchSummaryText');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${bpmnBatch.length} fichier(s) BPMN`;

  if (bpmnBatch.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = bpmnBatch.map((b, idx) => {
    const isRoot = b.isRoot;
    const badgeType = isRoot 
      ? '<span class="proc-badge-tag tag-root">Processus Orchestrateur (Racine)</span>' 
      : '<span class="proc-badge-tag tag-sub">Sous-processus Invoqué</span>';

    return `
      <div class="bpmn-file-card ${isRoot ? 'is-root' : 'is-sub'}">
        <div class="bpmn-file-card-header">
          <div>
            <div class="bpmn-file-name" title="${esc(b.fileName)}">📄 ${esc(b.fileName)}</div>
            <div class="bpmn-file-proc-id">ID: <code>${esc(b.processId)}</code></div>
          </div>
          <button class="bpmn-file-remove-btn" onclick="removeBpmnFromBatch(${idx})" title="Retirer ce fichier">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div style="margin-top:2px;">
          ${badgeType}
        </div>
        <div class="bpmn-file-stats">
          <span class="bpmn-stat-pill"><strong>${b.variables.length}</strong> variables</span>
          <span class="bpmn-stat-pill"><strong>${b.activities.length}</strong> activités</span>
          <span class="bpmn-stat-pill"><strong>${b.callActivities.length}</strong> call activities</span>
        </div>
      </div>
    `;
  }).join('');

  if (summaryText) {
    const rootsCount = procHierarchyData.roots.length;
    const relsCount = procHierarchyData.callRelations.length;
    const missingCount = procHierarchyData.missingSubprocesses.length;

    let summary = `<strong>${bpmnBatch.length}</strong> fichier(s) BPMN chargé(s) • <strong>${rootsCount}</strong> racine(s) • <strong>${relsCount}</strong> liaison(s) inter-processus`;
    if (missingCount > 0) {
      summary += ` • <span style="color:var(--brand-orange); font-weight:700;">⚠️ ${missingCount} sous-processus référencé(s) non fourni(s)</span>`;
    }
    summaryText.innerHTML = summary;
  }
}

function removeBpmnFromBatch(idx) {
  if (idx >= 0 && idx < bpmnBatch.length) {
    bpmnBatch.splice(idx, 1);
    updateBpmnBatchState();
  }
}

function clearBpmnBatch() {
  bpmnBatch = [];
  updateBpmnBatchState();
}

function updateBPMNPreview(){
  let previewHTML = '';
  const maxPreview = 6;
  const count = Math.min(bpmnRows.length, maxPreview);
  
  for(let i=0; i<count; i++){
    const r = bpmnRows[i];
    let details = [];
    if(r.parentProcess) details.push(`Proc: ${r.parentProcess}`);
    if(r.callingProcess) details.push(`Élément: ${r.callingProcess}`);
    if(r.fileName) details.push(`Fichier: ${r.fileName}`);

    const roleBadge = getLifecycleBadgeHTML(r.role);

    previewHTML += `
      <div style="margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:var(--brand-primary); font-family:var(--font-mono);">${esc(r.name)}</strong> 
          <span style="color:var(--text-tertiary);font-size:10px">(${details.join(' | ')})</span>
        </div>
        ${roleBadge}
      </div>
    `;
  }
  
  document.getElementById('previewBox').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucune variable trouvée dans le(s) BPMN...</span>';
}

function getLifecycleBadgeClass(role) {
  if (role === 'producer') return 'badge-producer';
  if (role === 'consumer') return 'badge-consumer';
  if (role === 'inout') return 'badge-inout';
  if (role === 'dead') return 'badge-dead';
  if (role === 'orphan') return 'badge-orphan';
  return 'badge-consumer';
}

function getLifecycleLabel(role) {
  if (role === 'producer') return '🟢 Producteur (Write)';
  if (role === 'consumer') return '🔵 Consommateur (Read)';
  if (role === 'inout') return '🟣 Flux In/Out';
  if (role === 'dead') return '👻 Variable Morte';
  if (role === 'orphan') return '⚠️ Non Initialisée';
  return '🔵 Consommateur';
}

function getLifecycleBadgeHTML(role) {
  const cls = getLifecycleBadgeClass(role);
  const lbl = getLifecycleLabel(role);
  return `<span class="badge-lifecycle ${cls}">${lbl}</span>`;
}

// ---------- Rendu de la Hiérarchie et des Relations Processus ----------
function renderProcessHierarchy() {
  const totalEl = document.getElementById('kpi-proc-total');
  const rootsEl = document.getElementById('kpi-proc-roots');
  const subsEl = document.getElementById('kpi-proc-subs');
  const missingEl = document.getElementById('kpi-proc-missing');
  const missingStatusEl = document.getElementById('kpi-proc-missing-status');
  const depthEl = document.getElementById('kpi-proc-depth');

  const allProcKeys = Object.keys(procHierarchyData.allProcesses);
  const totalCount = allProcKeys.length;
  const rootsCount = procHierarchyData.roots.length;
  const subsCount = totalCount - rootsCount;
  const missingCount = procHierarchyData.missingSubprocesses.length;

  if (totalEl) totalEl.textContent = totalCount;
  if (rootsEl) rootsEl.textContent = rootsCount;
  if (subsEl) subsEl.textContent = Math.max(0, subsCount);
  if (missingEl) {
    missingEl.textContent = missingCount;
    missingEl.style.color = missingCount > 0 ? 'var(--err)' : 'var(--text-primary)';
  }
  if (missingStatusEl) {
    missingStatusEl.textContent = missingCount > 0 ? `${missingCount} sous-processus non chargé(s)` : 'Tous les sous-processus sont résolus';
    missingStatusEl.style.color = missingCount > 0 ? 'var(--err)' : 'var(--ok-dark)';
  }
  if (depthEl) depthEl.textContent = procHierarchyData.maxDepth;

  // Alerte sous-processus manquants
  const alertBox = document.getElementById('missingSubprocAlert');
  if (alertBox) {
    if (missingCount > 0) {
      alertBox.style.display = 'flex';
      const missingListStr = procHierarchyData.missingSubprocesses.map(m => `<code>${esc(m.calledElement)}</code> (appelé par <em>${esc(m.calledBy)}</em>)`).join(', ');
      document.getElementById('missingSubprocDesc').innerHTML = `Les sous-processus suivants sont appelés via des Call Activities mais n'ont pas été importés dans le lot : ${missingListStr}. Vous pouvez les importer pour compléter la cartographie.`;
    } else {
      alertBox.style.display = 'none';
    }
  }

  // Rendu Arbre Hiérarchique (Tree View)
  renderProcTreeView();

  // Rendu Matrice Call Activities
  renderProcMatrixView();

  // Rendu Graphe Réseau Vis.js si activé
  if (currentProcRelSubView === 'graph') {
    renderProcNetworkGraph();
  }
}

function renderProcTreeView() {
  const container = document.getElementById('procTreeRootContainer');
  if (!container) return;

  if (procHierarchyData.roots.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem;">Aucun processus racine identifié.</div>';
    return;
  }

  function buildTreeNodeHTML(procId, visited = new Set()) {
    const proc = procHierarchyData.allProcesses[procId];
    if (!proc) {
      return `
        <div class="proc-tree-node is-missing">
          <div class="proc-tree-node-content">
            <span style="font-size:16px;">⚠️</span>
            <div>
              <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-orange);">${esc(procId)}</span>
              <span class="proc-badge-tag tag-missing">Sous-processus non importé</span>
            </div>
          </div>
        </div>
      `;
    }

    const isVisited = visited.has(procId);
    visited.add(procId);

    const varsCount = proc.variables ? proc.variables.length : 0;
    const actsCount = proc.activities ? proc.activities.length : 0;
    const callsCount = proc.callActivities ? proc.callActivities.length : 0;

    const childrenHTML = (proc.children || []).map(childId => buildTreeNodeHTML(childId, new Set(visited))).join('');

    return `
      <div class="proc-tree-node ${proc.isRoot ? 'is-root' : 'is-sub'}">
        <div class="proc-tree-node-content" data-proc="${escAttr(proc.processName)}" onclick="filterResultsByProcessFromEl(this)">
          <span style="font-size:16px;">${proc.isRoot ? '👑' : '⚙️'}</span>
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:13px;">${escHtml(proc.processName)}</div>
            <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono);">ID: ${escHtml(proc.processId)} • Fichier: ${escHtml(proc.fileName)}</div>
          </div>
          <div style="display:flex; gap:6px; margin-left:10px;">
            <span class="proc-badge-tag ${proc.isRoot ? 'tag-root' : 'tag-sub'}">${proc.isRoot ? 'Processus Principal' : 'Sous-processus'}</span>
            <span class="bpmn-stat-pill"><strong>${varsCount}</strong> vars</span>
            <span class="bpmn-stat-pill"><strong>${actsCount}</strong> activités</span>
            ${callsCount > 0 ? `<span class="proc-badge-tag tag-call">📞 ${callsCount} appel(s)</span>` : ''}
          </div>
        </div>
        ${childrenHTML ? `<div class="proc-tree-children">${childrenHTML}</div>` : ''}
      </div>
    `;
  }

  container.innerHTML = procHierarchyData.roots.map(r => buildTreeNodeHTML(r.processId)).join('');
}

function renderProcMatrixView() {
  const tbody = document.getElementById('procMatrixTableBody');
  if (!tbody) return;

  const rels = procHierarchyData.callRelations;
  if (!rels || rels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-tertiary); padding:20px;">Aucune Call Activity détectée dans les fichiers BPMN chargés.</td></tr>';
    return;
  }

  tbody.innerHTML = rels.map(r => {
    const inVarsStr = (r.inMappings && r.inMappings.length > 0)
      ? r.inMappings.map(m => `<span class="badge-lifecycle badge-inout">${esc(m.source || '')} ➔ ${esc(m.target || '')}</span>`).join(' ')
      : '<span style="color:var(--text-tertiary); font-size:11px;">Aucun mappage d\'entrée</span>';

    const outVarsStr = (r.outMappings && r.outMappings.length > 0)
      ? r.outMappings.map(m => `<span class="badge-lifecycle badge-producer">${esc(m.source || '')} ➔ ${esc(m.target || '')}</span>`).join(' ')
      : '<span style="color:var(--text-tertiary); font-size:11px;">Aucun mappage de sortie</span>';

    const statusBadge = r.isResolved
      ? '<span class="badge ok">✓ Fichier Lié</span>'
      : '<span class="badge warn">⚠️ Non Fourni</span>';

    return `
      <tr>
        <td><strong>${esc(r.callerName)}</strong> <div style="font-size:10px; color:var(--text-tertiary); font-family:var(--font-mono);">${esc(r.callerId)}</div></td>
        <td><code>${esc(r.activityName || r.activityId)}</code></td>
        <td><strong style="color:var(--brand-primary); font-family:var(--font-mono);">${esc(r.calledElement)}</strong></td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${inVarsStr}</div></td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${outVarsStr}</div></td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

function renderProcNetworkGraph() {
  if (!window.vis) return;
  const container = document.getElementById('procNetworkGraph');
  if (!container) return;

  const nodes = [];
  const edges = [];
  const allProc = procHierarchyData.allProcesses;

  Object.values(allProc).forEach(p => {
    nodes.push({
      id: p.processId,
      label: `${p.processName}\n(${p.variables.length} vars)`,
      shape: p.isRoot ? 'box' : 'ellipse',
      color: {
        background: p.isRoot ? '#003882' : '#0284c7',
        border: p.isRoot ? '#002659' : '#0369a1',
        highlight: { background: '#ea5b0c', border: '#c2410c' }
      },
      font: { color: '#ffffff', size: 12, face: 'Outfit, sans-serif' },
      margin: 10
    });
  });

  // Ajouter les nœuds manquants
  procHierarchyData.missingSubprocesses.forEach(m => {
    nodes.push({
      id: m.calledElement,
      label: `⚠️ ${m.calledElement}\n(Non fourni)`,
      shape: 'box',
      color: { background: '#fff7ed', border: '#ea5b0c' },
      font: { color: '#9a3412', size: 11, face: 'Outfit, sans-serif' },
      margin: 8
    });
  });

  procHierarchyData.callRelations.forEach((r, idx) => {
    edges.push({
      id: 'edge_' + idx,
      from: r.callerId,
      to: r.calledElement,
      label: `Call (${r.inMappings.length} In, ${r.outMappings.length} Out)`,
      arrows: 'to',
      font: { size: 10, align: 'top', color: '#64748b' },
      color: { color: '#94a3b8', highlight: '#ea5b0c' },
      smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
    });
  });

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
  const options = {
    layout: {
      hierarchical: {
        direction: 'UD',
        sortMethod: 'directed',
        nodeSpacing: 180,
        levelSeparation: 120
      }
    },
    physics: false,
    interaction: { hover: true, tooltipDelay: 200 }
  };

  procNetworkGraph = new vis.Network(container, data, options);
}

function switchProcRelSubView(viewType) {
  currentProcRelSubView = viewType;
  const btnTree = document.getElementById('btnViewProcTree');
  const btnGraph = document.getElementById('btnViewProcGraph');
  const btnMatrix = document.getElementById('btnViewProcMatrix');

  const viewTree = document.getElementById('subViewProcTree');
  const viewGraph = document.getElementById('subViewProcGraph');
  const viewMatrix = document.getElementById('subViewProcMatrix');

  if (btnTree) btnTree.classList.toggle('active', viewType === 'tree');
  if (btnGraph) btnGraph.classList.toggle('active', viewType === 'graph');
  if (btnMatrix) btnMatrix.classList.toggle('active', viewType === 'matrix');

  if (viewTree) viewTree.style.display = viewType === 'tree' ? 'block' : 'none';
  if (viewGraph) viewGraph.style.display = viewType === 'graph' ? 'block' : 'none';
  if (viewMatrix) viewMatrix.style.display = viewType === 'matrix' ? 'block' : 'none';

  if (viewType === 'graph') {
    setTimeout(() => renderProcNetworkGraph(), 100);
  }
}

function filterResultsByProcess(procName) {
  dashFilterProcess = procName;
  filterProcVal = procName;
  const sel = document.getElementById('dashFilterProcess');
  if (sel) sel.value = procName;
  switchTab('results');
  renderResults();
}
window.filterResultsByProcess = filterResultsByProcess;

window.filterResultsByProcessFromEl = function(el) {
  const proc = el.getAttribute('data-proc');
  if (proc) filterResultsByProcess(proc);
};

window.openVarInspectorFromEl = function(el) {
  const varName = el.getAttribute('data-var') || (el.closest('[data-var]') ? el.closest('[data-var]').getAttribute('data-var') : '');
  if (varName) openVarInspector(varName);
};

window.copySugFromEl = function(btn) {
  const text = btn.getAttribute('data-sug') || '';
  if (text && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copié !';
      btn.style.borderColor = 'var(--ok)';
      btn.style.color = 'var(--ok)';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 1500);
    }).catch(() => {});
  }
};

// ---------- Inspecteur Détaillé de Variable (Drawer Modal) ----------
function openVarInspector(varName) {
  selectedVarForInspection = varName;
  const modal = document.getElementById('varInspectorModal');
  if (!modal) return;

  const varOccurrences = allRows.filter(r => r.name === varName);
  if (!varOccurrences.length) return;

  const first = varOccurrences[0];
  document.getElementById('inspectorVarName').textContent = varName;
  
  const badgeEl = document.getElementById('inspectorVarStatusBadge');
  if (badgeEl) {
    badgeEl.className = `badge ${first.status === 'valid' ? 'ok' : first.status === 'warn' ? 'warn' : 'err'}`;
    badgeEl.textContent = first.status === 'valid' ? 'Conforme' : first.status === 'warn' ? 'Avertissement' : 'Non conforme';
  }

  document.getElementById('inspectorVarRole').innerHTML = getLifecycleBadgeHTML(first.role);
  document.getElementById('inspectorVarOccurrences').textContent = `${varOccurrences.length} occurrence(s) à travers ${new Set(varOccurrences.map(o => o.parentProcess)).size} processus`;
  document.getElementById('inspectorVarSensitivity').textContent = first.sensitivity || 'Public';
  document.getElementById('inspectorVarTeam').textContent = first.team || 'Non assignée';

  // Section Suggestion
  const autoFixBox = document.getElementById('inspectorAutoFixBox');
  const sugInput = document.getElementById('inspectorEditedSuggestion');
  if (autoFixBox && sugInput) {
    if (first.status !== 'valid') {
      autoFixBox.style.display = 'block';
      sugInput.value = first.editedSuggestion || first.suggested || toCamelCase(varName);
    } else {
      autoFixBox.style.display = 'none';
    }
  }

  // Timeline des étapes
  const timeline = document.getElementById('inspectorTimelineContainer');
  if (timeline) {
    timeline.innerHTML = varOccurrences.map((occ, idx) => {
      let stepClass = 'step-read';
      let icon = '🔵';
      let actionLabel = 'Lecture / Consommation';

      if (occ.role === 'producer') {
        stepClass = 'step-write';
        icon = '🟢';
        actionLabel = 'Écriture / Production (Output / Form)';
      } else if (occ.role === 'inout') {
        stepClass = 'step-inout';
        icon = '🟣';
        actionLabel = 'Liaison Inter-Processus (Call Activity In/Out)';
      } else if (occ.role === 'dead') {
        icon = '👻';
        actionLabel = 'Variable Morte (Produite mais jamais consommée)';
      } else if (occ.role === 'orphan') {
        icon = '⚠️';
        actionLabel = 'Variable Non Initialisée (Consommée sans production préalable)';
      }

      let xmlSnippet = '';
      if (occ.bpmnMeta && occ.bpmnMeta.node) {
        const s = new XMLSerializer();
        xmlSnippet = s.serializeToString(occ.bpmnMeta.node);
        if (xmlSnippet.length > 250) xmlSnippet = xmlSnippet.substring(0, 250) + '...';
      }

      return `
        <div class="var-trace-step ${stepClass}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--text-primary); font-size:12.5px;">${icon} Étape ${idx + 1} : ${esc(actionLabel)}</strong>
            <span style="font-size:10.5px; color:var(--text-tertiary);">${esc(occ.fileName || '')}</span>
          </div>
          <div style="font-size:11.5px; color:var(--text-secondary);">
            <strong>Processus :</strong> <code>${esc(occ.parentProcess || 'Inconnu')}</code> &bull; 
            <strong>Élément :</strong> ${esc(occ.callingProcess || 'N/A')}
          </div>
          ${xmlSnippet ? `<div class="xml-snippet-box"><code>${esc(xmlSnippet)}</code></div>` : ''}
        </div>
      `;
    }).join('');
  }

  modal.style.display = 'flex';
}

function closeVarInspector() {
  const modal = document.getElementById('varInspectorModal');
  if (modal) modal.style.display = 'none';
  selectedVarForInspection = null;
}

function applyInspectorSuggestion() {
  const sugInput = document.getElementById('inspectorEditedSuggestion');
  if (!sugInput || !selectedVarForInspection) return;
  const newVal = sugInput.value.trim();
  if (!newVal) return;

  allRows.forEach(r => {
    if (r.name === selectedVarForInspection) {
      r.editedSuggestion = newVal;
    }
  });

  saveCurrentState();
  renderResults();
  renderTable();
  openVarInspector(selectedVarForInspection);
}

// ---------- Auto-Fix Multi-BPMN & Export ZIP ----------
async function applyBpmnAutoFixAndDownload() {
  if (!isBPMNMode || (!bpmnBatch.length && !bpmnXmlDoc)) {
    alert("Aucun fichier BPMN n'est actuellement chargé.");
    return;
  }

  const nameMap = new Map();
  allRows.forEach(r => {
    if (r.status !== 'valid' && r.editedSuggestion && r.editedSuggestion.trim() !== r.name) {
      nameMap.set(r.name.trim(), r.editedSuggestion.trim());
    }
  });

  if (nameMap.size === 0) {
    alert("Toutes les variables sont déjà conformes ou aucune suggestion n'a été modifiée.");
    return;
  }

  showAppLoader({
    durationMs: 2000
  });

  await new Promise(r => setTimeout(r, 2000));

  function fixSingleDoc(xmlDoc, rows) {
    let tempIdCounter = 1;
    rows.forEach(r => {
      if (r.bpmnMeta && r.bpmnMeta.node) {
        if (!r.bpmnMeta.node.hasAttribute('data-auditor-temp-id')) {
          r.bpmnMeta.node.setAttribute('data-auditor-temp-id', 'id_' + tempIdCounter++);
        }
      }
    });

    const clonedDoc = xmlDoc.cloneNode(true);

    rows.forEach(r => {
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
            const regex = new RegExp('\\b' + escapedOld + '\\b', 'g');
            updatedValue = updatedValue.replace(regex, newValue);
          });
          if (attr) clonedNode.setAttribute(attr, updatedValue);
          else clonedNode.textContent = updatedValue;
        }
      }
    });

    rows.forEach(r => {
      if (r.bpmnMeta && r.bpmnMeta.node) r.bpmnMeta.node.removeAttribute('data-auditor-temp-id');
    });
    const tempNodes = clonedDoc.querySelectorAll('[data-auditor-temp-id]');
    tempNodes.forEach(n => n.removeAttribute('data-auditor-temp-id'));

    const serializer = new XMLSerializer();
    return serializer.serializeToString(clonedDoc);
  }

  // Si un seul fichier BPMN chargé
  if (bpmnBatch.length <= 1) {
    const targetDoc = bpmnBatch.length === 1 ? bpmnBatch[0].xmlDoc : bpmnXmlDoc;
    const targetName = bpmnBatch.length === 1 ? bpmnBatch[0].fileName : bpmnFileName;
    const correctedXml = fixSingleDoc(targetDoc, allRows);
    const correctedFileName = targetName.replace(/\.bpmn$/, '_corrected.bpmn').replace(/\.xml$/, '_corrected.xml');
    dl(correctedXml, correctedFileName, 'application/xml');
    return;
  }

  // Si plusieurs fichiers BPMN chargés : créer un ZIP avec JSZip
  if (!window.JSZip) {
    alert("Bibliothèque JSZip non disponible. Téléchargement individuel en cours.");
    bpmnBatch.forEach(b => {
      const fileRows = allRows.filter(r => r.fileName === b.fileName);
      const correctedXml = fixSingleDoc(b.xmlDoc, fileRows);
      const correctedFileName = b.fileName.replace(/\.bpmn$/, '_corrected.bpmn').replace(/\.xml$/, '_corrected.xml');
      dl(correctedXml, correctedFileName, 'application/xml');
    });
    return;
  }

  const zip = new JSZip();
  bpmnBatch.forEach(b => {
    const fileRows = allRows.filter(r => r.fileName === b.fileName);
    const correctedXml = fixSingleDoc(b.xmlDoc, fileRows);
    const correctedFileName = b.fileName.replace(/\.bpmn$/, '_corrected.bpmn').replace(/\.xml$/, '_corrected.xml');
    zip.file(correctedFileName, correctedXml);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = 'camunda_audit_bpmn_corriges.zip';
  a.click();
}

// ---------- Multi-Sheet Excel Export ----------
function exportExcel() {
  if (!window.XLSX) { alert('Bibliothèque XLSX non chargée'); return; }

  const wb = XLSX.utils.book_new();

  // 1. Synthèse & Scorecard
  const total = allRows.length;
  const valid = allRows.filter(r => r.status === 'valid').length;
  const invalid = allRows.filter(r => r.status === 'invalid').length;
  const warn = allRows.filter(r => r.status === 'warn').length;
  const score = Math.round((valid / total) * 100) || 0;

  const summaryData = [
    ['AUDITFLOW PRO - RAPPORT D\'AUDIT GLOBAL DES VARIABLES BPMN'],
    ['Date d\'export', new Date().toLocaleString()],
    ['Nombre total de fichiers BPMN', bpmnBatch.length || 1],
    ['Score Global de Conformité', `${score}%`],
    [],
    ['MÉTRIQUES CLÉS', 'VALEUR'],
    ['Total des variables', total],
    ['Variables Conformes', valid],
    ['Variables Non Conformes', invalid],
    ['Avertissements', warn],
    ['Processus Analysés', Object.keys(procHierarchyData.allProcesses).length],
    ['Call Activities Totales', procHierarchyData.callRelations.length],
    ['Sous-processus Non Résolus', procHierarchyData.missingSubprocesses.length]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(sanitizeAoA(summaryData));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse & KPIs');

  // 2. Inventaire des Variables & Conformité
  const varHeaders = ['Variable Originale', 'Statut', 'Problèmes Détectés', 'Suggestion camelCase', 'Rôle Cycle de Vie', 'Processus Parent', 'Fichier Source', 'Sensibilité', 'Équipe Propriétaire'];
  const varData = [varHeaders];
  allRows.forEach(r => {
    varData.push([
      r.name,
      r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme',
      r.issues.map(i => i.msg).join('; '),
      r.editedSuggestion || '',
      getLifecycleLabel(r.role),
      r.parentProcess || '',
      r.fileName || bpmnFileName || '',
      r.sensitivity || 'Public',
      r.team || 'Non assignée'
    ]);
  });
  const wsVars = XLSX.utils.aoa_to_sheet(sanitizeAoA(varData));
  XLSX.utils.book_append_sheet(wb, wsVars, 'Variables & Audit');

  // 3. Hiérarchie des Processus
  const procHeaders = ['Nom du Processus', 'Identifiant (ID)', 'Type de Processus', 'Fichier BPMN', 'Nombre de Variables', 'Nombre d\'Activités', 'Nombre d\'Appels CallActivity'];
  const procData = [procHeaders];
  Object.values(procHierarchyData.allProcesses).forEach(p => {
    procData.push([
      p.processName,
      p.processId,
      p.isRoot ? 'Processus Principal (Racine)' : 'Sous-processus Invoqué',
      p.fileName,
      p.variables ? p.variables.length : 0,
      p.activities ? p.activities.length : 0,
      p.callActivities ? p.callActivities.length : 0
    ]);
  });
  const wsProc = XLSX.utils.aoa_to_sheet(sanitizeAoA(procData));
  XLSX.utils.book_append_sheet(wb, wsProc, 'Hiérarchie Processus');

  // 4. Call Activities & Mappages In-Out
  const caHeaders = ['Processus Appelant', 'Activité CallActivity', 'Sous-processus Appelé', 'Mappages Entrée (In)', 'Mappages Sortie (Out)', 'Statut Résolution'];
  const caData = [caHeaders];
  procHierarchyData.callRelations.forEach(ca => {
    caData.push([
      ca.callerName,
      ca.activityName || ca.activityId,
      ca.calledElement,
      ca.inMappings.map(m => `${m.source} ➔ ${m.target}`).join('; '),
      ca.outMappings.map(m => `${m.source} ➔ ${m.target}`).join('; '),
      ca.isResolved ? 'Fichier Lié' : 'Non Fourni'
    ]);
  });
  const wsCa = XLSX.utils.aoa_to_sheet(sanitizeAoA(caData));
  XLSX.utils.book_append_sheet(wb, wsCa, 'Call Activities & I-O');

  // 5. Anomalies & Variables Mortes
  const anomHeaders = ['Variable', 'Type d\'Anomalie', 'Description', 'Processus Associé', 'Fichier'];
  const anomData = [anomHeaders];
  allRows.filter(r => r.role === 'dead' || r.role === 'orphan').forEach(r => {
    anomData.push([
      r.name,
      r.role === 'dead' ? 'Variable Morte (Ghost)' : 'Variable Non Initialisée (Orpheline)',
      r.role === 'dead' ? 'Produite dans une activité mais jamais consommée en aval' : 'Lue dans une condition ou un input sans affectation préalable',
      r.parentProcess,
      r.fileName || ''
    ]);
  });
  const wsAnom = XLSX.utils.aoa_to_sheet(sanitizeAoA(anomData));
  XLSX.utils.book_append_sheet(wb, wsAnom, 'Anomalies & Variables Mortes');

  // 6. Doublons & Cohérence Sémantique
  if (window.DuplicatesEngine) {
    const dupAnalysis = window.DuplicatesEngine.detectVariableDuplicates(allRows);
    if (dupAnalysis && dupAnalysis.clusters.length > 0) {
      const dupHeaders = ['Cluster ID', 'Forme Cible Recommandée', 'Type Incohérence', 'Similarité', 'Conflit Inter-Processus', 'Variante', 'Statut', 'Processus Associés', 'Fichiers', 'Occurrences'];
      const dupData = [dupHeaders];
      dupAnalysis.clusters.forEach(c => {
        c.variants.forEach(v => {
          dupData.push([
            c.id,
            c.recommendedName,
            c.primaryLabel,
            `${c.avgSimilarityPercent}%`,
            c.isInterProcess ? 'OUI (Multi-Proc)' : 'NON',
            v.name,
            v.status === 'valid' ? 'Conforme' : v.status === 'warn' ? 'Avertissement' : 'Non conforme',
            v.processes.join(', '),
            v.files.join(', '),
            v.occurrencesCount
          ]);
        });
      });
      const wsDup = XLSX.utils.aoa_to_sheet(sanitizeAoA(dupData));
      XLSX.utils.book_append_sheet(wb, wsDup, 'Doublons & Cohérence');
    }
  }

  XLSX.writeFile(wb, 'camunda_audit_variables_complet.xlsx');
}

// ---------- Démo Données (Excel / Saisie avec Doublons et Variations) ----------
function loadDemo() {
  const demoVars = [
    'customerId', 'customer_id', 'CustomerId', 'idClient', 'client_id',
    'orderAmount', 'OrderAmount', 'order_amount',
    'Xnodes', 'xnodes', 'x_nodes',
    'InvoiceNumber', 'invoice_number', 'invoiceNbr',
    'user_email', 'userEmail', 'UserEmail',
    'processInstanceKey', 'prénom_client', '2ndStep', 'statut_validation'
  ];
  document.getElementById('manualInput').value = demoVars.join('\n');
  rawFileData = [];
  fileHeaders = [];
  isBPMNMode = false;
  bpmnRows = [];
  bpmnBatch = [];
  bpmnXmlDoc = null;
  bpmnFileName = "";
  document.getElementById('uploadTitle').textContent = 'Données Démo (20 variables avec doublons et variations)';
  document.getElementById('uploadSub').textContent = 'Exemples variés de conventions, casses et doublons sémantiques prêts à analyser';
  document.getElementById('mappingSection').style.display = 'none';
  const batchSec = document.getElementById('bpmnBatchSection');
  if (batchSec) batchSec.style.display = 'none';
  analyze();
}
window.loadDemo = loadDemo;

// ---------- Réinitialisation Globale ----------
function resetAll() {
  allRows = [];
  filteredRows = [];
  rawFileData = [];
  fileHeaders = [];
  fileRows = null;
  bpmnRows = [];
  bpmnBatch = [];
  bpmnXmlDoc = null;
  bpmnFileName = "";
  isBPMNMode = false;
  currentFilter = 'all';
  searchVal = '';
  currentPage = 1;
  currentDuplicatesAnalysis = null;

  document.getElementById('manualInput').value = '';
  document.getElementById('uploadTitle').textContent = 'Déposer 1 à n fichiers BPMN, XML, Excel ou CSV';
  document.getElementById('uploadSub').textContent = 'Importez un ou plusieurs modèles BPMN (.bpmn, .xml) pour auditer les flux et cartographier les sous-processus — glissez ou cliquez';
  document.getElementById('mappingSection').style.display = 'none';
  document.getElementById('previewBox').innerHTML = '<span style="color:var(--text-tertiary)">L\'aperçu apparaîtra ici après import d\'un fichier...</span>';
  document.getElementById('countHint').textContent = '';
  const batchSec = document.getElementById('bpmnBatchSection');
  if (batchSec) batchSec.style.display = 'none';

  ['resultsTab', 'dashTab', 'graphTab', 'rankTab', 'procRelTab', 'duplicatesTab', 'resetBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const dupBanner = document.getElementById('duplicatesAlertBanner');
  if (dupBanner) dupBanner.style.display = 'none';
  const ghostBanner = document.getElementById('ghostVariablesBanner');
  if (ghostBanner) ghostBanner.style.display = 'none';
  const autofixBanner = document.getElementById('autofixBanner');
  if (autofixBanner) autofixBanner.style.display = 'none';

  switchTab('import');
}
window.resetAll = resetAll;

// ---------- Démo Multi-BPMN (4 Processus Reliés) ----------
function loadDemoMultiBpmn() {
  const demoBPMN1 = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" id="Def_Order" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Commande_Client" name="1. Orchestration Commande Client" isExecutable="true">
    <bpmn:extensionElements>
      <zeebe:properties>
        <zeebe:property key="global_order_timeout" value="48h" />
      </zeebe:properties>
    </bpmn:extensionElements>
    <bpmn:startEvent id="Start_1" name="Commande Reçue" />
    <bpmn:serviceTask id="Task_InitOrder" name="Initialiser Panier">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= raw_payload.customer_id" target="idClient" />
          <zeebe:output source="= order_total_amount" target="montantCommande" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:callActivity id="Call_Risk" name="Évaluer Risque Financier" calledElement="Process_Evaluation_Risque">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= montantCommande" target="montantAControler" />
          <zeebe:input source="= idClient" target="identifiantClient" />
          <zeebe:output source="= decision_score_final" target="decisionRisque" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_Payment" name="Encaisser Paiement" calledElement="Process_Paiement_Facturation">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= montantCommande" target="montantAPayer" />
          <zeebe:input source="= idClient" target="refClient" />
          <zeebe:output source="= ref_transaction" target="referenceTransaction" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_Shipping" name="Expédier Commande" calledElement="Process_Expedition_Livraison">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= idClient" target="destinataireId" />
          <zeebe:output source="= tracking_code" target="numeroSuiviColis" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_ExternalAudit" name="Audit Externe (Non Fourni)" calledElement="Process_Audit_Externe_Tiers" />
    <bpmn:endEvent id="End_1" name="Commande Clôturée" />
  </bpmn:process>
</bpmn:definitions>`;

  const demoBPMN2 = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Def_Risk" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Evaluation_Risque" name="2. Sous-processus Évaluation Risque" isExecutable="true">
    <bpmn:startEvent id="Start_Risk" />
    <bpmn:serviceTask id="Task_CheckCredit" name="Consulter Banque de France">
      <bpmn:extensionElements>
        <camunda:inputOutput>
          <camunda:inputParameter name="client_id_param">\${identifiantClient}</camunda:inputParameter>
          <camunda:outputParameter name="score_bdf">\${scoreCredit}</camunda:outputParameter>
        </camunda:inputOutput>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_ManualReview" name="Revue Manuelle Risque">
      <bpmn:extensionElements>
        <camunda:formData>
          <camunda:formField id="avis_analyste_risques" type="string" />
        </camunda:formData>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Risk" />
  </bpmn:process>
</bpmn:definitions>`;

  const demoBPMN3 = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" id="Def_Pay" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Paiement_Facturation" name="3. Sous-processus Paiement &amp; Facturation" isExecutable="true">
    <bpmn:startEvent id="Start_Pay" />
    <bpmn:serviceTask id="Task_ChargeCard" name="Débiter Carte Bancaire">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= montantAPayer" target="amountToCharge" />
          <zeebe:output source="= payment_auth_token" target="tokenPaiement" />
          <zeebe:output source="= unused_debug_payload" target="debugGhostVar" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_GenerateInvoice" name="Générer Facture PDF">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= tokenPaiement" target="authConfirm" />
          <zeebe:output source="= pdf_url" target="urlFacture" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Pay" />
  </bpmn:process>
</bpmn:definitions>`;

  const demoBPMN4 = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" id="Def_Ship" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Expedition_Livraison" name="4. Sous-processus Expédition &amp; Livraison" isExecutable="true">
    <bpmn:startEvent id="Start_Ship" />
    <bpmn:serviceTask id="Task_PreparePackage" name="Préparer Colis Entrepôt">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= destinataireId" target="customerId" />
          <zeebe:output source="= warehouse_bin" target="emplacementStock" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_NotifyCarrier" name="Informer Transporteur">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= emplacementStock" target="binLocation" />
          <zeebe:output source="= carrier_name" target="transporteurNom" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Ship" />
  </bpmn:process>
</bpmn:definitions>`;

  bpmnBatch = [
    parseSingleBpmnDoc(demoBPMN1, 'Process_Commande_Client.bpmn'),
    parseSingleBpmnDoc(demoBPMN2, 'Process_Evaluation_Risque.bpmn'),
    parseSingleBpmnDoc(demoBPMN3, 'Process_Paiement_Facturation.bpmn'),
    parseSingleBpmnDoc(demoBPMN4, 'Process_Expedition_Livraison.bpmn')
  ];

  updateBpmnBatchState();
  analyze();
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

// ==========================================
//   MODULE DÉTECTION DES DOUBLONS & COHÉRENCE (ENRICHI)
// ==========================================

let currentDuplicatesAnalysis = null;
let currentDupSubView = 'cards'; // 'cards' | 'table' | 'graph' | 'diff'
let currentDupPillFilter = 'all'; // 'all' | 'inter' | 'case_sep' | 'permutation' | 'fuzzy' | 'plural'
let currentDupSortBy = 'risk'; // 'risk' | 'variants' | 'occ' | 'sim' | 'alpha'
let selectedDupRowKeys = new Set();
let dupVisNetworkInstance = null;
let dupVisPhysicsEnabled = true;
let allDupCardsCollapsed = false;

let duplicatesOptions = {
  similarityThreshold: 0.80,
  ignoreCaseAndSeparators: true,
  ignoreTokenOrder: true,
  enableFuzzyMatch: true,
  enableSingularPlural: true,
  enableSynonyms: false,
  scope: 'all',
  search: '',
  filterDiscrepancy: 'all'
};

function runDuplicatesAnalysis() {
  if (!window.DuplicatesEngine) return null;
  currentDuplicatesAnalysis = window.DuplicatesEngine.detectVariableDuplicates(allRows, duplicatesOptions);
  return currentDuplicatesAnalysis;
}

window.switchDupSubView = function(viewName) {
  currentDupSubView = viewName;

  // Mise à jour des boutons d'onglets
  const btnCards = document.getElementById('btnDupViewCards');
  const btnTable = document.getElementById('btnDupViewTable');
  const btnGraph = document.getElementById('btnDupViewGraph');
  const btnDiff = document.getElementById('btnDupViewDiff');

  if (btnCards) btnCards.classList.toggle('active', viewName === 'cards');
  if (btnTable) btnTable.classList.toggle('active', viewName === 'table');
  if (btnGraph) btnGraph.classList.toggle('active', viewName === 'graph');
  if (btnDiff) btnDiff.classList.toggle('active', viewName === 'diff');

  // Affichage / masquage des conteneurs
  const viewCards = document.getElementById('subViewDupCards');
  const viewTable = document.getElementById('subViewDupTable');
  const viewGraph = document.getElementById('subViewDupGraph');
  const viewDiff = document.getElementById('subViewDupDiff');

  if (viewCards) viewCards.style.display = viewName === 'cards' ? 'block' : 'none';
  if (viewTable) viewTable.style.display = viewName === 'table' ? 'block' : 'none';
  if (viewGraph) viewGraph.style.display = viewName === 'graph' ? 'block' : 'none';
  if (viewDiff) viewDiff.style.display = viewName === 'diff' ? 'block' : 'none';

  renderDuplicatesUI();
};

window.setDupPillFilter = function(filterKey) {
  currentDupPillFilter = filterKey;

  // Mettre à jour l'état visuel des pilules
  const pillIds = ['all', 'inter', 'case_sep', 'permutation', 'fuzzy', 'plural'];
  pillIds.forEach(k => {
    const pill = document.getElementById(`dupPill${k === 'case_sep' ? 'Case' : k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (pill) pill.classList.toggle('active', k === filterKey);
  });

  renderDuplicatesUI();
};

window.onDupSortChange = function(val) {
  currentDupSortBy = val;
  renderDuplicatesUI();
};

window.toggleDupOptionsBar = function() {
  const card = document.getElementById('dupAdvancedOptionsCard');
  if (card) {
    const isHidden = card.style.display === 'none';
    card.style.display = isHidden ? 'block' : 'none';
  }
};

window.toggleAllDupCardsCollapse = function() {
  allDupCardsCollapsed = !allDupCardsCollapsed;
  const btnText = document.getElementById('toggleAllCardsText');
  if (btnText) {
    btnText.textContent = allDupCardsCollapsed ? '▲ Tout Replier' : '▼ Tout Déplier';
  }
  const bodies = document.querySelectorAll('.dup-cluster-body');
  bodies.forEach(b => {
    b.style.display = allDupCardsCollapsed ? 'none' : 'block';
  });
};

function renderDuplicatesUI() {
  if (!window.DuplicatesEngine) return;

  const analysis = runDuplicatesAnalysis();
  if (!analysis) return;

  const { clusters, totalDuplicatesCount, totalClustersCount, interProcessConflictsCount, options } = analysis;

  // Calcul des compteurs de filtres rapides (Pills)
  const countAll = clusters.length;
  const countInter = clusters.filter(c => c.isInterProcess).length;
  const countCase = clusters.filter(c => c.primaryType === 'case_sep').length;
  const countPerm = clusters.filter(c => c.primaryType === 'permutation').length;
  const countFuzzy = clusters.filter(c => c.primaryType === 'fuzzy').length;
  const countPlural = clusters.filter(c => c.primaryType === 'plural').length;

  const elPillAll = document.getElementById('pillCountAll');
  const elPillInter = document.getElementById('pillCountInter');
  const elPillCase = document.getElementById('pillCountCase');
  const elPillPerm = document.getElementById('pillCountPerm');
  const elPillFuzzy = document.getElementById('pillCountFuzzy');
  const elPillPlural = document.getElementById('pillCountPlural');

  if (elPillAll) elPillAll.textContent = countAll;
  if (elPillInter) elPillInter.textContent = countInter;
  if (elPillCase) elPillCase.textContent = countCase;
  if (elPillPerm) elPillPerm.textContent = countPerm;
  if (elPillFuzzy) elPillFuzzy.textContent = countFuzzy;
  if (elPillPlural) elPillPlural.textContent = countPlural;

  // Filtrer les clusters selon la pilule active
  let displayClusters = [...clusters];
  if (currentDupPillFilter === 'inter') {
    displayClusters = displayClusters.filter(c => c.isInterProcess);
  } else if (currentDupPillFilter !== 'all') {
    displayClusters = displayClusters.filter(c => c.primaryType === currentDupPillFilter);
  }

  // Tri des clusters
  if (currentDupSortBy === 'risk') {
    displayClusters.sort((a, b) => {
      if (b.isInterProcess !== a.isInterProcess) return b.isInterProcess ? 1 : -1;
      return b.variants.length - a.variants.length;
    });
  } else if (currentDupSortBy === 'variants') {
    displayClusters.sort((a, b) => b.variants.length - a.variants.length);
  } else if (currentDupSortBy === 'occ') {
    displayClusters.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
  } else if (currentDupSortBy === 'sim') {
    displayClusters.sort((a, b) => b.avgSimilarityPercent - a.avgSimilarityPercent);
  } else if (currentDupSortBy === 'alpha') {
    displayClusters.sort((a, b) => a.recommendedName.localeCompare(b.recommendedName));
  }

  // Mettre à jour les KPIs
  const kpiClusters = document.getElementById('kpi-dup-clusters');
  const kpiTotal = document.getElementById('kpi-dup-total');
  const kpiInter = document.getElementById('kpi-dup-inter');
  const kpiScore = document.getElementById('kpi-dup-score');
  const kpiClustersStatus = document.getElementById('kpi-dup-clusters-status');
  const kpiTotalStatus = document.getElementById('kpi-dup-total-status');
  const kpiInterStatus = document.getElementById('kpi-dup-inter-status');
  const kpiScoreStatus = document.getElementById('kpi-dup-score-status');

  const totalAllVars = allRows.length;
  const coherenceScore = totalAllVars > 0 ? Math.max(0, Math.round((1 - (totalDuplicatesCount / (totalAllVars * 1.5))) * 100)) : 100;
  const scoreColor = coherenceScore >= 90 ? '#10b981' : coherenceScore >= 70 ? 'var(--brand-primary)' : '#ea580c';

  if (kpiClusters) kpiClusters.textContent = totalClustersCount;
  if (kpiTotal) kpiTotal.textContent = totalDuplicatesCount;
  if (kpiInter) kpiInter.textContent = interProcessConflictsCount;
  if (kpiScore) {
    kpiScore.textContent = `${coherenceScore}%`;
    kpiScore.style.color = scoreColor;
  }
  if (kpiClustersStatus) kpiClustersStatus.textContent = `${totalClustersCount} groupe(s) sémantique(s) identifié(s)`;
  if (kpiTotalStatus) kpiTotalStatus.textContent = `${totalDuplicatesCount} variable(s) à harmoniser`;
  if (kpiInterStatus) kpiInterStatus.textContent = interProcessConflictsCount > 0 ? `${interProcessConflictsCount} divergence(s) multi-fichiers` : 'Aucun conflit inter-processus';
  if (kpiScoreStatus) kpiScoreStatus.textContent = coherenceScore >= 90 ? 'Excellente homogénéité' : coherenceScore >= 70 ? 'Bonne cohérence globale' : 'Divergences importantes';

  // Synchroniser les contrôles d'options avancées
  const rangeEl = document.getElementById('dupThresholdRange');
  const labelEl = document.getElementById('dupThresholdLabel');
  if (rangeEl) rangeEl.value = Math.round(duplicatesOptions.similarityThreshold * 100);
  if (labelEl) labelEl.textContent = `${Math.round(duplicatesOptions.similarityThreshold * 100)}%`;

  const scopeEl = document.getElementById('dupScopeSelect');
  if (scopeEl) scopeEl.value = duplicatesOptions.scope;

  const discEl = document.getElementById('dupDiscrepancySelect');
  if (discEl) discEl.value = duplicatesOptions.filterDiscrepancy;

  const searchEl = document.getElementById('dupSearchInput');
  if (searchEl && searchEl.value !== duplicatesOptions.search) searchEl.value = duplicatesOptions.search;

  const chkCase = document.getElementById('dupOptCase');
  if (chkCase) chkCase.checked = duplicatesOptions.ignoreCaseAndSeparators;
  const chkPerm = document.getElementById('dupOptPerm');
  if (chkPerm) chkPerm.checked = duplicatesOptions.ignoreTokenOrder;
  const chkFuzzy = document.getElementById('dupOptFuzzy');
  if (chkFuzzy) chkFuzzy.checked = duplicatesOptions.enableFuzzyMatch;
  const chkPlural = document.getElementById('dupOptPlural');
  if (chkPlural) chkPlural.checked = duplicatesOptions.enableSingularPlural;

  // Gérer l'état vide
  const emptyMsg = document.getElementById('dupEmptyMsg');
  if (displayClusters.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
  }

  // Rendu de la sous-vue active
  if (currentDupSubView === 'cards') {
    renderDuplicatesCardsView(displayClusters);
  } else if (currentDupSubView === 'table') {
    renderDuplicatesTableView(displayClusters);
  } else if (currentDupSubView === 'graph') {
    renderDuplicatesGraphView(displayClusters);
  } else if (currentDupSubView === 'diff') {
    renderDuplicatesDiffView(clusters);
  }
}

// ----------------------------------------------------
// SOUS-VUE 1 : CARTES & GROUPES INTELLIGENTS
// ----------------------------------------------------
function renderDuplicatesCardsView(clusters) {
  const container = document.getElementById('dupClustersContainer');
  if (!container) return;

  if (clusters.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = clusters.map(c => {
    const interBadge = c.isInterProcess
      ? `<span class="proc-badge-tag tag-inter" title="Variables utilisées avec des écritures différentes entre plusieurs processus BPMN">⚠️ Conflit Inter-Processus (${c.processes.length} proc.)</span>`
      : `<span class="proc-badge-tag tag-intra">📁 Intra-Processus</span>`;

    const variantsRowsHtml = c.variants.map((v, vIdx) => {
      const isTarget = v.name === c.recommendedName;
      const statusBadge = v.status === 'valid'
        ? `<span class="badge ok">Conforme</span>`
        : (v.status === 'warn' ? `<span class="badge warn">Avertissement</span>` : `<span class="badge err">Non conforme</span>`);

      const processesHtml = v.processes.map(p => `<span class="badge badge-process" style="font-size:10px;">${escHtml(p)}</span>`).join(' ') || '<span style="color:var(--text-tertiary); font-size:10.5px;">Non spécifié</span>';
      const filesHtml = v.files.map(f => `<span style="font-size:10.5px; color:var(--text-tertiary); font-family:var(--font-mono);">${escHtml(f)}</span>`).join(', ') || '';

      const rolesHtml = v.roles.map(r => getLifecycleBadgeHTML(r)).join(' ');
      const activitiesHtml = v.activities && v.activities.length
        ? `<div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">📍 ${escHtml(v.activities.slice(0, 2).join(', '))}${v.activities.length > 2 ? ` (+${v.activities.length - 2})` : ''}</div>`
        : '';

      const diffPreview = v.diffInfo && v.diffInfo.variantDiffHtml
        ? `<div class="dup-diff-preview" title="${escHtml(v.diffInfo.diffDescription)}">${v.diffInfo.variantDiffHtml}</div>`
        : `<code class="mono">${escHtml(v.name)}</code>`;

      return `
        <tr class="${isTarget ? 'variant-target-row' : ''}">
          <td style="text-align:center;">
            <input type="radio" name="targetRadio_${c.id}" value="${escAttr(v.name)}" ${isTarget ? 'checked' : ''} onchange="setClusterCustomTarget('${c.id}', '${escAttr(v.name)}')" title="Définir '${escAttr(v.name)}' comme cible recommandée pour ce cluster" style="accent-color:#16a34a; cursor:pointer;">
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="mono" style="font-weight:700; font-size:12.5px; color:${isTarget ? '#16a34a' : 'var(--text-primary)'};">
                  ${isTarget ? '⭐ ' : ''}${escHtml(v.name)}
                </span>
                ${isTarget ? '<span class="badge ok" style="font-size:10px; padding:1px 6px;">Cible Recommandée</span>' : ''}
              </div>
              ${!isTarget ? diffPreview : ''}
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div>${processesHtml}</div>
            ${filesHtml ? `<div style="margin-top:2px;">${filesHtml}</div>` : ''}
            ${activitiesHtml}
          </td>
          <td>${rolesHtml}</td>
          <td style="text-align:center; font-weight:700;">${v.occurrencesCount}</td>
          <td>
            ${v.issues.length ? `<span style="color:var(--err); font-size:11px;">${escHtml(v.issues.join('; '))}</span>` : '<span style="color:var(--text-tertiary); font-size:11px;">—</span>'}
          </td>
          <td style="text-align:right;">
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              ${!isTarget ? `
                <button class="btn-ghost" onclick="applySingleVarHarmonization('${escAttr(v.name)}', '${escAttr(c.recommendedName)}')" style="font-size:11px; padding:3px 8px;" title="Harmoniser cette variable vers ${escAttr(c.recommendedName)}">
                  Harmoniser ➔
                </button>
              ` : '<span style="color:#16a34a; font-size:11px; font-weight:600;">✓ Aligné</span>'}
              <button class="btn-ghost" onclick="inspectClusterInDiff('${escAttr(v.name)}', '${escAttr(c.recommendedName)}')" style="font-size:11px; padding:3px 6px;" title="Comparer dans le Diff Viewer">
                ⚖️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="dup-cluster-card ${c.isInterProcess ? 'is-inter-conflict' : ''}" id="dup-card-${c.id}">
        <div class="dup-cluster-header">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span class="dup-cluster-id-badge">${escHtml(c.id.toUpperCase())}</span>
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:11px; color:var(--text-tertiary); font-weight:600;">FORME CIBLE RECOMMANDÉE :</span>
                <code class="dup-target-code" id="targetLabel_${c.id}">${escHtml(c.recommendedName)}</code>
                <button class="btn-ghost copy-btn" data-sug="${escAttr(c.recommendedName)}" onclick="copySugFromEl(this)" style="padding:1px 6px; font-size:11px;" title="Copier le nom">Copier</button>
              </div>
              <div style="font-size:11.5px; color:var(--text-secondary); margin-top:3px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span>${interBadge}</span>
                <span class="dup-disc-tag ${c.badgeClass}">${escHtml(c.primaryLabel)}</span>
                <span style="color:var(--text-tertiary);">• Similarité moyenne : <strong style="color:var(--brand-primary);">${c.avgSimilarityPercent}%</strong></span>
                <span style="color:var(--text-tertiary);">• <strong>${c.variants.length}</strong> variantes (${c.totalOccurrences} occurrences)</span>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn-ghost" onclick="inspectClusterInGraph('${escAttr(c.id)}')" style="font-size:11.5px; padding:5px 10px;" title="Visualiser ce cluster dans le graphe réseau">
              🕸️ Voir Graphe
            </button>
            <button class="btn-primary" onclick="applyClusterHarmonization('${escAttr(c.id)}', '${escAttr(c.recommendedName)}')" style="font-size:12px; padding:6px 14px; font-weight:600;" title="Remplacer toutes les variantes de ce cluster par ${escAttr(c.recommendedName)} dans les suggestions">
              ✨ Harmoniser ce Groupe vers ${escHtml(c.recommendedName)}
            </button>
          </div>
        </div>

        <div class="dup-cluster-body">
          <div class="tbl-wrap" style="margin:0; border:none;">
            <table>
              <thead>
                <tr>
                  <th style="width:36px; text-align:center;" title="Cible">Cible</th>
                  <th style="width:25%;">Variante &amp; Diff Caractère</th>
                  <th style="width:12%;">Statut</th>
                  <th style="width:23%;">Processus &amp; Activités</th>
                  <th style="width:12%;">Rôle Cycle</th>
                  <th style="width:6%; text-align:center;">Occ.</th>
                  <th style="width:14%;">Problèmes</th>
                  <th style="width:12%; text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${variantsRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------
// SOUS-VUE 2 : TABLEAU SYNTHÉTIQUE / DATAGRID
// ----------------------------------------------------
function renderDuplicatesTableView(clusters) {
  const tbody = document.getElementById('dupTableBody');
  if (!tbody) return;

  if (clusters.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-tertiary);">Aucun doublon à afficher avec les filtres sélectionnés.</td></tr>`;
    return;
  }

  const rowsHtml = [];
  clusters.forEach(c => {
    c.variants.forEach((v, vIdx) => {
      const isTarget = v.name === c.recommendedName;
      const rowKey = `${c.id}__${v.name}`;
      const isChecked = selectedDupRowKeys.has(rowKey);

      const statusBadge = v.status === 'valid'
        ? `<span class="badge ok">Conforme</span>`
        : (v.status === 'warn' ? `<span class="badge warn">Avertissement</span>` : `<span class="badge err">Non conforme</span>`);

      const processesList = v.processes.join(', ') || 'N/A';

      rowsHtml.push(`
        <tr class="${isChecked ? 'row-selected' : ''}">
          <td style="text-align:center;">
            <input type="checkbox" class="chk-dup-row" data-cluster="${escAttr(c.id)}" data-var="${escAttr(v.name)}" data-target="${escAttr(c.recommendedName)}" ${isChecked ? 'checked' : ''} onchange="onDupRowCheckboxChange(this)">
          </td>
          <td><span class="dup-cluster-id-badge" style="font-size:10px;">${escHtml(c.id.toUpperCase())}</span></td>
          <td>
            <div style="font-family:var(--font-mono); font-weight:700; color:${isTarget ? '#16a34a' : 'var(--text-primary)'};">
              ${isTarget ? '⭐ ' : ''}${escHtml(v.name)}
            </div>
          </td>
          <td>
            <code class="dup-target-code" style="font-size:11.5px; padding:2px 6px;">${escHtml(c.recommendedName)}</code>
          </td>
          <td style="text-align:center;">
            <span style="font-weight:700; color:var(--brand-primary);">${c.avgSimilarityPercent}%</span>
          </td>
          <td>
            <span class="dup-disc-tag ${c.badgeClass}">${escHtml(c.primaryLabel)}</span>
          </td>
          <td style="font-size:11px; color:var(--text-secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escAttr(processesList)}">
            ${c.isInterProcess ? '⚠️ ' : ''}${escHtml(processesList)}
          </td>
          <td style="text-align:center; font-weight:700;">${v.occurrencesCount}</td>
          <td style="text-align:right;">
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              ${!isTarget ? `
                <button class="btn-ghost" onclick="applySingleVarHarmonization('${escAttr(v.name)}', '${escAttr(c.recommendedName)}')" style="font-size:11px; padding:3px 8px;" title="Harmoniser">
                  Harmoniser ➔
                </button>
              ` : '<span style="color:#16a34a; font-size:11px; font-weight:600;">✓ Aligné</span>'}
              <button class="btn-ghost" onclick="inspectClusterInDiff('${escAttr(v.name)}', '${escAttr(c.recommendedName)}')" style="font-size:11px; padding:3px 6px;" title="Comparer">
                ⚖️
              </button>
            </div>
          </td>
        </tr>
      `);
    });
  });

  tbody.innerHTML = rowsHtml.join('');
  updateDupTableSelectedBadge();
}

window.toggleDupTableSelectAll = function(checked) {
  const checkboxes = document.querySelectorAll('.chk-dup-row');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    const rowKey = `${cb.getAttribute('data-cluster')}__${cb.getAttribute('data-var')}`;
    if (checked) selectedDupRowKeys.add(rowKey);
    else selectedDupRowKeys.delete(rowKey);
  });
  updateDupTableSelectedBadge();
};

window.onDupRowCheckboxChange = function(cb) {
  const rowKey = `${cb.getAttribute('data-cluster')}__${cb.getAttribute('data-var')}`;
  if (cb.checked) selectedDupRowKeys.add(rowKey);
  else selectedDupRowKeys.delete(rowKey);
  updateDupTableSelectedBadge();
};

function updateDupTableSelectedBadge() {
  const badge = document.getElementById('dupSelectedCountBadge');
  const btn = document.getElementById('btnHarmonizeSelected');
  const count = selectedDupRowKeys.size;
  if (badge) badge.textContent = `${count} sélectionné${count > 1 ? 's' : ''}`;
  if (btn) {
    btn.disabled = count === 0;
    btn.style.opacity = count > 0 ? '1' : '0.6';
  }
}

window.applyBatchSelectedHarmonization = function() {
  if (selectedDupRowKeys.size === 0) return;

  const checkboxes = document.querySelectorAll('.chk-dup-row:checked');
  let updatedCount = 0;

  checkboxes.forEach(cb => {
    const varName = cb.getAttribute('data-var');
    const targetName = cb.getAttribute('data-target');
    if (varName && targetName && varName !== targetName) {
      allRows.forEach(r => {
        if (r.name === varName) {
          r.editedSuggestion = targetName;
          updatedCount++;
        }
      });
    }
  });

  selectedDupRowKeys.clear();
  saveCurrentState();
  renderResults();
  renderDuplicatesUI();
  alert(`Harmonisation par lot terminée avec succès ! (${updatedCount} occurrence(s) mise(s) à jour).`);
};

// ----------------------------------------------------
// SOUS-VUE 3 : CONSTELLATION & GRAPHE VIS.JS
// ----------------------------------------------------
function renderDuplicatesGraphView(clusters) {
  const container = document.getElementById('dupVisNetworkCanvas');
  if (!container || !window.vis || !window.DuplicatesEngine) return;

  const graphData = window.DuplicatesEngine.generateCoherenceGraphData(clusters);

  const options = {
    nodes: {
      borderWidth: 2,
      shadow: true
    },
    edges: {
      width: 1.5,
      shadow: false,
      smooth: { type: 'continuous' }
    },
    physics: {
      enabled: dupVisPhysicsEnabled,
      stabilization: { iterations: 120 },
      barnesHut: {
        gravitationalConstant: -2500,
        centralGravity: 0.25,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 150,
      zoomView: true,
      dragView: true
    }
  };

  if (dupVisNetworkInstance) {
    dupVisNetworkInstance.destroy();
    dupVisNetworkInstance = null;
  }

  dupVisNetworkInstance = new vis.Network(container, graphData, options);

  // Événement au clic sur un nœud
  dupVisNetworkInstance.on('click', function(params) {
    if (params.nodes && params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      inspectDupGraphNode(nodeId, graphData.nodes);
    }
  });
}

function inspectDupGraphNode(nodeId, allNodes) {
  const node = allNodes.find(n => n.id === nodeId);
  const inspector = document.getElementById('dupGraphInspector');
  const titleEl = document.getElementById('dupInspectorTitle');
  const contentEl = document.getElementById('dupInspectorContent');

  if (!node || !inspector || !contentEl) return;

  inspector.style.display = 'block';

  if (node.clusterData) {
    const c = node.clusterData;
    if (titleEl) titleEl.innerHTML = `🎯 Cluster ${escHtml(c.id.toUpperCase())}`;
    contentEl.innerHTML = `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px; color:var(--text-tertiary); font-weight:700;">FORME CIBLE :</div>
        <code class="dup-target-code" style="font-size:13px; display:inline-block; margin-top:2px;">${escHtml(c.recommendedName)}</code>
      </div>
      <div style="margin-bottom:8px;"><strong>Type :</strong> ${escHtml(c.primaryLabel)}</div>
      <div style="margin-bottom:8px;"><strong>Similarité moyenne :</strong> ${c.avgSimilarityPercent}%</div>
      <div style="margin-bottom:8px;"><strong>Périmètre :</strong> ${c.isInterProcess ? '⚠️ Conflit Inter-Processus' : '📁 Intra-Processus'}</div>
      <div style="margin-bottom:8px;"><strong>Processus :</strong> ${escHtml(c.processes.join(', '))}</div>
      <div style="margin-bottom:12px;"><strong>Occurrences totales :</strong> ${c.totalOccurrences}</div>
      <button class="btn-primary" onclick="applyClusterHarmonization('${escAttr(c.id)}', '${escAttr(c.recommendedName)}')" style="width:100%; font-size:11.5px; padding:6px 12px; margin-top:6px;">
        ✨ Harmoniser tout ce cluster
      </button>
    `;
  } else if (node.variantData) {
    const v = node.variantData;
    if (titleEl) titleEl.innerHTML = `📦 Variante : ${escHtml(v.name)}`;
    contentEl.innerHTML = `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px; color:var(--text-tertiary); font-weight:700;">NOM DE VARIABLE :</div>
        <code style="font-family:var(--font-mono); font-size:12.5px; font-weight:700; color:var(--brand-primary);">${escHtml(v.name)}</code>
      </div>
      <div style="margin-bottom:8px;"><strong>Statut :</strong> ${v.status === 'valid' ? 'Conforme' : 'Non conforme'}</div>
      <div style="margin-bottom:8px;"><strong>Occurrences :</strong> ${v.occurrencesCount}</div>
      <div style="margin-bottom:8px;"><strong>Processus :</strong> ${escHtml(v.processes.join(', '))}</div>
      <div style="margin-bottom:8px;"><strong>Fichiers :</strong> ${escHtml(v.files.join(', '))}</div>
      ${v.activities && v.activities.length ? `<div style="margin-bottom:8px;"><strong>Activités :</strong> ${escHtml(v.activities.join(', '))}</div>` : ''}
      <button class="btn-ghost" onclick="inspectClusterInDiff('${escAttr(v.name)}', '')" style="width:100%; font-size:11.5px; padding:6px 12px; margin-top:8px;">
        ⚖️ Ouvrir dans le Comparateur Diff
      </button>
    `;
  }
}

window.closeDupGraphInspector = function() {
  const inspector = document.getElementById('dupGraphInspector');
  if (inspector) inspector.style.display = 'none';
};

window.fitDupGraphNetwork = function() {
  if (dupVisNetworkInstance) dupVisNetworkInstance.fit({ animation: { duration: 600 } });
};

window.toggleDupGraphPhysics = function() {
  dupVisPhysicsEnabled = !dupVisPhysicsEnabled;
  if (dupVisNetworkInstance) {
    dupVisNetworkInstance.setOptions({ physics: { enabled: dupVisPhysicsEnabled } });
  }
  const btn = document.getElementById('btnDupGraphPhysics');
  if (btn) btn.textContent = dupVisPhysicsEnabled ? '⏸️ Figer physique' : '▶️ Réactiver physique';
};

window.inspectClusterInGraph = function(clusterId) {
  switchDupSubView('graph');
  setTimeout(() => {
    if (dupVisNetworkInstance) {
      const hubId = `hub_${clusterId}`;
      dupVisNetworkInstance.selectNodes([hubId]);
      dupVisNetworkInstance.focus(hubId, { scale: 1.2, animation: { duration: 600 } });
    }
  }, 200);
};

// ----------------------------------------------------
// SOUS-VUE 4 : COMPARATEUR DIFF CÔTE-À-CÔTE
// ----------------------------------------------------
function renderDuplicatesDiffView(clusters) {
  const selA = document.getElementById('diffSelectVarA');
  const selB = document.getElementById('diffSelectVarB');
  if (!selA || !selB) return;

  const allVarNames = Array.from(new Set(allRows.map(r => r.name))).filter(Boolean).sort();

  if (allVarNames.length === 0) {
    selA.innerHTML = '<option value="">-- Aucune variable --</option>';
    selB.innerHTML = '<option value="">-- Aucune variable --</option>';
    return;
  }

  const prevA = selA.value;
  const prevB = selB.value;

  selA.innerHTML = allVarNames.map(n => `<option value="${escAttr(n)}">${escHtml(n)}</option>`).join('');
  selB.innerHTML = allVarNames.map(n => `<option value="${escAttr(n)}">${escHtml(n)}</option>`).join('');

  if (prevA && allVarNames.includes(prevA)) selA.value = prevA;
  else if (clusters.length && clusters[0].variants.length >= 2) {
    selA.value = clusters[0].variants[0].name;
  }

  if (prevB && allVarNames.includes(prevB)) selB.value = prevB;
  else if (clusters.length && clusters[0].variants.length >= 2) {
    selB.value = clusters[0].variants[1].name;
  }

  updateDiffComparatorView();
}

window.inspectClusterInDiff = function(varNameA, varNameB) {
  switchDupSubView('diff');
  setTimeout(() => {
    const selA = document.getElementById('diffSelectVarA');
    const selB = document.getElementById('diffSelectVarB');
    if (selA && varNameA) selA.value = varNameA;
    if (selB && varNameB) selB.value = varNameB;
    updateDiffComparatorView();
  }, 100);
};

window.updateDiffComparatorView = function() {
  const selA = document.getElementById('diffSelectVarA');
  const selB = document.getElementById('diffSelectVarB');
  const resEl = document.getElementById('diffComparatorResult');
  if (!selA || !selB || !resEl) return;

  const varA = selA.value;
  const varB = selB.value;

  if (!varA || !varB) {
    resEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-tertiary);">Veuillez sélectionner deux variables pour lancer la comparaison.</div>';
    return;
  }

  const rowsA = allRows.filter(r => r.name === varA);
  const rowsB = allRows.filter(r => r.name === varB);

  const comp = window.DuplicatesEngine.compareVariables(varA, varB, duplicatesOptions);
  const diffInfo = window.DuplicatesEngine.generateVisualDiff(varA, varB);

  const procA = Array.from(new Set(rowsA.map(r => r.parentProcess || r.callingProcess))).filter(Boolean);
  const procB = Array.from(new Set(rowsB.map(r => r.parentProcess || r.callingProcess))).filter(Boolean);

  const actA = Array.from(new Set(rowsA.map(r => r.elementName || r.elementId))).filter(Boolean);
  const actB = Array.from(new Set(rowsB.map(r => r.elementName || r.elementId))).filter(Boolean);

  const exprA = Array.from(new Set(rowsA.map(r => r.expr))).filter(Boolean);
  const exprB = Array.from(new Set(rowsB.map(r => r.expr))).filter(Boolean);

  resEl.innerHTML = `
    <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:12px; padding:18px; margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:24px; font-weight:800; color:var(--brand-primary);">${Math.round(comp.score * 100)}%</div>
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--bouygues-blue);">Indice de Similarité Sémantique</div>
            <div style="font-size:11.5px; color:var(--text-secondary);">${escHtml(comp.reason || 'Analyse lexicale et structurelle')}</div>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary" onclick="applySingleVarHarmonization('${escAttr(varA)}', '${escAttr(varB)}')" style="font-size:11.5px; padding:6px 12px;">
            Harmoniser "${escHtml(varA)}" ➔ "${escHtml(varB)}"
          </button>
          <button class="btn-ghost" onclick="applySingleVarHarmonization('${escAttr(varB)}', '${escAttr(varA)}')" style="font-size:11.5px; padding:6px 12px;">
            Harmoniser "${escHtml(varB)}" ➔ "${escHtml(varA)}"
          </button>
        </div>
      </div>

      <!-- Diff Visuel Caractère par Caractère -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
        <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:8px; padding:12px;">
          <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">DIFF SOURCE (A)</div>
          <div class="dup-diff-display" style="font-size:14px;">${diffInfo.variantDiffHtml}</div>
        </div>
        <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:8px; padding:12px;">
          <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">DIFF CIBLE (B)</div>
          <div class="dup-diff-display" style="font-size:14px;">${diffInfo.targetDiffHtml}</div>
        </div>
      </div>

      <!-- Métadonnées comparées -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:8px; padding:14px; font-size:12px; line-height:1.6;">
          <h4 style="font-size:12.5px; color:var(--brand-primary); margin-bottom:8px;">Détail Variable A (<code>${escHtml(varA)}</code>)</h4>
          <div>• <strong>Occurrences :</strong> ${rowsA.length}</div>
          <div>• <strong>Processus :</strong> ${escHtml(procA.join(', ') || 'N/A')}</div>
          <div>• <strong>Activités :</strong> ${escHtml(actA.join(', ') || 'N/A')}</div>
          ${exprA.length ? `<div>• <strong>Expressions :</strong> <code>${escHtml(exprA.join('; '))}</code></div>` : ''}
        </div>

        <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:8px; padding:14px; font-size:12px; line-height:1.6;">
          <h4 style="font-size:12.5px; color:#16a34a; margin-bottom:8px;">Détail Variable B (<code>${escHtml(varB)}</code>)</h4>
          <div>• <strong>Occurrences :</strong> ${rowsB.length}</div>
          <div>• <strong>Processus :</strong> ${escHtml(procB.join(', ') || 'N/A')}</div>
          <div>• <strong>Activités :</strong> ${escHtml(actB.join(', ') || 'N/A')}</div>
          ${exprB.length ? `<div>• <strong>Expressions :</strong> <code>${escHtml(exprB.join('; '))}</code></div>` : ''}
        </div>
      </div>
    </div>
  `;
};

// ----------------------------------------------------
// ACTIONS D'HARMONISATION & PARAMÉTRAGES
// ----------------------------------------------------
window.setClusterCustomTarget = function(clusterId, targetName) {
  if (!currentDuplicatesAnalysis || !targetName) return;
  const cluster = currentDuplicatesAnalysis.clusters.find(c => c.id === clusterId);
  if (!cluster) return;

  cluster.recommendedName = targetName;
  const labelEl = document.getElementById(`targetLabel_${clusterId}`);
  if (labelEl) labelEl.textContent = targetName;

  renderDuplicatesUI();
};

window.onDupThresholdChange = function(val) {
  duplicatesOptions.similarityThreshold = parseFloat(val) / 100;
  const label = document.getElementById('dupThresholdLabel');
  if (label) label.textContent = `${val}%`;
  renderDuplicatesUI();
};

window.onDupScopeChange = function(val) {
  duplicatesOptions.scope = val;
  renderDuplicatesUI();
};

window.onDupDiscrepancyFilterChange = function(val) {
  duplicatesOptions.filterDiscrepancy = val;
  renderDuplicatesUI();
};

window.onDupSearch = function(val) {
  duplicatesOptions.search = (val || '').trim();
  renderDuplicatesUI();
};

window.onDupOptionToggle = function() {
  duplicatesOptions.ignoreCaseAndSeparators = !!document.getElementById('dupOptCase')?.checked;
  duplicatesOptions.ignoreTokenOrder = !!document.getElementById('dupOptPerm')?.checked;
  duplicatesOptions.enableFuzzyMatch = !!document.getElementById('dupOptFuzzy')?.checked;
  duplicatesOptions.enableSingularPlural = !!document.getElementById('dupOptPlural')?.checked;
  renderDuplicatesUI();
};

window.resetDuplicatesOptions = function() {
  duplicatesOptions = {
    similarityThreshold: 0.80,
    ignoreCaseAndSeparators: true,
    ignoreTokenOrder: true,
    enableFuzzyMatch: true,
    enableSingularPlural: true,
    enableSynonyms: false,
    scope: 'all',
    search: '',
    filterDiscrepancy: 'all'
  };
  currentDupPillFilter = 'all';
  currentDupSortBy = 'risk';
  renderDuplicatesUI();
};

window.applySingleVarHarmonization = function(varName, targetName) {
  if (!varName || !targetName) return;
  let count = 0;
  allRows.forEach(r => {
    if (r.name === varName) {
      r.editedSuggestion = targetName;
      count++;
    }
  });
  saveCurrentState();
  renderResults();
  renderDuplicatesUI();
  alert(`La variable "${varName}" sera harmonisée vers "${targetName}" (${count} occurrence(s) mise(s) à jour).`);
};

window.applyClusterHarmonization = function(clusterId, targetName) {
  if (!currentDuplicatesAnalysis || !targetName) return;
  const cluster = currentDuplicatesAnalysis.clusters.find(c => c.id === clusterId);
  if (!cluster) return;

  const variantNames = new Set(cluster.variants.map(v => v.name));
  let updatedCount = 0;

  allRows.forEach(r => {
    if (variantNames.has(r.name)) {
      r.editedSuggestion = targetName;
      updatedCount++;
    }
  });

  saveCurrentState();
  renderResults();
  renderDuplicatesUI();
  alert(`Cluster "${clusterId}" harmonisé avec succès vers "${targetName}" (${updatedCount} occurrence(s) mise(s) à jour). Prêt pour l'Auto-Fix BPMN !`);
};

window.applyAllClustersHarmonization = function() {
  if (!currentDuplicatesAnalysis || !currentDuplicatesAnalysis.clusters.length) {
    alert("Aucun doublon à harmoniser.");
    return;
  }

  let totalUpdated = 0;
  currentDuplicatesAnalysis.clusters.forEach(cluster => {
    const targetName = cluster.recommendedName;
    const variantNames = new Set(cluster.variants.map(v => v.name));
    allRows.forEach(r => {
      if (variantNames.has(r.name)) {
        r.editedSuggestion = targetName;
        totalUpdated++;
      }
    });
  });

  saveCurrentState();
  renderResults();
  renderDuplicatesUI();
  alert(`Tous les doublons (${currentDuplicatesAnalysis.clusters.length} clusters, ${totalUpdated} occurrences) ont été harmonisés vers leurs cibles recommandées ! Vous pouvez maintenant télécharger les BPMN corrigés avec l'Auto-Fix.`);
};

// Modale & Exporters de rapport
window.openDuplicatesExportModal = function() {
  const modal = document.getElementById('duplicatesExportModal');
  if (modal) modal.style.display = 'flex';
};

window.closeDuplicatesExportModal = function() {
  const modal = document.getElementById('duplicatesExportModal');
  if (modal) modal.style.display = 'none';
};

window.executeDuplicatesExport = function() {
  if (!window.DuplicatesEngine) return;
  const analysis = runDuplicatesAnalysis();
  if (!analysis || !analysis.clusters.length) {
    alert("Aucun doublon à exporter.");
    return;
  }

  const formatRadio = document.querySelector('input[name="dupExportFormat"]:checked');
  const format = formatRadio ? formatRadio.value : 'excel';

  try {
    if (format === 'excel') {
      window.DuplicatesEngine.exportDuplicatesExcel(analysis);
    } else if (format === 'csv') {
      window.DuplicatesEngine.exportDuplicatesCSV(analysis);
    } else if (format === 'json') {
      window.DuplicatesEngine.exportDuplicatesJSON(analysis);
    } else if (format === 'print') {
      window.DuplicatesEngine.printDuplicatesReport(analysis);
    }
    closeDuplicatesExportModal();
  } catch (err) {
    console.error("Erreur lors de l'export des doublons :", err);
    alert("Une erreur est survenue lors de la génération du rapport : " + err.message);
  }
};

// ---------- Event Listeners & initialization ----------
const dz=document.getElementById('dropZone');
if (document.getElementById('fileInput')) {
  document.getElementById('fileInput').addEventListener('change', e => handleFiles(e.target.files));
}
if (dz) {
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag');
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  });
}

const dzSub=document.getElementById('dropZoneSub');
const fileInputSub=document.getElementById('fileInputSub');
if (fileInputSub) {
  fileInputSub.addEventListener('change',e=>handleSubprocessFile(e.target.files[0]));
}
if (dzSub) {
  dzSub.addEventListener('dragover',e=>{e.preventDefault();dzSub.classList.add('drag')});
  dzSub.addEventListener('dragleave',()=>dzSub.classList.remove('drag'));
  dzSub.addEventListener('drop',e=>{e.preventDefault();dzSub.classList.remove('drag');handleSubprocessFile(e.dataTransfer.files[0])});
}

renderRules();

// ---------- Fonctions d'Authentification & Sécurité de Session ----------
let failedLoginAttempts = 0;
let lastFailedAttemptTime = 0;

function checkAuth() {
  const sessionToken = sessionStorage.getItem('pda_camunda_session') || localStorage.getItem('pda_camunda_logged_in');
  const sessionTime = parseInt(sessionStorage.getItem('pda_session_time') || localStorage.getItem('pda_session_time') || '0', 10);
  const now = Date.now();

  let isValid = false;
  if (sessionToken === 'true') {
    if (!sessionTime || (now - sessionTime < MAX_SESSION_DURATION_MS)) {
      isValid = true;
      // Normaliser dans sessionStorage
      sessionStorage.setItem('pda_camunda_session', 'true');
      sessionStorage.setItem('pda_session_time', (sessionTime || now).toString());
    } else {
      // Session expirée
      handleLogout();
      return;
    }
  }

  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  if (isValid) {
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
  const now = Date.now();
  const errorEl = document.getElementById('loginError');

  // Protection anti-bruteforce : temporisation si échecs consécutifs
  if (failedLoginAttempts >= 5 && (now - lastFailedAttemptTime < 5000)) {
    const remainingSec = Math.ceil((5000 - (now - lastFailedAttemptTime)) / 1000);
    if (errorEl) {
      errorEl.textContent = `Trop de tentatives. Veuillez patienter ${remainingSec} seconde(s)...`;
      errorEl.style.display = 'block';
    }
    return;
  }

  const user = (document.getElementById('loginUser').value || '').trim().toLowerCase();
  const pass = (document.getElementById('loginPass').value || '').trim();

  // Comptes autorisés pour l'environnement d'audit
  const validUsers = ['bouygues', 'admin', 'paprika', 'pdacamunda', 'user'];
  const validPass = ['bouygues', 'admin', 'paprika', 'pdacamunda'];

  if (validUsers.includes(user) && (validPass.includes(pass) || pass === user)) {
    failedLoginAttempts = 0;
    sessionStorage.setItem('pda_camunda_session', 'true');
    sessionStorage.setItem('pda_session_time', Date.now().toString());
    localStorage.removeItem('pda_camunda_logged_in');
    checkAuth();
    if (errorEl) errorEl.style.display = 'none';
  } else {
    failedLoginAttempts++;
    lastFailedAttemptTime = Date.now();
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
  sessionStorage.removeItem('pda_camunda_session');
  sessionStorage.removeItem('pda_session_time');
  localStorage.removeItem('pda_camunda_logged_in');
  localStorage.removeItem('pda_session_time');
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
  const btnDiff = document.getElementById('btn-mod-diff');
  if (btnVars) btnVars.classList.toggle('active', moduleName === 'variables');
  if (btnSubs) btnSubs.classList.toggle('active', moduleName === 'subprocesses');
  if (btnBpmn) btnBpmn.classList.toggle('active', moduleName === 'bpmn-naming');
  if (btnPmg) btnPmg.classList.toggle('active', moduleName === 'pmg');
  if (btnRoi) btnRoi.classList.toggle('active', moduleName === 'roi');
  if (btnDiff) btnDiff.classList.toggle('active', moduleName === 'diff');
  const guideHeader = document.getElementById('btn-mod-guide');
  if (guideHeader) guideHeader.classList.remove('active');

  // Mettre à jour l'expansion des groupes de menu
  const groupVars = document.getElementById('group-variables');
  const groupSubs = document.getElementById('group-subprocesses');
  const groupBpmn = document.getElementById('group-bpmn-naming');
  const groupPmg = document.getElementById('group-pmg');
  const groupRoi = document.getElementById('group-roi');
  const groupDiff = document.getElementById('group-diff');
  if (groupVars) groupVars.classList.toggle('expanded', moduleName === 'variables');
  if (groupSubs) groupSubs.classList.toggle('expanded', moduleName === 'subprocesses');
  if (groupBpmn) groupBpmn.classList.toggle('expanded', moduleName === 'bpmn-naming');
  if (groupPmg) groupPmg.classList.toggle('expanded', moduleName === 'pmg');
  if (groupRoi) groupRoi.classList.toggle('expanded', moduleName === 'roi');
  if (groupDiff) groupDiff.classList.toggle('expanded', moduleName === 'diff');

  // Onglets variables
  const varTabIds = ['import', 'config', 'procRelTab', 'resultsTab', 'dashTab', 'graphTab', 'rankTab', 'duplicatesTab', 'histTab'];
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
        if (['procRelTab', 'resultsTab', 'dashTab', 'graphTab', 'rankTab', 'duplicatesTab'].includes(id)) {
          if (id === 'procRelTab') {
            el.style.display = isBPMNMode && allRows.length > 0 ? '' : 'none';
          } else {
            el.style.display = allRows.length > 0 ? '' : 'none';
          }
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
        el.style.display = 'none';
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
  } else if (moduleName === 'diff') {
    switchTab('diff');
    if (typeof initDiffModule === 'function') {
      initDiffModule();
    }
  }
}

function handleSubprocessFile(file) {
  if(!file || !validateFileSize(file)) return;
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
  const reader = new FileReader();
  reader.onload = e => {
    const xmlText = e.target.result;
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent);
      }
      
      // Extraire les Call Activities
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
          const parentProcess = getParentProcessInfoLocal(el);
          
          relations.push({
            parentProcess: parentProcess,
            subprocess: calledElement || '(Sous-processus non défini)',
            elementId: activityName ? `${activityName} (${activityId})` : activityId,
            row: rowId++
          });
        }
      }

      rawSubprocessFileData = [];
      subprocessFileHeaders = [];
      allSubprocessRows = relations.map(r => ({
        ...r,
        status: r.subprocess === '(Sous-processus non défini)' ? 'invalid' : 'valid',
        issues: r.subprocess === '(Sous-processus non défini)' ? ['Sous-processus non défini (appel vide)'] : []
      }));

      document.getElementById('uploadTitleSub').textContent = file.name;
      document.getElementById('uploadSubSub').textContent = `Fichier BPMN chargé (${allSubprocessRows.length} Call Activities trouvées)`;
      document.getElementById('manualInputSub').value = '';
      document.getElementById('mappingSectionSub').style.display = 'none';
      document.getElementById('countHintSub').textContent = `${allSubprocessRows.length} relations détectées`;

      let previewHTML = '';
      const count = Math.min(allSubprocessRows.length, 5);
      for(let i=0; i<count; i++){
        const r = allSubprocessRows[i];
        previewHTML += `<div style="margin-bottom:4px"><strong style="color:var(--brand-primary)">${esc(r.parentProcess)}</strong> ➔ <strong style="color:#10b981">${esc(r.subprocess)}</strong> <span style="color:var(--text-tertiary);font-size:10px">(${esc(r.elementId)})</span></div>`;
      }
      document.getElementById('previewBoxSub').innerHTML = previewHTML || '<span style="color:var(--text-tertiary)">Aucun Call Activity trouvé...</span>';

    } catch(err) {
      console.error("Erreur de lecture BPMN", err);
      alert("Erreur de parsing XML : " + err.message);
    }
  };
  reader.readAsText(file);
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

  const nodeTextColor = '#0f172a';
  const edgeLineColor = '#94a3b8';

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
      if (e.target.files.length > 0) {
        handleBpmnNamingFile(e.target.files[0]);
      }
    });
  }
  
  if (dz) {
    dz.addEventListener('dragover', e => {
      e.preventDefault();
      dz.classList.add('drag');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files.length > 0) {
        handleBpmnNamingFile(e.dataTransfer.files[0]);
      }
    });
  }
  
  bpmnListenersAttached = true;
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
  if (loader) {
    loader.style.display = 'flex';
    loader.offsetHeight; // force reflow
    loader.classList.add('active');
  }
  
  // Wait 2 seconds (simulated loader)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Re-audit elements based on current rules selection
  bpmnNamingElements = auditBpmnXmlDoc(bpmnNamingXmlDoc);
  
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
  const header = 'Type,ID technique,Libellé actuel,Statut,Problèmes,Suggestion\n';
  const body = bpmnNamingElements.map(r => [
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
  
  const data = [['Type d\'élément', 'ID technique', 'Libellé actuel', 'Statut', 'Problèmes', 'Suggestion corrective']];
  bpmnNamingElements.forEach(r => data.push([
    r.typeLabel,
    r.id,
    r.name || '',
    r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme',
    r.issues.map(i => i.msg).join('; '),
    r.editedSuggestion || ''
  ]));
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sanitizeAoA(data));
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Nommage');
  XLSX.writeFile(wb, 'bpmn_naming_audit_rapport.xlsx');
};

window.downloadCorrectedBpmnFile = function() {
  if (!bpmnNamingXmlDoc) {
    alert("Aucun fichier BPMN n'est actuellement chargé.");
    return;
  }
  
  // Clone doc
  const clonedDoc = bpmnNamingXmlDoc.cloneNode(true);
  
  // Apply naming corrections inside XML nodes
  const updatedXmlText = generateCorrectedBpmnXml(clonedDoc, bpmnNamingElements);
  
  const correctedFileName = bpmnNamingFileName
    .replace(/\.bpmn$/, '_naming_corrected.bpmn')
    .replace(/\.xml$/, '_naming_corrected.xml');
    
  dl(updatedXmlText, correctedFileName, 'application/xml');
};




