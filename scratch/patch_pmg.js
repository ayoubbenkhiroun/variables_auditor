const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let code = fs.readFileSync(pmgPath, 'utf8');

// 1. Update Global Variables
const oldGlobalVars = `window.pmgXmlDoc = null;
window.pmgFileName = "";
window.pmgActivities = [];
window.pmgProcessDetails = {};`;

const newGlobalVars = `window.pmgXmlDoc = null;
window.pmgFileName = "";
window.pmgActivities = [];
window.pmgProcessDetails = {};
window.pmgCurrentFileEntries = null;
window.pmgBatchResult = null;
window.pmgRootProcesses = [];
window.pmgExplicitParents = null; // Set of procIds or null
window.pmgParentFilter = 'all'; // 'all' | procId | 'shared_only'
window.pmgActivityOrderMode = 'flow'; // 'flow' | 'diagram' | 'level' | 'xml'
window.pmgSharedSubprocesses = [];

// Activity Ordering Modes Definition
window.PMG_ORDER_MODES = {
  flow: {
    id: 'flow',
    label: '🌊 Flux BPMN (Flow)',
    title: 'Parcours séquentiel DAG du flux BPMN depuis les débuts',
    desc: 'Tri par flux d\\'exécution séquentiel (StartEvent &rarr; SequenceFlow)'
  },
  diagram: {
    id: 'diagram',
    label: '📐 Visuel Diagramme (BPMNDI)',
    title: 'Position géométrique réelle (coordonnées X, Y sur le diagramme BPMNDI)',
    desc: 'Tri par disposition visuelle géométrique (de gauche à droite, puis haut en bas)'
  },
  level: {
    id: 'level',
    label: '📊 Hiérarchique (Niveau)',
    title: 'Par niveau de profondeur hiérarchique (Parent > Macro SP > Tâche)',
    desc: 'Tri par niveau hiérarchique de profondeur (Parents L1 &rarr; Macro L2 &rarr; Tâches L3)'
  },
  xml: {
    id: 'xml',
    label: '📄 Document XML',
    title: 'Ordre brut d\\'apparition dans le document XML source',
    desc: 'Tri selon l\\'ordre textuel séquentiel dans le fichier BPMN XML'
  }
};

window.sortPmgActivities = function(acts, mode) {
  const currentMode = mode || window.pmgActivityOrderMode || 'flow';
  if (!acts || acts.length === 0) return [];
  
  const list = [...acts];

  if (currentMode === 'flow') {
    list.sort((a, b) => {
      if (a.rootParentId && b.rootParentId && a.rootParentId !== b.rootParentId) {
        return String(a.rootParentId).localeCompare(String(b.rootParentId));
      }
      const foA = a.flowOrder != null ? a.flowOrder : 9999;
      const foB = b.flowOrder != null ? b.flowOrder : 9999;
      if (foA !== foB) return foA - foB;
      const lA = a.level || 1;
      const lB = b.level || 1;
      if (lA !== lB) return lA - lB;
      return (a.xmlOrder || 0) - (b.xmlOrder || 0);
    });
  } else if (currentMode === 'diagram') {
    list.sort((a, b) => {
      const xA = a.diagramX != null ? a.diagramX : 9999;
      const xB = b.diagramX != null ? b.diagramX : 9999;
      const yA = a.diagramY != null ? a.diagramY : 9999;
      const yB = b.diagramY != null ? b.diagramY : 9999;
      if (Math.abs(xA - xB) > 25) return xA - xB;
      return yA - yB;
    });
  } else if (currentMode === 'level') {
    list.sort((a, b) => {
      const lA = a.level || 1;
      const lB = b.level || 1;
      if (lA !== lB) return lA - lB;
      const foA = a.flowOrder != null ? a.flowOrder : 9999;
      const foB = b.flowOrder != null ? b.flowOrder : 9999;
      if (foA !== foB) return foA - foB;
      return (a.xmlOrder || 0) - (b.xmlOrder || 0);
    });
  } else if (currentMode === 'xml') {
    list.sort((a, b) => (a.xmlOrder || 0) - (b.xmlOrder || 0));
  }

  list.forEach((act, idx) => {
    act.orderIndex = idx + 1;
  });

  return list;
};

window.setPmgActivityOrderMode = function(mode) {
  if (!window.PMG_ORDER_MODES[mode]) return;
  window.pmgActivityOrderMode = mode;

  document.querySelectorAll('.pmg-order-segmented-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById('btnOrder' + mode.charAt(0).toUpperCase() + mode.slice(1));
  if (activeBtn) activeBtn.classList.add('active');

  const descEl = document.getElementById('pmgActiveOrderModeDesc');
  if (descEl) {
    descEl.innerHTML = window.PMG_ORDER_MODES[mode].desc;
  }

  if (window.pmgTempSubprocesses && window.pmgTempSubprocesses.length > 0) {
    window.pmgTempSubprocesses = window.sortPmgActivities(window.pmgTempSubprocesses, mode);
  }
  if (window.pmgActivities && window.pmgActivities.length > 0) {
    window.pmgActivities = window.sortPmgActivities(window.pmgActivities, mode);
  }

  if (window.renderPmgVisualTree) window.renderPmgVisualTree();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();
};

window.openPmgParentProcessModal = function() {
  const modal = document.getElementById('modalPmgParentProcesses');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgParentProcessModalContent();
};

window.closePmgParentProcessModal = function() {
  const modal = document.getElementById('modalPmgParentProcesses');
  if (modal) modal.style.display = 'none';
};

window.renderPmgParentProcessModalContent = function() {
  const modalBody = document.getElementById('pmgParentProcessModalBody');
  if (!modalBody) return;

  const batch = window.pmgBatchResult;
  if (!batch || !batch.processCatalog || batch.processCatalog.size === 0) {
    modalBody.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary);">⚠️ Aucun processus BPMN chargé. Veuillez importer des fichiers BPMN à l\\'étape 1.</div>';
    return;
  }

  const roots = new Set((batch.rootProcesses || []).map(r => r.id));
  const shared = batch.sharedSubprocesses || [];
  const sharedMap = new Map(shared.map(s => [s.processId, s]));

  let rowsHtml = '';
  let parentIndex = 1;

  for (const [procId, proc] of batch.processCatalog.entries()) {
    const isRoot = roots.has(procId);
    const sharedInfo = sharedMap.get(procId);
    const actCount = proc.activities ? proc.activities.length : 0;
    
    let statusBadge = '';
    if (isRoot) {
      statusBadge = \`<span style="background:rgba(99, 102, 241, 0.15); color:#6366f1; border:1px solid rgba(99, 102, 241, 0.3); padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">🌟 Processus Parent (P\${parentIndex++})</span>\`;
    } else if (sharedInfo) {
      statusBadge = \`<span class="pmg-shared-pill">🔗 Sous-processus Partagé (\${sharedInfo.callerCount} appelants : \${escHtml(sharedInfo.sharedParentNames.join(', '))})</span>\`;
    } else {
      const callerNames = (proc.callers || []).map(c => c.callerProcName || c.callerProcId).join(', ') || 'Call Activity';
      statusBadge = \`<span style="background:rgba(59, 130, 246, 0.12); color:var(--brand-primary); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600;">📁 Sous-processus dédié (Appelé par : \${escHtml(callerNames)})</span>\`;
    }

    rowsHtml += \`
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:12px 10px; text-align:center;">
          <input type="checkbox" class="pmg-parent-select-cb" data-proc-id="\${escAttr(procId)}" \${isRoot ? 'checked' : ''} style="transform:scale(1.25); cursor:pointer;">
        </td>
        <td style="padding:12px 10px;">
          <strong style="color:var(--text-primary); font-size:13px;">\${escHtml(proc.name)}</strong>
          <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono); margin-top:2px;">ID: <code>\${escHtml(procId)}</code></div>
        </td>
        <td style="padding:12px 10px; font-size:11.5px; color:var(--text-secondary);">
          📄 \${escHtml(proc.fileName || 'diagramme.bpmn')}
        </td>
        <td style="padding:12px 10px; text-align:center;">
          <span style="font-weight:700; color:var(--ok); font-size:12.5px; background:rgba(16, 185, 129, 0.1); padding:2px 8px; border-radius:10px;">\${actCount}</span>
        </td>
        <td style="padding:12px 10px;">
          \${statusBadge}
        </td>
      </tr>
    \`;
  }

  modalBody.innerHTML = \`
    <div style="margin-bottom:14px; background:rgba(0, 156, 215, 0.05); border:1px solid rgba(0, 156, 215, 0.2); border-radius:6px; padding:12px 16px; font-size:12px; color:var(--text-secondary); line-height:1.5;">
      💡 <strong>Conseil d'Architecture BPMN &amp; Gouvernance :</strong> Cochez les processus qui constituent les <strong>Parents Principaux (P1, P2, P3...)</strong>. Leurs sous-processus et Call Activities seront automatiquement branchés. Les sous-processus appelés par plusieurs parents sont automatiquement détectés comme <strong>Sous-processus Partagés 🔗</strong>.
    </div>

    <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow-x:auto; background:var(--bg-card);">
      <table style="width:100%; font-size:12px; border-collapse:collapse;">
        <thead>
          <tr style="background:var(--bg-card); border-bottom:1px solid var(--border-color); text-align:left;">
            <th style="padding:10px; width:55px; text-align:center;">Parent ?</th>
            <th style="padding:10px;">Nom &amp; ID du Processus</th>
            <th style="padding:10px; width:170px;">Fichier source</th>
            <th style="padding:10px; width:90px; text-align:center;">Activités</th>
            <th style="padding:10px; width:260px;">Statut / Dépendances</th>
          </tr>
        </thead>
        <tbody>
          \${rowsHtml}
        </tbody>
      </table>
    </div>
  \`;
};

window.applyPmgParentProcessSelection = function() {
  const cbs = document.querySelectorAll('.pmg-parent-select-cb:checked');
  const selectedIds = Array.from(cbs).map(cb => cb.getAttribute('data-proc-id')).filter(Boolean);

  if (selectedIds.length === 0) {
    alert("Veuillez sélectionner au moins un processus parent racine.");
    return;
  }

  window.pmgExplicitParents = new Set(selectedIds);

  if (window.pmgCurrentFileEntries) {
    const batchResult = window.parseBpmnBatchForPmg(window.pmgCurrentFileEntries);
    window.populatePmgAllStepsFromBpmnBatch(batchResult);
  }

  window.closePmgParentProcessModal();
  alert(\`✅ Configuration appliquée avec succès : \${selectedIds.length} processus parent(s) racine(s) configuré(s).\`);
};

window.resetPmgParentDetectionToAuto = function() {
  window.pmgExplicitParents = null;
  if (window.pmgCurrentFileEntries) {
    const batchResult = window.parseBpmnBatchForPmg(window.pmgCurrentFileEntries);
    window.populatePmgAllStepsFromBpmnBatch(batchResult);
  }
  window.renderPmgParentProcessModalContent();
};

window.toggleAllPmgProcessesAsParents = function(selectAll) {
  document.querySelectorAll('.pmg-parent-select-cb').forEach(cb => {
    cb.checked = selectAll;
  });
};

window.renderPmgParentFilterBar = function() {
  const container = document.getElementById('pmgParentChipsList');
  const badge = document.getElementById('pmgParentCountBadge');
  if (!container) return;

  const batch = window.pmgBatchResult;
  if (!batch || !batch.rootProcesses || batch.rootProcesses.length === 0) {
    container.innerHTML = '<span style="color: var(--text-tertiary); font-size: 11.5px;">Chargez des fichiers BPMN pour voir les filtres par processus parent...</span>';
    if (badge) badge.textContent = 'En attente de BPMN';
    return;
  }

  const roots = batch.rootProcesses;
  const shared = batch.sharedSubprocesses || [];
  const allActs = window.pmgTempSubprocesses || window.pmgActivities || [];
  
  if (badge) {
    const pLabel = roots.map((r, i) => \`P\${i + 1}\`).join(', ');
    badge.textContent = \`\${roots.length} Parent\${roots.length > 1 ? 's' : ''} (\${pLabel}) • \${shared.length} partagé\${shared.length > 1 ? 's' : ''}\`;
  }

  const currentFilter = window.pmgParentFilter || 'all';

  let html = \`
    <button class="pmg-filter-chip \${currentFilter === 'all' ? 'active' : ''}" onclick="setPmgParentFilter('all')">
      🌐 Tous les Processus Parents (\${allActs.length})
    </button>
  \`;

  roots.forEach((root, idx) => {
    const rootActs = allActs.filter(a => a.rootParentId === root.id);
    const isAct = currentFilter === root.id;
    html += \`
      <button class="pmg-filter-chip \${isAct ? 'active' : ''}" onclick="setPmgParentFilter('\${escAttr(root.id)}')">
        🏛️ P\${idx + 1}: \${escHtml(root.name)} (\${rootActs.length})
      </button>
    \`;
  });

  if (shared.length > 0) {
    const sharedActs = allActs.filter(a => a.isSharedSubprocess);
    const isAct = currentFilter === 'shared_only';
    html += \`
      <button class="pmg-filter-chip \${isAct ? 'active' : ''}" style="\${isAct ? '' : 'color:#db2777; border-color:rgba(236, 72, 153, 0.4);'}" onclick="setPmgParentFilter('shared_only')">
        🔗 Sous-processus Partagés (\${sharedActs.length})
      </button>
    \`;
  }

  container.innerHTML = html;
};

window.setPmgParentFilter = function(filterVal) {
  window.pmgParentFilter = filterVal;
  window.renderPmgParentFilterBar();
  if (window.renderPmgVisualTree) window.renderPmgVisualTree();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
};`;

