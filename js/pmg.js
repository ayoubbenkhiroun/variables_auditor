// ---------- PMG (Process Matrix Governance) Module Logic ----------

// Global variables for PMG
window.pmgXmlDoc = null;
window.pmgFileName = "";
window.pmgActivities = [];
window.pmgProcessDetails = {};

let pmgListenersRegistered = false;
let pmgSearchQuery = '';
let pmgTypeFilter = 'all';
let pmgEntityFilter = 'all';

// Initialize PMG Event Listeners
window.initPmgModule = function() {
  if (pmgListenersRegistered) return;
  
  const dzPmg = document.getElementById('dropZonePmg');
  const fileInputPmg = document.getElementById('fileInputPmg');
  
  if (fileInputPmg) {
    fileInputPmg.addEventListener('change', e => handlePmgFile(e.target.files[0]));
  }
  
  if (dzPmg) {
    dzPmg.addEventListener('dragover', e => {
      e.preventDefault();
      dzPmg.classList.add('drag');
    });
    dzPmg.addEventListener('dragleave', () => dzPmg.classList.remove('drag'));
    dzPmg.addEventListener('drop', e => {
      e.preventDefault();
      dzPmg.classList.remove('drag');
      handlePmgFile(e.dataTransfer.files[0]);
    });
  }
  
  pmgListenersRegistered = true;
};

// Handle BPMN File Drop / Selection for PMG
window.handlePmgFile = function(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (!name.endsWith('.bpmn') && !name.endsWith('.xml')) {
    alert("Veuillez importer un fichier BPMN (.bpmn ou .xml)");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    const xmlText = e.target.result;
    window.pmgFileName = file.name;
    try {
      const parser = new DOMParser();
      window.pmgXmlDoc = parser.parseFromString(xmlText, "application/xml");
      
      const parserError = window.pmgXmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent);
      }
      
      // Parse activities and subprocesses
      window.pmgActivities = extractPmgActivities(window.pmgXmlDoc);
      
      // Extract process metadata
      const processes = window.pmgXmlDoc.getElementsByTagNameNS ? window.pmgXmlDoc.getElementsByTagNameNS('*', 'process') : window.pmgXmlDoc.getElementsByTagName('process');
      if (processes.length > 0) {
        const proc = processes[0];
        window.pmgProcessDetails = {
          id: proc.getAttribute('id') || '',
          name: proc.getAttribute('name') || proc.getAttribute('id') || '',
          isExecutable: proc.getAttribute('isExecutable') || 'false',
          exporter: window.pmgXmlDoc.documentElement.getAttribute('exporter') || '',
          exporterVersion: window.pmgXmlDoc.documentElement.getAttribute('exporterVersion') || '',
          version: '',
          owner: '',
          desc: ''
        };
      } else {
        window.pmgProcessDetails = {
          id: 'process-inconnu',
          name: 'Processus Inconnu',
          isExecutable: 'false',
          exporter: '',
          exporterVersion: '',
          version: '',
          owner: '',
          desc: ''
        };
      }
      
      // Update Import Screen UI
      document.getElementById('uploadTitlePmg').textContent = file.name;
      document.getElementById('uploadSubPmg').textContent = `Fichier BPMN chargé (${window.pmgActivities.length} activités trouvées)`;
      
      const pmgSummarySection = document.getElementById('pmgSummarySection');
      if (pmgSummarySection) {
        pmgSummarySection.style.display = 'block';
        
        // Count tasks by type
        const counts = {};
        window.pmgActivities.forEach(act => {
          counts[act.typeLabel] = (counts[act.typeLabel] || 0) + 1;
        });
        
        const summaryHtml = Object.entries(counts).map(([type, count]) => {
          return `<span class="badge-bpmn" style="background:var(--bg-hover-strong); border:1px solid var(--border-color); color:var(--text-secondary); margin-right:8px; display:inline-block; margin-bottom:8px;">${type}: <strong>${count}</strong></span>`;
        }).join('');
        
        document.getElementById('pmgElementSummary').innerHTML = summaryHtml || 'Aucun élément détecté.';
      }
      
      const pmgCountHint = document.getElementById('pmgCountHint');
      if (pmgCountHint) {
        pmgCountHint.textContent = `${window.pmgActivities.length} activités détectées.`;
      }
      
      const analyzePmgBtn = document.getElementById('analyzePmgBtn');
      if (analyzePmgBtn) {
        analyzePmgBtn.disabled = false;
      }
      
    } catch (err) {
      console.error("Erreur de parsing BPMN pour PMG", err);
      alert("Erreur de parsing XML : " + err.message);
    }
  };
  reader.readAsText(file);
};

// Parser to extract activities and CallActivities
function extractPmgActivities(xmlDoc) {
  const activities = [];
  
  // 1. Map Lane structures (FlowNodeRef -> Lane Name)
  const nodeIdToLaneName = new Map();
  const lanes = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS('*', 'lane') : xmlDoc.getElementsByTagName('lane');
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const laneName = lane.getAttribute('name') || lane.getAttribute('id') || '';
    const flowNodeRefs = lane.getElementsByTagNameNS ? lane.getElementsByTagNameNS('*', 'flowNodeRef') : lane.getElementsByTagName('flowNodeRef');
    for (let j = 0; j < flowNodeRefs.length; j++) {
      const refId = flowNodeRefs[j].textContent.trim();
      if (refId) {
        nodeIdToLaneName.set(refId, laneName);
      }
    }
  }
  
  // 2. Map Process structures to Participants (ProcessRef -> Participant/Pool Name)
  const processIdToPoolName = new Map();
  const participants = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS('*', 'participant') : xmlDoc.getElementsByTagName('participant');
  for (let i = 0; i < participants.length; i++) {
    const part = participants[i];
    const processRef = part.getAttribute('processRef');
    const partName = part.getAttribute('name') || part.getAttribute('id') || '';
    if (processRef && partName) {
      processIdToPoolName.set(processRef, partName);
    }
  }
  
  function getParentProcessIdLocal(node) {
    let parent = node.parentNode;
    while (parent) {
      const ln = parent.localName ? parent.localName.toLowerCase() : '';
      if (ln === 'process') {
        return parent.getAttribute('id') || '';
      }
      parent = parent.parentNode;
    }
    return '';
  }
  
  // Component type mapping
  const TYPE_LABELS = {
    'usertask': 'User Task',
    'servicetask': 'Service Task',
    'manualtask': 'Manual Task',
    'scripttask': 'Script Task',
    'sendtask': 'Send Task',
    'receivetask': 'Receive Task',
    'businessruletask': 'Business Rule Task',
    'task': 'Task (Générique)',
    'callactivity': 'Call Activity'
  };
  
  const allElements = xmlDoc.getElementsByTagName('*');
  
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const localName = el.localName ? el.localName.toLowerCase() : '';
    
    if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity'].includes(localName)) {
      const id = el.getAttribute('id') || '';
      const name = el.getAttribute('name') || '';
      
      // Determine lane/pool realization entity
      const laneName = nodeIdToLaneName.get(id);
      const parentProcId = getParentProcessIdLocal(el);
      const poolName = processIdToPoolName.get(parentProcId);
      
      let entity = '';
      if (poolName && laneName) {
        entity = `${poolName} (Lane: ${laneName})`;
      } else if (poolName) {
        entity = poolName;
      } else if (laneName) {
        entity = laneName;
      } else {
        entity = 'Non défini';
      }
      
      // Extract inputs & outputs
      const { inputs, outputs } = extractIoForNode(el);
      
      activities.push({
        id,
        name: name || `(Sans nom - ${id})`,
        type: localName,
        typeLabel: TYPE_LABELS[localName] || localName,
        entity,
        inputs,
        outputs,
        applicableCase: '',
        comment: ''
      });
    }
  }
  
  return activities;
}

