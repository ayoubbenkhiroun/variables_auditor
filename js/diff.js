/**
 * Paprika AuditFlow Pro - Module Comparateur de Versions BPMN (Diff Engine)
 */

let diffState = {
  v1File: null,
  v2File: null,
  v1Data: null,
  v2Data: null,
  diffResult: null
};

// Initialisation du module diff
window.initDiffModule = function() {
  const dropZoneV1 = document.getElementById('diffDropZoneV1');
  const dropZoneV2 = document.getElementById('diffDropZoneV2');
  const fileInputV1 = document.getElementById('diffFileInputV1');
  const fileInputV2 = document.getElementById('diffFileInputV2');

  if (dropZoneV1 && fileInputV1) {
    dropZoneV1.addEventListener('click', () => fileInputV1.click());
    fileInputV1.addEventListener('change', (e) => handleDiffFile(e.target.files[0], 1));
    setupDragDrop(dropZoneV1, (file) => handleDiffFile(file, 1));
  }

  if (dropZoneV2 && fileInputV2) {
    dropZoneV2.addEventListener('click', () => fileInputV2.click());
    fileInputV2.addEventListener('change', (e) => handleDiffFile(e.target.files[0], 2));
    setupDragDrop(dropZoneV2, (file) => handleDiffFile(file, 2));
  }
};

function setupDragDrop(el, onFile) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drag');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag');
    if (e.dataTransfer.files.length) {
      onFile(e.dataTransfer.files[0]);
    }
  });
}

async function handleDiffFile(file, version) {
  if (!file) return;
  if (window.validateFileSize && !window.validateFileSize(file)) return;
  const content = await file.text();
  
  if (version === 1) {
    diffState.v1File = file;
    diffState.v1Data = parseBpmnForDiff(content, file.name);
    updateDiffDropzoneUI(1, file.name, diffState.v1Data.variables.length);
  } else {
    diffState.v2File = file;
    diffState.v2Data = parseBpmnForDiff(content, file.name);
    updateDiffDropzoneUI(2, file.name, diffState.v2Data.variables.length);
  }

  const btnCompare = document.getElementById('btnRunDiff');
  if (btnCompare) {
    btnCompare.disabled = !(diffState.v1Data && diffState.v2Data);
  }
}

function updateDiffDropzoneUI(version, fileName, varCount) {
  const nameEl = document.getElementById(`diffFileNameV${version}`);
  const countEl = document.getElementById(`diffFileCountV${version}`);
  const zoneEl = document.getElementById(`diffDropZoneV${version}`);
  if (nameEl) nameEl.textContent = fileName;
  if (countEl) countEl.textContent = `${varCount} variables identifiées`;
  if (zoneEl) zoneEl.classList.add('loaded');
}

// Analyse d'un BPMN pour extraction des variables et conformité
function parseBpmnForDiff(xmlString, fileName) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const varsMap = new Map();
  let totalAuditScore = 0;

  // Extraction standard des variables
  const allElements = xmlDoc.getElementsByTagName('*');
  for (let el of allElements) {
    const tagName = el.tagName;
    
    // Attributs directs
    for (let attr of el.attributes) {
      const val = attr.value;
      if (val && (val.startsWith('${') || val.startsWith('#{') || val.includes('camunda:'))) {
        extractVarsFromExpression(val).forEach(v => addVar(varsMap, v, tagName, el.getAttribute('name') || el.id));
      }
    }

    // Balises Camunda
    if (tagName.endsWith(':inputParameter') || tagName.endsWith(':outputParameter') || tagName.endsWith(':in') || tagName.endsWith(':out')) {
      const vName = el.getAttribute('name') || el.getAttribute('target') || el.getAttribute('source');
      if (vName) addVar(varsMap, vName, tagName, el.parentElement?.getAttribute('name') || el.id);
    }
  }

  const varsList = Array.from(varsMap.values()).map(v => {
    const auditRes = typeof checkVariable === 'function' ? checkVariable(v.name) : { status: 'valid', issues: [] };
    const suggestion = (auditRes.status !== 'valid' && typeof toCamelCase === 'function') ? toCamelCase(v.name) : v.name;
    return {
      name: v.name,
      process: fileName,
      locations: v.locations,
      status: auditRes.status,
      issues: auditRes.issues,
      suggestion: suggestion
    };
  });

  const validCount = varsList.filter(v => v.status === 'valid').length;
  const score = varsList.length > 0 ? Math.round((validCount / varsList.length) * 100) : 100;

  return {
    fileName,
    variables: varsList,
    score
  };
}