code = code.replace(oldGlobalVars, newGlobalVars);

// 2. Replace renderPmgVisualTree
const oldTreeStart = "window.renderPmgVisualTree = function(activities) {";
const oldTreeEnd = "window.validatePmgStep2Activities = function() {";

const newVisualTree = `window.renderPmgVisualTree = function(activities) {
  const container = document.getElementById('pmgVisualTreeContainer');
  const treeBox = document.getElementById('pmgVisualTreeBox');
  if (!container || !treeBox) return;

  let allActs = activities || window.pmgTempSubprocesses || window.pmgActivities || [];
  if (!allActs || allActs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Render bars
  if (window.renderPmgTypeFilterBar) window.renderPmgTypeFilterBar();
  if (window.renderPmgParentFilterBar) window.renderPmgParentFilterBar();

  // Sort activities based on active order mode
  allActs = window.sortPmgActivities(allActs, window.pmgActivityOrderMode);

  // Filter according to parent process selection
  const parentFilter = window.pmgParentFilter || 'all';
  let filteredByParentActs = allActs;
  if (parentFilter === 'shared_only') {
    filteredByParentActs = allActs.filter(a => a.isSharedSubprocess);
  } else if (parentFilter !== 'all') {
    filteredByParentActs = allActs.filter(a => a.rootParentId === parentFilter || a.parentProcessId === parentFilter);
  }

  // Build node lookup map
  const nodeMap = new Map();
  filteredByParentActs.forEach(act => {
    const isVisible = window.isPmgTypeVisible ? window.isPmgTypeVisible(act.type || act.typeLabel) : true;
    const key = act.uniqueId || act.id || act.name;
    const nodeObj = { ...act, isVisible, children: [] };
    nodeMap.set(key, nodeObj);
  });

  const roots = [];
  filteredByParentActs.forEach(act => {
    const key = act.uniqueId || act.id || act.name;
    const node = nodeMap.get(key);
    if (!node) return;

    if (act.parentId) {
      let parentNode = nodeMap.get(act.parentId);
      if (!parentNode) {
        for (const [k, n] of nodeMap.entries()) {
          if (n.uniqueId === act.parentId || n.id === act.parentId) {
            parentNode = n;
            break;
          }
        }
      }
      if (!parentNode) {
        for (const [k, n] of nodeMap.entries()) {
          if (n.name && act.parentId && n.name.toLowerCase() === act.parentId.toLowerCase()) {
            parentNode = n;
            break;
          }
        }
      }

      if (parentNode && parentNode !== node) {
        if (!parentNode.children.includes(node)) {
          parentNode.children.push(node);
        }
      } else {
        if (!roots.includes(node)) roots.push(node);
      }
    } else {
      if (!roots.includes(node)) roots.push(node);
    }
  });

  function hasVisibleDescendant(node) {
    if (node.isVisible) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some(hasVisibleDescendant);
    }
    return false;
  }

  const levelColors = [
    '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6',
    '#ec4899', '#ef4444', '#10b981', '#6366f1'
  ];

  const buildTreeHTML = (nodes) => {
    const filteredNodes = nodes.filter(hasVisibleDescendant);
    if (filteredNodes.length === 0) return '';

    let html = '<ul class="pmg-tree-ul" style="list-style:none; padding-left:16px; margin:0;">';
    filteredNodes.forEach(node => {
      const visibleChildren = (node.children || []).filter(hasVisibleDescendant);
      const hasChildren = visibleChildren.length > 0;
      const isCallAct = (node.type || '').toLowerCase().includes('call');
      const isSub = (node.type || '').toLowerCase().includes('sous-processus') || isCallAct;
      const lvlColor = levelColors[((node.level || 1) - 1) % levelColors.length];
      
      const typeKey = window.getPmgTypeKey(node.type || node.typeLabel);
      const meta = PMG_TYPE_META[typeKey] || { icon: '📄', color: '#64748b' };
      const icon = isSub ? '📁' : meta.icon;
      const safeId = node.uniqueId || node.id || node.name || '';

      const nodeOpacity = node.isVisible ? '1' : '0.55';
      const nodeBorder = node.isVisible ? 'var(--border-color)' : '1px dashed rgba(148, 163, 184, 0.45)';

      // Call Activity calledElement badge
      let calledElementBadge = '';
      if (isCallAct && node.calledElement) {
        if (node.targetMissing) {
          calledElementBadge = \`<span style="background:rgba(239, 68, 68, 0.12); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(239, 68, 68, 0.3);" title="Sous-processus introuvable dans le lot importé">⚠️ Cible: \${escHtml(node.calledElement)} (Non trouvé)</span>\`;
        } else {
          calledElementBadge = \`<span style="background:rgba(59, 130, 246, 0.12); color:var(--brand-primary); padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(59, 130, 246, 0.25);" title="Process ID appelé (calledElement)">🎯 Appelle: \${escHtml(node.calledElement)}</span>\`;
        }
      }

      // Parent Process Name Badge (ALWAYS DISPLAYED)
      const parentName = node.parentProcessName || node.rootParentName || 'Processus Racine';
      const parentBadge = \`<span class="pmg-parent-badge" title="Processus Parent Référent">🏛️ \${escHtml(parentName)}</span>\`;

      // Shared Subprocess Indicator Badge
      let sharedBadge = '';
      if (node.isSharedSubprocess) {
        const sharedParents = node.sharedParentNames && node.sharedParentNames.length > 0 ? node.sharedParentNames.join(', ') : 'Plusieurs parents';
        sharedBadge = \`<span class="pmg-shared-pill" title="Sous-processus transversal partagé par : \${escHtml(sharedParents)}">🔗 Partagé (\${(node.sharedParentNames || []).length} parents : \${escHtml(sharedParents)})</span>\`;
      }

      // Order Index Pill
      const orderPill = \`<span class="pmg-order-pill" title="Position d\\'ordonnancement \${window.pmgActivityOrderMode} : #\${node.orderIndex || 1}">#\${node.orderIndex || 1}</span>\`;

      html += \`
        <li class="pmg-tree-node" data-name="\${escAttr((node.name || '').toLowerCase())}" data-id="\${escAttr(safeId)}" data-type="\${escAttr(typeKey)}" style="margin:6px 0; opacity:\${nodeOpacity};">
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:6px 10px; border-radius:6px; border:1px solid \${nodeBorder}; flex-wrap:wrap;">
            \${hasChildren ? \`<button class="tree-toggle-btn" onclick="togglePmgTreeNode(this)" style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:bold; font-size:12px; padding:0 4px;">▼</button>\` : \`<span style="width:14px; display:inline-block;"></span>\`}
            \${orderPill}
            <span style="font-size:14px;">\${icon}</span>
            <span style="font-weight:600; color:var(--text-primary); font-size:12px;">\${escHtml(node.name)}</span>
            <span style="background:\${isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color:\${isSub ? 'var(--brand-primary)' : 'var(--ok)'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">\${escHtml(node.typeLabel || node.type)}</span>
            \${parentBadge}
            \${sharedBadge}
            \${calledElementBadge}
            <span style="background:rgba(255,255,255,0.05); color:\${lvlColor}; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid \${lvlColor}44; margin-left:auto;">Niveau \${node.level || 1}</span>
            
            <!-- Quick Action Buttons -->
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--brand-primary); border:1px solid var(--border-color);" data-act-id="\${escAttr(safeId)}" onclick="openPmgEditTreeNodeModalFromEl(this)" title="Éditer / Réorganiser">✏️ Éditer</button>
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--ok); border:1px solid var(--border-color);" data-act-id="\${escAttr(safeId)}" onclick="addNewPmgSubactivityFromEl(this)" title="Ajouter une sous-activité enfant">➕ Enfant</button>
          </div>
          \${hasChildren ? buildTreeHTML(visibleChildren) : ''}
        </li>
      \`;
    });
    html += '</ul>';
    return html;
  };

  const finalHtml = buildTreeHTML(roots);
  if (!finalHtml) {
    treeBox.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12px;">⚠️ Aucun composant ne correspond aux filtres de processus ou types sélectionnés.</div>';
  } else {
    treeBox.innerHTML = finalHtml;
  }
};

window.togglePmgTreeNode = function(btn) {
  const li = btn.closest('li');
  const ul = li.querySelector('ul');
  if (ul) {
    if (ul.style.display === 'none') {
      ul.style.display = 'block';
      btn.textContent = '▼';
    } else {
      ul.style.display = 'none';
      btn.textContent = '▶';
    }
  }
};

window.expandAllPmgTree = function() {
  document.querySelectorAll('#pmgVisualTreeBox ul').forEach(ul => ul.style.display = 'block');
  document.querySelectorAll('#pmgVisualTreeBox .tree-toggle-btn').forEach(btn => btn.textContent = '▼');
};

window.collapseAllPmgTree = function() {
  document.querySelectorAll('#pmgVisualTreeBox ul').forEach((ul, i) => {
    if (i > 0) ul.style.display = 'none';
  });
  document.querySelectorAll('#pmgVisualTreeBox .tree-toggle-btn').forEach(btn => btn.textContent = '▶');
};

window.filterPmgVisualTree = function() {
  const query = (document.getElementById('pmgTreeSearchInput')?.value || '').toLowerCase();
  document.querySelectorAll('#pmgVisualTreeBox li.pmg-tree-node').forEach(li => {
    const name = li.getAttribute('data-name') || '';
    if (!query || name.includes(query)) {
      li.style.display = 'block';
    } else {
      li.style.display = 'none';
    }
  });
};

`;

