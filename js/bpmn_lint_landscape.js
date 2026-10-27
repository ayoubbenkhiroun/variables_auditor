/**
 * Paprika AuditFlow Pro - Cartographie Globale d'Orchestration 3D/2D
 * (Landscape Architecture Graph)
 * Analyse et visualisation topologique des interconnexions multi-processus BPMN 2.0
 */

let bpmnLandscapeNetwork = null;
let bpmnLandscapeLayoutMode = 'hierarchical'; // 'hierarchical' | 'force'
let bpmnLandscapeStatusFilter = 'all';
let bpmnLandscapeEdgeTypeFilter = 'all';
let bpmnLandscapeSearchQuery = '';
let bpmnLandscapeSelectedNodeId = null;

function getBpmnLandscapeFiles() {
  const list = [];
  const names = new Set();

  // 1. Source : Audit Santé BPMN (bpmnLintFiles)
  const lintFiles = (typeof window.getBpmnLintFiles === 'function' ? window.getBpmnLintFiles() : null) || window.bpmnLintFiles || [];
  if (Array.isArray(lintFiles)) {
    lintFiles.forEach(f => {
      const fn = f.fileName || f.name || 'process.bpmn';
      if (!names.has(fn.toLowerCase())) {
        let doc = f.xmlDoc;
        if (!doc && f.source) {
          try { doc = new DOMParser().parseFromString(f.source, 'application/xml'); } catch (e) {}
        }
        if (doc || f.source) {
          list.push({ fileName: fn, source: f.source || '', xmlDoc: doc });
          names.add(fn.toLowerCase());
        }
      }
    });
  }

  // 2. Source : Audit des Variables en lot (bpmnBatch)
  if (window.bpmnBatch && Array.isArray(window.bpmnBatch)) {
    window.bpmnBatch.forEach(b => {
      const fn = b.name || b.fileName || 'process.bpmn';
      if (!names.has(fn.toLowerCase())) {
        let doc = b.doc || b.xmlDoc;
        if (!doc && b.source) {
          try { doc = new DOMParser().parseFromString(b.source, 'application/xml'); } catch (e) {}
        }
        if (doc || b.source) {
          list.push({ fileName: fn, source: b.source || '', xmlDoc: doc });
          names.add(fn.toLowerCase());
        }
      }
    });
  }

  // 3. Source : Module PMG (allPmgProcesses / pmgProcesses)
  const pmgProcs = window.allPmgProcesses || window.pmgProcesses || [];
  if (Array.isArray(pmgProcs)) {
    pmgProcs.forEach(p => {
      const fn = p.fileName || `${p.processId || 'process'}.bpmn`;
      if (!names.has(fn.toLowerCase())) {
        let doc = p.xmlDoc;
        if (!doc && p.xmlSource) {
          try { doc = new DOMParser().parseFromString(p.xmlSource, 'application/xml'); } catch (e) {}
        }
        if (doc || p.xmlSource) {
          list.push({ fileName: fn, source: p.xmlSource || '', xmlDoc: doc });
          names.add(fn.toLowerCase());
        }
      }
    });
  }

  // 4. Source : Diagramme unique racine (bpmnXmlDoc / bpmnRawXml)
  if (window.bpmnXmlDoc) {
    const fn = window.bpmnFileName || 'Processus_Principal.bpmn';
    if (!names.has(fn.toLowerCase())) {
      list.push({ fileName: fn, source: window.bpmnRawXml || '', xmlDoc: window.bpmnXmlDoc });
      names.add(fn.toLowerCase());
    }
  }

  return list;
}