// Extract nested inputs/outputs under an activity XML node
function extractIoForNode(node) {
  const inputs = [];
  const outputs = [];
  
  const descendants = node.getElementsByTagName('*');
  for (let i = 0; i < descendants.length; i++) {
    const el = descendants[i];
    const localName = el.localName ? el.localName.toLowerCase() : '';
    
    if (localName === 'input') {
      const source = el.getAttribute('source') || '';
      const target = el.getAttribute('target') || '';
      if (target && source) {
        if (target === source) {
          inputs.push(target);
        } else {
          inputs.push(`${target} (${source})`);
        }
      } else if (target) {
        inputs.push(target);
      } else if (source) {
        inputs.push(source);
      }
    } else if (localName === 'output') {
      const source = el.getAttribute('source') || '';
      const target = el.getAttribute('target') || '';
      if (target && source) {
        if (target === source) {
          outputs.push(target);
        } else {
          outputs.push(`${target} (${source})`);
        }
      } else if (target) {
        outputs.push(target);
      } else if (source) {
        outputs.push(source);
      }
    } else if (localName === 'inputparameter') {
      const name = el.getAttribute('name') || '';
      const val = el.textContent ? el.textContent.trim() : '';
      if (name && val) {
        if (name === val) {
          inputs.push(name);
        } else {
          inputs.push(`${name} (${val})`);
        }
      } else if (name) {
        inputs.push(name);
      } else if (val) {
        inputs.push(val);
      }
    } else if (localName === 'outputparameter') {
      const name = el.getAttribute('name') || '';
      const val = el.textContent ? el.textContent.trim() : '';
      if (name && val) {
        if (name === val) {
          outputs.push(name);
        } else {
          outputs.push(`${name} (${val})`);
        }
      } else if (name) {
        outputs.push(name);
      } else if (val) {
        outputs.push(val);
      }
    }
  }
  
  return { inputs, outputs };
}

// Perform PMG Analysis & Load inputs from storage
window.analyzePmg = function() {
  if (!window.pmgActivities || window.pmgActivities.length === 0) {
    alert("Aucune activité à analyser.");
    return;
  }
  
  // Show Matrix and Dashboard tabs links
  const pmgMatrixTab = document.getElementById('pmgMatrixTab');
  if (pmgMatrixTab) {
    pmgMatrixTab.style.display = '';
  }
  const pmgDashboardTab = document.getElementById('pmgDashboardTab');
  if (pmgDashboardTab) {
    pmgDashboardTab.style.display = '';
  }
  
  const processId = window.pmgProcessDetails.id;
  loadPmgData(processId);
  
  populateEntityFilterDropdown();
  
  renderPmgMatrix();
  renderPmgDashboard();
  switchTab('pmg-dashboard');
};

// LocalStorage Persistence
// LocalStorage Persistence
window.savePmgDetails = function() {
  if (!window.pmgProcessDetails || !window.pmgProcessDetails.id) return;
  
  const processId = window.pmgProcessDetails.id;
  
  const details = {
    id: processId,
    name: document.getElementById('pmgProcessName').value,
    version: document.getElementById('pmgProcessVersion').value,
    owner: document.getElementById('pmgProcessOwner').value,
    exporter: document.getElementById('pmgExporter').value,
    isExecutable: document.getElementById('pmgIsExecutable').value,
    desc: document.getElementById('pmgProcessDesc').value,
    inputs: {},
    variableDescriptions: {}
  };
  
  // Collect data-inputs from DOM inputs
  const caseElements = document.querySelectorAll('.pmg-case');
  caseElements.forEach(el => {
    const actId = el.getAttribute('data-id');
    if (!details.inputs[actId]) details.inputs[actId] = {};
    details.inputs[actId].applicableCase = el.value;
    
    const act = window.pmgActivities.find(a => a.id === actId);
    if (act) act.applicableCase = el.value;
  });
  
  const commentElements = document.querySelectorAll('.pmg-comment');
  commentElements.forEach(el => {
    const actId = el.getAttribute('data-id');
    if (!details.inputs[actId]) details.inputs[actId] = {};
    details.inputs[actId].comment = el.value;
    
    const act = window.pmgActivities.find(a => a.id === actId);
    if (act) act.comment = el.value;
  });

  // Collect variable glossary descriptions
  const varDescElements = document.querySelectorAll('.pmg-var-desc');
  varDescElements.forEach(el => {
    const varName = el.getAttribute('data-var');
    details.variableDescriptions[varName] = el.value;
  });
  
  // Update state details
  window.pmgProcessDetails = { ...window.pmgProcessDetails, ...details };
  
  localStorage.setItem(`pda_camunda_pmg_data_${processId}`, JSON.stringify(details));
  
  // Dynamically update PMG dashboard components (Preview and completeness KPI)
  // to avoid redrawing inputs and losing keyboard focus
  if (window.pmgActivities && window.pmgActivities.length > 0) {
    const total = window.pmgActivities.length;
    let documented = 0;
    window.pmgActivities.forEach(act => {
      const hasCase = (act.applicableCase || '').trim().length > 0;
      const hasComment = (act.comment || '').trim().length > 0;
      if (hasCase || hasComment) {
        documented++;
      }
    });
    const completeness = total > 0 ? Math.round((documented / total) * 100) : 0;
    
    const compValEl = document.getElementById('kpi-pmg-completeness');
    if (compValEl) compValEl.textContent = `${completeness}%`;
    
    const compStatusEl = document.getElementById('kpi-pmg-completeness-status');
    if (compStatusEl) compStatusEl.textContent = `${documented} / ${total} tâches documentées`;
    
    // Update doc preview
    const docPreviewEl = document.getElementById('pmgDocPreview');
    if (docPreviewEl) {
      docPreviewEl.innerHTML = generatePmgHtml(false);
    }
  }
};

function loadPmgData(processId) {
  const data = localStorage.getItem(`pda_camunda_pmg_data_${processId}`);
  if (data) {
    try {
      const details = JSON.parse(data);
      
      document.getElementById('pmgProcessName').value = details.name || '';
      document.getElementById('pmgProcessId').value = details.id || '';
      document.getElementById('pmgProcessVersion').value = details.version || '';
      document.getElementById('pmgProcessOwner').value = details.owner || '';
      document.getElementById('pmgExporter').value = details.exporter || '';
      document.getElementById('pmgIsExecutable').value = details.isExecutable || 'false';
      document.getElementById('pmgProcessDesc').value = details.desc || '';
      
      window.pmgProcessDetails = { ...window.pmgProcessDetails, ...details };
      if (!window.pmgProcessDetails.variableDescriptions) {
        window.pmgProcessDetails.variableDescriptions = {};
      }
      
      if (details.inputs) {
        window.pmgActivities.forEach(act => {
          if (details.inputs[act.id]) {
            act.applicableCase = details.inputs[act.id].applicableCase || '';
            act.comment = details.inputs[act.id].comment || '';
          }
        });
      }
    } catch (err) {
      console.error("Erreur lors de la lecture des données PMG depuis localStorage", err);
    }
  } else {
    // Populate defaults from BPMN parsing
    document.getElementById('pmgProcessName').value = window.pmgProcessDetails.name || '';
    document.getElementById('pmgProcessId').value = window.pmgProcessDetails.id || '';
    document.getElementById('pmgProcessVersion').value = '';
    document.getElementById('pmgProcessOwner').value = '';
    document.getElementById('pmgExporter').value = window.pmgProcessDetails.exporter + (window.pmgProcessDetails.exporterVersion ? ` ${window.pmgProcessDetails.exporterVersion}` : '');
    document.getElementById('pmgIsExecutable').value = window.pmgProcessDetails.isExecutable || 'false';
    document.getElementById('pmgProcessDesc').value = '';
    window.pmgProcessDetails.variableDescriptions = {};
  }
}

