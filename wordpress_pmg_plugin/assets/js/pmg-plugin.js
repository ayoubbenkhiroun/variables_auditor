// ---------- PMG (Process Matrix Governance) Standalone Plugin Engine ----------

// Global variables for PMG
window.pmgXmlDoc = null;
window.pmgFileName = "";
window.pmgActivities = [];
window.pmgProcessDetails = {};

window.pmgImportMode = 'excel';
window.pmgImportMethod = 'steps';
window.pmgUseSingleFile = true;
window.pmgActiveStep = 1;

window.pmgRealizationModes = ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

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

      const treeContainer = document.getElementById('pmgVisualTreeContainer');
      if (treeContainer) treeContainer.style.display = 'block';
      if (window.renderPmgVisualTree) window.renderPmgVisualTree(state.tempSubprocesses);

      for (let s = 1; s <= 5; s++) {
        const node = document.getElementById('step-node-' + s);
        if (node) node.classList.remove('disabled');
      }

      const btnNext1 = document.getElementById('btnPmgStep1Next');
      if (btnNext1) btnNext1.disabled = false;

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

window.updatePmgAutoSaveBadge = function(timeStr) {
  const badge = document.getElementById('pmgAutoSaveBadge');
  if (!badge) return;

  const date = timeStr ? new Date(timeStr) : new Date();
  const formattedTime = date.toLocaleTimeString();
  badge.innerHTML = `💾 Auto-sauvegarde active (${formattedTime})`;
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
  const exporter = document.getElementById('pmgExporterStep')?.value || 'Équipe PMG';
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
  if (document.getElementById('pmgProcessNameStep')) document.getElementById('pmgProcessNameStep').value = "Lancement & Qualification des Sites (VDR)";
  if (document.getElementById('pmgProcessIdStep')) document.getElementById('pmgProcessIdStep').value = "lancement-vdr-site";
  if (document.getElementById('pmgProcessOwnerStep')) document.getElementById('pmgProcessOwnerStep').value = "Direction Réseau & Opérations";
  if (document.getElementById('pmgExporterStep')) document.getElementById('pmgExporterStep').value = "Ayoub BENKHIROUN (Consultant PMG)";
  if (document.getElementById('pmgProcessVersionStep')) document.getElementById('pmgProcessVersionStep').value = "v2.4.0";
  if (document.getElementById('pmgProjectBadgesStep')) document.getElementById('pmgProjectBadgesStep').value = "CDD / CPE / SGP / SP0 / DMN";
  if (document.getElementById('pmgDefaultProcessFilleStep')) document.getElementById('pmgDefaultProcessFilleStep').value = "NA";
  if (document.getElementById('pmgProcessDescStep')) document.getElementById('pmgProcessDescStep').value = "Processus complet d'instruction des demandes d'allumage et remédiation 4G/5G.";

  window.syncPmgStep1Metadata();

  const demoActivities = [
    { id: 'act_101', name: 'Lancement projet', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Métier', userGroup: 'Chefs de projet', inputs: ['idProjet', 'codeSite'], outputs: ['projetInitie'], realizationMode: 'Call Activity', applicableCase: 'Tous les projets', comment: 'Brique primaire d\'initialisation' },
    { id: 'act_102', name: 'Vérifier le dépôt COMSIS', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Service Administration', userGroup: 'Gestionnaires COMSIS', inputs: ['numDossier', 'docIdentite'], outputs: ['statutDepot'], realizationMode: 'Call Activity', applicableCase: 'Dossiers COMSIS', comment: 'Vérification documentaire' },
    { id: 'act_103', name: 'Contrôler la conformité du dossier', parentId: 'Vérifier le dépôt COMSIS', level: 3, type: 'User Task', entity: 'Service Client', userGroup: 'Analystes COMSIS', inputs: ['numDossier', 'attestationBDD'], outputs: ['dossierValide'], realizationMode: 'Manuelle', applicableCase: 'Dossier déposé', comment: 'Examen manuel des pièces' },
    { id: 'act_104', name: 'Vérifier le réglementaire', parentId: 'Lancement projet', level: 2, type: 'Sous-processus', entity: 'Direction Juridique & Réglementaire', userGroup: 'Juristes ANFR', inputs: ['idSite', 'freqBand'], outputs: ['accordReglementaire'], realizationMode: 'Call Activity', applicableCase: 'Sites radio 4G/5G', comment: 'Instruction réglementaire' },
    { id: 'act_105', name: 'Notifier ANFR Date allumage 4G 700', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage700'], outputs: ['ackANFR700'], realizationMode: 'Automatique', applicableCase: 'Bande 700 MHz', comment: 'Flux API ANFR' },
    { id: 'act_106', name: 'Notifier ANFR Date allumage 4G 800', parentId: 'Vérifier le réglementaire', level: 3, type: 'Service Task', entity: 'Équipe Réglementaire', userGroup: 'Administrateurs ANFR', inputs: ['idSite', 'dateAllumage800'], outputs: ['ackANFR800'], realizationMode: 'Automatique', applicableCase: 'Bande 800 MHz', comment: 'Flux API ANFR' },
    { id: 'act_107', name: 'Réaliser Remédiation 4G', parentId: 'Vérifier le réglementaire', level: 3, type: 'Sous-processus', entity: 'Support Technique', userGroup: 'Techniciens Réseau', inputs: ['ticketRemediation'], outputs: ['rapportRemediation'], realizationMode: 'SP0', applicableCase: 'Anomalie détectée', comment: 'Remédiation technique site' },
    { id: 'act_108', name: 'Préciser le groupe responsable', parentId: 'Réaliser Remédiation 4G', level: 4, type: 'User Task', entity: 'Support Technique', userGroup: 'Superviseurs NOC', inputs: ['ticketRemediation'], outputs: ['groupeAffecte'], realizationMode: 'Manuelle', applicableCase: 'Remédiation requise', comment: 'Affectation au prestataire' },
    { id: 'act_109', name: 'Négocier le type de Bail', parentId: '', level: 1, type: 'Sous-processus', entity: 'Direction Immobilière', userGroup: 'Négociateurs Baux', inputs: ['nomBailleur', 'adresseSite'], outputs: ['bailSigne'], realizationMode: 'Call Activity', applicableCase: 'Nouveau site', comment: 'Négociation contractuelle' },
    { id: 'act_110', name: 'Identifier type de Bailleur VDR', parentId: 'Négocier le type de Bail', level: 2, type: 'Call Activity', entity: 'Direction Juridique', userGroup: 'Juristes Immobilier', inputs: ['nomBailleur', 'typeBailleur'], outputs: ['conventionBail'], realizationMode: 'Call Activity', applicableCase: 'Bailleur privé/public', comment: 'Validation modèle convention' }
  ];

  window.pmgTempSubprocesses = demoActivities;

  const treeContainer = document.getElementById('pmgVisualTreeContainer');
  if (treeContainer) treeContainer.style.display = 'block';
  if (window.renderPmgVisualTree) window.renderPmgVisualTree(demoActivities);

  const btnNext1 = document.getElementById('btnPmgStep1Next');
  if (btnNext1) btnNext1.disabled = false;

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3ManualTable) window.renderPmgStep3ManualTable();
  if (window.renderPmgStep4ManualTable) window.renderPmgStep4ManualTable();

  for (let s = 1; s <= 5; s++) {
    const node = document.getElementById('step-node-' + s);
    if (node) node.classList.remove('disabled');
  }

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

  alert("✨ Données de démonstration PMG chargées avec succès !");
};