window.renderBpmnLintLandscape = function() {
  const container = document.getElementById('bpmnLintLandscapeCanvas');
  const emptyState = document.getElementById('bpmnLintLandscapeEmpty');
  const statsContainer = document.getElementById('bpmnLintLandscapeStats');
  const detailsPanel = document.getElementById('bpmnLintLandscapeDetails');

  const files = getBpmnLandscapeFiles();
  const results = window.bpmnLintResults || [];

  if (!files.length) {
    if (container) container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    if (statsContainer) statsContainer.innerHTML = '';
    if (detailsPanel) detailsPanel.innerHTML = '<p class="text-muted" style="padding:24px; font-size:12px; text-align:center; color:var(--text-secondary);">Chargez des fichiers BPMN dans le module d\'audit pour inspecter la cartographie globale.</p>';
    return;
  }

  if (container) container.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  // 1. Extraction approfondie des processus, dépendances et flux
  const processNodesMap = new Map();
  const edges = [];
  const missingTargets = new Set();
  const callsMap = new Map(); // targetId -> [sources]
  const downstreamMap = new Map(); // sourceId -> [targets]

  files.forEach(file => {
    let doc = file.xmlDoc;
    if (!doc && file.source) {
      try { doc = new DOMParser().parseFromString(file.source, 'application/xml'); } catch (e) {}
    }
    if (!doc) return;

    const result = results.find(r => r.fileName === file.fileName) || { score: 100, status: 'Conforme', blockers: 0, warnings: 0 };

    const procEls = Array.from(doc.querySelectorAll('process, bpmn\\:process'));
    if (procEls.length === 0) {
      // Fallback si pas de balise process explicite
      const pId = file.fileName.replace(/\.(bpmn|xml)$/i, '');
      processNodesMap.set(pId, {
        id: pId,
        label: pId,
        fullName: pId,
        fileName: file.fileName,
        isExecutable: true,
        score: result.score !== undefined ? result.score : 100,
        status: result.status || 'Conforme',
        blockers: result.blockers || 0,
        warnings: result.warnings || 0,
        serviceTasks: 0,
        userTasks: 0,
        scriptTasks: 0,
        callActivities: 0,
        gateways: 0,
        events: 0,
        cyclomatic: 1
      });
      return;
    }

    procEls.forEach(proc => {
      const pId = proc.getAttribute('id') || file.fileName.replace(/\.(bpmn|xml)$/i, '');
      const pName = proc.getAttribute('name') || pId;
      const isExec = proc.getAttribute('isExecutable') !== 'false';

      // Métriques d'automatisation
      const serviceTasks = proc.querySelectorAll('serviceTask, bpmn\\:serviceTask, sendTask, bpmn\\:sendTask').length;
      const userTasks = proc.querySelectorAll('userTask, bpmn\\:userTask').length;
      const scriptTasks = proc.querySelectorAll('scriptTask, bpmn\\:scriptTask').length;
      const callActivities = proc.querySelectorAll('callActivity, bpmn\\:callActivity').length;
      const gateways = proc.querySelectorAll('exclusiveGateway, bpmn\\:exclusiveGateway, parallelGateway, bpmn\\:parallelGateway, inclusiveGateway, bpmn\\:inclusiveGateway').length;
      const events = proc.querySelectorAll('startEvent, bpmn\\:startEvent, endEvent, bpmn\\:endEvent, intermediateCatchEvent, bpmn\\:intermediateCatchEvent, boundaryEvent, bpmn\\:boundaryEvent').length;

      processNodesMap.set(pId, {
        id: pId,
        label: pName.length > 26 ? pName.slice(0, 24) + '…' : pName,
        fullName: pName,
        fileName: file.fileName,
        isExecutable: isExec,
        score: result.score !== undefined ? result.score : 100,
        status: result.status || 'Conforme',
        blockers: result.blockers || 0,
        warnings: result.warnings || 0,
        serviceTasks,
        userTasks,
        scriptTasks,
        callActivities,
        gateways,
        events,
        cyclomatic: gateways + 1
      });

      // 2. Détection des Call Activities
      Array.from(proc.querySelectorAll('callActivity, bpmn\\:callActivity')).forEach(ca => {
        const caId = ca.getAttribute('id') || 'call';
        const caName = ca.getAttribute('name') || caId;
        const target = ca.getAttribute('calledElement') ||
                       ca.querySelector('calledElement, zeebe\\:calledElement')?.getAttribute('processId') || '';

        const propParent = ca.querySelector('calledElement, zeebe\\:calledElement')?.getAttribute('propagateAllParentVariables') === 'true';
        const propChild = ca.querySelector('calledElement, zeebe\\:calledElement')?.getAttribute('propagateAllChildVariables') === 'true';

        if (target) {
          edges.push({
            id: `edge-${pId}-${target}-${caId}`,
            from: pId,
            to: target,
            type: 'call',
            activityId: caId,
            activityName: caName,
            propParent,
            propChild,
            label: caName.length > 18 ? caName.slice(0, 16) + '…' : caName
          });

          if (!callsMap.has(target)) callsMap.set(target, []);
          callsMap.get(target).push({ source: pId, sourceName: pName, activity: caName, file: file.fileName, propParent, propChild });

          if (!downstreamMap.has(pId)) downstreamMap.set(pId, []);
          downstreamMap.get(pId).push({ target, targetName: target, activity: caName });
        }
      });

      // 3. Détection des flux de messages inter-processus
      Array.from(doc.querySelectorAll('messageFlow, bpmn\\:messageFlow')).forEach(mf => {
        const sourceRef = mf.getAttribute('sourceRef');
        const targetRef = mf.getAttribute('targetRef');
        const mfName = mf.getAttribute('name') || 'Message';
        if (sourceRef && targetRef) {
          edges.push({
            id: `msg-${mf.getAttribute('id') || Math.random()}`,
            from: pId,
            to: targetRef,
            type: 'message',
            label: `✉️ ${mfName}`
          });
        }
      });
    });
  });

  // Identifier les cibles manquantes (dépendances non fournies dans le lot)
  edges.forEach(e => {
    if (!processNodesMap.has(e.to)) {
      missingTargets.add(e.to);
      processNodesMap.set(e.to, {
        id: e.to,
        label: `⚠️ ${e.to}`,
        fullName: `Processus cible absent : ${e.to}`,
        fileName: 'Non fourni dans le lot',
        isMissing: true,
        score: 0,
        status: 'Bloquant',
        blockers: 1,
        warnings: 0,
        serviceTasks: 0,
        userTasks: 0,
        scriptTasks: 0,
        callActivities: 0,
        gateways: 0,
        events: 0,
        cyclomatic: 0
      });
    }
  });

  // Identifier les racines du paysage (Hubs d'orchestration de niveau 1)
  const allTargets = new Set(edges.map(e => e.to));
  const rootProcesses = Array.from(processNodesMap.values()).filter(p => !p.isMissing && !allTargets.has(p.id));

  // 4. Badges de synthèse en haut de page
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="bpmn-landscape-stat-pill" style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:6px 14px; font-size:12px;">
        <span>Processus Détectés :</span> <strong style="color:#003882; font-size:13px;">${processNodesMap.size - missingTargets.size}</strong>
      </div>
      <div class="bpmn-landscape-stat-pill" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:6px 14px; font-size:12px; color:#166534;">
        <span>Orchestrateurs Racines :</span> <strong style="font-size:13px;">${rootProcesses.length}</strong>
      </div>
      <div class="bpmn-landscape-stat-pill" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:6px 14px; font-size:12px; color:#0284c7;">
        <span>Liaisons Call Activities :</span> <strong style="font-size:13px;">${edges.filter(e => e.type === 'call').length}</strong>
      </div>
      <div class="bpmn-landscape-stat-pill" style="background:${missingTargets.size ? '#fef2f2' : '#f0fdf4'}; border:1px solid ${missingTargets.size ? '#fecdd3' : '#bbf7d0'}; border-radius:8px; padding:6px 14px; font-size:12px; color:${missingTargets.size ? '#dc2626' : '#166534'};">
        <span>Cibles Manquantes :</span> <strong style="font-size:13px;">${missingTargets.size}</strong>
      </div>
    `;
  }

  // 5. Génération des nœuds Vis.js avec couleurs & icônes
  const visNodes = [];
  const visEdges = [];

  processNodesMap.forEach(p => {
    // Filtre par statut
    if (bpmnLandscapeStatusFilter !== 'all') {
      if (bpmnLandscapeStatusFilter === 'ok' && p.status !== 'Conforme') return;
      if (bpmnLandscapeStatusFilter === 'warn' && p.status !== 'À revoir') return;
      if (bpmnLandscapeStatusFilter === 'err' && p.status !== 'Bloquant') return;
    }

    // Filtre de recherche texte
    if (bpmnLandscapeSearchQuery) {
      const q = bpmnLandscapeSearchQuery.toLowerCase();
      if (!p.id.toLowerCase().includes(q) && !p.fullName.toLowerCase().includes(q) && !p.fileName.toLowerCase().includes(q)) {
        return;
      }
    }

    const isRoot = rootProcesses.some(r => r.id === p.id);
    let bgColor = '#ffffff';
    let borderColor = '#003882';
    let fontColor = '#0f172a';

    if (p.isMissing) {
      bgColor = '#fee2e2';
      borderColor = '#dc2626';
      fontColor = '#991b1b';
    } else if (p.blockers > 0) {
      bgColor = '#fef2f2';
      borderColor = '#ef4444';
    } else if (p.warnings > 0) {
      bgColor = '#fffbeb';
      borderColor = '#f59e0b';
    } else {
      bgColor = '#f0fdf4';
      borderColor = '#22c55e';
    }

    if (isRoot) {
      borderColor = '#003882';
    }

    visNodes.push({
      id: p.id,
      label: `<b>${p.label}</b>\n${p.isMissing ? '❌ Manquant' : `Score: ${p.score}% · ${p.cyclomatic} CC`}`,
      title: `<div style="padding:6px; font-family:sans-serif; font-size:12px;"><strong>${lintEscape(p.fullName)}</strong><br>Fichier: ${lintEscape(p.fileName)}<br>Score: ${p.score}% (${p.status})<br>Complexité cyclomatique: ${p.cyclomatic}</div>`,
      shape: isRoot ? 'hexagon' : p.isMissing ? 'diamond' : 'box',
      margin: 12,
      color: {
        background: bgColor,
        border: borderColor,
        highlight: { background: '#e0f2fe', border: '#003882' }
      },
      font: { multi: 'html', color: fontColor, size: 12, face: 'Outfit, Inter, sans-serif' },
      borderWidth: isRoot ? 3 : 2,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.06)', size: 6, x: 0, y: 3 }
    });
  });

  const visibleNodeIds = new Set(visNodes.map(n => n.id));

  edges.forEach(e => {
    if (!visibleNodeIds.has(e.from) || !visibleNodeIds.has(e.to)) return;
    if (bpmnLandscapeEdgeTypeFilter !== 'all' && e.type !== bpmnLandscapeEdgeTypeFilter) return;

    const isMsg = e.type === 'message';
    visEdges.push({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label,
      arrows: 'to',
      dashes: isMsg,
      color: { color: isMsg ? '#0284c7' : '#64748b', highlight: '#003882' },
      font: { size: 10, color: isMsg ? '#0284c7' : '#475569', align: 'horizontal', background: '#ffffff' },
      smooth: { type: 'cubicBezier', forceDirection: bpmnLandscapeLayoutMode === 'hierarchical' ? 'vertical' : 'none', roundness: 0.4 }
    });
  });

  // 6. Initialisation ou actualisation Vis.Network
  if (typeof vis === 'undefined' || !vis.Network) {
    if (container) container.innerHTML = '<div style="padding:40px; text-align:center; color:#dc2626;">⚠️ Bibliothèque vis-network non disponible.</div>';
    return;
  }

  const options = {
    layout: bpmnLandscapeLayoutMode === 'hierarchical' ? {
      hierarchical: {
        direction: 'UD',
        sortMethod: 'directed',
        nodeSpacing: 220,
        levelSeparation: 150
      }
    } : {
      improvedLayout: true
    },
    physics: {
      enabled: bpmnLandscapeLayoutMode !== 'hierarchical',
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -65,
        centralGravity: 0.015,
        springLength: 170,
        springConstant: 0.08
      },
      stabilization: { iterations: 120 }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true,
      dragView: true
    }
  };

  if (bpmnLandscapeNetwork) {
    try { bpmnLandscapeNetwork.destroy(); } catch (e) {}
    bpmnLandscapeNetwork = null;
  }

  const data = { nodes: new vis.DataSet(visNodes), edges: new vis.DataSet(visEdges) };
  bpmnLandscapeNetwork = new vis.Network(container, data, options);

  // Synchronisation au clic sur un nœud
  bpmnLandscapeNetwork.on('click', function(params) {
    if (params.nodes && params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      bpmnLandscapeSelectedNodeId = nodeId;
      renderBpmnLandscapeNodeDetails(nodeId, processNodesMap.get(nodeId), callsMap, downstreamMap);
    } else {
      bpmnLandscapeSelectedNodeId = null;
      renderBpmnLandscapeDefaultDetails();
    }
  });

  // Zoom fit initial
  setTimeout(() => {
    if (bpmnLandscapeNetwork) bpmnLandscapeNetwork.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
  }, 200);

  renderBpmnLandscapeDefaultDetails();
};

function renderBpmnLandscapeDefaultDetails() {
  const panel = document.getElementById('bpmnLintLandscapeDetails');
  if (!panel) return;
  panel.innerHTML = `
    <div style="text-align:center; padding:28px 14px; color:var(--text-secondary);">
      <span style="font-size:36px; display:block; margin-bottom:10px;">🗺️</span>
      <strong style="color:var(--text-primary); font-size:14px; display:block; margin-bottom:4px;">Inspecteur d'Architecture Globale</strong>
      <p style="font-size:12px; line-height:1.5; color:var(--text-secondary);">Cliquez sur un processus du graphe pour analyser son <strong>impact en cascade</strong>, ses <strong>processus parents</strong> et ses <strong>dépendances descendantes</strong>.</p>
    </div>
  `;
}

function renderBpmnLandscapeNodeDetails(nodeId, p, callsMap, downstreamMap) {
  const panel = document.getElementById('bpmnLintLandscapeDetails');
  if (!panel || !p) return;

  const parents = callsMap.get(nodeId) || [];
  const children = downstreamMap.get(nodeId) || [];

  panel.innerHTML = `
    <div class="bpmn-landscape-card" style="animation: bpmnDrawerSlideDown 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <span class="badge" style="font-size:10.5px; font-weight:800; text-transform:uppercase; background:${p.isMissing ? '#fee2e2; color:#991b1b;' : p.blockers ? '#fee2e2; color:#991b1b;' : '#dcfce7; color:#166534;'}">
            ${p.status} (Score : ${p.score}%)
          </span>
          <h4 style="margin:6px 0 2px 0; font-size:15px; color:var(--text-primary); font-weight:800;">${lintEscape(p.fullName)}</h4>
          <small style="font-size:11px; color:var(--text-secondary);">ID : <code>${lintEscape(p.id)}</code></small>
        </div>
      </div>

      <!-- Fiche d'identité technique -->
      <div style="background:#f8fafc; border:1px solid var(--border-color, #e2e8f0); border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <span style="color:var(--text-secondary);">Fichier source :</span>
          <strong>${lintEscape(p.fileName)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <span style="color:var(--text-secondary);">Complexité Cyclomatique :</span>
          <strong>${p.cyclomatic}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-secondary);">Mix d'Automatisation :</span>
          <span>${p.serviceTasks} Service · ${p.userTasks} User · ${p.callActivities} Call</span>
        </div>
      </div>

      <!-- Analyse d'Impact Ascendante (Parents) -->
      <div style="margin-bottom:14px;">
        <strong style="font-size:12px; color:#003882; display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span>⬆️ Processus Parents Impactés</span>
          <span class="badge" style="font-size:10px; font-weight:800;">${parents.length}</span>
        </strong>
        ${parents.length ? `
          <ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-primary); line-height:1.6;">
            ${parents.map(pr => `<li><strong>${lintEscape(pr.sourceName || pr.source)}</strong> (via <code>${lintEscape(pr.activity)}</code> dans <em>${lintEscape(pr.file)}</em>)</li>`).join('')}
          </ul>
        ` : '<p style="margin:0; font-size:11.5px; color:var(--text-secondary); font-style:italic;">Aucun parent (Orchestrateur racine ou processus autonome).</p>'}
      </div>

      <!-- Dépendances Descendantes (Enfants) -->
      <div style="margin-bottom:16px;">
        <strong style="font-size:12px; color:#0284c7; display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span>⬇️ Sous-processus Invoqués</span>
          <span class="badge" style="font-size:10px; font-weight:800;">${children.length}</span>
        </strong>
        ${children.length ? `
          <ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-primary); line-height:1.6;">
            ${children.map(ch => `<li><strong>${lintEscape(ch.target)}</strong> (étape <em>${lintEscape(ch.activity)}</em>)</li>`).join('')}
          </ul>
        ` : '<p style="margin:0; font-size:11.5px; color:var(--text-secondary); font-style:italic;">Aucune sous-activité appelée.</p>'}
      </div>

      <!-- Action Ouvrir Visualiseur -->
      ${!p.isMissing ? `
        <button class="btn-primary" onclick="openBpmnLintViewer('${lintEscape(p.fileName)}')" style="width:100%; font-size:12px; font-weight:800; padding:8px; display:flex; justify-content:center; align-items:center; gap:8px;">
          👁️ Inspecter dans le Visualiseur BPMN 2.0
        </button>
      ` : '<div style="color:#dc2626; font-size:12px; font-weight:700; text-align:center;">⚠️ Ce sous-processus doit être importé dans le workspace pour être audité.</div>'}
    </div>
  `;
}

window.triggerBpmnLandscapeImport = function() {
  const fileInput = document.getElementById('bpmnLintFileInput');
  if (fileInput) {
    fileInput.click();
  } else {
    switchTab('bpmn-lint-import');
  }
};

window.setBpmnLandscapeLayout = function(mode) {
  bpmnLandscapeLayoutMode = mode;
  document.querySelectorAll('.bpmn-landscape-layout-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === mode);
  });
  renderBpmnLintLandscape();
};

window.setBpmnLandscapeStatusFilter = function(status) {
  bpmnLandscapeStatusFilter = status;
  renderBpmnLintLandscape();
};

window.setBpmnLandscapeEdgeTypeFilter = function(type) {
  bpmnLandscapeEdgeTypeFilter = type;
  renderBpmnLintLandscape();
};

window.onBpmnLandscapeSearch = function(query) {
  bpmnLandscapeSearchQuery = (query || '').trim();
  renderBpmnLintLandscape();
};

window.bpmnLandscapeZoomFit = function() {
  if (bpmnLandscapeNetwork) {
    bpmnLandscapeNetwork.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  }
};

window.exportBpmnLandscapeImage = function() {
  const canvas = document.querySelector('#bpmnLintLandscapeCanvas canvas');
  if (!canvas) {
    alert('Le graphe d’architecture n’est pas initialisé.');
    return;
  }
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cartographie_Orchestration_BPMN_${new Date().toISOString().slice(0,10)}.png`;
    a.click();
  } catch (err) {
    alert(`Impossible d'exporter l'image : ${err.message}`);
  }
};
