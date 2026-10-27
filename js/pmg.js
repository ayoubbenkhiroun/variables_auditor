// ---------- PMG (Process Matrix Governance) Module Logic ----------

// Helpers de sécurité et sanitisation locaux/globaux
if (!window.esc) {
  window.esc = function(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/`/g, '&#96;');
  };
}
if (!window.escHtml) window.escHtml = window.esc;
if (!window.escAttr) window.escAttr = window.esc;
if (!window.sanitizeFormula) {
  window.sanitizeFormula = function(s) {
    if (s == null) return '';
    let str = String(s);
    if (/^[=+\-@\t\r;]/.test(str)) return "'" + str;
    return str;
  };
}
if (!window.sanitizeAoA) {
  window.sanitizeAoA = function(aoa) {
    if (!Array.isArray(aoa)) return [];
    return aoa.map(row => Array.isArray(row) ? row.map(c => typeof c === 'string' ? window.sanitizeFormula(c) : c) : row);
  };
}
if (!window.qq) {
  window.qq = function(s) {
    return '"' + String(window.sanitizeFormula(s)).replace(/"/g, '""') + '"';
  };
}
if (!window.validateFileSize) window.validateFileSize = function() { return true; };

window.openPmgEditTreeNodeModalFromEl = function(el) {
  const actId = el.getAttribute('data-act-id');
  if (actId && typeof window.openPmgEditTreeNodeModal === 'function') {
    window.openPmgEditTreeNodeModal(actId);
  }
};

window.addNewPmgSubactivityFromEl = function(el) {
  const actId = el.getAttribute('data-act-id');
  if (actId && typeof window.addNewPmgSubactivity === 'function') {
    window.addNewPmgSubactivity(actId);
  }
};

// Global variables for PMG
window.pmgXmlDoc = null;
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
    desc: 'Tri par flux d\'exécution séquentiel (StartEvent &rarr; SequenceFlow)'
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
    title: 'Ordre brut d\'apparition dans le document XML source',
    desc: 'Tri selon l\'ordre textuel séquentiel dans le fichier BPMN XML'
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
    modalBody.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary);">⚠️ Aucun processus BPMN chargé. Veuillez importer des fichiers BPMN à l\'étape 1.</div>';
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
      statusBadge = `<span style="background:rgba(99, 102, 241, 0.15); color:#6366f1; border:1px solid rgba(99, 102, 241, 0.3); padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">🌟 Processus Parent (P${parentIndex++})</span>`;
    } else if (sharedInfo) {
      statusBadge = `<span class="pmg-shared-pill">🔗 Sous-processus Partagé (${sharedInfo.callerCount} appelants : ${escHtml(sharedInfo.sharedParentNames.join(', '))})</span>`;
    } else {
      const callerNames = (proc.callers || []).map(c => c.callerProcName || c.callerProcId).join(', ') || 'Call Activity';
      statusBadge = `<span style="background:rgba(59, 130, 246, 0.12); color:var(--brand-primary); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600;">📁 Sous-processus dédié (Appelé par : ${escHtml(callerNames)})</span>`;
    }

    rowsHtml += `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:12px 10px; text-align:center;">
          <input type="checkbox" class="pmg-parent-select-cb" data-proc-id="${escAttr(procId)}" ${isRoot ? 'checked' : ''} style="transform:scale(1.25); cursor:pointer;">
        </td>
        <td style="padding:12px 10px;">
          <strong style="color:var(--text-primary); font-size:13px;">${escHtml(proc.name)}</strong>
          <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono); margin-top:2px;">ID: <code>${escHtml(procId)}</code></div>
        </td>
        <td style="padding:12px 10px; font-size:11.5px; color:var(--text-secondary);">
          📄 ${escHtml(proc.fileName || 'diagramme.bpmn')}
        </td>
        <td style="padding:12px 10px; text-align:center;">
          <span style="font-weight:700; color:var(--ok); font-size:12.5px; background:rgba(16, 185, 129, 0.1); padding:2px 8px; border-radius:10px;">${actCount}</span>
        </td>
        <td style="padding:12px 10px;">
          ${statusBadge}
        </td>
      </tr>
    `;
  }

  modalBody.innerHTML = `
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
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
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
  alert(`✅ Configuration appliquée avec succès : ${selectedIds.length} processus parent(s) racine(s) configuré(s).`);
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
    const pLabel = roots.map((r, i) => `P${i + 1}`).join(', ');
    badge.textContent = `${roots.length} Parent${roots.length > 1 ? 's' : ''} (${pLabel}) • ${shared.length} partagé${shared.length > 1 ? 's' : ''}`;
  }

  const currentFilter = window.pmgParentFilter || 'all';

  let html = `
    <button class="pmg-filter-chip ${currentFilter === 'all' ? 'active' : ''}" onclick="setPmgParentFilter('all')">
      🌐 Tous les Processus Parents (${allActs.length})
    </button>
  `;

  roots.forEach((root, idx) => {
    const rootActs = allActs.filter(a => a.rootParentId === root.id);
    const isAct = currentFilter === root.id;
    html += `
      <button class="pmg-filter-chip ${isAct ? 'active' : ''}" onclick="setPmgParentFilter('${escAttr(root.id)}')">
        🏛️ P${idx + 1}: ${escHtml(root.name)} (${rootActs.length})
      </button>
    `;
  });

  if (shared.length > 0) {
    const sharedActs = allActs.filter(a => a.isSharedSubprocess);
    const isAct = currentFilter === 'shared_only';
    html += `
      <button class="pmg-filter-chip ${isAct ? 'active' : ''}" style="${isAct ? '' : 'color:#db2777; border-color:rgba(236, 72, 153, 0.4);'}" onclick="setPmgParentFilter('shared_only')">
        🔗 Sous-processus Partagés (${sharedActs.length})
      </button>
    `;
  }

  container.innerHTML = html;
};

window.setPmgParentFilter = function(filterVal) {
  window.pmgParentFilter = filterVal;
  window.renderPmgParentFilterBar();
  if (window.renderPmgVisualTree) window.renderPmgVisualTree();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
};

// Custom CSV/Excel PMG Import state
window.pmgImportMode = 'excel'; // Always 'excel' (BPMN direct removed)
window.pmgImportMethod = 'steps'; // 'steps' or 'bulk'
window.pmgUseSingleFile = true;
window.pmgActiveStep = 1;

window.pmgRealizationModes = ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

window.exportPmgStepTemplate = function(step) {
  let filename = `Template_PMG_Etape_${step}.csv`;
  let csvContent = "";

  if (step === 1) {
    csvContent = "ID Activite;Nom Activite;Parent;Type\n" +
                 "ACT_01;Validation Inscription;;Sous-processus\n" +
                 "ACT_02;Vérifier pièces justificatives;Validation Inscription;User Task\n" +
                 "ACT_03;Valider dossier;Validation Inscription;User Task\n";
  } else if (step === 2) {
    csvContent = "ID Activite;Entite Role;Groupe Utilisateurs\n" +
                 "ACT_01;Direction RH;Gestionnaires_RH\n" +
                 "ACT_02;Service Contrôle;Auditeurs_N1\n";
  } else if (step === 3) {
    csvContent = "ID Activite;Variables Entrees;Variables Sorties\n" +
                 "ACT_01;dossierId, demandeurNom;statutValidation, rapportId\n" +
                 "ACT_02;dossierId, piecesArray;piecesConformesFlag\n";
  } else if (step === 4) {
    csvContent = "ID Activite;Mode Realisation;Applicable Dans Quel Cas;Commentaire\n" +
                 "ACT_01;Call Activity;Si dossier complet;Processus sous-traité RH\n" +
                 "ACT_02;Manuelle;Uniquement dossiers prioritaires;Traitement physique requis\n";
  }

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Modal Handlers for Realization Modes
window.openPmgRealizationModeModal = function() {
  const modal = document.getElementById('modalPmgRealizationModes');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgRealizationModesList();
};

window.closePmgRealizationModeModal = function() {
  const modal = document.getElementById('modalPmgRealizationModes');
  if (modal) modal.style.display = 'none';
};

window.renderPmgRealizationModesList = function() {
  const container = document.getElementById('pmgRealizationModesListContainer');
  if (!container) return;

  const defaults = ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];
  let html = '';

  window.pmgRealizationModes.forEach((mode, idx) => {
    const isDefault = defaults.includes(mode);
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:6px 10px; border-radius:4px; border:1px solid var(--border-color);">
        <span style="font-size:12px; font-weight:600; color:var(--text-primary);">${mode}</span>
        ${!isDefault ? `<button class="btn-ghost" style="padding:2px 6px; font-size:10px; color:var(--err);" onclick="removeCustomPmgRealizationMode(${idx})">Supprimer</button>` : `<span style="font-size:10px; color:var(--text-tertiary); font-style:italic;">Défaut</span>`}
      </div>
    `;
  });

  container.innerHTML = html;
};

window.addCustomPmgRealizationMode = function() {
  const input = document.getElementById('pmgNewRealizationModeInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  if (window.pmgRealizationModes.includes(val)) {
    alert("Ce mode de réalisation existe déjà.");
    return;
  }

  window.pmgRealizationModes.push(val);
  input.value = '';
  window.renderPmgRealizationModesList();

  if (document.getElementById('pmgStep4ManualContainer')?.style.display === 'block') {
    window.renderPmgStep4ManualTable();
  }
};

window.removeCustomPmgRealizationMode = function(index) {
  if (index >= 0 && index < window.pmgRealizationModes.length) {
    window.pmgRealizationModes.splice(index, 1);
    window.renderPmgRealizationModesList();
    if (document.getElementById('pmgStep4ManualContainer')?.style.display === 'block') {
      window.renderPmgStep4ManualTable();
    }
  }
};

window.pmgStepGoBack = function(targetStep) {
  for (let i = 1; i <= 5; i++) {
    const panel = document.getElementById(`pmg-step-panel-${i}`);
    const node = document.getElementById(`step-node-${i}`);
    if (panel) panel.style.display = i === targetStep ? 'block' : 'none';
    if (node) {
      if (i < targetStep) node.className = 'step-node completed';
      else if (i === targetStep) node.className = 'step-node active';
      else node.className = 'step-node disabled';
    }
  }

  window.pmgActiveStep = targetStep;

  const progressWidths = { 1: '0%', 2: '25%', 3: '50%', 4: '75%', 5: '100%' };
  const progressBar = document.getElementById('pmgStepperProgress');
  if (progressBar) progressBar.style.width = progressWidths[targetStep] || '0%';

  if (typeof window.renderAllPmgStepKpis === 'function') {
    window.renderAllPmgStepKpis();
  }
};

window.pmgUploadedFiles = {
  step1: { raw: [], headers: [], name: '' },
  step2: { raw: [], headers: [], name: '' },
  step3: { raw: [], headers: [], name: '' },
  step4: { raw: [], headers: [], name: '' },
  bulk: { raw: [], headers: [], name: '' }
};

window.pmgTempSubprocesses = [];

// Event handlers for mode changes
window.setPmgImportMode = function(mode) {
  window.pmgImportMode = 'excel';
  const customContainer = document.getElementById('pmg-custom-import-container');
  if (customContainer) customContainer.style.display = 'block';
};

window.onChangePmgImportMethod = function() {
  const method = document.querySelector('input[name="pmgImportMethod"]:checked').value;
  window.pmgImportMethod = method;
  
  document.getElementById('pmg-wizard-container').style.display = method === 'steps' ? 'block' : 'none';
  document.getElementById('pmg-bulk-container').style.display = method === 'bulk' ? 'block' : 'none';
  
  if (method === 'steps') {
    window.onChangePmgUseSingleFile();
  }
};

window.onChangePmgUseSingleFile = function() {
  const single = document.getElementById('pmgUseSingleFile')?.checked;
  window.pmgUseSingleFile = single;
  
  if (document.getElementById('dropZonePmgStep2')) document.getElementById('dropZonePmgStep2').style.display = single ? 'none' : 'block';
  if (document.getElementById('dropZonePmgStep3')) document.getElementById('dropZonePmgStep3').style.display = single ? 'none' : 'block';
  if (document.getElementById('dropZonePmgStep4')) document.getElementById('dropZonePmgStep4').style.display = single ? 'none' : 'block';
  
  const uploadSub = document.getElementById('uploadSubPmgStep1');
  if (uploadSub) {
    uploadSub.textContent = single 
      ? 'Fichier unique pour toutes les étapes (.xlsx, .xls, .csv)'
      : 'Fichier pour l\'étape 1 : sous-processus (.xlsx, .xls, .csv)';
  }
};

window.onChangePmgVarMappingStyle = function() {
  const style = document.getElementById('pmgVarMappingStyle').value;
  document.getElementById('mappingGridPmgStep2Separate').style.display = style === 'separate' ? 'grid' : 'none';
  document.getElementById('mappingGridPmgStep2RowByRow').style.display = style === 'rowByRow' ? 'grid' : 'none';
  window.updatePmgStepPreview(3);
};

window.onChangePmgBulkVarMappingStyle = function() {
  const style = document.getElementById('pmgBulkVarMappingStyle').value;
  document.getElementById('pmgBulkMappingGridSeparate').style.display = style === 'separate' ? 'grid' : 'none';
  document.getElementById('pmgBulkMappingGridRowByRow').style.display = style === 'rowByRow' ? 'grid' : 'none';
  window.updatePmgBulkPreview();
};

window.pmgStepGoBack = function(targetStep) {
  for (let s = 1; s <= 5; s++) {
    const node = document.getElementById('step-node-' + s);
    const panel = document.getElementById('pmg-step-panel-' + s);
    if (panel) {
      if (s === targetStep) {
        if (node) node.className = 'step-node active';
        panel.style.display = 'block';
      } else {
        panel.style.display = 'none';
        if (node) {
          if (s < targetStep) {
            node.className = 'step-node completed';
          } else {
            node.className = 'step-node disabled';
          }
        }
      }
    }
  }
  window.pmgActiveStep = targetStep;
  const progressWidths = { 1: '0%', 2: '25%', 3: '50%', 4: '75%', 5: '100%' };
  const progressBar = document.getElementById('pmgStepperProgress');
  if (progressBar) progressBar.style.width = progressWidths[targetStep] || '0%';
};

// ---------- PMG LocalStorage Auto-Save & Persistence Module ----------
const PMG_PERSISTENCE_KEY = 'pmg_workspace_state_backup_v1';

window.savePmgStateToLocalStorage = function() {
  try {
    const meta = {
      name: document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || '',
      id: document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || '',
      owner: document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || '',
      exporter: document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || '',
      version: document.getElementById('pmgProcessVersionStep')?.value || document.getElementById('pmgProcessVersion')?.value || '',
      badges: document.getElementById('pmgProjectBadgesStep')?.value || '',
      defaultFille: document.getElementById('pmgDefaultProcessFilleStep')?.value || '',
      desc: document.getElementById('pmgProcessDescStep')?.value || document.getElementById('pmgProcessDesc')?.value || ''
    };

    const state = {
      meta: meta,
      activeStep: window.pmgActiveStep || 1,
      tempSubprocesses: window.pmgTempSubprocesses || [],
      activities: window.pmgActivities || [],
      processDetails: window.pmgProcessDetails || {},
      realizationModes: window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'],
      timestamp: new Date().toISOString()
    };

    window.inMemoryPmgState = state;
    window.updatePmgAutoSaveBadge();
  } catch (e) {
    console.warn("Erreur d'auto-sauvegarde mémoire PMG:", e);
  }
};

window.loadPmgStateFromLocalStorage = function() {
  try {
    const state = window.inMemoryPmgState;
    if (!state) return false;

    if (!state || (!state.tempSubprocesses?.length && !state.meta?.name)) return false;

    // Restore metadata
    if (state.meta) {
      if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = state.meta.name || '';
      if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = state.meta.id || '';
      if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = state.meta.owner || '';
      if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = state.meta.exporter || '';
      if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = state.meta.version || '';
      if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = state.meta.badges || '';
      if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = state.meta.defaultFille || '';
      if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = state.meta.desc || '';
      window.syncPmgStep1Metadata();
    }

    if (state.realizationModes) {
      window.pmgRealizationModes = state.realizationModes;
    }

    if (state.tempSubprocesses && state.tempSubprocesses.length > 0) {
      window.pmgTempSubprocesses = state.tempSubprocesses;

      // Render Tree View in Step 2 if container exists
      const treeContainer = document.getElementById('pmgVisualTreeContainer');
      if (treeContainer) treeContainer.style.display = 'block';
      if (window.renderPmgVisualTree) window.renderPmgVisualTree(state.tempSubprocesses);

      // Enable step nodes in Stepper
      for (let s = 1; s <= 5; s++) {
        const node = document.getElementById('step-node-' + s);
        if (node) node.classList.remove('disabled');
      }

      const btnNext1 = document.getElementById('btnPmgStep1Next');
      if (btnNext1) btnNext1.disabled = false;

      // Populate manual tables for Steps 3, 4, 5
      if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
      if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
      if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
    }

    if (state.activities && state.activities.length > 0) {
      window.pmgActivities = state.activities;
      window.pmgProcessDetails = state.processDetails || {};
    }

    if (state.activeStep && state.activeStep > 1) {
      window.pmgStepGoBack(state.activeStep);
    }

    window.updatePmgAutoSaveBadge(state.timestamp);
    return true;
  } catch (e) {
    console.warn("Erreur lors de la restauration localstorage PMG:", e);
    return false;
  }
};

window.clearPmgStateLocalStorage = function() {
  if (confirm("Voulez-vous vraiment réinitialiser le wizard PMG et effacer la sauvegarde locale ?")) {
    localStorage.removeItem(PMG_PERSISTENCE_KEY);
    window.pmgTempSubprocesses = [];
    window.pmgActivities = [];
    location.reload();
  }
};

window.syncPmgStep1Metadata = function() {
  window.pmgProcessDetails = {
    name: document.getElementById('pmgProcessNameStep')?.value || 'Lancement projet',
    id: document.getElementById('pmgProcessIdStep')?.value || 'lancement-projet',
    owner: document.getElementById('pmgProcessOwnerStep')?.value || 'Direction Métier',
    exporter: document.getElementById('pmgExporterStep')?.value || 'Équipe PMG / Modélisateur',
    version: document.getElementById('pmgProcessVersionStep')?.value || 'v1.0.0',
    badges: document.getElementById('pmgProjectBadgesStep')?.value || 'CDD / CPE / SGP / SP0 / DMN',
    defaultFille: document.getElementById('pmgDefaultProcessFilleStep')?.value || 'NA',
    desc: document.getElementById('pmgProcessDescStep')?.value || ''
  };

  if (document.getElementById('pmgProcessName')) document.getElementById('pmgProcessName').value = window.pmgProcessDetails.name;
  if (document.getElementById('pmgProcessId')) document.getElementById('pmgProcessId').value = window.pmgProcessDetails.id;
  if (document.getElementById('pmgProcessOwner')) document.getElementById('pmgProcessOwner').value = window.pmgProcessDetails.owner;
  if (document.getElementById('pmgExporter')) document.getElementById('pmgExporter').value = window.pmgProcessDetails.exporter;
  if (document.getElementById('pmgProcessVersion')) document.getElementById('pmgProcessVersion').value = window.pmgProcessDetails.version;
  if (document.getElementById('pmgProcessDesc')) document.getElementById('pmgProcessDesc').value = window.pmgProcessDetails.desc;

  window.savePmgStateToLocalStorage();
};

window.validatePmgStep1Metadata = function() {
  window.syncPmgStep1Metadata();

  const name = (document.getElementById('pmgProcessNameStep')?.value || '').trim();
  const id = (document.getElementById('pmgProcessIdStep')?.value || '').trim();

  if (!name || !id) {
    alert("Veuillez renseigner au moins le Nom du Processus et l'ID Technique.");
    return;
  }

  const node1 = document.getElementById('step-node-1');
  const node2 = document.getElementById('step-node-2');
  const panel1 = document.getElementById('pmg-step-panel-1');
  const panel2 = document.getElementById('pmg-step-panel-2');

  if (node1) node1.className = 'step-node completed';
  if (node2) node2.className = 'step-node active';
  if (panel1) panel1.style.display = 'none';
  if (panel2) panel2.style.display = 'block';

  window.pmgActiveStep = 2;
  const progressBar = document.getElementById('pmgStepperProgress');
  if (progressBar) progressBar.style.width = '25%';

  window.savePmgStateToLocalStorage();
};

window.updatePmgAutoSaveBadge = function(timeStr) {
  const badge = document.getElementById('pmgAutoSaveBadge');
  if (!badge) return;

  const date = timeStr ? new Date(timeStr) : new Date();
  const formattedTime = date.toLocaleTimeString();
  badge.innerHTML = `💾 Auto-sauvegarde active (Dernière: ${formattedTime})`;
};

// Auto-restore on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.loadPmgStateFromLocalStorage();
    }, 250);
  });
}

window.loadPmgDemoData = function() {
  // 1. Set Coherent Process Metadata in Step 1
  if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = "Lancement & Qualification des Sites (VDR)";
  if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = "lancement-vdr-site";
  if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = "Direction Réseau & Opérations";
  if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = "Ayoub BENKHIROUN (Consultant PMG)";
  if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = "v2.4.0";
  if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = "CDD / CPE / SGP / SP0 / DMN";
  if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = "NA";
  if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = "Processus complet d'instruction des demandes d'allumage et remédiation 4G/5G.";

  window.syncPmgStep1Metadata();

  // 2. Build Coherent Demo Activities Hierarchy (Multi-Level N0..N4)
  const demoActivities = [
    // Brique 1: Lancement projet (Level 1 / N0)
    { id: 'act_101', name: 'Lancement projet', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Métier', userGroup: 'Chefs de projet', inputs: ['idProjet', 'codeSite'], outputs: ['projetInitie'], realizationMode: 'Call Activity', applicableCase: 'Tous les projets', comment: 'Brique primaire d\'initialisation' },
    
    // Macro 1.1: Vérifier le dépôt COMSIS (Level 2 / N1)
    { id: 'act_102', name: 'Vérifier le dépôt COMSIS', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Service Administration', userGroup: 'Gestionnaires COMSIS', inputs: ['numDossier', 'docIdentite'], outputs: ['statutDepot'], realizationMode: 'Call Activity', applicableCase: 'Dossiers COMSIS', comment: 'Vérification documentaire' },
    
    // Task 1.1.1 (Level 3 / N2)
    { id: 'act_103', name: 'Contrôler la conformité du dossier', parentId: 'Vérifier le dépôt COMSIS', level: 3, type: 'User Task', entity: 'Service Client', userGroup: 'Analystes COMSIS', inputs: ['numDossier', 'attestationBDD'], outputs: ['dossierValide'], realizationMode: 'Manuelle', applicableCase: 'Dossier déposé', comment: 'Examen manuel des pièces' },

    // Macro 1.2: Vérifier le réglementaire (Level 2 / N1)
    { id: 'act_104', name: 'Vérifier le réglementaire', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Direction Juridique & Réglementaire', userGroup: 'Juristes ANFR', inputs: ['idSite', 'freqBand'], outputs: ['accordReglementaire'], realizationMode: 'Call Activity', applicableCase: 'Sites radio 4G/5G', comment: 'Instruction réglementaire' },

    // Subprocess 1.2.1: Notifier ANFR Date allumage 4G 700 (Level 3 / N2)
    { id: 'act_105', name: 'Notifier ANFR Date allumage 4G 700', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage700'], outputs: ['ackANFR700'], realizationMode: 'Automatique', applicableCase: 'Bande 700 MHz', comment: 'Flux API ANFR' },

    // Subprocess 1.2.2: Notifier ANFR Date allumage 4G 800 (Level 3 / N2)
    { id: 'act_106', name: 'Notifier ANFR Date allumage 4G 800', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage800'], outputs: ['ackANFR800'], realizationMode: 'Automatique', applicableCase: 'Bande 800 MHz', comment: 'Flux API ANFR' },

    // Subprocess 1.2.3: Réaliser Remédiation 4G (Level 3 / N2)
    { id: 'act_107', name: 'Réaliser Remédiation 4G', parentId: 'Vérifier le réglementaire', level: 3, type: 'Sous-processus', entity: 'Support Technique', userGroup: 'Techniciens Réseau', inputs: ['ticketRemediation'], outputs: ['rapportRemediation'], realizationMode: 'SP0', applicableCase: 'Anomalie détectée', comment: 'Remédiation technique site' },

    // Task 1.2.3.1 (Level 4 / N3)
    { id: 'act_108', name: 'Préciser le groupe responsable', parentId: 'Réaliser Remédiation 4G', level: 4, type: 'User Task', entity: 'Support Technique', userGroup: 'Superviseurs NOC', inputs: ['ticketRemediation'], outputs: ['groupeAffecte'], realizationMode: 'Manuelle', applicableCase: 'Remédiation requise', comment: 'Affectation au prestataire' },

    // Brique 2: Instruction et Raccordement (Level 1 / N0)
    { id: 'act_109', name: 'Négocier le type de Bail', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Immobilière', userGroup: 'Négociateurs Baux', inputs: ['nomBailleur', 'adresseSite'], outputs: ['bailSigne'], realizationMode: 'Call Activity', applicableCase: 'Nouveau site', comment: 'Négociation contractuelle' },

    // Subprocess 2.1 (Level 2 / N1)
    { id: 'act_110', name: 'Identifier type de Bailleur VDR', parentId: 'Négocier le type de Bail', level: 2, type: 'Call Activity', entity: 'Direction Juridique', userGroup: 'Juristes Immobilier', inputs: ['nomBailleur', 'typeBailleur'], outputs: ['conventionBail'], realizationMode: 'Call Activity', applicableCase: 'Bailleur privé/public', comment: 'Validation modèle convention' }
  ];

  window.pmgTempSubprocesses = demoActivities;

  // Render Visual Tree View in Step 2
  const treeContainer = document.getElementById('pmgVisualTreeContainer');
  if (treeContainer) treeContainer.style.display = 'block';
  if (window.renderPmgVisualTree) window.renderPmgVisualTree(demoActivities);

  // Enable Next button in Step 2
  const btnNext1 = document.getElementById('btnPmgStep1Next');
  if (btnNext1) btnNext1.disabled = false;

  // Pre-populate manual tables for Steps 3, 4, 5
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();

  // Enable all step nodes in Stepper
  for (let s = 1; s <= 5; s++) {
    const node = document.getElementById('step-node-' + s);
    if (node) node.classList.remove('disabled');
  }

  // Pre-build window.pmgActivities & window.pmgProcessDetails for immediate Excel export or Matrix display
  window.pmgActivities = demoActivities.map(sub => {
    const isSub = sub.type.toLowerCase().includes('sous-processus') || sub.type.toLowerCase().includes('call');
    return {
      id: sub.id,
      name: sub.name,
      type: isSub ? 'callactivity' : 'userTask',
      typeLabel: sub.type,
      entity: sub.entity,
      userGroup: sub.userGroup,
      inputs: sub.inputs,
      outputs: sub.outputs,
      applicableCase: sub.applicableCase,
      comment: sub.comment,
      realizationMode: sub.realizationMode,
      parentId: sub.parentId,
      level: sub.level
    };
  });

  window.pmgProcessDetails = {
    id: "lancement-vdr-site",
    name: "Lancement & Qualification des Sites (VDR)",
    isExecutable: 'false',
    exporter: "Ayoub BENKHIROUN (Consultant PMG)",
    exporterVersion: '2.4.0',
    version: "v2.4.0",
    owner: "Direction Réseau & Opérations",
    desc: "Processus complet d'instruction des demandes d'allumage et remédiation 4G/5G."
  };

  alert("✨ Données de démonstration PMG chargées avec succès !\n\n10 activités cohérentes structurées sur 4 niveaux ont été pré-remplies (Lancement projet, COMSIS, ANFR 4G, Remédiation, Baux VDR).\n\nVous pouvez parcourir les étapes 1 à 5 du Wizard ou générer directement l'export Excel stylisé !");
};

// File handlers
window.handlePmgStepFile = function(step, file) {
  if (!file) return;
  if (!window.XLSX) {
    alert("La bibliothèque Excel (XLSX) n'est pas chargée.");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      
      let raw = [];
      let headers = [];
      
      if (sheetData.length > 0) {
        headers = sheetData[0].map((h, i) => h ? String(h).trim() : `Colonne ${i}`);
        raw = sheetData.slice(1);
      }
      
      window.pmgUploadedFiles['step' + step] = {
        raw: raw,
        headers: headers,
        name: file.name
      };
      
      document.getElementById(`uploadTitlePmgStep${step}`).textContent = file.name;
      document.getElementById(`uploadSubPmgStep${step}`).textContent = `${raw.length} lignes chargées.`;
      document.getElementById(`mappingSectionPmgStep${step}`).style.display = 'block';
      
      window.populatePmgStepMappingDropdowns(step);
      
    } catch (err) {
      console.error(err);
      alert("Erreur lors du décodage du fichier : " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};

window.handlePmgBulkFile = function(file) {
  if (!file) return;
  if (!window.XLSX) {
    alert("La bibliothèque Excel (XLSX) n'est pas chargée.");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      
      let raw = [];
      let headers = [];
      
      if (sheetData.length > 0) {
        headers = sheetData[0].map((h, i) => h ? String(h).trim() : `Colonne ${i}`);
        raw = sheetData.slice(1);
      }
      
      window.pmgUploadedFiles['bulk'] = {
        raw: raw,
        headers: headers,
        name: file.name
      };
      
      document.getElementById('uploadTitlePmgBulk').textContent = file.name;
      document.getElementById('uploadSubPmgBulk').textContent = `${raw.length} lignes chargées.`;
      
      document.getElementById('pmgBulkVarStyleWrapper').style.display = 'block';
      document.getElementById('mappingSectionPmgBulk').style.display = 'block';
      
      window.populatePmgBulkMappingDropdowns();
      
    } catch (err) {
      console.error(err);
      alert("Erreur lors du décodage du fichier : " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};

// Mappings dropdown managers
window.populatePmgStepMappingDropdowns = function(step) {
  const fileData = window.pmgUploadedFiles['step' + step];
  if (!fileData) return;
  
  const headers = fileData.headers;
  
  if (step === 1) {
    const selects = [
      document.getElementById('colPmgSubId'),
      document.getElementById('colPmgSubName'),
      document.getElementById('colPmgSubParent'),
      document.getElementById('colPmgActivityType')
    ];
    
    selects.forEach(sel => {
      if (!sel) return;
      const hasDef = sel.querySelector('option[value="-1"]');
      sel.innerHTML = hasDef ? `<option value="-1">${hasDef.textContent}</option>` : '';
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${h} (Col ${idx})`;
        sel.appendChild(opt);
      });
    });
    
    const headersLower = headers.map(h => h.toLowerCase());
    
    const idIdx = headersLower.findIndex(h => h === 'id' || h.includes('id_sous') || h.includes('id sous') || h.includes('subprocess_id') || h.includes('code') || h.includes('id_activit'));
    if (idIdx >= 0) document.getElementById('colPmgSubId').value = idIdx;
    
    const nameIdx = headersLower.findIndex(h => h.includes('activit') || h.includes('tâche') || h.includes('tache') || h.includes('user task') || h.includes('nom') || h.includes('name') || h.includes('libelle') || h.includes('libellé') || h.includes('processus'));
    if (nameIdx >= 0) document.getElementById('colPmgSubName').value = nameIdx;
    else if (headers.length > 0) document.getElementById('colPmgSubName').value = 0;
    
    const parentIdx = headersLower.findIndex(h => h.includes('parent') || h.includes('processus parent') || h.includes('parent_id') || h.includes('englobant'));
    if (parentIdx >= 0) document.getElementById('colPmgSubParent').value = parentIdx;
    
    const typeIdx = headersLower.findIndex(h => h.includes('type') || h.includes('nature') || h.includes('composant'));
    if (typeIdx >= 0 && document.getElementById('colPmgActivityType')) document.getElementById('colPmgActivityType').value = typeIdx;
    
    document.getElementById('btnPmgStep1Next').disabled = false;
    window.updatePmgStepPreview(1);
    
  } else if (step === 2) {
    const selects = [
      document.getElementById('colPmgStakeholderSubId'),
      document.getElementById('colPmgStakeholderName'),
      document.getElementById('colPmgStakeholderGroup')
    ];
    
    selects.forEach(sel => {
      if (!sel) return;
      const hasDef = sel.querySelector('option[value="-1"]');
      sel.innerHTML = hasDef ? `<option value="-1">${hasDef.textContent}</option>` : '';
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${h} (Col ${idx})`;
        sel.appendChild(opt);
      });
    });
    
    const headersLower = headers.map(h => h.toLowerCase());
    
    const idIdx = headersLower.findIndex(h => h === 'id' || h.includes('id_sous') || h.includes('code') || h.includes('activit') || h.includes('nom'));
    if (idIdx >= 0 && document.getElementById('colPmgStakeholderSubId')) document.getElementById('colPmgStakeholderSubId').value = idIdx;
    
    const actorIdx = headersLower.findIndex(h => h.includes('entite') || h.includes('entité') || h.includes('partie') || h.includes('acteur') || h.includes('role') || h.includes('rôle') || h.includes('stakeholder') || h.includes('entity'));
    if (actorIdx >= 0 && document.getElementById('colPmgStakeholderName')) document.getElementById('colPmgStakeholderName').value = actorIdx;

    const groupIdx = headersLower.findIndex(h => h.includes('groupe') || h.includes('group') || h.includes('usergroup') || h.includes('utilisateurs'));
    if (groupIdx >= 0 && document.getElementById('colPmgStakeholderGroup')) document.getElementById('colPmgStakeholderGroup').value = groupIdx;
    
    document.getElementById('btnPmgStep2Next').disabled = false;
    window.updatePmgStepPreview(2);
    
  } else if (step === 3) {
    const selects = [
      document.getElementById('colPmgVarSubIdSep'),
      document.getElementById('colPmgVarInputs'),
      document.getElementById('colPmgVarOutputs'),
      document.getElementById('colPmgVarSubIdRow'),
      document.getElementById('colPmgVarName'),
      document.getElementById('colPmgVarType')
    ];
    
    selects.forEach(sel => {
      if (!sel) return;
      const hasDef = sel.querySelector('option[value="-1"]');
      sel.innerHTML = hasDef ? `<option value="-1">${hasDef.textContent}</option>` : '';
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${h} (Col ${idx})`;
        sel.appendChild(opt);
      });
    });
    
    const headersLower = headers.map(h => h.toLowerCase());
    
    const idSepIdx = headersLower.findIndex(h => h === 'id' || h.includes('id_sous') || h.includes('code') || h.includes('activit') || h.includes('nom'));
    if (idSepIdx >= 0) {
      if (document.getElementById('colPmgVarSubIdSep')) document.getElementById('colPmgVarSubIdSep').value = idSepIdx;
      if (document.getElementById('colPmgVarSubIdRow')) document.getElementById('colPmgVarSubIdRow').value = idSepIdx;
    }
    
    const inputsIdx = headersLower.findIndex(h => h.includes('input') || h.includes('entrée') || h.includes('entree') || h.includes('var_in'));
    if (inputsIdx >= 0 && document.getElementById('colPmgVarInputs')) document.getElementById('colPmgVarInputs').value = inputsIdx;
    
    const outputsIdx = headersLower.findIndex(h => h.includes('output') || h.includes('sortie') || h.includes('sorties') || h.includes('var_out'));
    if (outputsIdx >= 0 && document.getElementById('colPmgVarOutputs')) document.getElementById('colPmgVarOutputs').value = outputsIdx;
    
    const varNameIdx = headersLower.findIndex(h => h.includes('variable') || h.includes('var') || h.includes('nom_var') || h.includes('nom variable'));
    if (varNameIdx >= 0 && document.getElementById('colPmgVarName')) document.getElementById('colPmgVarName').value = varNameIdx;
    
    const typeIdx = headersLower.findIndex(h => h.includes('type') || h.includes('flux') || h.includes('direction'));
    if (typeIdx >= 0 && document.getElementById('colPmgVarType')) document.getElementById('colPmgVarType').value = typeIdx;
    
    document.getElementById('btnPmgStep3Next').disabled = false;
    window.updatePmgStepPreview(3);

  } else if (step === 4) {
    const selects = [
      document.getElementById('colPmgStep4SubId'),
      document.getElementById('colPmgStep4RealizationMode'),
      document.getElementById('colPmgStep4ApplicableCase'),
      document.getElementById('colPmgStep4Comment')
    ];
    
    selects.forEach(sel => {
      if (!sel) return;
      const hasDef = sel.querySelector('option[value="-1"]');
      sel.innerHTML = hasDef ? `<option value="-1">${hasDef.textContent}</option>` : '';
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${h} (Col ${idx})`;
        sel.appendChild(opt);
      });
    });
    
    const headersLower = headers.map(h => h.toLowerCase());
    
    const idIdx = headersLower.findIndex(h => h === 'id' || h.includes('id_sous') || h.includes('code') || h.includes('activit') || h.includes('nom'));
    if (idIdx >= 0 && document.getElementById('colPmgStep4SubId')) document.getElementById('colPmgStep4SubId').value = idIdx;
    
    const modeIdx = headersLower.findIndex(h => h.includes('mode') || h.includes('realisation') || h.includes('réalisation'));
    if (modeIdx >= 0 && document.getElementById('colPmgStep4RealizationMode')) document.getElementById('colPmgStep4RealizationMode').value = modeIdx;

    const caseIdx = headersLower.findIndex(h => h.includes('cas') || h.includes('applicable') || h.includes('condition'));
    if (caseIdx >= 0 && document.getElementById('colPmgStep4ApplicableCase')) document.getElementById('colPmgStep4ApplicableCase').value = caseIdx;

    const commentIdx = headersLower.findIndex(h => h.includes('comment') || h.includes('remarque') || h.includes('note'));
    if (commentIdx >= 0 && document.getElementById('colPmgStep4Comment')) document.getElementById('colPmgStep4Comment').value = commentIdx;
    
    document.getElementById('btnPmgStep4Finish').disabled = false;
    window.updatePmgStepPreview(4);
  }
};

window.populatePmgBulkMappingDropdowns = function() {
  const fileData = window.pmgUploadedFiles['bulk'];
  if (!fileData) return;
  
  const headers = fileData.headers;
  const selects = [
    document.getElementById('colPmgBulkSubId'),
    document.getElementById('colPmgBulkSubName'),
    document.getElementById('colPmgBulkSubParent'),
    document.getElementById('colPmgBulkSubLevel'),
    document.getElementById('colPmgBulkStakeholder'),
    document.getElementById('colPmgBulkVarInputs'),
    document.getElementById('colPmgBulkVarOutputs'),
    document.getElementById('colPmgBulkVarName'),
    document.getElementById('colPmgBulkVarType')
  ];
  
  selects.forEach(sel => {
    const hasDef = sel.querySelector('option[value="-1"]');
    sel.innerHTML = hasDef ? '<option value="-1">-- Non défini --</option>' : '';
    headers.forEach((h, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${h} (Col ${idx})`;
      sel.appendChild(opt);
    });
  });
  
  const headersLower = headers.map(h => h.toLowerCase());
  
  const idIdx = headersLower.findIndex(h => h === 'id' || h.includes('id_sous') || h.includes('id sous') || h.includes('subprocess_id') || h.includes('subprocessid') || h.includes('code'));
  if (idIdx >= 0) document.getElementById('colPmgBulkSubId').value = idIdx;
  
  const nameIdx = headersLower.findIndex(h => h.includes('nom') || h.includes('name') || h.includes('libelle') || h.includes('libellé') || h.includes('processus') || h.includes('label'));
  if (nameIdx >= 0) document.getElementById('colPmgBulkSubName').value = nameIdx;
  
  const parentIdx = headersLower.findIndex(h => h.includes('parent') || h.includes('parent_id') || h.includes('parentid') || h.includes('parent_process'));
  if (parentIdx >= 0) document.getElementById('colPmgBulkSubParent').value = parentIdx;
  
  const levelIdx = headersLower.findIndex(h => h.includes('level') || h.includes('niveau') || h.includes('hiérarchie') || h.includes('hierarchie'));
  if (levelIdx >= 0) document.getElementById('colPmgBulkSubLevel').value = levelIdx;
  
  const stakeholderIdx = headersLower.findIndex(h => h.includes('partie') || h.includes('acteur') || h.includes('role') || h.includes('rôle') || h.includes('entite') || h.includes('entité') || h.includes('stakeholder') || h.includes('entity'));
  if (stakeholderIdx >= 0) document.getElementById('colPmgBulkStakeholder').value = stakeholderIdx;
  
  const inputsIdx = headersLower.findIndex(h => h.includes('input') || h.includes('entrée') || h.includes('entree'));
  if (inputsIdx >= 0) document.getElementById('colPmgBulkVarInputs').value = inputsIdx;
  
  const outputsIdx = headersLower.findIndex(h => h.includes('output') || h.includes('sortie') || h.includes('sorties'));
  if (outputsIdx >= 0) document.getElementById('colPmgBulkVarOutputs').value = outputsIdx;
  
  const varNameIdx = headersLower.findIndex(h => h.includes('variable') || h.includes('var') || h.includes('nom_var') || h.includes('nom variable'));
  if (varNameIdx >= 0) document.getElementById('colPmgBulkVarName').value = varNameIdx;
  
  const typeIdx = headersLower.findIndex(h => h.includes('type') || h.includes('flux') || h.includes('direction'));
  if (typeIdx >= 0) document.getElementById('colPmgBulkVarType').value = typeIdx;

  const caseIdx = headersLower.findIndex(h => h.includes('cas') || h.includes('condition') || h.includes('règle') || h.includes('rule'));
  if (caseIdx >= 0) document.getElementById('colPmgBulkCase').value = caseIdx;

  const commentIdx = headersLower.findIndex(h => h.includes('commentaire') || h.includes('comment') || h.includes('note'));
  if (commentIdx >= 0) document.getElementById('colPmgBulkComment').value = commentIdx;
  
  document.getElementById('btnPmgBulkFinish').disabled = false;
  window.updatePmgBulkPreview();
};

// Helper function to parse activities for Step 1 with multi-level hierarchy resolution and multi-activity cell splitting
window.parsePmgStep1Activities = function(fileData) {
  if (!fileData || !fileData.raw) return [];
  
  const colId = parseInt(document.getElementById('colPmgSubId')?.value, 10);
  const colName = parseInt(document.getElementById('colPmgSubName')?.value, 10);
  const colParent = parseInt(document.getElementById('colPmgSubParent')?.value, 10);
  const colType = parseInt(document.getElementById('colPmgActivityType')?.value, 10);
  const sepInput = document.getElementById('pmgMultiActivitySeparator')?.value || ',';

  if (isNaN(colName) || colName < 0) return [];

  let rawItems = [];
  let itemCounter = 1;
  const createdIds = new Set();

  // Pass 1: Raw Extraction & Splitting Multi-activity Cells
  fileData.raw.forEach((row, rowIndex) => {
    const rawActivityCell = String(row[colName] || '').trim();
    if (!rawActivityCell) return;

    const parentVal = colParent >= 0 ? String(row[colParent] || '').trim() : '';
    const typeValRaw = colType >= 0 ? String(row[colType] || '').trim() : '';

    const escapedSep = sepInput.replace(/[-[\]{}()*+?.:\\^$|#\s]/g, '\\$&');
    const sepRegex = new RegExp(`[${escapedSep}\n\r;]+`);
    const actNames = rawActivityCell.split(sepRegex).map(s => s.trim()).filter(s => s.length > 0);

    actNames.forEach((actName) => {
      let idVal = colId >= 0 ? String(row[colId] || '').trim() : '';
      if (!idVal || actNames.length > 1 || createdIds.has(idVal)) {
        idVal = `act_${itemCounter}_${actName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
      createdIds.add(idVal);

      rawItems.push({
        id: idVal,
        name: actName,
        parentVal: parentVal,
        typeValRaw: typeValRaw,
        originalRow: rowIndex + 1,
        inputs: [],
        outputs: [],
        entity: 'Non défini'
      });

      itemCounter++;
    });
  });

  if (rawItems.length === 0) return [];

  // Pass 2: Build Lookup Maps & Parent Reference Counters
  const mapByName = new Map();
  const mapById = new Map();
  const parentRefCounts = new Map();

  rawItems.forEach(item => {
    mapByName.set(item.name.toLowerCase(), item);
    mapById.set(item.id.toLowerCase(), item);
    if (item.parentVal) {
      const pKey = item.parentVal.toLowerCase();
      parentRefCounts.set(pKey, (parentRefCounts.get(pKey) || 0) + 1);
    }
  });

  const findParentItem = (pVal) => {
    if (!pVal) return null;
    const key = pVal.toLowerCase();
    return mapByName.get(key) || mapById.get(key) || null;
  };

  // Pass 3: Multi-level Recursive Level Computation & Smart Type Auto-Detection
  const levelCache = new Map();

  const getLevel = (item, visited = new Set()) => {
    if (!item || !item.parentVal) return 1;
    if (visited.has(item.id)) return 1; // Prevent circular dependency deadlock
    if (levelCache.has(item.id)) return levelCache.get(item.id);

    visited.add(item.id);
    const pItem = findParentItem(item.parentVal);
    
    let lvl = 1;
    if (pItem) {
      lvl = 1 + getLevel(pItem, visited);
    } else {
      // Parent is an external parent name (not listed as a row name) -> Level 2
      lvl = 2;
    }
    
    levelCache.set(item.id, lvl);
    return lvl;
  };

  let parsedList = rawItems.map(item => {
    const isRoot = !item.parentVal;
    const parentName = isRoot ? 'Processus Parent (Racine)' : item.parentVal;
    const level = getLevel(item);

    // Type resolution:
    // 1) Explicit type if mapped and non-empty
    // 2) Auto-detect: if referenced as a parent by other items -> Sous-processus
    // 3) Fallback -> User Task
    let actType = item.typeValRaw;
    if (!actType) {
      const lowerName = item.name.toLowerCase();
      const hasChildren = (parentRefCounts.get(item.name.toLowerCase()) || 0) > 0 || (parentRefCounts.get(item.id.toLowerCase()) || 0) > 0;

      if (hasChildren || lowerName.includes('sous-processus') || lowerName.includes('sous processus') || lowerName.includes('subprocess') || lowerName.includes('call activity')) {
        actType = 'Sous-processus';
      } else if (lowerName.includes('service')) {
        actType = 'Service Task';
      } else if (lowerName.includes('script')) {
        actType = 'Script Task';
      } else if (lowerName.includes('manuel') || lowerName.includes('manual')) {
        actType = 'Manual Task';
      } else {
        actType = 'User Task';
      }
    } else {
      const lowerT = actType.toLowerCase();
      if (lowerT.includes('sous') || lowerT.includes('subprocess') || lowerT.includes('call')) {
        actType = 'Sous-processus';
      } else if (lowerT.includes('user')) {
        actType = 'User Task';
      } else if (lowerT.includes('service')) {
        actType = 'Service Task';
      } else if (lowerT.includes('script')) {
        actType = 'Script Task';
      } else if (lowerT.includes('manu')) {
        actType = 'Manual Task';
      }
    }

    return {
      id: item.id,
      name: item.name,
      parentId: isRoot ? '' : item.parentVal,
      parentName: parentName,
      type: actType,
      typeLabel: actType,
      level: level,
      originalRow: item.originalRow,
      inputs: [],
      outputs: [],
      entity: 'Non défini'
    };
  });

  return parsedList;
};

// Previews
window.updatePmgStepPreview = function(step) {
  const fileData = window.pmgUploadedFiles['step' + step];
  if (!fileData) return;
  
  const raw = fileData.raw;
  const previewBox = document.getElementById(`previewBoxPmgStep${step}`);
  if (!previewBox) return;
  
  let html = '';
  
  if (step === 1) {
    const activities = window.parsePmgStep1Activities(fileData);
    
    if (activities.length === 0) {
      previewBox.innerHTML = '<span style="color: var(--text-tertiary);">Veuillez sélectionner la colonne contenant le nom des activités.</span>';
      return;
    }

    const maxLevel = Math.max(...activities.map(a => a.level));
    const subProcCount = activities.filter(a => a.type.toLowerCase().includes('sous-processus') || a.type.toLowerCase().includes('call')).length;
    const taskCount = activities.length - subProcCount;

    const levelColors = [
      '#3b82f6', // Level 1 (Blue)
      '#06b6d4', // Level 2 (Cyan)
      '#f59e0b', // Level 3 (Amber)
      '#8b5cf6', // Level 4 (Purple)
      '#ec4899', // Level 5 (Pink)
      '#ef4444', // Level 6 (Red)
      '#10b981', // Level 7 (Emerald)
      '#6366f1'  // Level 8 (Indigo)
    ];

    html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
        <span style="font-weight:600; color:var(--text-primary);">
          Total activités extraites : <span style="color:var(--brand-primary);">${activities.length}</span>
        </span>
        <span style="font-size:11px; color:var(--text-secondary); background:var(--bg-card); padding:4px 8px; border-radius:4px; border:1px solid var(--border-color);">
          Profond. max : <strong>Niveau ${maxLevel}</strong> | ${subProcCount} sous-processus, ${taskCount} tâches
        </span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color); text-align:left; background:var(--bg-card);">
              <th style="padding:6px; width:40px;">N°</th>
              <th style="padding:6px;">Nom de l'Activité</th>
              <th style="padding:6px; width:130px;">Type</th>
              <th style="padding:6px;">Parent Direct</th>
              <th style="padding:6px; width:100px;">Niveau</th>
            </tr>
          </thead>
          <tbody>
    `;

    activities.slice(0, 30).forEach((act, i) => {
      const isRoot = act.parentId === '';
      const isSub = act.type.toLowerCase().includes('sous-processus') || act.type.toLowerCase().includes('call');
      const typeBg = isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      const typeColor = isSub ? 'var(--brand-primary)' : 'var(--ok)';
      const lvlColor = levelColors[(act.level - 1) % levelColors.length];

      html += `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:6px; color:var(--text-tertiary);">${i + 1}</td>
          <td style="padding:6px; font-weight:500;">
            <span style="display:inline-block; margin-left:${(act.level - 1) * 16}px;">
              ${act.level > 1 ? '<span style="color:' + lvlColor + ';">└─ </span>' : ''}<strong>${escHtml(act.name)}</strong>
            </span>
          </td>
          <td style="padding:6px;">
            <span style="background:${typeBg}; color:${typeColor}; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600;">
              ${escHtml(act.type)}
            </span>
          </td>
          <td style="padding:6px; color:${isRoot ? 'var(--text-tertiary)' : 'var(--text-primary)'}; font-style:${isRoot ? 'italic' : 'normal'};">
            ${escHtml(act.parentName)}
          </td>
          <td style="padding:6px;">
            <span style="background:rgba(255,255,255,0.05); color:${lvlColor}; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; border:1px solid ${lvlColor}44;">
              Niveau ${escHtml(act.level)}
            </span>
          </td>
        </tr>
      `;
    });

    if (activities.length > 30) {
      html += `
        <tr>
          <td colspan="5" style="padding:8px; text-align:center; color:var(--text-tertiary); font-style:italic;">
            ... et ${activities.length - 30} autres activités (visibles après validation).
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    previewBox.innerHTML = html;

    // Render Interactive Visual Tree View component
    window.renderPmgVisualTree(activities);

  } else if (step === 2) {
    const colSubId = parseInt(document.getElementById('colPmgStakeholderSubId')?.value, 10);
    const colEntity = parseInt(document.getElementById('colPmgStakeholderName')?.value, 10);
    const colGroup = parseInt(document.getElementById('colPmgStakeholderGroup')?.value, 10);
    
    html = `<strong>Total lignes : ${raw.length}</strong><br>`;
    const count = Math.min(raw.length, 5);
    
    for (let i = 0; i < count; i++) {
      const subIdVal = colSubId >= 0 ? raw[i][colSubId] || '' : '';
      const entityVal = colEntity >= 0 ? raw[i][colEntity] || 'Non défini' : 'Non défini';
      const groupVal = colGroup >= 0 ? raw[i][colGroup] || 'Aucun' : 'Aucun';
      html += `• Activité/ID: <span style="color:var(--brand-primary);">${escHtml(subIdVal || 'Ligne ' + (i+1))}</span> | Entité: <span>${escHtml(entityVal)}</span> | Groupe: <span>${escHtml(groupVal)}</span><br>`;
    }
    previewBox.innerHTML = html;
    
  } else if (step === 3) {
    const count = Math.min(raw.length, 5);
    const style = document.getElementById('pmgVarMappingStyle')?.value || 'separate';
    html = `<strong>Total lignes : ${raw.length}</strong><br>`;
    
    if (style === 'separate') {
      const colSubId = parseInt(document.getElementById('colPmgVarSubIdSep')?.value, 10);
      const colIn = parseInt(document.getElementById('colPmgVarInputs')?.value, 10);
      const colOut = parseInt(document.getElementById('colPmgVarOutputs')?.value, 10);
      
      for (let i = 0; i < count; i++) {
        const subIdVal = colSubId >= 0 ? raw[i][colSubId] || '' : '';
        const inVal = colIn >= 0 ? raw[i][colIn] || 'Aucune' : 'Aucune';
        const outVal = colOut >= 0 ? raw[i][colOut] || 'Aucune' : 'Aucune';
        html += `• Activité/ID: <span style="color:var(--brand-primary);">${escHtml(subIdVal || 'Ligne ' + (i+1))}</span> | Inputs: <span>${escHtml(inVal)}</span> | Outputs: <span>${escHtml(outVal)}</span><br>`;
      }
    } else {
      const colSubId = parseInt(document.getElementById('colPmgVarSubIdRow')?.value, 10);
      const colName = parseInt(document.getElementById('colPmgVarName')?.value, 10);
      const colType = parseInt(document.getElementById('colPmgVarType')?.value, 10);
      
      for (let i = 0; i < count; i++) {
        const subIdVal = colSubId >= 0 ? raw[i][colSubId] || '' : '';
        const varNameVal = colName >= 0 ? raw[i][colName] || '' : '';
        const typeVal = colType >= 0 ? raw[i][colType] || '' : '';
        html += `• Activité/ID: <span style="color:var(--brand-primary);">${escHtml(subIdVal || 'Ligne ' + (i+1))}</span> | Variable: <span>${escHtml(varNameVal)}</span> | Type: <span>${escHtml(typeVal)}</span><br>`;
      }
    }
    previewBox.innerHTML = html;

  } else if (step === 4) {
    const count = Math.min(raw.length, 5);
    const colSubId = parseInt(document.getElementById('colPmgStep4SubId')?.value, 10);
    const colMode = parseInt(document.getElementById('colPmgStep4RealizationMode')?.value, 10);
    const colCase = parseInt(document.getElementById('colPmgStep4ApplicableCase')?.value, 10);
    const colComment = parseInt(document.getElementById('colPmgStep4Comment')?.value, 10);
    
    html = `<strong>Total lignes : ${raw.length}</strong><br>`;
    for (let i = 0; i < count; i++) {
      const subIdVal = colSubId >= 0 ? raw[i][colSubId] || '' : '';
      const modeVal = colMode >= 0 ? raw[i][colMode] || 'Par défaut' : 'Par défaut';
      const caseVal = colCase >= 0 ? raw[i][colCase] || 'Aucun' : 'Aucun';
      const commentVal = colComment >= 0 ? raw[i][colComment] || 'Aucun' : 'Aucun';
      html += `• Activité/ID: <span style="color:var(--brand-primary);">${escHtml(subIdVal || 'Ligne ' + (i+1))}</span> | Mode: <span>${escHtml(modeVal)}</span> | Cas: <span>${escHtml(caseVal)}</span> | Commentaire: <span>${escHtml(commentVal)}</span><br>`;
    }
    previewBox.innerHTML = html;
  }
};

window.updatePmgBulkPreview = function() {
  const fileData = window.pmgUploadedFiles['bulk'];
  if (!fileData) return;
  
  const raw = fileData.raw;
  const previewBox = document.getElementById('previewBoxPmgBulk');
  if (!previewBox) return;
  
  const colId = parseInt(document.getElementById('colPmgBulkSubId').value, 10);
  const colName = parseInt(document.getElementById('colPmgBulkSubName').value, 10);
  const colParent = parseInt(document.getElementById('colPmgBulkSubParent').value, 10);
  const colLevel = parseInt(document.getElementById('colPmgBulkSubLevel').value, 10);
  const colStake = parseInt(document.getElementById('colPmgBulkStakeholder').value, 10);
  
  let html = `<strong>Total lignes : ${raw.length}</strong><br>`;
  const count = Math.min(raw.length, 4);
  
  for (let i = 0; i < count; i++) {
    const idVal = raw[i][colId] || '';
    const nameVal = raw[i][colName] || '';
    const parentVal = colParent >= 0 ? raw[i][colParent] || 'Aucun' : 'Aucun';
    const levelVal = colLevel >= 0 ? raw[i][colLevel] || '1' : '1';
    const stakeVal = colStake >= 0 ? raw[i][colStake] || 'Non défini' : 'Non défini';
    html += `• ID: <span style="color:var(--brand-primary);">${escHtml(idVal)}</span> | Nom: <span>${escHtml(nameVal)}</span> | Parent: <span>${escHtml(parentVal)}</span> | Niveau: <span>${escHtml(levelVal)}</span> | Acteur: <span>${escHtml(stakeVal)}</span><br>`;
  }
  
  previewBox.innerHTML = html;
};

// Step 2 Mode switcher (Excel vs Manual)
window.onChangePmgStep2AssignMode = function() {
  const mode = document.querySelector('input[name="pmgStep2AssignMode"]:checked')?.value || 'excel';
  const excelContainer = document.getElementById('pmgStep2ExcelContainer');
  const manualContainer = document.getElementById('pmgStep2ManualContainer');
  if (excelContainer) excelContainer.style.display = mode === 'excel' ? 'block' : 'none';
  if (manualContainer) manualContainer.style.display = mode === 'manual' ? 'block' : 'none';
  
  if (mode === 'manual') {
    window.renderPmgStep2ManualTable();
  }
};


// =========================================================================
// PMG USER GROUP <-> POOL/LANE MAPPING & ENTITY INHERITANCE SYSTEM
// =========================================================================

window.pmgUserGroupMappings = {}; // Map of userGroupName -> { targetEntity: '...', isCustom: true }

window.openPmgUserGroupMappingModal = function() {
  const modal = document.getElementById('modalPmgUserGroupMapping');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgUserGroupMappingContent();
};

window.closePmgUserGroupMappingModal = function() {
  const modal = document.getElementById('modalPmgUserGroupMapping');
  if (modal) modal.style.display = 'none';
};

window.renderPmgUserGroupMappingContent = function() {
  const container = document.getElementById('pmgUserGroupMappingModalBody');
  if (!container) return;

  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  
  // 1. Collect all distinct user groups from user tasks
  const groupStats = new Map(); // groupName -> { count: N, associatedLanes: Set(), sampleActs: [] }
  const allKnownLanes = new Set();

  activities.forEach(act => {
    if (act.entity && act.entity !== 'Non défini') {
      allKnownLanes.add(act.entity);
    }
    const isUser = (act.type || '').toLowerCase().includes('user');
    if (isUser && act.userGroup && act.userGroup.trim().length > 0) {
      const gName = act.userGroup.trim();
      if (!groupStats.has(gName)) {
        groupStats.set(gName, { count: 0, associatedLanes: new Set(), sampleActs: [] });
      }
      const st = groupStats.get(gName);
      st.count++;
      if (act.entity && act.entity !== 'Non défini') st.associatedLanes.add(act.entity);
      if (st.sampleActs.length < 3) st.sampleActs.push(act.name);
    }
  });

  const lanesList = Array.from(allKnownLanes).sort();

  if (groupStats.size === 0) {
    container.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12.5px;">⚠️ Aucun groupe candidat (camunda:candidateGroups / zeebe:assignmentDefinition) n\'a été trouvé sur les User Tasks du lot BPMN.</div>';
    return;
  }

  let rowsHtml = '';
  let rowIdx = 0;

  groupStats.forEach((st, gName) => {
    const currentMapped = window.pmgUserGroupMappings[gName]?.targetEntity || Array.from(st.associatedLanes)[0] || '';
    const lanesStr = Array.from(st.associatedLanes).join(', ') || '<span style="color:var(--text-tertiary); font-style:italic;">Aucune Lane</span>';

    // Build Lane/Pool datalist options
    let optionsHtml = '';
    lanesList.forEach(l => {
      optionsHtml += `<option value="${escAttr(l)}">${escHtml(l)}</option>`;
    });

    rowsHtml += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px 8px; vertical-align: middle;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">👤</span>
            <strong style="color:var(--text-primary); font-size:12.5px;">${escHtml(gName)}</strong>
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">Ex: ${escHtml(st.sampleActs.join(', '))}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; vertical-align: middle;">
          <span style="font-size:11.5px; font-weight:700; background:rgba(0, 156, 215, 0.1); color:var(--brand-primary); padding:2px 8px; border-radius:10px;">
            ${st.count} tâche(s)
          </span>
        </td>
        <td style="padding: 10px 8px; font-size:11.5px; color:var(--text-secondary); vertical-align: middle;">
          ${lanesStr}
        </td>
        <td style="padding: 8px 6px; vertical-align: middle;">
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" id="pmgMappedEntity_${rowIdx}" list="pmgKnownLanesList" value="${escAttr(currentMapped)}" placeholder="Saisir ou choisir une Lane / Entité..." style="flex:1; height:32px; font-size:12px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-primary); padding:4px 8px;" onchange="savePmgSingleGroupMapping('${escAttr(gName)}', this.value)">
          </div>
        </td>
      </tr>
    `;
    rowIdx++;
  });

  container.innerHTML = `
    <datalist id="pmgKnownLanesList">
      ${lanesList.map(l => `<option value="${escAttr(l)}">`).join('')}
    </datalist>

    <div style="margin-bottom:14px; background:rgba(99, 102, 241, 0.06); border:1px solid rgba(99, 102, 241, 0.25); border-radius:6px; padding:12px 16px; font-size:12px; color:var(--text-secondary); line-height:1.5;">
      💡 <strong>Gestion des Groupes Transverses &amp; Rôles Déportés :</strong> Si un groupe d'utilisateurs (ex: <em>Auditeurs_Fraude</em>) intervient sur une Lane différente de son entité de rattachement (ex: <em>Pôle Conformité</em>), spécifiez ici son <strong>Entité Référente</strong>. Vous pourrez ensuite appliquer cette règle à toutes les tâches correspondantes en 1 clic.
    </div>

    <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow-x:auto; background:var(--bg-card);">
      <table style="width:100%; font-size:12px; border-collapse:collapse;">
        <thead>
          <tr style="background:var(--bg-card); border-bottom:1px solid var(--border-color); text-align:left;">
            <th style="padding:10px;">Groupe Utilisateur BPMN</th>
            <th style="padding:10px; width:100px; text-align:center;">Occurrences</th>
            <th style="padding:10px; width:220px;">Lanes BPMN actuelles</th>
            <th style="padding:10px; width:280px;">Entité / Lane de Rattachement Cible</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
};

window.savePmgSingleGroupMapping = function(groupName, entityVal) {
  if (!groupName) return;
  window.pmgUserGroupMappings[groupName] = {
    targetEntity: (entityVal || '').trim(),
    isCustom: true
  };
};

window.applyPmgUserGroupMappings = function() {
  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  let updatedCount = 0;

  activities.forEach((act, idx) => {
    const isUser = (act.type || '').toLowerCase().includes('user');
    if (isUser && act.userGroup && act.userGroup.trim().length > 0) {
      const gName = act.userGroup.trim();
      const mapping = window.pmgUserGroupMappings[gName];
      if (mapping && mapping.targetEntity) {
        act.entity = mapping.targetEntity;
        const input = document.getElementById(`pmgEntityInput_${idx}`);
        if (input) input.value = mapping.targetEntity;
        updatedCount++;
      }
    }
  });

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3Kpis) window.renderPmgStep3Kpis();
  window.closePmgUserGroupMappingModal();
  alert(`🚀 Mappage appliqué avec succès : ${updatedCount} tâche(s) utilisateur(s) mise(s) à jour avec leurs entités cibles.`);
};


// =========================================================================
// 🎯 PMG ADVANCED COLUMN FILTER ENGINE (Step 3, 4, 5 & Dynamic Sync)
// =========================================================================

window.pmgColFilters = {
  step3: { act: '', type: 'all', entity: 'all', groupStatus: 'all', groupText: '', preset: null },
  step4: { act: '', type: 'all', inStatus: 'all', inText: '', outStatus: 'all', outText: '', preset: null },
  step5: { act: '', mode: 'all', case: '', comment: '', preset: null }
};

window.syncPmgStepActivityField = function(actId, field, val) {
  const list = window.pmgTempSubprocesses || window.pmgActivities || [];
  const act = list.find(a => a.id === actId);
  if (act) {
    if (field === 'inputs' || field === 'outputs') {
      act[field] = typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : (val || []);
    } else {
      act[field] = val;
    }
    if (field === 'entity') {
      act.isInheritedEntity = false;
    }
  }
};

// Step 3 Filtering & Helpers
window.onPmgStep3FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep3Act');
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
  const groupTextInput = document.getElementById('pmgFilterStep3GroupText');

  window.pmgColFilters.step3.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step3.type = typeSelect?.value || 'all';
  window.pmgColFilters.step3.entity = entitySelect?.value || 'all';
  window.pmgColFilters.step3.groupStatus = groupStatusSelect?.value || 'all';
  window.pmgColFilters.step3.groupText = (groupTextInput?.value || '').trim().toLowerCase();

  // Highlight active filters
  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step3.act));
  if (typeSelect) typeSelect.classList.toggle('has-filter', window.pmgColFilters.step3.type !== 'all');
  if (entitySelect) entitySelect.classList.toggle('has-filter', window.pmgColFilters.step3.entity !== 'all');
  if (groupStatusSelect) groupStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step3.groupStatus !== 'all');
  if (groupTextInput) groupTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step3.groupText));

  window.renderPmgStep2ManualTable();
};

window.clearPmgStep3ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep3Act');
    if (el) el.value = '';
  } else if (field === 'groupText') {
    const el = document.getElementById('pmgFilterStep3GroupText');
    if (el) el.value = '';
  }
  window.onPmgStep3FilterChange();
};

window.resetPmgStep3Filters = function() {
  window.pmgColFilters.step3 = { act: '', type: 'all', entity: 'all', groupStatus: 'all', groupText: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep3Act');
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
  const groupTextInput = document.getElementById('pmgFilterStep3GroupText');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (typeSelect) { typeSelect.value = 'all'; typeSelect.classList.remove('has-filter'); }
  if (entitySelect) { entitySelect.value = 'all'; entitySelect.classList.remove('has-filter'); }
  if (groupStatusSelect) { groupStatusSelect.value = 'all'; groupStatusSelect.classList.remove('has-filter'); }
  if (groupTextInput) { groupTextInput.value = ''; groupTextInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep3FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep2ManualTable();
};

window.togglePmgStep3Preset = function(presetKey) {
  const current = window.pmgColFilters.step3.preset;
  window.resetPmgStep3Filters();

  if (current === presetKey) {
    window.pmgColFilters.step3.preset = null;
    return;
  }

  window.pmgColFilters.step3.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep3' + presetKey.charAt(0).toUpperCase() + presetKey.slice(1));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'userTasks') {
    window.pmgColFilters.step3.type = 'usertask';
    const typeSelect = document.getElementById('pmgFilterStep3Type');
    if (typeSelect) { typeSelect.value = 'usertask'; typeSelect.classList.add('has-filter'); }
  } else if (presetKey === 'noGroup') {
    window.pmgColFilters.step3.groupStatus = 'no_group';
    const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
    if (groupStatusSelect) { groupStatusSelect.value = 'no_group'; groupStatusSelect.classList.add('has-filter'); }
  } else if (presetKey === 'transverse') {
    window.pmgColFilters.step3.groupStatus = 'transverse';
    const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
    if (groupStatusSelect) { groupStatusSelect.value = 'transverse'; groupStatusSelect.classList.add('has-filter'); }
  } else if (presetKey === 'inherited') {
    window.pmgColFilters.step3.entity = '__inherited__';
    const entitySelect = document.getElementById('pmgFilterStep3Entity');
    if (entitySelect) { entitySelect.value = '__inherited__'; entitySelect.classList.add('has-filter'); }
  }

  window.renderPmgStep2ManualTable();
};

// Step 4 Filtering & Helpers
window.onPmgStep4FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep4Act');
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  const inStatusSelect = document.getElementById('pmgFilterStep4InStatus');
  const inTextInput = document.getElementById('pmgFilterStep4InText');
  const outStatusSelect = document.getElementById('pmgFilterStep4OutStatus');
  const outTextInput = document.getElementById('pmgFilterStep4OutText');

  window.pmgColFilters.step4.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step4.type = typeSelect?.value || 'all';
  window.pmgColFilters.step4.inStatus = inStatusSelect?.value || 'all';
  window.pmgColFilters.step4.inText = (inTextInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step4.outStatus = outStatusSelect?.value || 'all';
  window.pmgColFilters.step4.outText = (outTextInput?.value || '').trim().toLowerCase();

  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.act));
  if (typeSelect) typeSelect.classList.toggle('has-filter', window.pmgColFilters.step4.type !== 'all');
  if (inStatusSelect) inStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step4.inStatus !== 'all');
  if (inTextInput) inTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.inText));
  if (outStatusSelect) outStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step4.outStatus !== 'all');
  if (outTextInput) outTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.outText));

  window.renderPmgStep3ManualTable();
};

window.clearPmgStep4ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep4Act');
    if (el) el.value = '';
  } else if (field === 'inText') {
    const el = document.getElementById('pmgFilterStep4InText');
    if (el) el.value = '';
  } else if (field === 'outText') {
    const el = document.getElementById('pmgFilterStep4OutText');
    if (el) el.value = '';
  }
  window.onPmgStep4FilterChange();
};

window.resetPmgStep4Filters = function() {
  window.pmgColFilters.step4 = { act: '', type: 'all', inStatus: 'all', inText: '', outStatus: 'all', outText: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep4Act');
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  const inStatusSelect = document.getElementById('pmgFilterStep4InStatus');
  const inTextInput = document.getElementById('pmgFilterStep4InText');
  const outStatusSelect = document.getElementById('pmgFilterStep4OutStatus');
  const outTextInput = document.getElementById('pmgFilterStep4OutText');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (typeSelect) { typeSelect.value = 'all'; typeSelect.classList.remove('has-filter'); }
  if (inStatusSelect) { inStatusSelect.value = 'all'; inStatusSelect.classList.remove('has-filter'); }
  if (inTextInput) { inTextInput.value = ''; inTextInput.classList.remove('has-filter'); }
  if (outStatusSelect) { outStatusSelect.value = 'all'; outStatusSelect.classList.remove('has-filter'); }
  if (outTextInput) { outTextInput.value = ''; outTextInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep4FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep3ManualTable();
};

window.togglePmgStep4Preset = function(presetKey) {
  const current = window.pmgColFilters.step4.preset;
  window.resetPmgStep4Filters();

  if (current === presetKey) {
    window.pmgColFilters.step4.preset = null;
    return;
  }

  window.pmgColFilters.step4.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep4' + presetKey.charAt(0).toUpperCase() + presetKey.slice(1));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'withInputs') {
    window.pmgColFilters.step4.inStatus = 'has';
    const s = document.getElementById('pmgFilterStep4InStatus');
    if (s) { s.value = 'has'; s.classList.add('has-filter'); }
  } else if (presetKey === 'withOutputs') {
    window.pmgColFilters.step4.outStatus = 'has';
    const s = document.getElementById('pmgFilterStep4OutStatus');
    if (s) { s.value = 'has'; s.classList.add('has-filter'); }
  } else if (presetKey === 'noVars') {
    window.pmgColFilters.step4.inStatus = 'none';
    window.pmgColFilters.step4.outStatus = 'none';
    const s1 = document.getElementById('pmgFilterStep4InStatus');
    const s2 = document.getElementById('pmgFilterStep4OutStatus');
    if (s1) { s1.value = 'none'; s1.classList.add('has-filter'); }
    if (s2) { s2.value = 'none'; s2.classList.add('has-filter'); }
  }

  window.renderPmgStep3ManualTable();
};

// Step 5 Filtering & Helpers
window.onPmgStep5FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep5Act');
  const modeSelect = document.getElementById('pmgFilterStep5Mode');
  const caseInput = document.getElementById('pmgFilterStep5Case');
  const commentInput = document.getElementById('pmgFilterStep5Comment');

  window.pmgColFilters.step5.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step5.mode = modeSelect?.value || 'all';
  window.pmgColFilters.step5.case = (caseInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step5.comment = (commentInput?.value || '').trim().toLowerCase();

  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.act));
  if (modeSelect) modeSelect.classList.toggle('has-filter', window.pmgColFilters.step5.mode !== 'all');
  if (caseInput) caseInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.case));
  if (commentInput) commentInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.comment));

  window.renderPmgStep4ManualTable();
};

window.clearPmgStep5ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep5Act');
    if (el) el.value = '';
  } else if (field === 'case') {
    const el = document.getElementById('pmgFilterStep5Case');
    if (el) el.value = '';
  } else if (field === 'comment') {
    const el = document.getElementById('pmgFilterStep5Comment');
    if (el) el.value = '';
  }
  window.onPmgStep5FilterChange();
};

window.resetPmgStep5Filters = function() {
  window.pmgColFilters.step5 = { act: '', mode: 'all', case: '', comment: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep5Act');
  const modeSelect = document.getElementById('pmgFilterStep5Mode');
  const caseInput = document.getElementById('pmgFilterStep5Case');
  const commentInput = document.getElementById('pmgFilterStep5Comment');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (modeSelect) { modeSelect.value = 'all'; modeSelect.classList.remove('has-filter'); }
  if (caseInput) { caseInput.value = ''; caseInput.classList.remove('has-filter'); }
  if (commentInput) { commentInput.value = ''; commentInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep5FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep4ManualTable();
};

window.togglePmgStep5Preset = function(presetKey) {
  const current = window.pmgColFilters.step5.preset;
  window.resetPmgStep5Filters();

  if (current === presetKey) {
    window.pmgColFilters.step5.preset = null;
    return;
  }

  window.pmgColFilters.step5.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep5' + (presetKey === 'Call Activity' ? 'Call' : presetKey === 'Automatique' ? 'Auto' : presetKey === 'Manuelle' ? 'Manual' : presetKey));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'noDoc') {
    window.pmgColFilters.step5.comment = '__no_doc__';
  } else {
    window.pmgColFilters.step5.mode = presetKey;
    const modeSelect = document.getElementById('pmgFilterStep5Mode');
    if (modeSelect) { modeSelect.value = presetKey; modeSelect.classList.add('has-filter'); }
  }

  window.renderPmgStep4ManualTable();
};

window.renderPmgStep2ManualTable = function() {
  const tbody = document.getElementById('pmgStep2ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\'abord charger des activités.</td></tr>';
    return;
  }

  // Populate dynamic select options in filters if not already done or updated
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  if (typeSelect) {
    const currentVal = window.pmgColFilters.step3.type || 'all';
    const typeMap = new Map();
    activities.forEach(a => {
      const k = window.getPmgTypeKey(a.type || a.typeLabel);
      const l = a.typeLabel || a.type || 'Tâche';
      typeMap.set(k, { label: l, count: (typeMap.get(k)?.count || 0) + 1 });
    });
    let typeOpts = '<option value="all">Tous les types (' + activities.length + ')</option>';
    for (const [k, v] of typeMap.entries()) {
      typeOpts += '<option value="' + escAttr(k) + '" ' + (k === currentVal ? 'selected' : '') + '>' + escHtml(v.label) + ' (' + v.count + ')</option>';
    }
    typeSelect.innerHTML = typeOpts;
  }

  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  if (entitySelect) {
    const currentVal = window.pmgColFilters.step3.entity || 'all';
    const entityMap = new Map();
    activities.forEach(a => {
      const e = (a.entity && a.entity !== 'Non défini') ? a.entity : 'Non défini';
      entityMap.set(e, (entityMap.get(e) || 0) + 1);
    });
    let entOpts = '<option value="all">Toutes les entités (' + activities.length + ')</option>';
    entOpts += '<option value="__inherited__" ' + ('__inherited__' === currentVal ? 'selected' : '') + '>↳ Hérités du Parent</option>';
    for (const [e, count] of entityMap.entries()) {
      entOpts += '<option value="' + escAttr(e) + '" ' + (e === currentVal ? 'selected' : '') + '>' + escHtml(e) + ' (' + count + ')</option>';
    }
    entitySelect.innerHTML = entOpts;
  }

  // Apply filters
  const f = window.pmgColFilters.step3;
  const filtered = activities.filter(act => {
    // 1. Act text (name or id or parentProcessName)
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      const p = (act.parentProcessName || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act) && !p.includes(f.act)) return false;
    }

    // 2. Type filter
    if (f.type !== 'all') {
      const k = window.getPmgTypeKey(act.type || act.typeLabel);
      if (k !== f.type) return false;
    }

    // 3. Entity filter
    if (f.entity !== 'all') {
      if (f.entity === '__inherited__') {
        if (!act.isInheritedEntity) return false;
      } else {
        const ent = (act.entity && act.entity !== 'Non défini') ? act.entity : 'Non défini';
        if (ent !== f.entity) return false;
      }
    }

    // 4. Group Status & Group Text
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const groupVal = (act.userGroup || '').trim();
    const hasGroup = groupVal.length > 0;
    const mapping = hasGroup ? window.pmgUserGroupMappings[groupVal] : null;
    const isTransverse = isUserTask && hasGroup && mapping && mapping.targetEntity && mapping.targetEntity !== (act.entity || '');

    if (f.groupStatus !== 'all') {
      if (f.groupStatus === 'with_group' && (!isUserTask || !hasGroup)) return false;
      if (f.groupStatus === 'no_group' && (!isUserTask || hasGroup)) return false;
      if (f.groupStatus === 'transverse' && !isTransverse) return false;
      if (f.groupStatus === 'not_applicable' && isUserTask) return false;
    }

    if (f.groupText) {
      if (!groupVal.toLowerCase().includes(f.groupText)) return false;
    }

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep3FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres sélectionnés. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep3Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const entityVal = act.entity && act.entity !== 'Non défini' ? act.entity : '';
    const groupVal = (typeof window.cleanPmgUserGroupName === 'function') ? window.cleanPmgUserGroupName(act.userGroup) : (act.userGroup || '');
    const hasGroup = groupVal.trim().length > 0;

    // Check if group is mapped or transverse
    let groupExtraBadge = '';
    if (isUserTask && hasGroup) {
      const mapping = window.pmgUserGroupMappings[groupVal.trim()];
      if (mapping && mapping.targetEntity && mapping.targetEntity !== entityVal) {
        groupExtraBadge = '<span style="background:rgba(245, 158, 11, 0.12); color:var(--warn); padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(245, 158, 11, 0.25);" title="Le groupe ' + escAttr(groupVal) + ' est rattaché à l\'entité ' + escAttr(mapping.targetEntity) + '">⚠️ Transverse : Rattaché à ' + escHtml(mapping.targetEntity) + '</span>';
      }
    }

    let groupCellHtml = '';
    if (isUserTask) {
      if (hasGroup) {
        groupCellHtml = `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_${origIdx}" value="${escAttr(groupVal)}" placeholder="Ex: Validateurs_N1" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'userGroup', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
              <span class="pmg-badge-ok" style="font-size:10px; width:fit-content;">👤 Groupe candidat défini</span>
              ${groupExtraBadge}
            </div>
          </div>
        `;
      } else {
        groupCellHtml = `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_${origIdx}" class="pmg-input-warn" value="" placeholder="⚠️ Saisir le groupe candidat (ex: Gestionnaires_RH)" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'userGroup', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); padding: 4px 8px;">
            <span class="pmg-badge-warn" style="font-size:10px; width:fit-content;">⚠️ Warning : User Task sans groupe candidat</span>
          </div>
        `;
      }
    } else {
      groupCellHtml = `
        <input type="text" id="pmgGroupInput_${origIdx}" value="" placeholder="— Non applicable (${act.typeLabel || act.type})" readonly style="width: 100%; height: 32px; font-size: 11.5px; border-radius: var(--border-radius-md); border: 1px dashed var(--border-color); background: rgba(241, 245, 249, 0.6); color: #94a3b8; padding: 4px 8px; cursor:not-allowed;">
      `;
    }

    const inheritedPill = act.isInheritedEntity 
      ? '<span style="background:rgba(99, 102, 241, 0.1); color:#6366f1; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(99, 102, 241, 0.25); margin-top:4px; display:inline-block;" title="Hérité de la Lane du processus parent">↳ Hérité du Parent</span>' 
      : (entityVal ? '<span class="pmg-badge-info" style="font-size:10px; margin-top:4px; width:fit-content;">🏢 Lane / Pool BPMN</span>' : '<span style="font-size:10px; color:#94a3b8; margin-top:4px; display:block;">Optionnel</span>');

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 14}px;">
            ${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:${(act.level - 1) * 14}px;">id: <code>${escHtml(act.id)}</code> • <em>${escHtml(act.parentProcessName || '')}</em></div>
        </td>
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight:700; ${isUserTask ? 'background: rgba(234, 91, 12, 0.1); color: #ea5b0c; border: 1px solid rgba(234, 91, 12, 0.25);' : 'background: rgba(0, 156, 215, 0.1); color: #009cd7; border: 1px solid rgba(0, 156, 215, 0.25);'}">
            ${escHtml(act.typeLabel || act.type)}
          </span>
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          <input type="text" id="pmgEntityInput_${origIdx}" value="${escAttr(entityVal)}" placeholder="Ex: CDD ou Direction Réseau" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'entity', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
          ${inheritedPill}
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          ${groupCellHtml}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.applyDefaultEntityToAllPmg = function() {
  const def = prompt("Saisissez le nom de l'Entité / Rôle par défaut à appliquer à toutes les activités :", "Équipe Métier");
  if (!def) return;

  const activities = window.pmgTempSubprocesses || [];
  activities.forEach((act, idx) => {
    const input = document.getElementById(`pmgEntityInput_${idx}`);
    if (input) input.value = def;
  });
};

// =========================================================================
// PMG COMPONENT TYPE FILTER SYSTEM (Display & Export)
// =========================================================================

window.pmgTypeFilters = window.pmgTypeFilters || {};

const PMG_TYPE_META = {
  'usertask': { label: 'User Task', icon: '👤', color: '#10b981', category: 'human' },
  'callactivity': { label: 'Call Activity', icon: '📁', color: '#3b82f6', category: 'sub' },
  'subprocess': { label: 'Sous-processus', icon: '📁', color: '#06b6d4', category: 'sub' },
  'scripttask': { label: 'Script Task', icon: '📜', color: '#f59e0b', category: 'auto' },
  'servicetask': { label: 'Service Task', icon: '⚙️', color: '#8b5cf6', category: 'auto' },
  'manualtask': { label: 'Manual Task', icon: '🛠️', color: '#ec4899', category: 'human' },
  'businessruletask': { label: 'Business Rule Task', icon: '📋', color: '#6366f1', category: 'auto' },
  'sendtask': { label: 'Send Task', icon: '📤', color: '#14b8a6', category: 'auto' },
  'receivetask': { label: 'Receive Task', icon: '📥', color: '#0ea5e9', category: 'auto' },
  'task': { label: 'Task (Générique)', icon: '📄', color: '#64748b', category: 'other' }
};

window.getPmgTypeKey = function(rawType) {
  if (!rawType) return 'task';
  const t = String(rawType).toLowerCase().replace(/[^a-z]/g, '');
  if (t.includes('user')) return 'usertask';
  if (t.includes('call')) return 'callactivity';
  if (t.includes('sous') || t.includes('sub')) return 'subprocess';
  if (t.includes('script')) return 'scripttask';
  if (t.includes('service')) return 'servicetask';
  if (t.includes('manual') || t.includes('manuelle')) return 'manualtask';
  if (t.includes('business') || t.includes('rule') || t.includes('dmn')) return 'businessruletask';
  if (t.includes('send')) return 'sendtask';
  if (t.includes('receive')) return 'receivetask';
  return 'task';
};

window.isPmgTypeVisible = function(rawType) {
  if (!window.pmgTypeFilters) return true;
  const key = window.getPmgTypeKey(rawType);
  return window.pmgTypeFilters[key] !== false;
};

window.getPmgFilteredActivities = function() {
  const all = window.pmgActivities || window.pmgTempSubprocesses || [];
  if (!window.pmgTypeFilters) return all;
  return all.filter(act => window.isPmgTypeVisible(act.type || act.typeLabel));
};

window.renderPmgTypeFilterBar = function() {
  const listContainer = document.getElementById('pmgTypeCheckboxesList');
  const summaryBadge = document.getElementById('pmgTypeFilterSummaryBadge');
  if (!listContainer) return;

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (acts.length === 0) {
    listContainer.innerHTML = '<span style="color:var(--text-tertiary); font-size:11.5px;">Chargez un BPMN pour afficher les filtres par type...</span>';
    if (summaryBadge) summaryBadge.textContent = 'En attente de BPMN';
    return;
  }

  // Count items by type
  const counts = {};
  acts.forEach(act => {
    const key = window.getPmgTypeKey(act.type || act.typeLabel);
    counts[key] = (counts[key] || 0) + 1;
    if (window.pmgTypeFilters[key] === undefined) {
      window.pmgTypeFilters[key] = true;
    }
  });

  // Calculate totals
  const allKeys = Object.keys(counts);
  let visibleCount = 0;
  acts.forEach(act => {
    if (window.isPmgTypeVisible(act.type || act.typeLabel)) visibleCount++;
  });

  if (summaryBadge) {
    if (visibleCount === acts.length) {
      summaryBadge.textContent = `Tous les types actifs (${acts.length} act.)`;
      summaryBadge.style.background = 'rgba(16, 185, 129, 0.12)';
      summaryBadge.style.color = 'var(--ok)';
      summaryBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
    } else {
      summaryBadge.textContent = `${visibleCount} / ${acts.length} act. actives`;
      summaryBadge.style.background = 'rgba(245, 158, 11, 0.12)';
      summaryBadge.style.color = 'var(--warn)';
      summaryBadge.style.borderColor = 'rgba(245, 158, 11, 0.25)';
    }
  }

  // Render chips
  let chipsHtml = '';
  allKeys.forEach(typeKey => {
    const meta = PMG_TYPE_META[typeKey] || { label: typeKey, icon: '📄', color: '#64748b' };
    const count = counts[typeKey] || 0;
    const isChecked = window.pmgTypeFilters[typeKey] !== false;
    const chipBg = isChecked ? 'var(--bg-card)' : 'rgba(148, 163, 184, 0.08)';
    const chipBorder = isChecked ? meta.color : 'var(--border-color)';
    const chipOpacity = isChecked ? '1' : '0.6';

    chipsHtml += `
      <label class="pmg-type-chip-item" style="display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:8px; background:${chipBg}; border:1px solid ${chipBorder}; font-size:11.5px; font-weight:600; cursor:pointer; user-select:none; opacity:${chipOpacity}; transition:all 0.15s ease;">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="togglePmgTypeFilter('${typeKey}', this.checked)" style="cursor:pointer; accent-color:${meta.color};">
        <span>${meta.icon} ${meta.label}</span>
        <span style="font-size:10px; padding:1px 6px; border-radius:10px; background:${meta.color}22; color:${meta.color}; border:1px solid ${meta.color}44; font-weight:700;">${count}</span>
      </label>
    `;
  });

  listContainer.innerHTML = chipsHtml;
};

window.togglePmgTypeFilter = function(typeKey, isChecked) {
  window.pmgTypeFilters[typeKey] = isChecked;
  window.renderPmgTypeFilterBar();
  window.renderPmgVisualTree();
  window.renderPmgStep2Kpis();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  if (window.savePmgStateToLocalStorage) window.savePmgStateToLocalStorage();
};

window.selectAllPmgTypeFilters = function(selectAll) {
  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  acts.forEach(act => {
    const key = window.getPmgTypeKey(act.type || act.typeLabel);
    window.pmgTypeFilters[key] = selectAll;
  });
  window.renderPmgTypeFilterBar();
  window.renderPmgVisualTree();
  window.renderPmgStep2Kpis();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  if (window.savePmgStateToLocalStorage) window.savePmgStateToLocalStorage();
};

window.selectPmgPreset = function(preset) {
  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  acts.forEach(act => {
    const key = window.getPmgTypeKey(act.type || act.typeLabel);
    const meta = PMG_TYPE_META[key] || {};
    if (preset === 'humans') {
      window.pmgTypeFilters[key] = (meta.category === 'human' || meta.category === 'sub');
    } else if (preset === 'automations') {
      window.pmgTypeFilters[key] = (meta.category === 'auto' || meta.category === 'sub');
    }
  });
  window.renderPmgTypeFilterBar();
  window.renderPmgVisualTree();
  window.renderPmgStep2Kpis();
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  if (window.savePmgStateToLocalStorage) window.savePmgStateToLocalStorage();
};

// Visual Tree View Component Logic
window.renderPmgVisualTree = function(activities) {
  const container = document.getElementById('pmgVisualTreeContainer');
  const treeBox = document.getElementById('pmgVisualTreeBox');
  if (!container || !treeBox) return;

  let allActs = activities || window.pmgTempSubprocesses || window.pmgActivities || [];
  if (!allActs || allActs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Render filter bars
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

  const batch = window.pmgBatchResult;
  const rootProcesses = (batch && batch.rootProcesses && batch.rootProcesses.length > 0)
    ? batch.rootProcesses
    : (window.pmgRootProcesses || []);

  const levelColors = [
    '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6',
    '#ec4899', '#ef4444', '#10b981', '#6366f1'
  ];

  // Helper function to build a sub-tree of nodes
  function buildTreeHTML(nodes) {
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
          calledElementBadge = `<span style="background:rgba(239, 68, 68, 0.12); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(239, 68, 68, 0.3);" title="Sous-processus introuvable dans le lot importé">⚠️ Cible: ${escHtml(node.calledElement)} (Non trouvé)</span>`;
        } else {
          calledElementBadge = `<span style="background:rgba(59, 130, 246, 0.12); color:var(--brand-primary); padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(59, 130, 246, 0.25);" title="Process ID appelé (calledElement)">🎯 Appelle: ${escHtml(node.calledElement)}</span>`;
        }
      }

      // Explicit Parent Process Name Badge
      const parentName = node.parentProcessName || node.rootParentName || 'Processus Racine';
      const parentBadge = `<span class="pmg-parent-badge" title="Nom du Processus Parent Référent">🏛️ Parent : ${escHtml(parentName)}</span>`;

      // Shared Subprocess Indicator Badge
      let sharedBadge = '';
      if (node.isSharedSubprocess) {
        const sharedParents = node.sharedParentNames && node.sharedParentNames.length > 0 ? node.sharedParentNames.join(', ') : 'Multi-parents';
        sharedBadge = `<span class="pmg-shared-pill" title="Sous-processus transversal partagé par : ${escHtml(sharedParents)}">🔗 Partagé (${(node.sharedParentNames || []).length} parents : ${escHtml(sharedParents)})</span>`;
      }

      // Order Index Pill
      const orderPill = `<span class="pmg-order-pill" title="Position d\'ordonnancement ${window.pmgActivityOrderMode} : #${node.orderIndex || 1}">#${node.orderIndex || 1}</span>`;

      html += `
        <li class="pmg-tree-node" data-name="${escAttr((node.name || '').toLowerCase())}" data-id="${escAttr(safeId)}" data-type="${escAttr(typeKey)}" style="margin:6px 0; opacity:${nodeOpacity};">
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:6px 10px; border-radius:6px; border:1px solid ${nodeBorder}; flex-wrap:wrap;">
            ${hasChildren ? `<button class="tree-toggle-btn" onclick="togglePmgTreeNode(this)" style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:bold; font-size:12px; padding:0 4px;">▼</button>` : `<span style="width:14px; display:inline-block;"></span>`}
            ${orderPill}
            <span style="font-size:14px;">${icon}</span>
            <strong style="color:var(--text-primary); font-size:12px;">${escHtml(node.name)}</strong>
            <span style="background:${isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color:${isSub ? 'var(--brand-primary)' : 'var(--ok)'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">${escHtml(node.typeLabel || node.type)}</span>
            ${parentBadge}
            ${sharedBadge}
            ${calledElementBadge}
            <span style="background:rgba(255,255,255,0.05); color:${lvlColor}; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid ${lvlColor}44; margin-left:auto;">Niveau ${node.level || 1}</span>
            
            <!-- Quick Action Buttons -->
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--brand-primary); border:1px solid var(--border-color);" data-act-id="${escAttr(safeId)}" onclick="openPmgEditTreeNodeModalFromEl(this)" title="Éditer / Réorganiser">✏️ Éditer</button>
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--ok); border:1px solid var(--border-color);" data-act-id="${escAttr(safeId)}" onclick="addNewPmgSubactivityFromEl(this)" title="Ajouter une sous-activité enfant">➕ Enfant</button>
          </div>
          ${hasChildren ? buildTreeHTML(visibleChildren) : ''}
        </li>
      `;
    });
    html += '</ul>';
    return html;
  }

  function hasVisibleDescendant(node) {
    if (node.isVisible) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some(hasVisibleDescendant);
    }
    return false;
  }

  // Determine effective roots to group by
  let targetRoots = rootProcesses;
  if (parentFilter !== 'all' && parentFilter !== 'shared_only') {
    targetRoots = rootProcesses.filter(r => r.id === parentFilter);
  }

  // If no root processes metadata exists, render flat tree
  if (!targetRoots || targetRoots.length === 0 || parentFilter === 'shared_only') {
    const nodeMap = new Map();
    filteredByParentActs.forEach(act => {
      const isVisible = window.isPmgTypeVisible ? window.isPmgTypeVisible(act.type || act.typeLabel) : true;
      const key = act.uniqueId || act.id || act.name;
      nodeMap.set(key, { ...act, isVisible, children: [] });
    });

    const roots = [];
    filteredByParentActs.forEach(act => {
      const key = act.uniqueId || act.id || act.name;
      const node = nodeMap.get(key);
      if (!node) return;
      if (act.parentId && nodeMap.has(act.parentId) && nodeMap.get(act.parentId) !== node) {
        nodeMap.get(act.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const finalHtml = buildTreeHTML(roots);
    treeBox.innerHTML = finalHtml || '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12px;">⚠️ Aucun composant ne correspond aux filtres sélectionnés.</div>';
    return;
  }

  // Render Structured Multi-Parent Sections
  let multiParentHtml = '';

  targetRoots.forEach((rootProc, rIdx) => {
    const parentActs = filteredByParentActs.filter(a => a.rootParentId === rootProc.id);
    if (parentActs.length === 0) return;

    // Build node map for this root parent branch
    const nodeMap = new Map();
    parentActs.forEach(act => {
      const isVisible = window.isPmgTypeVisible ? window.isPmgTypeVisible(act.type || act.typeLabel) : true;
      const key = act.uniqueId || act.id || act.name;
      nodeMap.set(key, { ...act, isVisible, children: [] });
    });

    const branchRoots = [];
    parentActs.forEach(act => {
      const key = act.uniqueId || act.id || act.name;
      const node = nodeMap.get(key);
      if (!node) return;

      if (act.parentId) {
        let parentNode = nodeMap.get(act.parentId);
        if (!parentNode) {
          for (const [k, n] of nodeMap.entries()) {
            if (n.uniqueId === act.parentId || n.id === act.parentId || (n.name && n.name.toLowerCase() === act.parentId.toLowerCase())) {
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
          if (!branchRoots.includes(node)) branchRoots.push(node);
        }
      } else {
        if (!branchRoots.includes(node)) branchRoots.push(node);
      }
    });

    const branchHtml = buildTreeHTML(branchRoots);
    if (!branchHtml) return;

    multiParentHtml += `
      <div class="pmg-tree-parent-card" style="margin-bottom:14px; border:1px solid rgba(99, 102, 241, 0.3); border-radius:8px; overflow:hidden; background:var(--bg-card); box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(90deg, rgba(99, 102, 241, 0.12), rgba(0, 156, 215, 0.08)); padding:10px 14px; border-bottom:1px solid rgba(99, 102, 241, 0.2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:17px;">🏛️</span>
            <div>
              <strong style="color:var(--text-primary); font-size:13px;">Processus Parent P${rIdx + 1} : ${escHtml(rootProc.name)}</strong>
              <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono); margin-top:1px;">Process ID: <code>${escHtml(rootProc.id)}</code> • Fichier: <em>${escHtml(rootProc.fileName || 'source.bpmn')}</em></div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; padding:3px 10px; border-radius:12px; background:rgba(99, 102, 241, 0.2); color:#6366f1; font-weight:700; border:1px solid rgba(99, 102, 241, 0.35);">
              ${parentActs.length} activité(s)
            </span>
          </div>
        </div>
        <div style="padding:10px 12px 14px 12px;">
          ${branchHtml}
        </div>
      </div>
    `;
  });

  if (!multiParentHtml) {
    treeBox.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12px;">⚠️ Aucun composant ne correspond aux filtres de processus ou types sélectionnés.</div>';
  } else {
    treeBox.innerHTML = multiParentHtml;
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

window.validatePmgStep2Activities = function() {
  const fileData = window.pmgUploadedFiles['step1'];
  if (!fileData) {
    alert("Veuillez d'abord charger un fichier pour les activités à l'étape 2.");
    return;
  }
  
  const activities = window.parsePmgStep1Activities(fileData);
  
  if (activities.length === 0) {
    alert("Aucune activité valide trouvée dans le fichier. Veuillez vérifier le mappage de la colonne 'Nom de l'Activité'.");
    return;
  }
  
  window.pmgTempSubprocesses = activities;
  
  alert(`${activities.length} activités extraites et structurées avec succès pour l'étape 2.`);
  
  // Update UI node classes
  document.getElementById('step-node-2').className = 'step-node completed';
  document.getElementById('step-node-3').className = 'step-node active';
  document.getElementById('pmg-step-panel-2').style.display = 'none';
  document.getElementById('pmg-step-panel-3').style.display = 'block';
  window.pmgActiveStep = 3;
  document.getElementById('pmgStepperProgress').style.width = '50%';
  
  if (window.pmgUseSingleFile) {
    window.pmgUploadedFiles['step2'] = { ...fileData };
    document.getElementById('mappingSectionPmgStep2').style.display = 'block';
    window.populatePmgStepMappingDropdowns(2);
  }

  // Pre-populate Step 3 manual table if user switches to manual mode
  window.renderPmgStep2ManualTable();
};

window.validatePmgStep1 = window.validatePmgStep2Activities; // backward alias


// =========================================================================
// 🧹 CLEAN PMG USER GROUP NAME & SMART ENTITY ASSIGNMENT
// =========================================================================

window.cleanPmgUserGroupName = function(raw) {
  if (raw == null) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // 1. Remove leading '=' if present (Camunda 8 / Zeebe FEEL expression indicator)
  if (str.startsWith('=')) {
    str = str.substring(1).trim();
  }

  // 2. If bracketed: =["CDD_SUPPORT_CENTRAL"] or ['A', 'B'] or [groupeResponsable]
  if (str.startsWith('[') && str.endsWith(']')) {
    const inner = str.slice(1, -1).trim();
    try {
      const parsed = JSON.parse('[' + inner.replace(/'/g, '"') + ']');
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean).join(', ');
      }
    } catch (e) {
      // Fallback: use inner without brackets
      str = inner;
    }
  }

  // 3. Remove surrounding single or double quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // 4. Remove residual quotes for list strings
  str = str.replace(/["']/g, '').trim();

  return str;
};

window.openPmgSmartEntityAssignModal = function() {
  const modal = document.getElementById('modalPmgSmartEntityAssign');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgSmartEntityAssignContent();
};

window.closePmgSmartEntityAssignModal = function() {
  const modal = document.getElementById('modalPmgSmartEntityAssign');
  if (modal) modal.style.display = 'none';
};

window.renderPmgSmartEntityAssignContent = function() {
  const container = document.getElementById('pmgSmartEntityAssignModalBody');
  if (!container) return;

  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary);">⚠️ Aucune activité chargée. Veuillez importer des fichiers BPMN à l\'étape 1.</div>';
    return;
  }

  // Extract known entities for quick suggestion chips
  const knownEntities = new Set();
  const knownSubprocesses = new Map(); // id -> name
  let emptyEntityCount = 0;
  let userTasksCount = 0;

  activities.forEach(act => {
    if (act.entity && act.entity !== 'Non défini' && act.entity.trim()) {
      knownEntities.add(act.entity.trim());
    } else {
      emptyEntityCount++;
    }

    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    if (isSub || act.level === 1) {
      knownSubprocesses.set(act.name || act.id, act);
    }

    if ((act.type || '').toLowerCase().includes('user')) {
      userTasksCount++;
    }
  });

  // Suggestion chips HTML
  let suggestionsHtml = '';
  knownEntities.forEach(ent => {
    suggestionsHtml += `<button type="button" class="pmg-filter-pill-btn" onclick="document.getElementById('pmgSmartTargetEntityInput').value='${escAttr(ent)}'; updatePmgSmartEntityPreview();" style="font-size:11px;">🏢 ${escHtml(ent)}</button>`;
  });
  if (!suggestionsHtml) {
    suggestionsHtml = '<span style="font-size:11.5px; color:var(--text-tertiary); font-style:italic;">Aucune entité déjà déclarée</span>';
  }

  // Subprocesses options
  let subOptionsHtml = '<option value="">-- Choisir un sous-processus / activité macro --</option>';
  knownSubprocesses.forEach((sub, name) => {
    subOptionsHtml += `<option value="${escAttr(sub.id)}">${escHtml(sub.name)} (Niveau ${sub.level || 1})</option>`;
  });

  // Unique types
  const typesSet = new Set(activities.map(a => a.typeLabel || a.type).filter(Boolean));
  let typeOptionsHtml = '';
  typesSet.forEach(t => {
    typeOptionsHtml += `<option value="${escAttr(t)}">${escHtml(t)}</option>`;
  });

  // Existing entities to replace
  let replaceOptionsHtml = '';
  knownEntities.forEach(ent => {
    replaceOptionsHtml += `<option value="${escAttr(ent)}">${escHtml(ent)}</option>`;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Section 1 : Périmètre & Stratégie -->
      <div style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:14px;">
        <label style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:block;">
          1. Choisissez la cible / stratégie d'affectation :
        </label>
        
        <div style="display:flex; flex-direction:column; gap:10px; font-size:12.5px;">
          
          <!-- Option 1: Sous-Processus et sa cascade -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="subprocess_cascade" checked onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🌳 Par Sous-Processus &amp; Cascade sur toute sa branche descendante</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Applique l'entité au sous-processus sélectionné ainsi qu'à l'ensemble de ses activités et tâches enfants.</div>
              <div id="pmgSmartSubprocessSelectWrap" style="margin-top:6px;">
                <select id="pmgSmartScopeSubprocess" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  ${subOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 2: Seulement les cases vides -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="empty_only" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>⚠️ Uniquement les activités sans entité (Vides / Non défini)</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Préserve toutes les entités existantes et ne remplit que les <strong>${emptyEntityCount}</strong> case(s) vide(s).</div>
            </div>
          </label>

          <!-- Option 3: Auto-Déduction d'après les Groupes Candidats -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="group_deduction" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🧠 Auto-Déduction Intelligente d'après les Groupes Utilisateurs</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Déduit l'entité directement depuis le préfixe du groupe (ex: <code>CDD_SUPPORT_CENTRAL</code> &rarr; <strong>CDD</strong>, <code>ADV_N1</code> &rarr; <strong>ADV</strong>).</div>
            </div>
          </label>

          <!-- Option 4: Par Type BPMN -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="by_type" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🏷️ Par Type de Composant BPMN</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Appliquer l'entité à un type de tâche spécifique.</div>
              <div id="pmgSmartTypeSelectWrap" style="margin-top:6px; display:none;">
                <select id="pmgSmartScopeType" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  ${typeOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 5: Remplacer une entité -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="replace_entity" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🔄 Remplacer une entité existante</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Remplace toutes les occurrences d'une entité par une nouvelle.</div>
              <div id="pmgSmartReplaceSelectWrap" style="margin-top:6px; display:none;">
                <select id="pmgSmartScopeReplaceSource" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  ${replaceOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 6: Global à toutes les activités -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="all" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🌐 Toutes les activités (${activities.length} activités)</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Écrase et applique la même entité à toutes les lignes.</div>
            </div>
          </label>

        </div>
      </div>

      <!-- Section 2 : Entité cible -->
      <div id="pmgSmartTargetEntitySection" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:14px;">
        <label style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
          2. Entité / Lane cible à affecter :
        </label>
        
        <input type="text" id="pmgSmartTargetEntityInput" placeholder="Ex: CDD, Direction Métier, Support Client..." oninput="updatePmgSmartEntityPreview()" style="width:100%; height:36px; font-size:13px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:6px 10px;">

        <div style="margin-top:10px;">
          <div style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Suggestions rapides (entités détectées) :</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${suggestionsHtml}
          </div>
        </div>
      </div>

      <!-- Section 3 : Aperçu des activités impactées -->
      <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:12px; background:var(--bg-primary); max-height:160px; overflow-y:auto;">
        <div style="font-size:11.5px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
          👁️ Aperçu des activités qui seront modifiées :
        </div>
        <div id="pmgSmartPreviewList" style="font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
          Sélectionnez un sous-processus ou un mode ci-dessus...
        </div>
      </div>

    </div>
  `;

  window.updatePmgSmartEntityPreview();
};

window.getPmgImpactedActivities = function() {
  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  const mode = document.querySelector('input[name="pmgSmartScopeMode"]:checked')?.value || 'subprocess_cascade';
  const targetEntity = (document.getElementById('pmgSmartTargetEntityInput')?.value || '').trim();

  let impacted = [];

  if (mode === 'subprocess_cascade') {
    const subId = document.getElementById('pmgSmartScopeSubprocess')?.value;
    if (subId) {
      const targetSub = activities.find(a => a.id === subId);
      if (targetSub) {
        impacted.push(targetSub);

        // Find all descendants in hierarchy
        const parentKeys = new Set([targetSub.id, targetSub.name]);
        let addedNew = true;
        while (addedNew) {
          addedNew = false;
          activities.forEach(act => {
            if (!impacted.includes(act)) {
              if (parentKeys.has(act.parentId) || parentKeys.has(act.embeddedParentId) || (act.parentProcessId && parentKeys.has(act.parentProcessId))) {
                impacted.push(act);
                parentKeys.add(act.id);
                parentKeys.add(act.name);
                addedNew = true;
              }
            }
          });
        }
      }
    }
  } else if (mode === 'empty_only') {
    impacted = activities.filter(a => !a.entity || a.entity === 'Non défini' || a.entity.trim() === '');
  } else if (mode === 'group_deduction') {
    impacted = activities.filter(a => {
      const g = (a.userGroup || '').trim();
      return g.length > 0;
    });
  } else if (mode === 'by_type') {
    const t = document.getElementById('pmgSmartScopeType')?.value || '';
    impacted = activities.filter(a => (a.typeLabel || a.type) === t);
  } else if (mode === 'replace_entity') {
    const src = document.getElementById('pmgSmartScopeReplaceSource')?.value || '';
    impacted = activities.filter(a => a.entity === src);
  } else if (mode === 'all') {
    impacted = [...activities];
  }

  return { mode, targetEntity, impacted };
};

window.updatePmgSmartEntityPreview = function() {
  const mode = document.querySelector('input[name="pmgSmartScopeMode"]:checked')?.value || 'subprocess_cascade';

  // Toggle sub-selects visibility
  const typeWrap = document.getElementById('pmgSmartTypeSelectWrap');
  const replaceWrap = document.getElementById('pmgSmartReplaceSelectWrap');
  const targetSec = document.getElementById('pmgSmartTargetEntitySection');

  if (typeWrap) typeWrap.style.display = mode === 'by_type' ? 'block' : 'none';
  if (replaceWrap) replaceWrap.style.display = mode === 'replace_entity' ? 'block' : 'none';
  if (targetSec) targetSec.style.display = mode === 'group_deduction' ? 'none' : 'block';

  const { targetEntity, impacted } = window.getPmgImpactedActivities();

  const impactCountEl = document.getElementById('pmgSmartEntityImpactCount');
  if (impactCountEl) {
    impactCountEl.innerHTML = `📊 Impact : <strong>${impacted.length}</strong> activité(s) sélectionnée(s)`;
  }

  const previewListEl = document.getElementById('pmgSmartPreviewList');
  if (previewListEl) {
    if (impacted.length === 0) {
      previewListEl.innerHTML = '<span style="color:var(--text-tertiary); font-style:italic;">Aucune activité ciblée par ce critère.</span>';
    } else {
      let itemsHtml = impacted.slice(0, 15).map(a => {
        let dest = targetEntity || 'Entité cible';
        if (mode === 'group_deduction') {
          const gClean = window.cleanPmgUserGroupName(a.userGroup);
          const prefix = gClean.split('_')[0] || gClean;
          dest = prefix.toUpperCase();
        }
        return `<div style="margin-bottom:3px;">• <strong>${escHtml(a.name)}</strong> (${escHtml(a.typeLabel || a.type)}) : <span style="text-decoration:line-through; color:var(--text-tertiary);">${escHtml(a.entity || 'Non défini')}</span> &rarr; <span style="color:var(--ok); font-weight:700;">${escHtml(dest)}</span></div>`;
      }).join('');

      if (impacted.length > 15) {
        itemsHtml += `<div style="color:var(--brand-primary); font-weight:600; margin-top:4px;">... et ${impacted.length - 15} autre(s) activité(s)</div>`;
      }
      previewListEl.innerHTML = itemsHtml;
    }
  }
};

window.applyPmgSmartEntityAssignment = function() {
  const { mode, targetEntity, impacted } = window.getPmgImpactedActivities();

  if (impacted.length === 0) {
    alert("Aucune activité n'a été sélectionnée.");
    return;
  }

  if (mode !== 'group_deduction' && !targetEntity) {
    alert("Veuillez saisir le nom de l'entité cible à affecter.");
    return;
  }

  let count = 0;
  impacted.forEach(act => {
    if (mode === 'group_deduction') {
      const gClean = window.cleanPmgUserGroupName(act.userGroup);
      const prefix = (gClean.split('_')[0] || gClean).trim().toUpperCase();
      act.entity = prefix || 'Non défini';
      act.isInheritedEntity = false;
      count++;
    } else {
      act.entity = targetEntity;
      act.isInheritedEntity = false;
      count++;
    }
  });

  window.closePmgSmartEntityAssignModal();

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();

  alert(`🎉 Affectation réussie ! ${count} activité(s) mise(s) à jour avec succès.`);
};

window.validatePmgStep3Entities = function() {
  const mode = document.querySelector('input[name="pmgStep2AssignMode"]:checked')?.value || 'excel';

  if (mode === 'manual') {
    const activities = window.pmgTempSubprocesses || [];
    let updatedCount = 0;

    activities.forEach((act, idx) => {
      const entityVal = (document.getElementById(`pmgEntityInput_${idx}`)?.value || '').trim();
      const groupVal = (document.getElementById(`pmgGroupInput_${idx}`)?.value || '').trim();

      act.entity = entityVal || 'Non défini';
      act.userGroup = groupVal || '';
      if (entityVal || groupVal) updatedCount++;
    });

    alert(`Parties prenantes enregistrées pour les activités (${updatedCount} renseignées).`);
  } else {
    const fileData = window.pmgUploadedFiles['step2'] || window.pmgUploadedFiles['step1'];
    if (!fileData) {
      alert("Veuillez charger un fichier pour l'étape 3 ou utiliser la saisie manuelle.");
      return;
    }

    const colSubId = parseInt(document.getElementById('colPmgStakeholderSubId')?.value, 10);
    const colEntity = parseInt(document.getElementById('colPmgStakeholderName')?.value, 10);
    const colGroup = parseInt(document.getElementById('colPmgStakeholderGroup')?.value, 10);

    if (isNaN(colEntity) || colEntity < 0) {
      alert("Veuillez mapper la colonne Entité / Rôle.");
      return;
    }

    let stCount = 0;
    fileData.raw.forEach(row => {
      const subKey = colSubId >= 0 ? String(row[colSubId] || '').trim().toLowerCase() : '';
      const entityVal = String(row[colEntity] || '').trim();
      const groupVal = colGroup >= 0 ? String(row[colGroup] || '').trim() : '';

      if (!entityVal && !groupVal) return;

      const matchedActs = window.pmgTempSubprocesses.filter(s => {
        if (subKey) {
          return s.id.toLowerCase() === subKey || s.name.toLowerCase() === subKey;
        }
        return true;
      });

      matchedActs.forEach(sub => {
        if (entityVal) sub.entity = entityVal;
        if (groupVal) sub.userGroup = groupVal;
        stCount++;
      });
    });

    alert(`Parties prenantes associées via le fichier.`);
  }

  // Advance to Step 4
  document.getElementById('step-node-3').className = 'step-node completed';
  document.getElementById('step-node-4').className = 'step-node active';
  document.getElementById('pmg-step-panel-3').style.display = 'none';
  document.getElementById('pmg-step-panel-4').style.display = 'block';
  window.pmgActiveStep = 4;
  document.getElementById('pmgStepperProgress').style.width = '75%';

  if (window.pmgUseSingleFile) {
    window.pmgUploadedFiles['step3'] = { ...(window.pmgUploadedFiles['step1'] || window.pmgUploadedFiles['step2']) };
    document.getElementById('mappingSectionPmgStep3').style.display = 'block';
    window.populatePmgStepMappingDropdowns(3);
  }

  if (window.renderPmgDataLineageAudit) window.renderPmgDataLineageAudit();
};

window.validatePmgStep2 = window.validatePmgStep3Entities; // backward alias

window.onChangePmgStep3AssignMode = function() {
  const mode = document.querySelector('input[name="pmgStep3AssignMode"]:checked')?.value || 'excel';
  const excelContainer = document.getElementById('pmgStep3ExcelContainer');
  const manualContainer = document.getElementById('pmgStep3ManualContainer');
  if (excelContainer) excelContainer.style.display = mode === 'excel' ? 'block' : 'none';
  if (manualContainer) manualContainer.style.display = mode === 'manual' ? 'block' : 'none';

  if (mode === 'manual') {
    window.renderPmgStep3ManualTable();
  }
};

window.renderPmgStep3ManualTable = function() {
  const tbody = document.getElementById('pmgStep3ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\'abord charger les activités dans l\'étape 2.</td></tr>';
    return;
  }

  // Populate dynamic types in filter
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  if (typeSelect) {
    const currentVal = window.pmgColFilters.step4.type || 'all';
    const typeMap = new Map();
    activities.forEach(a => {
      const k = window.getPmgTypeKey(a.type || a.typeLabel);
      const l = a.typeLabel || a.type || 'Tâche';
      typeMap.set(k, { label: l, count: (typeMap.get(k)?.count || 0) + 1 });
    });
    let typeOpts = '<option value="all">Tous les types (' + activities.length + ')</option>';
    for (const [k, v] of typeMap.entries()) {
      typeOpts += '<option value="' + escAttr(k) + '" ' + (k === currentVal ? 'selected' : '') + '>' + escHtml(v.label) + ' (' + v.count + ')</option>';
    }
    typeSelect.innerHTML = typeOpts;
  }

  // Filter activities
  const f = window.pmgColFilters.step4;
  const filtered = activities.filter(act => {
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act)) return false;
    }

    if (f.type !== 'all') {
      const k = window.getPmgTypeKey(act.type || act.typeLabel);
      if (k !== f.type) return false;
    }

    const ins = act.inputs || [];
    const outs = act.outputs || [];

    if (f.inStatus === 'has' && ins.length === 0) return false;
    if (f.inStatus === 'none' && ins.length > 0) return false;
    if (f.inText && !ins.some(v => v.toLowerCase().includes(f.inText))) return false;

    if (f.outStatus === 'has' && outs.length === 0) return false;
    if (f.outStatus === 'none' && outs.length > 0) return false;
    if (f.outText && !outs.some(v => v.toLowerCase().includes(f.outText))) return false;

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep4FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres variables. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep4Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const inputsVal = (act.inputs || []).join(', ');
    const outputsVal = (act.outputs || []).join(', ');

    const parentProcLabel = act.parentProcessName || act.rootParentName || 'Processus Principal';
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 12}px;">
            ${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:${(act.level - 1) * 12}px; margin-top:2px;">
            id: <code>${escHtml(act.id)}</code> • <em style="color:#009cd7; font-weight:500;">🏛️ ${escHtml(parentProcLabel)}</em>
          </div>
        </td>
        <td style="padding: 8px;">
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: var(--brand-primary); font-weight:600;">
            ${escHtml(act.typeLabel || act.type)}
          </span>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgInputsInput_${origIdx}" value="${escAttr(inputsVal)}" placeholder="Ex: varIn1, varIn2" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'inputs', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgOutputsInput_${origIdx}" value="${escAttr(outputsVal)}" placeholder="Ex: varOut1, varOut2" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'outputs', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.validatePmgStep4Variables = function() {
  const mode = document.querySelector('input[name="pmgStep3AssignMode"]:checked')?.value || 'excel';

  if (mode === 'manual') {
    const activities = window.pmgTempSubprocesses || [];
    let updatedCount = 0;

    activities.forEach((act, idx) => {
      const inText = (document.getElementById(`pmgInputsInput_${idx}`)?.value || '').trim();
      const outText = (document.getElementById(`pmgOutputsInput_${idx}`)?.value || '').trim();

      act.inputs = inText ? inText.split(',').map(v => v.trim()).filter(v => v) : [];
      act.outputs = outText ? outText.split(',').map(v => v.trim()).filter(v => v) : [];
      if (act.inputs.length > 0 || act.outputs.length > 0) updatedCount++;
    });

    alert(`Variables enregistrées pour les activités (${updatedCount} renseignées).`);
  } else {
    const fileData = window.pmgUploadedFiles['step3'] || window.pmgUploadedFiles['step1'];
    if (!fileData) {
      alert("Veuillez charger un fichier pour l'étape 4 ou utiliser la saisie manuelle.");
      return;
    }

    const style = document.getElementById('pmgVarMappingStyle')?.value || 'separate';
    let importedCount = 0;

    if (style === 'separate') {
      const colSubId = parseInt(document.getElementById('colPmgVarSubIdSep')?.value, 10);
      const colIn = parseInt(document.getElementById('colPmgVarInputs')?.value, 10);
      const colOut = parseInt(document.getElementById('colPmgVarOutputs')?.value, 10);
      const sep = document.getElementById('pmgVarSeparator')?.value || ',';

      fileData.raw.forEach(row => {
        const subKey = colSubId >= 0 ? String(row[colSubId] || '').trim().toLowerCase() : '';
        const matchedSubs = window.pmgTempSubprocesses.filter(s => {
          if (!subKey) return true;
          return s.id.toLowerCase() === subKey || s.name.toLowerCase() === subKey;
        });

        if (matchedSubs.length === 0) return;

        matchedSubs.forEach(sub => {
          if (colIn >= 0) {
            const inText = String(row[colIn] || '');
            const inVars = inText.split(sep).map(v => v.trim()).filter(v => v);
            inVars.forEach(v => {
              if (!sub.inputs.includes(v)) {
                sub.inputs.push(v);
                importedCount++;
              }
            });
          }

          if (colOut >= 0) {
            const outText = String(row[colOut] || '');
            const outVars = outText.split(sep).map(v => v.trim()).filter(v => v);
            outVars.forEach(v => {
              if (!sub.outputs.includes(v)) {
                sub.outputs.push(v);
                importedCount++;
              }
            });
          }
        });
      });
    }

    alert(`Variables associées via le fichier.`);
  }

  // Advance to Step 5
  document.getElementById('step-node-4').className = 'step-node completed';
  document.getElementById('step-node-5').className = 'step-node active';
  document.getElementById('pmg-step-panel-4').style.display = 'none';
  document.getElementById('pmg-step-panel-5').style.display = 'block';
  window.pmgActiveStep = 5;
  document.getElementById('pmgStepperProgress').style.width = '100%';

  if (window.pmgUseSingleFile) {
    window.pmgUploadedFiles['step4'] = { ...(window.pmgUploadedFiles['step1'] || window.pmgUploadedFiles['step3']) };
    document.getElementById('mappingSectionPmgStep4').style.display = 'block';
    window.populatePmgStepMappingDropdowns(4);
  }

  // Pre-populate Step 5 manual table
  window.renderPmgStep4ManualTable();
};

window.validatePmgStep3 = window.validatePmgStep4Variables; // backward alias

window.onChangePmgStep4AssignMode = function() {
  const mode = document.querySelector('input[name="pmgStep4AssignMode"]:checked')?.value || 'excel';
  const excelContainer = document.getElementById('pmgStep4ExcelContainer');
  const manualContainer = document.getElementById('pmgStep4ManualContainer');
  if (excelContainer) excelContainer.style.display = mode === 'excel' ? 'block' : 'none';
  if (manualContainer) manualContainer.style.display = mode === 'manual' ? 'block' : 'none';

  if (mode === 'manual') {
    window.renderPmgStep4ManualTable();
  }
};

window.renderPmgStep4ManualTable = function() {
  const tbody = document.getElementById('pmgStep4ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\'abord valider les activités dans l\'étape 2.</td></tr>';
    return;
  }

  const modes = window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

  // Populate mode filter dropdown
  const modeSelectFilter = document.getElementById('pmgFilterStep5Mode');
  if (modeSelectFilter) {
    const currentVal = window.pmgColFilters.step5.mode || 'all';
    let modeOpts = '<option value="all">Tous les modes (' + activities.length + ')</option>';
    modes.forEach(m => {
      const cnt = activities.filter(a => (a.realizationMode || '').toLowerCase() === m.toLowerCase()).length;
      modeOpts += '<option value="' + escAttr(m) + '" ' + (m.toLowerCase() === currentVal.toLowerCase() ? 'selected' : '') + '>' + escHtml(m) + ' (' + cnt + ')</option>';
    });
    modeSelectFilter.innerHTML = modeOpts;
  }

  // Filter activities
  const f = window.pmgColFilters.step5;
  const filtered = activities.filter(act => {
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act)) return false;
    }

    if (f.mode !== 'all') {
      const curMode = (act.realizationMode || '').toLowerCase();
      if (curMode !== f.mode.toLowerCase()) return false;
    }

    if (f.case) {
      const c = (act.applicableCase || '').toLowerCase();
      if (!c.includes(f.case)) return false;
    }

    if (f.comment) {
      const c = (act.comment || '').toLowerCase();
      if (f.comment === '__no_doc__') {
        if (c.trim().length > 0) return false;
      } else {
        if (!c.includes(f.comment)) return false;
      }
    }

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep5FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep5Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const defaultMode = act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle');
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';

    let optionsHtml = '';
    modes.forEach(m => {
      const selected = m.toLowerCase() === defaultMode.toLowerCase() ? 'selected' : '';
      optionsHtml += '<option value="' + escAttr(m) + '" ' + selected + '>' + escHtml(m) + '</option>';
    });

    const parentProcLabel = act.parentProcessName || act.rootParentName || 'Processus Principal';
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 12}px;">
            ${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:${(act.level - 1) * 12}px; margin-top:2px;">
            id: <code>${escHtml(act.id)}</code> • <em style="color:#009cd7; font-weight:500;">🏛️ ${escHtml(parentProcLabel)}</em>
          </div>
        </td>
        <td style="padding: 6px;">
          <select id="pmgModeSelect_${origIdx}" class="srt" onchange="syncPmgStepActivityField('${escAttr(act.id)}', 'realizationMode', this.value)" style="width: 100%; height: 32px; font-size: 12px;">
            ${optionsHtml}
          </select>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCaseInput_${origIdx}" value="${escAttr(caseVal)}" placeholder="Ex: Si dossier prioritaire" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'applicableCase', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCommentInput_${origIdx}" value="${escAttr(commentVal)}" placeholder="Ex: Traitement physique" oninput="syncPmgStepActivityField('${escAttr(act.id)}', 'comment', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.applyDefaultModeToAllPmg = function() {
  const modes = window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];
  const choice = prompt(`Saisissez le Mode de Réalisation par défaut à appliquer :\nOptions : ${modes.join(', ')}`, modes[0]);
  if (!choice) return;

  const activities = window.pmgTempSubprocesses || [];
  activities.forEach((act, idx) => {
    const sel = document.getElementById(`pmgModeSelect_${idx}`);
    if (sel) sel.value = choice;
  });
};

window.validatePmgStep5AndFinish = function() {
  const activities = window.pmgTempSubprocesses || [];
  
  // Collect data directly from DOM step inputs if present
  activities.forEach((act, idx) => {
    // Step 3 (Entities & Groups)
    const entityInput = document.getElementById(`pmgEntityInput_${idx}`);
    if (entityInput) act.entity = entityInput.value.trim() || 'Non défini';
    
    const groupInput = document.getElementById(`pmgGroupInput_${idx}`);
    if (groupInput) act.userGroup = groupInput.value.trim();

    // Step 4 (Inputs & Outputs)
    const inInput = document.getElementById(`pmgInputsInput_${idx}`);
    if (inInput) {
      const val = inInput.value.trim();
      act.inputs = val ? val.split(',').map(v => v.trim()).filter(Boolean) : [];
    }

    const outInput = document.getElementById(`pmgOutputsInput_${idx}`);
    if (outInput) {
      const val = outInput.value.trim();
      act.outputs = val ? val.split(',').map(v => v.trim()).filter(Boolean) : [];
    }

    // Step 5 (Realization Mode, Cases, Comments)
    const modeSel = document.getElementById(`pmgModeSelect_${idx}`);
    if (modeSel) act.realizationMode = modeSel.value.trim();

    const caseIn = document.getElementById(`pmgCaseInput_${idx}`);
    if (caseIn) act.applicableCase = caseIn.value.trim();

    const commIn = document.getElementById(`pmgCommentInput_${idx}`);
    if (commIn) act.comment = commIn.value.trim();
  });

  // Build final window.pmgActivities
  window.pmgActivities = activities.map(sub => {
    const isSub = (sub.type || '').toLowerCase().includes('sous-processus') || (sub.type || '').toLowerCase().includes('call');
    return {
      id: sub.id,
      name: sub.name,
      type: isSub ? 'callactivity' : (sub.type || 'userTask'),
      typeLabel: sub.typeLabel || sub.type || (isSub ? 'Call Activity' : 'User Task'),
      entity: sub.entity || 'Non défini',
      userGroup: sub.userGroup || '',
      inputs: sub.inputs || [],
      outputs: sub.outputs || [],
      applicableCase: sub.applicableCase || '',
      comment: sub.comment || '',
      realizationMode: sub.realizationMode || (isSub ? 'Call Activity' : 'Manuelle'),
      parentId: sub.parentId || '',
      level: sub.level || 1,
      parentProcessId: sub.parentProcessId || '',
      parentProcessName: sub.parentProcessName || ''
    };
  });

  const name = document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Processus Principal';
  const id = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'process-principal';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Équipe PMG / Modélisateur';
  const version = document.getElementById('pmgProcessVersionStep')?.value || document.getElementById('pmgProcessVersion')?.value || 'v1.0.0';
  const desc = document.getElementById('pmgProcessDescStep')?.value || document.getElementById('pmgProcessDesc')?.value || 'Cartographie d\'activités PMG.';

  window.pmgProcessDetails = {
    id: id,
    name: name,
    isExecutable: 'false',
    exporter: exporter,
    exporterVersion: '1.0.0',
    version: version,
    owner: owner,
    desc: desc
  };

  window.savePmgStateToLocalStorage();
  window.analyzePmg();
};

window.validatePmgStep4AndFinish = window.validatePmgStep5AndFinish; // backward alias

// =========================================================================
// ONE-SHOT BPMN BATCH IMPORT & MULTI-PROCESS HIERARCHY RESOLUTION ENGINE
// =========================================================================

window.handlePmgOneShotBpmnFiles = function(files) {
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
  if (uploadTitle) uploadTitle.textContent = `Chargement & Analyse de ${validFiles.length} fichier(s) BPMN...`;
  if (uploadSub) uploadSub.textContent = `Traitement des dépendances et extraction multi-processus en cours...`;

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
      if (uploadTitle) uploadTitle.textContent = `✅ ${validFiles.length} fichier(s) BPMN importé(s) avec succès !`;
      const rootNames = batchResult.rootProcesses.map((r, i) => `P${i + 1}: ${r.name}`).join(', ');
      if (uploadSub) uploadSub.textContent = `${batchResult.rootProcesses.length} processus parent(s) racine(s) (${rootNames}) — ${batchResult.structuredActivities.length} activités extraites`;
    })
    .catch(err => {
      console.error("Erreur lors de l'import BPMN One-Shot :", err);
      alert("Erreur lors de l'analyse des fichiers BPMN : " + (err.message || err));
      if (uploadTitle) uploadTitle.textContent = "Glissez-déposez ici vos fichiers BPMN (Parent + Sous-processus)";
    });
};


// Détecteur intelligent de type d'activité BPMN (Camunda 7, Camunda 8 Zeebe, BPMN 2.0 standard)
window.detectBpmnElementType = function(el, fallbackName) {
  if (!el) return fallbackName || 'task';
  const rawLn = (fallbackName || el.localName || '').toLowerCase();

  // 1. Déjà explicitement balisé
  if (rawLn === 'scripttask') return 'scripttask';
  if (rawLn === 'usertask') return 'usertask';
  if (rawLn === 'businessruletask') return 'businessruletask';
  if (rawLn === 'manualtask') return 'manualtask';
  if (rawLn === 'callactivity') return 'callactivity';
  if (rawLn === 'subprocess' || rawLn === 'sub-process') return 'subprocess';
  if (rawLn === 'sendtask') return 'sendtask';
  if (rawLn === 'receivetask') return 'receivetask';

  // 2. Inspection des balises enfants et extensions Camunda 7 / Zeebe 8
  // A. Script Task (FEEL, Zeebe Script, Groovy, JS)
  const hasScriptTag = !!el.querySelector('script, zeebe\\:script, camunda\\:script');
  const hasScriptFormat = el.hasAttribute('scriptFormat') || el.hasAttribute('camunda:scriptFormat');
  const taskDef = el.querySelector('taskDefinition, zeebe\\:taskDefinition');
  const taskDefType = taskDef ? (taskDef.getAttribute('type') || '').toLowerCase() : '';

  if (hasScriptTag || hasScriptFormat || taskDefType.includes('script') || taskDefType.includes('feel')) {
    return 'scripttask';
  }

  // B. User Task (Zeebe UserTask, FormDefinition, CandidateGroups, Assignee)
  const hasUserTaskTag = !!el.querySelector('userTask, zeebe\\:userTask, formDefinition, zeebe\\:formDefinition, assignmentDefinition, zeebe\\:assignmentDefinition');
  const hasUserAttrs = el.hasAttribute('camunda:candidateGroups') || el.hasAttribute('candidateGroups') || el.hasAttribute('camunda:assignee') || el.hasAttribute('assignee') || el.hasAttribute('camunda:formKey');
  if (hasUserTaskTag || hasUserAttrs) {
    return 'usertask';
  }

  // C. Business Rule / DMN
  const hasDmn = !!el.querySelector('calledDecision, zeebe\\:calledDecision') || el.hasAttribute('camunda:decisionRef') || el.hasAttribute('decisionRef') || taskDefType.includes('dmn') || taskDefType.includes('decision');
  if (hasDmn) {
    return 'businessruletask';
  }

  // D. Call Activity
  const hasCall = !!el.querySelector('calledElement, zeebe\\:calledElement') || el.hasAttribute('calledElement');
  if (hasCall) {
    return 'callactivity';
  }

  // E. Service Task
  if (rawLn === 'servicetask' || taskDef || el.hasAttribute('camunda:delegateExpression') || el.hasAttribute('camunda:topic') || el.hasAttribute('camunda:class') || el.getAttribute('camunda:type') === 'external') {
    return 'servicetask';
  }

  // F. Send / Receive
  if (el.querySelector('messageEventDefinition, bpmn\\:messageEventDefinition')) {
    return 'sendtask';
  }

  return rawLn;
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
        console.warn(`Erreur de parsing XML dans ${entry.fileName}:`, parserError.textContent);
        return;
      }

      parsedFiles.push(entry.fileName);

      // Extract BPMNDI Coordinates (X, Y, Width, Height)
      const shapeMap = new Map();
      const shapes = xmlDoc.querySelectorAll('BPMNShape, bpmndi\\:BPMNShape');
      shapes.forEach(sh => {
        const bpmnEl = sh.getAttribute('bpmnElement');
        if (!bpmnEl) return;
        const bounds = sh.querySelector('Bounds, dc\\:Bounds, bpmndi\\:Bounds');
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
      const participants = xmlDoc.querySelectorAll('participant, bpmn\\:participant');
      participants.forEach(p => {
        const procRef = p.getAttribute('processRef');
        const partName = p.getAttribute('name') || p.getAttribute('id') || '';
        if (procRef && partName) processIdToPool.set(procRef, partName);
      });

      // 2. Extract each Process in this XML
      const processes = xmlDoc.querySelectorAll('process, bpmn\\:process');
      processes.forEach(procEl => {
        const procId = procEl.getAttribute('id') || `Process_${Math.random().toString(36).substr(2, 5)}`;
        const procName = procEl.getAttribute('name') || entry.fileName.replace(/\.(bpmn|xml)$/i, '') || procId;
        const isExecutable = procEl.getAttribute('isExecutable') || 'false';
        
        const procDocEl = procEl.querySelector(':scope > documentation, :scope > bpmn\\:documentation');
        const procDoc = procDocEl ? procDocEl.textContent.trim() : '';

        const defs = xmlDoc.documentElement;
        const exporter = defs.getAttribute('exporter') || 'Camunda Modeler';
        const exporterVersion = defs.getAttribute('exporterVersion') || '5.x';

        // 3. Lane Mapping
        const nodeToLane = new Map();
        const lanes = procEl.querySelectorAll('lane, bpmn\\:lane');
        lanes.forEach(lane => {
          const laneName = lane.getAttribute('name') || lane.getAttribute('id') || '';
          const refs = lane.querySelectorAll('flowNodeRef, bpmn\\:flowNodeRef');
          refs.forEach(ref => {
            const refId = ref.textContent.trim();
            if (refId) nodeToLane.set(refId, laneName);
          });
        });

        // 4. Gateways & Sequence flows mapping
        const gatewayNames = new Map();
        const gateways = procEl.querySelectorAll('exclusiveGateway, bpmn\\:exclusiveGateway, inclusiveGateway, bpmn\\:inclusiveGateway, complexGateway, bpmn\\:complexGateway, eventBasedGateway, bpmn\\:eventBasedGateway');
        gateways.forEach(gw => {
          const gwId = gw.getAttribute('id');
          const gwName = gw.getAttribute('name') || '';
          if (gwId) gatewayNames.set(gwId, gwName);
        });

        const targetToCondition = new Map();
        const seqFlows = procEl.querySelectorAll('sequenceFlow, bpmn\\:sequenceFlow');
        const flowAdj = new Map();
        const incomingCount = new Map();

        seqFlows.forEach(sf => {
          const targetRef = sf.getAttribute('targetRef');
          const sourceRef = sf.getAttribute('sourceRef');
          const sfName = (sf.getAttribute('name') || '').trim();
          const condEl = sf.querySelector('conditionExpression, bpmn\\:conditionExpression');
          let condText = condEl ? condEl.textContent.trim() : '';

          let composedCond = '';
          const gwLabel = sourceRef ? (gatewayNames.get(sourceRef) || '') : '';

          if (gwLabel && sfName) {
            composedCond = `Si [${gwLabel}] = "${sfName}"`;
            if (condText && condText !== sfName) composedCond += ` (${condText})`;
          } else if (gwLabel && condText) {
            composedCond = `Si [${gwLabel}] (${condText})`;
          } else if (sfName && condText && sfName !== condText) {
            composedCond = `Si "${sfName}" (${condText})`;
          } else if (sfName) {
            composedCond = `Si "${sfName}"`;
          } else if (condText) {
            composedCond = `Si ${condText}`;
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
        const startNodes = procEl.querySelectorAll('startEvent, bpmn\\:startEvent');
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

          const rawLocalName = (el.localName || '').toLowerCase();

          if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity', 'subprocess'].includes(rawLocalName)) {
            const localName = window.detectBpmnElementType(el, rawLocalName);
            const actId = el.getAttribute('id') || `act_${activities.length + 1}`;
            const actName = el.getAttribute('name') || actId;

            const rawLaneName = nodeToLane.get(actId) || '';
            let entity = '';
            if (rawLaneName) {
              entity = rawLaneName.replace(/^Lane\s*:\s*/i, '').trim();
            } else if (poolName) {
              entity = poolName.replace(/^Pool\s*:\s*/i, '').trim();
            } else {
              entity = '';
            }

            let userGroup = '';
            let userGroupWarning = false;

            if (localName === 'usertask') {
              userGroup = el.getAttribute('camunda:candidateGroups') || el.getAttribute('candidateGroups') || '';
              if (!userGroup) {
                const assignDef = el.querySelector('assignmentDefinition, zeebe\\:assignmentDefinition');
                if (assignDef) {
                  userGroup = assignDef.getAttribute('candidateGroups') || assignDef.getAttribute('candidateUsers') || '';
                }
              }
              if (!userGroup) {
                userGroup = el.getAttribute('camunda:candidateUsers') || el.getAttribute('candidateUsers') || '';
              }
              if (!userGroup) {
                const assignee = el.getAttribute('camunda:assignee') || el.getAttribute('assignee') || '';
                if (assignee) userGroup = `Assigné: ${assignee}`;
              }
              if (userGroup && typeof window.cleanPmgUserGroupName === 'function') {
                userGroup = window.cleanPmgUserGroupName(userGroup);
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
            const taskDocEl = el.querySelector(':scope > documentation, :scope > bpmn\\:documentation');
            const comment = taskDocEl ? taskDocEl.textContent.trim() : '';
            const { inputs, outputs } = extractIoForNode(el);

            let calledElement = '';
            if (localName === 'callactivity') {
              calledElement = el.getAttribute('calledElement') || '';
              const zeebeCalled = el.querySelector('calledElement, zeebe\\:calledElement');
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
      console.error(`Erreur d'analyse BPMN pour ${entry.fileName}:`, e);
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
    function traverseProcess(procId, currentLevel, parentNodeId, branchPath, rootParent, inheritedEntity) {
      const proc = processCatalog.get(procId);
      if (!proc) {
        missingSubprocesses.push({ calledElement: procId, calledBy: parentNodeId });
        return;
      }

      resolvedSubprocesses.add(procId);

      proc.activities.forEach(act => {
        const uniqueHierarchicalId = `${rootParent.id}_${procId}_${act.id}`;
        const effectiveParentId = act.embeddedParentId 
          ? `${rootParent.id}_${procId}_${act.embeddedParentId}` 
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

        let finalEntity = act.entity || '';
        let isInheritedEntity = false;
        if (!finalEntity && inheritedEntity) {
          finalEntity = inheritedEntity;
          isInheritedEntity = true;
        }

        const activityRecord = {
          ...act,
          id: act.id,
          entity: finalEntity,
          isInheritedEntity: isInheritedEntity,
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
            const nextInheritedEntity = act.entity || inheritedEntity || '';
            traverseProcess(childProcId, currentLevel + 1, uniqueHierarchicalId, nextBranch, rootParent, nextInheritedEntity);
          }
        }
      });
    }

    traverseProcess(rootProc.id, 1, '', rootProc.id, rootProc, '');
  });

  // Append any unresolved unlinked process at level 1
  for (const [procId, procData] of processCatalog.entries()) {
    if (!resolvedSubprocesses.has(procId) && !effectiveRoots.some(r => r.id === procId)) {
      procData.activities.forEach(act => {
        structuredActivities.push({
          ...act,
          id: act.id,
          uniqueId: `orphan_${procId}_${act.id}`,
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
    ? batchResult.rootProcesses.map((r, i) => `P${i + 1}: ${r.name}`).join(' & ')
    : (root.name || '');

  window.pmgProcessDetails = {
    id: root.id || '',
    name: parentNamesTitle || 'Processus Multi-Parents',
    owner: '',
    exporter: root.exporter ? `${root.exporter} ${root.exporterVersion || ''}`.trim() : '',
    version: root.isExecutable === 'true' ? 'v1.0.0' : '',
    badges: batchResult.rootProcesses.length > 1 ? `Multi-Parents (${batchResult.rootProcesses.length})` : 'CDD / CPE / SGP / SP0',
    defaultFille: '',
    desc: root.description || `Cartographie multi-processus (${batchResult.rootProcesses.length} parents, ${batchResult.structuredActivities.length} activités).`
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

window.renderAllPmgStepKpis = function() {
  window.renderPmgStep1Kpis();
  window.renderPmgStep2Kpis();
  window.renderPmgStep3Kpis();
  window.renderPmgStep4Kpis();
  window.renderPmgStep5Kpis();
};

window.renderPmgStep1Kpis = function() {
  const container = document.getElementById('pmgStep1Kpis');
  if (!container) return;

  const details = window.pmgProcessDetails || {};
  const fields = [details.name, details.id, details.owner, details.exporter, details.version, details.desc];
  const filledCount = fields.filter(f => f && f.trim().length > 0).length;
  const pct = Math.round((filledCount / fields.length) * 100);

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];

  container.innerHTML = `
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Complétude Métadonnées</div>
      <div class="pmg-kpi-val" style="color:${pct >= 70 ? 'var(--ok)' : 'var(--warn)'}">${pct}%</div>
      <div class="pmg-kpi-sub">${filledCount} / ${fields.length} champs renseignés</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Processus Racine</div>
      <div class="pmg-kpi-val" style="font-size:15px; color:var(--brand-primary);">${escHtml(details.name ? (details.name.length > 20 ? details.name.substring(0, 18) + '...' : details.name) : 'Non défini')}</div>
      <div class="pmg-kpi-sub">ID: <code>${escHtml(details.id || 'N/A')}</code></div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Activités Détectées</div>
      <div class="pmg-kpi-val" style="color:var(--ok);">${acts.length}</div>
      <div class="pmg-kpi-sub">Prêtes pour arborescence</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Outil Modélisateur</div>
      <div class="pmg-kpi-val" style="font-size:13.5px; color:#64748b;">${escHtml(details.exporter ? (details.exporter.length > 22 ? details.exporter.substring(0, 20) + '...' : details.exporter) : 'Camunda Modeler')}</div>
      <div class="pmg-kpi-sub">Version : ${escHtml(details.version || 'v1.0.0')}</div>
    </div>
  `;
};

window.renderPmgStep2Kpis = function() {
  const container = document.getElementById('pmgStep2Kpis');
  if (!container) return;

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (acts.length === 0) {
    container.innerHTML = '<span style="color:var(--text-tertiary); font-size:12px;">Chargez des fichiers BPMN pour afficher les statistiques d\'arborescence.</span>';
    return;
  }

  const filteredActs = typeof window.getPmgFilteredActivities === 'function' ? window.getPmgFilteredActivities() : acts;
  const maxLevel = filteredActs.length > 0 ? Math.max(...filteredActs.map(a => a.level || 1)) : 1;
  const userTasks = filteredActs.filter(a => (a.type || '').toLowerCase().includes('user')).length;
  const serviceTasks = filteredActs.filter(a => (a.type || '').toLowerCase().includes('service') || (a.type || '').toLowerCase().includes('script')).length;
  const callActs = filteredActs.filter(a => (a.type || '').toLowerCase().includes('call') || (a.type || '').toLowerCase().includes('sous-processus')).length;

  const volumeLabel = filteredActs.length === acts.length 
    ? `${acts.length}` 
    : `${filteredActs.length} / ${acts.length}`;
  const volumeSub = filteredActs.length === acts.length 
    ? 'Activités & flux extraits' 
    : `Activités filtrées (${acts.length} au total)`;

  container.innerHTML = `
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Volume Affiché &amp; Export</div>
      <div class="pmg-kpi-val" style="color:var(--brand-primary);">${volumeLabel}</div>
      <div class="pmg-kpi-sub">${volumeSub}</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Profondeur d'Arbre</div>
      <div class="pmg-kpi-val" style="color:${maxLevel > 3 ? '#8b5cf6' : '#009cd7'};">Niveau ${maxLevel}</div>
      <div class="pmg-kpi-sub">Hiérarchie active</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Tâches Humaines (User)</div>
      <div class="pmg-kpi-val" style="color:#ea5b0c;">${userTasks}</div>
      <div class="pmg-kpi-sub">Interactives avec opérateurs</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Automatisations &amp; Calls</div>
      <div class="pmg-kpi-val" style="color:var(--ok);">${serviceTasks + callActs}</div>
      <div class="pmg-kpi-sub">${serviceTasks} services/scripts, ${callActs} sous-processus</div>
    </div>
  `;
};

window.renderPmgStep3Kpis = function() {
  const container = document.getElementById('pmgStep3Kpis');
  if (!container) return;

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (acts.length === 0) return;

  const userTasks = acts.filter(a => (a.type || '').toLowerCase().includes('user'));
  const userTasksWithGroup = userTasks.filter(a => a.userGroup && a.userGroup.trim().length > 0);
  const userTasksWithoutGroup = userTasks.length - userTasksWithGroup.length;

  const actsWithEntity = acts.filter(a => a.entity && a.entity.trim().length > 0 && a.entity !== 'Non défini');
  const entityCoverage = acts.length > 0 ? Math.round((actsWithEntity.length / acts.length) * 100) : 0;

  const uniqueEntities = new Set(acts.map(a => a.entity).filter(Boolean));

  container.innerHTML = `
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Couverture Entités/Lanes</div>
      <div class="pmg-kpi-val" style="color:${entityCoverage >= 80 ? 'var(--ok)' : 'var(--warn)'};">${entityCoverage}%</div>
      <div class="pmg-kpi-sub">${actsWithEntity.length} / ${acts.length} tâches assignées</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">User Tasks Qualifiées</div>
      <div class="pmg-kpi-val" style="color:var(--ok);">${userTasksWithGroup.length} / ${userTasks.length}</div>
      <div class="pmg-kpi-sub">Avec groupe candidat BPMN</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Warnings User Tasks</div>
      <div class="pmg-kpi-val" style="color:${userTasksWithoutGroup > 0 ? '#ef4444' : 'var(--ok)'};">
        ${userTasksWithoutGroup > 0 ? `⚠️ ${userTasksWithoutGroup}` : '✅ 0'}
      </div>
      <div class="pmg-kpi-sub">${userTasksWithoutGroup > 0 ? 'Sans groupe candidat' : 'Toutes les User Tasks sont assignées'}</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Rôles &amp; Entités Distincts</div>
      <div class="pmg-kpi-val" style="color:var(--brand-primary);">${uniqueEntities.size}</div>
      <div class="pmg-kpi-sub">Pools &amp; Lanes identifiées</div>
    </div>
  `;
};

window.renderPmgStep4Kpis = function() {
  const container = document.getElementById('pmgStep4Kpis');
  if (!container) return;

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (acts.length === 0) return;

  const uniqueInputs = new Set();
  const uniqueOutputs = new Set();
  const allVars = new Set();
  let actsWithIo = 0;

  acts.forEach(a => {
    const hasIn = a.inputs && a.inputs.length > 0;
    const hasOut = a.outputs && a.outputs.length > 0;
    if (hasIn || hasOut) actsWithIo++;

    (a.inputs || []).forEach(v => {
      const clean = getVarName(v);
      if (clean) { uniqueInputs.add(clean); allVars.add(clean); }
    });
    (a.outputs || []).forEach(v => {
      const clean = getVarName(v);
      if (clean) { uniqueOutputs.add(clean); allVars.add(clean); }
    });
  });

  const ioCoverage = acts.length > 0 ? Math.round((actsWithIo / acts.length) * 100) : 0;

  container.innerHTML = `
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Variables Uniques I/O</div>
      <div class="pmg-kpi-val" style="color:var(--brand-primary);">${allVars.size}</div>
      <div class="pmg-kpi-sub">Dictionnaire de données</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Couverture Flux I/O</div>
      <div class="pmg-kpi-val" style="color:${ioCoverage >= 70 ? 'var(--ok)' : 'var(--warn)'};">${ioCoverage}%</div>
      <div class="pmg-kpi-sub">${actsWithIo} / ${acts.length} activités avec I/O</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Variables d'Entrée (Inputs)</div>
      <div class="pmg-kpi-val" style="color:#009cd7;">${uniqueInputs.size}</div>
      <div class="pmg-kpi-sub">Consommées par les tâches</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Variables de Sortie (Outputs)</div>
      <div class="pmg-kpi-val" style="color:#10b981;">${uniqueOutputs.size}</div>
      <div class="pmg-kpi-sub">Générées par les tâches</div>
    </div>
  `;
};

window.renderPmgStep5Kpis = function() {
  const container = document.getElementById('pmgStep5Kpis');
  if (!container) return;

  const acts = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (acts.length === 0) return;

  const modeCounts = {};
  let actsWithCase = 0;
  let actsWithComment = 0;

  acts.forEach(a => {
    const m = a.realizationMode || 'Manuelle';
    modeCounts[m] = (modeCounts[m] || 0) + 1;
    if (a.applicableCase && a.applicableCase.trim().length > 0) actsWithCase++;
    if (a.comment && a.comment.trim().length > 0) actsWithComment++;
  });

  const caseCoverage = acts.length > 0 ? Math.round((actsWithCase / acts.length) * 100) : 0;
  const docCoverage = acts.length > 0 ? Math.round((actsWithComment / acts.length) * 100) : 0;

  container.innerHTML = `
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Modes de Réalisation</div>
      <div class="pmg-kpi-val" style="font-size:14px; color:var(--text-primary); gap:4px; flex-wrap:wrap;">
        <span class="pmg-badge-ok">${modeCounts['Automatique'] || 0} Auto</span>
        <span class="pmg-badge-info">${modeCounts['SP0'] || 0} SP0</span>
        <span class="pmg-badge-warn">${modeCounts['Call Activity'] || 0} Call</span>
      </div>
      <div class="pmg-kpi-sub">${modeCounts['Manuelle'] || 0} manuelles</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Conditions Détectées (Gateways)</div>
      <div class="pmg-kpi-val" style="color:#009cd7;">${actsWithCase} (${caseCoverage}%)</div>
      <div class="pmg-kpi-sub">Cas d'applicabilité BPMN</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Documentation &amp; Notes</div>
      <div class="pmg-kpi-val" style="color:${docCoverage >= 50 ? 'var(--ok)' : '#64748b'};">${actsWithComment} (${docCoverage}%)</div>
      <div class="pmg-kpi-sub">Balises documentation</div>
    </div>
    <div class="pmg-kpi-item">
      <div class="pmg-kpi-label">Statut Global PMG</div>
      <div class="pmg-kpi-val" style="color:var(--ok);">Prêt à finaliser</div>
      <div class="pmg-kpi-sub">Exportation Excel / PDF active</div>
    </div>
  `;
};


window.renderPmgBatchSummary = function(batchResult) {
  const container = document.getElementById('pmgOneShotSummaryContainer');
  if (!container) return;

  container.style.display = 'block';

  const totalActs = batchResult.structuredActivities.length;
  const uniqueLanes = new Set(batchResult.structuredActivities.map(a => a.entity).filter(Boolean));
  const totalIoVars = new Set();
  batchResult.structuredActivities.forEach(a => {
    (a.inputs || []).forEach(v => totalIoVars.add(v));
    (a.outputs || []).forEach(v => totalIoVars.add(v));
  });

  const subprocsCount = batchResult.resolvedSubprocesses.length;
  const missingCount = batchResult.missingSubprocesses.length;

  let missingHtml = '';
  if (missingCount > 0) {
    const missingList = batchResult.missingSubprocesses.map(m => `<code>${escHtml(m.calledElement)}</code> (appelé par <em>${escHtml(m.calledBy)}</em>)`).join(', ');
    missingHtml = `
      <div style="margin-top: 10px; padding: 8px 12px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--warn); border-radius: 4px; font-size: 11.5px; color: var(--warn);">
        ⚠️ <strong>${missingCount} Call Activity cible(s) non trouvée(s) dans le lot :</strong> ${missingList}
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">📊</span>
        <div>
          <strong style="font-size: 14px; color: var(--text-primary);">Synthèse de l'Analyse BPMN One-Shot</strong>
          <div style="font-size: 12px; color: var(--text-secondary);">
            Processus Racine détecté : <strong style="color: var(--brand-primary);">${escHtml(batchResult.rootProcess.name)}</strong> (<code>${escHtml(batchResult.rootProcess.id)}</code>)
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn-primary" style="padding: 9px 18px; font-size: 12.5px; font-weight: 700; box-shadow: 0 2px 10px rgba(0, 156, 215, 0.25); display: flex; align-items: center; gap: 8px;" onclick="validatePmgStep5AndFinish()">
          ⚡ Générer la Matrice PMG Directement (1-Clic)
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Badges Métriques -->
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
      <div style="background: var(--bg-card); padding: 8px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
        📁 Fichiers BPMN : <strong>${batchResult.parsedFilesCount}</strong>
      </div>
      <div style="background: var(--bg-card); padding: 8px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
        🔗 Sous-processus reliés : <strong style="color: var(--brand-primary);">${subprocsCount}</strong>
      </div>
      <div style="background: var(--bg-card); padding: 8px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
        ⚡ Total Activités : <strong style="color: var(--ok);">${totalActs}</strong>
      </div>
      <div style="background: var(--bg-card); padding: 8px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
        🔄 Variables I/O : <strong>${totalIoVars.size}</strong>
      </div>
      <div style="background: var(--bg-card); padding: 8px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
        👥 Acteurs / Lanes : <strong>${uniqueLanes.size}</strong>
      </div>
    </div>
    ${missingHtml}
  `;
};

window.loadPmgDemoBpmnSuite = function() {
  const parent1Bpmn = `<?xml version="1.0" encoding="UTF-8"?>
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
</bpmn:definitions>`;

  const parent2Bpmn = `<?xml version="1.0" encoding="UTF-8"?>
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
</bpmn:definitions>`;

  const subRisqueBpmn = `<?xml version="1.0" encoding="UTF-8"?>
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
          <camunda:inputParameter name="dossierRisqueId">${orderId}</camunda:inputParameter>
          <camunda:outputParameter name="decisionValidation">${approvedByAuditor}</camunda:outputParameter>
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
</bpmn:definitions>`;

  const subPaiementBpmn = `<?xml version="1.0" encoding="UTF-8"?>
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
</bpmn:definitions>`;

  const subShippingBpmn = `<?xml version="1.0" encoding="UTF-8"?>
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
</bpmn:definitions>`;

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
  if (uploadTitle) uploadTitle.textContent = `✨ Démo Multi-Parents & Sous-Processus Partagés chargée (5 processus)`;
  if (uploadSub) uploadSub.textContent = `2 Parents détectés (P1 Commande, P2 SAV) • 2 Sous-processus Partagés (Paiement, Expédition)`;
};

let pmgListenersRegistered = false;
let pmgSearchQuery = '';
let pmgTypeFilter = 'all';
let pmgEntityFilter = 'all';

// Initialize PMG Event Listeners
window.initPmgModule = function() {
  if (pmgListenersRegistered) return;

  const dzOneShot = document.getElementById('dropZonePmgOneShot');
  const fileInputOneShot = document.getElementById('fileInputPmgOneShot');

  if (fileInputOneShot) {
    fileInputOneShot.addEventListener('change', e => {
      window.handlePmgOneShotBpmnFiles(e.target.files);
    });
  }

  if (dzOneShot) {
    dzOneShot.addEventListener('dragover', e => {
      e.preventDefault();
      dzOneShot.classList.add('drag');
      dzOneShot.style.borderColor = 'var(--brand-cyan)';
      dzOneShot.style.background = 'rgba(0, 156, 215, 0.08)';
    });

    dzOneShot.addEventListener('dragleave', () => {
      dzOneShot.classList.remove('drag');
      dzOneShot.style.borderColor = 'var(--brand-primary)';
      dzOneShot.style.background = 'rgba(0, 156, 215, 0.03)';
    });

    dzOneShot.addEventListener('drop', e => {
      e.preventDefault();
      dzOneShot.classList.remove('drag');
      dzOneShot.style.borderColor = 'var(--brand-primary)';
      dzOneShot.style.background = 'rgba(0, 156, 215, 0.03)';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        window.handlePmgOneShotBpmnFiles(e.dataTransfer.files);
      }
    });
  }

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
    
    // Ignorer les balises techniques d'extension
    if (el.prefix === 'zeebe' || el.prefix === 'camunda' || el.prefix === 'modeler') continue;
    let isExt = false;
    let pNode = el.parentElement;
    while (pNode && pNode.nodeType === 1) {
      const pLn = (pNode.localName || '').toLowerCase();
      if (pLn === 'extensionelements' || pLn === 'extension_elements') {
        isExt = true;
        break;
      }
      pNode = pNode.parentElement;
    }
    if (isExt) continue;

    const rawLocalName = el.localName ? el.localName.toLowerCase() : '';
    
    if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity'].includes(rawLocalName)) {
      const localName = window.detectBpmnElementType(el, rawLocalName);
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

// Helpers to clean and format BPMN variables without duplicate noise
function cleanVarIdentifier(str) {
  if (!str) return '';
  let s = String(str).trim();
  s = s.replace(/^[=]/, '').trim();
  s = s.replace(/^\$\{\s*([a-zA-Z0-9_]+)\s*\}$/, '$1');
  s = s.replace(/^#\{\s*([a-zA-Z0-9_]+)\s*\}$/, '$1');
  return s.trim();
}

function formatPmgVariable(target, source, type) {
  const cleanTarget = cleanVarIdentifier(target);
  const cleanSource = cleanVarIdentifier(source);
  
  let baseName = cleanTarget || cleanSource;
  if (!baseName) return '';

  let typeLabel = '';
  if (type && typeof type === 'string' && type.trim() && !type.toLowerCase().includes('undefined')) {
    typeLabel = type.trim();
    typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
  }

  // If source is a different valid variable name (alias) and not an expression
  if (cleanSource && cleanTarget && cleanSource.toLowerCase() !== cleanTarget.toLowerCase() && /^[a-zA-Z0-9_]+$/.test(cleanSource)) {
    return typeLabel ? `${cleanTarget} (alias: ${cleanSource}, ${typeLabel})` : `${cleanTarget} (alias: ${cleanSource})`;
  }

  if (typeLabel) {
    return `${baseName} (${typeLabel})`;
  }

  return baseName;
}

// Extract nested inputs/outputs under an activity XML node
function extractIoForNode(node) {
  const inputs = [];
  const outputs = [];
  
  const descendants = node.getElementsByTagName('*');
  for (let i = 0; i < descendants.length; i++) {
    const el = descendants[i];
    const localName = el.localName ? el.localName.toLowerCase() : '';
    const typeAttr = el.getAttribute('type') || '';
    
    // Zeebe / Camunda in/out
    if (localName === 'input' || localName === 'in') {
      const source = el.getAttribute('source') || el.getAttribute('sourceExpression') || '';
      const target = el.getAttribute('target') || '';
      const formatted = formatPmgVariable(target, source, typeAttr);
      if (formatted) inputs.push(formatted);
    } else if (localName === 'output' || localName === 'out') {
      const source = el.getAttribute('source') || el.getAttribute('sourceExpression') || '';
      const target = el.getAttribute('target') || '';
      const formatted = formatPmgVariable(target, source, typeAttr);
      if (formatted) outputs.push(formatted);
    } else if (localName === 'inputparameter') {
      const name = el.getAttribute('name') || '';
      const val = el.textContent ? el.textContent.trim() : '';
      const formatted = formatPmgVariable(name, val, typeAttr);
      if (formatted) inputs.push(formatted);
    } else if (localName === 'outputparameter') {
      const name = el.getAttribute('name') || '';
      const val = el.textContent ? el.textContent.trim() : '';
      const formatted = formatPmgVariable(name, val, typeAttr);
      if (formatted) outputs.push(formatted);
    } else if (localName === 'formfield') {
      const fieldId = el.getAttribute('id') || el.getAttribute('name') || '';
      const fieldType = el.getAttribute('type') || '';
      if (fieldId) {
        const formatted = formatPmgVariable(fieldId, '', fieldType);
        if (formatted) inputs.push(formatted);
      }
    }
  }
  
  return { 
    inputs: Array.from(new Set(inputs)), 
    outputs: Array.from(new Set(outputs)) 
  };
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
  
  window.inMemoryPmgDetailsMap = window.inMemoryPmgDetailsMap || {};
  window.inMemoryPmgDetailsMap[processId] = details;
  
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
  window.inMemoryPmgDetailsMap = window.inMemoryPmgDetailsMap || {};
  const details = window.inMemoryPmgDetailsMap[processId];
  if (details) {
    try {
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

// Hierarchical Sorter for activities
function sortActivitiesHierarchically(acts) {
  if (!acts || acts.length === 0) return [];

  // Build dual lookup map (by lowercase ID and by lowercase Name)
  const nodeMap = new Map();
  acts.forEach(a => {
    if (a.id) nodeMap.set(String(a.id).toLowerCase(), a);
    if (a.name) nodeMap.set(String(a.name).toLowerCase(), a);
  });

  const rootNodes = [];
  const parentToChildren = new Map();

  acts.forEach(a => {
    const pKey = a.parentId ? String(a.parentId).toLowerCase() : '';
    const parentObj = pKey ? nodeMap.get(pKey) : null;

    if (parentObj && parentObj !== a) {
      const pIdKey = parentObj.id ? String(parentObj.id).toLowerCase() : String(parentObj.name).toLowerCase();
      if (!parentToChildren.has(pIdKey)) {
        parentToChildren.set(pIdKey, []);
      }
      parentToChildren.get(pIdKey).push(a);
    } else {
      rootNodes.push(a);
    }
  });

  const result = [];
  function traverse(node, currentLevel) {
    if (!node.level) {
      node.level = currentLevel;
    }
    result.push(node);
    const nIdKey = node.id ? String(node.id).toLowerCase() : '';
    const nNameKey = node.name ? String(node.name).toLowerCase() : '';
    
    const children = (nIdKey && parentToChildren.get(nIdKey)) || (nNameKey && parentToChildren.get(nNameKey)) || [];
    children.forEach(child => traverse(child, currentLevel + 1));
  }

  rootNodes.forEach(root => traverse(root, 1));

  acts.forEach(a => {
    if (!result.includes(a)) {
      result.push(a);
    }
  });

  return result;
}

// Render PMG activities table rows

window.pmgMatrixColFilters = { act: '', type: 'all', entity: 'all', in: '', out: '', case: '', comment: '' };

window.onPmgMatrixColFilterChange = function() {
  const actInput = document.getElementById('pmgMatrixFilterColAct');
  const typeSelect = document.getElementById('pmgMatrixFilterColType');
  const entitySelect = document.getElementById('pmgMatrixFilterColEntity');
  const inInput = document.getElementById('pmgMatrixFilterColIn');
  const outInput = document.getElementById('pmgMatrixFilterColOut');
  const caseInput = document.getElementById('pmgMatrixFilterColCase');
  const commentInput = document.getElementById('pmgMatrixFilterColComment');

  window.pmgMatrixColFilters.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgMatrixColFilters.type = typeSelect?.value || 'all';
  window.pmgMatrixColFilters.entity = entitySelect?.value || 'all';
  window.pmgMatrixColFilters.in = (inInput?.value || '').trim().toLowerCase();
  window.pmgMatrixColFilters.out = (outInput?.value || '').trim().toLowerCase();
  window.pmgMatrixColFilters.case = (caseInput?.value || '').trim().toLowerCase();
  window.pmgMatrixColFilters.comment = (commentInput?.value || '').trim().toLowerCase();

  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgMatrixColFilters.act));
  if (typeSelect) typeSelect.classList.toggle('has-filter', window.pmgMatrixColFilters.type !== 'all');
  if (entitySelect) entitySelect.classList.toggle('has-filter', window.pmgMatrixColFilters.entity !== 'all');
  if (inInput) inInput.classList.toggle('has-filter', Boolean(window.pmgMatrixColFilters.in));
  if (outInput) outInput.classList.toggle('has-filter', Boolean(window.pmgMatrixColFilters.out));
  if (caseInput) caseInput.classList.toggle('has-filter', Boolean(window.pmgMatrixColFilters.case));
  if (commentInput) commentInput.classList.toggle('has-filter', Boolean(window.pmgMatrixColFilters.comment));

  window.renderPmgMatrix();
};

window.clearPmgMatrixColFilter = function(field) {
  const map = {
    act: 'pmgMatrixFilterColAct',
    in: 'pmgMatrixFilterColIn',
    out: 'pmgMatrixFilterColOut',
    case: 'pmgMatrixFilterColCase',
    comment: 'pmgMatrixFilterColComment'
  };
  const id = map[field];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  }
  window.onPmgMatrixColFilterChange();
};

window.resetPmgMatrixFilters = function() {
  pmgSearchQuery = '';
  pmgTypeFilter = 'all';
  pmgEntityFilter = 'all';
  window.pmgMatrixColFilters = { act: '', type: 'all', entity: 'all', in: '', out: '', case: '', comment: '' };

  const sInput = document.getElementById('pmgMatrixSearchInput');
  const tSel = document.getElementById('pmgTypeFilter');
  const eSel = document.getElementById('pmgEntityFilter');
  if (sInput) sInput.value = '';
  if (tSel) tSel.value = 'all';
  if (eSel) eSel.value = 'all';

  ['pmgMatrixFilterColAct', 'pmgMatrixFilterColIn', 'pmgMatrixFilterColOut', 'pmgMatrixFilterColCase', 'pmgMatrixFilterColComment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('has-filter'); }
  });
  ['pmgMatrixFilterColType', 'pmgMatrixFilterColEntity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = 'all'; el.classList.remove('has-filter'); }
  });

  window.renderPmgMatrix();
};

window.renderPmgMatrix = function() {
  const tbody = document.getElementById('pmgMatrixTableBody');
  const empty = document.getElementById('pmgMatrixEmptyMsg');
  
  if (!tbody) return;

  const activities = window.pmgActivities || [];

  // Populate dynamic selects in matrix column filters
  const colTypeSelect = document.getElementById('pmgMatrixFilterColType');
  if (colTypeSelect && activities.length > 0) {
    const currentVal = window.pmgMatrixColFilters?.type || 'all';
    const typeMap = new Map();
    activities.forEach(a => {
      const k = window.getPmgTypeKey(a.type || a.typeLabel);
      const l = a.typeLabel || a.type || 'Tâche';
      typeMap.set(k, { label: l, count: (typeMap.get(k)?.count || 0) + 1 });
    });
    let typeOpts = '<option value="all">Tous types (' + activities.length + ')</option>';
    for (const [k, v] of typeMap.entries()) {
      typeOpts += '<option value="' + escAttr(k) + '" ' + (k === currentVal ? 'selected' : '') + '>' + escHtml(v.label) + ' (' + v.count + ')</option>';
    }
    colTypeSelect.innerHTML = typeOpts;
  }

  const colEntitySelect = document.getElementById('pmgMatrixFilterColEntity');
  if (colEntitySelect && activities.length > 0) {
    const currentVal = window.pmgMatrixColFilters?.entity || 'all';
    const entityMap = new Map();
    activities.forEach(a => {
      const e = (a.entity && a.entity !== 'Non défini') ? a.entity : 'Non défini';
      entityMap.set(e, (entityMap.get(e) || 0) + 1);
    });
    let entOpts = '<option value="all">Toutes entités (' + activities.length + ')</option>';
    for (const [e, count] of entityMap.entries()) {
      entOpts += '<option value="' + escAttr(e) + '" ' + (e === currentVal ? 'selected' : '') + '>' + escHtml(e) + ' (' + count + ')</option>';
    }
    colEntitySelect.innerHTML = entOpts;
  }
  
  const cf = window.pmgMatrixColFilters || {};
  const filtered = activities.filter(act => {
    // Top bar global search
    if (pmgSearchQuery) {
      const nameMatch = (act.name || '').toLowerCase().includes(pmgSearchQuery);
      const idMatch = (act.id || '').toLowerCase().includes(pmgSearchQuery);
      const caseMatch = (act.applicableCase || '').toLowerCase().includes(pmgSearchQuery);
      const commentMatch = (act.comment || '').toLowerCase().includes(pmgSearchQuery);
      const parentMatch = (act.parentProcessName || act.rootParentName || '').toLowerCase().includes(pmgSearchQuery);
      if (!nameMatch && !idMatch && !caseMatch && !commentMatch && !parentMatch) return false;
    }
    
    // Top bar Type & Entity filters
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

    if (window.pmgParentFilter && window.pmgParentFilter !== 'all') {
      if (window.pmgParentFilter === 'shared_only') {
        if (!act.isSharedSubprocess) return false;
      } else {
        if (act.rootParentId !== window.pmgParentFilter && act.parentProcessId !== window.pmgParentFilter) return false;
      }
    }

    // Column-level filters
    if (cf.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      const parent = (act.parentProcessName || act.rootParentName || '').toLowerCase();
      if (!name.includes(cf.act) && !id.includes(cf.act) && !parent.includes(cf.act)) return false;
    }

    if (cf.type && cf.type !== 'all') {
      const k = window.getPmgTypeKey(act.type || act.typeLabel);
      if (k !== cf.type) return false;
    }

    if (cf.entity && cf.entity !== 'all') {
      const ent = (act.entity && act.entity !== 'Non défini') ? act.entity : 'Non défini';
      if (ent !== cf.entity) return false;
    }

    if (cf.in) {
      const ins = (act.inputs || []).map(i => String(i).toLowerCase());
      if (!ins.some(v => v.includes(cf.in))) return false;
    }

    if (cf.out) {
      const outs = (act.outputs || []).map(o => String(o).toLowerCase());
      if (!outs.some(v => v.includes(cf.out))) return false;
    }

    if (cf.case) {
      const c = (act.applicableCase || '').toLowerCase();
      if (!c.includes(cf.case)) return false;
    }

    if (cf.comment) {
      const c = (act.comment || '').toLowerCase();
      if (!c.includes(cf.comment)) return false;
    }
    
    return true;
  });
  
  const countHint = document.getElementById('pmgMatrixRowCount');
  if (countHint) {
    const activeOrderObj = window.PMG_ORDER_MODES[window.pmgActivityOrderMode || 'flow'];
    const orderLabel = activeOrderObj ? activeOrderObj.label : 'Flux';
    countHint.innerHTML = '<strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées • Ordre actif : <span style="color:var(--brand-primary); font-weight:700;">' + orderLabel + '</span>';
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  
  if (empty) empty.style.display = 'none';
  
  const sorted = window.sortPmgActivities(filtered, window.pmgActivityOrderMode);
  
  tbody.innerHTML = sorted.map((act, idx) => {
    const inputsHtml = (act.inputs || []).length > 0 
      ? '<div class="pmg-io-container">' + act.inputs.map(i => '<span class="badge-io badge-io-in" title="' + esc(i) + '">' + esc(i) + '</span>').join('') + '</div>' 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune entrée</span>';
      
    const outputsHtml = (act.outputs || []).length > 0 
      ? '<div class="pmg-io-container">' + act.outputs.map(o => '<span class="badge-io badge-io-out" title="' + esc(o) + '">' + esc(o) + '</span>').join('') + '</div>' 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune sortie</span>';
      
    let badgeClass = 'type-task';
    if (act.type === 'callactivity' || (act.typeLabel && act.typeLabel.toLowerCase().includes('sous-processus'))) badgeClass = 'type-subprocess';
    
    const indent = (act.level && act.level > 1) ? (act.level - 1) * 18 : 0;
    const arrow = indent > 0 ? '<span style="color:var(--brand-primary);margin-right:4px;font-family:sans-serif;">↳</span>' : '';
    const parentName = act.parentProcessName || act.rootParentName || 'Parent';

    let sharedHtml = '';
    if (act.isSharedSubprocess) {
      const pList = (act.sharedParentNames || []).join(', ') || 'Multi-parents';
      sharedHtml = '<span class="pmg-shared-pill" style="margin-left:6px;" title="Sous-processus transversal appelé par : ' + esc(pList) + '">🔗 Partagé (' + esc(pList) + ')</span>';
    }

    const groupVal = (typeof window.cleanPmgUserGroupName === 'function') ? window.cleanPmgUserGroupName(act.userGroup) : (act.userGroup || '');
    const groupBadge = groupVal ? '<div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">👤 <code>' + esc(groupVal) + '</code></div>' : '';
    
    return `
      <tr>
        <td style="padding-left: ${indent + 8}px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px;">
            <span class="pmg-order-pill" title="Index séquentiel ${window.pmgActivityOrderMode}">#${act.orderIndex || (idx + 1)}</span>
            ${arrow}
            <strong style="color:var(--text-primary); font-weight:600; font-size:12.5px;">${esc(act.name)}</strong>
            <span class="pmg-parent-badge">🏛️ ${esc(parentName)}</span>
            ${sharedHtml}
          </div>
          <div class="mono" style="font-size:10px;color:var(--text-tertiary); padding-left:${indent > 0 ? 18 : 0}px;">id: ${act.id}</div>
        </td>
        <td>
          <span class="badge-bpmn ${badgeClass}">${esc(act.typeLabel || act.type)}</span>
        </td>
        <td>
          <span class="badge badge-process" style="padding: 4px 8px; border-radius: 4px;">${esc(act.entity || 'Non défini')}</span>
          ${groupBadge}
        </td>
        <td>${inputsHtml}</td>
        <td>${outputsHtml}</td>
        <td>${esc(act.applicableCase || '—')}</td>
        <td style="max-width: 250px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">
          ${esc(act.comment || '—')}
        </td>
      </tr>
    `;
  }).join('');
};

window.exportPmgCSV = function() {
  const activitiesToExport = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || []);

  if (!activitiesToExport || activitiesToExport.length === 0) {
    alert("Aucune activité ne correspond aux filtres de types sélectionnés.");
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
  
  activitiesToExport.forEach(act => {
    const caseVal = document.querySelector(`.pmg-case[data-id="${act.id}"]`)?.value || act.applicableCase || '';
    const commentVal = document.querySelector(`.pmg-comment[data-id="${act.id}"]`)?.value || act.comment || '';
    
    csv += [
      qq(`${act.name} (${act.id})`),
      qq(act.typeLabel || act.type),
      qq(act.entity),
      qq((act.inputs || []).join('; ')),
      qq((act.outputs || []).join('; ')),
      qq(caseVal),
      qq(commentVal)
    ].join(',') + '\n';
  });
  
  dl(csv, `pmg_matrice_${window.pmgProcessDetails?.id || 'process'}.csv`, 'text/csv');
};

window.exportPmgExcel = function() {
  const allActs = window.pmgActivities || window.pmgTempSubprocesses || [];
  if (!allActs || allActs.length === 0) {
    alert("La matrice PMG est vide. Veuillez charger des processus BPMN.");
    return;
  }

  const activitiesToExport = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : allActs;

  if (!activitiesToExport || activitiesToExport.length === 0) {
    alert("Aucune activité ne correspond aux filtres de types sélectionnés.");
    return;
  }

  // Helper to clean variable names
  function cleanVarName(v) {
    if (!v) return '';
    let s = String(v).trim();
    if (s.startsWith('=')) s = s.substring(1).trim();
    const idx = s.indexOf('(');
    if (idx !== -1) s = s.substring(0, idx).trim();
    if (s.includes('=')) s = s.split('=')[0].trim();
    if (s.includes(':')) s = s.split(':')[0].trim();
    s = s.replace(/^[="'\[]+|[="'\]]+$/g, '').trim();
    return s;
  }

  // 1. Process Metadata & Roots
  const batch = window.pmgBatchResult;
  const roots = (batch && batch.rootProcesses && batch.rootProcesses.length > 0)
    ? batch.rootProcesses
    : [{ id: 'P1', name: document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Processus Principal' }];

  let rootTitles = roots.map((r, i) => `P${i + 1}: ${r.name || r.id}`).join(' & ');
  if (!rootTitles) rootTitles = document.getElementById('pmgProcessNameStep')?.value || 'Matrice PMG';

  const processId = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'matrice_pmg';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Équipe PMG';
  const badges = document.getElementById('pmgProjectBadgesStep')?.value || 'CDD / CPE / SGP / SP0 / DMN';

  // 2. Sort activities strictly by DAG flow or hierarchy
  const sortedActivities = window.sortPmgActivities(activitiesToExport, window.pmgActivityOrderMode || 'flow');

  // Map activities by uniqueId, id, and name for hierarchical ancestor traversal
  const nodeMapByUniqueId = new Map();
  const nodeMapById = new Map();
  const nodeMapByName = new Map();

  sortedActivities.forEach(act => {
    if (act.uniqueId) nodeMapByUniqueId.set(act.uniqueId, act);
    if (act.id) nodeMapById.set(act.id, act);
    if (act.name) nodeMapByName.set(act.name, act);
  });

  const getAncestors = (act) => {
    const chain = [];
    let currParentId = act.parentId;
    const visited = new Set([act.uniqueId || act.id]);

    while (currParentId) {
      const parentNode = nodeMapByUniqueId.get(currParentId) || nodeMapById.get(currParentId) || nodeMapByName.get(currParentId);
      if (parentNode && !visited.has(parentNode.uniqueId || parentNode.id)) {
        visited.add(parentNode.uniqueId || parentNode.id);
        chain.unshift(parentNode);
        currParentId = parentNode.parentId;
      } else {
        break;
      }
    }
    return chain;
  };

  // 3. Strict Multi-Level Hierarchy Construction (N0, N1, N2, N3, N4) & Variable Rows Extraction
  const actBlocks = sortedActivities.map(act => {
    const parents = getAncestors(act);
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';

    let colN0 = act.rootParentName || roots[0].name || 'Processus Principal';
    let colN1 = "NA", colN2 = "NA", colN3 = "NA", colN4 = "NA";

    if (parents.length === 0) {
      if (act.level === 2 && act.parentProcessName && act.parentProcessName !== colN0) {
        colN1 = act.parentProcessName;
        colN2 = act.name;
      } else if (act.level >= 3 && act.parentProcessName && act.parentProcessName !== colN0) {
        colN1 = act.parentProcessName;
        colN2 = act.parentProcessName;
        colN3 = act.name;
      } else {
        colN1 = act.name;
      }
    } else if (parents.length === 1) {
      colN1 = parents[0].name;
      colN2 = act.name;
    } else if (parents.length === 2) {
      colN1 = parents[0].name;
      colN2 = parents[1].name;
      colN3 = act.name;
    } else if (parents.length === 3) {
      colN1 = parents[0].name;
      colN2 = parents[1].name;
      colN3 = parents[2].name;
      colN4 = act.name;
    } else {
      colN1 = parents[0].name;
      colN2 = parents[1].name;
      colN3 = parents[2].name;
      colN4 = parents.slice(3).map(p => p.name).concat([act.name]).join(' / ');
    }

    const cleanGroup = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(act.userGroup)
      : (act.userGroup || '');

    const parentProcLabel = act.parentProcessName || act.rootParentName || roots[0].name || 'VDR';

    let modeLabel = act.realizationMode || ((act.type || '').toLowerCase().includes('call') ? 'Call Activity' : 'Manuelle');
    if ((act.type || '').toLowerCase().includes('service')) modeLabel = 'Automatique (Service)';

    // Extract individual clean variables list for Inputs and Outputs
    const rawInputs = (act.inputs || []).map(cleanVarName).filter(v => v && v !== 'NA');
    const rawOutputs = (act.outputs || []).map(cleanVarName).filter(v => v && v !== 'NA');

    // Deduplicate while keeping order
    const inList = Array.from(new Set(rawInputs));
    const outList = Array.from(new Set(rawOutputs));

    // Each variable gets its own Excel table row!
    const rowCount = Math.max(inList.length, outList.length, 1);

    return {
      colN0: colN0 || "NA",
      colN1: colN1 || "NA",
      colN2: colN2 || "NA",
      colN3: colN3 || "NA",
      colN4: colN4 || "NA",
      entity: (act.entity && act.entity !== 'Non défini') ? act.entity : 'NA',
      userGroup: cleanGroup || 'NA',
      inList,
      outList,
      rowCount,
      mode: modeLabel,
      applicableCase: caseVal || 'NA',
      parentProcess: parentProcLabel,
      comment: commentVal || '—',
      act
    };
  });

  // 4. Compute Merged Spans for N0, N1, N2, N3 accounting for variable sub-rows
  const numActs = actBlocks.length;
  const spans = Array.from({ length: numActs }, () => ({}));
  const levelKeys = ['colN0', 'colN1', 'colN2', 'colN3'];

  levelKeys.forEach((key, keyIdx) => {
    const parentKeys = levelKeys.slice(0, keyIdx);

    for (let i = 0; i < numActs; i++) {
      if (spans[i]['show_' + key] === false) continue;

      let mergedRowCount = actBlocks[i].rowCount;
      const val = actBlocks[i][key];

      if (val !== "NA") {
        for (let j = i + 1; j < numActs; j++) {
          let sameParent = true;
          for (const pKey of parentKeys) {
            if (actBlocks[j][pKey] !== actBlocks[i][pKey]) {
              sameParent = false;
              break;
            }
          }
          if (sameParent && actBlocks[j][key] === val) {
            spans[j]['show_' + key] = false;
            mergedRowCount += actBlocks[j].rowCount;
          } else {
            break;
          }
        }
      }

      spans[i]['span_' + key] = mergedRowCount;
      spans[i]['show_' + key] = true;
    }
  });

  // Total Excel table data rows
  const totalExcelDataRows = actBlocks.reduce((sum, a) => sum + a.rowCount, 0);

  // N0 Vibrant Distinct Background Colors
  const n0Palette = ['#FFC000', '#92D050', '#00B0F0', '#FCE4D6', '#E2EFDA', '#D9E1F2', '#FFF2CC'];
  const n0ColorMap = new Map();
  let colorIdx = 0;
  actBlocks.forEach(r => {
    if (!n0ColorMap.has(r.colN0)) {
      n0ColorMap.set(r.colN0, n0Palette[colorIdx % n0Palette.length]);
      colorIdx++;
    }
  });

  // Unique Slicer elements for header cards
  const uniqueN1 = Array.from(new Set(actBlocks.map(r => r.colN1).filter(v => v !== 'NA')));
  const uniqueN2 = Array.from(new Set(actBlocks.map(r => r.colN2).filter(v => v !== 'NA')));
  const uniqueEntities = Array.from(new Set(actBlocks.map(r => r.entity).filter(v => v !== 'NA')));

  let slicerN1Html = uniqueN1.slice(0, 6).map(n => `<div style="background:#548235; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">${escHtml(n)}</div>`).join('');
  let slicerN2Html = uniqueN2.slice(0, 6).map(n => `<div style="background:#ED7D31; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">${escHtml(n)}</div>`).join('');
  let slicerEntHtml = uniqueEntities.slice(0, 5).map(e => `<div style="background:#2E75B6; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">${escHtml(e)}</div>`).join('');

  // 5. Construct Refined Excel Table XML/HTML
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
   <x:ExcelWorkbook>
    <x:ExcelWorksheets>
     <x:ExcelWorksheet>
      <x:Name>PMG Matrice</x:Name>
      <x:WorksheetOptions>
       <x:DisplayGridlines/>
       <x:FreezePanes/>
       <x:FrozenNoSplit/>
       <x:SplitHorizontal>3</x:SplitHorizontal>
       <x:TopRowBottomPane>3</x:TopRowBottomPane>
       <x:AutoFilter x:Range="R3C1:R${totalExcelDataRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
      </x:WorksheetOptions>
      <x:AutoFilter x:Range="R3C1:R${totalExcelDataRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
     </x:ExcelWorksheet>
    </x:ExcelWorksheets>
   </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #1E293B; }
    table { border-collapse: collapse; width: 100%; table-layout: auto; }
    th { background-color: #002060; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #001233; padding: 10px 8px; vertical-align: middle; white-space: normal; line-height: 1.3; }
    td { font-size: 9pt; border: 1px solid #D9D9D9; padding: 6px 8px; vertical-align: middle; mso-number-format:'\\@'; }
    .cell-na { background-color: #F8FAFC !important; color: #94A3B8 !important; font-style: italic !important; text-align: center !important; font-weight: normal !important; }
    .cell-empty { color: #CBD5E1 !important; text-align: center !important; }
    .title-banner { background-color: #FFC000; color: #000000; font-size: 13pt; font-weight: 900; text-align: center; border: 2px solid #000000; padding: 14px 10px; }
    .slicer-card { background-color: #FFFFFF; border: 1px solid #CBD5E1; vertical-align: top; padding: 5px; font-size: 8pt; }
    .slicer-header { font-weight: bold; text-align: center; padding: 3px 4px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; border-radius: 2px; }
    .info-box { background-color: #548235; color: #FFFFFF; font-weight: bold; text-align: center; padding: 8px 6px; font-size: 9pt; border: 1px solid #000; }
  </style>
  </head>
  <body>
    <table>
      <!-- Row 1: Big Yellow Header Title Block (Modèle Bouygues PMG) -->
      <tr>
        <td colspan="5" class="title-banner">
          ${escHtml(sanitizeFormula(rootTitles))}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#E2EFDA; color:#385723;">Processus Métier Macro - Niveau N1</div>
          ${slicerN1Html || '<div style="color:#888; text-align:center;">Niveau N1</div>'}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#FCE4D6; color:#C65911;">Sous-Processus Métier - Niveau N2</div>
          ${slicerN2Html || '<div style="color:#888; text-align:center;">Niveau N2</div>'}
        </td>
        <td colspan="1" class="slicer-card">
          <div class="slicer-header" style="background:#D9E1F2; color:#1F4E78;">Entités</div>
          ${slicerEntHtml || '<div style="color:#888; text-align:center;">Toutes</div>'}
        </td>
        <td colspan="2" class="info-box">
          PILOTAGE / AVANCEMENT :<br>
          <span style="font-size:8pt; font-weight:normal; opacity:0.95;">${escHtml(sanitizeFormula(owner))} &bull; ${escHtml(sanitizeFormula(exporter))}</span>
        </td>
        <td colspan="1" style="background:#FFC000; color:#000; font-weight:bold; font-size:8.5pt; text-align:center; border:1px solid #000; padding:6px;">
          CODE / BADGES :<br><strong>${escHtml(sanitizeFormula(badges))}</strong>
        </td>
      </tr>

      <!-- Empty separator line -->
      <tr style="height:6px;"><td colspan="13" style="border:none; height:6px;"></td></tr>

      <!-- Multi-Level PMG Table Header -->
      <thead>
        <tr x:autofilter="all">
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Briques Primaires<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N0</span>
          </th>
          <th x:autofilter="all" style="width: 200px; background-color: #002060;">
            Processus Métier Macro<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N1</span>
          </th>
          <th x:autofilter="all" style="width: 190px; background-color: #002060;">
            Sous-Processus Métier<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N2</span>
          </th>
          <th x:autofilter="all" style="width: 190px; background-color: #002060;">
            Sous-Processus Métier<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N3</span>
          </th>
          <th x:autofilter="all" style="width: 240px; background-color: #002060;">
            Tâche Métier<br>
            <span style="font-weight:bold; font-size:7.5pt; color:#FDE047;">Niveau N4 (Finale)</span>
          </th>
          <th x:autofilter="all" style="width: 110px; background-color: #002060;">
            Entité<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Lane / Pôle</span>
          </th>
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Groupe Utilisateur<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Candidate Group</span>
          </th>
          <th x:autofilter="all" style="width: 220px; background-color: #002060;">
            Input (Quoi)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">1 variable / ligne</span>
          </th>
          <th x:autofilter="all" style="width: 220px; background-color: #002060;">
            Output (Quoi)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">1 variable / ligne</span>
          </th>
          <th x:autofilter="all" style="width: 130px; background-color: #002060;">
            Mode de Réalisation<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Auto / Manuelle / SP0</span>
          </th>
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Applicable dans quel cas ?<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Condition / Règle</span>
          </th>
          <th x:autofilter="all" style="width: 150px; background-color: #002060;">
            Processus Parent<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Origine BPMN</span>
          </th>
          <th x:autofilter="all" style="width: 230px; background-color: #002060;">
            Commentaires / Doc<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Spécifications</span>
          </th>
        </tr>
      </thead>
      <tbody>
  `;

  // 6. Output Table Data Rows: EACH VARIABLE ON ITS OWN EXCEL ROW (<tr>)
  for (let i = 0; i < numActs; i++) {
    const act = actBlocks[i];
    const span = spans[i];
    const count = act.rowCount;

    for (let r = 0; r < count; r++) {
      html += '<tr>';

      // Values for Input and Output on this specific row
      const inVal = act.inList[r] || (act.inList.length === 0 ? 'NA' : '—');
      const outVal = act.outList[r] || (act.outList.length === 0 ? 'NA' : '—');

      const inClass = inVal === 'NA' ? 'class="cell-na"' : (inVal === '—' ? 'class="cell-empty"' : '');
      const outClass = outVal === 'NA' ? 'class="cell-na"' : (outVal === '—' ? 'class="cell-empty"' : '');

      if (r === 0) {
        // Col N0 : Brique Primaire
        if (span['show_colN0']) {
          const n0Val = act.colN0;
          const n0Bg = n0Palette[Array.from(n0ColorMap.keys()).indexOf(n0Val) % n0Palette.length] || '#FFC000';
          const n0Class = n0Val === 'NA' ? 'class="cell-na"' : '';
          html += `<td rowspan="${span['span_colN0']}" ${n0Class} style="background-color:${n0Bg}; font-weight:900; font-size:10.5pt; text-align:center; vertical-align:middle; border:1.5px solid #000000; padding:10px 6px;">${escHtml(sanitizeFormula(n0Val))}</td>`;
        }

        // Col N1 : Macro Processus
        if (span['show_colN1']) {
          const n1Val = act.colN1;
          const n1Class = n1Val === 'NA' ? 'class="cell-na"' : '';
          html += `<td rowspan="${span['span_colN1']}" ${n1Class} style="font-weight:bold; font-size:9pt; vertical-align:middle; padding:8px 6px; background:#FAFAFA;">${escHtml(sanitizeFormula(n1Val))}</td>`;
        }

        // Col N2 : Sous-Processus L2
        if (span['show_colN2']) {
          const n2Val = act.colN2;
          const n2Class = n2Val === 'NA' ? 'class="cell-na"' : '';
          html += `<td rowspan="${span['span_colN2']}" ${n2Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">${escHtml(sanitizeFormula(n2Val))}</td>`;
        }

        // Col N3 : Sous-Processus L3
        if (span['show_colN3']) {
          const n3Val = act.colN3;
          const n3Class = n3Val === 'NA' ? 'class="cell-na"' : '';
          html += `<td rowspan="${span['span_colN3']}" ${n3Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">${escHtml(sanitizeFormula(n3Val))}</td>`;
        }

        // Col N4 : Tâche Finale
        const n4Val = act.colN4;
        const n4Class = n4Val === 'NA' ? 'class="cell-na"' : '';
        html += `<td rowspan="${count}" ${n4Class} style="font-weight:600; font-size:9pt; padding:7px 8px; vertical-align:middle;">${escHtml(sanitizeFormula(n4Val))}</td>`;

        // Entité
        const entClass = act.entity === 'NA' ? 'class="cell-na"' : '';
        html += `<td rowspan="${count}" ${entClass} style="text-align:center; font-weight:700; color:#0F172A; background:#F8FAFC; vertical-align:middle;">${escHtml(sanitizeFormula(act.entity))}</td>`;

        // Groupe Utilisateur
        const grpClass = act.userGroup === 'NA' ? 'class="cell-na"' : '';
        html += `<td rowspan="${count}" ${grpClass} style="text-align:center; font-family:'Cascadia Code', Consolas, Calibri, monospace; font-size:8.5pt; color:#0F172A; vertical-align:middle;">${escHtml(sanitizeFormula(act.userGroup))}</td>`;

        // Input 1st row
        html += `<td ${inClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">${escHtml(sanitizeFormula(inVal))}</td>`;

        // Output 1st row
        html += `<td ${outClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">${escHtml(sanitizeFormula(outVal))}</td>`;

        // Mode
        let modeBg = '#FFFFFF', modeColor = '#1E293B';
        if (act.mode.includes('Call')) { modeBg = '#FAF5FF'; modeColor = '#6D28D9'; }
        else if (act.mode.includes('Auto')) { modeBg = '#ECFDF5'; modeColor = '#047857'; }
        else if (act.mode.includes('Manuelle')) { modeBg = '#EFF6FF'; modeColor = '#1E40AF'; }
        html += `<td rowspan="${count}" style="text-align:center; font-weight:700; font-size:8.5pt; background:${modeBg}; color:${modeColor}; vertical-align:middle;">${escHtml(sanitizeFormula(act.mode))}</td>`;

        // Applicable dans quel cas
        const caseClass = act.applicableCase === 'NA' ? 'class="cell-na"' : '';
        html += `<td rowspan="${count}" ${caseClass} style="font-size:8.5pt; vertical-align:middle;">${escHtml(sanitizeFormula(act.applicableCase))}</td>`;

        // Processus Parent
        html += `<td rowspan="${count}" style="text-align:center; font-weight:700; color:#002060; font-size:8.5pt; background:#F1F5F9; vertical-align:middle;">${escHtml(sanitizeFormula(act.parentProcess))}</td>`;

        // Commentaires
        html += `<td rowspan="${count}" style="color:#475569; font-size:8.5pt; vertical-align:middle;">${escHtml(sanitizeFormula(act.comment))}</td>`;
      } else {
        // Sub-rows (r > 0): Only output the Input and Output columns
        html += `<td ${inClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">${escHtml(sanitizeFormula(inVal))}</td>`;
        html += `<td ${outClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">${escHtml(sanitizeFormula(outVal))}</td>`;
      }

      html += '</tr>';
    }
  }

  html += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  // 7. Trigger Excel (.xls) Download
  const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `pmg_matrice_${processId || 'process'}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.exportPmgPDF = function() {
  const activitiesToExport = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || []);

  if (!activitiesToExport || activitiesToExport.length === 0) {
    alert("Aucune activité ne correspond aux filtres de types sélectionnés.");
    return;
  }

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
  activitiesToExport.forEach(act => {
    const rowInputs = (act.inputs || []).length ? act.inputs.map(i => `<li>${esc(i)}</li>`).join('') : '<li>Aucun</li>';
    const rowOutputs = (act.outputs || []).length ? act.outputs.map(o => `<li>${esc(o)}</li>`).join('') : '<li>Aucun</li>';
    
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
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);
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
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);
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

// ---------- PMG Feature 1: Tree Node Editor & Dynamic Re-parenting ----------
window.openPmgEditTreeNodeModal = function(actId) {
  const modal = document.getElementById('modalPmgEditTreeNode');
  if (!modal) return;

  const activities = window.pmgTempSubprocesses || [];
  const target = activities.find(a => (a.uniqueId && a.uniqueId === actId) || a.id === actId || a.name === actId);
  if (!target) return;

  const targetKey = target.uniqueId || target.id || target.name;
  document.getElementById('pmgEditActOriginalId').value = targetKey;
  document.getElementById('pmgEditActName').value = target.name || '';
  document.getElementById('pmgEditActType').value = target.type || 'User Task';
  document.getElementById('pmgEditActEntity').value = target.entity && target.entity !== 'Non défini' ? target.entity : '';

  const parentSelect = document.getElementById('pmgEditActParent');
  if (parentSelect) {
    parentSelect.innerHTML = '<option value="">-- Aucun (Processus Parent / Brique Primaire N0) --</option>';
    activities.forEach(act => {
      const actKey = act.uniqueId || act.id || act.name;
      if (actKey !== targetKey) {
        const opt = document.createElement('option');
        opt.value = actKey;
        opt.textContent = `${act.name} [ID: ${act.id || act.name}] (Niveau ${act.level || 1})`;
        if (target.parentId && (target.parentId === actKey || target.parentId === act.id || target.parentId === act.name || (act.name && target.parentId.toLowerCase() === act.name.toLowerCase()))) {
          opt.selected = true;
        }
        parentSelect.appendChild(opt);
      }
    });
  }

  modal.style.display = 'flex';
};

window.closePmgEditTreeNodeModal = function() {
  const modal = document.getElementById('modalPmgEditTreeNode');
  if (modal) modal.style.display = 'none';
};

window.savePmgTreeNodeEdits = function() {
  const origId = document.getElementById('pmgEditActOriginalId')?.value;
  if (!origId) return;

  const activities = window.pmgTempSubprocesses || [];
  const target = activities.find(a => (a.uniqueId && a.uniqueId === origId) || a.id === origId || a.name === origId);
  if (!target) return;

  const newName = (document.getElementById('pmgEditActName')?.value || '').trim();
  if (!newName) {
    alert("Le nom de l'activité ne peut pas être vide.");
    return;
  }

  target.name = newName;
  target.parentId = document.getElementById('pmgEditActParent')?.value || '';
  target.type = document.getElementById('pmgEditActType')?.value || 'User Task';
  target.entity = (document.getElementById('pmgEditActEntity')?.value || '').trim() || 'Non défini';

  const mapByUniqueId = new Map();
  const mapById = new Map();
  const mapByName = new Map();
  activities.forEach(act => {
    if (act.uniqueId) mapByUniqueId.set(act.uniqueId, act);
    if (act.id) mapById.set(act.id, act);
    if (act.name) mapByName.set(act.name.toLowerCase(), act);
  });

  const getLevel = (act, visited = new Set()) => {
    if (!act || !act.parentId) return 1;
    const actKey = act.uniqueId || act.id || act.name;
    if (visited.has(actKey)) return 1;
    visited.add(actKey);

    const parent = mapByUniqueId.get(act.parentId) || mapById.get(act.parentId) || mapByName.get(act.parentId.toLowerCase());
    return parent ? 1 + getLevel(parent, visited) : 2;
  };

  activities.forEach(act => {
    act.level = getLevel(act);
    const pObj = mapByUniqueId.get(act.parentId) || mapById.get(act.parentId) || mapByName.get((act.parentId || '').toLowerCase());
    act.parentName = pObj ? pObj.name : (act.parentId ? act.parentId : 'Processus Parent (Racine)');
  });

  window.closePmgEditTreeNodeModal();
  window.renderPmgVisualTree(activities);
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  window.savePmgStateToLocalStorage();
};

window.deletePmgTreeNodeFromModal = function() {
  const origId = document.getElementById('pmgEditActOriginalId')?.value;
  if (!origId) return;

  if (confirm("Voulez-vous vraiment supprimer cette activité et ses références ?")) {
    window.pmgTempSubprocesses = (window.pmgTempSubprocesses || []).filter(a => (a.uniqueId && a.uniqueId !== origId) && a.id !== origId && a.name !== origId);
    window.closePmgEditTreeNodeModal();
    window.renderPmgVisualTree(window.pmgTempSubprocesses);
    if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
    if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
    if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
    window.savePmgStateToLocalStorage();
  }
};

window.addNewPmgSubactivity = function(parentId = '') {
  const name = prompt("Saisissez le nom de la nouvelle activité à ajouter :");
  if (!name || !name.trim()) return;

  const activities = window.pmgTempSubprocesses || [];
  const newId = `act_${activities.length + 1}_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const parentObj = parentId ? activities.find(a => (a.uniqueId && a.uniqueId === parentId) || a.id === parentId || a.name === parentId) : null;
  const parentKey = parentObj ? (parentObj.uniqueId || parentObj.id || parentObj.name) : '';
  const parentName = parentObj ? parentObj.name : '';
  const newLevel = parentObj ? (parentObj.level || 1) + 1 : 1;

  const newAct = {
    id: newId,
    uniqueId: newId,
    name: name.trim(),
    parentId: parentKey,
    parentName: parentName || 'Processus Parent (Racine)',
    type: 'User Task',
    typeLabel: 'User Task',
    level: newLevel,
    entity: 'Non défini',
    userGroup: '',
    inputs: [],
    outputs: [],
    applicableCase: '',
    comment: '',
    realizationMode: 'Manuelle'
  };

  activities.push(newAct);
  window.pmgTempSubprocesses = activities;

  window.renderPmgVisualTree(activities);
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  window.savePmgStateToLocalStorage();
};

// ---------- PMG Feature 4: JSON Project Import & Export ----------
window.exportPmgProjectJson = function() {
  const state = {
    meta: {
      name: document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Lancement projet',
      id: document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'lancement-projet',
      owner: document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier',
      exporter: document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Équipe PMG',
      version: document.getElementById('pmgProcessVersionStep')?.value || document.getElementById('pmgProcessVersion')?.value || 'v1.0.0',
      badges: document.getElementById('pmgProjectBadgesStep')?.value || 'CDD / CPE / SGP / SP0 / DMN',
      defaultFille: document.getElementById('pmgDefaultProcessFilleStep')?.value || 'NA',
      desc: document.getElementById('pmgProcessDescStep')?.value || document.getElementById('pmgProcessDesc')?.value || ''
    },
    activities: window.pmgTempSubprocesses || [],
    realizationModes: window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'],
    exportedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(state, null, 2);
  const processId = state.meta.id || 'projet_pmg';
  
  const blob = new Blob(["\uFEFF" + jsonStr], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `pmg_projet_${processId}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.importPmgProjectJson = function(file) {
  if (!file) return;
  if (validateFileSize && !validateFileSize(file)) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== 'object' || (!parsed.activities && !parsed.meta)) {
        throw new Error("Format JSON PMG invalide.");
      }

      // Nettoyage prototype
      const data = JSON.parse(JSON.stringify(parsed));

      if (data.meta && typeof data.meta === 'object') {
        if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = String(data.meta.name || '');
        if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = String(data.meta.id || '');
        if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = String(data.meta.owner || '');
        if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = String(data.meta.exporter || '');
        if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = String(data.meta.version || '');
        if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = String(data.meta.badges || '');
        if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = String(data.meta.defaultFille || '');
        if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = String(data.meta.desc || '');
        window.syncPmgStep1Metadata();
      }

      if (data.realizationModes && Array.isArray(data.realizationModes)) {
        window.pmgRealizationModes = data.realizationModes.map(m => String(m || '').trim()).filter(Boolean);
      }

      if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
        window.pmgTempSubprocesses = data.activities;
        window.renderPmgVisualTree(data.activities);

        for (let s = 1; s <= 5; s++) {
          const node = document.getElementById('step-node-' + s);
          if (node) node.classList.remove('disabled');
        }

        if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
        if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
        if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
      }

      window.savePmgStateToLocalStorage();
      alert(`✅ Projet PMG importé avec succès (${data.activities?.length || 0} activités chargées) !`);
    } catch (err) {
      alert("Erreur lors de l'importation du projet JSON : " + err.message);
    }
  };
  reader.readAsText(file);
};

// ---------- PMG Feature 5: Pre-packaged Business Templates ----------
window.loadPmgTemplate = function(templateKey) {
  if (!templateKey) return;

  const templates = {
    telecom: {
      meta: {
        name: "Lancement & Qualification des Sites (VDR)",
        id: "lancement-vdr-site",
        owner: "Direction Réseau & Opérations",
        exporter: "Consultant PMG Télécom",
        version: "v2.4.0",
        badges: "CDD / CPE / SGP / SP0 / DMN",
        defaultFille: "NA",
        desc: "Processus d'instruction des demandes d'allumage et remédiation 4G/5G."
      },
      activities: [
        { id: 'act_101', name: 'Lancement projet', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Métier', userGroup: 'Chefs de projet', inputs: ['idProjet', 'codeSite'], outputs: ['projetInitie'], realizationMode: 'Call Activity', applicableCase: 'Tous les projets', comment: 'Brique primaire' },
        { id: 'act_102', name: 'Vérifier le dépôt COMSIS', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Service Administration', userGroup: 'Gestionnaires COMSIS', inputs: ['numDossier', 'docIdentite'], outputs: ['statutDepot'], realizationMode: 'Call Activity', applicableCase: 'Dossiers COMSIS', comment: 'Vérification documentaire' },
        { id: 'act_103', name: 'Contrôler la conformité du dossier', parentId: 'Vérifier le dépôt COMSIS', level: 3, type: 'User Task', entity: 'Service Client', userGroup: 'Analystes COMSIS', inputs: ['numDossier', 'attestationBDD'], outputs: ['dossierValide'], realizationMode: 'Manuelle', applicableCase: 'Dossier déposé', comment: 'Examen pièces' },
        { id: 'act_104', name: 'Vérifier le réglementaire', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Direction Juridique', userGroup: 'Juristes ANFR', inputs: ['idSite', 'freqBand'], outputs: ['accordReglementaire'], realizationMode: 'Call Activity', applicableCase: 'Sites radio 4G/5G', comment: 'Instruction ANFR' },
        { id: 'act_105', name: 'Notifier ANFR Date allumage 4G 700', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage700'], outputs: ['ackANFR700'], realizationMode: 'Automatique', applicableCase: 'Bande 700 MHz', comment: 'Flux API' },
        { id: 'act_106', name: 'Notifier ANFR Date allumage 4G 800', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage800'], outputs: ['ackANFR800'], realizationMode: 'Automatique', applicableCase: 'Bande 800 MHz', comment: 'Flux API' },
        { id: 'act_107', name: 'Réaliser Remédiation 4G', parentId: 'Vérifier le réglementaire', level: 3, type: 'Sous-processus', entity: 'Support Technique', userGroup: 'Techniciens Réseau', inputs: ['ticketRemediation'], outputs: ['rapportRemediation'], realizationMode: 'SP0', applicableCase: 'Anomalie détectée', comment: 'Remédiation site' }
      ]
    },
    ecommerce: {
      meta: {
        name: "Traitement et Expédition des Commandes E-Commerce",
        id: "ecommerce-order-fulfillment",
        owner: "Direction E-Commerce & Logistique",
        exporter: "Modélisateur Logistique",
        version: "v1.5.0",
        badges: "STRIPE / ERP / WMS / DHL",
        defaultFille: "NA",
        desc: "Processus d'enregistrement, contrôle paiement, préparation et livraison."
      },
      activities: [
        { id: 'act_201', name: 'Réception Commande Client', parentId: '', level: 1, type: 'Sous-processus', entity: 'Front-Office E-Commerce', userGroup: 'Chefs de Produit', inputs: ['cartItems', 'customerId'], outputs: ['orderId'], realizationMode: 'Automatique', applicableCase: 'Achat en ligne', comment: 'Capture panier' },
        { id: 'act_202', name: 'Validation du Paiement', parentId: 'Réception Commande Client', level: 2, type: 'Service Task', entity: 'Plateforme Paiement Stripe', userGroup: 'Comptabilité', inputs: ['orderId', 'paymentToken'], outputs: ['paymentStatus'], realizationMode: 'Automatique', applicableCase: 'Paiement carte', comment: 'API Stripe' },
        { id: 'act_203', name: 'Contrôle Anti-Fraude', parentId: 'Validation du Paiement', level: 3, type: 'User Task', entity: 'Service Risques', userGroup: 'Analystes Anti-Fraude', inputs: ['orderId', 'scoreFraud'], outputs: ['fraudValidationFlag'], realizationMode: 'Manuelle', applicableCase: 'Montant > 1000€', comment: 'Examen manuel' },
        { id: 'act_204', name: 'Préparation en Entrepôt', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Logistique', userGroup: 'Opérateurs WMS', inputs: ['orderId', 'itemSkus'], outputs: ['colisScanne'], realizationMode: 'Call Activity', applicableCase: 'Stock disponible', comment: 'Packing entrepôt' },
        { id: 'act_205', name: 'Remise au Transporteur Express', parentId: 'Préparation en Entrepôt', level: 2, type: 'Service Task', entity: 'Service Expédition', userGroup: 'Chauffeurs DHL', inputs: ['colisScanne', 'deliveryAddress'], outputs: ['trackingNumber'], realizationMode: 'Automatique', applicableCase: 'Envoi Express', comment: 'Génération bordereau' }
      ]
    },
    rh: {
      meta: {
        name: "Processus de Recrutement & Onboarding Collaborateur",
        id: "rh-onboarding-process",
        owner: "Direction des Ressources Humaines",
        exporter: "Consultant RH",
        version: "v3.0.0",
        badges: "ATS / SIRH / IT / WELCOME",
        defaultFille: "NA",
        desc: "Parcours complet de la sélection du candidat jusqu'à son intégration opérationnelle."
      },
      activities: [
        { id: 'act_301', name: 'Sélection & Entretiens Candidat', parentId: '', level: 1, type: 'Sous-processus', entity: 'Équipe Recrutement', userGroup: 'Chargés de Recrutement', inputs: ['cvDocument', 'jobOfferId'], outputs: ['candidatRetenu'], realizationMode: 'Call Activity', applicableCase: 'Poste ouvert', comment: 'Qualification RH' },
        { id: 'act_302', name: 'Émission Promesse d\'Embauche', parentId: 'Sélection & Entretiens Candidat', level: 2, type: 'User Task', entity: 'Service Juridique RH', userGroup: 'Gestionnaires RH', inputs: ['candidatRetenu', 'proposedSalary'], outputs: ['promesseSignee'], realizationMode: 'Manuelle', applicableCase: 'Accord manager', comment: 'Signature Docusign' },
        { id: 'act_303', name: 'Dotation Matériel & Accès IT', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction des Systèmes d\'Information', userGroup: 'Support IT', inputs: ['candidatRetenu', 'profileRole'], outputs: ['laptopAssigned', 'emailCreated'], realizationMode: 'Automatique', applicableCase: 'J-7 avant arrivée', comment: 'Provisioning Active Directory' },
        { id: 'act_304', name: 'Parcours d\'Intégration & Formation', parentId: 'Dotation Matériel & Accès IT', level: 2, type: 'User Task', entity: 'Équipe Formation', userGroup: 'Buddies Onboarding', inputs: ['emailCreated'], outputs: ['onboardingCompleted'], realizationMode: 'Manuelle', applicableCase: 'Semaine 1', comment: 'Session d\'accueil' }
      ]
    },
    bank: {
      meta: {
        name: "Instruction & Octroi de Prêt Immobilier",
        id: "bank-mortgage-origination",
        owner: "Direction des Risques & Crédits",
        exporter: "Analyste Crédit",
        version: "v2.1.0",
        badges: "DECISION / EXPERTISE / NOTAIRE / CDC",
        defaultFille: "NA",
        desc: "Instruction du dossier de prêt, évaluation du bien et édition de l'offre."
      },
      activities: [
        { id: 'act_401', name: 'Instruction du Dossier Emprunteur', parentId: '', level: 1, type: 'Sous-processus', entity: 'Réseau d\'Agences', userGroup: 'Conseillers Financiers', inputs: ['borrowerIncome', 'taxNotice'], outputs: ['dossierCompletFlag'], realizationMode: 'Call Activity', applicableCase: 'Demande de prêt', comment: 'Recueil pièces' },
        { id: 'act_402', name: 'Analyse de Solvabilité & Scoring', parentId: 'Instruction du Dossier Emprunteur', level: 2, type: 'Service Task', entity: 'Moteur de Décision Crédit', userGroup: 'Analystes Risques', inputs: ['dossierCompletFlag', 'borrowerIncome'], outputs: ['creditScore', 'maxLoanAmount'], realizationMode: 'Automatique', applicableCase: 'Dossier transmis', comment: 'Algorithme Scoring' },
        { id: 'act_403', name: 'Émission et Envoi de l\'Offre de Prêt', parentId: '', level: 1, type: 'Sous-processus', entity: 'Service Édition Contrats', userGroup: 'Gestionnaires Crédit', inputs: ['maxLoanAmount', 'creditScore'], outputs: ['offrePretEditee'], realizationMode: 'Automatique', applicableCase: 'Accord Comité', comment: 'Édition légale 11 jours' }
      ]
    }
  };

  const tpl = templates[templateKey];
  if (!tpl) return;

  if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = tpl.meta.name;
  if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = tpl.meta.id;
  if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = tpl.meta.owner;
  if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = tpl.meta.exporter;
  if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = tpl.meta.version;
  if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = tpl.meta.badges;
  if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = tpl.meta.defaultFille;
  if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = tpl.meta.desc;

  window.syncPmgStep1Metadata();
  window.pmgTempSubprocesses = tpl.activities;

  const treeContainer = document.getElementById('pmgVisualTreeContainer');
  if (treeContainer) treeContainer.style.display = 'block';
  if (window.renderPmgVisualTree) window.renderPmgVisualTree(tpl.activities);

  for (let s = 1; s <= 5; s++) {
    const node = document.getElementById('step-node-' + s);
    if (node) node.classList.remove('disabled');
  }

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();

  window.savePmgStateToLocalStorage();
  alert(`🎨 Modèle Métier "${tpl.meta.name}" chargé avec succès !`);
};

// ---------- PMG Feature 3: Data Lineage Auditor & Consistency Check ----------

window.renderPmgDataLineageAudit = function() {
  const container = document.getElementById('pmgDataLineageAuditContainer');
  if (!container) return;

  const activities = (window.pmgTempSubprocesses && window.pmgTempSubprocesses.length > 0)
    ? window.pmgTempSubprocesses
    : (window.pmgActivities || []);

  if (activities.length === 0) {
    container.innerHTML = '<span style="color:var(--text-tertiary);">Aucune activité chargée pour analyser le lignage.</span>';
    return;
  }

  function getCleanVarName(str) {
    if (!str) return '';
    let s = String(str).trim();
    if (s.startsWith('=')) s = s.substring(1).trim();
    const idx = s.indexOf('(');
    if (idx !== -1) s = s.substring(0, idx).trim();
    if (s.includes('=')) s = s.split('=')[0].trim();
    if (s.includes(':')) s = s.split(':')[0].trim();
    s = s.replace(/^[="'\[]+|[="'\]]+$/g, '').trim();
    return s;
  }

  function suggestCamelCase(v) {
    if (!v) return '';
    let s = v.replace(/^[._\-]+/, ''); // remove leading underscores/dots
    s = s.replace(/[\s_\-]+(.)/g, (_, c) => c.toUpperCase());
    s = s.replace(/^[A-Z]/, c => c.toLowerCase());
    return s || v;
  }

  const allInputs = new Map(); // varName -> Array of { actName, parentProc }
  const allOutputs = new Map(); // varName -> Array of { actName, parentProc }
  const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;

  activities.forEach(act => {
    const parentProc = act.parentProcessName || act.rootParentName || 'Processus';
    (act.inputs || []).forEach(i => {
      const v = getCleanVarName(i);
      if (v && v.length > 0) {
        if (!allInputs.has(v)) allInputs.set(v, []);
        allInputs.get(v).push({ actName: act.name, parentProc });
      }
    });
    (act.outputs || []).forEach(o => {
      const v = getCleanVarName(o);
      if (v && v.length > 0) {
        if (!allOutputs.has(v)) allOutputs.set(v, []);
        allOutputs.get(v).push({ actName: act.name, parentProc });
      }
    });
  });

  const orphanInputs = [];
  const unusedOutputs = [];
  const namingIssues = [];

  // Detect Orphan Inputs & Categorize Reason
  allInputs.forEach((consumersList, v) => {
    if (!allOutputs.has(v)) {
      // Deduplicate consumer names
      const uniqueConsumers = Array.from(new Set(consumersList.map(c => c.actName)));
      const uniqueParents = Array.from(new Set(consumersList.map(c => c.parentProc)));

      // Intelligent Reason Classification
      let category = 'risk';
      let reasonLabel = '⚠️ Non initialisée en amont (Risque d\'exécution)';
      let badgeStyle = 'background:rgba(239, 68, 68, 0.1); color:var(--err); border:1px solid rgba(239, 68, 68, 0.25);';

      const vLower = v.toLowerCase();
      if (vLower.includes('id') || vLower.includes('dossier') || vLower.includes('site') || vLower.includes('demande') || vLower.includes('projet') || vLower.includes('client') || vLower.includes('token') || vLower.includes('auth')) {
        category = 'payload_start';
        reasonLabel = '🌟 Payload d\'Initialisation (Start Event / API)';
        badgeStyle = 'background:rgba(59, 130, 246, 0.1); color:var(--brand-primary); border:1px solid rgba(59, 130, 246, 0.25);';
      } else if (vLower.includes('loop') || vLower.includes('count') || vLower.includes('index') || vLower.includes('iteration') || vLower.includes('missing') || vLower.includes('flag')) {
        category = 'context_loop';
        reasonLabel = '🔄 Variable de Contexte / Boucle Zeebe';
        badgeStyle = 'background:rgba(99, 102, 241, 0.1); color:#6366f1; border:1px solid rgba(99, 102, 241, 0.25);';
      }

      orphanInputs.push({
        varName: v,
        consumers: uniqueConsumers,
        parents: uniqueParents,
        category,
        reasonLabel,
        badgeStyle
      });
    }

    if (!camelCaseRegex.test(v)) {
      let problem = 'Format non-camelCase';
      if (v.includes(' ')) problem = 'Espaces interdits';
      else if (v.startsWith('_') || v.startsWith('.')) problem = 'Préfixe spécial non recommandé';
      else if (v.includes('_')) problem = 'snake_case détecté';
      else if (/^[A-Z]/.test(v)) problem = 'PascalCase / Majuscule initiale';

      namingIssues.push({
        varName: v,
        problem,
        suggestion: suggestCamelCase(v)
      });
    }
  });

  // Detect Unused Outputs & Categorize Reason
  allOutputs.forEach((producersList, v) => {
    if (!allInputs.has(v)) {
      const uniqueProducers = Array.from(new Set(producersList.map(p => p.actName)));
      const uniqueParents = Array.from(new Set(producersList.map(p => p.parentProc)));

      let category = 'unused';
      let reasonLabel = '📊 Donnée d\'Audit / Stockage d\'instance';
      let badgeStyle = 'background:rgba(245, 158, 11, 0.1); color:var(--warn); border:1px solid rgba(245, 158, 11, 0.25);';

      const vLower = v.toLowerCase();
      if (vLower.includes('statut') || vLower.includes('result') || vLower.includes('accord') || vLower.includes('rapport') || vLower.includes('pv') || vLower.includes('output') || vLower.includes('ack') || vLower.includes('code') || vLower.includes('valide')) {
        category = 'payload_end';
        reasonLabel = '📤 Livrable Final / Payload Exporté';
        badgeStyle = 'background:rgba(16, 185, 129, 0.1); color:var(--ok); border:1px solid rgba(16, 185, 129, 0.25);';
      }

      unusedOutputs.push({
        varName: v,
        producers: uniqueProducers,
        parents: uniqueParents,
        category,
        reasonLabel,
        badgeStyle
      });
    }

    if (!camelCaseRegex.test(v) && !namingIssues.some(n => n.varName === v)) {
      let problem = 'Format non-camelCase';
      if (v.includes(' ')) problem = 'Espaces interdits';
      else if (v.startsWith('_') || v.startsWith('.')) problem = 'Préfixe spécial non recommandé';
      else if (v.includes('_')) problem = 'snake_case détecté';
      else if (/^[A-Z]/.test(v)) problem = 'PascalCase / Majuscule initiale';

      namingIssues.push({
        varName: v,
        problem,
        suggestion: suggestCamelCase(v)
      });
    }
  });

  const totalFlows = allInputs.size + allOutputs.size;
  const criticalOrphans = orphanInputs.filter(o => o.category === 'risk').length;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:10px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">🔍</span>
        <div>
          <h5 style="margin:0; font-size:13.5px; font-weight:700; color:var(--text-primary);">
            Audit de Lignage &amp; Cohérence des Variables (${totalFlows} variables déclarées)
          </h5>
          <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">
            Analyse sémantique du cycle de vie des données : entrées requises, sorties livrées et conformité BPMN.
          </div>
        </div>
      </div>
      <span style="font-size:11px; padding:3px 10px; border-radius:12px; ${criticalOrphans === 0 ? 'background:rgba(16, 185, 129, 0.12); color:var(--ok); border:1px solid rgba(16, 185, 129, 0.3);' : 'background:rgba(239, 68, 68, 0.12); color:var(--err); border:1px solid rgba(239, 68, 68, 0.3);'} font-weight:700;">
        ${criticalOrphans === 0 ? '✅ Flux de Données Équilibré' : '⚠️ ' + criticalOrphans + ' Entrée(s) Non Initialisée(s)'}
      </span>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
  `;

  // 1. ORPHAN INPUTS CARD
  html += `
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>🔴 Variables d'Entrée Consommées (${orphanInputs.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Non produites localement</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  `;

  if (orphanInputs.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ Toutes les variables consommées sont produites en amont par d\'autres tâches !</div>';
  } else {
    orphanInputs.forEach(item => {
      const consumersPreview = item.consumers.slice(0, 2).join(', ');
      const extraCount = item.consumers.length - 2;
      const extraText = extraCount > 0 ? ` <span style="color:var(--brand-primary); cursor:pointer;" title="${escAttr(item.consumers.join(', '))}">+ ${extraCount} autre(s)</span>` : '';
      const parentName = item.parents.slice(0, 2).join(', ');

      html += `
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
            <code style="color:var(--text-primary); font-weight:700; font-size:12px; background:rgba(0,156,215,0.08); padding:1px 5px; border-radius:4px;">${escHtml(item.varName)}</code>
            <span style="font-size:10px; padding:1px 6px; border-radius:10px; font-weight:600; ${item.badgeStyle}">${item.reasonLabel}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            <strong>Consommée par :</strong> ${escHtml(consumersPreview)}${extraText}
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">
            🏛️ <em>${escHtml(parentName)}</em>
          </div>
        </div>
      `;
    });
  }
  html += '</div></div>';

  // 2. UNUSED OUTPUTS CARD
  html += `
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>🟡 Variables de Sortie Générées (${unusedOutputs.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Non consommées en interne</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  `;

  if (unusedOutputs.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ Toutes les variables générées sont consommées par des tâches en aval !</div>';
  } else {
    unusedOutputs.forEach(item => {
      const producersPreview = item.producers.slice(0, 2).join(', ');
      const extraCount = item.producers.length - 2;
      const extraText = extraCount > 0 ? ` <span style="color:var(--brand-primary); cursor:pointer;" title="${escAttr(item.producers.join(', '))}">+ ${extraCount} autre(s)</span>` : '';
      const parentName = item.parents.slice(0, 2).join(', ');

      html += `
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
            <code style="color:var(--text-primary); font-weight:700; font-size:12px; background:rgba(245,158,11,0.08); padding:1px 5px; border-radius:4px;">${escHtml(item.varName)}</code>
            <span style="font-size:10px; padding:1px 6px; border-radius:10px; font-weight:600; ${item.badgeStyle}">${item.reasonLabel}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            <strong>Produite par :</strong> ${escHtml(producersPreview)}${extraText}
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">
            🏛️ <em>${escHtml(parentName)}</em>
          </div>
        </div>
      `;
    });
  }
  html += '</div></div>';

  // 3. NAMING CONVENTIONS CARD
  html += `
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>💡 Conventions &amp; Qualité du Nommage (${namingIssues.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Recommandations camelCase</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  `;

  if (namingIssues.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ 100% des variables respectent la norme <code>camelCase</code> !</div>';
  } else {
    namingIssues.forEach(item => {
      html += `
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <code style="color:var(--err); font-weight:700;">${escHtml(item.varName)}</code>
            <span style="font-size:10px; color:var(--text-tertiary); font-style:italic;">${escHtml(item.problem)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">
            Correction suggérée : <strong style="color:var(--ok); font-family:var(--font-mono);">${escHtml(item.suggestion)}</strong>
          </div>
        </div>
      `;
    });
  }
  html += '</div></div></div>';

  container.innerHTML = html;
};


window.renderPmgGlobalGridTable = function(containerId = 'pmgMatrixGlobalGridContainer') {
  let container = document.getElementById(containerId);
  if (!container) container = document.getElementById('pmgMatrixGlobalGridContainer') || document.getElementById('pmgGlobalGridContainer');
  if (!container) return;

  const activities = (window.pmgActivities && window.pmgActivities.length > 0)
    ? window.pmgActivities
    : (window.pmgTempSubprocesses || []);

  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-tertiary);"><span style="font-size:24px;">🩻</span><br><br>Aucune activité à afficher dans la grille. Veuillez importer des fichiers BPMN.</div>';
    return;
  }

  const modes = window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

  let rowsHtml = '';
  activities.forEach((act, idx) => {
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const curMode = act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle');

    let modeOptsHtml = '';
    modes.forEach(m => {
      const sel = m.toLowerCase() === curMode.toLowerCase() ? 'selected' : '';
      modeOptsHtml += `<option value="${escAttr(m)}" ${sel}>${escHtml(m)}</option>`;
    });

    const parentProc = act.parentProcessName || act.rootParentName || 'Parent';
    const cleanGroup = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(act.userGroup)
      : (act.userGroup || '');

    const inStr = Array.isArray(act.inputs) ? act.inputs.join(', ') : (act.inputs || '');
    const outStr = Array.isArray(act.outputs) ? act.outputs.join(', ') : (act.outputs || '');

    rowsHtml += `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:6px; text-align:center; color:var(--text-tertiary); font-weight:700; width:45px;">#${idx + 1}</td>
        <td style="padding:4px; min-width:180px;">
          <input type="text" value="${escAttr(act.name)}" oninput="updatePmgGridCell(${idx}, 'name', this.value)" style="width:100%; height:28px; font-size:11.5px; font-weight:600; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
          <div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">id: <code>${escHtml(act.id)}</code> &bull; 🏛️ ${escHtml(parentProc)}</div>
        </td>
        <td style="padding:4px; width:110px;">
          <span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:rgba(0,156,215,0.1); color:var(--brand-primary); font-weight:600; display:inline-block;">${escHtml(act.typeLabel || act.type)}</span>
        </td>
        <td style="padding:4px; min-width:130px;">
          <input type="text" value="${escAttr(act.entity || '')}" placeholder="Entité..." oninput="updatePmgGridCell(${idx}, 'entity', this.value)" style="width:100%; height:28px; font-size:11.5px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="${escAttr(cleanGroup)}" placeholder="Groupe..." oninput="updatePmgGridCell(${idx}, 'userGroup', this.value)" style="width:100%; height:28px; font-size:11.5px; font-family:var(--font-mono); border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="${escAttr(inStr)}" placeholder="Inputs (séparés par virgule)..." oninput="updatePmgGridCell(${idx}, 'inputs', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:#1e40af; padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="${escAttr(outStr)}" placeholder="Outputs..." oninput="updatePmgGridCell(${idx}, 'outputs', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:#15803d; padding:2px 6px;">
        </td>
        <td style="padding:4px; width:120px;">
          <select onchange="updatePmgGridCell(${idx}, 'realizationMode', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 4px;">
            ${modeOptsHtml}
          </select>
        </td>
        <td style="padding:4px; min-width:150px;">
          <input type="text" value="${escAttr(act.applicableCase || '')}" placeholder="Condition..." oninput="updatePmgGridCell(${idx}, 'applicableCase', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:160px;">
          <input type="text" value="${escAttr(act.comment || '')}" placeholder="Documentation..." oninput="updatePmgGridCell(${idx}, 'comment', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-secondary); padding:2px 6px;">
        </td>
      </tr>
    `;
  });

  const html = `
    <div class="chart-card" style="padding:16px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            🩻 Grille Rapide d'Édition Tableur (${activities.length} activités)
          </h4>
          <div style="font-size:12px; color:var(--text-secondary);">
            Édition ultra-rapide type Excel : toutes vos modifications de texte, groupes, inputs et modes sont synchronisées en direct.
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn-ghost" style="padding:4px 10px; font-size:11px;" onclick="exportPmgExcel()">
            📊 Exporter Excel (.xls)
          </button>
          <button class="btn-primary" style="padding:4px 12px; font-size:11px;" onclick="savePmgStateToLocalStorage(); alert('💾 Sauvegarde locale effectuée avec succès !');">
            💾 Enregistrer
          </button>
        </div>
      </div>
    </div>

    <div class="tbl-wrap" style="max-height:560px; overflow:auto; border:1px solid var(--border-color); border-radius:var(--border-radius-md); background:var(--bg-card);">
      <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:11.5px;">
        <thead style="position:sticky; top:0; z-index:5; background:#002060; color:#ffffff;">
          <tr>
            <th style="padding:8px 6px; width:45px; text-align:center;">#</th>
            <th style="padding:8px 6px; min-width:180px; text-align:left;">Nom de l'Activité &amp; ID</th>
            <th style="padding:8px 6px; width:110px;">Type BPMN</th>
            <th style="padding:8px 6px; min-width:130px;">Entité / Lane</th>
            <th style="padding:8px 6px; min-width:140px;">Groupe Utilisateur</th>
            <th style="padding:8px 6px; min-width:140px;">Variables In</th>
            <th style="padding:8px 6px; min-width:140px;">Variables Out</th>
            <th style="padding:8px 6px; width:120px;">Mode</th>
            <th style="padding:8px 6px; min-width:150px;">Applicable dans quel cas ?</th>
            <th style="padding:8px 6px; min-width:160px;">Commentaire / Documentation</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
};

window.updatePmgGridCell = function(index, field, value) {
  const activities = (window.pmgActivities && window.pmgActivities.length > 0)
    ? window.pmgActivities
    : (window.pmgTempSubprocesses || []);

  if (!activities || !activities[index]) return;

  const target = activities[index];

  if (field === 'inputs' || field === 'outputs') {
    target[field] = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
  } else if (field === 'userGroup') {
    target[field] = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(value)
      : value.trim();
  } else {
    target[field] = value.trim();
  }

  // Also sync in tempSubprocesses if activities is different
  if (window.pmgTempSubprocesses && window.pmgTempSubprocesses[index]) {
    window.pmgTempSubprocesses[index][field] = target[field];
  }

  window.savePmgStateToLocalStorage();
};

window.switchPmgSubView = function(viewKey) {
  const map = {
    matrix: { btn: 'btnPmgSubViewMatrix', sec: 'pmgSubViewMatrix' },
    flow: { btn: 'btnPmgSubViewFlow', sec: 'pmgSubViewFlow' },
    sop: { btn: 'btnPmgSubViewSop', sec: 'pmgSubViewSop' },
    devops: { btn: 'btnPmgSubViewDevops', sec: 'pmgSubViewDevops' },
    audit: { btn: 'btnPmgSubViewAudit', sec: 'pmgSubViewAudit' },
    raci: { btn: 'btnPmgSubViewRaci', sec: 'pmgSubViewRaci' },
    iocross: { btn: 'btnPmgSubViewIoCross', sec: 'pmgSubViewIoCross' },
    grid: { btn: 'btnPmgSubViewGrid', sec: 'pmgSubViewGrid' }
  };
  
  Object.keys(map).forEach(k => {
    const info = map[k];
    const btn = document.getElementById(info.btn);
    const sec = document.getElementById(info.sec);
    
    if (btn) {
      if (k === viewKey) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    
    if (sec) {
      sec.style.display = (k === viewKey) ? 'block' : 'none';
    }
  });

  if (viewKey === 'matrix') {
    if (window.renderPmgMatrix) window.renderPmgMatrix();
  } else if (viewKey === 'flow') {
    if (window.renderPmgInteractiveFlow) window.renderPmgInteractiveFlow('pmgInteractiveFlowContainer');
  } else if (viewKey === 'sop') {
    if (window.renderPmgSop) window.renderPmgSop('pmgSopContainer');
  } else if (viewKey === 'devops') {
    if (window.renderPmgDevopsJira) window.renderPmgDevopsJira('pmgDevopsJiraContainer');
  } else if (viewKey === 'audit') {
    if (window.renderPmgGovernanceAudit) window.renderPmgGovernanceAudit('pmgGovernanceAuditContainer');
  } else if (viewKey === 'raci') {
    if (window.renderPmgRaciMatrix) window.renderPmgRaciMatrix('pmgRaciContainer');
  } else if (viewKey === 'iocross') {
    if (window.renderPmgIoCrossMatrix) window.renderPmgIoCrossMatrix('pmgIoCrossContainer');
  } else if (viewKey === 'grid') {
    if (window.renderPmgGlobalGridTable) window.renderPmgGlobalGridTable('pmgMatrixGlobalGridContainer');
  }
};

window.autoFillPmgMissingDoc = function() {
  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    alert("Aucune activité chargée. Veuillez importer un ou plusieurs fichiers BPMN.");
    return;
  }

  let enrichedCount = 0;

  activities.forEach(act => {
    const nameLower = (act.name || '').toLowerCase();
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const isUser = (act.type || '').toLowerCase().includes('user');

    // 1. Suggest Applicability Condition ("Applicable dans quel cas ?")
    if (!act.applicableCase || act.applicableCase.trim() === '') {
      if (nameLower.includes('verif') || nameLower.includes('vérif') || nameLower.includes('qualif') || nameLower.includes('valid')) {
        act.applicableCase = "Cas nominal : si le dossier ou les données requises sont initialisées";
      } else if (nameLower.includes('fraud') || nameLower.includes('alert') || nameLower.includes('rejet') || nameLower.includes('suspect') || nameLower.includes('litige')) {
        act.applicableCase = "Cas d'exception : uniquement si score de risque élevé ou alerte anomalie";
      } else if (nameLower.includes('paiement') || nameLower.includes('factur') || nameLower.includes('debit') || nameLower.includes('débit') || nameLower.includes('encaisse')) {
        act.applicableCase = "Si commande approuvée et modalité de règlement sélectionnée";
      } else if (nameLower.includes('notif') || nameLower.includes('mail') || nameLower.includes('sms') || nameLower.includes('courrier') || nameLower.includes('relanc')) {
        act.applicableCase = "Systématique : à chaque jalon clé ou notification de l'usager";
      } else if (nameLower.includes('calcul') || nameLower.includes('scor') || nameLower.includes('tarifi')) {
        act.applicableCase = "Automatique dès réception du flux entrant complet";
      } else if (nameLower.includes('clotur') || nameLower.includes('clôtur') || nameLower.includes('archiv') || nameLower.includes('final')) {
        act.applicableCase = "Cas nominal : dès validation complète de toutes les étapes préalables";
      } else if (isSub) {
        act.applicableCase = "Appel du sous-processus métier dédié";
      } else {
        act.applicableCase = "Exécution standard du flux nominal";
      }
      enrichedCount++;
    }

    // 2. Suggest Professional Business Comment
    if (!act.comment || act.comment.trim() === '') {
      const entityName = act.entity && act.entity !== 'Non défini' ? act.entity : 'Acteur Métier';
      const grp = act.userGroup ? ` (${act.userGroup})` : '';
      const inCount = (act.inputs || []).length;
      const outCount = (act.outputs || []).length;
      
      act.comment = `Tâche opérée par ${entityName}${grp}. Traite ${inCount} entrée(s) et produit ${outCount} variable(s) pour la continuité du flux.`;
      enrichedCount++;
    }

    // 3. Auto-fix missing candidate group on user tasks
    if (isUser && (!act.userGroup || act.userGroup.trim() === '')) {
      const entClean = (act.entity && act.entity !== 'Non défini' ? act.entity : 'Operateurs')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      act.userGroup = `Gestionnaires_${entClean || 'Metier'}`;
      act.userGroupWarning = false;
      enrichedCount++;
    }

    // 4. Auto-assign realization mode if missing
    if (!act.realizationMode || act.realizationMode.trim() === '') {
      if (isSub) act.realizationMode = 'Call Activity';
      else if (isUser) act.realizationMode = 'Manuelle';
      else act.realizationMode = 'Automatique';
      enrichedCount++;
    }
  });

  // Re-sync with DOM inputs if visible
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();
  if (window.renderAllPmgStepKpis) window.renderAllPmgStepKpis();
  window.savePmgStateToLocalStorage();

  // Visual Alert / Feedback
  alert(`✨ Assistant IA PMG : ${enrichedCount} champ(s) documenté(s) ou harmonisé(s) automatiquement avec succès !`);
};

// =========================================================================
// FEATURE 2: AUDIT SANTÉ & RÈGLES DE GOUVERNANCE PMG (HEALTH CHECK)
// =========================================================================

window.renderPmgGovernanceAudit = function(containerId = 'pmgGovernanceAuditContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-tertiary);">Chargez des processus BPMN pour exécuter l\'audit de gouvernance PMG.</div>';
    return;
  }

  // Evaluate Rules:
  // Rule 1: User Tasks Candidate Groups
  const userTasks = activities.filter(a => (a.type || '').toLowerCase().includes('user'));
  const userTasksMissingGroup = userTasks.filter(a => !a.userGroup || a.userGroup.trim() === '');
  const r1Score = userTasks.length === 0 ? 100 : Math.round(((userTasks.length - userTasksMissingGroup.length) / userTasks.length) * 100);

  // Rule 2: Data Lineage Continuity (At least 1 Input or 1 Output)
  const tasksMissingIo = activities.filter(a => (!a.inputs || a.inputs.length === 0) && (!a.outputs || a.outputs.length === 0));
  const r2Score = Math.round(((activities.length - tasksMissingIo.length) / activities.length) * 100);

  // Rule 3: Applicability Conditions & Gateways Coverage
  const tasksMissingCase = activities.filter(a => !a.applicableCase || a.applicableCase.trim() === '');
  const r3Score = Math.round(((activities.length - tasksMissingCase.length) / activities.length) * 100);

  // Rule 4: Realization Modes Consistency
  const modesValid = ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];
  const tasksInvalidMode = activities.filter(a => !a.realizationMode || !modesValid.some(m => m.toLowerCase() === a.realizationMode.toLowerCase()));
  const r4Score = Math.round(((activities.length - tasksInvalidMode.length) / activities.length) * 100);

  // Rule 5: Roles & Entities Assignment
  const tasksMissingEntity = activities.filter(a => !a.entity || a.entity === 'Non défini');
  const r5Score = Math.round(((activities.length - tasksMissingEntity.length) / activities.length) * 100);

  // Overall Weighted Governance Score
  const globalScore = Math.round((r1Score * 0.25) + (r2Score * 0.25) + (r3Score * 0.2) + (r4Score * 0.15) + (r5Score * 0.15));

  let scoreColor = '#10b981';
  let scoreBadge = 'Excellent (Conforme Bouygues Telecom)';
  if (globalScore < 60) {
    scoreColor = '#ef4444';
    scoreBadge = 'Critique : Non conforme aux exigences PMG';
  } else if (globalScore < 85) {
    scoreColor = '#f59e0b';
    scoreBadge = 'Moyen : Améliorations recommandées';
  }

  let html = `
    <!-- Carte Score Global -->
    <div class="chart-card" style="padding:22px; margin-bottom:18px; border-left: 5px solid ${scoreColor};">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:18px;">
          <div style="width:72px; height:72px; border-radius:50%; background:radial-gradient(circle, ${scoreColor}22 0%, ${scoreColor}05 70%); border: 3px solid ${scoreColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 14px ${scoreColor}44;">
            <span style="font-size:22px; font-weight:800; color:${scoreColor}; line-height:1;">${globalScore}%</span>
            <span style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">Score</span>
          </div>
          <div>
            <h3 style="margin:0 0 4px; font-size:17px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              🛡️ Audit de Santé &amp; Conformité Gouvernance PMG
              <span class="badge" style="background:${scoreColor}15; color:${scoreColor}; border:1px solid ${scoreColor}44; font-size:11px; padding:3px 8px;">${scoreBadge}</span>
            </h3>
            <p style="margin:0; font-size:12.5px; color:var(--text-secondary);">
              Évaluation automatique de 5 règles qualité indispensables pour la certification et le passage en production des matrices PMG.
            </p>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-primary" style="padding:8px 16px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;" onclick="autoFillPmgMissingDoc(); renderPmgGovernanceAudit('${containerId}');">
            ⚡ Tout Corriger / Auto-Compléter (1-Clic)
          </button>
        </div>
      </div>
    </div>

    <!-- Grille des 5 Règles de Gouvernance -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px; margin-bottom:18px;">
      
      <!-- Règle 1: Candidate Groups -->
      <div class="pmg-gov-card">
        <div class="pmg-gov-header">
          <div class="pmg-gov-rule-title">
            <span>👤</span> Règle 1 : Rôles &amp; Candidate Groups
          </div>
          <span class="pmg-badge-${r1Score >= 80 ? 'ok' : (r1Score >= 50 ? 'warn' : 'warn')}">${r1Score}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Toutes les <em>User Tasks</em> doivent déclarer un groupe d'utilisateurs éligible (<code>camunda:candidateGroups</code>).
        </div>
        <div style="font-size:11.5px;">
          ${userTasksMissingGroup.length === 0 
            ? '<span style="color:var(--ok);">✅ Toutes les User Tasks ont un groupe candidat.</span>' 
            : `<div style="color:var(--warn); margin-bottom:6px;">⚠️ <strong>${userTasksMissingGroup.length} User Task(s) sans groupe :</strong> ${userTasksMissingGroup.map(u => `<code>${escHtml(u.name)}</code>`).slice(0, 3).join(', ')}${userTasksMissingGroup.length > 3 ? '...' : ''}</div>
               <button class="btn-ghost" style="font-size:11px; padding:4px 8px; border:1px solid var(--brand-primary); color:var(--brand-primary);" onclick="autoFixPmgUserGroups(); renderPmgGovernanceAudit('${containerId}');">✨ Affecter automatiquement depuis les Lanes</button>`
          }
        </div>
      </div>

      <!-- Règle 2: Data Lineage Continuity -->
      <div class="pmg-gov-card">
        <div class="pmg-gov-header">
          <div class="pmg-gov-rule-title">
            <span>🔄</span> Règle 2 : Continuité Flux &amp; Lineage I/O
          </div>
          <span class="pmg-badge-${r2Score >= 70 ? 'ok' : 'warn'}">${r2Score}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Chaque activité doit consommer (Input) ou générer (Output) au moins une variable métier.
        </div>
        <div style="font-size:11.5px;">
          ${tasksMissingIo.length === 0 
            ? '<span style="color:var(--ok);">✅ Lignage de données complet sur 100% des tâches.</span>' 
            : `<span style="color:var(--warn);">⚠️ <strong>${tasksMissingIo.length} activité(s)</strong> sans variable I/O associée.</span>`
          }
        </div>
      </div>

      <!-- Règle 3: Applicability Conditions -->
      <div class="pmg-gov-card">
        <div class="pmg-gov-header">
          <div class="pmg-gov-rule-title">
            <span>🔀</span> Règle 3 : Conditions &amp; Cas Déclencheurs
          </div>
          <span class="pmg-badge-${r3Score >= 80 ? 'ok' : 'warn'}">${r3Score}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          La colonne <em>Applicable dans quel cas ?</em> doit être explicitée (nominal, exceptions, branches FEEL).
        </div>
        <div style="font-size:11.5px;">
          ${tasksMissingCase.length === 0 
            ? '<span style="color:var(--ok);">✅ 100% des tâches ont leur condition renseignée.</span>' 
            : `<div style="color:var(--warn); margin-bottom:6px;">⚠️ <strong>${tasksMissingCase.length} tâche(s)</strong> sans condition.</div>
               <button class="btn-ghost" style="font-size:11px; padding:4px 8px; border:1px solid var(--brand-primary); color:var(--brand-primary);" onclick="autoFillPmgMissingDoc(); renderPmgGovernanceAudit('${containerId}');">✨ Suggérer les conditions manquantes</button>`
          }
        </div>
      </div>

      <!-- Règle 4: Realization Modes -->
      <div class="pmg-gov-card">
        <div class="pmg-gov-header">
          <div class="pmg-gov-rule-title">
            <span>⚙️</span> Règle 4 : Modes de Réalisation Standard
          </div>
          <span class="pmg-badge-${r4Score >= 90 ? 'ok' : 'warn'}">${r4Score}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Les modes doivent appartenir au référentiel Bouygues Telecom (<em>SP0, Call Activity, Manuelle, Automatique</em>).
        </div>
        <div style="font-size:11.5px;">
          ${tasksInvalidMode.length === 0 
            ? '<span style="color:var(--ok);">✅ Tous les modes de réalisation sont conformes.</span>' 
            : `<div style="color:var(--warn); margin-bottom:6px;">⚠️ <strong>${tasksInvalidMode.length} tâche(s)</strong> avec mode non standard.</div>
               <button class="btn-ghost" style="font-size:11px; padding:4px 8px; border:1px solid var(--ok); color:var(--ok);" onclick="autoHarmonizePmgModes(); renderPmgGovernanceAudit('${containerId}');">🪄 Harmoniser vers le standard</button>`
          }
        </div>
      </div>

      <!-- Règle 5: Lanes & Entities Assignment -->
      <div class="pmg-gov-card">
        <div class="pmg-gov-header">
          <div class="pmg-gov-rule-title">
            <span>🏢</span> Règle 5 : Affectation des Pools &amp; Lanes
          </div>
          <span class="pmg-badge-${r5Score >= 85 ? 'ok' : 'warn'}">${r5Score}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Aucune tâche ne doit rester sans entité ou rôle responsable (<em>Non défini</em>).
        </div>
        <div style="font-size:11.5px;">
          ${tasksMissingEntity.length === 0 
            ? '<span style="color:var(--ok);">✅ 100% des activités sont affectées à une entité métier.</span>' 
            : `<span style="color:var(--warn);">⚠️ <strong>${tasksMissingEntity.length} tâche(s)</strong> orphelines sans Lane définie.</span>`
          }
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;
};

window.autoFixPmgUserGroups = function() {
  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  let fixed = 0;
  activities.forEach(act => {
    if ((act.type || '').toLowerCase().includes('user') && (!act.userGroup || act.userGroup.trim() === '')) {
      const entClean = (act.entity && act.entity !== 'Non défini' ? act.entity : 'Operateurs')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      act.userGroup = `Gestionnaires_${entClean || 'Metier'}`;
      act.userGroupWarning = false;
      fixed++;
    }
  });
  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();
  if (window.renderAllPmgStepKpis) window.renderAllPmgStepKpis();
  window.savePmgStateToLocalStorage();
  alert(`✅ ${fixed} groupe(s) candidat(s) assigné(s) automatiquement aux User Tasks.`);
};

window.autoHarmonizePmgModes = function() {
  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  let fixed = 0;
  activities.forEach(act => {
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const isUser = (act.type || '').toLowerCase().includes('user');
    if (isSub) act.realizationMode = 'Call Activity';
    else if (isUser) act.realizationMode = 'Manuelle';
    else act.realizationMode = 'Automatique';
    fixed++;
  });
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();
  if (window.renderAllPmgStepKpis) window.renderAllPmgStepKpis();
  window.savePmgStateToLocalStorage();
  alert(`🪄 ${fixed} mode(s) de réalisation harmonisé(s) selon le type BPMN.`);
};

// =========================================================================
// FEATURE 3: MATRICE RACI DYNAMIQUE & ANALYSE DES HAND-OFFS
// =========================================================================

window.renderPmgRaciMatrix = function(containerId = 'pmgRaciContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-tertiary);">Chargez des processus BPMN pour générer la Matrice RACI.</div>';
    return;
  }

  // 1. Identify all unique roles / entities (Columns)
  const entitySet = new Set();
  activities.forEach(a => {
    if (a.entity && a.entity.trim().length > 0 && a.entity !== 'Non défini') entitySet.add(a.entity);
  });
  const entities = Array.from(entitySet);
  if (entities.length === 0) entities.push('Direction Métier');

  // Process Owner (Accountable default)
  const owner = window.pmgProcessDetails?.owner || 'Direction Métier (Process Owner)';
  if (!entities.includes(owner) && owner !== 'Non défini') {
    entities.unshift(owner);
  }

  // 2. Compute Hand-offs (Transitions between different entities)
  let handOffCount = 0;
  const handOffPairs = [];
  for (let i = 0; i < activities.length - 1; i++) {
    const curEnt = activities[i].entity || 'Non défini';
    const nextEnt = activities[i + 1].entity || 'Non défini';
    if (curEnt !== nextEnt && curEnt !== 'Non défini' && nextEnt !== 'Non défini') {
      handOffCount++;
      handOffPairs.push(`${curEnt} ➔ ${nextEnt}`);
    }
  }

  // 3. Build RACI Mapping
  // Producer map: varName -> entity that produces it
  const varProducerMap = new Map();
  activities.forEach(a => {
    (a.outputs || []).forEach(outVar => {
      const v = getVarName(outVar);
      if (v && a.entity) varProducerMap.set(v, a.entity);
    });
  });

  // Table headers
  let headersHtml = `<th style="padding:8px; min-width:180px; text-align:left;">Activité / Tâche BPMN</th>`;
  entities.forEach(ent => {
    headersHtml += `<th style="padding:8px; min-width:120px; text-align:center;">${escHtml(ent)}</th>`;
  });

  // Table rows
  let rowsHtml = '';
  activities.forEach((act, idx) => {
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const actEntity = act.entity || 'Non défini';

    let cellsHtml = '';
    entities.forEach(ent => {
      const raciRoles = [];

      // R (Responsible): The entity executing this activity
      if (ent === actEntity) {
        raciRoles.push('<span class="pmg-raci-tag pmg-raci-tag-r" title="Responsible (Réalise la tâche)">R</span>');
      }

      // A (Accountable): Process Owner or Lane Owner
      if (ent === owner || (entities.length === 1 && ent === actEntity)) {
        raciRoles.push('<span class="pmg-raci-tag pmg-raci-tag-a" title="Accountable (Rend des comptes)">A</span>');
      }

      // C (Consulted): Entity that provided input variables
      const inputs = act.inputs || [];
      const isConsulted = inputs.some(inVar => {
        const prodEnt = varProducerMap.get(getVarName(inVar));
        return prodEnt === ent && ent !== actEntity;
      });
      if (isConsulted) {
        raciRoles.push('<span class="pmg-raci-tag pmg-raci-tag-c" title="Consulted (Fournit les données en entrée)">C</span>');
      }

      // I (Informed): Entity that consumes outputs of this activity in downstream tasks
      const outputs = act.outputs || [];
      const isInformed = activities.slice(idx + 1).some(downAct => {
        if (downAct.entity === ent && ent !== actEntity) {
          return (downAct.inputs || []).some(inVar => outputs.some(outVar => getVarName(outVar) === getVarName(inVar)));
        }
        return false;
      });
      if (isInformed) {
        raciRoles.push('<span class="pmg-raci-tag pmg-raci-tag-i" title="Informed (Consomme les résultats produits)">I</span>');
      }

      cellsHtml += `<td style="padding:6px; text-align:center;">${raciRoles.length > 0 ? raciRoles.join('') : '<span style="color:#cbd5e1;">—</span>'}</td>`;
    });

    const indent = (act.level && act.level > 1) ? (act.level - 1) * 12 : 0;

    rowsHtml += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding:8px 8px 8px ${indent + 8}px;">
          <div style="font-weight:600; color:var(--text-primary);">${escHtml(act.name)}</div>
          <span style="font-size:10.5px; color:var(--text-tertiary);">${escHtml(act.typeLabel || act.type)} (${escHtml(act.id)})</span>
        </td>
        ${cellsHtml}
      </tr>
    `;
  });

  html = `
    <!-- Carte KPI RACI & Hand-offs -->
    <div class="chart-card" style="padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            👥 Matrice des Responsabilités RACI &amp; Analyse des Passations (Hand-Offs)
          </h4>
          <div style="font-size:12px; color:var(--text-secondary);">
            Générée automatiquement par croisement des Lanes BPMN et du lignage des flux de données I/O.
          </div>
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px; display:flex; align-items:center; gap:6px;">
            🔀 Passations Inter-Équipes : <strong style="color:${handOffCount > 5 ? 'var(--warn)' : 'var(--ok)'};">${handOffCount} Hand-offs</strong>
          </div>
        </div>
      </div>

      <!-- Légende RACI -->
      <div style="display:flex; gap:14px; margin-top:12px; flex-wrap:wrap; font-size:11.5px; padding-top:10px; border-top:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:6px;"><span class="pmg-raci-tag pmg-raci-tag-r">R</span> <strong>Responsible</strong> (Réalisateur direct)</div>
        <div style="display:flex; align-items:center; gap:6px;"><span class="pmg-raci-tag pmg-raci-tag-a">A</span> <strong>Accountable</strong> (Responsable / Décideur)</div>
        <div style="display:flex; align-items:center; gap:6px;"><span class="pmg-raci-tag pmg-raci-tag-c">C</span> <strong>Consulted</strong> (Fournisseur de données en amont)</div>
        <div style="display:flex; align-items:center; gap:6px;"><span class="pmg-raci-tag pmg-raci-tag-i">I</span> <strong>Informed</strong> (Destinataire / Consommateur aval)</div>
      </div>
    </div>

    <!-- Tableau RACI -->
    <div class="tbl-wrap" style="max-height:480px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
      <table style="width:100%; font-size:12px;">
        <thead>
          <tr style="background:#002060; color:#ffffff;">
            ${headersHtml}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
};

// =========================================================================
// FEATURE 4: MATRICE CROISÉE FLUX DE DONNÉES (I/O CROSS-TABLE)
// =========================================================================

window.pmgIoCrossState = window.pmgIoCrossState || {
  search: '',
  statusFilter: 'all',
  processFilter: 'all',
  viewMode: 'lineage', // 'lineage' or 'matrix'
  page: 1,
  pageSize: 25
};

window.renderPmgIoCrossMatrix = function(containerId = 'pmgIoCrossContainer') {
  let container = document.getElementById(containerId);
  if (!container) container = document.getElementById('pmgIoCrossContainer');
  if (!container) return;

  const activities = (window.pmgActivities && window.pmgActivities.length > 0)
    ? window.pmgActivities
    : (window.pmgTempSubprocesses || []);

  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-tertiary);"><span style="font-size:32px;">🔄</span><br><br><strong>Aucune activité BPMN chargée</strong><br>Importez un ou plusieurs diagrammes BPMN pour explorer les flux I/O et la traçabilité des données.</div>';
    return;
  }

  function getCleanVar(str) {
    if (!str) return '';
    let s = String(str).trim();
    if (s.startsWith('=')) s = s.substring(1).trim();
    const idx = s.indexOf('(');
    if (idx !== -1) s = s.substring(0, idx).trim();
    if (s.includes('=')) s = s.split('=')[0].trim();
    if (s.includes(':')) s = s.split(':')[0].trim();
    s = s.replace(/^[="'\[]+|[="'\]]+$/g, '').trim();
    return s;
  }

  // 1. Collect all unique processes for filtering
  const processNamesSet = new Set();
  activities.forEach(a => {
    const p = a.parentProcessName || a.rootParentName;
    if (p) processNamesSet.add(p);
  });
  const allProcessNames = Array.from(processNamesSet).sort();

  // 2. Map all variables with their producers, consumers, and metadata
  const varMap = new Map();

  activities.forEach(act => {
    const parentProc = act.parentProcessName || act.rootParentName || 'Processus Principal';
    const entity = act.entity || 'Non défini';

    (act.inputs || []).forEach(inVar => {
      const v = getCleanVar(inVar);
      if (!v) return;
      if (!varMap.has(v)) {
        varMap.set(v, {
          name: v,
          producers: [],
          consumers: [],
          producerProcs: new Set(),
          consumerProcs: new Set(),
          producerEntities: new Set(),
          consumerEntities: new Set()
        });
      }
      const item = varMap.get(v);
      item.consumers.push({ actName: act.name, actId: act.id, process: parentProc, entity: entity, type: act.type });
      item.consumerProcs.add(parentProc);
      item.consumerEntities.add(entity);
    });

    (act.outputs || []).forEach(outVar => {
      const v = getCleanVar(outVar);
      if (!v) return;
      if (!varMap.has(v)) {
        varMap.set(v, {
          name: v,
          producers: [],
          consumers: [],
          producerProcs: new Set(),
          consumerProcs: new Set(),
          producerEntities: new Set(),
          consumerEntities: new Set()
        });
      }
      const item = varMap.get(v);
      item.producers.push({ actName: act.name, actId: act.id, process: parentProc, entity: entity, type: act.type });
      item.producerProcs.add(parentProc);
      item.producerEntities.add(entity);
    });
  });

  const allVarsList = Array.from(varMap.values()).map(item => {
    let status = 'complete';
    let statusLabel = 'Complet (Produit & Consommé)';
    let statusBadge = '<span style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">✅ Flux Valide</span>';

    const isInterProcess = item.producerProcs.size > 0 && item.consumerProcs.size > 0 &&
      (Array.from(item.producerProcs).some(p => !item.consumerProcs.has(p)) || item.producerProcs.size > 1 || item.consumerProcs.size > 1);

    if (item.producers.length === 0 && item.consumers.length > 0) {
      status = 'no_producer';
      statusLabel = 'Entrée Initiale (Sans producteur amont)';
      statusBadge = '<span style="background:rgba(59,130,246,0.12); color:#2563eb; border:1px solid rgba(59,130,246,0.3); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">📥 Entrée Initiale</span>';
    } else if (item.producers.length > 0 && item.consumers.length === 0) {
      status = 'dead_output';
      statusLabel = 'Sortie Finale / Non relue';
      statusBadge = '<span style="background:rgba(245,158,11,0.12); color:#d97706; border:1px solid rgba(245,158,11,0.3); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">⚠️ Sortie Non Consommée</span>';
    } else if (isInterProcess) {
      status = 'inter_process';
      statusLabel = 'Flux Inter-Processus';
      statusBadge = '<span style="background:rgba(139,92,246,0.12); color:#7c3aed; border:1px solid rgba(139,92,246,0.3); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">🔄 Inter-Processus</span>';
    }

    return {
      ...item,
      status,
      statusLabel,
      statusBadge,
      isInterProcess
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Global KPIs
  const totalVars = allVarsList.length;
  const noProducerCount = allVarsList.filter(v => v.status === 'no_producer').length;
  const deadOutputCount = allVarsList.filter(v => v.status === 'dead_output').length;
  const completeCount = allVarsList.filter(v => v.status === 'complete').length;
  const interProcessCount = allVarsList.filter(v => v.isInterProcess).length;

  // Apply filters
  const state = window.pmgIoCrossState;
  const searchLower = (state.search || '').toLowerCase().trim();

  const filteredVars = allVarsList.filter(v => {
    if (searchLower) {
      const matchName = v.name.toLowerCase().includes(searchLower);
      const matchProd = v.producers.some(p => p.actName.toLowerCase().includes(searchLower) || p.process.toLowerCase().includes(searchLower));
      const matchCons = v.consumers.some(c => c.actName.toLowerCase().includes(searchLower) || c.process.toLowerCase().includes(searchLower));
      if (!matchName && !matchProd && !matchCons) return false;
    }

    if (state.statusFilter !== 'all') {
      if (state.statusFilter === 'inter_process') {
        if (!v.isInterProcess) return false;
      } else if (v.status !== state.statusFilter) {
        return false;
      }
    }

    if (state.processFilter !== 'all') {
      const inProds = Array.from(v.producerProcs).includes(state.processFilter);
      const inCons = Array.from(v.consumerProcs).includes(state.processFilter);
      if (!inProds && !inCons) return false;
    }

    return true;
  });

  // Event handlers
  window.onPmgIoCrossSearch = function(val) {
    window.pmgIoCrossState.search = val;
    window.pmgIoCrossState.page = 1;
    window.renderPmgIoCrossMatrix(containerId);
  };

  window.setPmgIoCrossFilter = function(key, val) {
    window.pmgIoCrossState[key] = val;
    window.pmgIoCrossState.page = 1;
    window.renderPmgIoCrossMatrix(containerId);
  };

  window.setPmgIoCrossViewMode = function(mode) {
    window.pmgIoCrossState.viewMode = mode;
    window.renderPmgIoCrossMatrix(containerId);
  };

  window.exportPmgIoCrossCSV = function() {
    let csv = "\uFEFFVariable;Statut Lignage;Nb Producteurs;Producteurs (Activité [Processus]);Nb Consommateurs;Consommateurs (Activité [Processus]);Flux Inter-Processus\r\n";
    filteredVars.forEach(v => {
      const prodsStr = v.producers.map(p => `${p.actName} [${p.process}]`).join(' | ');
      const consStr = v.consumers.map(c => `${c.actName} [${c.process}]`).join(' | ');
      csv += `"${v.name}";"${v.statusLabel}";"${v.producers.length}";"${prodsStr}";"${v.consumers.length}";"${consStr}";"${v.isInterProcess ? 'OUI' : 'NON'}"\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pmg_flux_io_lignage_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination for Lineage View
  const page = state.page || 1;
  const pageSize = state.pageSize || 25;
  const totalPages = Math.ceil(filteredVars.length / pageSize) || 1;
  const pagedVars = filteredVars.slice((page - 1) * pageSize, page * pageSize);

  // 3. Render HTML Sub-sections
  let contentHtml = '';

  if (state.viewMode === 'lineage') {
    // -------------------------------------------------------------
    // MODE 1 : VUE TRAÇABILITÉ & DICTIONNAIRE LIGNAGE (ULTRA CLAIR)
    // -------------------------------------------------------------
    if (filteredVars.length === 0) {
      contentHtml = `
        <div style="padding:40px; text-align:center; color:var(--text-tertiary); background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
          <div style="font-size:28px; margin-bottom:8px;">🔍</div>
          <strong>Aucune variable ne correspond aux critères de filtre.</strong>
          <p style="margin:4px 0 0; font-size:12px;">Essayez de réinitialiser la recherche ou de changer les filtres de statut.</p>
        </div>
      `;
    } else {
      let rows = '';
      pagedVars.forEach((v, vIdx) => {
        const rowBg = vIdx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-hover)';

        // Format Producers chips
        let prodChips = '';
        if (v.producers.length === 0) {
          prodChips = '<span style="color:var(--text-tertiary); font-style:italic; font-size:11px;">Aucun producteur (Variable d\'entrée système ou utilisateur)</span>';
        } else {
          prodChips = v.producers.map(p => `
            <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:6px; padding:4px 8px; margin-bottom:4px; font-size:11px; display:inline-block; margin-right:4px;">
              <strong style="color:var(--text-primary);">${escHtml(p.actName)}</strong>
              <div style="color:#009cd7; font-size:10px; margin-top:2px;">🏛️ ${escHtml(p.process)} ${p.entity !== 'Non défini' ? '&bull; 👤 ' + escHtml(p.entity) : ''}</div>
            </div>
          `).join('');
        }

        // Format Consumers chips
        let consChips = '';
        if (v.consumers.length === 0) {
          consChips = '<span style="color:var(--warn); font-style:italic; font-size:11px;">Aucun consommateur direct dans ce lot de processus</span>';
        } else {
          consChips = v.consumers.map(c => `
            <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); border-radius:6px; padding:4px 8px; margin-bottom:4px; font-size:11px; display:inline-block; margin-right:4px;">
              <strong style="color:var(--text-primary);">${escHtml(c.actName)}</strong>
              <div style="color:#009cd7; font-size:10px; margin-top:2px;">🏛️ ${escHtml(c.process)} ${c.entity !== 'Non défini' ? '&bull; 👤 ' + escHtml(c.entity) : ''}</div>
            </div>
          `).join('');
        }

        // Flow diagram snippet
        const flowId = `pmgFlowSnippet_${vIdx}`;

        rows += `
          <tr style="background:${rowBg}; border-bottom:1px solid var(--border-color); vertical-align:top;">
            <td style="padding:10px 12px; font-family:var(--font-mono, monospace); font-weight:700; color:var(--text-primary); font-size:12px; width:220px; word-break:break-all;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#009cd7;">📦</span>
                <span>${escHtml(v.name)}</span>
              </div>
            </td>
            <td style="padding:10px 8px; width:170px; text-align:center;">
              ${v.statusBadge}
            </td>
            <td style="padding:10px 12px; width:35%;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); padding:1px 6px; border-radius:4px;">SORTIE / ÉCRITURE (${v.producers.length})</span>
              </div>
              <div>${prodChips}</div>
            </td>
            <td style="padding:10px 12px; width:35%;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#3b82f6; background:rgba(59,130,246,0.15); padding:1px 6px; border-radius:4px;">ENTRÉE / LECTURE (${v.consumers.length})</span>
              </div>
              <div>${consChips}</div>
            </td>
          </tr>
        `;
      });

      contentHtml = `
        <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow:hidden; background:var(--bg-card); box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="overflow-x:auto;">
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
              <thead>
                <tr style="background:#002060; color:#fff;">
                  <th style="padding:10px 12px; text-align:left; font-size:11.5px;">Variable BPMN</th>
                  <th style="padding:10px 8px; text-align:center; font-size:11.5px;">Diagnostic Lignage</th>
                  <th style="padding:10px 12px; text-align:left; font-size:11.5px;">Activités Productrices (Écritures / Outputs)</th>
                  <th style="padding:10px 12px; text-align:left; font-size:11.5px;">Activités Consommatrices (Lectures / Inputs &amp; FEEL)</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:var(--bg-card); border-top:1px solid var(--border-color); font-size:12px;">
            <div style="color:var(--text-secondary);">
              Affichage de <strong>${(page - 1) * pageSize + 1}</strong> à <strong>${Math.min(page * pageSize, filteredVars.length)}</strong> sur <strong>${filteredVars.length}</strong> variables
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn-ghost" style="padding:3px 8px; font-size:11px;" ${page <= 1 ? 'disabled' : ''} onclick="window.pmgIoCrossState.page--; window.renderPmgIoCrossMatrix('${containerId}');">
                &larr; Précédent
              </button>
              <span style="font-weight:700; color:var(--text-primary); padding:0 4px;">Page ${page} / ${totalPages}</span>
              <button class="btn-ghost" style="padding:3px 8px; font-size:11px;" ${page >= totalPages ? 'disabled' : ''} onclick="window.pmgIoCrossState.page++; window.renderPmgIoCrossMatrix('${containerId}');">
                Suivant &rarr;
              </button>
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // -------------------------------------------------------------
    // MODE 2 : VUE MATRICE 2D AVEC SCROLLING ET COLONNES LISIBLES
    // -------------------------------------------------------------
    // Limit to max 30 variables at a time in 2D grid to keep it ultra-readable and performant
    const matrixVars = filteredVars.slice(0, 30);
    const hasMore = filteredVars.length > 30;

    let headersHtml = '<th style="padding:10px 12px; min-width:240px; max-width:280px; text-align:left; position:sticky; left:0; top:0; background:#002060; color:#fff; z-index:10; border-right:2px solid #001233;">Activité BPMN</th>';
    matrixVars.forEach(v => {
      headersHtml += `
        <th style="padding:8px 10px; min-width:150px; max-width:180px; text-align:center; position:sticky; top:0; background:#002060; color:#fff; font-family:var(--font-mono, monospace); font-size:11px; z-index:5; border-left:1px solid rgba(255,255,255,0.15); word-break:break-word;">
          <div style="font-weight:700; color:#fff;">${escHtml(v.name)}</div>
          <div style="font-size:9.5px; opacity:0.8; font-weight:normal; margin-top:2px;">${v.producers.length} prod / ${v.consumers.length} cons</div>
        </th>
      `;
    });

    let matrixRowsHtml = '';
    activities.forEach((act, actIdx) => {
      const inSet = new Set((act.inputs || []).map(getCleanVar));
      const outSet = new Set((act.outputs || []).map(getCleanVar));
      const parentProc = act.parentProcessName || act.rootParentName || 'Processus';

      // Check if activity is related to any of the displayed matrixVars
      const isRelevant = matrixVars.some(v => inSet.has(v.name) || outSet.has(v.name));
      if (!isRelevant && matrixVars.length > 0 && state.search) return; // skip unrelated in search

      let cells = '';
      matrixVars.forEach(v => {
        const isIn = inSet.has(v.name);
        const isOut = outSet.has(v.name);

        if (isIn && isOut) {
          cells += '<td style="padding:6px; text-align:center; background:rgba(99,102,241,0.08); border-left:1px solid var(--border-color);"><span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; background:#6366f1; color:#fff;" title="Transformateur (Reçoit et Produit)">🟣 E/S</span></td>';
        } else if (isOut) {
          cells += '<td style="padding:6px; text-align:center; background:rgba(16,185,129,0.08); border-left:1px solid var(--border-color);"><span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; background:#10b981; color:#fff;" title="Producteur (Sortie)">🟢 Sortie</span></td>';
        } else if (isIn) {
          cells += '<td style="padding:6px; text-align:center; background:rgba(59,130,246,0.08); border-left:1px solid var(--border-color);"><span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; background:#3b82f6; color:#fff;" title="Consommateur (Entrée)">🔵 Entrée</span></td>';
        } else {
          cells += '<td style="padding:6px; text-align:center; color:var(--text-tertiary); opacity:0.3; border-left:1px solid var(--border-color);">&mdash;</td>';
        }
      });

      matrixRowsHtml += `
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:8px 12px; position:sticky; left:0; background:var(--bg-card); font-weight:600; z-index:2; border-right:2px solid var(--border-color); min-width:240px; max-width:280px;">
            <div style="font-size:11.5px; color:var(--text-primary); font-weight:700;">${escHtml(act.name)}</div>
            <div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">
              🏛️ <strong style="color:#009cd7;">${escHtml(parentProc)}</strong> &bull; ${escHtml(act.entity || '')}
            </div>
          </td>
          ${cells}
        </tr>
      `;
    });

    contentHtml = `
      <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow:hidden; background:var(--bg-card);">
        ${hasMore ? `
          <div style="background:#FEF3C7; color:#92400E; padding:8px 12px; font-size:11.5px; font-weight:600; border-bottom:1px solid #FDE68A; display:flex; align-items:center; justify-content:space-between;">
            <span>ℹ️ Affichage des 30 premières variables sur ${filteredVars.length}. Utilisez le filtre de recherche ci-dessus pour cibler des variables spécifiques.</span>
            <button class="btn-ghost" style="padding:2px 8px; font-size:11px; background:#fff;" onclick="window.setPmgIoCrossViewMode('lineage')">Basculer en Vue Lignage Complète</button>
          </div>
        ` : ''}
        <div style="max-height:560px; overflow:auto;">
          <table style="width:max-content; min-width:100%; font-size:11.5px; border-collapse:separate; border-spacing:0;">
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${matrixRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. Overall Layout Construction
  const html = `
    <!-- KPI Header Banner -->
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px 20px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:8px; background:rgba(0,156,215,0.12); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--brand-primary);">
              🔄
            </div>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text-primary);">
                Traçabilité des Flux I/O &amp; Lignage des Variables
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                Cartographie complète des échanges de données entre activités et sous-processus BPMN.
              </p>
            </div>
          </div>
        </div>

        <!-- KPI Badges -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:8px; border:1px solid var(--border-color); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-tertiary); font-weight:700;">Total Variables</div>
            <div style="font-size:16px; font-weight:800; color:var(--text-primary);">${totalVars}</div>
          </div>
          <div style="background:rgba(16,185,129,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#10b981; font-weight:700;">✅ Flux Valides</div>
            <div style="font-size:16px; font-weight:800; color:#10b981;">${completeCount}</div>
          </div>
          <div style="background:rgba(59,130,246,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(59,130,246,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#2563eb; font-weight:700;">📥 Entrées Initiales</div>
            <div style="font-size:16px; font-weight:800; color:#2563eb;">${noProducerCount}</div>
          </div>
          <div style="background:rgba(245,158,11,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(245,158,11,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#d97706; font-weight:700;">⚠️ Sorties Non Lues</div>
            <div style="font-size:16px; font-weight:800; color:#d97706;">${deadOutputCount}</div>
          </div>
          <div style="background:rgba(139,92,246,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(139,92,246,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#7c3aed; font-weight:700;">🔄 Inter-Processus</div>
            <div style="font-size:16px; font-weight:800; color:#7c3aed;">${interProcessCount}</div>
          </div>
        </div>
      </div>

      <!-- Advanced Filter & Search Bar -->
      <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border-color); display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <!-- Search -->
        <div style="position:relative; flex:1; min-width:220px;">
          <input type="text"
            class="srch"
            placeholder="🔍 Filtrer par nom de variable, activité, processus..."
            value="${escHtml(state.search)}"
            oninput="window.onPmgIoCrossSearch(this.value)"
            style="width:100%; height:36px; font-size:12px; padding-left:12px; border-radius:6px;">
        </div>

        <!-- Filter Statut -->
        <select class="srch"
          onchange="window.setPmgIoCrossFilter('statusFilter', this.value)"
          style="height:36px; font-size:12px; min-width:180px; border-radius:6px;">
          <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>🎯 Tous les statuts (${totalVars})</option>
          <option value="complete" ${state.statusFilter === 'complete' ? 'selected' : ''}>✅ Flux Valides (${completeCount})</option>
          <option value="no_producer" ${state.statusFilter === 'no_producer' ? 'selected' : ''}>📥 Entrées Initiales (${noProducerCount})</option>
          <option value="dead_output" ${state.statusFilter === 'dead_output' ? 'selected' : ''}>⚠️ Sorties Non Relues (${deadOutputCount})</option>
          <option value="inter_process" ${state.statusFilter === 'inter_process' ? 'selected' : ''}>🔄 Inter-Processus (${interProcessCount})</option>
        </select>

        <!-- Filter Process -->
        <select class="srch"
          onchange="window.setPmgIoCrossFilter('processFilter', this.value)"
          style="height:36px; font-size:12px; min-width:180px; border-radius:6px;">
          <option value="all" ${state.processFilter === 'all' ? 'selected' : ''}>🏛️ Tous les Processus Parent</option>
          ${allProcessNames.map(p => `<option value="${escHtml(p)}" ${state.processFilter === p ? 'selected' : ''}>${escHtml(p)}</option>`).join('')}
        </select>

        <!-- View Switcher (Lineage Cards vs 2D Matrix) -->
        <div style="display:flex; border:1px solid var(--border-color); border-radius:6px; overflow:hidden; height:36px;">
          <button style="padding:0 12px; font-size:11.5px; font-weight:700; border:none; cursor:pointer; background:${state.viewMode === 'lineage' ? 'var(--brand-primary)' : 'var(--bg-hover)'}; color:${state.viewMode === 'lineage' ? '#fff' : 'var(--text-primary)'};"
            onclick="window.setPmgIoCrossViewMode('lineage')">
            📋 Vue Dictionnaire &amp; Lignage
          </button>
          <button style="padding:0 12px; font-size:11.5px; font-weight:700; border:none; border-left:1px solid var(--border-color); cursor:pointer; background:${state.viewMode === 'matrix' ? 'var(--brand-primary)' : 'var(--bg-hover)'}; color:${state.viewMode === 'matrix' ? '#fff' : 'var(--text-primary)'};"
            onclick="window.setPmgIoCrossViewMode('matrix')">
            🎯 Matrice Croisée 2D
          </button>
        </div>

        <!-- Export CSV Button -->
        <button class="btn-ghost"
          style="height:36px; padding:0 12px; font-size:11.5px; font-weight:700; border-radius:6px;"
          onclick="window.exportPmgIoCrossCSV()">
          📥 Exporter Lignage CSV
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    ${contentHtml}
  `;

  container.innerHTML = html;
};


window.exportPmgMultiSheetExcel = function() {
  if (typeof XLSX === 'undefined') {
    window.exportPmgExcel();
    return;
  }

  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    alert("La matrice PMG est vide.");
    return;
  }

  const processName = document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Processus Principal';
  const processId = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'process-principal';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Modélisateur PMG';
  const version = document.getElementById('pmgProcessVersionStep')?.value || document.getElementById('pmgProcessVersion')?.value || 'v1.0.0';

  const wb = XLSX.utils.book_new();

  // --- FEUILLE 1 : Synthèse Gouvernance ---
  const ws1Data = [
    ["BOUYGUES TELECOM - GOUVERNANCE DES PROCESSUS PMG"],
    ["Rapport Officiel de Cartographie & Conformité"],
    [],
    ["MÉTADONNÉES DU PROCESSUS", ""],
    ["Nom du Processus", processName],
    ["ID Technique (Process ID)", processId],
    ["Version", version],
    ["Propriétaire Métier (Owner)", owner],
    ["Modélisateur / Auteur", exporter],
    ["Date d'exportation", new Date().toLocaleDateString('fr-FR')],
    [],
    ["STATISTIQUES CLÉS", ""],
    ["Total Activités", activities.length],
    ["User Tasks (Tâches Humaines)", activities.filter(a => (a.type || '').toLowerCase().includes('user')).length],
    ["Services / Automatisations", activities.filter(a => (a.type || '').toLowerCase().includes('service')).length],
    ["Sous-processus / Call Activities", activities.filter(a => (a.type || '').toLowerCase().includes('call') || (a.type || '').toLowerCase().includes('sous')).length]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws1Data) : ws1Data);
  XLSX.utils.book_append_sheet(wb, ws1, "1_Synthese_Gouvernance");

  // --- FEUILLE 2 : Matrice PMG Officielle ---
  const ws2Data = [
    ["Activité / Call Activity", "ID Technique", "Type de Composant", "Entité / Lane Réalisatrice", "Groupe d'Utilisateurs", "Inputs (Entrées)", "Outputs (Sorties)", "Mode de Réalisation", "Applicable dans quel cas ?", "Commentaires / Documentation"]
  ];
  activities.forEach(act => {
    ws2Data.push([
      act.name,
      act.id,
      act.typeLabel || act.type,
      act.entity || 'Non défini',
      act.userGroup || '',
      (act.inputs || []).join(', '),
      (act.outputs || []).join(', '),
      act.realizationMode || 'Manuelle',
      act.applicableCase || '',
      act.comment || ''
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws2Data) : ws2Data);
  ws2['!autofilter'] = { ref: `A1:J${activities.length + 1}` };
  ws2['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, "2_Matrice_PMG_Officielle");

  // --- FEUILLE 3 : Matrice RACI ---
  const entitySet = new Set(activities.map(a => a.entity).filter(Boolean));
  const entities = Array.from(entitySet);
  if (entities.length === 0) entities.push('Direction Métier');

  const ws3Header = ["Activité", "ID Technique", ...entities];
  const ws3Data = [ws3Header];

  activities.forEach(act => {
    const row = [act.name, act.id];
    entities.forEach(ent => {
      let role = "";
      if (ent === act.entity) role += "R ";
      if (ent === owner) role += "A ";
      row.push(role.trim() || "-");
    });
    ws3Data.push(row);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws3Data) : ws3Data);
  const lastColLetter = XLSX.utils.encode_col ? XLSX.utils.encode_col(ws3Header.length - 1) : 'Z';
  ws3['!autofilter'] = { ref: `A1:${lastColLetter}${activities.length + 1}` };
  XLSX.utils.book_append_sheet(wb, ws3, "3_Matrice_RACI");

  // --- FEUILLE 4 : Dictionnaire & Lignage I/O ---
  const varMap = new Map();
  activities.forEach(act => {
    (act.inputs || []).forEach(inVar => {
      const v = getVarName(inVar);
      if (!varMap.has(v)) varMap.set(v, { inTasks: [], outTasks: [] });
      varMap.get(v).inTasks.push(act.name);
    });
    (act.outputs || []).forEach(outVar => {
      const v = getVarName(outVar);
      if (!varMap.has(v)) varMap.set(v, { inTasks: [], outTasks: [] });
      varMap.get(v).outTasks.push(act.name);
    });
  });

  const ws4Data = [
    ["Nom de la Variable", "Producteurs (Écriture / Sorties)", "Consommateurs (Lecture / Entrées)", "Statut Lignage"]
  ];
  varMap.forEach((data, varName) => {
    let status = "Complet (Produit & Consommé)";
    if (data.outTasks.length === 0) status = "Entrée Initiale (Sans producteur amont)";
    else if (data.inTasks.length === 0) status = "Sortie Finale (Non consommée)";

    ws4Data.push([
      varName,
      data.outTasks.join(', ') || 'N/A',
      data.inTasks.join(', ') || 'N/A',
      status
    ]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws4Data) : ws4Data);
  ws4['!autofilter'] = { ref: `A1:D${varMap.size + 1}` };
  ws4['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws4, "4_Dictionnaire_Variables_IO");

  // Write and download .xlsx
  XLSX.writeFile(wb, `pmg_gouvernance_${processId || 'process'}.xlsx`);
};

// =========================================================================
// FEATURE 6: DIAGRAMMES & FLUX INTERACTIFS (INTERACTIVE FLOW & VISUALS)
// =========================================================================

window.pmgFlowActiveTab = window.pmgFlowActiveTab || 'treeflow';

window.renderPmgInteractiveFlow = function(containerId = 'pmgInteractiveFlowContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  if (!activities || activities.length === 0) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-tertiary); font-size:13px;">Chargez des fichiers BPMN pour visualiser les diagrammes de flux interactifs.</div>';
    return;
  }

  const activeTab = window.pmgFlowActiveTab || 'treeflow';

  const userTasksCount = activities.filter(a => (a.type || '').toLowerCase().includes('user')).length;
  const callActsCount = activities.filter(a => (a.type || '').toLowerCase().includes('call') || (a.type || '').toLowerCase().includes('sous')).length;
  const autoTasksCount = activities.filter(a => (a.type || '').toLowerCase().includes('service') || (a.type || '').toLowerCase().includes('script')).length;
  const maxLevel = activities.length > 0 ? Math.max(...activities.map(a => a.level || 1)) : 1;

  let tabContentHtml = '';
  if (activeTab === 'treeflow') {
    tabContentHtml = renderPmgTreeFlowContent(activities);
  } else if (activeTab === 'dataflow') {
    tabContentHtml = renderPmgDataFlowContent(activities);
  } else if (activeTab === 'journey') {
    tabContentHtml = renderPmgHumanJourneyContent(activities);
  }

  container.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            🗺️ Visualisations &amp; Diagrammes de Flux Interactifs
          </h4>
          <div style="font-size:12px; color:var(--text-secondary);">
            Explorez la cartographie sous forme de flow-chart visuel, analysez les transferts de données inter-entités et suivez le parcours opérateur.
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            Total Nœuds : <strong style="color:var(--brand-primary);">${activities.length}</strong>
          </div>
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            Profondeur : <strong>Niveau ${maxLevel}</strong>
          </div>
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            👤 Opérateurs : <strong style="color:#ea5b0c;">${userTasksCount}</strong>
          </div>
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            🤖 Automatisations : <strong style="color:var(--ok);">${autoTasksCount + callActsCount}</strong>
          </div>
        </div>
      </div>

      <!-- Onglets internes Flow -->
      <div style="display:flex; gap:8px; margin-top:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px; flex-wrap:wrap;">
        <button class="btn-ghost" style="${activeTab === 'treeflow' ? 'background:rgba(0,156,215,0.15); color:var(--brand-primary); font-weight:700; border-color:var(--brand-primary);' : ''} padding:6px 14px; font-size:12px;" onclick="switchPmgFlowTab('treeflow')">
          🗺️ Flow Chart Hiérarchique
        </button>
        <button class="btn-ghost" style="${activeTab === 'dataflow' ? 'background:rgba(0,156,215,0.15); color:var(--brand-primary); font-weight:700; border-color:var(--brand-primary);' : ''} padding:6px 14px; font-size:12px;" onclick="switchPmgFlowTab('dataflow')">
          🔀 Flux de Données Inter-Entités (Lanes)
        </button>
        <button class="btn-ghost" style="${activeTab === 'journey' ? 'background:rgba(0,156,215,0.15); color:var(--brand-primary); font-weight:700; border-color:var(--brand-primary);' : ''} padding:6px 14px; font-size:12px;" onclick="switchPmgFlowTab('journey')">
          👤 Parcours Opérateur (User Tasks &amp; Formulaires)
        </button>
      </div>
    </div>

    <!-- Conteneur d'affichage de l'onglet actif -->
    <div id="pmgFlowTabContent">
      ${tabContentHtml}
    </div>
  `;
};

window.switchPmgFlowTab = function(tabKey) {
  window.pmgFlowActiveTab = tabKey;
  window.renderPmgInteractiveFlow('pmgInteractiveFlowContainer');
};

function renderPmgTreeFlowContent(activities) {
  // Group activities by level or parent
  const levelsMap = new Map();
  activities.forEach(act => {
    const lvl = act.level || 1;
    if (!levelsMap.has(lvl)) levelsMap.set(lvl, []);
    levelsMap.get(lvl).push(act);
  });

  const sortedLevels = Array.from(levelsMap.keys()).sort((a, b) => a - b);

  let levelsHtml = '';
  sortedLevels.forEach(lvl => {
    const lvlActs = levelsMap.get(lvl);
    const lvlColors = ['#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#10b981'];
    const curColor = lvlColors[(lvl - 1) % lvlColors.length];

    let cardsHtml = '';
    lvlActs.forEach(act => {
      const typeKey = window.getPmgTypeKey(act.type || act.typeLabel);
      const meta = PMG_TYPE_META[typeKey] || { label: act.type || 'Task', icon: '📄', color: '#64748b' };
      const isSub = (act.type || '').toLowerCase().includes('call') || (act.type || '').toLowerCase().includes('sous');
      const safeId = act.id || '';

      cardsHtml += `
        <div class="pmg-flow-card" onclick="openPmgActivityInspector('${escAttr(safeId)}')" style="flex:1 1 280px; max-width:340px; background:var(--bg-card); border:1px solid var(--border-color); border-top:3px solid ${meta.color}; border-radius:8px; padding:12px; cursor:pointer; transition:all 0.2s ease; box-shadow:var(--shadow-sm); position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; background:${meta.color}22; color:${meta.color}; border:1px solid ${meta.color}44;">
              ${meta.icon} ${meta.label}
            </span>
            <span style="font-size:10px; color:var(--text-tertiary); font-family:var(--font-mono, monospace);">
              ${escHtml(act.id)}
            </span>
          </div>
          <div style="font-weight:700; font-size:13px; color:var(--text-primary); margin-bottom:6px; line-height:1.3;">
            ${escHtml(act.name)}
          </div>
          ${act.entity ? `<div style="font-size:11px; color:var(--text-secondary); margin-bottom:6px; display:flex; align-items:center; gap:4px;">🏢 <span>${escHtml(act.entity)}</span></div>` : ''}
          ${act.userGroup ? `<div style="font-size:11px; color:#ea5b0c; font-weight:600; margin-bottom:6px; display:flex; align-items:center; gap:4px;">👥 <span>${escHtml(act.userGroup)}</span></div>` : ''}
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border-color); padding-top:8px; margin-top:8px; font-size:10.5px; color:var(--text-tertiary);">
            <span>📥 Inputs : <strong>${(act.inputs || []).length}</strong></span>
            <span>📤 Outputs : <strong>${(act.outputs || []).length}</strong></span>
            <span style="color:var(--brand-primary); font-weight:600;">Détails ➔</span>
          </div>
        </div>
      `;
    });

    levelsHtml += `
      <div style="margin-bottom:20px; background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:10px; padding:14px 16px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
          <span style="background:${curColor}22; color:${curColor}; border:1px solid ${curColor}55; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700;">
            Niveau Hiérarchique ${lvl}
          </span>
          <span style="font-size:12px; color:var(--text-secondary);">
            (${lvlActs.length} activité${lvlActs.length > 1 ? 's' : ''})
          </span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:12px;">
          ${cardsHtml}
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-bottom:12px; font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center;">
      <span>💡 Cliquez sur n'importe quel bloc d'activité pour inspecter ses variables I/O, règles et détails complets.</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:4px;">
      ${levelsHtml}
    </div>
    <div id="pmgActivityInspectorModalContainer"></div>
  `;
}

function renderPmgDataFlowContent(activities) {
  // Compute entity-to-entity data exchanges
  const entityMap = new Map();
  activities.forEach(a => {
    const ent = a.entity || 'Direction Non Spécifiée';
    if (!entityMap.has(ent)) {
      entityMap.set(ent, { produced: new Set(), consumed: new Set(), activities: [] });
    }
    const data = entityMap.get(ent);
    data.activities.push(a.name);
    (a.outputs || []).forEach(v => { const n = getVarName(v); if (n) data.produced.add(n); });
    (a.inputs || []).forEach(v => { const n = getVarName(v); if (n) data.consumed.add(n); });
  });

  const entities = Array.from(entityMap.keys());

  let cardsHtml = '';
  entities.forEach(ent => {
    const d = entityMap.get(ent);
    const producedList = Array.from(d.produced);
    const consumedList = Array.from(d.consumed);

    cardsHtml += `
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:14px; margin-bottom:12px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="font-weight:700; font-size:14px; color:var(--brand-primary); display:flex; align-items:center; gap:6px;">
            🏢 ${escHtml(ent)}
          </div>
          <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:var(--bg-hover); border:1px solid var(--border-color); color:var(--text-secondary);">
            ${d.activities.length} activité${d.activities.length > 1 ? 's' : ''}
          </span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:6px; padding:10px;">
            <div style="font-size:11px; font-weight:700; color:var(--ok); margin-bottom:6px;">📤 Données Produites (${producedList.length}) :</div>
            <div style="font-size:11px; font-family:var(--font-mono, monospace); max-height:90px; overflow-y:auto;">
              ${producedList.length > 0 ? producedList.map(v => `<span style="display:inline-block; margin:2px; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,0.15); color:var(--ok);">${escHtml(v)}</span>`).join('') : '<span style="color:#94a3b8;">Aucune donnée produite</span>'}
            </div>
          </div>
          <div style="background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.2); border-radius:6px; padding:10px;">
            <div style="font-size:11px; font-weight:700; color:var(--brand-primary); margin-bottom:6px;">📥 Données Consommées (${consumedList.length}) :</div>
            <div style="font-size:11px; font-family:var(--font-mono, monospace); max-height:90px; overflow-y:auto;">
              ${consumedList.length > 0 ? consumedList.map(v => `<span style="display:inline-block; margin:2px; padding:2px 6px; border-radius:4px; background:rgba(59,130,246,0.15); color:var(--brand-primary);">${escHtml(v)}</span>`).join('') : '<span style="color:#94a3b8;">Aucune donnée requise</span>'}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-bottom:12px; font-size:12px; color:var(--text-secondary);">
      Traçabilité complète des données échangées entre chaque Entité / Lane du processus BPMN.
    </div>
    ${cardsHtml}
  `;
}

function renderPmgHumanJourneyContent(activities) {
  const humanTasks = activities.filter(a => {
    const t = (a.type || '').toLowerCase();
    return t.includes('user') || t.includes('manual');
  });

  if (humanTasks.length === 0) {
    return '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12.5px;">Aucune tâche utilisateur humaine (User Task / Manual Task) n\'est présente dans la sélection active.</div>';
  }

  let stepsHtml = '';
  humanTasks.forEach((act, idx) => {
    const inputsList = (act.inputs || []).map(getVarName).filter(Boolean);
    const outputsList = (act.outputs || []).map(getVarName).filter(Boolean);

    stepsHtml += `
      <div style="display:flex; gap:14px; margin-bottom:14px; position:relative;">
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="width:30px; height:30px; border-radius:50%; background:#ea5b0c; color:#ffffff; font-weight:700; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            ${idx + 1}
          </div>
          ${idx < humanTasks.length - 1 ? '<div style="width:2px; flex-grow:1; background:var(--border-color); margin-top:4px;"></div>' : ''}
        </div>
        <div style="flex-grow:1; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:14px; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:4px;">
                👤 ${escHtml(act.name)}
              </div>
              <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono, monospace);">
                id: ${escHtml(act.id)} | Type: ${escHtml(act.typeLabel || act.type)}
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              ${act.entity ? `<span style="font-size:11px; padding:2px 8px; border-radius:6px; background:rgba(0,156,215,0.1); color:#009cd7; border:1px solid rgba(0,156,215,0.25); font-weight:600;">🏢 ${escHtml(act.entity)}</span>` : ''}
              ${act.userGroup ? `<span style="font-size:11px; padding:2px 8px; border-radius:6px; background:rgba(234,91,12,0.1); color:#ea5b0c; border:1px solid rgba(234,91,12,0.25); font-weight:600;">👥 ${escHtml(act.userGroup)}</span>` : '<span style="font-size:11px; padding:2px 8px; border-radius:6px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25); font-weight:600;">⚠️ Sans groupe</span>'}
            </div>
          </div>

          <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11.5px;">
            <div style="background:var(--bg-hover); padding:8px 10px; border-radius:6px;">
              <span style="font-weight:600; color:var(--text-secondary);">Champs requis à la saisie (Inputs) :</span>
              <div style="margin-top:4px; font-family:var(--font-mono, monospace); color:var(--text-primary);">
                ${inputsList.length > 0 ? inputsList.join(', ') : '<em>Aucun champ requis</em>'}
              </div>
            </div>
            <div style="background:var(--bg-hover); padding:8px 10px; border-radius:6px;">
              <span style="font-weight:600; color:var(--text-secondary);">Résultats validés (Outputs) :</span>
              <div style="margin-top:4px; font-family:var(--font-mono, monospace); color:var(--ok); font-weight:600;">
                ${outputsList.length > 0 ? outputsList.join(', ') : '<em>Aucune variable produite</em>'}
              </div>
            </div>
          </div>

          ${act.applicableCase ? `
            <div style="margin-top:8px; font-size:11.5px; color:var(--text-secondary);">
              <strong>Condition de déclenchement :</strong> <code>${escHtml(act.applicableCase)}</code>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-bottom:14px; font-size:12px; color:var(--text-secondary);">
      Chronologie complète des interactions et formulaires nécessitant l'intervention d'opérateurs humains.
    </div>
    ${stepsHtml}
  `;
}

window.openPmgActivityInspector = function(actId) {
  const acts = window.pmgActivities || window.pmgTempSubprocesses || [];
  const act = acts.find(a => (a.id || '').toLowerCase() === (actId || '').toLowerCase());
  if (!act) return;

  const container = document.getElementById('pmgActivityInspectorModalContainer');
  if (!container) return;

  const typeKey = window.getPmgTypeKey(act.type || act.typeLabel);
  const meta = PMG_TYPE_META[typeKey] || { label: act.type, icon: '📄', color: '#64748b' };

  container.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px);">
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; width:90%; max-width:650px; max-height:85vh; overflow-y:auto; box-shadow:0 20px 40px rgba(0,0,0,0.3); padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div>
            <span style="font-size:11px; padding:3px 8px; border-radius:10px; background:${meta.color}22; color:${meta.color}; border:1px solid ${meta.color}44; font-weight:700;">
              ${meta.icon} ${meta.label}
            </span>
            <h3 style="margin:8px 0 2px; font-size:17px; color:var(--text-primary); font-weight:700;">
              ${escHtml(act.name)}
            </h3>
            <div style="font-family:var(--font-mono, monospace); font-size:11px; color:var(--text-tertiary);">
              ID Technique : ${escHtml(act.id)} | Niveau : ${act.level || 1}
            </div>
          </div>
          <button class="btn-ghost" onclick="document.getElementById('pmgActivityInspectorModalContainer').innerHTML=''" style="font-size:16px; width:32px; height:32px; padding:0; line-height:30px;">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; font-size:12.5px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:var(--bg-hover); padding:10px; border-radius:8px;">
              <strong>🏢 Entité / Lane :</strong>
              <div style="margin-top:2px; color:var(--text-primary);">${escHtml(act.entity || 'Non spécifiée')}</div>
            </div>
            <div style="background:var(--bg-hover); padding:10px; border-radius:8px;">
              <strong>👥 Groupe Assigné :</strong>
              <div style="margin-top:2px; color:#ea5b0c; font-weight:600;">${escHtml(act.userGroup || 'Non assigné')}</div>
            </div>
          </div>

          <div style="background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.2); border-radius:8px; padding:12px;">
            <strong style="color:var(--brand-primary);">📥 Variables d'Entrée (Inputs) :</strong>
            <div style="margin-top:6px; font-family:var(--font-mono, monospace); font-size:11.5px;">
              ${(act.inputs && act.inputs.length > 0) ? act.inputs.map(i => `<span style="display:inline-block; margin:2px; padding:2px 6px; border-radius:4px; background:rgba(59,130,246,0.15);">${escHtml(i)}</span>`).join('') : '<span style="color:#94a3b8;">Aucun paramètre d\'entrée</span>'}
            </div>
          </div>

          <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:12px;">
            <strong style="color:var(--ok);">📤 Variables Produites (Outputs) :</strong>
            <div style="margin-top:6px; font-family:var(--font-mono, monospace); font-size:11.5px;">
              ${(act.outputs && act.outputs.length > 0) ? act.outputs.map(o => `<span style="display:inline-block; margin:2px; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,0.15);">${escHtml(o)}</span>`).join('') : '<span style="color:#94a3b8;">Aucune variable produite</span>'}
            </div>
          </div>

          <div style="background:var(--bg-hover); padding:10px; border-radius:8px;">
            <strong>🎯 Cas d'applicabilité :</strong>
            <div style="margin-top:4px; color:var(--text-secondary);">${escHtml(act.applicableCase || 'Applicable dans tous les cas par défaut.')}</div>
          </div>

          <div style="background:var(--bg-hover); padding:10px; border-radius:8px;">
            <strong>📝 Commentaires / Spécification :</strong>
            <div style="margin-top:4px; color:var(--text-secondary);">${escHtml(act.comment || 'Aucun commentaire.')}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:20px;">
          <button class="btn-primary" onclick="document.getElementById('pmgActivityInspectorModalContainer').innerHTML=''">Fermer</button>
        </div>
      </div>
    </div>
  `;
};

// =========================================================================
// FEATURE 7: DEVOPS, USER STORIES JIRA & TEST PAYLOADS GENERATOR
// =========================================================================

window.pmgDevopsActiveTab = window.pmgDevopsActiveTab || 'jira';

window.renderPmgDevopsJira = function(containerId = 'pmgDevopsJiraContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  if (!activities || activities.length === 0) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-tertiary); font-size:13px;">Chargez des fichiers BPMN pour générer les spécifications Jira et les payloads de test.</div>';
    return;
  }

  const activeTab = window.pmgDevopsActiveTab || 'jira';

  let tabContentHtml = '';
  if (activeTab === 'jira') {
    tabContentHtml = renderPmgJiraStoriesContent(activities);
  } else if (activeTab === 'payloads') {
    tabContentHtml = renderPmgTestPayloadsContent(activities);
  }

  container.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            🚀 Intégration Projet &amp; DevOps (Jira / Spécifications / Tests)
          </h4>
          <div style="font-size:12px; color:var(--text-secondary);">
            Générez instantanément vos User Stories Jira, fiches de spécifications fonctionnelles (FDD) et payloads de test Zeebe / Postman.
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-ghost" style="border:1px solid var(--ok); color:var(--ok); font-weight:700; font-size:11.5px; height:32px;" onclick="exportPmgJiraCSV()">
            📥 Exporter CSV Jira (Bulk Import)
          </button>
          <button class="btn-ghost" style="border:1px solid var(--brand-primary); color:var(--brand-primary); font-weight:700; font-size:11.5px; height:32px;" onclick="exportPmgFddMarkdown()">
            📑 Télécharger Cahier des Spécifications (.md)
          </button>
        </div>
      </div>

      <!-- Onglets internes DevOps -->
      <div style="display:flex; gap:8px; margin-top:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px; flex-wrap:wrap;">
        <button class="btn-ghost" style="${activeTab === 'jira' ? 'background:rgba(0,156,215,0.15); color:var(--brand-primary); font-weight:700; border-color:var(--brand-primary);' : ''} padding:6px 14px; font-size:12px;" onclick="switchPmgDevopsTab('jira')">
          📋 Générateur de User Stories Jira &amp; Confluence
        </button>
        <button class="btn-ghost" style="${activeTab === 'payloads' ? 'background:rgba(0,156,215,0.15); color:var(--brand-primary); font-weight:700; border-color:var(--brand-primary);' : ''} padding:6px 14px; font-size:12px;" onclick="switchPmgDevopsTab('payloads')">
          🧪 Payloads de Test &amp; Mocks API (Zeebe / Postman)
        </button>
      </div>
    </div>

    <!-- Contenu de l'onglet -->
    <div id="pmgDevopsTabContent">
      ${tabContentHtml}
    </div>
  `;
};

window.switchPmgDevopsTab = function(tabKey) {
  window.pmgDevopsActiveTab = tabKey;
  window.renderPmgDevopsJira('pmgDevopsJiraContainer');
};

function generatePmgUserStoryText(act, format = 'markdown') {
  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus';
  const inputs = (act.inputs || []).map(getVarName).filter(Boolean);
  const outputs = (act.outputs || []).map(getVarName).filter(Boolean);
  const role = act.userGroup || act.entity || 'Opérateur Métier';

  if (format === 'jira') {
    return `h3. [US-BPMN] ${act.name} (${role})
*Processus Parent :* ${procName}
*ID Technique BPMN :* \`${act.id}\`
*Type :* ${act.typeLabel || act.type}
*Acteur Responsable :* ${role}

h4. Description Fonctionnelle
*En tant que* ${role},
*Je souhaite* réaliser l'activité "${act.name}",
*Afin de* produire les résultats : ${outputs.join(', ') || "Validation de l'étape"}.

h4. Critères d'Acceptation (DoD)
* [ ] Le formulaire / tâche est accessible aux habilités du groupe : *${role}*
* [ ] Les données en entrée sont vérifiées : ${inputs.length > 0 ? inputs.map(i => `{{${i}}}`).join(', ') : 'Aucun prérequis'}
* [ ] Les variables de sortie sont valorisées dans l'instance : ${outputs.length > 0 ? outputs.map(o => `{{${o}}}`).join(', ') : 'Validation standard'}
${act.applicableCase ? `* [ ] Règle conditionnelle vérifiée : _${act.applicableCase}_` : ''}
${act.comment ? `* [ ] Note métier : _${act.comment}_` : ''}`;
  }

  // Markdown format
  return `### [US-BPMN] ${act.name} (${role})
- **Processus Parent** : ${procName}
- **ID Technique BPMN** : \`${act.id}\`
- **Type** : ${act.typeLabel || act.type}
- **Acteur Responsable** : ${role}

#### 🎯 Description
> **En tant que** ${role},  
> **Je souhaite** réaliser l'étape "${act.name}",  
> **Afin de** valoriser et produire : ${outputs.length > 0 ? outputs.map(o => `\`${o}\``).join(', ') : 'la validation du dossier'}.

#### ✅ Critères d'Acceptation (Definition of Done)
- [ ] Le formulaire est accessible pour le groupe **${role}**
- [ ] Les paramètres d'entrée sont disponibles : ${inputs.length > 0 ? inputs.map(i => `\`${i}\``).join(', ') : '_Aucun prérequis_'}
- [ ] Les variables de sortie suivantes sont générées : ${outputs.length > 0 ? outputs.map(o => `\`${o}\``).join(', ') : '_Validation standard_'}
${act.applicableCase ? `- [ ] Règle d'applicabilité : *${act.applicableCase}*` : ''}
${act.comment ? `- [ ] Documentation métier : *${act.comment}*` : ''}`;
}

function renderPmgJiraStoriesContent(activities) {
  let storiesHtml = '';
  activities.forEach((act, idx) => {
    const mdText = generatePmgUserStoryText(act, 'markdown');
    const jiraText = generatePmgUserStoryText(act, 'jira');
    const typeKey = window.getPmgTypeKey(act.type || act.typeLabel);
    const meta = PMG_TYPE_META[typeKey] || { label: act.type, icon: '📄', color: '#64748b' };
    const safeEscapedMd = encodeURIComponent(mdText);
    const safeEscapedJira = encodeURIComponent(jiraText);

    storiesHtml += `
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px; margin-bottom:14px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <div>
            <span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; background:${meta.color}22; color:${meta.color}; border:1px solid ${meta.color}44;">
              ${meta.icon} ${meta.label}
            </span>
            <span style="font-size:11px; color:var(--text-tertiary); margin-left:6px; font-family:var(--font-mono, monospace);">
              US #${idx + 1} • \`${act.id}\`
            </span>
            <h4 style="margin:6px 0 0; font-size:15px; color:var(--text-primary); font-weight:700;">
              [US-BPMN] ${escHtml(act.name)}
            </h4>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-ghost" style="font-size:11px; padding:4px 8px; height:28px;" onclick="copyPmgEncodedText('${safeEscapedMd}', this, 'Markdown Copié !')">
              📋 Copier Markdown
            </button>
            <button class="btn-ghost" style="font-size:11px; padding:4px 8px; height:28px; border-color:var(--brand-primary); color:var(--brand-primary);" onclick="copyPmgEncodedText('${safeEscapedJira}', this, 'Jira Copié !')">
              📋 Copier Jira Markup
            </button>
          </div>
        </div>

        <div style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:6px; padding:12px; font-size:12px; line-height:1.5; color:var(--text-secondary);">
          <div style="margin-bottom:6px;">
            <strong>En tant que :</strong> <span style="color:#ea5b0c; font-weight:600;">${escHtml(act.userGroup || act.entity || 'Opérateur')}</span>
          </div>
          <div style="margin-bottom:6px;">
            <strong>Je souhaite :</strong> <span>exécuter la tâche "${escHtml(act.name)}"</span>
          </div>
          <div style="margin-bottom:8px;">
            <strong>Afin de :</strong> <span>générer et valider <code>${(act.outputs || []).join(', ') || 'le statut de l\'activité'}</code></span>
          </div>
          <div style="border-top:1px dashed var(--border-color); padding-top:6px; font-size:11.5px;">
            <strong>Critères d'Acceptation :</strong>
            <ul style="margin:4px 0 0; padding-left:18px;">
              <li>Habilitation groupe : <em>${escHtml(act.userGroup || act.entity || 'Tous les utilisateurs')}</em></li>
              <li>Champs en entrée vérifiés : <code>${(act.inputs || []).join(', ') || 'Aucun'}</code></li>
              <li>Variables de sortie générées : <code>${(act.outputs || []).join(', ') || 'Validation'}</code></li>
              ${act.applicableCase ? `<li>Règle conditionnelle : <em>${escHtml(act.applicableCase)}</em></li>` : ''}
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <span style="font-size:12px; color:var(--text-secondary);">
        ${activities.length} User Stories générées et prêtes pour l'importation dans votre backlog Jira ou Confluence.
      </span>
    </div>
    ${storiesHtml}
  `;
}

function renderPmgTestPayloadsContent(activities) {
  // Collect all input variables needed by root & initial steps
  const initialVars = new Set();
  const allOutputs = new Set();

  activities.forEach(a => {
    (a.inputs || []).forEach(v => {
      const n = getVarName(v);
      if (n && !allOutputs.has(n)) initialVars.add(n);
    });
    (a.outputs || []).forEach(v => {
      const n = getVarName(v);
      if (n) allOutputs.add(n);
    });
  });

  // Infer mock values
  const payloadObj = {};
  Array.from(initialVars).sort().forEach(v => {
    const low = v.toLowerCase();
    if (low.includes('flag') || low.includes('valid') || low.includes('is') || low.includes('has') || low.includes('conforme')) {
      payloadObj[v] = true;
    } else if (low.includes('list') || low.includes('items') || low.includes('array') || low.includes('skus')) {
      payloadObj[v] = ["ITEM_001", "ITEM_002"];
    } else if (low.includes('amount') || low.includes('score') || low.includes('count') || low.includes('loop') || low.includes('prix')) {
      payloadObj[v] = 100;
    } else if (low.includes('id') || low.includes('num') || low.includes('code') || low.includes('token')) {
      payloadObj[v] = `${v.toUpperCase()}_12345`;
    } else {
      payloadObj[v] = `valeur_test_${v}`;
    }
  });

  const payloadJson = JSON.stringify(payloadObj, null, 2);
  const safeEscapedJson = encodeURIComponent(payloadJson);

  // Mocks for worker tasks (service tasks & script tasks)
  const workerTasks = activities.filter(a => {
    const t = (a.type || '').toLowerCase();
    return t.includes('service') || t.includes('script');
  });

  let workerMocksJson = {};
  workerTasks.forEach(wt => {
    const mockRes = {};
    (wt.outputs || []).forEach(o => {
      const n = getVarName(o);
      if (n) mockRes[n] = `mock_result_${n}`;
    });
    workerMocksJson[wt.id || wt.name] = {
      taskName: wt.name,
      mockOutputs: mockRes
    };
  });
  const workerMocksStr = JSON.stringify(workerMocksJson, null, 2);
  const safeWorkerJson = encodeURIComponent(workerMocksStr);

  return `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Carte 1 : Payload Démarrage -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="margin:0 0 2px; font-size:14px; color:var(--text-primary); font-weight:700;">
              📥 Payload JSON de Démarrage (Start Process Instance)
            </h4>
            <div style="font-size:11.5px; color:var(--text-secondary);">
              Payload d'initialisation prêt pour Camunda 8 Zeebe Client, Postman ou l'API REST Camunda.
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-ghost" style="font-size:11px; padding:4px 8px; height:28px;" onclick="copyPmgEncodedText('${safeEscapedJson}', this, 'JSON Copié !')">
              📋 Copier JSON
            </button>
            <button class="btn-ghost" style="font-size:11px; padding:4px 8px; height:28px; border-color:var(--ok); color:var(--ok);" onclick="downloadPmgJson('${safeEscapedJson}', 'startProcessPayload.json')">
              📥 Télécharger JSON
            </button>
          </div>
        </div>
        <pre style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:6px; padding:12px; font-size:11.5px; font-family:var(--font-mono, monospace); color:var(--text-primary); max-height:220px; overflow:auto; margin:0;">${escHtml(payloadJson)}</pre>
      </div>

      <!-- Carte 2 : Mocks Workers -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="margin:0 0 2px; font-size:14px; color:var(--text-primary); font-weight:700;">
              🤖 Mocks de Réponses pour Service Tasks &amp; Scripts (${workerTasks.length} tâches)
            </h4>
            <div style="font-size:11.5px; color:var(--text-secondary);">
              Réponses simulées pour tester le processus en isolation sans dépendance backend.
            </div>
          </div>
          <button class="btn-ghost" style="font-size:11px; padding:4px 8px; height:28px;" onclick="copyPmgEncodedText('${safeWorkerJson}', this, 'Mocks Copiés !')">
            📋 Copier Mocks
          </button>
        </div>
        <pre style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:6px; padding:12px; font-size:11.5px; font-family:var(--font-mono, monospace); color:var(--text-primary); max-height:220px; overflow:auto; margin:0;">${escHtml(workerMocksStr)}</pre>
      </div>
    </div>
  `;
}

window.copyPmgEncodedText = function(encodedText, btnElement, successMsg = 'Copié !') {
  const text = decodeURIComponent(encodedText);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (btnElement) {
        const orig = btnElement.innerHTML;
        btnElement.innerHTML = `✅ ${successMsg}`;
        setTimeout(() => btnElement.innerHTML = orig, 1800);
      }
    });
  } else {
    prompt("Copiez le texte ci-dessous (Ctrl+C) :", text);
  }
};

window.downloadPmgJson = function(encodedJson, filename = 'payload.json') {
  const json = decodeURIComponent(encodedJson);
  dl(json, filename, 'application/json');
};

window.exportPmgJiraCSV = function() {
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  if (!activities || activities.length === 0) {
    alert("Aucune activité disponible pour l'export Jira.");
    return;
  }

  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus';
  const procId = document.getElementById('pmgProcessIdStep')?.value || window.pmgProcessDetails?.id || 'process';

  let csv = 'Summary,Issue Type,Description,Assignee,Component,Labels\n';
  activities.forEach(act => {
    const isHuman = (act.type || '').toLowerCase().includes('user') || (act.type || '').toLowerCase().includes('manual');
    const issueType = isHuman ? 'Story' : 'Task';
    const summary = `[US-BPMN] ${act.name}`;
    const desc = generatePmgUserStoryText(act, 'jira').replace(/"/g, '""');
    const assignee = act.userGroup || act.entity || '';
    const component = procName;
    const labels = `BPMN,PMG,${act.type || 'Task'}`;

    csv += `"${summary}","${issueType}","${desc}","${assignee}","${component}","${labels}"\n`;
  });

  dl(csv, `jira_user_stories_${procId}.csv`, 'text/csv');
};

window.exportPmgFddMarkdown = function() {
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus';
  const procId = document.getElementById('pmgProcessIdStep')?.value || window.pmgProcessDetails?.id || 'process';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || window.pmgProcessDetails?.owner || 'Direction Métier';

  let md = `# Cahier des Spécifications Fonctionnelles & User Stories (FDD)\n\n`;
  md += `**Processus :** ${procName} (\`${procId}\`)  \n`;
  md += `**Propriétaire Métier :** ${owner}  \n`;
  md += `**Date de Génération :** ${new Date().toLocaleDateString('fr-FR')}  \n\n`;
  md += `## 1. Sommaire des User Stories\n\n`;

  activities.forEach((act, idx) => {
    md += `${idx + 1}. [US #${idx + 1} - ${act.name}](#us-${idx + 1})\n`;
  });
  md += `\n---\n\n## 2. Détail des Spécifications par Activité\n\n`;

  activities.forEach((act, idx) => {
    md += `<a name="us-${idx + 1}"></a>\n`;
    md += generatePmgUserStoryText(act, 'markdown');
    md += `\n\n---\n\n`;
  });

  dl(md, `specifications_fonctionnelles_jira_${procId}.md`, 'text/markdown');
};

// =========================================================================
// FEATURE 3: GÉNÉRATEUR DE MODES OPÉRATOIRES MÉTIER (SOP)
// =========================================================================

window.pmgSopState = {
  filterRole: 'all',
  onlyHuman: false,
  mode: 'cards', // 'cards' | 'checklist' | 'doc'
  searchQuery: '',
  completedSteps: new Set()
};

window.renderPmgSop = function(containerId = 'pmgSopContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allActs = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  if (!allActs || allActs.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px; text-align:center;">
        <div class="empty-icon" style="font-size:36px; margin-bottom:10px;">📖</div>
        <h4 style="margin:0 0 6px; color:var(--text-primary); font-size:16px;">Aucune activité disponible pour générer les modes opératoires</h4>
        <p style="margin:0; color:var(--text-secondary); font-size:13px;">Veuillez importer des fichiers BPMN ou remplir la matrice PMG pour afficher les guides opérationnels (SOP).</p>
      </div>
    `;
    return;
  }

  // Extract unique roles / entities for filter dropdown
  const rolesSet = new Set();
  allActs.forEach(a => {
    if (a.entity && a.entity.trim()) rolesSet.add(a.entity.trim());
    if (a.userGroup && a.userGroup.trim()) rolesSet.add(a.userGroup.trim());
  });
  const rolesList = Array.from(rolesSet).sort();

  // Apply filters
  let filteredActs = allActs.filter(act => {
    if (window.pmgSopState.onlyHuman) {
      const isH = (act.type || '').toLowerCase().includes('user') || (act.type || '').toLowerCase().includes('manual');
      if (!isH) return false;
    }
    if (window.pmgSopState.filterRole !== 'all') {
      const ent = (act.entity || '').trim();
      const ug = (act.userGroup || '').trim();
      if (ent !== window.pmgSopState.filterRole && ug !== window.pmgSopState.filterRole) return false;
    }
    if (window.pmgSopState.searchQuery) {
      const q = window.pmgSopState.searchQuery.toLowerCase();
      const matchName = (act.name || '').toLowerCase().includes(q);
      const matchComment = (act.comment || '').toLowerCase().includes(q);
      const matchRole = (act.entity || '').toLowerCase().includes(q);
      if (!matchName && !matchComment && !matchRole) return false;
    }
    return true;
  });

  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus Métier';
  const procId = document.getElementById('pmgProcessIdStep')?.value || window.pmgProcessDetails?.id || 'PROC_01';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || window.pmgProcessDetails?.owner || 'Direction Opérationnelle';
  const version = document.getElementById('pmgProcessVersionStep')?.value || window.pmgProcessDetails?.version || 'v1.0';
  const desc = document.getElementById('pmgProcessDescStep')?.value || window.pmgProcessDetails?.desc || 'Guide standard d\'exécution des tâches opérationnelles pour les acteurs métier et opérateurs.';

  const totalSteps = allActs.length;
  const humanSteps = allActs.filter(a => (a.type || '').toLowerCase().includes('user') || (a.type || '').toLowerCase().includes('manual')).length;
  const completedCount = window.pmgSopState.completedSteps.size;
  const completionPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  let html = `
    <div class="pmg-sop-wrapper" style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- En-tête Guide SOP & KPIs -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span style="background:rgba(0,156,215,0.12); color:var(--brand-primary); font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; text-transform:uppercase;">
                SOP • Standard Operating Procedures
              </span>
              <span style="font-size:12px; color:var(--text-tertiary);">Version ${escHtml(version)} • ID: ${escHtml(procId)}</span>
            </div>
            <h3 style="margin:0 0 6px; font-size:20px; font-weight:800; color:var(--text-primary);">
              📖 Mode Opératoire Métier : ${escHtml(procName)}
            </h3>
            <p style="margin:0; font-size:13px; color:var(--text-secondary); max-width:850px; line-height:1.5;">
              ${escHtml(desc)}
            </p>
          </div>

          <!-- Boutons d'exportation SOP -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-ghost" style="font-size:11.5px; height:32px; padding:0 10px;" onclick="window.exportPmgSopMarkdown()">
              📥 Export Markdown (Confluence)
            </button>
            <button class="btn-ghost" style="font-size:11.5px; height:32px; padding:0 10px; border-color:var(--brand-primary); color:var(--brand-primary);" onclick="window.exportPmgSopHtmlPackage()">
              🌐 Pack HTML Autonome
            </button>
            <button class="btn-primary" style="font-size:11.5px; height:32px; padding:0 12px;" onclick="window.exportPmgSopPrint()">
              🖨️ Imprimer / PDF A4
            </button>
          </div>
        </div>

        <!-- Badges Métriques Opérationnelles -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px; padding-top:14px; border-top:1px solid var(--border-color);">
          <div style="background:var(--bg-hover); padding:10px 14px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:11px; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Étapes Totales</div>
            <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-top:2px;">${totalSteps}</div>
          </div>
          <div style="background:var(--bg-hover); padding:10px 14px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:11px; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Tâches Humaines</div>
            <div style="font-size:18px; font-weight:800; color:#ea5b0c; margin-top:2px;">${humanSteps}</div>
          </div>
          <div style="background:var(--bg-hover); padding:10px 14px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:11px; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Rôles &amp; Services</div>
            <div style="font-size:18px; font-weight:800; color:var(--brand-primary); margin-top:2px;">${rolesList.length}</div>
          </div>
          <div style="background:var(--bg-hover); padding:10px 14px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:11px; color:var(--text-tertiary); font-weight:600; text-transform:uppercase;">Progression Checklist</div>
            <div style="font-size:18px; font-weight:800; color:var(--ok); margin-top:2px;">${completedCount} / ${totalSteps} (${completionPct}%)</div>
          </div>
        </div>
      </div>

      <!-- Barre de Filtres & Modes d'Affichage -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <!-- Recherche -->
          <input type="text" placeholder="🔍 Rechercher une consigne..." value="${escAttr(window.pmgSopState.searchQuery)}" 
                 oninput="window.pmgSopState.searchQuery = this.value; window.renderPmgSop('${containerId}');"
                 style="height:32px; width:220px; font-size:12px; padding:0 10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary);">

          <!-- Filtre Rôle -->
          <select style="height:32px; font-size:12px; padding:0 10px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary);"
                  onchange="window.pmgSopState.filterRole = this.value; window.renderPmgSop('${containerId}');">
            <option value="all" ${window.pmgSopState.filterRole === 'all' ? 'selected' : ''}>👥 Tous les Rôles &amp; Équipes</option>
            ${rolesList.map(r => `<option value="${escAttr(r)}" ${window.pmgSopState.filterRole === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
          </select>

          <!-- Filtre Tâches Humaines -->
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); cursor:pointer; user-select:none;">
            <input type="checkbox" ${window.pmgSopState.onlyHuman ? 'checked' : ''} 
                   onchange="window.pmgSopState.onlyHuman = this.checked; window.renderPmgSop('${containerId}');">
            👤 Tâches Humaines uniquement
          </label>
        </div>

        <!-- Switcher de Vue -->
        <div style="display:flex; background:var(--bg-hover); padding:3px; border-radius:6px; border:1px solid var(--border-color); gap:4px;">
          <button class="btn-ghost" style="height:26px; font-size:11.5px; padding:0 10px; border-radius:4px; ${window.pmgSopState.mode === 'cards' ? 'background:var(--bg-card); font-weight:700; color:var(--brand-primary); box-shadow:0 1px 3px rgba(0,0,0,0.08);' : 'border:none;'}"
                  onclick="window.pmgSopState.mode = 'cards'; window.renderPmgSop('${containerId}');">
            📇 Fiches Réflexes
          </button>
          <button class="btn-ghost" style="height:26px; font-size:11.5px; padding:0 10px; border-radius:4px; ${window.pmgSopState.mode === 'checklist' ? 'background:var(--bg-card); font-weight:700; color:var(--brand-primary); box-shadow:0 1px 3px rgba(0,0,0,0.08);' : 'border:none;'}"
                  onclick="window.pmgSopState.mode = 'checklist'; window.renderPmgSop('${containerId}');">
            📋 Checklist Opérateur
          </button>
          <button class="btn-ghost" style="height:26px; font-size:11.5px; padding:0 10px; border-radius:4px; ${window.pmgSopState.mode === 'doc' ? 'background:var(--bg-card); font-weight:700; color:var(--brand-primary); box-shadow:0 1px 3px rgba(0,0,0,0.08);' : 'border:none;'}"
                  onclick="window.pmgSopState.mode = 'doc'; window.renderPmgSop('${containerId}');">
            📑 Document Continu
          </button>
        </div>
      </div>

      <!-- Corps des Fiches SOP -->
      <div id="pmgSopCardsList" style="display:flex; flex-direction:column; gap:16px;">
        ${filteredActs.length === 0 ? `
          <div style="padding:30px; text-align:center; color:var(--text-secondary); background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
            Aucune étape ne correspond aux filtres sélectionnés.
          </div>
        ` : filteredActs.map((act, idx) => window.renderPmgSopStepItem(act, idx + 1, filteredActs.length)).join('')}
      </div>

    </div>
  `;

  container.innerHTML = html;
};

window.renderPmgSopStepItem = function(act, stepNum, total) {
  const isHuman = (act.type || '').toLowerCase().includes('user') || (act.type || '').toLowerCase().includes('manual');
  const isAuto = (act.type || '').toLowerCase().includes('service') || (act.type || '').toLowerCase().includes('script');
  const isSub = (act.type || '').toLowerCase().includes('call') || (act.type || '').toLowerCase().includes('sub');
  
  const isDone = window.pmgSopState.completedSteps.has(act.id);
  const mode = window.pmgSopState.mode;

  const typeBadge = isHuman 
    ? '<span style="background:rgba(234,91,12,0.1); color:#ea5b0c; border:1px solid rgba(234,91,12,0.25); font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:5px;">👤 Tâche Humaine</span>'
    : (isAuto 
        ? '<span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.25); font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:5px;">⚙️ Automatique</span>'
        : '<span style="background:rgba(0,156,215,0.1); color:#009cd7; border:1px solid rgba(0,156,215,0.25); font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:5px;">📦 Sous-processus</span>');

  const roleText = act.entity || act.userGroup || 'Opérateur Non Défini';
  const roleGroupText = act.userGroup ? ` (Groupe: ${act.userGroup})` : '';

  // Heuristic Operational Instructions
  let operationalGuidance = act.comment || '';
  if (!operationalGuidance) {
    if (isHuman) {
      operationalGuidance = `Prendre en charge la tâche "${act.name}". Consulter les informations transmises en entrée, procéder aux vérifications d'usage et valider le formulaire.`;
    } else if (isAuto) {
      operationalGuidance = `Traitement automatique exécuté par le système. Calcul ou appel API sur la base des variables en entrée.`;
    } else {
      operationalGuidance = `Délégation d'exécution vers le processus sous-jacent "${act.calledElement || act.name}".`;
    }
  }

  // Quality / Compliance Warning
  let qualityCheck = act.applicableCase ? `Condition requise : ${act.applicableCase}` : 'Vérifier la complétude et l\'intégrité des données avant validation.';

  // Mode Checklist
  if (mode === 'checklist') {
    return `
      <div style="background:var(--bg-card); border:1px solid ${isDone ? 'var(--ok)' : 'var(--border-color)'}; border-radius:8px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px; transition:all 0.2s;">
        <div style="display:flex; align-items:center; gap:14px; flex:1;">
          <input type="checkbox" ${isDone ? 'checked' : ''} 
                 style="width:20px; height:20px; cursor:pointer; accent-color:var(--ok);"
                 onchange="window.togglePmgSopChecklistStep('${act.id}');">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
              <span style="font-weight:800; font-size:12px; color:var(--brand-primary);">Étape ${stepNum}</span>
              ${typeBadge}
              <span style="font-size:11.5px; color:var(--text-tertiary);">Rôle : <strong>${escHtml(roleText)}</strong></span>
            </div>
            <div style="font-size:14px; font-weight:700; color:var(--text-primary); text-decoration:${isDone ? 'line-through' : 'none'}; opacity:${isDone ? 0.7 : 1};">
              ${escHtml(act.name)}
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:3px;">
              👉 ${escHtml(operationalGuidance)}
            </div>
          </div>
        </div>
        <div style="text-align:right; font-size:11.5px; color:var(--text-tertiary);">
          ${act.inputs && act.inputs.length > 0 ? `<span>📥 ${act.inputs.length} E</span> ` : ''}
          ${act.outputs && act.outputs.length > 0 ? `<span>📤 ${act.outputs.length} S</span>` : ''}
        </div>
      </div>
    `;
  }

  // Mode Cards & Document Continu
  return `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:18px 20px; box-shadow:0 2px 6px rgba(0,0,0,0.03); page-break-inside:avoid; margin-bottom:${mode === 'doc' ? '20px' : '0'};">
      
      <!-- Titre de la Fiche Réflexe -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="background:var(--bg-hover); color:var(--text-secondary); font-size:11px; font-weight:800; padding:2px 7px; border-radius:4px; border:1px solid var(--border-color);">
              FICHE OPÉRATOIRE #${stepNum}
            </span>
            ${typeBadge}
            ${act.realizationMode ? `<span style="font-size:11px; color:var(--text-tertiary);">Mode: <strong>${escHtml(act.realizationMode)}</strong></span>` : ''}
          </div>
          <h4 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary);">
            ${escHtml(act.name)}
          </h4>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; background:rgba(0,156,215,0.08); color:var(--brand-primary); padding:4px 10px; border-radius:6px; font-weight:600;">
            👤 ${escHtml(roleText)}${escHtml(roleGroupText)}
          </span>
        </div>
      </div>

      <!-- Corps du Mode Opératoire -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        
        <!-- Colonne 1 : Consignes & Actions Métier -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--brand-primary); margin-bottom:4px;">
              🎯 1. Description de la Tâche &amp; Consignes d'Exécution
            </div>
            <div style="font-size:12.5px; color:var(--text-primary); background:var(--bg-hover); padding:10px 12px; border-radius:6px; border:1px solid var(--border-color); line-height:1.5;">
              ${escHtml(operationalGuidance)}
            </div>
          </div>

          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#ea5b0c; margin-bottom:4px;">
              ⚠️ 2. Point de Vigilance Qualité &amp; Règle Métier
            </div>
            <div style="font-size:12px; color:var(--text-secondary); background:rgba(234,91,12,0.05); border:1px solid rgba(234,91,12,0.2); padding:8px 12px; border-radius:6px;">
              ${escHtml(qualityCheck)}
            </div>
          </div>
        </div>

        <!-- Colonne 2 : Données E/S & Livrables -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:4px;">
              📥 3. Données d'Entrée Requises (Inputs / Formulaires)
            </div>
            <div style="font-size:12px; color:var(--text-primary); background:var(--bg-hover); padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); min-height:36px;">
              ${act.inputs && act.inputs.length > 0 
                ? act.inputs.map(i => `<span style="display:inline-block; background:rgba(0,156,215,0.1); color:var(--brand-primary); padding:2px 6px; border-radius:4px; margin:2px 4px 2px 0; font-family:var(--font-mono, monospace); font-size:11px;">${escHtml(i)}</span>`).join('')
                : '<span style="color:var(--text-tertiary); font-style:italic;">Aucune variable d\'entrée explicite</span>'}
            </div>
          </div>

          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ok); margin-bottom:4px;">
              📤 4. Livrables &amp; Données Produites (Outputs / Décisions)
            </div>
            <div style="font-size:12px; color:var(--text-primary); background:var(--bg-hover); padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); min-height:36px;">
              ${act.outputs && act.outputs.length > 0 
                ? act.outputs.map(o => `<span style="display:inline-block; background:rgba(16,185,129,0.1); color:var(--ok); padding:2px 6px; border-radius:4px; margin:2px 4px 2px 0; font-family:var(--font-mono, monospace); font-size:11px;">${escHtml(o)}</span>`).join('')
                : '<span style="color:var(--text-tertiary); font-style:italic;">Aucune variable de sortie explicite</span>'}
            </div>
          </div>
        </div>

      </div>

      <!-- Bas de fiche : Escalade & Enchaînement -->
      <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:11.5px; color:var(--text-tertiary);">
        <div>
          🛡️ <strong>Escalade / Exception :</strong> En cas de blocage, avertir le responsable d'activité (<em>${escHtml(roleText)}</em>).
        </div>
        <div>
          ID Technique : <code>${escHtml(act.id)}</code>
        </div>
      </div>

    </div>
  `;
};

window.togglePmgSopChecklistStep = function(actId) {
  if (window.pmgSopState.completedSteps.has(actId)) {
    window.pmgSopState.completedSteps.delete(actId);
  } else {
    window.pmgSopState.completedSteps.add(actId);
  }
  window.renderPmgSop('pmgSopContainer');
};

window.exportPmgSopMarkdown = function() {
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus Métier';
  const procId = document.getElementById('pmgProcessIdStep')?.value || window.pmgProcessDetails?.id || 'process';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || window.pmgProcessDetails?.owner || 'Direction Opérationnelle';
  const version = document.getElementById('pmgProcessVersionStep')?.value || window.pmgProcessDetails?.version || 'v1.0';
  const desc = document.getElementById('pmgProcessDescStep')?.value || window.pmgProcessDetails?.desc || 'Guide standard d\'exécution des tâches opérationnelles.';

  let md = `# 📖 Mode Opératoire Métier (SOP) : ${procName}\n\n`;
  md += `**Référence Processus :** \`${procId}\`  \n`;
  md += `**Version :** ${version}  \n`;
  md += `**Propriétaire Opérationnel :** ${owner}  \n`;
  md += `**Date de Génération :** ${new Date().toLocaleDateString('fr-FR')}  \n\n`;
  md += `> **Objectif & Portée :**  \n> ${desc}\n\n`;
  md += `## 📋 Sommaire des Fiches Opératoires\n\n`;

  activities.forEach((act, idx) => {
    md += `${idx + 1}. [Étape ${idx + 1} - ${act.name} (${act.entity || 'Opérateur'})](#etape-${idx + 1})\n`;
  });
  md += `\n---\n\n## 📇 Fiches Réflexes Détaillées par Étape\n\n`;

  activities.forEach((act, idx) => {
    const isHuman = (act.type || '').toLowerCase().includes('user') || (act.type || '').toLowerCase().includes('manual');
    md += `<a name="etape-${idx + 1}"></a>\n`;
    md += `### Étape ${idx + 1} : ${act.name}\n\n`;
    md += `- **Type d'activité :** ${act.typeLabel || act.type} (${isHuman ? '👤 Humaine' : '⚙️ Automatique'})\n`;
    md += `- **Acteur / Rôle Responsable :** **${act.entity || 'Non spécifié'}**\n`;
    if (act.userGroup) md += `- **Habilitations / Groupe requis :** \`${act.userGroup}\`\n`;
    md += `- **Mode de Réalisation :** ${act.realizationMode || 'Standard'}\n\n`;
    
    md += `#### 🎯 1. Consignes d'Exécution\n`;
    md += `${act.comment || 'Prendre en charge la tâche et appliquer les contrôles opérationnels en vigueur.'}\n\n`;

    if (act.applicableCase) {
      md += `#### ⚠️ 2. Condition d'Applicabilité & Points de Vigilance\n`;
      md += `${act.applicableCase}\n\n`;
    }

    md += `#### 📥 3. Données d'Entrée & Prérequis\n`;
    if (act.inputs && act.inputs.length > 0) {
      act.inputs.forEach(i => md += `- \`${i}\`\n`);
    } else {
      md += `_Aucun prérequis bloquant explicite_\n`;
    }
    md += `\n`;

    md += `#### 📤 4. Livrables & Résultats Attendus\n`;
    if (act.outputs && act.outputs.length > 0) {
      act.outputs.forEach(o => md += `- \`${o}\`\n`);
    } else {
      md += `_Transition vers l'activité suivante_\n`;
    }
    md += `\n---\n\n`;
  });

  dl(md, `mode_operatoire_SOP_${procId}.md`, 'text/markdown');
};

window.exportPmgSopHtmlPackage = function() {
  const activities = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : (window.pmgActivities || window.pmgTempSubprocesses || []);

  const procName = document.getElementById('pmgProcessNameStep')?.value || window.pmgProcessDetails?.name || 'Processus Métier';
  const procId = document.getElementById('pmgProcessIdStep')?.value || window.pmgProcessDetails?.id || 'process';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || window.pmgProcessDetails?.owner || 'Direction Métier';
  const version = document.getElementById('pmgProcessVersionStep')?.value || window.pmgProcessDetails?.version || 'v1.0';

  let docHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>SOP - ${escHtml(procName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1e293b; background: #f8fafc; margin: 0; padding: 30px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
    h1 { color: #0f172a; margin-top: 0; border-bottom: 2px solid #009cd7; padding-bottom: 10px; font-size: 24px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; }
    .card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .tag { display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; margin-right: 4px; }
    @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; padding: 0; } .card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span class="badge">Standard Operating Procedures (SOP)</span>
      <span style="font-size:12px; color:#64748b;">Version ${escHtml(version)} • ${new Date().toLocaleDateString('fr-FR')}</span>
    </div>
    <h1>📖 Mode Opératoire : ${escHtml(procName)}</h1>
    <p style="color:#475569; font-size:13px;"><strong>Responsable Métier :</strong> ${escHtml(owner)} | <strong>Identifiant :</strong> ${escHtml(procId)}</p>
    
    <h2>Étapes &amp; Fiches Réflexes</h2>
    ${activities.map((act, idx) => `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Étape ${idx + 1} : ${escHtml(act.name)}</div>
          <div style="font-size:12px; font-weight:600; color:#0284c7;">👤 ${escHtml(act.entity || 'Opérateur')}</div>
        </div>
        <p style="margin:0 0 10px; font-size:13px; color:#334155;"><strong>Consigne :</strong> ${escHtml(act.comment || 'Exécuter la tâche selon les directives de service.')}</p>
        ${act.inputs && act.inputs.length > 0 ? `<div style="font-size:12px; margin-bottom:6px;"><strong>📥 Données d'Entrée :</strong> ${act.inputs.map(i => `<span class="tag">${escHtml(i)}</span>`).join('')}</div>` : ''}
        ${act.outputs && act.outputs.length > 0 ? `<div style="font-size:12px;"><strong>📤 Données Produites :</strong> ${act.outputs.map(o => `<span class="tag">${escHtml(o)}</span>`).join('')}</div>` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  dl(docHtml, `mode_operatoire_SOP_${procId}.html`, 'text/html');
};

window.exportPmgSopPrint = function() {
  const container = document.getElementById('pmgSopContainer');
  if (!container) return;

  const prevMode = window.pmgSopState.mode;
  window.pmgSopState.mode = 'cards';
  window.renderPmgSop('pmgSopContainer');

  setTimeout(() => {
    window.print();
    window.pmgSopState.mode = prevMode;
    window.renderPmgSop('pmgSopContainer');
  }, 300);
};