const startIdxTree = code.indexOf(oldTreeStart);
const endIdxTree = code.indexOf(oldTreeEnd);
if (startIdxTree !== -1 && endIdxTree !== -1) {
  code = code.substring(0, startIdxTree) + newVisualTree + code.substring(endIdxTree);
  console.log('Tree view successfully replaced!');
} else {
  console.error('Could not find tree view markers');
}

// 3. Replace parseBpmnBatchForPmg & populatePmgAllStepsFromBpmnBatch
const oldBatchStart = "window.handlePmgOneShotBpmnFiles = function(files) {";
const oldBatchEnd = "window.renderAllPmgStepKpis = function() {";

const newBatchEngine = `window.handlePmgOneShotBpmnFiles = function(files) {
  if (!files || files.length === 0) return;

  const fileList = Array.from(files);
  const validFiles = fileList.filter(f => {
    if (window.validateFileSize && !window.validateFileSize(f)) return false;
    const n = f.name.toLowerCase();
    return n.endsWith('.bpmn') || n.endsWith('.xml');
  });

  if (validFiles.length === 0) {
    alert("Veuillez importer des fichiers BPMN valides (.bpmn ou .xml).");
    return;
  }

  const uploadTitle = document.getElementById('uploadTitlePmgOneShot');
  const uploadSub = document.getElementById('uploadSubPmgOneShot');
  if (uploadTitle) uploadTitle.textContent = \`Chargement & Analyse de \${validFiles.length} fichier(s) BPMN...\`;
  if (uploadSub) uploadSub.textContent = \`Traitement des dépendances et extraction multi-processus en cours...\`;

  const filePromises = validFiles.map(file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve({ fileName: file.name, content: e.target.result });
      reader.onerror = err => reject(err);
      reader.readAsText(file);
    });
  });

  Promise.all(filePromises)
    .then(fileEntries => {
      window.pmgCurrentFileEntries = fileEntries;
      const batchResult = window.parseBpmnBatchForPmg(fileEntries);
      window.populatePmgAllStepsFromBpmnBatch(batchResult);
      if (uploadTitle) uploadTitle.textContent = \`✅ \${validFiles.length} fichier(s) BPMN importé(s) avec succès !\`;
      const rootNames = batchResult.rootProcesses.map((r, i) => \`P\${i + 1}: \${r.name}\`).join(', ');
      if (uploadSub) uploadSub.textContent = \`\${batchResult.rootProcesses.length} processus parent(s) racine(s) (\${rootNames}) — \${batchResult.structuredActivities.length} activités extraites\`;
    })
    .catch(err => {
      console.error("Erreur lors de l'import BPMN One-Shot :", err);
      alert("Erreur lors de l'analyse des fichiers BPMN : " + (err.message || err));
      if (uploadTitle) uploadTitle.textContent = "Glissez-déposez ici vos fichiers BPMN (Parent + Sous-processus)";
    });
};

window.parseBpmnBatchForPmg = function(fileEntries) {
  const parser = new DOMParser();
  const processCatalog = new Map(); // processId -> ProcessData
  const allCalledElements = new Set();
  const callersMap = new Map(); // calledElementId -> Array of { callerProcId, callerProcName, callActId, callActName, fileName }
  const parsedFiles = [];

  const TYPE_LABELS = {
    'usertask': 'User Task',
    'servicetask': 'Service Task',
    'manualtask': 'Manual Task',
    'scripttask': 'Script Task',
    'sendtask': 'Send Task',
    'receivetask': 'Receive Task',
    'businessruletask': 'Business Rule Task',
    'task': 'Task (Générique)',
    'callactivity': 'Call Activity',
    'subprocess': 'Sous-processus'
  };

  fileEntries.forEach(entry => {
    try {
      const xmlDoc = parser.parseFromString(entry.content, "application/xml");
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.warn(\`Erreur de parsing XML dans \${entry.fileName}:\`, parserError.textContent);
        return;
      }

      parsedFiles.push(entry.fileName);

      // Extract BPMNDI Coordinates (X, Y, Width, Height)
      const shapeMap = new Map();
      const shapes = xmlDoc.querySelectorAll('BPMNShape, bpmndi\\\\:BPMNShape');
      shapes.forEach(sh => {
        const bpmnEl = sh.getAttribute('bpmnElement');
        if (!bpmnEl) return;
        const bounds = sh.querySelector('Bounds, dc\\\\:Bounds, bpmndi\\\\:Bounds');
        if (bounds) {
          const x = parseFloat(bounds.getAttribute('x')) || 0;
          const y = parseFloat(bounds.getAttribute('y')) || 0;
          const w = parseFloat(bounds.getAttribute('width')) || 0;
          const h = parseFloat(bounds.getAttribute('height')) || 0;
          shapeMap.set(bpmnEl, { x, y, width: w, height: h });
        }
      });

      // 1. Participant / Pool mapping
      const processIdToPool = new Map();
      const participants = xmlDoc.querySelectorAll('participant, bpmn\\\\:participant');
      participants.forEach(p => {
        const procRef = p.getAttribute('processRef');
        const partName = p.getAttribute('name') || p.getAttribute('id') || '';
        if (procRef && partName) processIdToPool.set(procRef, partName);
      });

      // 2. Extract each Process in this XML
      const processes = xmlDoc.querySelectorAll('process, bpmn\\\\:process');
      processes.forEach(procEl => {
        const procId = procEl.getAttribute('id') || \`Process_\${Math.random().toString(36).substr(2, 5)}\`;
        const procName = procEl.getAttribute('name') || entry.fileName.replace(/\\.(bpmn|xml)$/i, '') || procId;
        const isExecutable = procEl.getAttribute('isExecutable') || 'false';
        
        const procDocEl = procEl.querySelector(':scope > documentation, :scope > bpmn\\\\:documentation');
        const procDoc = procDocEl ? procDocEl.textContent.trim() : '';

        const defs = xmlDoc.documentElement;
        const exporter = defs.getAttribute('exporter') || 'Camunda Modeler';
        const exporterVersion = defs.getAttribute('exporterVersion') || '5.x';

        // 3. Lane Mapping
        const nodeToLane = new Map();
        const lanes = procEl.querySelectorAll('lane, bpmn\\\\:lane');
        lanes.forEach(lane => {
          const laneName = lane.getAttribute('name') || lane.getAttribute('id') || '';
          const refs = lane.querySelectorAll('flowNodeRef, bpmn\\\\:flowNodeRef');
          refs.forEach(ref => {
            const refId = ref.textContent.trim();
            if (refId) nodeToLane.set(refId, laneName);
          });
        });

        // 4. Gateways & Sequence flows mapping
        const gatewayNames = new Map();
        const gateways = procEl.querySelectorAll('exclusiveGateway, bpmn\\\\:exclusiveGateway, inclusiveGateway, bpmn\\\\:inclusiveGateway, complexGateway, bpmn\\\\:complexGateway, eventBasedGateway, bpmn\\\\:eventBasedGateway');
        gateways.forEach(gw => {
          const gwId = gw.getAttribute('id');
          const gwName = gw.getAttribute('name') || '';
          if (gwId) gatewayNames.set(gwId, gwName);
        });

        const targetToCondition = new Map();
        const seqFlows = procEl.querySelectorAll('sequenceFlow, bpmn\\\\:sequenceFlow');
        const flowAdj = new Map();
        const incomingCount = new Map();

        seqFlows.forEach(sf => {
          const targetRef = sf.getAttribute('targetRef');
          const sourceRef = sf.getAttribute('sourceRef');
          const sfName = (sf.getAttribute('name') || '').trim();
          const condEl = sf.querySelector('conditionExpression, bpmn\\\\:conditionExpression');
          let condText = condEl ? condEl.textContent.trim() : '';

          let composedCond = '';
          const gwLabel = sourceRef ? (gatewayNames.get(sourceRef) || '') : '';

          if (gwLabel && sfName) {
            composedCond = \`Si [\${gwLabel}] = "\${sfName}"\`;
            if (condText && condText !== sfName) composedCond += \` (\${condText})\`;
          } else if (gwLabel && condText) {
            composedCond = \`Si [\${gwLabel}] (\${condText})\`;
          } else if (sfName && condText && sfName !== condText) {
            composedCond = \`Si "\${sfName}" (\${condText})\`;
          } else if (sfName) {
            composedCond = \`Si "\${sfName}"\`;
          } else if (condText) {
            composedCond = \`Si \${condText}\`;
          }

          if (targetRef && composedCond) {
            targetToCondition.set(targetRef, composedCond);
          }

          if (sourceRef && targetRef) {
            if (!flowAdj.has(sourceRef)) flowAdj.set(sourceRef, []);
            flowAdj.get(sourceRef).push(targetRef);
            incomingCount.set(targetRef, (incomingCount.get(targetRef) || 0) + 1);
          }
        });

        // Compute Execution Flow Topological Order (BFS from startEvents)
        const startEvents = [];
        const startNodes = procEl.querySelectorAll('startEvent, bpmn\\\\:startEvent');
        startNodes.forEach(sn => {
          const sId = sn.getAttribute('id');
          if (sId) startEvents.push(sId);
        });

        const flowRank = new Map();
        const visitedFlow = new Set();
        let currentRank = 1;
        const queue = startEvents.length > 0 ? [...startEvents] : [];

        while (queue.length > 0) {
          const currId = queue.shift();
          if (visitedFlow.has(currId)) continue;
          visitedFlow.add(currId);
          flowRank.set(currId, currentRank++);
          const targets = flowAdj.get(currId) || [];
          targets.forEach(tgt => {
            if (!visitedFlow.has(tgt)) {
              queue.push(tgt);
            }
          });
        }

        // 5. Extract Tasks & Activities with deep metadata
        const activities = [];
        const callActivities = [];
        const poolName = processIdToPool.get(procId) || '';

        const allNodes = procEl.getElementsByTagName('*');
        let xmlOrderCounter = 1;

        for (let i = 0; i < allNodes.length; i++) {
          const el = allNodes[i];
          
          if (el.prefix === 'zeebe' || el.prefix === 'camunda' || el.prefix === 'modeler') continue;
          let isExt = false;
          let pNode = el.parentElement;
          while (pNode && pNode !== procEl && pNode.nodeType === 1) {
            const pLn = (pNode.localName || '').toLowerCase();
            if (pLn === 'extensionelements' || pLn === 'extension_elements') {
              isExt = true;
              break;
            }
            pNode = pNode.parentElement;
          }
          if (isExt) continue;

          const localName = (el.localName || '').toLowerCase();

          if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity', 'subprocess'].includes(localName)) {
            const actId = el.getAttribute('id') || \`act_\${activities.length + 1}\`;
            const actName = el.getAttribute('name') || actId;

            const laneName = nodeToLane.get(actId) || '';
            let entity = '';
            if (poolName && laneName) {
              entity = \`\${poolName} (Lane: \${laneName})\`;
            } else if (laneName) {
              entity = \`Lane: \${laneName}\`;
            } else if (poolName) {
              entity = poolName;
            } else {
              entity = '';
            }

            let userGroup = '';
            let userGroupWarning = false;

            if (localName === 'usertask') {
              userGroup = el.getAttribute('camunda:candidateGroups') || el.getAttribute('candidateGroups') || '';
              if (!userGroup) {
                const assignDef = el.querySelector('assignmentDefinition, zeebe\\\\:assignmentDefinition');
                if (assignDef) {
                  userGroup = assignDef.getAttribute('candidateGroups') || assignDef.getAttribute('candidateUsers') || '';
                }
              }
              if (!userGroup) {
                userGroup = el.getAttribute('camunda:candidateUsers') || el.getAttribute('candidateUsers') || '';
              }
              if (!userGroup) {
                const assignee = el.getAttribute('camunda:assignee') || el.getAttribute('assignee') || '';
                if (assignee) userGroup = \`Assigné: \${assignee}\`;
              }
              if (!userGroup) {
                userGroupWarning = true;
              }
            }

            let realizationMode = 'Manuelle';
            if (localName === 'callactivity' || localName === 'subprocess') {
              realizationMode = 'Call Activity';
            } else if (['servicetask', 'scripttask', 'businessruletask', 'sendtask'].includes(localName)) {
              realizationMode = 'Automatique';
            } else if (localName === 'usertask') {
              realizationMode = 'SP0';
            }

            const applicableCase = targetToCondition.get(actId) || '';
            const taskDocEl = el.querySelector(':scope > documentation, :scope > bpmn\\\\:documentation');
            const comment = taskDocEl ? taskDocEl.textContent.trim() : '';
            const { inputs, outputs } = extractIoForNode(el);

            let calledElement = '';
            if (localName === 'callactivity') {
              calledElement = el.getAttribute('calledElement') || '';
              const zeebeCalled = el.querySelector('calledElement, zeebe\\\\:calledElement');
              if (zeebeCalled && !calledElement) {
                calledElement = zeebeCalled.getAttribute('processId') || '';
              }
              if (calledElement) {
                allCalledElements.add(calledElement);
                if (!callersMap.has(calledElement)) {
                  callersMap.set(calledElement, []);
                }
                callersMap.get(calledElement).push({
                  callerProcId: procId,
                  callerProcName: procName,
                  callActId: actId,
                  callActName: actName,
                  fileName: entry.fileName
                });
                callActivities.push({ actId, actName, calledElement });
              }
            }

            let embeddedParentId = '';
            let parentEl = el.parentElement;
            while (parentEl && parentEl !== procEl) {
              const pName = (parentEl.localName || '').toLowerCase();
              if (pName === 'subprocess' || pName === 'sub-process') {
                embeddedParentId = parentEl.getAttribute('id') || '';
                break;
              }
              parentEl = parentEl.parentElement;
            }

            const bounds = shapeMap.get(actId) || { x: 0, y: 0, width: 0, height: 0 };
            const nodeFlowRank = flowRank.get(actId) != null ? flowRank.get(actId) : (currentRank + xmlOrderCounter);

            activities.push({
              id: actId,
              name: actName,
              type: localName,
              typeLabel: TYPE_LABELS[localName] || localName,
              entity,
              userGroup,
              userGroupWarning,
              inputs,
              outputs,
              realizationMode,
              applicableCase,
              comment,
              calledElement,
              embeddedParentId,
              processId: procId,
              fileName: entry.fileName,
              xmlOrder: xmlOrderCounter++,
              flowOrder: nodeFlowRank,
              diagramX: bounds.x,
              diagramY: bounds.y,
              diagramWidth: bounds.width,
              diagramHeight: bounds.height
            });
          }
        }

        processCatalog.set(procId, {
          id: procId,
          name: procName,
          fileName: entry.fileName,
          isExecutable,
          exporter,
          exporterVersion,
          description: procDoc,
          activities,
          callActivities,
          poolName
        });
      });
    } catch (e) {
      console.error(\`Erreur d'analyse BPMN pour \${entry.fileName}:\`, e);
    }
  });

  if (processCatalog.size === 0) {
    throw new Error("Aucun processus BPMN valide trouvé dans les fichiers importés.");
  }

  // 6. Identify Root (Parent) Processes (P1, P2, P3...)
  let detectedRoots = [];
  for (const [procId, procData] of processCatalog.entries()) {
    if (!allCalledElements.has(procId)) {
      detectedRoots.push(procData);
    }
  }
  if (detectedRoots.length === 0) {
    detectedRoots = Array.from(processCatalog.values());
  }

  // Support explicit user selection of parents
  let effectiveRoots = detectedRoots;
  if (window.pmgExplicitParents && window.pmgExplicitParents.size > 0) {
    const chosen = [];
    window.pmgExplicitParents.forEach(pId => {
      if (processCatalog.has(pId)) chosen.push(processCatalog.get(pId));
    });
    if (chosen.length > 0) effectiveRoots = chosen;
  }

  // 7. Detect Shared Subprocesses (called by >=2 callers or multiple parents)
  const sharedSubprocessesList = [];
  for (const [procId, procData] of processCatalog.entries()) {
    const callers = callersMap.get(procId) || [];
    const distinctCallerProcIds = new Set(callers.map(c => c.callerProcId));
    if (callers.length >= 2 || distinctCallerProcIds.size >= 2) {
      procData.isShared = true;
      procData.callers = callers;
      procData.sharedParentNames = Array.from(new Set(callers.map(c => c.callerProcName || c.callerProcId)));
      sharedSubprocessesList.push({
        processId: procId,
        processName: procData.name,
        callerCount: callers.length,
        distinctParentCount: distinctCallerProcIds.size,
        callers: callers,
        sharedParentNames: procData.sharedParentNames
      });
    } else {
      procData.isShared = false;
      procData.callers = callers;
      procData.sharedParentNames = callers.map(c => c.callerProcName || c.callerProcId);
    }
  }

  // 8. Recursive Tree Construction across ALL Effective Root Parents
  const structuredActivities = [];
  const resolvedSubprocesses = new Set();
  const missingSubprocesses = [];

  effectiveRoots.forEach(rootProc => {
    function traverseProcess(procId, currentLevel, parentNodeId, branchPath, rootParent) {
      const proc = processCatalog.get(procId);
      if (!proc) {
        missingSubprocesses.push({ calledElement: procId, calledBy: parentNodeId });
        return;
      }

      resolvedSubprocesses.add(procId);

      proc.activities.forEach(act => {
        const uniqueHierarchicalId = \`\${rootParent.id}_\${procId}_\${act.id}\`;
        const effectiveParentId = act.embeddedParentId 
          ? \`\${rootParent.id}_\${procId}_\${act.embeddedParentId}\` 
          : (parentNodeId || (currentLevel > 1 ? parentNodeId : ''));
        const effectiveLevel = act.embeddedParentId ? currentLevel + 1 : currentLevel;

        let isMissingTarget = false;
        if (act.type === 'callactivity' && act.calledElement) {
          if (!processCatalog.has(act.calledElement)) {
            isMissingTarget = true;
            missingSubprocesses.push({ calledElement: act.calledElement, calledBy: act.name });
          }
        }

        const isProcShared = !!proc.isShared;
        const sharedParentNames = proc.sharedParentNames || (rootParent.name ? [rootParent.name] : []);

        const activityRecord = {
          ...act,
          id: act.id,
          uniqueId: uniqueHierarchicalId,
          parentId: effectiveParentId,
          level: effectiveLevel,
          rootParentId: rootParent.id,
          rootParentName: rootParent.name,
          parentProcessId: procId,
          parentProcessName: proc.name,
          targetMissing: isMissingTarget,
          isSharedSubprocess: isProcShared,
          sharedParentNames: sharedParentNames,
          callers: proc.callers || [],
          xmlOrder: act.xmlOrder,
          flowOrder: act.flowOrder,
          diagramX: act.diagramX,
          diagramY: act.diagramY
        };

        structuredActivities.push(activityRecord);

        if (act.type === 'callactivity' && act.calledElement) {
          const childProcId = act.calledElement;
          const nextBranch = branchPath + '->' + childProcId;
          if (!branchPath.includes(childProcId) && processCatalog.has(childProcId)) {
            traverseProcess(childProcId, currentLevel + 1, uniqueHierarchicalId, nextBranch, rootParent);
          }
        }
      });
    }

    traverseProcess(rootProc.id, 1, '', rootProc.id, rootProc);
  });

  // Append any unresolved unlinked process at level 1
  for (const [procId, procData] of processCatalog.entries()) {
    if (!resolvedSubprocesses.has(procId) && !effectiveRoots.some(r => r.id === procId)) {
      procData.activities.forEach(act => {
        structuredActivities.push({
          ...act,
          id: act.id,
          uniqueId: \`orphan_\${procId}_\${act.id}\`,
          parentId: '',
          level: 1,
          rootParentId: procId,
          rootParentName: procData.name,
          parentProcessId: procId,
          parentProcessName: procData.name,
          targetMissing: false,
          isSharedSubprocess: false,
          sharedParentNames: [procData.name],
          callers: [],
          xmlOrder: act.xmlOrder,
          flowOrder: act.flowOrder,
          diagramX: act.diagramX,
          diagramY: act.diagramY
        });
      });
    }
  }

  return {
    rootProcess: effectiveRoots[0] || null,
    rootProcesses: effectiveRoots,
    allDetectedRoots: detectedRoots,
    processCatalog,
    structuredActivities,
    sharedSubprocesses: sharedSubprocessesList,
    resolvedSubprocesses: Array.from(resolvedSubprocesses),
    missingSubprocesses,
    parsedFilesCount: parsedFiles.length,
    parsedFileNames: parsedFiles
  };
};

window.populatePmgAllStepsFromBpmnBatch = function(batchResult) {
  window.pmgBatchResult = batchResult;
  window.pmgRootProcesses = batchResult.rootProcesses || [batchResult.rootProcess];
  window.pmgSharedSubprocesses = batchResult.sharedSubprocesses || [];

  const root = batchResult.rootProcess || (batchResult.rootProcesses && batchResult.rootProcesses[0]) || {};
  let activities = batchResult.structuredActivities || [];

  // Sort activities by active ordering mode
  activities = window.sortPmgActivities(activities, window.pmgActivityOrderMode);

  window.pmgTempSubprocesses = activities;
  window.pmgActivities = activities.map(a => ({
    id: a.id,
    uniqueId: a.uniqueId,
    name: a.name,
    type: a.type,
    typeLabel: a.typeLabel,
    entity: a.entity,
    userGroup: a.userGroup,
    userGroupWarning: a.userGroupWarning,
    inputs: a.inputs,
    outputs: a.outputs,
    realizationMode: a.realizationMode,
    applicableCase: a.applicableCase,
    comment: a.comment,
    calledElement: a.calledElement,
    targetMissing: a.targetMissing,
    parentId: a.parentId,
    level: a.level,
    rootParentId: a.rootParentId,
    rootParentName: a.rootParentName,
    parentProcessId: a.parentProcessId,
    parentProcessName: a.parentProcessName,
    isSharedSubprocess: a.isSharedSubprocess,
    sharedParentNames: a.sharedParentNames,
    callers: a.callers,
    flowOrder: a.flowOrder,
    diagramX: a.diagramX,
    diagramY: a.diagramY,
    xmlOrder: a.xmlOrder,
    orderIndex: a.orderIndex
  }));

  const parentNamesTitle = batchResult.rootProcesses.length > 1
    ? batchResult.rootProcesses.map((r, i) => \`P\${i + 1}: \${r.name}\`).join(' & ')
    : (root.name || '');

  window.pmgProcessDetails = {
    id: root.id || '',
    name: parentNamesTitle || 'Processus Multi-Parents',
    owner: '',
    exporter: root.exporter ? \`\${root.exporter} \${root.exporterVersion || ''}\`.trim() : '',
    version: root.isExecutable === 'true' ? 'v1.0.0' : '',
    badges: batchResult.rootProcesses.length > 1 ? \`Multi-Parents (\${batchResult.rootProcesses.length})\` : 'CDD / CPE / SGP / SP0',
    defaultFille: '',
    desc: root.description || \`Cartographie multi-processus (\${batchResult.rootProcesses.length} parents, \${batchResult.structuredActivities.length} activités).\`
  };

  if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = window.pmgProcessDetails.name;
  if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = window.pmgProcessDetails.id;
  if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = window.pmgProcessDetails.owner;
  if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = window.pmgProcessDetails.exporter;
  if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = window.pmgProcessDetails.version;
  if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = window.pmgProcessDetails.badges;
  if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = window.pmgProcessDetails.defaultFille;
  if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = window.pmgProcessDetails.desc;
  window.syncPmgStep1Metadata();

  if (window.renderPmgParentFilterBar) window.renderPmgParentFilterBar();
  if (window.renderPmgVisualTree) window.renderPmgVisualTree(activities);
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgDataLineageAudit) window.renderPmgDataLineageAudit();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();

  for (let s = 1; s <= 5; s++) {
    const node = document.getElementById('step-node-' + s);
    if (node) {
      node.classList.remove('disabled');
      if (s === 1) node.className = 'step-node active';
      else node.className = 'step-node completed';
    }
  }

  const btnNext1 = document.getElementById('btnPmgStep1Next');
  if (btnNext1) btnNext1.disabled = false;

  window.renderAllPmgStepKpis();
  window.renderPmgBatchSummary(batchResult);
  window.savePmgStateToLocalStorage();
};

`;

