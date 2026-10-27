/**
 * ==============================================================================
 * Bouygues Telecom - AuditFlow Pro
 * Module : Cartographie de Linéage Bout-en-Bout (Data Lineage Flowchart)
 * Visualisation du cycle de vie des variables (Producer -> Transformer -> Consumer)
 * ==============================================================================
 */

let lineageNetwork = null;
let currentLineageData = null;
let selectedLineageVariable = 'all';

/**
 * Initialisation du module Linéage
 */
function initLineageModule() {
  extractAndRenderLineage();
}

/**
 * Extraction des données de lignage depuis les modèles BPMN chargés
 */
function extractLineageData() {
  const variablesMap = new Map(); // varName -> { producers: [], transformers: [], consumers: [], processes: Set }

  // 1. Si des fichiers BPMN sont dans bpmnBatch ou allRows
  if (typeof bpmnBatch !== 'undefined' && bpmnBatch && bpmnBatch.length > 0) {
    bpmnBatch.forEach(fileObj => {
      const procName = fileObj.name || (fileObj.doc && fileObj.doc.querySelector('process')?.getAttribute('name')) || fileObj.fileName || 'Processus Inconnu';
      
      if (fileObj.doc) {
        analyzeDocLineage(fileObj.doc, procName, variablesMap);
      }
    });
  } else if (typeof bpmnXmlDoc !== 'undefined' && bpmnXmlDoc) {
    const procName = (bpmnXmlDoc.querySelector('process')?.getAttribute('name')) || bpmnFileName || 'Processus Principal';
    analyzeDocLineage(bpmnXmlDoc, procName, variablesMap);
  }

  // 2. Compléter avec allRows s'il y a des variables importées
  if (typeof allRows !== 'undefined' && allRows && allRows.length > 0) {
    allRows.forEach(row => {
      const vName = row.name;
      if (!vName) return;
      
      if (!variablesMap.has(vName)) {
        variablesMap.set(vName, {
          name: vName,
          status: row.status || 'OK',
          producers: [],
          transformers: [],
          consumers: [],
          processes: new Set()
        });
      }
      
      const vObj = variablesMap.get(vName);
      const pName = row.parentProcess || row.callingProcess || 'Processus Non Défini';
      vObj.processes.add(pName);

      // Si pas encore d'acteur, on ajoute une étape générique
      if (vObj.producers.length === 0 && vObj.consumers.length === 0) {
        if (row.callingProcess) {
          vObj.producers.push({ element: `Appel: ${row.callingProcess}`, type: 'Call Activity', process: pName });
        } else {
          vObj.consumers.push({ element: `Tâche Métier`, type: 'Service Task', process: pName });
        }
      }
    });
  }

  // Convertir en tableau exploitable
  const list = [];
  variablesMap.forEach((val, key) => {
    list.push({
      name: key,
      status: val.status || 'OK',
      producers: val.producers,
      transformers: val.transformers,
      consumers: val.consumers,
      processes: Array.from(val.processes)
    });
  });

  // Tri alphabétique
  list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

/**
 * Analyse XML BPMN pour identifier les rôles de chaque variable
 */
function analyzeDocLineage(doc, procName, map) {
  // Parcourir les tâches et passerelles
  const tasks = Array.from(doc.querySelectorAll('task, bpmn\\:task, serviceTask, bpmn\\:serviceTask, userTask, bpmn\\:userTask, sendTask, bpmn\\:sendTask, receiveTask, bpmn\\:receiveTask, scriptTask, bpmn\\:scriptTask, businessRuleTask, bpmn\\:businessRuleTask, callActivity, bpmn\\:callActivity, intermediateCatchEvent, bpmn\\:intermediateCatchEvent, startEvent, bpmn\\:startEvent')).filter(el => {
    if (el.prefix === 'zeebe' || el.prefix === 'camunda' || el.prefix === 'modeler') return false;
    let p = el.parentElement;
    while (p && p.nodeType === 1) {
      const pLn = (p.localName || '').toLowerCase();
      if (pLn === 'extensionelements' || pLn === 'extension_elements') return false;
      p = p.parentElement;
    }
    return true;
  });
  
  tasks.forEach(task => {
    const taskName = task.getAttribute('name') || task.getAttribute('id') || 'Élément BPMN';
    const taskType = task.tagName.replace('bpmn:', '');

    // Zeebe I/O mappings
    const ioMappings = task.querySelectorAll('ioMapping, zeebe\\:ioMapping');
    ioMappings.forEach(io => {
      // Inputs = Consumers
      const inputs = io.querySelectorAll('input, zeebe\\:input');
      inputs.forEach(inp => {
        const source = inp.getAttribute('source') || '';
        const target = inp.getAttribute('target') || '';
        
        // Extraire variable source
        const extractedSources = extractVarNamesFromFeel(source);
        extractedSources.forEach(vName => {
          registerLineageRole(map, vName, 'consumer', taskName, taskType, procName);
        });
        
        // Target est une nouvelle variable produite dans le scope
        if (target) {
          registerLineageRole(map, target, 'producer', taskName, taskType, procName);
        }
      });

      // Outputs = Producers / Transformers
      const outputs = io.querySelectorAll('output, zeebe\\:output');
      outputs.forEach(out => {
        const source = out.getAttribute('source') || '';
        const target = out.getAttribute('target') || '';

        const extractedSources = extractVarNamesFromFeel(source);
        extractedSources.forEach(vName => {
          registerLineageRole(map, vName, 'transformer', taskName, taskType, procName);
        });

        if (target) {
          registerLineageRole(map, target, 'producer', taskName, taskType, procName);
        }
      });
    });

    // Camunda 7 inputOutput
    const camundaInputs = task.querySelectorAll('inputParameter, camunda\\:inputParameter');
    camundaInputs.forEach(inp => {
      const name = inp.getAttribute('name');
      const val = inp.textContent || '';
      if (name) registerLineageRole(map, name, 'consumer', taskName, taskType, procName);
      const varsInVal = extractVarNamesFromFeel(val);
      varsInVal.forEach(v => registerLineageRole(map, v, 'consumer', taskName, taskType, procName));
    });

    const camundaOutputs = task.querySelectorAll('outputParameter, camunda\\:outputParameter');
    camundaOutputs.forEach(out => {
      const name = out.getAttribute('name');
      const val = out.textContent || '';
      if (name) registerLineageRole(map, name, 'producer', taskName, taskType, procName);
      const varsInVal = extractVarNamesFromFeel(val);
      varsInVal.forEach(v => registerLineageRole(map, v, 'transformer', taskName, taskType, procName));
    });
  });
}

function registerLineageRole(map, varName, role, elemName, elemType, procName) {
  if (!varName || typeof varName !== 'string' || varName.trim() === '') return;
  const cleanName = varName.trim().replace(/^=/, '').trim();
  if (!cleanName || cleanName.length < 2) return;

  if (!map.has(cleanName)) {
    map.set(cleanName, {
      name: cleanName,
      status: 'OK',
      producers: [],
      transformers: [],
      consumers: [],
      processes: new Set()
    });
  }

  const entry = map.get(cleanName);
  entry.processes.add(procName);

  const detail = { element: elemName, type: elemType, process: procName };

  if (role === 'producer') {
    if (!entry.producers.some(p => p.element === elemName && p.process === procName)) {
      entry.producers.push(detail);
    }
  } else if (role === 'transformer') {
    if (!entry.transformers.some(t => t.element === elemName && t.process === procName)) {
      entry.transformers.push(detail);
    }
  } else if (role === 'consumer') {
    if (!entry.consumers.some(c => c.element === elemName && c.process === procName)) {
      entry.consumers.push(detail);
    }
  }
}

function extractVarNamesFromFeel(expr) {
  if (!expr || typeof expr !== 'string') return [];
  const results = [];
  // Match identifiers like varName, payload.customer_id, etc.
  const matches = expr.match(/[a-zA-Z_][a-zA-Z0-9_\.]*/g);
  if (matches) {
    matches.forEach(m => {
      // Filtrer les mots réservés FEEL courants
      if (!['true', 'false', 'null', 'string', 'number', 'date', 'time', 'duration', 'if', 'then', 'else', 'some', 'every', 'in', 'satisfies'].includes(m.toLowerCase())) {
        const rootVar = m.split('.')[0];
        if (rootVar && !results.includes(rootVar)) results.push(rootVar);
      }
    });
  }
  return results;
}

/**
 * Rendu principal du module Linéage
 */
function extractAndRenderLineage() {
  currentLineageData = extractLineageData();

  // Remplir le sélecteur de variable
  const select = document.getElementById('lineageVarSelect');
  if (select) {
    const currentVal = select.value;
    select.innerHTML = '<option value="all">🔍 Vue Globale (Toutes les variables)</option>';
    
    currentLineageData.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const totalSteps = v.producers.length + v.transformers.length + v.consumers.length;
      opt.textContent = `${v.name} (${totalSteps} étapes • ${v.processes.length} proc.)`;
      select.appendChild(opt);
    });

    if (currentVal && currentLineageData.some(v => v.name === currentVal)) {
      select.value = currentVal;
    }
  }

  renderLineageKPIs();
  renderLineageGraph();
  renderLineageTable();
}

