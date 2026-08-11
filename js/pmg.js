// ---------- PMG (Process Matrix Governance) Module Logic ----------

// Global variables for PMG
window.pmgXmlDoc = null;
window.pmgFileName = "";
window.pmgActivities = [];
window.pmgProcessDetails = {};

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
  for (let i = 1; i <= 4; i++) {
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

  const progressWidths = { 1: '0%', 2: '34%', 3: '68%', 4: '100%' };
  const progressBar = document.getElementById('pmgStepperProgress');
  if (progressBar) progressBar.style.width = progressWidths[targetStep] || '0%';
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

    localStorage.setItem(PMG_PERSISTENCE_KEY, JSON.stringify(state));
    window.updatePmgAutoSaveBadge();
  } catch (e) {
    console.warn("Erreur d'auto-sauvegarde localstorage PMG:", e);
  }
};

window.loadPmgStateFromLocalStorage = function() {
  try {
    const saved = localStorage.getItem(PMG_PERSISTENCE_KEY);
    if (!saved) return false;

    const state = JSON.parse(saved);
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

window.syncPmgStep1Metadata = function() {
  const name = document.getElementById('pmgProcessNameStep')?.value || 'Lancement projet';
  const id = document.getElementById('pmgProcessIdStep')?.value || 'lancement-projet';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || 'Équipe PMG / Modélisateur';
  const version = document.getElementById('pmgProcessVersionStep')?.value || 'v1.0.0';
  const desc = document.getElementById('pmgProcessDescStep')?.value || 'Cartographie d\'activités PMG.';

  if (document.getElementById('pmgProcessName')) document.getElementById('pmgProcessName').value = name;
  if (document.getElementById('pmgProcessId')) document.getElementById('pmgProcessId').value = id;
  if (document.getElementById('pmgProcessOwner')) document.getElementById('pmgProcessOwner').value = owner;
  if (document.getElementById('pmgExporter')) document.getElementById('pmgExporter').value = exporter;
  if (document.getElementById('pmgProcessVersion')) document.getElementById('pmgProcessVersion').value = version;
  if (document.getElementById('pmgProcessDesc')) document.getElementById('pmgProcessDesc').value = desc;

  window.savePmgStateToLocalStorage();
};

window.validatePmgStep1Metadata = function() {
  window.syncPmgStep1Metadata();
  document.getElementById('step-node-1').className = 'step-node completed';
  document.getElementById('step-node-2').className = 'step-node active';
  document.getElementById('pmg-step-panel-1').style.display = 'none';
  document.getElementById('pmg-step-panel-2').style.display = 'block';
  window.pmgActiveStep = 2;
  document.getElementById('pmgStepperProgress').style.width = '25%';
  window.savePmgStateToLocalStorage();
};

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
              ${act.level > 1 ? '<span style="color:' + lvlColor + ';">└─ </span>' : ''}<strong>${act.name}</strong>
            </span>
          </td>
          <td style="padding:6px;">
            <span style="background:${typeBg}; color:${typeColor}; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600;">
              ${act.type}
            </span>
          </td>
          <td style="padding:6px; color:${isRoot ? 'var(--text-tertiary)' : 'var(--text-primary)'}; font-style:${isRoot ? 'italic' : 'normal'};">
            ${act.parentName}
          </td>
          <td style="padding:6px;">
            <span style="background:rgba(255,255,255,0.05); color:${lvlColor}; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; border:1px solid ${lvlColor}44;">
              Niveau ${act.level}
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
      html += `• Activité/ID: <span style="color:var(--brand-primary);">${subIdVal || 'Ligne ' + (i+1)}</span> | Entité: <span>${entityVal}</span> | Groupe: <span>${groupVal}</span><br>`;
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
        html += `• Activité/ID: <span style="color:var(--brand-primary);">${subIdVal || 'Ligne ' + (i+1)}</span> | Inputs: <span>${inVal}</span> | Outputs: <span>${outVal}</span><br>`;
      }
    } else {
      const colSubId = parseInt(document.getElementById('colPmgVarSubIdRow')?.value, 10);
      const colName = parseInt(document.getElementById('colPmgVarName')?.value, 10);
      const colType = parseInt(document.getElementById('colPmgVarType')?.value, 10);
      
      for (let i = 0; i < count; i++) {
        const subIdVal = colSubId >= 0 ? raw[i][colSubId] || '' : '';
        const varNameVal = colName >= 0 ? raw[i][colName] || '' : '';
        const typeVal = colType >= 0 ? raw[i][colType] || '' : '';
        html += `• Activité/ID: <span style="color:var(--brand-primary);">${subIdVal || 'Ligne ' + (i+1)}</span> | Variable: <span>${varNameVal}</span> | Type: <span>${typeVal}</span><br>`;
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
      html += `• Activité/ID: <span style="color:var(--brand-primary);">${subIdVal || 'Ligne ' + (i+1)}</span> | Mode: <span>${modeVal}</span> | Cas: <span>${caseVal}</span> | Commentaire: <span>${commentVal}</span><br>`;
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
    html += `• ID: <span style="color:var(--brand-primary);">${idVal}</span> | Nom: <span>${nameVal}</span> | Parent: <span>${parentVal}</span> | Niveau: <span>${levelVal}</span> | Acteur: <span>${stakeVal}</span><br>`;
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

window.renderPmgStep2ManualTable = function() {
  const tbody = document.getElementById('pmgStep2ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\'abord valider l\'étape 1 pour charger les activités.</td></tr>';
    return;
  }

  let html = '';
  activities.forEach((act, idx) => {
    const entityVal = act.entity && act.entity !== 'Non défini' ? act.entity : '';
    const groupVal = act.userGroup || '';

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 12}px;">
            ${act.level > 1 ? '└─ ' : ''}<strong>${act.name}</strong>
          </span>
        </td>
        <td style="padding: 8px;">
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: var(--brand-primary);">
            ${act.type}
          </span>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgEntityInput_${idx}" value="${entityVal}" placeholder="Ex: Direction Financière" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgGroupInput_${idx}" value="${groupVal}" placeholder="Ex: Validateurs_N1" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
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

// Visual Tree View Component Logic
window.renderPmgVisualTree = function(activities) {
  const container = document.getElementById('pmgVisualTreeContainer');
  const treeBox = document.getElementById('pmgVisualTreeBox');
  if (!container || !treeBox) return;

  if (!activities || activities.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Build node lookup map
  const nodeMap = new Map();
  activities.forEach(act => {
    nodeMap.set(act.name.toLowerCase(), { ...act, children: [] });
    nodeMap.set(act.id.toLowerCase(), nodeMap.get(act.name.toLowerCase()));
  });

  const roots = [];
  activities.forEach(act => {
    const node = nodeMap.get(act.name.toLowerCase());
    if (act.parentId) {
      const parentNode = nodeMap.get(act.parentId.toLowerCase());
      if (parentNode && parentNode !== node) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const levelColors = [
    '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6',
    '#ec4899', '#ef4444', '#10b981', '#6366f1'
  ];

  const buildTreeHTML = (nodes) => {
    let html = '<ul class="pmg-tree-ul" style="list-style:none; padding-left:16px; margin:0;">';
    nodes.forEach(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isSub = node.type.toLowerCase().includes('sous-processus') || node.type.toLowerCase().includes('call');
      const lvlColor = levelColors[(node.level - 1) % levelColors.length];
      const icon = isSub ? '📁' : '📄';
      const escapedId = (node.id || node.name).replace(/'/g, "\\'");

      html += `
        <li class="pmg-tree-node" data-name="${node.name.toLowerCase()}" style="margin:6px 0;">
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color);">
            ${hasChildren ? `<button class="tree-toggle-btn" onclick="togglePmgTreeNode(this)" style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:bold; font-size:12px; padding:0 4px;">▼</button>` : `<span style="width:14px; display:inline-block;"></span>`}
            <span style="font-size:14px;">${icon}</span>
            <span style="font-weight:600; color:var(--text-primary); font-size:12px;">${node.name}</span>
            <span style="background:${isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color:${isSub ? 'var(--brand-primary)' : 'var(--ok)'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">${node.type}</span>
            <span style="background:rgba(255,255,255,0.05); color:${lvlColor}; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid ${lvlColor}44; margin-left:auto;">Niveau ${node.level}</span>
            
            <!-- Quick Action Buttons -->
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--brand-primary); border:1px solid var(--border-color);" onclick="openPmgEditTreeNodeModal('${escapedId}')" title="Éditer / Réorganiser">✏️ Éditer</button>
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--ok); border:1px solid var(--border-color);" onclick="addNewPmgSubactivity('${escapedId}')" title="Ajouter une sous-activité enfant">➕ Enfant</button>
          </div>
          ${hasChildren ? buildTreeHTML(node.children) : ''}
        </li>
      `;
    });
    html += '</ul>';
    return html;
  };

  treeBox.innerHTML = buildTreeHTML(roots);
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

// Validation steps logic
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

  let html = '';
  activities.forEach((act, idx) => {
    const inputsVal = (act.inputs || []).join(', ');
    const outputsVal = (act.outputs || []).join(', ');

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 12}px;">
            ${act.level > 1 ? '└─ ' : ''}<strong>${act.name}</strong>
          </span>
        </td>
        <td style="padding: 8px;">
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: var(--brand-primary);">
            ${act.type}
          </span>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgInputsInput_${idx}" value="${inputsVal}" placeholder="Ex: varIn1, varIn2" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgOutputsInput_${idx}" value="${outputsVal}" placeholder="Ex: varOut1, varOut2" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
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

  let html = '';
  activities.forEach((act, idx) => {
    const isSub = act.type.toLowerCase().includes('sous-processus') || act.type.toLowerCase().includes('call');
    const defaultMode = act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle');
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';

    let optionsHtml = '';
    modes.forEach(m => {
      const selected = m.toLowerCase() === defaultMode.toLowerCase() ? 'selected' : '';
      optionsHtml += `<option value="${m}" ${selected}>${m}</option>`;
    });

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:${(act.level - 1) * 12}px;">
            ${act.level > 1 ? '└─ ' : ''}<strong>${act.name}</strong>
          </span>
        </td>
        <td style="padding: 6px;">
          <select id="pmgModeSelect_${idx}" class="srt" style="width: 100%; height: 32px; font-size: 12px;">
            ${optionsHtml}
          </select>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCaseInput_${idx}" value="${caseVal}" placeholder="Ex: Si dossier prioritaire" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCommentInput_${idx}" value="${commentVal}" placeholder="Ex: Traitement physique" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
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
  const mode = document.querySelector('input[name="pmgStep4AssignMode"]:checked')?.value || 'excel';

  if (mode === 'manual') {
    const activities = window.pmgTempSubprocesses || [];
    activities.forEach((act, idx) => {
      act.realizationMode = (document.getElementById(`pmgModeSelect_${idx}`)?.value || 'Manuelle').trim();
      act.applicableCase = (document.getElementById(`pmgCaseInput_${idx}`)?.value || '').trim();
      act.comment = (document.getElementById(`pmgCommentInput_${idx}`)?.value || '').trim();
    });
  } else {
    const fileData = window.pmgUploadedFiles['step4'] || window.pmgUploadedFiles['step1'];
    if (!fileData) {
      alert("Veuillez charger un fichier pour l'étape 5 ou utiliser la saisie manuelle.");
      return;
    }

    const colSubId = parseInt(document.getElementById('colPmgStep4SubId')?.value, 10);
    const colMode = parseInt(document.getElementById('colPmgStep4RealizationMode')?.value, 10);
    const colCase = parseInt(document.getElementById('colPmgStep4ApplicableCase')?.value, 10);
    const colComment = parseInt(document.getElementById('colPmgStep4Comment')?.value, 10);

    fileData.raw.forEach(row => {
      const subKey = colSubId >= 0 ? String(row[colSubId] || '').trim().toLowerCase() : '';
      const matchedActs = window.pmgTempSubprocesses.filter(s => {
        if (!subKey) return true;
        return s.id.toLowerCase() === subKey || s.name.toLowerCase() === subKey;
      });

      matchedActs.forEach(sub => {
        if (colMode >= 0 && row[colMode]) sub.realizationMode = String(row[colMode]).trim();
        if (colCase >= 0 && row[colCase]) sub.applicableCase = String(row[colCase]).trim();
        if (colComment >= 0 && row[colComment]) sub.comment = String(row[colComment]).trim();
      });
    });
  }

  // Build final window.pmgActivities
  window.pmgActivities = window.pmgTempSubprocesses.map(sub => {
    const isSub = sub.type.toLowerCase().includes('sous-processus') || sub.type.toLowerCase().includes('call');
    return {
      id: sub.id,
      name: sub.name,
      type: isSub ? 'callactivity' : 'userTask',
      typeLabel: sub.type || (isSub ? 'Call Activity' : 'User Task'),
      entity: sub.entity || 'Non défini',
      userGroup: sub.userGroup || '',
      inputs: sub.inputs || [],
      outputs: sub.outputs || [],
      applicableCase: sub.applicableCase || '',
      comment: sub.comment || '',
      realizationMode: sub.realizationMode || (isSub ? 'Call Activity' : 'Manuelle'),
      parentId: sub.parentId || '',
      level: sub.level || 1
    };
  });

  const name = document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Lancement projet';
  const id = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'lancement-projet';
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

  alert("Importation terminée ! Matrice PMG générée.");
  window.analyzePmg();
};

window.validatePmgStep4AndFinish = window.validatePmgStep5AndFinish; // backward alias

window.validatePmgBulkAndFinish = function() {
  const fileData = window.pmgUploadedFiles['bulk'];
  if (!fileData) {
    alert("Veuillez charger le fichier unique.");
    return;
  }
  
  const colId = parseInt(document.getElementById('colPmgBulkSubId').value, 10);
  const colName = parseInt(document.getElementById('colPmgBulkSubName').value, 10);
  const colParent = parseInt(document.getElementById('colPmgBulkSubParent').value, 10);
  const colLevel = parseInt(document.getElementById('colPmgBulkSubLevel').value, 10);
  const colStake = parseInt(document.getElementById('colPmgBulkStakeholder').value, 10);
  const colCase = parseInt(document.getElementById('colPmgBulkCase').value, 10);
  const colComment = parseInt(document.getElementById('colPmgBulkComment').value, 10);
  
  if (isNaN(colId) || isNaN(colName)) {
    alert("Veuillez mapper l'ID et le Nom du sous-processus.");
    return;
  }
  
  const style = document.getElementById('pmgBulkVarMappingStyle').value;
  const tempMap = new Map();
  
  fileData.raw.forEach(row => {
    const subId = String(row[colId] || '').trim();
    if (!subId) return;
    
    if (!tempMap.has(subId)) {
      const name = String(row[colName] || '').trim();
      const parentId = colParent >= 0 ? String(row[colParent] || '').trim() : '';
      const level = colLevel >= 0 ? parseInt(row[colLevel], 10) || 1 : 1;
      const stake = colStake >= 0 ? String(row[colStake] || '').trim() : 'Non défini';
      const caseVal = colCase >= 0 ? String(row[colCase] || '').trim() : '';
      const commentVal = colComment >= 0 ? String(row[colComment] || '').trim() : '';
      
      tempMap.set(subId, {
        id: subId,
        name: name || `(Sous-processus ${subId})`,
        parentId: parentId,
        level: level,
        entity: stake || 'Non défini',
        inputs: [],
        outputs: [],
        applicableCase: caseVal,
        comment: commentVal
      });
    }
    
    const sub = tempMap.get(subId);
    
    if (style === 'separate') {
      const colIn = parseInt(document.getElementById('colPmgBulkVarInputs').value, 10);
      const colOut = parseInt(document.getElementById('colPmgBulkVarOutputs').value, 10);
      const sep = document.getElementById('pmgBulkVarSeparator').value || ',';
      
      if (colIn >= 0) {
        const inText = String(row[colIn] || '');
        const inVars = inText.split(sep).map(v => v.trim()).filter(v => v);
        inVars.forEach(v => {
          if (!sub.inputs.includes(v)) sub.inputs.push(v);
        });
      }
      
      if (colOut >= 0) {
        const outText = String(row[colOut] || '');
        const outVars = outText.split(sep).map(v => v.trim()).filter(v => v);
        outVars.forEach(v => {
          if (!sub.outputs.includes(v)) sub.outputs.push(v);
        });
      }
    } else {
      const colVarName = parseInt(document.getElementById('colPmgBulkVarName').value, 10);
      const colVarType = parseInt(document.getElementById('colPmgBulkVarType').value, 10);
      const inValText = (document.getElementById('pmgBulkVarValInput').value || 'Input').toLowerCase();
      const outValText = (document.getElementById('pmgBulkVarValOutput').value || 'Output').toLowerCase();
      
      if (colVarName >= 0 && colVarType >= 0) {
        const varName = String(row[colVarName] || '').trim();
        const rawType = String(row[colVarType] || '').trim().toLowerCase();
        
        if (varName) {
          if (rawType.includes(inValText)) {
            if (!sub.inputs.includes(varName)) sub.inputs.push(varName);
          } else if (rawType.includes(outValText)) {
            if (!sub.outputs.includes(varName)) sub.outputs.push(varName);
          }
        }
      }
    }
  });
  
  if (tempMap.size === 0) {
    alert("Aucun sous-processus valide trouvé.");
    return;
  }
  
  window.pmgActivities = Array.from(tempMap.values()).map(sub => {
    return {
      id: sub.id,
      name: sub.name,
      type: 'callactivity',
      typeLabel: 'Call Activity',
      entity: sub.entity || 'Non défini',
      inputs: sub.inputs || [],
      outputs: sub.outputs || [],
      applicableCase: sub.applicableCase || '',
      comment: sub.comment || '',
      parentId: sub.parentId || '',
      level: sub.level || 1
    };
  });
  
  window.pmgProcessDetails = {
    id: window.pmgActivities[0]?.parentId || 'bulk-process',
    name: window.pmgActivities[0]?.parentId ? `Processus ${window.pmgActivities[0].parentId}` : 'Processus Bulk',
    isExecutable: 'false',
    exporter: 'FlowAudit Pro (Import en masse)',
    exporterVersion: '1.0.0',
    version: '1.0.0',
    owner: window.pmgActivities[0]?.entity || 'Non spécifié',
    desc: 'Cartographie importée en masse à partir d\'un fichier plat.'
  };
  
  alert(`Importation en masse terminée ! ${window.pmgActivities.length} sous-processus importés.`);
  window.analyzePmg();
};

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
  
  const sorted = sortActivitiesHierarchically(filtered);
  
  tbody.innerHTML = sorted.map(act => {
    const inputsHtml = act.inputs.length > 0 
      ? `<div class="pmg-io-container">${act.inputs.map(i => `<span class="badge-io badge-io-in" title="${esc(i)}">${esc(i)}</span>`).join('')}</div>` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune entrée</span>';
      
    const outputsHtml = act.outputs.length > 0 
      ? `<div class="pmg-io-container">${act.outputs.map(o => `<span class="badge-io badge-io-out" title="${esc(o)}">${esc(o)}</span>`).join('')}</div>` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune sortie</span>';
      
    let badgeClass = 'type-task';
    if (act.type === 'callactivity') badgeClass = 'type-subprocess';
    
    const indent = (act.level && act.level > 1) ? (act.level - 1) * 20 : 0;
    const arrow = indent > 0 ? '<span style="color:var(--text-tertiary);margin-right:6px;font-family:sans-serif;">↳</span>' : '';
    
    return `
      <tr>
        <td style="padding-left: ${indent + 8}px;">
          ${arrow}
          <strong style="color:var(--text-primary); font-weight:600;">${esc(act.name)}</strong>
          ${act.parentId ? `<span style="font-size:10px;color:var(--text-tertiary);margin-left:8px;">(Parent: ${esc(act.parentId)})</span>` : ''}
          <br>
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
  if (!window.pmgActivities || window.pmgActivities.length === 0) {
    alert("La matrice PMG est vide.");
    return;
  }

  const processName = document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Lancement projet';
  const processId = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'lancement-projet';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Équipe PMG / Modélisateur';
  const badges = document.getElementById('pmgProjectBadgesStep')?.value || 'CDD / CPE / SGP / SP0 / DMN';
  const defaultFille = document.getElementById('pmgDefaultProcessFilleStep')?.value || 'NA';

  // 1. Sort activities strictly hierarchically (Root -> Children)
  const sortedActivities = sortActivitiesHierarchically(window.pmgActivities);

  // Map activities by ID and Name for fast ancestor chain lookup
  const nodeMap = new Map();
  sortedActivities.forEach(act => {
    if (act.id) nodeMap.set(String(act.id).toLowerCase(), act);
    if (act.name) nodeMap.set(String(act.name).toLowerCase(), act);
  });

  const getAncestors = (act) => {
    const chain = [];
    let curr = act;
    const visited = new Set();
    while (curr && !visited.has(curr.id || curr.name)) {
      visited.add(curr.id || curr.name);
      chain.unshift(curr);
      if (curr.parentId) {
        curr = nodeMap.get(String(curr.parentId).toLowerCase());
      } else {
        break;
      }
    }
    return chain;
  };

  // 2. Process activities into structured table rows
  const rawRows = sortedActivities.map(act => {
    const chain = getAncestors(act);
    const caseVal = document.querySelector(`.pmg-case[data-id="${act.id}"]`)?.value || act.applicableCase || '';
    const commentVal = document.querySelector(`.pmg-comment[data-id="${act.id}"]`)?.value || act.comment || '';
    const isSub = act.type === 'callactivity' || (act.typeLabel && act.typeLabel.toLowerCase().includes('sous-processus'));

    let colL1 = "NA", colL2 = "NA", colL3 = "NA", colL4 = "NA", colL5 = "NA", colL6 = "NA", colTask = "NA";

    if (chain.length >= 1) colL1 = chain[0].name;
    if (chain.length >= 2) colL2 = chain[1].name;
    if (chain.length >= 3) colL3 = chain[2].name;
    if (chain.length >= 4) colL4 = chain[3].name;
    if (chain.length >= 5) colL5 = chain[4].name;
    if (chain.length >= 6) colL6 = chain[5].name;
    if (chain.length >= 7) {
      colTask = chain.slice(6).map(c => c.name).join(' / ');
    }

    if (act.level === 1 && colL1 === "NA") colL1 = act.name;

    return {
      chainLength: chain.length,
      colL1,
      colL2,
      colL3,
      colL4,
      colL5,
      colL6,
      colTask,
      act,
      entity: act.entity || 'Non défini',
      userGroup: act.userGroup || '',
      inputs: (act.inputs || []).join('\n'),
      outputs: (act.outputs || []).join('\n'),
      mode: act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle'),
      applicableCase: caseVal,
      processFille: isSub ? (act.id || defaultFille) : defaultFille,
      comment: commentVal
    };
  });

  // 3. Dynamically determine which hierarchy columns have data
  const hasL1 = rawRows.some(r => r.colL1 !== "NA");
  const hasL2 = rawRows.some(r => r.colL2 !== "NA");
  const hasL3 = rawRows.some(r => r.colL3 !== "NA");
  const hasL4 = rawRows.some(r => r.colL4 !== "NA");
  const hasL5 = rawRows.some(r => r.colL5 !== "NA");
  const hasL6 = rawRows.some(r => r.colL6 !== "NA");

  let maxActiveLvl = 1;
  if (hasL6) maxActiveLvl = 6;
  else if (hasL5) maxActiveLvl = 5;
  else if (hasL4) maxActiveLvl = 4;
  else if (hasL3) maxActiveLvl = 3;
  else if (hasL2) maxActiveLvl = 2;

  const levelDefs = [
    { key: 'colL1', title: 'Briques Primaires', sub: 'Niveau : N0', show: hasL1 },
    { key: 'colL2', title: 'Processus Métier Macro', sub: 'Niveau : N1', show: hasL2 },
    { key: 'colL3', title: 'Sous-Processus Métier', sub: 'Niveau : N2', show: hasL3 },
    { key: 'colL4', title: 'Sous-Processus Métier', sub: 'Niveau : N3', show: hasL4 },
    { key: 'colL5', title: 'Sous-Processus Métier', sub: 'Niveau : N4', show: hasL5 },
    { key: 'colL6', title: 'Sous-Processus Métier', sub: 'Niveau : N5', show: hasL6 }
  ].filter((def, idx) => idx < maxActiveLvl);

  const processedRows = rawRows.map(r => {
    let taskName = r.colTask;
    if (taskName === "NA" && r.chainLength > maxActiveLvl) {
      taskName = r.act.name;
    }
    return {
      ...r,
      colTask: taskName
    };
  });

  // 4. Compute rowspans only for active hierarchy columns
  const numRows = processedRows.length;
  const spans = Array.from({ length: numRows }, () => ({}));

  levelDefs.forEach((def, defIdx) => {
    const key = def.key;
    const parentKeys = levelDefs.slice(0, defIdx).map(d => d.key);

    for (let r = 0; r < numRows; r++) {
      if (spans[r]['show_' + key] === false) continue;

      let count = 1;
      const val = processedRows[r][key];

      while (r + count < numRows) {
        let sameParent = true;
        for (const pKey of parentKeys) {
          if (processedRows[r + count][pKey] !== processedRows[r][pKey]) {
            sameParent = false;
            break;
          }
        }
        if (sameParent && processedRows[r + count][key] === val) {
          spans[r + count]['show_' + key] = false;
          count++;
        } else {
          break;
        }
      }
      spans[r]['span_' + key] = count;
      spans[r]['show_' + key] = true;
    }
  });

  const bgColors = ['#FFC000', '#A9D08E', '#BDD7EE', '#FCE4D6', '#E2EFDA'];
  let l1ColorIdx = 0;

  const totalCols = levelDefs.length + 1 + 8; // Level cols + Task col + 8 standard cols
  const colPart1 = Math.max(2, Math.floor(totalCols * 0.2));
  const colPart2 = 4;
  const colPart3 = 4;
  const colPart4 = totalCols - colPart1 - colPart2 - colPart3;

  let headersHtml = '';
  levelDefs.forEach(def => {
    headersHtml += `<th><u>${def.title}</u><br><span style="font-weight:normal; font-size:8.5pt; color:#5B9BD5;">${def.sub}</span></th>`;
  });
  headersHtml += `<th><u>Tâche N${maxActiveLvl}</u><br><span style="font-weight:normal; font-size:8.5pt; color:#FFC000;">(Activité Finale)</span></th>`;

  // Build HTML Table Excel Format matching dynamic active levels
  let html = `
  <html xmlns:o="urn:schemas-microsoft-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
   <x:ExcelWorkbook>
    <x:ExcelWorksheets>
     <x:ExcelWorksheet>
      <x:Name>Matrice PMG</x:Name>
      <x:WorksheetOptions>
       <x:DisplayGridlines/>
      </x:WorksheetOptions>
     </x:ExcelWorksheet>
    </x:ExcelWorksheets>
   </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
    th { background-color: #002060; color: #FFFFFF; font-size: 10pt; font-weight: bold; text-align: center; border: 1px solid #000000; padding: 8px; vertical-align: middle; }
    td { font-size: 9.5pt; border: 1px solid #D9D9D9; padding: 6px; vertical-align: middle; mso-number-format:'\\@'; white-space: pre-line; }
    .kpi-title { background-color: #FFC000; font-weight: bold; font-size: 11pt; padding: 6px; border: 1px solid #000; text-align: center; }
    .kpi-box { background-color: #548235; color: #fff; font-weight: bold; text-align: center; padding: 6px; }
  </style>
  </head>
  <body>
    <table>
      <!-- Top Banner Header Rows -->
      <tr>
        <td class="kpi-title" colspan="${colPart1}">${processName}</td>
        <td colspan="${colPart2}" style="background:#548235; color:#fff; font-weight:bold; text-align:center;">${badges}</td>
        <td colspan="${colPart3}" class="kpi-box">Pilotage / Avancement</td>
        <td colspan="${colPart4}" style="background:#FFC000; font-weight:bold; text-align:center;">${owner} | ${exporter}</td>
      </tr>
      <tr><td colspan="${totalCols}" style="height:10px; border:none;"></td></tr>

      <!-- Table Header Row (Dynamically Rendered Active Columns) -->
      <thead>
        <tr>
          ${headersHtml}
          <th>Entité</th>
          <th>groupe utilisateur</th>
          <th>&larr; Input (Quoi)</th>
          <th>Output (Quoi) &rarr;</th>
          <th>Mode de réalisation<br><span style="font-weight:normal; font-size:8pt;">(Automatisé/Manuel)</span></th>
          <th>Applicable dans quel cas ?<br><span style="font-weight:normal; font-size:8pt;">(Exemple FH ou PTTA)</span></th>
          <th>Processus Fille</th>
          <th>Commentaires</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let r = 0; r < numRows; r++) {
    const rowData = processedRows[r];
    const spanData = spans[r];

    html += `<tr>`;

    levelDefs.forEach((def, defIdx) => {
      const key = def.key;
      if (spanData['show_' + key]) {
        const spanVal = spanData['span_' + key];
        if (defIdx === 0) {
          const bgColor = bgColors[l1ColorIdx % bgColors.length];
          l1ColorIdx++;
          html += `<td rowspan="${spanVal}" style="background-color:${bgColor}; font-weight:bold; text-align:center; vertical-align:middle; width:140px;">${rowData[key]}</td>`;
        } else if (defIdx === 1) {
          html += `<td rowspan="${spanVal}" style="text-align:center; background:#F2F2F2; vertical-align:middle; width:130px;">${rowData[key]}</td>`;
        } else {
          html += `<td rowspan="${spanVal}" style="text-align:center; vertical-align:middle; width:130px;">${rowData[key]}</td>`;
        }
      }
    });

    html += `
        <td style="text-align:center; font-weight:600; width:140px;">${rowData.colTask}</td>
        <td style="text-align:center; font-weight:600;">${rowData.entity}</td>
        <td style="text-align:center;">${rowData.userGroup}</td>
        <td style="color:#1F4E78;">${rowData.inputs}</td>
        <td style="color:#1F4E78;">${rowData.outputs}</td>
        <td style="text-align:center; font-weight:600;">${rowData.mode}</td>
        <td>${rowData.applicableCase}</td>
        <td style="text-align:center;">${rowData.processFille}</td>
        <td>${rowData.comment}</td>
      </tr>`;
  }

  html += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `pmg_matrice_${processId || 'process'}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// ---------- PMG Feature 1: Tree Node Editor & Dynamic Re-parenting ----------
window.openPmgEditTreeNodeModal = function(actId) {
  const modal = document.getElementById('modalPmgEditTreeNode');
  if (!modal) return;

  const activities = window.pmgTempSubprocesses || [];
  const target = activities.find(a => a.id === actId || a.name === actId);
  if (!target) return;

  document.getElementById('pmgEditActOriginalId').value = target.id || target.name;
  document.getElementById('pmgEditActName').value = target.name || '';
  document.getElementById('pmgEditActType').value = target.type || 'User Task';
  document.getElementById('pmgEditActEntity').value = target.entity && target.entity !== 'Non défini' ? target.entity : '';

  const parentSelect = document.getElementById('pmgEditActParent');
  if (parentSelect) {
    parentSelect.innerHTML = '<option value="">-- Aucun (Processus Parent / Brique Primaire N0) --</option>';
    activities.forEach(act => {
      if (act.id !== target.id && act.name !== target.name) {
        const opt = document.createElement('option');
        opt.value = act.name;
        opt.textContent = `${act.name} (Niveau ${act.level})`;
        if (act.name.toLowerCase() === (target.parentId || '').toLowerCase() || act.id.toLowerCase() === (target.parentId || '').toLowerCase()) {
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
  const target = activities.find(a => a.id === origId || a.name === origId);
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

  const mapByName = new Map();
  const mapById = new Map();
  activities.forEach(act => {
    mapByName.set(act.name.toLowerCase(), act);
    mapById.set(act.id.toLowerCase(), act);
  });

  const getLevel = (act, visited = new Set()) => {
    if (!act || !act.parentId) return 1;
    if (visited.has(act.id || act.name)) return 1;
    visited.add(act.id || act.name);

    const parent = mapByName.get(act.parentId.toLowerCase()) || mapById.get(act.parentId.toLowerCase());
    return parent ? 1 + getLevel(parent, visited) : 2;
  };

  activities.forEach(act => {
    act.level = getLevel(act);
    act.parentName = act.parentId ? act.parentId : 'Processus Parent (Racine)';
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
    window.pmgTempSubprocesses = (window.pmgTempSubprocesses || []).filter(a => a.id !== origId && a.name !== origId);
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

  const parentObj = parentId ? activities.find(a => a.id === parentId || a.name === parentId) : null;
  const parentName = parentObj ? parentObj.name : '';
  const newLevel = parentObj ? parentObj.level + 1 : 1;

  const newAct = {
    id: newId,
    name: name.trim(),
    parentId: parentName,
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
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || (!data.activities && !data.meta)) {
        throw new Error("Format JSON PMG invalide.");
      }

      if (data.meta) {
        if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = data.meta.name || '';
        if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = data.meta.id || '';
        if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = data.meta.owner || '';
        if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = data.meta.exporter || '';
        if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = data.meta.version || '';
        if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = data.meta.badges || '';
        if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = data.meta.defaultFille || '';
        if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = data.meta.desc || '';
        window.syncPmgStep1Metadata();
      }

      if (data.realizationModes) {
        window.pmgRealizationModes = data.realizationModes;
      }

      if (data.activities && data.activities.length > 0) {
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

  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    container.innerHTML = '<span style="color:var(--text-tertiary);">Aucune activité chargée pour analyser le lignage.</span>';
    return;
  }

  const allInputs = new Map();
  const allOutputs = new Map();
  const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;

  activities.forEach(act => {
    (act.inputs || []).forEach(i => {
      const v = getVarName(i);
      if (v) {
        if (!allInputs.has(v)) allInputs.set(v, []);
        allInputs.get(v).push(act.name);
      }
    });
    (act.outputs || []).forEach(o => {
      const v = getVarName(o);
      if (v) {
        if (!allOutputs.has(v)) allOutputs.set(v, []);
        allOutputs.get(v).push(act.name);
      }
    });
  });

  const orphanInputs = [];
  const unusedOutputs = [];
  const nonCamelCaseVars = [];

  allInputs.forEach((consumers, v) => {
    if (!allOutputs.has(v)) {
      orphanInputs.push({ varName: v, consumers });
    }
    if (!camelCaseRegex.test(v)) {
      nonCamelCaseVars.push(v);
    }
  });

  allOutputs.forEach((producers, v) => {
    if (!allInputs.has(v)) {
      unusedOutputs.push({ varName: v, producers });
    }
    if (!camelCaseRegex.test(v) && !nonCamelCaseVars.includes(v)) {
      nonCamelCaseVars.push(v);
    }
  });

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
      <h5 style="margin:0; font-size:13px; font-weight:600; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
        🔍 Audit de Lignage &amp; Cohérence des Variables (${allInputs.size + allOutputs.size} flux découverts)
      </h5>
      <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:${orphanInputs.length === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color:${orphanInputs.length === 0 ? 'var(--ok)' : 'var(--err)'}; font-weight:600;">
        ${orphanInputs.length === 0 ? '✅ Lignage Produit/Consommé Conforme' : '⚠️ Anomalies détectées'}
      </span>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
  `;

  // Orphan inputs card
  html += `
    <div style="background:var(--bg-card); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
      <div style="font-size:12px; font-weight:600; color:var(--err); margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>🔴 Variables d'Entrée Orphelines (${orphanInputs.length})</span>
      </div>
      <div style="font-size:11px; color:var(--text-secondary); max-height:120px; overflow-y:auto;">
  `;
  if (orphanInputs.length === 0) {
    html += `<span style="color:var(--ok);">Toutes les variables consommées sont bien produites en amont !</span>`;
  } else {
    orphanInputs.forEach(item => {
      html += `<div style="margin-bottom:4px;">• <code style="color:var(--err); font-weight:bold;">${item.varName}</code> (Lue par : ${item.consumers.join(', ')})</div>`;
    });
  }
  html += `</div></div>`;

  // Unused outputs card
  html += `
    <div style="background:var(--bg-card); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
      <div style="font-size:12px; font-weight:600; color:var(--warn); margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>🟡 Variables de Sortie Inutilisées (${unusedOutputs.length})</span>
      </div>
      <div style="font-size:11px; color:var(--text-secondary); max-height:120px; overflow-y:auto;">
  `;
  if (unusedOutputs.length === 0) {
    html += `<span style="color:var(--ok);">Toutes les variables générées sont lues en aval !</span>`;
  } else {
    unusedOutputs.forEach(item => {
      html += `<div style="margin-bottom:4px;">• <code style="color:var(--warn); font-weight:bold;">${item.varName}</code> (Créée par : ${item.producers.join(', ')})</div>`;
    });
  }
  html += `</div></div>`;

  // Format conventions card
  html += `
    <div style="background:var(--bg-card); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
      <div style="font-size:12px; font-weight:600; color:var(--info); margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>💡 Conventions de Nommage (${nonCamelCaseVars.length})</span>
      </div>
      <div style="font-size:11px; color:var(--text-secondary); max-height:120px; overflow-y:auto;">
  `;
  if (nonCamelCaseVars.length === 0) {
    html += `<span style="color:var(--ok);">Toutes les variables respectent le format standard camelCase !</span>`;
  } else {
    nonCamelCaseVars.forEach(v => {
      html += `<div style="margin-bottom:4px;">• Nom à réviser : <code>${v}</code></div>`;
    });
  }
  html += `</div></div></div>`;

  container.innerHTML = html;
};

// ---------- PMG Feature 2: Matrice Globale Vue Unique Excel-Like ----------
window.renderPmgGlobalGridTable = function() {
  const container = document.getElementById('pmgGlobalGridContainer');
  if (!container) return;

  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : (window.pmgTempSubprocesses || []);
  if (activities.length === 0) {
    container.innerHTML = '<span style="color:var(--text-tertiary);">Aucune activité à afficher dans la grille.</span>';
    return;
  }

  const modes = window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

  let maxLevel = 1;
  activities.forEach(act => {
    if (act.level && act.level > maxLevel) maxLevel = act.level;
  });
  if (maxLevel > 6) maxLevel = 6;

  const levelHeaderTitles = [
    { title: 'N0 (Brique)', lvl: 1 },
    { title: 'N1 (Macro)', lvl: 2 },
    { title: 'N2 (Sous-Proc)', lvl: 3 },
    { title: 'N3 (Sous-Proc)', lvl: 4 },
    { title: 'N4 (Sous-Proc)', lvl: 5 },
    { title: 'N5 (Sous-Proc)', lvl: 6 }
  ].filter(h => h.lvl < maxLevel);

  let gridHeadersHtml = '';
  levelHeaderTitles.forEach(h => {
    gridHeadersHtml += `<th style="padding:6px; min-width:110px;">${h.title}</th>`;
  });
  gridHeadersHtml += `<th style="padding:6px; min-width:120px;">Tâche (N${maxLevel})</th>`;

  let html = `
    <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
      <h5 style="margin:0; font-weight:600; color:var(--text-primary);">🩻 Grille Globale Éditable PMG (${levelHeaderTitles.length + 9} Colonnes Adaptatives)</h5>
      <span style="font-size:11px; color:var(--text-tertiary);">Modifiez n'importe quelle cellule pour synchroniser l'ensemble du projet</span>
    </div>
    <div style="overflow-x:auto; max-height:450px; border:1px solid var(--border-color); border-radius:6px;">
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#002060; color:#fff;">
            ${gridHeadersHtml}
            <th style="padding:6px; min-width:110px;">Entité</th>
            <th style="padding:6px; min-width:110px;">Groupe Utilisateur</th>
            <th style="padding:6px; min-width:120px;">Inputs</th>
            <th style="padding:6px; min-width:120px;">Outputs</th>
            <th style="padding:6px; min-width:110px;">Mode</th>
            <th style="padding:6px; min-width:120px;">Applicable cas ?</th>
            <th style="padding:6px; min-width:100px;">Proc. Fille</th>
            <th style="padding:6px; min-width:120px;">Commentaires</th>
          </tr>
        </thead>
        <tbody>
  `;

  activities.forEach((act, idx) => {
    const isSub = act.type.toLowerCase().includes('sous-processus') || act.type.toLowerCase().includes('call');
    const curMode = act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle');

    let modeOptsHtml = '';
    modes.forEach(m => {
      const sel = m.toLowerCase() === curMode.toLowerCase() ? 'selected' : '';
      modeOptsHtml += `<option value="${m}" ${sel}>${m}</option>`;
    });

    let rowLevelCellsHtml = '';
    levelHeaderTitles.forEach(h => {
      const val = act.level === h.lvl ? act.name : (act.parentId || 'NA');
      rowLevelCellsHtml += `<td style="padding:4px;"><input type="text" value="${act.level === h.lvl ? act.name : 'NA'}" style="width:100%; height:28px; font-size:11px;"></td>`;
    });

    html += `
      <tr style="border-bottom:1px solid var(--border-color);">
        ${rowLevelCellsHtml}
        <td style="padding:4px;"><input type="text" value="${act.name}" onchange="updatePmgGridCell(${idx}, 'name', this.value)" style="width:100%; height:28px; font-size:11px; font-weight:600;"></td>
        <td style="padding:4px;"><input type="text" value="${act.entity || ''}" onchange="updatePmgGridCell(${idx}, 'entity', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><input type="text" value="${act.userGroup || ''}" onchange="updatePmgGridCell(${idx}, 'userGroup', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><input type="text" value="${(act.inputs || []).join(', ')}" onchange="updatePmgGridCell(${idx}, 'inputs', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><input type="text" value="${(act.outputs || []).join(', ')}" onchange="updatePmgGridCell(${idx}, 'outputs', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><select onchange="updatePmgGridCell(${idx}, 'realizationMode', this.value)" style="width:100%; height:28px; font-size:11px;">${modeOptsHtml}</select></td>
        <td style="padding:4px;"><input type="text" value="${act.applicableCase || ''}" onchange="updatePmgGridCell(${idx}, 'applicableCase', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><input type="text" value="${act.processFille || (isSub ? act.id : 'NA')}" style="width:100%; height:28px; font-size:11px;"></td>
        <td style="padding:4px;"><input type="text" value="${act.comment || ''}" onchange="updatePmgGridCell(${idx}, 'comment', this.value)" style="width:100%; height:28px; font-size:11px;"></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
};

window.updatePmgGridCell = function(index, field, value) {
  const activities = window.pmgActivities.length > 0 ? window.pmgActivities : window.pmgTempSubprocesses;
  if (!activities || !activities[index]) return;

  const target = activities[index];

  if (field === 'inputs' || field === 'outputs') {
    target[field] = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
  } else {
    target[field] = value.trim();
  }

  window.savePmgStateToLocalStorage();
};
