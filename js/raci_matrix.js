/**
 * PAPRIKA AUDITFLOW PRO - MATRICE RACI AUTOMATIQUE & GOUVERNANCE DES RÔLES
 * Module de Cartographie Organisationnelle & Conformité RACI pour Bouygues Telecom
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // JEUX DE DONNÉES PAR DÉFAUT (PROCESSUS TÉLÉCOM BOUYGUES TELECOM)
  // -------------------------------------------------------------
  const DEFAULT_RACI_PROCESSES = [
    {
      id: 'proc_bbox_fibre',
      name: 'Souscription Bbox Fibre & Raccordement Domicile',
      description: 'Parcours de commande client Bbox, validation d\'éligibilité, prise de RDV technicien, brassage PTO et activation des services.',
      roles: [
        { id: 'role_client', name: 'Client Final', squad: 'Clientèle Bbox', type: 'Externe / Demandeur', color: '#6366f1' },
        { id: 'role_conseiller', name: 'Conseiller Commercial (Boutique / Web)', squad: 'Tribu Vente & Front-Office', type: 'Humain / Opérationnel', color: '#009cd7' },
        { id: 'role_si_elig', name: 'Système Éligibilité & Carto Fibre', squad: 'Squad Provisioning SI', type: 'Automatisé (Service Task)', color: '#003882' },
        { id: 'role_tech_fibre', name: 'Technicien Raccordement Fibre (Intervention)', squad: 'Direction Réseau & Déploiement', type: 'Terrain / Prestataire', color: '#ea5b0c' },
        { id: 'role_squad_prov', name: 'Squad Activation & Logistique Box', squad: 'Tribu Bbox & Fixe', type: 'Support / Logistique', color: '#10b981' },
        { id: 'role_facturation', name: 'Système Facturation & Facturation Récurrente', squad: 'Tribu Facturation & Encaissement', type: 'Automatisé / Comptabilité', color: '#8b5cf6' }
      ],
      tasks: [
        {
          id: 'task_1',
          name: 'Saisir la demande de souscription Bbox',
          type: 'bpmn:userTask',
          lane: 'Conseiller Commercial (Boutique / Web)',
          description: 'Recueil des coordonnées, IBAN et choix de l\'offre commerciale (Fit, Must, Ultym).',
          raci: { role_client: 'I', role_conseiller: 'R', role_si_elig: 'C', role_tech_fibre: '', role_squad_prov: '', role_facturation: '' },
          accountable: 'role_conseiller'
        },
        {
          id: 'task_2',
          name: 'Vérifier l\'éligibilité optique et le PM/PTO',
          type: 'bpmn:serviceTask',
          lane: 'Système Éligibilité & Carto Fibre',
          description: 'Interrogation automatique de la base IPE et calcul de l\'atténuation optique prévisionnelle.',
          raci: { role_client: '', role_conseiller: 'I', role_si_elig: 'R', role_tech_fibre: '', role_squad_prov: '', role_facturation: '' },
          accountable: 'role_si_elig'
        },
        {
          id: 'task_3',
          name: 'Sélectionner le créneau d\'intervention technicien',
          type: 'bpmn:userTask',
          lane: 'Conseiller Commercial (Boutique / Web)',
          description: 'Choix de la demi-journée de rendez-vous avec confirmation SMS immédiate.',
          raci: { role_client: 'C', role_conseiller: 'R', role_si_elig: '', role_tech_fibre: 'I', role_squad_prov: 'I', role_facturation: '' },
          accountable: 'role_conseiller'
        },
        {
          id: 'task_4',
          name: 'Préparer et expédier la Bbox & Décodeur TV',
          type: 'bpmn:serviceTask',
          lane: 'Squad Activation & Logistique Box',
          description: 'Génération du bon de livraison et expédition en point relais ou à domicile.',
          raci: { role_client: 'I', role_conseiller: '', role_si_elig: '', role_tech_fibre: '', role_squad_prov: 'R', role_facturation: '' },
          accountable: 'role_squad_prov'
        },
        {
          id: 'task_5',
          name: 'Réaliser le raccordement optique au domicile',
          type: 'bpmn:manualTask',
          lane: 'Technicien Raccordement Fibre (Intervention)',
          description: 'Tirage du câble de branchement, soudure optique sur PTO et mesure de puissance du signal.',
          raci: { role_client: 'I', role_conseiller: '', role_si_elig: 'C', role_tech_fibre: 'R', role_squad_prov: 'I', role_facturation: '' },
          accountable: 'role_tech_fibre'
        },
        {
          id: 'task_6',
          name: 'Activer la ligne sur l\'OLT et provisionner l\'ONT',
          type: 'bpmn:serviceTask',
          lane: 'Système Éligibilité & Carto Fibre',
          description: 'Enregistrement de l\'adresse MAC de la Bbox et ouverture du flux IP / VoIP / IPTV.',
          raci: { role_client: '', role_conseiller: 'I', role_si_elig: 'R', role_tech_fibre: '', role_squad_prov: 'I', role_facturation: 'I' },
          accountable: 'role_si_elig'
        },
        {
          id: 'task_7',
          name: 'Déclencher la facturation initiale et le prélèvement',
          type: 'bpmn:serviceTask',
          lane: 'Système Facturation & Facturation Récurrente',
          description: 'Création du compte de facturation et émission de la première facture au prorata.',
          raci: { role_client: 'I', role_conseiller: '', role_si_elig: '', role_tech_fibre: '', role_squad_prov: '', role_facturation: 'R' },
          accountable: 'role_facturation'
        }
      ]
    },
    {
      id: 'proc_incident_5g',
      name: 'Traitement Incident Réseau Mobile 5G & Alerte Roaming',
      description: 'Supervision des alarmes d\'antennes relais (gNodeB), diagnostic de saturation et rétablissement du service mobile.',
      roles: [
        { id: 'role_noc', name: 'Superviseur NOC 24/7', squad: 'Direction des Opérations Réseau', type: 'Supervision / Alerte', color: '#003882' },
        { id: 'role_radio', name: 'Équipe Ingénierie Radio (Réseau)', squad: 'Tribu Radio & Fréquences', type: 'Expertise Technique', color: '#ea5b0c' },
        { id: 'role_field', name: 'Technicien de Maintenance Site', squad: 'Maintenance & Pylônes', type: 'Terrain', color: '#10b981' },
        { id: 'role_cust_care', name: 'Support Client VIP & SAV Mobile', squad: 'Relation Client Entreprise', type: 'Communication', color: '#009cd7' },
        { id: 'role_incident_mgr', name: 'Manager de Crise / Incident Majeur', squad: 'Direction Générale des Réseaux', type: 'Gouvernance & Arbitrage', color: '#dc2626' }
      ],
      tasks: [
        {
          id: 'inc_1',
          name: 'Détecter la perte de signal sur le cluster d\'antennes',
          type: 'bpmn:serviceTask',
          lane: 'Superviseur NOC 24/7',
          description: 'Remontée automatique d\'alarme SNMP / Netcool et qualification du niveau de criticité (P1/P2).',
          raci: { role_noc: 'R', role_radio: 'I', role_field: '', role_cust_care: '', role_incident_mgr: 'I' },
          accountable: 'role_noc'
        },
        {
          id: 'inc_2',
          name: 'Analyser les métriques de trafic et charge radio',
          type: 'bpmn:userTask',
          lane: 'Équipe Ingénierie Radio (Réseau)',
          description: 'Diagnostic de l\'état de la fibre de collecte, puissance d\'émission et taux d\'appels coupés.',
          raci: { role_noc: 'C', role_radio: 'R', role_field: '', role_cust_care: '', role_incident_mgr: 'I' },
          accountable: 'role_radio'
        },
        {
          id: 'inc_3',
          name: 'Déclencher la cellule de crise si impact > 10 000 clients',
          type: 'bpmn:businessRuleTask',
          lane: 'Manager de Crise / Incident Majeur',
          description: 'Évaluation des critères d\'escalade vers le comité de direction.',
          raci: { role_noc: 'C', role_radio: 'C', role_field: '', role_cust_care: 'I', role_incident_mgr: 'R' },
          accountable: 'role_incident_mgr'
        },
        {
          id: 'inc_4',
          name: 'Intervenir sur baie radio et remplacer la carte défectueuse',
          type: 'bpmn:manualTask',
          lane: 'Technicien de Maintenance Site',
          description: 'Accès sécurisé au pylône, remplacement physique du module radio et relance logicielle.',
          raci: { role_noc: 'I', role_radio: 'C', role_field: 'R', role_cust_care: '', role_incident_mgr: 'I' },
          accountable: 'role_field'
        },
        {
          id: 'inc_5',
          name: 'Informer les clients d\'entreprise et mettre à jour l\'espace suivi',
          type: 'bpmn:userTask',
          lane: 'Support Client VIP & SAV Mobile',
          description: 'Publication des alertes météo réseau et notification pro-active des gestionnaires de flotte.',
          raci: { role_noc: 'C', role_radio: '', role_field: '', role_cust_care: 'R', role_incident_mgr: 'I' },
          accountable: 'role_cust_care'
        },
        {
          id: 'inc_6',
          name: 'Clôturer l\'incident et rédiger le REX post-mortem',
          type: 'bpmn:userTask',
          lane: 'Manager de Crise / Incident Majeur',
          description: 'Analyse des causes racines et plan d\'action préventif pour le prochain audit de disponibilité.',
          raci: { role_noc: 'C', role_radio: 'C', role_field: 'C', role_cust_care: 'I', role_incident_mgr: 'R' },
          accountable: 'role_incident_mgr'
        }
      ]
    }
  ];

  // État local du module
  window.raciState = {
    selectedProcessId: 'proc_bbox_fibre',
    activeSubTab: 'matrix', // 'matrix', 'audit', 'roles', 'export'
    processes: JSON.parse(JSON.stringify(DEFAULT_RACI_PROCESSES)),
    searchQuery: '',
    roleFilter: 'all',
    taskTypeFilter: 'all',
    raciIssueFilter: 'all'
  };

  // -------------------------------------------------------------
  // INITIALISATION DU MODULE
  // -------------------------------------------------------------
  window.initRaciModule = function () {
    // Si des modèles BPMN sont déjà chargés dans l'application, synchroniser dynamiquement
    syncRaciWithImportedBpmn();
    renderRaciTabs();
    renderRaciMain();
  };

  // -------------------------------------------------------------
  // EXTRACTION & SYNCHRONISATION AUTOMATIQUE DEPUIS LE BPMN
  // -------------------------------------------------------------
  function syncRaciWithImportedBpmn() {
    // Vérifier si des éléments BPMN sont en mémoire (ex: window.allRows ou bpmnNamingElements)
    if (!window.allRows || window.allRows.length === 0) return;

    // Regrouper par fichier/processus
    const procMap = {};
    window.allRows.forEach(row => {
      const pName = row.processName || row.fileName || 'Processus Importé';
      const pId = 'proc_' + pName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      if (!procMap[pId]) {
        procMap[pId] = {
          id: pId,
          name: pName,
          description: `Extrait automatiquement du modèle BPMN "${row.fileName || pName}".`,
          rolesMap: {},
          tasksMap: {}
        };
      }

      const lane = row.lane || row.pool || 'Équipe Opérationnelle';
      const roleId = 'role_' + lane.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      if (!procMap[pId].rolesMap[roleId]) {
        procMap[pId].rolesMap[roleId] = {
          id: roleId,
          name: lane,
          squad: lane.includes('Tribu') ? lane : 'Squad Métier',
          type: lane.toLowerCase().includes('système') ? 'Automatisé (Service Task)' : 'Opérationnel / Humain',
          color: getRandomRoleColor(Object.keys(procMap[pId].rolesMap).length)
        };
      }

      const taskName = row.elementName || row.activityName || row.variableName || 'Activité sans nom';
      const taskId = 'task_' + (row.elementId || Math.random().toString(36).substr(2, 6));

      if (!procMap[pId].tasksMap[taskId]) {
        procMap[pId].tasksMap[taskId] = {
          id: taskId,
          name: taskName,
          type: row.elementType || 'bpmn:userTask',
          lane: lane,
          description: `Activité identifiée dans le couloir "${lane}".`,
          raci: {},
          accountable: roleId
        };
        // Par défaut, le couloir est Responsible (R)
        procMap[pId].tasksMap[taskId].raci[roleId] = 'R';
      }
    });

    // Convertir les maps en processus RACI
    Object.keys(procMap).forEach(pId => {
      const p = procMap[pId];
      const rolesList = Object.values(p.rolesMap);
      const tasksList = Object.values(p.tasksMap);

      if (tasksList.length > 0) {
        const existingIdx = window.raciState.processes.findIndex(x => x.id === p.id);
        const newProc = {
          id: p.id,
          name: p.name,
          description: p.description,
          roles: rolesList,
          tasks: tasksList
        };

        if (existingIdx >= 0) {
          window.raciState.processes[existingIdx] = newProc;
        } else {
          window.raciState.processes.unshift(newProc);
          window.raciState.selectedProcessId = newProc.id;
        }
      }
    });
  }

  function getRandomRoleColor(index) {
    const colors = ['#003882', '#009CD7', '#EA5B0C', '#10B981', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];
    return colors[index % colors.length];
  }

  // -------------------------------------------------------------
  // GESTION DES SOUS-ONGLETS
  // -------------------------------------------------------------
  function renderRaciTabs() {
    const nav = document.getElementById('raciNavTabs');
    if (!nav) return;

    const currentProc = getCurrentProcess();

    nav.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-main); padding:5px 12px; border-radius:8px; border:1px solid var(--border-color);">
            <span style="font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em;">Processus BPMN :</span>
            <select id="raciProcessSelector" class="srt" style="font-weight:700; font-size:13px; color:var(--brand-primary); background:transparent; border:none; cursor:pointer;" onchange="switchRaciProcess(this.value)">
              ${window.raciState.processes.map(p => `
                <option value="${p.id}" ${p.id === currentProc.id ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>
          </div>

          <div style="display:flex; gap:6px;">
            <button class="academy-nav-item ${window.raciState.activeSubTab === 'matrix' ? 'active' : ''}" onclick="switchRaciSubTab('matrix')">
              <span>📋 Matrice RACI Complète</span>
            </button>
            <button class="academy-nav-item ${window.raciState.activeSubTab === 'audit' ? 'active' : ''}" onclick="switchRaciSubTab('audit')">
              <span>⚠️ Diagnostic &amp; Anti-Patterns RACI</span>
              <span class="raci-alert-pill" id="raciIssuesCountBadge">${getRaciIssuesCount(currentProc)}</span>
            </button>
            <button class="academy-nav-item ${window.raciState.activeSubTab === 'roles' ? 'active' : ''}" onclick="switchRaciSubTab('roles')">
              <span>👥 Cartographie des Rôles &amp; Hand-offs</span>
            </button>
            <button class="academy-nav-item ${window.raciState.activeSubTab === 'export' ? 'active' : ''}" onclick="switchRaciSubTab('export')">
              <span>📑 Fiche Gouvernance &amp; Exports</span>
            </button>
          </div>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn-ghost" onclick="addNewRaciRoleModal()" style="padding:6px 12px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:5px;">
            <span>➕ Ajouter un Rôle</span>
          </button>
          <button class="btn-primary" onclick="exportRaciExcel()" style="padding:6px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span>📥 Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    `;
  }

  window.switchRaciProcess = function (procId) {
    window.raciState.selectedProcessId = procId;
    renderRaciTabs();
    renderRaciMain();
  };

  window.switchRaciSubTab = function (tab) {
    window.raciState.activeSubTab = tab;
    renderRaciTabs();
    renderRaciMain();
  };

  function getCurrentProcess() {
    return window.raciState.processes.find(p => p.id === window.raciState.selectedProcessId) || window.raciState.processes[0];
  }

  // -------------------------------------------------------------
  // RENDU PRINCIPAL DU MODULE
  // -------------------------------------------------------------
  function renderRaciMain() {
    const container = document.getElementById('raciContentArea');
    if (!container) return;

    const proc = getCurrentProcess();

    if (window.raciState.activeSubTab === 'matrix') {
      renderRaciMatrixView(container, proc);
    } else if (window.raciState.activeSubTab === 'audit') {
      renderRaciAuditView(container, proc);
    } else if (window.raciState.activeSubTab === 'roles') {
      renderRaciRolesView(container, proc);
    } else if (window.raciState.activeSubTab === 'export') {
      renderRaciExportView(container, proc);
    }
  }

  // -------------------------------------------------------------
  // 1. VUE MATRICE RACI COMPLÈTE (TABLEAU INTERACTIF)
  // -------------------------------------------------------------
  function renderRaciMatrixView(container, proc) {
    const roles = proc.roles || [];
    let tasks = proc.tasks || [];

    // Appliquer les filtres de recherche et type
    if (window.raciState.searchQuery) {
      const q = window.raciState.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }
    if (window.raciState.taskTypeFilter !== 'all') {
      tasks = tasks.filter(t => t.type === window.raciState.taskTypeFilter);
    }

    container.innerHTML = `
      <!-- En-tête informatif & Légende RACI -->
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:16px; margin-bottom:20px;">
        <div class="raci-info-card">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
            <span style="font-size:20px;">🏢</span>
            <div>
              <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--text-primary);">${proc.name}</h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">${proc.description}</p>
            </div>
          </div>
          <div style="display:flex; gap:20px; font-size:12px; color:var(--text-tertiary); margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color);">
            <span><strong>${roles.length}</strong> Rôles / Squads impliqués</span>
            <span><strong>${tasks.length}</strong> Activités BPMN</span>
            <span style="color:#009CD7; font-weight:600;">⚡ Cliquez sur n'importe quelle cellule pour modifier les attributions RACI</span>
          </div>
        </div>

        <!-- Légende RACI Bouygues Telecom -->
        <div class="raci-legend-card">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:8px; letter-spacing:0.04em;">Légende Gouvernance RACI</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11.5px;">
            <div class="legend-item"><span class="raci-badge raci-r">R</span> <span><strong>Responsible</strong> (Réalise)</span></div>
            <div class="legend-item"><span class="raci-badge raci-a">A</span> <span><strong>Accountable</strong> (Valide 1 seul)</span></div>
            <div class="legend-item"><span class="raci-badge raci-c">C</span> <span><strong>Consulted</strong> (Conseille)</span></div>
            <div class="legend-item"><span class="raci-badge raci-i">I</span> <span><strong>Informed</strong> (Informé)</span></div>
          </div>
        </div>
      </div>

      <!-- Barre de filtres et recherche -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); margin-bottom:16px; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:240px;">
          <input type="text" placeholder="Filtrer une tâche BPMN..." value="${window.raciState.searchQuery}" oninput="handleRaciSearch(this.value)"
            style="width:100%; max-width:320px; padding:6px 12px; font-size:12.5px; border-radius:7px; border:1px solid var(--border-color); background:var(--bg-main);">
          
          <select class="srt" style="font-size:12px; padding:6px 10px;" onchange="handleRaciTypeFilter(this.value)">
            <option value="all" ${window.raciState.taskTypeFilter === 'all' ? 'selected' : ''}>Toutes les typologies</option>
            <option value="bpmn:userTask" ${window.raciState.taskTypeFilter === 'bpmn:userTask' ? 'selected' : ''}>👤 User Task (Tâche Utilisateur)</option>
            <option value="bpmn:serviceTask" ${window.raciState.taskTypeFilter === 'bpmn:serviceTask' ? 'selected' : ''}>⚙️ Service Task (Automatisée)</option>
            <option value="bpmn:manualTask" ${window.raciState.taskTypeFilter === 'bpmn:manualTask' ? 'selected' : ''}>🛠️ Manual Task (Intervention)</option>
            <option value="bpmn:businessRuleTask" ${window.raciState.taskTypeFilter === 'bpmn:businessRuleTask' ? 'selected' : ''}>📐 Business Rule (DMN)</option>
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-ghost" onclick="addNewRaciTaskModal()" style="padding:6px 12px; font-size:12px; font-weight:700;">
            <span>➕ Ajouter une Tâche</span>
          </button>
        </div>
      </div>

      <!-- Tableau Matrice RACI Dynamique -->
      <div class="raci-table-wrapper">
        <table class="raci-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">#</th>
              <th style="min-width:260px;">Activité BPMN / Tâche Métier</th>
              <th style="width:130px;">Typologie BPMN</th>
              <th style="width:180px;">Couloir / Lane Principal</th>
              ${roles.map(r => `
                <th style="text-align:center; min-width:110px;" title="${r.name} (${r.squad})">
                  <div style="font-size:12px; font-weight:700; color:${r.color}; display:flex; align-items:center; justify-content:center; gap:4px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:${r.color};"></span>
                    <span>${r.name}</span>
                  </div>
                  <div style="font-size:10px; font-weight:500; color:var(--text-tertiary); margin-top:2px;">${r.squad}</div>
                </th>
              `).join('')}
              <th style="width:90px; text-align:center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map((t, idx) => {
              const issues = validateTaskRaci(t, roles);
              const hasIssues = issues.length > 0;
              return `
                <tr class="${hasIssues ? 'raci-row-warning' : ''}">
                  <td style="text-align:center; font-weight:700; color:var(--text-tertiary);">${idx + 1}</td>
                  <td>
                    <div style="font-weight:700; color:var(--text-primary); font-size:13px;">${t.name}</div>
                    <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${t.description || ''}</div>
                  </td>
                  <td>
                    <span class="bpmn-type-badge">${formatBpmnType(t.type)}</span>
                  </td>
                  <td>
                    <span style="font-size:12px; color:var(--text-secondary); font-weight:500;">${t.lane}</span>
                  </td>
                  ${roles.map(r => {
                    const val = (t.raci && t.raci[r.id]) || '';
                    const isAccountable = t.accountable === r.id;
                    return `
                      <td style="text-align:center;" onclick="toggleRaciCell('${proc.id}', '${t.id}', '${r.id}')" title="Cliquer pour changer l'attribution de ${r.name}">
                        <div class="raci-cell-btn">
                          ${renderRaciCellBadge(val, isAccountable)}
                        </div>
                      </td>
                    `;
                  }).join('')}
                  <td style="text-align:center;">
                    ${hasIssues ? `
                      <span class="raci-status-pill warning" title="${issues.join(' | ')}">⚠️ Anomaly</span>
                    ` : `
                      <span class="raci-status-pill valid" title="Conforme aux règles de gouvernance RACI">✓ Valid</span>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRaciCellBadge(val, isAccountable) {
    if (!val && !isAccountable) {
      return `<span class="raci-badge raci-empty">•</span>`;
    }
    const badges = [];
    if (val.includes('R')) badges.push(`<span class="raci-badge raci-r">R</span>`);
    if (val.includes('A') || isAccountable) badges.push(`<span class="raci-badge raci-a">A</span>`);
    if (val.includes('C')) badges.push(`<span class="raci-badge raci-c">C</span>`);
    if (val.includes('I')) badges.push(`<span class="raci-badge raci-i">I</span>`);
    return `<div style="display:flex; justify-content:center; gap:2px;">${badges.join('')}</div>`;
  }

  function formatBpmnType(type) {
    const map = {
      'bpmn:userTask': '👤 User Task',
      'bpmn:serviceTask': '⚙️ Service Task',
      'bpmn:manualTask': '🛠️ Manual Task',
      'bpmn:businessRuleTask': '📐 Business Rule',
      'bpmn:scriptTask': '📜 Script Task',
      'bpmn:callActivity': '🔄 Call Activity',
      'bpmn:sendTask': '📤 Send Task',
      'bpmn:receiveTask': '📥 Receive Task'
    };
    return map[type] || '📌 Activité';
  }

  window.handleRaciSearch = function (q) {
    window.raciState.searchQuery = q;
    renderRaciMain();
  };

  window.handleRaciTypeFilter = function (type) {
    window.raciState.taskTypeFilter = type;
    renderRaciMain();
  };

  // Bascule cyclique de la valeur RACI lors du clic : '' -> 'R' -> 'A' -> 'C' -> 'I' -> 'RA' -> ''
  window.toggleRaciCell = function (procId, taskId, roleId) {
    const proc = window.raciState.processes.find(p => p.id === procId);
    if (!proc) return;
    const task = proc.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.raci) task.raci = {};
    const current = task.raci[roleId] || '';

    const cycle = ['', 'R', 'A', 'C', 'I', 'RA'];
    const currentIdx = cycle.indexOf(current);
    const nextVal = cycle[(currentIdx + 1) % cycle.length];

    task.raci[roleId] = nextVal;

    // Si on attribue 'A', mettre à jour accountable
    if (nextVal.includes('A')) {
      task.accountable = roleId;
    } else if (task.accountable === roleId && !nextVal.includes('A')) {
      // Rechercher s'il y a un autre A
      const otherA = Object.keys(task.raci).find(k => task.raci[k].includes('A'));
      task.accountable = otherA || '';
    }

    renderRaciTabs();
    renderRaciMain();
  };

  // -------------------------------------------------------------
  // 2. VUE DIAGNOSTIC & ANTI-PATTERNS RACI (GOUVERNANCE)
  // -------------------------------------------------------------
  function renderRaciAuditView(container, proc) {
    const roles = proc.roles || [];
    const tasks = proc.tasks || [];

    const issues = {
      noResponsible: [],
      noAccountable: [],
      multipleAccountable: [],
      overloadedRoles: [],
      unassignedServiceTasks: []
    };

    // Calculer la charge par rôle (nombre de 'R')
    const roleRCounts = {};
    roles.forEach(r => { roleRCounts[r.id] = 0; });

    tasks.forEach(t => {
      const rList = Object.keys(t.raci || {}).filter(k => t.raci[k].includes('R'));
      const aList = Object.keys(t.raci || {}).filter(k => t.raci[k].includes('A') || t.accountable === k);

      rList.forEach(k => {
        if (roleRCounts[k] !== undefined) roleRCounts[k]++;
      });

      if (rList.length === 0) {
        issues.noResponsible.push(t);
      }
      if (aList.length === 0) {
        issues.noAccountable.push(t);
      }
      if (aList.length > 1) {
        issues.multipleAccountable.push(t);
      }
      if (t.type === 'bpmn:serviceTask' && aList.length === 0) {
        issues.unassignedServiceTasks.push(t);
      }
    });

    // Rôles concentrant > 45% des tâches
    roles.forEach(r => {
      const count = roleRCounts[r.id] || 0;
      if (tasks.length > 3 && (count / tasks.length) > 0.45) {
        issues.overloadedRoles.push({ role: r, count, pct: Math.round((count / tasks.length) * 100) });
      }
    });

    const totalIssues = issues.noResponsible.length + issues.noAccountable.length + issues.multipleAccountable.length + issues.overloadedRoles.length;
    const governanceScore = Math.max(0, Math.round(100 - (totalIssues * 15)));

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 280px 1fr; gap:20px; margin-bottom:24px;">
        <!-- Score de Gouvernance Organisationnelle -->
        <div class="raci-score-card">
          <div style="font-size:12px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.04em;">Score de Conformité RACI</div>
          <div class="raci-score-circle ${governanceScore >= 80 ? 'good' : governanceScore >= 60 ? 'medium' : 'bad'}">
            <span>${governanceScore}</span>
            <small>/100</small>
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-top:8px;">
            ${governanceScore >= 80 ? 'Excellente Clarté Organisationnelle' : governanceScore >= 60 ? 'Conformité RACI Moyenne' : 'Ambiguïtés & Risques de Gouvernance'}
          </div>
          <p style="font-size:11.5px; color:var(--text-secondary); margin:6px 0 0;">
            ${totalIssues === 0 ? 'Toutes les activités ont un responsable unique et une imputabilité définie.' : `${totalIssues} anomalie(s) détectée(s) pouvant créer des blocages opérationnels.`}
          </p>
        </div>

        <!-- Synthèse des Règles Métier Auditées -->
        <div class="raci-rules-summary">
          <h4 style="margin:0 0 12px; font-size:14px; font-weight:700; color:var(--text-primary);">Règles de Gouvernance Bouygues Telecom Auditées :</h4>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px;">
            <div class="raci-rule-badge ${issues.noResponsible.length === 0 ? 'pass' : 'fail'}">
              <span>${issues.noResponsible.length === 0 ? '✅' : '❌'}</span>
              <span><strong>Unicité / Présence de Réalisateur (R) :</strong> ${issues.noResponsible.length} tâche(s) orpheline(s)</span>
            </div>
            <div class="raci-rule-badge ${issues.noAccountable.length === 0 ? 'pass' : 'fail'}">
              <span>${issues.noAccountable.length === 0 ? '✅' : '❌'}</span>
              <span><strong>Imputabilité Définie (A) :</strong> ${issues.noAccountable.length} tâche(s) sans validation</span>
            </div>
            <div class="raci-rule-badge ${issues.multipleAccountable.length === 0 ? 'pass' : 'fail'}">
              <span>${issues.multipleAccountable.length === 0 ? '✅' : '❌'}</span>
              <span><strong>Autorité Non Diluée (Max 1 'A') :</strong> ${issues.multipleAccountable.length} conflit(s) d'autorité</span>
            </div>
            <div class="raci-rule-badge ${issues.overloadedRoles.length === 0 ? 'pass' : 'fail'}">
              <span>${issues.overloadedRoles.length === 0 ? '✅' : '❌'}</span>
              <span><strong>Équilibrage de Charge (Surcharge) :</strong> ${issues.overloadedRoles.length} rôle(s) sous tension</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Détail des Anomalies & Auto-Fix -->
      <div style="display:flex; flex-direction:column; gap:14px;">
        <!-- 1. Tâches sans R -->
        ${issues.noResponsible.length > 0 ? `
          <div class="raci-issue-item critical">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🔴</span>
                <strong style="color:#b91c1c; font-size:13px;">Tâches orphelines sans exécutant désigné (Aucun 'R') :</strong>
              </div>
              <span class="raci-badge-count red">${issues.noResponsible.length}</span>
            </div>
            <p style="font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">Ces activités ne sont assignées à aucun rôle ou couloir. Risque de rupture de traitement.</p>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${issues.noResponsible.map(t => `
                <div class="raci-issue-row">
                  <span><strong>${t.name}</strong> (${formatBpmnType(t.type)}) — Couloir : <em>${t.lane}</em></span>
                  <button class="btn-primary" onclick="autoFixAssignResponsible('${proc.id}', '${t.id}')" style="padding:4px 10px; font-size:11px; font-weight:700;">
                    ⚡ Assigner au couloir "${t.lane}"
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 2. Tâches avec A multiple -->
        ${issues.multipleAccountable.length > 0 ? `
          <div class="raci-issue-item warning">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🟠</span>
                <strong style="color:#c2410c; font-size:13px;">Dilution de responsabilité (Plusieurs 'A' sur la même tâche) :</strong>
              </div>
              <span class="raci-badge-count orange">${issues.multipleAccountable.length}</span>
            </div>
            <p style="font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">Selon les règles RACI, une et une seule personne/rôle doit être <em>Accountable</em> pour éviter les litiges d'arbitrage.</p>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${issues.multipleAccountable.map(t => `
                <div class="raci-issue-row">
                  <span><strong>${t.name}</strong></span>
                  <button class="btn-ghost" onclick="autoFixSingleAccountable('${proc.id}', '${t.id}')" style="padding:4px 10px; font-size:11px; font-weight:700;">
                    ⚡ Conserver 1 seul A
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3. Rôles en surcharge -->
        ${issues.overloadedRoles.length > 0 ? `
          <div class="raci-issue-item info">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🔵</span>
                <strong style="color:#1d4ed8; font-size:13px;">Concentration excessive de charge opérationnelle (Rôle goulot d'étranglement) :</strong>
              </div>
              <span class="raci-badge-count blue">${issues.overloadedRoles.length}</span>
            </div>
            <p style="font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">Ces rôles exécutent une part disproportionnée du processus, constituant un risque de congestion de SLA.</p>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${issues.overloadedRoles.map(o => `
                <div class="raci-issue-row">
                  <span><strong>${o.role.name}</strong> (${o.role.squad}) : exécute <strong>${o.count} tâches</strong> soit <strong>${o.pct}%</strong> du flux global.</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${totalIssues === 0 ? `
          <div class="raci-success-box">
            <span style="font-size:28px;">🎉</span>
            <div>
              <h4 style="margin:0; font-size:15px; font-weight:700; color:#15803d;">Modèle 100% Conforme aux Standards RACI Bouygues Telecom !</h4>
              <p style="margin:4px 0 0; font-size:12.5px; color:#166534;">Aucune ambiguïté d'attribution ni tâche orpheline n'a été détectée dans ce diagramme BPMN.</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function getRaciIssuesCount(proc) {
    if (!proc || !proc.tasks) return 0;
    let count = 0;
    proc.tasks.forEach(t => {
      const r = Object.keys(t.raci || {}).filter(k => t.raci[k].includes('R'));
      const a = Object.keys(t.raci || {}).filter(k => t.raci[k].includes('A') || t.accountable === k);
      if (r.length === 0) count++;
      if (a.length === 0 || a.length > 1) count++;
    });
    return count;
  }

  function validateTaskRaci(task, roles) {
    const errors = [];
    const r = Object.keys(task.raci || {}).filter(k => task.raci[k].includes('R'));
    const a = Object.keys(task.raci || {}).filter(k => task.raci[k].includes('A') || task.accountable === k);
    if (r.length === 0) errors.push("Aucun rôle 'R' (Responsible)");
    if (a.length === 0) errors.push("Aucun rôle 'A' (Accountable)");
    if (a.length > 1) errors.push("Plusieurs rôles 'A' en conflit");
    return errors;
  }

  window.autoFixAssignResponsible = function (procId, taskId) {
    const proc = window.raciState.processes.find(p => p.id === procId);
    if (!proc) return;
    const task = proc.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Trouver le rôle correspondant au couloir (ou le premier rôle)
    let targetRole = proc.roles.find(r => r.name.toLowerCase() === (task.lane || '').toLowerCase());
    if (!targetRole) targetRole = proc.roles[0];

    if (targetRole) {
      if (!task.raci) task.raci = {};
      task.raci[targetRole.id] = 'R';
      if (!task.accountable) task.accountable = targetRole.id;
    }

    renderRaciTabs();
    renderRaciMain();
    if (typeof showToast === 'function') showToast(`Tâche assignée avec succès à "${targetRole.name}" !`, "success");
  };

  window.autoFixSingleAccountable = function (procId, taskId) {
    const proc = window.raciState.processes.find(p => p.id === procId);
    if (!proc) return;
    const task = proc.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Conserver seulement le premier rôle qui a A
    let firstA = null;
    Object.keys(task.raci || {}).forEach(k => {
      if (task.raci[k].includes('A')) {
        if (!firstA) {
          firstA = k;
        } else {
          task.raci[k] = task.raci[k].replace('A', '');
        }
      }
    });

    task.accountable = firstA || '';
    renderRaciTabs();
    renderRaciMain();
    if (typeof showToast === 'function') showToast("Conflit d'autorité résolu : 1 seul Accountable conservé.", "info");
  };

  // -------------------------------------------------------------
  // 3. VUE CARTOGRAPHIE DES RÔLES & HAND-OFFS (FLUX INTER-ÉQUIPES)
  // -------------------------------------------------------------
  function renderRaciRolesView(container, proc) {
    const roles = proc.roles || [];
    const tasks = proc.tasks || [];

    // 1. Calcul des statistiques par rôle
    const stats = roles.map(r => {
      let countR = 0, countA = 0, countC = 0, countI = 0;
      tasks.forEach(t => {
        const val = (t.raci && t.raci[r.id]) || '';
        if (val.includes('R')) countR++;
        if (val.includes('A') || t.accountable === r.id) countA++;
        if (val.includes('C')) countC++;
        if (val.includes('I')) countI++;
      });
      const totalInvolved = countR + countA + countC + countI;
      const pctR = tasks.length ? Math.round((countR / tasks.length) * 100) : 0;
      return { role: r, countR, countA, countC, countI, totalInvolved, pctR };
    });

    // 2. Calcul des transitions consécutives (Hand-offs)
    const handoffs = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      const curr = tasks[i];
      const next = tasks[i + 1];
      const fromRole = roles.find(r => (curr.raci && curr.raci[r.id] && curr.raci[r.id].includes('R')) || curr.accountable === r.id);
      const toRole = roles.find(r => (next.raci && next.raci[r.id] && next.raci[r.id].includes('R')) || next.accountable === r.id);

      if (fromRole && toRole && fromRole.id !== toRole.id) {
        handoffs.push({
          step: i + 1,
          from: fromRole,
          to: toRole,
          fromTask: curr.name,
          toTask: next.name
        });
      }
    }

    container.innerHTML = `
      <!-- Répartition de la charge opérationnelle (Responsible) -->
      <div style="background:#ffffff; border-radius:12px; border:1px solid var(--border-color); padding:18px; margin-bottom:20px;">
        <h3 style="margin:0 0 6px; font-size:15px; font-weight:700; color:var(--text-primary);">📊 Répartition de la Charge Opérationnelle par Rôle (R)</h3>
        <p style="margin:0 0 16px; font-size:12px; color:var(--text-secondary);">Visualisez la proportion d'activités exécutées par chaque équipe dans le processus.</p>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
          ${stats.map(s => `
            <div class="raci-role-card" style="border-left: 4px solid ${s.role.color};">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                  <strong style="font-size:13px; color:var(--text-primary);">${s.role.name}</strong>
                  <div style="font-size:11px; color:var(--text-tertiary);">${s.role.squad} • ${s.role.type}</div>
                </div>
                <span style="font-size:13px; font-weight:800; color:${s.role.color};">${s.pctR}%</span>
              </div>

              <!-- Barre de progression -->
              <div class="raci-progress-track">
                <div class="raci-progress-fill" style="width:${s.pctR}%; background:${s.role.color};"></div>
              </div>

              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-top:8px;">
                <span><strong>${s.countR}</strong> Exécutions (R)</span>
                <span><strong>${s.countA}</strong> Arbitrages (A)</span>
                <span><strong>${s.countC}</strong> Consultations (C)</span>
                <span><strong>${s.countI}</strong> Notifs (I)</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Analyse des Hand-offs & Changements de Couloirs -->
      <div style="background:#ffffff; border-radius:12px; border:1px solid var(--border-color); padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--text-primary);">🔄 Cartographie des Hand-offs (Changements d'Équipes)</h3>
            <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">Chaque transition entre rôles représente un point de contact et un risque potentiel de latence SLA.</p>
          </div>
          <span style="background:rgba(0,156,215,0.1); color:#009CD7; font-weight:700; font-size:12px; padding:4px 10px; border-radius:8px;">
            ${handoffs.length} Hand-offs inter-équipes
          </span>
        </div>

        <div class="handoff-timeline">
          ${handoffs.map((h, i) => `
            <div class="handoff-item">
              <div class="handoff-step-badge">${i + 1}</div>
              <div class="handoff-content">
                <div style="display:flex; align-items:center; gap:8px; font-size:12.5px;">
                  <strong style="color:${h.from.color};">${h.from.name}</strong>
                  <span style="color:var(--text-tertiary);">➔</span>
                  <strong style="color:${h.to.color};">${h.to.name}</strong>
                </div>
                <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">
                  Transition de : <em>"${h.fromTask}"</em> vers <em>"${h.toTask}"</em>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 4. VUE FICHE GOUVERNANCE & EXPORTS (EXCEL, CSV, MARKDOWN)
  // -------------------------------------------------------------
  function renderRaciExportView(container, proc) {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:20px;">
        <!-- Aperçu de la Fiche de Gouvernance -->
        <div class="raci-export-preview-card">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid var(--brand-primary); padding-bottom:12px; margin-bottom:16px;">
            <div>
              <div style="font-size:11px; font-weight:700; color:#009CD7; text-transform:uppercase; letter-spacing:0.05em;">BOUYGUES TELECOM • DIRECTION DE LA TRANSFORMATION &amp; PROCESSUS</div>
              <h2 style="margin:2px 0 0; font-size:18px; color:var(--brand-primary);">Fiche de Gouvernance &amp; Matrice RACI Métier</h2>
            </div>
            <img src="img/bouygues_telecom_logo.png" alt="Bouygues Telecom" style="height:38px;">
          </div>

          <div style="margin-bottom:16px; font-size:12.5px; line-height:1.5;">
            <p><strong>Processus Référentiel :</strong> ${proc.name}</p>
            <p><strong>Périmètre :</strong> ${proc.description}</p>
            <p><strong>Date d'Audit :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          </div>

          <!-- Tableau Synthétique -->
          <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:16px;">
            <thead>
              <tr style="background:#f1f5f9; border-bottom:1px solid var(--border-color);">
                <th style="padding:6px 8px; text-align:left;">Tâche BPMN</th>
                <th style="padding:6px 8px; text-align:left;">Responsible (R)</th>
                <th style="padding:6px 8px; text-align:left;">Accountable (A)</th>
                <th style="padding:6px 8px; text-align:left;">Consulted (C)</th>
                <th style="padding:6px 8px; text-align:left;">Informed (I)</th>
              </tr>
            </thead>
            <tbody>
              ${proc.tasks.map(t => {
                const getRoleNames = (letter) => proc.roles.filter(r => (t.raci && t.raci[r.id] && t.raci[r.id].includes(letter)) || (letter === 'A' && t.accountable === r.id)).map(r => r.name).join(', ') || '-';
                return `
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:6px 8px; font-weight:600;">${t.name}</td>
                    <td style="padding:6px 8px; color:#009cd7; font-weight:600;">${getRoleNames('R')}</td>
                    <td style="padding:6px 8px; color:#003882; font-weight:700;">${getRoleNames('A')}</td>
                    <td style="padding:6px 8px; color:#ea5b0c;">${getRoleNames('C')}</td>
                    <td style="padding:6px 8px; color:#6366f1;">${getRoleNames('I')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Panneau d'Actions d'Export -->
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:#ffffff; border-radius:12px; border:1px solid var(--border-color); padding:16px;">
            <h4 style="margin:0 0 10px; font-size:14px; font-weight:700; color:var(--text-primary);">📥 Formats d'Export Disponibles</h4>
            
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn-primary" onclick="exportRaciExcel()" style="width:100%; justify-content:center; padding:10px; font-weight:700; gap:8px;">
                <span>📗 Exporter sous Excel (.xlsx)</span>
              </button>
              <button class="btn-ghost" onclick="exportRaciMarkdown()" style="width:100%; justify-content:center; padding:10px; font-weight:700; gap:8px;">
                <span>📝 Exporter Spécification (Markdown)</span>
              </button>
              <button class="btn-ghost" onclick="exportRaciJSON()" style="width:100%; justify-content:center; padding:10px; font-weight:700; gap:8px;">
                <span>💾 Exporter Fichier JSON</span>
              </button>
              <button class="btn-ghost" onclick="window.print()" style="width:100%; justify-content:center; padding:10px; font-weight:700; gap:8px;">
                <span>🖨️ Imprimer la Fiche RACI</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // EXPORTS EXCEL, MARKDOWN & JSON
  // -------------------------------------------------------------
  window.exportRaciExcel = function () {
    const proc = getCurrentProcess();
    if (typeof XLSX === 'undefined') {
      alert("Bibliothèque XLSX non disponible pour l'export.");
      return;
    }

    const data = [];
    // En-tête
    const header = ['ID Tâche', 'Nom de l\'Activité BPMN', 'Typologie', 'Couloir / Lane', 'Accountable (A)'];
    proc.roles.forEach(r => header.push(`${r.name} (${r.squad})`));
    data.push(header);

    // Lignes
    proc.tasks.forEach(t => {
      const accRole = proc.roles.find(r => r.id === t.accountable);
      const row = [t.id, t.name, t.type, t.lane, accRole ? accRole.name : 'Non défini'];
      proc.roles.forEach(r => {
        row.push((t.raci && t.raci[r.id]) || '');
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrice RACI");

    const fileName = `RACI_${proc.name.replace(/[^a-zA-Z0-9]/g, '_')}_BouyguesTel.xlsx`;
    XLSX.writeFile(wb, fileName);
    if (typeof showToast === 'function') showToast(`Export Excel "${fileName}" téléchargé avec succès !`, "success");
  };

  window.exportRaciMarkdown = function () {
    const proc = getCurrentProcess();
    let md = `# Fiche de Gouvernance RACI — ${proc.name}\n\n`;
    md += `*Généré par Paprika AuditFlow Pro pour Bouygues Telecom le ${new Date().toLocaleDateString('fr-FR')}*\n\n`;
    md += `## Périmètre du Processus\n${proc.description}\n\n`;
    md += `## Matrice RACI\n\n`;
    md += `| Activité BPMN | Couloir (Lane) | Type | ${proc.roles.map(r => r.name).join(' | ')} |\n`;
    md += `|---|---|---|${proc.roles.map(() => '---').join('|')}|\n`;

    proc.tasks.forEach(t => {
      const cells = proc.roles.map(r => (t.raci && t.raci[r.id]) || '-');
      md += `| **${t.name}** | ${t.lane} | \`${t.type}\` | ${cells.join(' | ')} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RACI_${proc.id}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast("Spécification Markdown RACI exportée !", "success");
  };

  window.exportRaciJSON = function () {
    const proc = getCurrentProcess();
    const dataStr = JSON.stringify(proc, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RACI_${proc.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast("Données RACI exportées en JSON !", "success");
  };

  // -------------------------------------------------------------
  // MODALES D'AJOUT DE RÔLE & TÂCHE
  // -------------------------------------------------------------
  window.addNewRaciRoleModal = function () {
    const name = prompt("Nom du nouveau Rôle / Acteur (ex: 'Conseiller SAV Bbox', 'Expert Sécurité') :");
    if (!name) return;
    const squad = prompt("Tribu / Squad de rattachement (ex: 'Tribu Bbox & Fixe') :", "Tribu Bouygues Telecom") || "Tribu Générale";

    const proc = getCurrentProcess();
    const newId = 'role_' + name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    proc.roles.push({
      id: newId,
      name: name,
      squad: squad,
      type: 'Opérationnel / Humain',
      color: getRandomRoleColor(proc.roles.length)
    });

    renderRaciTabs();
    renderRaciMain();
    if (typeof showToast === 'function') showToast(`Rôle "${name}" ajouté au référentiel RACI !`, "success");
  };

  window.addNewRaciTaskModal = function () {
    const name = prompt("Nom de la nouvelle Tâche / Activité BPMN (ex: 'Valider les pièces justificatives') :");
    if (!name) return;
    const lane = prompt("Couloir / Lane principal :", "Conseiller Clientèle") || "Général";

    const proc = getCurrentProcess();
    const newId = 'task_' + Math.random().toString(36).substr(2, 6);
    const newTask = {
      id: newId,
      name: name,
      type: 'bpmn:userTask',
      lane: lane,
      description: 'Activité ajoutée manuellement à la matrice RACI.',
      raci: {},
      accountable: ''
    };

    proc.tasks.push(newTask);
    renderRaciTabs();
    renderRaciMain();
    if (typeof showToast === 'function') showToast(`Tâche "${name}" ajoutée !`, "success");
  };

})();