/**
 * Calcul et affichage des indicateurs du Linéage
 */
function renderLineageKPIs() {
  if (!currentLineageData) return;

  const totalVars = currentLineageData.length;
  let totalProducers = 0;
  let totalConsumers = 0;
  let orphans = 0; // variables sans producteur ou sans consommateur

  currentLineageData.forEach(v => {
    totalProducers += v.producers.length;
    totalConsumers += v.consumers.length;
    if (v.producers.length === 0 || v.consumers.length === 0) {
      orphans++;
    }
  });

  const kpiTotal = document.getElementById('lineage-kpi-total');
  const kpiFlows = document.getElementById('lineage-kpi-flows');
  const kpiCoverage = document.getElementById('lineage-kpi-coverage');
  const kpiOrphans = document.getElementById('lineage-kpi-orphans');

  if (kpiTotal) kpiTotal.textContent = totalVars;
  if (kpiFlows) kpiFlows.textContent = totalProducers + totalConsumers;
  if (kpiCoverage) {
    const coverage = totalVars > 0 ? Math.round(((totalVars - orphans) / totalVars) * 100) : 100;
    kpiCoverage.textContent = `${coverage}%`;
  }
  if (kpiOrphans) kpiOrphans.textContent = orphans;
}

/**
 * Rendu du graphe vis.js pour le cycle de vie des variables
 */