// Dynamic Entity filter populater
function populateEntityFilterDropdown() {
  const filterEl = document.getElementById('pmgEntityFilter');
  if (!filterEl) return;
  
  const entities = new Set();
  window.pmgActivities.forEach(act => {
    if (act.entity && act.entity !== 'Non défini') {
      entities.add(act.entity);
    }
  });
  
  filterEl.innerHTML = '<option value="all">Toutes les entités (Pools/Lanes)</option>';
  entities.forEach(ent => {
    const opt = document.createElement('option');
    opt.value = ent;
    opt.textContent = ent;
    filterEl.appendChild(opt);
  });
}

// Search and Filter Handlers
window.onPmgSearch = function() {
  pmgSearchQuery = document.getElementById('pmgMatrixSearchInput').value.toLowerCase().trim();
  renderPmgMatrix();
};

window.onPmgFilterChange = function() {
  pmgTypeFilter = document.getElementById('pmgTypeFilter').value;
  pmgEntityFilter = document.getElementById('pmgEntityFilter').value;
  renderPmgMatrix();
};

window.resetPmgMatrixFilters = function() {
  document.getElementById('pmgMatrixSearchInput').value = '';
  document.getElementById('pmgTypeFilter').value = 'all';
  document.getElementById('pmgEntityFilter').value = 'all';
  
  pmgSearchQuery = '';
  pmgTypeFilter = 'all';
  pmgEntityFilter = 'all';
  
  renderPmgMatrix();
};

// Render PMG activities table rows
window.renderPmgMatrix = function() {
  const tbody = document.getElementById('pmgMatrixTableBody');
  const empty = document.getElementById('pmgMatrixEmptyMsg');
  
  if (!tbody) return;
  
  const filtered = window.pmgActivities.filter(act => {
    if (pmgSearchQuery) {
      const nameMatch = act.name.toLowerCase().includes(pmgSearchQuery);
      const idMatch = act.id.toLowerCase().includes(pmgSearchQuery);
      const caseMatch = (act.applicableCase || '').toLowerCase().includes(pmgSearchQuery);
      const commentMatch = (act.comment || '').toLowerCase().includes(pmgSearchQuery);
      if (!nameMatch && !idMatch && !caseMatch && !commentMatch) return false;
    }
    
    if (pmgTypeFilter !== 'all') {
      if (pmgTypeFilter === 'other') {
        if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'callactivity'].includes(act.type)) return false;
      } else {
        if (act.type !== pmgTypeFilter) return false;
      }
    }
    
    if (pmgEntityFilter !== 'all') {
      if (act.entity !== pmgEntityFilter) return false;
    }
    
    return true;
  });
  
  const countHint = document.getElementById('pmgMatrixRowCount');
  if (countHint) {
    countHint.textContent = `${filtered.length} activités affichées / ${window.pmgActivities.length} totales`;
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  
  if (empty) empty.style.display = 'none';
  
  tbody.innerHTML = filtered.map(act => {
    const inputsHtml = act.inputs.length > 0 
      ? `<div class="pmg-io-container">${act.inputs.map(i => `<span class="badge-io badge-io-in" title="${esc(i)}">${esc(i)}</span>`).join('')}</div>` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune entrée</span>';
      
    const outputsHtml = act.outputs.length > 0 
      ? `<div class="pmg-io-container">${act.outputs.map(o => `<span class="badge-io badge-io-out" title="${esc(o)}">${esc(o)}</span>`).join('')}</div>` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune sortie</span>';
      
    let badgeClass = 'type-task';
    if (act.type === 'callactivity') badgeClass = 'type-subprocess';
    
    return `
      <tr>
        <td>
          <strong style="color:var(--text-primary); font-weight:600;">${esc(act.name)}</strong><br>
          <span class="mono" style="font-size:10px;color:var(--text-tertiary);">${act.id}</span>
        </td>
        <td>
          <span class="badge-bpmn ${badgeClass}">${act.typeLabel}</span>
        </td>
        <td>
          <span class="badge badge-process" style="padding: 4px 8px; border-radius: 4px;">${esc(act.entity)}</span>
        </td>
        <td>${inputsHtml}</td>
        <td>${outputsHtml}</td>
        <td>
          <textarea class="pmg-input pmg-case" data-id="${act.id}" oninput="savePmgDetails()" placeholder="Ex: Si le client est majeur...">${esc(act.applicableCase || '')}</textarea>
        </td>
        <td>
          <textarea class="pmg-input pmg-comment" data-id="${act.id}" oninput="savePmgDetails()" placeholder="Ex: Cette étape nécessite validation...">${esc(act.comment || '')}</textarea>
        </td>
      </tr>
    `;
  }).join('');
};

// Exports
window.exportPmgCSV = function() {
  if (!window.pmgActivities || window.pmgActivities.length === 0) {
    alert("La matrice PMG est vide.");
    return;
  }
  
  let csv = 'METADONNEES DU PROCESSUS\n';
  csv += `Nom du Processus,${qq(document.getElementById('pmgProcessName').value)}\n`;
  csv += `ID Technique,${qq(document.getElementById('pmgProcessId').value)}\n`;
  csv += `Version,${qq(document.getElementById('pmgProcessVersion').value)}\n`;
  csv += `Propriétaire,${qq(document.getElementById('pmgProcessOwner').value)}\n`;
  csv += `Modélisateur,${qq(document.getElementById('pmgExporter').value)}\n`;
  csv += `Exécutable,${qq(document.getElementById('pmgIsExecutable').value === 'true' ? 'Oui' : 'Non')}\n`;
  csv += `Description,${qq(document.getElementById('pmgProcessDesc').value)}\n\n`;
  
  csv += 'Activité (Technique ID),Type de composant,Entité réalisatrice,Inputs (Entrées),Outputs (Sorties),Applicable dans quel cas ?,Commentaire\n';
  
  window.pmgActivities.forEach(act => {
    const caseVal = document.querySelector(`.pmg-case[data-id="${act.id}"]`)?.value || act.applicableCase || '';
    const commentVal = document.querySelector(`.pmg-comment[data-id="${act.id}"]`)?.value || act.comment || '';
    
    csv += [
      qq(`${act.name} (${act.id})`),
      qq(act.typeLabel),
      qq(act.entity),
      qq(act.inputs.join('; ')),
      qq(act.outputs.join('; ')),
      qq(caseVal),
      qq(commentVal)
    ].join(',') + '\n';
  });
  
  dl(csv, `pmg_matrice_${window.pmgProcessDetails.id || 'process'}.csv`, 'text/csv');
};