const startIdxBatch = code.indexOf(oldBatchStart);
const endIdxBatch = code.indexOf(oldBatchEnd);
if (startIdxBatch !== -1 && endIdxBatch !== -1) {
  code = code.substring(0, startIdxBatch) + newBatchEngine + code.substring(endIdxBatch);
  console.log('Batch engine successfully replaced!');
} else {
  console.error('Could not find batch engine markers');
}

// 4. Update loadPmgDemoBpmnSuite to include Multi-Parents (P1 & P2) and Shared Subprocesses (Paiement & Livraison)
const oldDemoStart = "window.loadPmgDemoBpmnSuite = function() {";
const oldDemoEnd = "let pmgListenersRegistered = false;";

const newDemoSuite = `window.loadPmgDemoBpmnSuite = function() {
  const parent1Bpmn = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Def_Orchestration" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.14.0">
  <bpmn:collaboration id="Collaboration_Parent1">
    <bpmn:participant id="Participant_Commerce" name="Direction Commerciale &amp; Ventes" processRef="Process_Orchestration_Commande" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Orchestration_Commande" name="P1 : Orchestration Traitement Commande Client" isExecutable="true">
    <bpmn:documentation>Processus parent principal d'orchestration pour le traitement et la livraison des commandes clients.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_Adv" name="Administration des Ventes (ADV)">
        <bpmn:flowNodeRef>Start_Commande</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Qualifier_Commande</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Validation_Risque</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Supervision" name="Supervision &amp; Finance">
        <bpmn:flowNodeRef>Call_Paiement_Facturation</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Expedition_Logistique</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_Commande</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_Commande" name="Commande reçue" />
    <bpmn:userTask id="Task_Qualifier_Commande" name="Qualifier et vérifier le panier client" camunda:candidateGroups="Gestionnaires_ADV">
      <bpmn:documentation>Vérification de l'éligibilité du client et des offres sélectionnées.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= raw_cart_payload" target="cartPayload" />
          <zeebe:output source="= verified_order_id" target="orderId" />
          <zeebe:output source="= client_category" target="clientCategory" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:callActivity id="Call_Validation_Risque" name="Évaluer Risque &amp; Solvabilité" calledElement="Process_Validation_Risque">
      <bpmn:extensionElements>
        <camunda:in source="orderId" target="subOrderId" />
        <camunda:out source="riskScore" target="globalRiskScore" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_Paiement_Facturation" name="Encaisser Paiement &amp; Émettre Facture" calledElement="Process_Paiement_Facturation">
      <bpmn:extensionElements>
        <camunda:in source="orderId" target="paymentOrderId" />
        <camunda:out source="invoiceNumber" target="invoiceId" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_Expedition_Logistique" name="Expédition &amp; Livraison Colis" calledElement="Process_Expedition_Logistique">
      <bpmn:extensionElements>
        <camunda:in source="orderId" target="shippingOrderId" />
        <camunda:out source="trackingNumber" target="trackingCode" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:endEvent id="End_Commande" name="Commande clôturée avec succès" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_P1">
    <bpmndi:BPMNPlane id="BPMNPlane_P1" bpmnElement="Process_Orchestration_Commande">
      <bpmndi:BPMNShape id="Start_Commande_di" bpmnElement="Start_Commande"><dc:Bounds x="160" y="100" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Qualifier_Commande_di" bpmnElement="Task_Qualifier_Commande"><dc:Bounds x="260" y="80" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_Validation_Risque_di" bpmnElement="Call_Validation_Risque"><dc:Bounds x="460" y="80" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_Paiement_Facturation_di" bpmnElement="Call_Paiement_Facturation"><dc:Bounds x="660" y="80" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_Expedition_Logistique_di" bpmnElement="Call_Expedition_Logistique"><dc:Bounds x="870" y="80" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Commande_di" bpmnElement="End_Commande"><dc:Bounds x="1070" y="100" width="36" height="36" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>\`;

  const parent2Bpmn = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Def_SAV" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.14.0">
  <bpmn:collaboration id="Collaboration_SAV">
    <bpmn:participant id="Participant_SAV" name="Service Après-Vente &amp; Relations Clients" processRef="Process_SAV_Gestion_Retours" />
  </bpmn:collaboration>
  <bpmn:process id="Process_SAV_Gestion_Retours" name="P2 : Service Après-Vente &amp; Retours Matériel" isExecutable="true">
    <bpmn:documentation>Processus parent pour la gestion des demandes de réclamation, retours SAV, avoirs financiers et renvois logistiques.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_SAV">
      <bpmn:lane id="Lane_ConseillerSAV" name="Conseillers SAV N1/N2">
        <bpmn:flowNodeRef>Start_SAV</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Enregistrer_Reclamation</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Remboursement_Paiement</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Reexpedition_Colis</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_SAV</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_SAV" name="Demande SAV reçue" />
    <bpmn:userTask id="Task_Enregistrer_Reclamation" name="Qualifier réclamation et diagnostiquer incident" camunda:candidateGroups="Equipe_SAV">
      <bpmn:documentation>Diagnostic de l'incident client et détermination du geste commercial ou échange matériel.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= claim_id" target="claimId" />
          <zeebe:output source="= refund_eligible" target="refundFlag" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:callActivity id="Call_Remboursement_Paiement" name="Émettre Remboursement / Avoir" calledElement="Process_Paiement_Facturation">
      <bpmn:documentation>Appelle le même sous-processus partagé de paiement pour recréditer le compte.</bpmn:documentation>
    </bpmn:callActivity>
    <bpmn:callActivity id="Call_Reexpedition_Colis" name="Réexpédier Équipement de Remplacement" calledElement="Process_Expedition_Logistique">
      <bpmn:documentation>Appelle le même sous-processus partagé de logistique pour expédier le matériel de remplacement.</bpmn:documentation>
    </bpmn:callActivity>
    <bpmn:endEvent id="End_SAV" name="Dossier SAV clôturé" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_P2">
    <bpmndi:BPMNPlane id="BPMNPlane_P2" bpmnElement="Process_SAV_Gestion_Retours">
      <bpmndi:BPMNShape id="Start_SAV_di" bpmnElement="Start_SAV"><dc:Bounds x="160" y="240" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Enregistrer_Reclamation_di" bpmnElement="Task_Enregistrer_Reclamation"><dc:Bounds x="260" y="220" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_Remboursement_Paiement_di" bpmnElement="Call_Remboursement_Paiement"><dc:Bounds x="470" y="220" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_Reexpedition_Colis_di" bpmnElement="Call_Reexpedition_Colis"><dc:Bounds x="680" y="220" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_SAV_di" bpmnElement="End_SAV"><dc:Bounds x="890" y="240" width="36" height="36" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>\`;

  const subRisqueBpmn = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Def_Risque" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_Risque">
    <bpmn:participant id="Participant_Risque" name="Pôle Contrôle &amp; Conformité Risque" processRef="Process_Validation_Risque" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Validation_Risque" name="SP1 : Contrôle &amp; Validation Risque Client" isExecutable="true">
    <bpmn:documentation>Sous-processus dédié à l'évaluation du score de risque et contrôle anti-fraude.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_Risque">
      <bpmn:lane id="Lane_ScoringAuto" name="Moteur Automatique IA">
        <bpmn:flowNodeRef>Task_Calcul_Score</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_AnalysteRisque" name="Analyste Risque N2">
        <bpmn:flowNodeRef>Task_Revue_Manuelle_Fraude</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:serviceTask id="Task_Calcul_Score" name="Calculer Score Scoring IA">
      <bpmn:documentation>Appel de l'API de scoring crédit et détection des fraudes.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= subOrderId" target="orderId" />
          <zeebe:output source="= calculated_score" target="riskScore" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Revue_Manuelle_Fraude" name="Audit approfondi du dossier suspect" camunda:candidateGroups="Auditeurs_Fraude">
      <bpmn:documentation>Revue manuelle effectuée uniquement en cas d'alerte fraude.</bpmn:documentation>
      <bpmn:extensionElements>
        <camunda:inputOutput>
          <camunda:inputParameter name="dossierRisqueId">\${orderId}</camunda:inputParameter>
          <camunda:outputParameter name="decisionValidation">\${approvedByAuditor}</camunda:outputParameter>
        </camunda:inputOutput>
      </bpmn:extensionElements>
    </bpmn:userTask>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_SP1">
    <bpmndi:BPMNPlane id="BPMNPlane_SP1" bpmnElement="Process_Validation_Risque">
      <bpmndi:BPMNShape id="Task_Calcul_Score_di" bpmnElement="Task_Calcul_Score"><dc:Bounds x="200" y="80" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Revue_Manuelle_Fraude_di" bpmnElement="Task_Revue_Manuelle_Fraude"><dc:Bounds x="380" y="80" width="150" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>\`;

  const subPaiementBpmn = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Def_Paiement" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_Paiement">
    <bpmn:participant id="Participant_Finance" name="Direction Financière &amp; Comptabilité" processRef="Process_Paiement_Facturation" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Paiement_Facturation" name="SP2 (Partagé) : Paiement, Facturation &amp; Avoirs" isExecutable="true">
    <bpmn:documentation>Sous-processus transversal partagé (appelé par Commande P1 et SAV P2).</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_Compta">
      <bpmn:lane id="Lane_Passerelle" name="Passerelle Bancaire">
        <bpmn:flowNodeRef>Task_Debiter_Compte</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Generer_Facture</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:serviceTask id="Task_Debiter_Compte" name="Débiter ou recréditer compte bancaire/CB">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= paymentOrderId" target="orderId" />
          <zeebe:output source="= transaction_ref" target="transactionId" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_Generer_Facture" name="Générer facture ou note d'avoir certifiée">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= transactionId" target="txId" />
          <zeebe:output source="= generated_invoice_id" target="invoiceNumber" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_SP2">
    <bpmndi:BPMNPlane id="BPMNPlane_SP2" bpmnElement="Process_Paiement_Facturation">
      <bpmndi:BPMNShape id="Task_Debiter_Compte_di" bpmnElement="Task_Debiter_Compte"><dc:Bounds x="200" y="80" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Generer_Facture_di" bpmnElement="Task_Generer_Facture"><dc:Bounds x="390" y="80" width="150" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>\`;

  const subShippingBpmn = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Def_Shipping" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_Logistique">
    <bpmn:participant id="Participant_Logistique" name="Plateforme Logistique &amp; Entrepôt" processRef="Process_Expedition_Logistique" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Expedition_Logistique" name="SP3 (Partagé) : Expédition &amp; Livraison Colis" isExecutable="true">
    <bpmn:documentation>Sous-processus transversal partagé pour l'emballage et l'expédition EDI (appelé par P1 et P2).</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_Entrepot">
      <bpmn:lane id="Lane_Preparateurs" name="Opérateurs Entrepôt">
        <bpmn:flowNodeRef>Task_Preparer_Colis</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_ExpeditionAuto" name="Système Transporteur EDI">
        <bpmn:flowNodeRef>Task_Transmettre_EDI</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:userTask id="Task_Preparer_Colis" name="Emballage physique et scan code-barres" camunda:candidateGroups="Equipe_Entrepot">
      <bpmn:extensionElements>
        <camunda:formData>
          <camunda:formField id="box_serial_number" type="string" />
        </camunda:formData>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_Transmettre_EDI" name="Notifier transporteur et éditer étiquette">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= shippingOrderId" target="orderId" />
          <zeebe:output source="= carrier_tracking_id" target="trackingNumber" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_SP3">
    <bpmndi:BPMNPlane id="BPMNPlane_SP3" bpmnElement="Process_Expedition_Logistique">
      <bpmndi:BPMNShape id="Task_Preparer_Colis_di" bpmnElement="Task_Preparer_Colis"><dc:Bounds x="200" y="80" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Transmettre_EDI_di" bpmnElement="Task_Transmettre_EDI"><dc:Bounds x="390" y="80" width="150" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>\`;

  const mockFiles = [
    { name: '1_Process_P1_Commande.bpmn', content: parent1Bpmn },
    { name: '2_Process_P2_SAV_Retours.bpmn', content: parent2Bpmn },
    { name: '3_Process_SP1_Validation_Risque.bpmn', content: subRisqueBpmn },
    { name: '4_Process_SP2_Paiement_Facturation.bpmn', content: subPaiementBpmn },
    { name: '5_Process_SP3_Expedition_Logistique.bpmn', content: subShippingBpmn }
  ];

  window.pmgCurrentFileEntries = mockFiles;
  window.pmgExplicitParents = null; // Auto detect
  const batchResult = window.parseBpmnBatchForPmg(mockFiles);
  window.populatePmgAllStepsFromBpmnBatch(batchResult);

  const uploadTitle = document.getElementById('uploadTitlePmgOneShot');
  const uploadSub = document.getElementById('uploadSubPmgOneShot');
  if (uploadTitle) uploadTitle.textContent = \`✨ Démo Multi-Parents & Sous-Processus Partagés chargée (5 processus)\`;
  if (uploadSub) uploadSub.textContent = \`2 Parents détectés (P1 Commande, P2 SAV) • 2 Sous-processus Partagés (Paiement, Expédition)\`;
};

`;

const startIdxDemo = code.indexOf(oldDemoStart);
const endIdxDemo = code.indexOf(oldDemoEnd);
if (startIdxDemo !== -1 && endIdxDemo !== -1) {
  code = code.substring(0, startIdxDemo) + newDemoSuite + code.substring(endIdxDemo);
  console.log('Demo suite successfully replaced!');
} else {
  console.error('Could not find demo suite markers');
}

fs.writeFileSync(pmgPath, code, 'utf8');
console.log('pmg.js successfully patched!');