function renderLineageGraph() {
  const container = document.getElementById('lineageGraphCanvas');
  if (!container || typeof vis === 'undefined') return;

  const selectedVar = document.getElementById('lineageVarSelect')?.value || 'all';
  const nodes = [];
  const edges = [];
  const addedNodes = new Set();

  const dataToDisplay = selectedVar === 'all' 
    ? currentLineageData.slice(0, 15) // Limiter à 15 variables en vue globale pour lisibilité
    : currentLineageData.filter(v => v.name === selectedVar);

  if (dataToDisplay.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🌐</div><div>Aucune donnée de lignage disponible. Chargez un fichier BPMN pour cartographier les flux.</div></div>';
    return;
  }

  dataToDisplay.forEach((v, vIdx) => {
    // Nœud central de la variable
    const varNodeId = `var_${v.name}`;
    if (!addedNodes.has(varNodeId)) {
      nodes.push({
        id: varNodeId,
        label: `📄 ${v.name}`,
        shape: 'box',
        color: {
          background: '#003882',
          border: '#009cd7',
          highlight: { background: '#00204d', border: '#00d2ff' }
        },
        font: { color: '#ffffff', face: 'JetBrains Mono, monospace', size: 13, bold: true },
        margin: 10,
        shadow: { enabled: true, color: 'rgba(0, 56, 130, 0.3)', size: 8 }
      });
      addedNodes.add(varNodeId);
    }

    // Nœuds Producteurs (Vert / Origine)
    v.producers.forEach((p, pIdx) => {
      const prodId = `prod_${v.name}_${pIdx}`;
      if (!addedNodes.has(prodId)) {
        nodes.push({
          id: prodId,
          label: `🟢 PRODUCER\n${p.element}\n[${p.process}]`,
          shape: 'ellipse',
          color: { background: '#f0fdf4', border: '#16a34a' },
          font: { color: '#14532d', face: 'Plus Jakarta Sans', size: 11 },
          margin: 8
        });
        addedNodes.add(prodId);
      }
      edges.push({
        from: prodId,
        to: varNodeId,
        arrows: 'to',
        label: 'génère / écrit',
        color: { color: '#16a34a', highlight: '#15803d' },
        font: { size: 10, color: '#15803d', align: 'middle' },
        smooth: { type: 'cubicBezier', roundness: 0.4 }
      });
    });

    // Nœuds Transformateurs (Orange / Modification)
    v.transformers.forEach((t, tIdx) => {
      const transId = `trans_${v.name}_${tIdx}`;
      if (!addedNodes.has(transId)) {
        nodes.push({
          id: transId,
          label: `⚡ TRANSFORMER\n${t.element}\n[${t.process}]`,
          shape: 'diamond',
          color: { background: '#fff7ed', border: '#ea5b0c' },
          font: { color: '#9a3412', face: 'Plus Jakarta Sans', size: 11 },
          margin: 8
        });
        addedNodes.add(transId);
      }
      edges.push({
        from: varNodeId,
        to: transId,
        arrows: 'to',
        label: 'transforme',
        color: { color: '#ea5b0c' },
        font: { size: 10, color: '#c2410c', align: 'middle' }
      });
    });

    // Nœuds Consommateurs (Bleu Cyan / Lecture)
    v.consumers.forEach((c, cIdx) => {
      const consId = `cons_${v.name}_${cIdx}`;
      if (!addedNodes.has(consId)) {
        nodes.push({
          id: consId,
          label: `🔵 CONSUMER\n${c.element}\n[${c.process}]`,
          shape: 'ellipse',
          color: { background: '#e0f2fe', border: '#009cd7' },
          font: { color: '#0369a1', face: 'Plus Jakarta Sans', size: 11 },
          margin: 8
        });
        addedNodes.add(consId);
      }
      edges.push({
        from: varNodeId,
        to: consId,
        arrows: 'to',
        label: 'consomme / lit',
        color: { color: '#009cd7', highlight: '#003882' },
        font: { size: 10, color: '#003882', align: 'middle' },
        smooth: { type: 'cubicBezier', roundness: 0.4 }
      });
    });
  });

  const visData = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges)
  };

  const options = {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR', // Left to Right
        sortMethod: 'directed',
        levelSeparation: 220,
        nodeSpacing: 120
      }
    },
    physics: false,
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true,
      navigationButtons: true
    }
  };

  if (lineageNetwork) {
    lineageNetwork.destroy();
  }

  lineageNetwork = new vis.Network(container, visData, options);
}