window.exportPmgExcel = function() {
  if (!window.XLSX) {
    alert("La bibliothèque Excel (XLSX) n'est pas chargée.");
    return;
  }
  if (!window.pmgActivities || window.pmgActivities.length === 0) {
    alert("La matrice PMG est vide.");
    return;
  }
  
  const processName = document.getElementById('pmgProcessName').value;
  const processId = document.getElementById('pmgProcessId').value;
  const version = document.getElementById('pmgProcessVersion').value;
  const owner = document.getElementById('pmgProcessOwner').value;
  const exporter = document.getElementById('pmgExporter').value;
  const isExec = document.getElementById('pmgIsExecutable').value === 'true' ? 'Oui' : 'Non';
  const desc = document.getElementById('pmgProcessDesc').value;
  
  const data = [
    ['MATRICE DES ACTIVITÉS PMG (PROCESS MATRIX GOVERNANCE)', '', '', '', '', '', ''],
    ['Nom du Processus', processName, '', 'Propriétaire Métier', owner, '', ''],
    ['ID Technique', processId, '', 'Application / Modélisateur', exporter, '', ''],
    ['Version du Processus', version, '', 'Exécutable', isExec, '', ''],
    ['Description', desc, '', '', '', '', ''],
    [],
    ['Activité / Call Activity', 'Type de composant', 'Entité réalisatrice', 'Inputs (Entrées)', 'Outputs (Sorties)', 'Applicable dans quel cas ?', 'Commentaire']
  ];
  
  window.pmgActivities.forEach(act => {
    const caseVal = document.querySelector(`.pmg-case[data-id="${act.id}"]`)?.value || act.applicableCase || '';
    const commentVal = document.querySelector(`.pmg-comment[data-id="${act.id}"]`)?.value || act.comment || '';
    
    data.push([
      `${act.name} (${act.id})`,
      act.typeLabel,
      act.entity,
      act.inputs.join('\n'),
      act.outputs.join('\n'),
      caseVal,
      commentVal
    ]);
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
    { s: { r: 4, c: 1 }, e: { r: 4, c: 6 } }  // Description
  ];
  
  ws['!cols'] = [
    { wch: 30 }, // Activity
    { wch: 20 }, // Type
    { wch: 25 }, // Entity
    { wch: 25 }, // Inputs
    { wch: 25 }, // Outputs
    { wch: 35 }, // Case
    { wch: 35 }  // Comment
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Matrice PMG');
  XLSX.writeFile(wb, `pmg_matrice_${processId || 'process'}.xlsx`);
};

window.exportPmgPDF = function() {
  const processName = document.getElementById('pmgProcessName').value || 'Non défini';
  const processId = document.getElementById('pmgProcessId').value || 'Non défini';
  const version = document.getElementById('pmgProcessVersion').value || '';
  const owner = document.getElementById('pmgProcessOwner').value || '';
  const exporter = document.getElementById('pmgExporter').value || '';
  const isExec = document.getElementById('pmgIsExecutable').value === 'true' ? 'Oui' : 'Non';
  const desc = document.getElementById('pmgProcessDesc').value || '';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour pouvoir imprimer la matrice.");
    return;
  }
  
  let rowsHTML = '';
  window.pmgActivities.forEach(act => {
    const rowInputs = act.inputs.length ? act.inputs.map(i => `<li>${esc(i)}</li>`).join('') : '<li>Aucun</li>';
    const rowOutputs = act.outputs.length ? act.outputs.map(o => `<li>${esc(o)}</li>`).join('') : '<li>Aucun</li>';
    
    const caseVal = document.querySelector(`.pmg-case[data-id="${act.id}"]`)?.value || act.applicableCase || '';
    const commentVal = document.querySelector(`.pmg-comment[data-id="${act.id}"]`)?.value || act.comment || '';

    rowsHTML += `
      <tr>
        <td><strong>${esc(act.name)}</strong><br><small style="color:#64748b; font-family:monospace;">${act.id}</small></td>
        <td><span class="badge">${act.typeLabel}</span></td>
        <td>${esc(act.entity)}</td>
        <td><ul style="margin:0; padding-left:12px;">${rowInputs}</ul></td>
        <td><ul style="margin:0; padding-left:12px;">${rowOutputs}</ul></td>
        <td>${esc(caseVal).replace(/\n/g, '<br>')}</td>
        <td>${esc(commentVal).replace(/\n/g, '<br>')}</td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Matrice PMG - ${esc(processName)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 30px; line-height: 1.4; background:#fff; }
        h1 { margin-bottom: 5px; color: #ff7520; font-size: 22px; font-weight:700; }
        .meta-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-size: 13px; }
        .meta-item strong { color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; color: #334155; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing:0.3px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .badge { background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; border: 1px solid #cbd5e1; display:inline-block; }
        @media print {
          body { margin: 15px; }
          .no-print { display: none; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom:15px;">
        <div>
          <h1>Matrice des Activités PMG</h1>
          <p style="margin:5px 0 0 0; color:#64748b; font-size:12px;">Camunda FlowAudit Pro | Outil de Gouvernance des Processus</p>
        </div>
        <button class="no-print" onclick="window.print()" style="padding:8px 16px; background:#ff7520; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px; transition: background 0.2s;">Imprimer / Enregistrer PDF</button>
      </div>
      
      <div class="meta-container">
        <div class="meta-item"><strong>Nom du Processus:</strong> ${esc(processName)}</div>
        <div class="meta-item"><strong>ID Technique:</strong> ${esc(processId)}</div>
        <div class="meta-item"><strong>Version:</strong> ${esc(version || 'N/A')}</div>
        <div class="meta-item"><strong>Propriétaire Métier:</strong> ${esc(owner || 'Non spécifié')}</div>
        <div class="meta-item"><strong>Outil Modélisateur:</strong> ${esc(exporter || 'N/A')}</div>
        <div class="meta-item"><strong>Exécutable:</strong> ${esc(isExec)}</div>
        <div class="meta-item" style="grid-column: span 2"><strong>Description:</strong> ${esc(desc || 'Aucune description fournie.')}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:20%">Activité / Call Activity</th>
            <th style="width:12%">Type</th>
            <th style="width:15%">Entité réalisatrice</th>
            <th style="width:15%">Inputs (Entrées)</th>
            <th style="width:15%">Outputs (Sorties)</th>
            <th style="width:13%">Cas d'applicabilité</th>
            <th style="width:10%">Commentaire</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// Helper to extract clean variable name from formatted input/output strings (e.g. "myVar (myVal)" -> "myVar")
function getVarName(str) {
  if (!str) return '';
  const idx = str.indexOf('(');
  if (idx !== -1) {
    return str.substring(0, idx).trim();
  }
  return str.trim();
}

// Render PMG Dashboard view (KPIs, Decision support, Breakdown stats, Documentation preview)
window.renderPmgDashboard = function() {
  const activities = window.pmgActivities || [];
  const details = window.pmgProcessDetails || {};
  
  // 1. Completeness Score
  const total = activities.length;
  let documented = 0;
  activities.forEach(act => {
    const hasCase = (act.applicableCase || '').trim().length > 0;
    const hasComment = (act.comment || '').trim().length > 0;
    if (hasCase || hasComment) {
      documented++;
    }
  });
  const completeness = total > 0 ? Math.round((documented / total) * 100) : 0;
  
  const compValEl = document.getElementById('kpi-pmg-completeness');
  if (compValEl) compValEl.textContent = `${completeness}%`;
  
  const compStatusEl = document.getElementById('kpi-pmg-completeness-status');
  if (compStatusEl) compStatusEl.textContent = `${documented} / ${total} tâches documentées`;
  
  // 2. Volume of unique variables
  const uniqueVars = new Set();
  activities.forEach(act => {
    (act.inputs || []).forEach(i => {
      const v = getVarName(i);
      if (v) uniqueVars.add(v);
    });
    (act.outputs || []).forEach(o => {
      const v = getVarName(o);
      if (v) uniqueVars.add(v);
    });
  });
  const totalVars = uniqueVars.size;
  
  const ioValEl = document.getElementById('kpi-pmg-io');
  if (ioValEl) ioValEl.textContent = `${totalVars} variable${totalVars > 1 ? 's' : ''}`;
  
  // 3. Total activities
  const tasksValEl = document.getElementById('kpi-pmg-tasks');
  if (tasksValEl) tasksValEl.textContent = total;
  
  // 4. Complexity score
  let callActsCount = 0;
  let tasksCount = 0;
  activities.forEach(act => {
    if (act.type === 'callactivity') {
      callActsCount++;
    } else {
      tasksCount++;
    }
  });
  // Formula: Tasks + CallActivities * 2 + uniqueVars
  const complexityScore = tasksCount + callActsCount * 2 + totalVars;
  let complexityLabel = "Faible";
  let complexityColor = "var(--ok)";
  if (complexityScore >= 10 && complexityScore < 25) {
    complexityLabel = "Moyenne";
    complexityColor = "var(--info)";
  } else if (complexityScore >= 25 && complexityScore < 50) {
    complexityLabel = "Élevée";
    complexityColor = "var(--warn)";
  } else if (complexityScore >= 50) {
    complexityLabel = "Critique";
    complexityColor = "var(--err)";
  }
  
  const compLabelEl = document.getElementById('kpi-pmg-complexity');
  if (compLabelEl) {
    compLabelEl.textContent = complexityLabel;
    compLabelEl.style.color = complexityColor;
  }
  
  const compScoreEl = document.getElementById('kpi-pmg-complexity-score');
  if (compScoreEl) compScoreEl.textContent = `Score : ${complexityScore} pts`;
  
  // 5. Diagnostics & Alerts (Aide à la décision)
  const alertContainer = document.getElementById('pmgDecisionAlerts');
  if (alertContainer) {
    const alerts = [];
    
    // Check documentation gap
    const undocumentedCount = total - documented;
    if (undocumentedCount > 0) {
      alerts.push({
        type: 'error',
        title: 'Documentation incomplète',
        desc: `${undocumentedCount} tâche${undocumentedCount > 1 ? 's' : ''} sur ${total} n'ont aucune documentation. Renseignez les cas d'applicabilité et commentaires.`
      });
    } else if (total > 0) {
      alerts.push({
        type: 'success',
        title: 'Documentation finalisée !',
        desc: 'Toutes les activités de ce processus sont documentées. La conformité est à 100%.'
      });
    }
    
    // Check orphan tasks
    let orphanCount = 0;
    activities.forEach(act => {
      if (!act.entity || act.entity === 'Non défini') {
        orphanCount++;
      }
    });
    if (orphanCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Absence d\'entité réalisatrice (Lanes)',
        desc: `${orphanCount} tâche${orphanCount > 1 ? 's' : ''} ne sont assignées à aucune Lane/Pool dans le BPMN. Vérifiez l'attribution des rôles opérationnels.`
      });
    }
    
    // Check service tasks without I/O
    let serviceNoIo = 0;
    activities.forEach(act => {
      if (['servicetask', 'scripttask', 'businessruletask'].includes(act.type)) {
        if ((!act.inputs || act.inputs.length === 0) && (!act.outputs || act.outputs.length === 0)) {
          serviceNoIo++;
        }
      }
    });
    if (serviceNoIo > 0) {
      alerts.push({
        type: 'info',
        title: 'Tâches de service sans variables',
        desc: `${serviceNoIo} tâche${serviceNoIo > 1 ? 's' : ''} de type Service ou Script n'ont aucun paramètre d'entrée/sortie.`
      });
    }
    
    // Check subprocesses without I/O
    let subNoIo = 0;
    activities.forEach(act => {
      if (act.type === 'callactivity') {
        if ((!act.inputs || act.inputs.length === 0) && (!act.outputs || act.outputs.length === 0)) {
          subNoIo++;
        }
      }
    });
    if (subNoIo > 0) {
      alerts.push({
        type: 'warning',
        title: 'Sous-processus sans paramètres d\'appel',
        desc: `${subNoIo} sous-processus appelé${subNoIo > 1 ? 's' : ''} (Call Activities) ne transmettent ni ne reçoivent de variables.`
      });
    }
    
    // Automation opportunity recommendation
    let manualTasks = 0;
    activities.forEach(act => {
      if (act.type === 'manualtask') manualTasks++;
    });
    if (manualTasks > 0) {
      alerts.push({
        type: 'info',
        title: 'Opportunité d\'automatisation',
        desc: `Le processus comporte ${manualTasks} tâche${manualTasks > 1 ? 's' : ''} manuelle${manualTasks > 1 ? 's' : ''}. Envisagez de les automatiser via des Tâches de Service.`
      });
    }
    
    // Silo alert (too many actors)
    const uniqueLanes = new Set();
    activities.forEach(act => {
      if (act.entity && act.entity !== 'Non défini') {
        uniqueLanes.add(act.entity);
      }
    });
    if (uniqueLanes.size > 3) {
      alerts.push({
        type: 'warning',
        title: 'Processus transverse complexe',
        desc: `Ce processus implique ${uniqueLanes.size} entités/acteurs différents. Risque accru de frictions inter-services.`
      });
    }
    
    if (alerts.length === 0) {
      alertContainer.innerHTML = '<div style="color:var(--text-tertiary); text-align:center; padding: 20px;">Aucune alerte pour ce processus.</div>';
    } else {
      alertContainer.innerHTML = alerts.map(a => {
        let iconSvg = '';
        if (a.type === 'error') {
          iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else if (a.type === 'warning') {
          iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else if (a.type === 'info') {
          iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        } else {
          iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        }
        return `
          <div class="pmg-alert-card ${a.type}">
            <div class="pmg-alert-icon">
              ${iconSvg}
            </div>
            <div class="pmg-alert-content">
              <div class="pmg-alert-title">${esc(a.title)}</div>
              <div class="pmg-alert-desc">${esc(a.desc)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
  
  // 6. Breakdown & Lanes structure representation
  const compBreakdownEl = document.getElementById('pmgComponentBreakdown');
  if (compBreakdownEl) {
    const counts = {};
    activities.forEach(act => {
      counts[act.typeLabel] = (counts[act.typeLabel] || 0) + 1;
    });
    compBreakdownEl.innerHTML = Object.entries(counts).map(([type, count]) => `
      <span class="badge-bpmn" style="background:var(--bg-hover-strong); border:1px solid var(--border-color); color:var(--text-secondary); margin:0;">
        ${esc(type)} : <strong>${count}</strong>
      </span>
    `).join('') || '<span style="color:var(--text-tertiary);">Aucun composant.</span>';
  }
  
  const lanesBreakdownEl = document.getElementById('pmgLanesBreakdown');
  if (lanesBreakdownEl) {
    const laneGroups = {};
    activities.forEach(act => {
      const lane = act.entity || 'Non défini';
      if (!laneGroups[lane]) laneGroups[lane] = { total: 0, documented: 0 };
      laneGroups[lane].total++;
      if ((act.applicableCase || '').trim().length > 0 || (act.comment || '').trim().length > 0) {
        laneGroups[lane].documented++;
      }
    });
    
    lanesBreakdownEl.innerHTML = Object.entries(laneGroups).map(([lane, stat]) => {
      const pct = Math.round((stat.documented / stat.total) * 100);
      let colorClass = 'var(--err)';
      if (pct >= 90) colorClass = 'var(--ok)';
      else if (pct >= 50) colorClass = 'var(--warn)';
      
      return `
        <div class="pmg-lane-stat-card">
          <div class="pmg-lane-stat-header">
            <span class="pmg-lane-name" title="${esc(lane)}">${esc(lane)}</span>
            <span class="pmg-lane-count" style="color:${colorClass}">${stat.documented}/${stat.total} (${pct}%)</span>
          </div>
          <div class="pmg-progress-track">
            <div class="pmg-progress-fill" style="width:${pct}%; background:${colorClass}"></div>
          </div>
        </div>
      `;
    }).join('') || '<span style="color:var(--text-tertiary);">Aucune lane.</span>';
  }
  
  // 7. Render dynamic documentation inside preview
  const docPreviewEl = document.getElementById('pmgDocPreview');
  if (docPreviewEl) {
    docPreviewEl.innerHTML = generatePmgHtml(false);
  }

  // Render Variable Glossary
  renderPmgVariableGlossary();
};

// Variable Lifecycle extraction helper
function getPmgVarLifecycle(activities) {
  const varLifecycle = {};
  activities.forEach(act => {
    (act.inputs || []).forEach(i => {
      const v = getVarName(i);
      if (v) {
        if (!varLifecycle[v]) varLifecycle[v] = { inputs: [], outputs: [] };
        if (!varLifecycle[v].inputs.includes(act.name)) varLifecycle[v].inputs.push(act.name);
      }
    });
    (act.outputs || []).forEach(o => {
      const v = getVarName(o);
      if (v) {
        if (!varLifecycle[v]) varLifecycle[v] = { inputs: [], outputs: [] };
        if (!varLifecycle[v].outputs.includes(act.name)) varLifecycle[v].outputs.push(act.name);
      }
    });
  });
  return varLifecycle;
}

// Render Variables Glossary in Dashboard
window.renderPmgVariableGlossary = function() {
  const container = document.getElementById('pmgVariableGlossaryBody');
  if (!container) return;
  
  const activities = window.pmgActivities || [];
  const varLifecycle = getPmgVarLifecycle(activities);
  
  const uniqueVars = Object.keys(varLifecycle).sort();
  const searchInput = document.getElementById('pmgVarGlossarySearchInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const filteredVars = uniqueVars.filter(v => {
    if (query) {
      const desc = (window.pmgProcessDetails.variableDescriptions && window.pmgProcessDetails.variableDescriptions[v]) || '';
      return v.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
    }
    return true;
  });
  
  const glossaryRowCount = document.getElementById('pmgVarGlossaryRowCount');
  if (glossaryRowCount) {
    glossaryRowCount.textContent = `${filteredVars.length} variables affichées / ${uniqueVars.length} totales`;
  }
  
  const emptyMsg = document.getElementById('pmgVarGlossaryEmptyMsg');
  
  if (filteredVars.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  container.innerHTML = filteredVars.map(v => {
    const cycle = varLifecycle[v];
    const producers = cycle.outputs.length > 0 
      ? cycle.outputs.map(p => `<span class="badge badge-process" style="margin:2px; display:inline-block;">${esc(p)}</span>`).join('') 
      : '<span style="color:var(--text-tertiary); font-style:italic; font-size:11px;">Aucun (Initialisation externe)</span>';
      
    const consumers = cycle.inputs.length > 0 
      ? cycle.inputs.map(c => `<span class="badge badge-process" style="margin:2px; display:inline-block;">${esc(c)}</span>`).join('') 
      : '<span style="color:var(--text-tertiary); font-style:italic; font-size:11px;">Aucun (Non consommée)</span>';
      
    // Determine type/role
    let role = 'Variable interne';
    let roleColor = 'var(--info-dark)';
    if (cycle.outputs.length === 0 && cycle.inputs.length > 0) {
      role = 'Variable d\'entrée (Payload)';
      roleColor = 'var(--brand-primary)';
    } else if (cycle.outputs.length > 0 && cycle.inputs.length === 0) {
      role = 'Variable de sortie (Résultat)';
      roleColor = 'var(--ok)';
    }
    
    const savedDesc = (window.pmgProcessDetails.variableDescriptions && window.pmgProcessDetails.variableDescriptions[v]) || '';
    
    return `
      <tr>
        <td style="vertical-align: top;">
          <strong class="mono" style="color:var(--text-primary); font-size:12.5px;">${esc(v)}</strong><br>
          <span class="badge" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); color:${roleColor}; font-size:10px; text-transform:none; padding:2px 6px; margin-top:6px; font-weight:600;">${role}</span>
        </td>
        <td style="vertical-align: top;">${producers}</td>
        <td style="vertical-align: top;">${consumers}</td>
        <td style="vertical-align: top; padding: 6px 8px;">
          <textarea class="pmg-input pmg-var-desc" data-var="${v}" onchange="savePmgDetails()" placeholder="Décrire le rôle et le format de la variable (ex: Identifiant client unique)...">${esc(savedDesc)}</textarea>
        </td>
      </tr>
    `;
  }).join('');
};

// Technical Documentation Markdown generator
window.generatePmgMarkdown = function() {
  const activities = window.pmgActivities || [];
  const details = window.pmgProcessDetails || {};
  
  const name = document.getElementById('pmgProcessName')?.value || details.name || 'Processus sans nom';
  const id = document.getElementById('pmgProcessId')?.value || details.id || 'N/A';
  const version = document.getElementById('pmgProcessVersion')?.value || details.version || 'Non spécifiée';
  const owner = document.getElementById('pmgProcessOwner')?.value || details.owner || 'Non spécifié';
  const exporter = document.getElementById('pmgExporter')?.value || details.exporter || 'N/A';
  const isExecutable = document.getElementById('pmgIsExecutable')?.value === 'true' ? 'Oui' : 'Non';
  const desc = document.getElementById('pmgProcessDesc')?.value || details.desc || 'Aucune description.';
  
  const total = activities.length;
  let documented = 0;
  activities.forEach(act => {
    if ((act.applicableCase || '').trim() || (act.comment || '').trim()) documented++;
  });
  const completeness = total > 0 ? Math.round((documented / total) * 100) : 0;
  
  const varLifecycle = getPmgVarLifecycle(activities);
  const varDescriptions = details.variableDescriptions || {};
  const totalVars = Object.keys(varLifecycle).length;
  
  let md = `# Guide de Cartographie & Gouvernance (Process Mapping Guide - PMG)\n\n`;
  md += `## 1. Métadonnées du Processus\n`;
  md += `- **Nom du Processus** : ${name}\n`;
  md += `- **ID Technique (Process ID)** : \`${id}\`\n`;
  md += `- **Version** : ${version}\n`;
  md += `- **Propriétaire Métier** : ${owner}\n`;
  md += `- **Outil Modélisateur** : ${exporter}\n`;
  md += `- **Exécutable dans le Moteur** : ${isExecutable}\n`;
  md += `- **Description / Objectif** : ${desc}\n\n`;
  
  md += `## 2. Indicateurs Globaux & KPIs\n`;
  md += `- **Taux de Complétude Documentaire** : **${completeness}%** (${documented} / ${total} tâches documentées)\n`;
  md += `- **Nombre Total d'Activités** : ${total}\n`;
  md += `- **Volume de Données (I/O)** : ${totalVars} variable(s) unique(s) échangée(s)\n\n`;
  
  md += `## 3. Matrice de Gouvernance des Activités & Variables\n\n`;
  md += `| Activité / Call Activity | Type | Entité Réalisatrice | Entrées (Inputs) | Sorties (Outputs) | Cas d'applicabilité | Commentaire |\n`;
  md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
  
  activities.forEach(act => {
    const inputsText = act.inputs.length > 0 ? act.inputs.join('; ') : 'Aucun';
    const outputsText = act.outputs.length > 0 ? act.outputs.join('; ') : 'Aucun';
    const caseVal = (act.applicableCase || '').trim().replace(/\n/g, ' ') || 'N/A';
    const commentVal = (act.comment || '').trim().replace(/\n/g, ' ') || 'N/A';
    
    md += `| **${act.name}** <br> \`id: ${act.id}\` | ${act.typeLabel} | ${act.entity || 'Non définie'} | \`${inputsText}\` | \`${outputsText}\` | ${caseVal} | ${commentVal} |\n`;
  });
  md += `\n`;

  md += `## 4. Glossaire & Lignage des Variables de Données\n\n`;
  md += `Ce glossaire recense les variables échangées, identifie les producteurs (tâches qui écrivent) et consommateurs (tâches qui lisent), et décrit leur rôle.\n\n`;
  md += `| Variable | Type de flux | Producteurs (Écriture) | Consommateurs (Lecture) | Description / Rôle |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;
  
  Object.keys(varLifecycle).sort().forEach(v => {
    const cycle = varLifecycle[v];
    let type = "Interne";
    if (cycle.outputs.length === 0 && cycle.inputs.length > 0) type = "Entrée (Payload)";
    else if (cycle.outputs.length > 0 && cycle.inputs.length === 0) type = "Sortie (Résultat)";
    
    const prod = cycle.outputs.length > 0 ? cycle.outputs.join(', ') : 'Exogène (Externe)';
    const cons = cycle.inputs.length > 0 ? cycle.inputs.join(', ') : 'Orpheline (Non lue)';
    const vDesc = varDescriptions[v] || 'Non documentée.';
    md += `| \`${v}\` | ${type} | ${prod} | ${cons} | ${vDesc} |\n`;
  });
  md += `\n`;
  
  md += `## 5. Guide de Prise en Main pour les Nouveaux Arrivants (Onboarding Guide)\n\n`;
  md += `Ce guide rapide permet à un nouveau développeur ou analyste métier de s'approprier le processus et de commencer à travailler immédiatement.\n\n`;
  md += `### 🚀 1. Déploiement & Configuration\n`;
  md += `- **Déploiement du processus** : Déployez le fichier \`${id}.bpmn\` (Version \`${version}\`) sur votre cluster Camunda (SaaS ou Self-Managed).\n`;
  md += `- **Exécutabilité** : Le processus est configuré comme **${isExecutable === 'Oui' ? 'Exécutable (isExecutable=true)' : 'Non exécutable pour le moment'}**. Si vous devez le tester en situation réelle, vérifiez que cette option est activée.\n`;
  md += `- **Propriétaire métier** : Pour toute question fonctionnelle, contactez l'équipe **${owner}**.\n\n`;
  md += `### 📥 2. Payload de Démarrage (Variables d'entrée)\n`;
  md += `Pour lancer une instance de test, vous devez fournir un payload JSON contenant au minimum les variables d'entrée suivantes :\n`;
  
  let entryCount = 0;
  Object.keys(varLifecycle).forEach(v => {
    const cycle = varLifecycle[v];
    if (cycle.outputs.length === 0 && cycle.inputs.length > 0) {
      entryCount++;
      const vDesc = varDescriptions[v] || 'Aucune description fournie';
      md += `- \`${v}\` : ${vDesc} (Lue par : *${cycle.inputs.join(', ')}*)\n`;
    }
  });
  if (entryCount === 0) {
    md += `- *Aucune variable d'entrée stricte détectée. Le processus démarre sans payload obligatoire.*\n`;
  }
  md += `\n`;
  md += `### 🛠️ 3. Cycle de validation et tests locaux\n`;
  md += `1. **Conformité** : Assurez-vous d'utiliser FlowAudit Pro pour valider que toute nouvelle variable respecte la convention camelCase.\n`;
  md += `2. **Variables de sortie** : À la fin de l'exécution, le processus produit les variables finales suivantes : \`${Object.keys(varLifecycle).filter(v => varLifecycle[v].inputs.length === 0 && varLifecycle[v].outputs.length > 0).join('`, `') || 'Aucune'}\`.\n`;
  md += `3. **Suivi des activités** : Reportez-vous à la section 3 (Matrice de gouvernance) pour connaître les cas d'applicabilité spécifiques de chaque tâche utilisateur ou de service.\n\n`;
  
  md += `\n\n*Document auto-généré par Camunda FlowAudit Pro.*`;
  return md;
};

// HTML rendering for documentation preview and printer
window.generatePmgHtml = function(isForPrint) {
  const activities = window.pmgActivities || [];
  const details = window.pmgProcessDetails || {};
  
  const name = document.getElementById('pmgProcessName')?.value || details.name || 'Processus sans nom';
  const id = document.getElementById('pmgProcessId')?.value || details.id || 'N/A';
  const version = document.getElementById('pmgProcessVersion')?.value || details.version || 'Non spécifiée';
  const owner = document.getElementById('pmgProcessOwner')?.value || details.owner || 'Non spécifié';
  const exporter = document.getElementById('pmgExporter')?.value || details.exporter || 'N/A';
  const isExecutable = document.getElementById('pmgIsExecutable')?.value === 'true' ? 'Oui' : 'Non';
  const desc = document.getElementById('pmgProcessDesc')?.value || details.desc || 'Aucune description.';
  
  const total = activities.length;
  let documented = 0;
  activities.forEach(act => {
    if ((act.applicableCase || '').trim() || (act.comment || '').trim()) documented++;
  });
  const completeness = total > 0 ? Math.round((documented / total) * 100) : 0;
  
  const varLifecycle = getPmgVarLifecycle(activities);
  const varDescriptions = details.variableDescriptions || {};
  const totalVars = Object.keys(varLifecycle).length;

  let html = ``;
  if (!isForPrint) {
    html += `<h1>Guide de Cartographie &amp; Gouvernance (Process Mapping Guide - PMG)</h1>`;
  }
  
  html += `
    <div style="margin-bottom: 20px; background: ${isForPrint ? '#f8fafc' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 15px; border-radius: 6px;">
      <h2 style="margin-top:0; border:none; padding-bottom:0; font-size: 15px; color:${isForPrint ? '#1e293b' : 'var(--text-primary)'}; font-weight:600; margin-bottom: 10px;">1. Métadonnées du Processus</h2>
      <table style="width:100%; border:none; margin:0;">
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; width:30%; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Nom du Processus :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(name)}</td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">ID Technique (Process ID) :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};"><code>${esc(id)}</code></td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Version :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(version)}</td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Propriétaire Métier :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(owner)}</td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Outil Modélisateur :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(exporter)}</td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Exécutable :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(isExecutable)}</td></tr>
        <tr style="background:transparent;"><td style="border:none; padding:4px 0; font-weight:600; color:${isForPrint ? '#475569' : 'var(--text-secondary)'};">Description / Objectif :</td><td style="border:none; padding:4px 0; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'};">${esc(desc)}</td></tr>
      </table>
    </div>
    
    <div style="margin-bottom: 20px; background: ${isForPrint ? '#f8fafc' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 15px; border-radius: 6px;">
      <h2 style="margin-top:0; border:none; padding-bottom:0; font-size: 15px; color:${isForPrint ? '#1e293b' : 'var(--text-primary)'}; font-weight:600; margin-bottom: 10px;">2. Indicateurs Globaux &amp; KPIs</h2>
      <ul style="margin: 0; padding-left: 20px; color:${isForPrint ? '#0f172a' : 'inherit'}; font-size:12.5px;">
        <li>Taux de Complétude de la Documentation : <strong>${completeness}%</strong> (${documented} / ${total} tâches documentées)</li>
        <li>Nombre total d'activités modélisées : <strong>${total}</strong></li>
        <li>Volume de variables de données : <strong>${totalVars}</strong> variables uniques échangées</li>
      </ul>
    </div>
    
    <h2 style="font-size: 15px; color:${isForPrint ? '#1e293b' : 'var(--text-primary)'}; font-weight:600; margin-bottom: 10px;">3. Matrice de Gouvernance des Activités</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background: ${isForPrint ? '#f1f5f9' : 'var(--bg-hover-strong)'};">
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Activité</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Type</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Entité réalisatrice</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Inputs (Entrées)</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Outputs (Sorties)</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Cas d'applicabilité</th>
          <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; color:${isForPrint ? '#334155' : 'var(--text-primary)'}; font-size:11px; text-transform:uppercase;">Commentaire</th>
        </tr>
      </thead>
      <tbody>
        ${activities.map((act, idx) => {
          const rowInputs = act.inputs.length ? act.inputs.map(i => `<li style="font-family:var(--font-mono); font-size:10px;">${esc(i)}</li>`).join('') : '<li>Aucun</li>';
          const rowOutputs = act.outputs.length ? act.outputs.map(o => `<li style="font-family:var(--font-mono); font-size:10px;">${esc(o)}</li>`).join('') : '<li>Aucun</li>';
          const rowBg = idx % 2 === 0 ? (isForPrint ? '#ffffff' : 'transparent') : (isForPrint ? '#f8fafc' : 'rgba(255,255,255,0.01)');
          
          return `
            <tr style="background: ${rowBg};">
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top;">
                <strong>${esc(act.name)}</strong><br>
                <small style="color:${isForPrint ? '#64748b' : 'var(--text-tertiary)'}; font-family:var(--font-mono); font-size: 10px;">${esc(act.id)}</small>
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top; font-size:11px;">
                ${esc(act.typeLabel)}
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top; font-size:11px;">
                ${esc(act.entity || 'Non définie')}
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top;">
                <ul style="margin:0; padding-left:12px;">${rowInputs}</ul>
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top;">
                <ul style="margin:0; padding-left:12px;">${rowOutputs}</ul>
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top; font-size:11px;">
                ${esc(act.applicableCase || 'N/A').replace(/\n/g, '<br>')}
              </td>
              <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; color:${isForPrint ? '#0f172a' : 'var(--text-primary)'}; vertical-align:top; font-size:11px;">
                ${esc(act.comment || 'N/A').replace(/\n/g, '<br>')}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div style="margin-top: 25px; margin-bottom: 20px; background: ${isForPrint ? '#f8fafc' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 15px; border-radius: 6px;">
      <h2 style="margin-top:0; border:none; padding-bottom:0; font-size: 15px; color:${isForPrint ? '#1e293b' : 'var(--text-primary)'}; font-weight:600; margin-bottom: 10px;">4. Glossaire &amp; Lignage des Variables de Données</h2>
      <p style="font-size: 12.5px; color:${isForPrint ? '#334155' : 'var(--text-secondary)'}; margin-bottom: 12px;">Ce glossaire recense les variables échangées, identifie les producteurs (tâches qui écrivent) et consommateurs (tâches qui lisent), et décrit leur rôle.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: ${isForPrint ? '#f1f5f9' : 'var(--bg-hover-strong)'};">
            <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; font-size:11px; text-transform:uppercase;">Variable</th>
            <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; font-size:11px; text-transform:uppercase;">Flux</th>
            <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; font-size:11px; text-transform:uppercase;">Producteurs</th>
            <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; font-size:11px; text-transform:uppercase;">Consommateurs</th>
            <th style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-weight:600; font-size:11px; text-transform:uppercase;">Description / Rôle</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(varLifecycle).sort().map(v => {
            const cycle = varLifecycle[v];
            let type = "Interne";
            if (cycle.outputs.length === 0 && cycle.inputs.length > 0) type = "Entrée (Payload)";
            else if (cycle.outputs.length > 0 && cycle.inputs.length === 0) type = "Sortie (Résultat)";
            const vDesc = varDescriptions[v] || '<em style="color:var(--text-tertiary);">Non documentée</em>';
            return `
              <tr>
                <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-family:var(--font-mono); font-size: 11px;"><code>${esc(v)}</code></td>
                <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-size: 11px;">${type}</td>
                <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-size: 11px;">${esc(cycle.outputs.join(', ') || 'Externe / API')}</td>
                <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-size: 11px;">${esc(cycle.inputs.join(', ') || 'Aucun (Fin de flux)')}</td>
                <td style="border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 8px; font-size: 11px;">${vDesc}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom: 20px; background: ${isForPrint ? '#f8fafc' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isForPrint ? '#cbd5e1' : 'var(--border-color)'}; padding: 15px; border-radius: 6px;">
      <h2 style="margin-top:0; border:none; padding-bottom:0; font-size: 15px; color:${isForPrint ? '#1e293b' : 'var(--text-primary)'}; font-weight:600; margin-bottom: 10px;">5. Guide de Prise en Main (Onboarding Checklist)</h2>
      <ul style="margin: 0; padding-left: 20px; color:${isForPrint ? '#0f172a' : 'inherit'}; font-size:12.5px; line-height: 1.6;">
        <li><strong>Déploiement du processus</strong> : Déployer le fichier <code>${esc(id)}.bpmn</code> (Version <code>${esc(version || '1.0.0')}</code>) sur Camunda. Modélisateur : <em>${esc(exporter)}</em>.</li>
        <li style="margin-top:5px;"><strong>Variables d'entrée requises (Payload initial)</strong> :
          <ul style="margin:5px 0 0 0; padding-left:15px; font-size:12px;">
            ${Object.keys(varLifecycle).map(v => {
              const cycle = varLifecycle[v];
              if (cycle.outputs.length === 0 && cycle.inputs.length > 0) {
                return `<li><code>${esc(v)}</code> : ${esc(varDescriptions[v] || 'Aucune description fournie (Lue par : ' + cycle.inputs.join(', ') + ')') }</li>`;
              }
              return '';
            }).join('') || '<li>Aucune variable d\'entrée obligatoire requise.</li>'}
          </ul>
        </li>
        <li style="margin-top:5px;"><strong>Propriétaire Métier</strong> : Équipe <strong>${esc(owner || 'Non spécifié')}</strong></li>
        <li style="margin-top:5px;"><strong>Conformité de nommage</strong> : Valider que toute modification ultérieure respecte les conventions camelCase à l'aide de FlowAudit Pro.</li>
        <li style="margin-top:5px;"><strong>Tests locaux</strong> : Se référer à la section 3 (Matrice de gouvernance) pour tester les cas d'applicabilité de chaque tâche.</li>
      </ul>
    </div>
  `;
  return html;
};

// Copy Markdown Documentation to clipboard
window.copyPmgDocMarkdown = function() {
  const md = generatePmgMarkdown();
  navigator.clipboard.writeText(md).then(() => {
    alert("Le guide technique PMG au format Markdown a été copié dans le presse-papiers.");
  }).catch(err => {
    console.error("Erreur de copie", err);
    alert("Erreur lors de la copie de la documentation.");
  });
};

// Download Markdown Documentation as .md file
window.exportPmgDocMarkdown = function() {
  const md = generatePmgMarkdown();
  const processId = document.getElementById('pmgProcessId')?.value || window.pmgProcessDetails.id || 'processus';
  dl(md, `guide_technique_pmg_${processId}.md`, 'text/markdown');
};

// Open printable window for beautiful documentation PDF generation
window.printPmgDoc = function() {
  const processName = document.getElementById('pmgProcessName')?.value || 'Non défini';
  const docHtml = generatePmgHtml(true);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer la documentation.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Guide PMG - ${esc(processName)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 30px; line-height: 1.5; background:#fff; }
        h1 { margin-bottom: 5px; color: #ff7520; font-size: 24px; font-weight:700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        h2 { font-size: 16px; font-weight: 600; color: #334155; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; color: #334155; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing:0.3px; }
        tr:nth-child(even) td { background: #f8fafc; }
        code { font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 10px; }
        @media print {
          body { margin: 15px; }
          .no-print { display: none; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;" class="no-print">
        <span style="color:#64748b; font-size:12px;">Camunda FlowAudit Pro | Outil de Gouvernance</span>
        <button onclick="window.print()" style="padding:8px 16px; background:#ff7520; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px;">Imprimer / Enregistrer en PDF</button>
      </div>
      <h1>Guide de Cartographie &amp; Documentation Technique (PMG)</h1>
      ${docHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
};