function addVar(map, name, type, location) {
  const cleanName = name.replace(/[\$\{\}\#]/g, '').trim();
  if (!cleanName || cleanName.length < 2 || /^[0-9]+$/.test(cleanName)) return;
  if (!map.has(cleanName)) {
    map.set(cleanName, { name: cleanName, locations: [] });
  }
  map.get(cleanName).locations.push(`${type} (${location || 'Process'})`);
}

function extractVarsFromExpression(expr) {
  const matches = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const reserved = ['true', 'false', 'null', 'and', 'or', 'not', 'empty', 'execution', 'authenticatedUserId', 'user'];
  return matches.filter(m => !reserved.includes(m));
}

// Exécution du calcul de Diff entre v1 et v2
window.runBpmnComparison = function() {
  if (!diffState.v1Data || !diffState.v2Data) return;

  const v1Map = new Map(diffState.v1Data.variables.map(v => [v.name, v]));
  const v2Map = new Map(diffState.v2Data.variables.map(v => [v.name, v]));

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];
  const regressions = [];

  // Variables présentes dans V2
  v2Map.forEach((v2Var, name) => {
    if (!v1Map.has(name)) {
      added.push(v2Var);
    } else {
      const v1Var = v1Map.get(name);
      if (v1Var.status !== v2Var.status || v1Var.suggestion !== v2Var.suggestion) {
        modified.push({ v1: v1Var, v2: v2Var });
        if (v1Var.status === 'valid' && v2Var.status !== 'valid') {
          regressions.push(v2Var);
        }
      } else {
        unchanged.push(v2Var);
      }
    }
  });

  // Variables supprimées de V1
  v1Map.forEach((v1Var, name) => {
    if (!v2Map.has(name)) {
      removed.push(v1Var);
    }
  });

  const deltaScore = diffState.v2Data.score - diffState.v1Data.score;

  diffState.diffResult = {
    added,
    removed,
    modified,
    unchanged,
    regressions,
    scoreV1: diffState.v1Data.score,
    scoreV2: diffState.v2Data.score,
    deltaScore,
    totalV1: diffState.v1Data.variables.length,
    totalV2: diffState.v2Data.variables.length
  };

  renderDiffResults();
};

// Rendu des résultats du comparateur
function renderDiffResults() {
  const container = document.getElementById('diffResultsContainer');
  if (!container || !diffState.diffResult) return;

  const r = diffState.diffResult;
  container.style.display = 'block';

  // Statistiques KPIs
  document.getElementById('diffScoreV1').textContent = `${r.scoreV1}%`;
  document.getElementById('diffScoreV2').textContent = `${r.scoreV2}%`;
  
  const deltaEl = document.getElementById('diffScoreDelta');
  if (deltaEl) {
    deltaEl.textContent = (r.deltaScore >= 0 ? `+${r.deltaScore}%` : `${r.deltaScore}%`);
    deltaEl.className = `diff-delta-badge ${r.deltaScore >= 0 ? 'positive' : 'negative'}`;
  }

  document.getElementById('diffCountAdded').textContent = r.added.length;
  document.getElementById('diffCountRemoved').textContent = r.removed.length;
  document.getElementById('diffCountModified').textContent = r.modified.length;
  document.getElementById('diffCountRegressions').textContent = r.regressions.length;

  renderDiffTable('all');
}

// Filtre et affichage du tableau de diff
window.filterDiffTable = function(filter) {
  document.querySelectorAll('.diff-filter-pill').forEach(p => p.classList.remove('active'));
  const activeBtn = document.getElementById(`diffPill-${filter}`);
  if (activeBtn) activeBtn.classList.add('active');

  renderDiffTable(filter);
};

function renderDiffTable(filter) {
  const tbody = document.getElementById('diffTableBody');
  if (!tbody || !diffState.diffResult) return;
  const r = diffState.diffResult;

  let rows = [];

  if (filter === 'all' || filter === 'added') {
    r.added.forEach(v => rows.push({ type: 'added', name: v.name, oldStatus: '-', newStatus: v.status, details: `Ajoutée dans V2 • Statut: ${v.status}` }));
  }
  if (filter === 'all' || filter === 'removed') {
    r.removed.forEach(v => rows.push({ type: 'removed', name: v.name, oldStatus: v.status, newStatus: '-', details: 'Supprimée dans V2' }));
  }
  if (filter === 'all' || filter === 'modified') {
    r.modified.forEach(m => rows.push({ type: 'modified', name: m.v2.name, oldStatus: m.v1.status, newStatus: m.v2.status, details: `Conformité modifiée : ${m.v1.status} ➔ ${m.v2.status}` }));
  }
  if (filter === 'regressions') {
    r.regressions.forEach(v => rows.push({ type: 'regression', name: v.name, oldStatus: 'valid', newStatus: v.status, details: 'Régression critique de conformité' }));
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Aucune variation identifiée pour ce filtre.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    let typeBadge = '';
    if (row.type === 'added') typeBadge = `<span class="badge diff-badge-added">+ Ajoutée</span>`;
    else if (row.type === 'removed') typeBadge = `<span class="badge diff-badge-removed">- Supprimée</span>`;
    else if (row.type === 'regression') typeBadge = `<span class="badge diff-badge-regression">⚠ Régression</span>`;
    else typeBadge = `<span class="badge diff-badge-modified">~ Modifiée</span>`;

    return `
      <tr class="diff-row-${row.type}">
        <td>${typeBadge}</td>
        <td><strong class="mono">${escapeHtml(row.name)}</strong></td>
        <td>${formatStatusBadge(row.oldStatus)}</td>
        <td>${formatStatusBadge(row.newStatus)}</td>
        <td><span class="diff-details-text">${escapeHtml(row.details)}</span></td>
      </tr>
    `;
  }).join('');
}