/**
 * Rendu du tableau synthétique du lignage
 */
function renderLineageTable() {
  const tbody = document.getElementById('lineageTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('lineageSearchInput')?.value.toLowerCase() || '';
  const selectedVar = document.getElementById('lineageVarSelect')?.value || 'all';

  let list = currentLineageData || [];
  if (selectedVar !== 'all') {
    list = list.filter(v => v.name === selectedVar);
  }
  if (searchInput) {
    list = list.filter(v => v.name.toLowerCase().includes(searchInput) || v.processes.some(p => p.toLowerCase().includes(searchInput)));
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-tertiary);">Aucun flux de lignage correspondant</td></tr>';
    return;
  }

  let html = '';
  list.forEach(v => {
    const producersList = v.producers.map(p => `<span class="lineage-chip chip-prod">🟢 ${escapeHtml(p.element)} (${escapeHtml(p.process)})</span>`).join(' ') || '<span style="color:var(--text-muted); font-size:11px;">Aucun (variable externe/initiale)</span>';
    const consumersList = v.consumers.map(c => `<span class="lineage-chip chip-cons">🔵 ${escapeHtml(c.element)} (${escapeHtml(c.process)})</span>`).join(' ') || '<span style="color:var(--text-muted); font-size:11px;">Aucun (non réutilisée)</span>';
    const transformersList = v.transformers.map(t => `<span class="lineage-chip chip-trans">⚡ ${escapeHtml(t.element)}</span>`).join(' ') || '-';
    const processesTags = v.processes.map(p => `<span class="badge ok" style="font-size:10px;">${escapeHtml(p)}</span>`).join(' ');

    html += `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--brand-primary);">${escapeHtml(v.name)}</td>
        <td>${producersList}</td>
        <td>${transformersList}</td>
        <td>${consumersList}</td>
        <td>${processesTags}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterLineageBySelectedVar() {
  renderLineageGraph();
  renderLineageTable();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.initLineageModule = initLineageModule;
window.filterLineageBySelectedVar = filterLineageBySelectedVar;
window.renderLineageTable = renderLineageTable;