function formatStatusBadge(status) {
  if (status === 'valid') return `<span class="badge ok">Conforme</span>`;
  if (status === 'warn') return `<span class="badge warn">Attention</span>`;
  if (status === 'critique') return `<span class="badge err">Critique</span>`;
  return `<span class="text-tertiary">-</span>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

// Chargement des données démo pour le comparateur
window.loadDemoDiff = function() {
  const demoV1 = `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1">
    <bpmn:process id="Process_Order_V1" name="Commande Client V1" isExecutable="true">
      <bpmn:serviceTask id="Task_1" name="Valider Commande">
        <bpmn:extensionElements>
          <camunda:inputParameter name="CLIENT_ID">\${client_id}</camunda:inputParameter>
          <camunda:outputParameter name="montantTotal">\${total_amount}</camunda:outputParameter>
          <camunda:outputParameter name="Statut_Commande">VALIDATED</camunda:outputParameter>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    </bpmn:process>
  </bpmn:definitions>`;

  const demoV2 = `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_2">
    <bpmn:process id="Process_Order_V2" name="Commande Client V2" isExecutable="true">
      <bpmn:serviceTask id="Task_1" name="Valider Commande">
        <bpmn:extensionElements>
          <camunda:inputParameter name="clientId">\${clientId}</camunda:inputParameter>
          <camunda:outputParameter name="orderTotal">\${orderTotal}</camunda:outputParameter>
          <camunda:outputParameter name="isOrderValidated">true</camunda:outputParameter>
          <camunda:outputParameter name="customerEmail">\${email}</camunda:outputParameter>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    </bpmn:process>
  </bpmn:definitions>`;

  diffState.v1Data = parseBpmnForDiff(demoV1, 'Process_Commande_v1.bpmn');
  diffState.v2Data = parseBpmnForDiff(demoV2, 'Process_Commande_v2.bpmn');
  
  updateDiffDropzoneUI(1, 'Process_Commande_v1.bpmn', diffState.v1Data.variables.length);
  updateDiffDropzoneUI(2, 'Process_Commande_v2.bpmn', diffState.v2Data.variables.length);

  const btnCompare = document.getElementById('btnRunDiff');
  if (btnCompare) btnCompare.disabled = false;

  window.runBpmnComparison();
};

window.exportDiffReport = function() {
  if (!diffState.diffResult) return;
  const data = JSON.stringify(diffState.diffResult, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Paprika_BPMN_Diff_Report_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
