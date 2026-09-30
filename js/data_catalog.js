/**
 * PAPRIKA AUDITFLOW PRO - DICTIONNAIRE D'ENTREPRISE & CATALOGUE DE DONNÉES (DATA CATALOG BPMN)
 * Module de Gouvernance des Données Télécom pour Bouygues Telecom
 */

(function () {
  'use strict';

  // 1. RÉFÉRENTIEL CENTRAL PAR DÉFAUT (DONNÉES TÉLÉCOM BOUYGUES TELECOM)
  const DEFAULT_TELECOM_CATALOG = [
    {
      id: 'var_msisdn',
      name: 'msisdn',
      label: 'Numéro de Ligne Mobile (MSISDN)',
      tribu: 'Tribu Mobile & Forfaits',
      squad: 'Squad SIM & Lignes',
      owner: 'jean.dupont@bouyguestelecom.fr',
      type: 'string',
      pattern: '^0[67][0-9]{8}$',
      example: '0612345678',
      sensitivity: 'RGPD / Donnée Personnelle',
      status: 'Validé',
      description: 'Numéro de téléphone mobile à 10 chiffres (format national français débutant par 06 ou 07).'
    },
    {
      id: 'var_imsi',
      name: 'imsi',
      label: 'Identifiant International d\'Abonné (IMSI)',
      tribu: 'Tribu Réseau & Cartes SIM',
      squad: 'Squad Provisioning SIM',
      owner: 'squad-sim@bouyguestelecom.fr',
      type: 'string',
      pattern: '^[0-9]{15}$',
      example: '208201234567890',
      sensitivity: 'Confidentiel Réseau',
      status: 'Validé',
      description: 'Numéro unique à 15 chiffres gravé sur la carte SIM pour l\'authentification sur le réseau GSM/4G/5G.'
    },
    {
      id: 'var_idClientBbox',
      name: 'idClientBbox',
      label: 'Identifiant Contrat / Client Bbox',
      tribu: 'Tribu Bbox & Fixe',
      squad: 'Squad Souscription Bbox',
      owner: 'bbox-core@bouyguestelecom.fr',
      type: 'string',
      pattern: '^BBX-[0-9]{7,10}$',
      example: 'BBX-8492019',
      sensitivity: 'Donnée Client',
      status: 'Validé',
      description: 'Identifiant métier unique du contrat Bbox (Fibre ou ADSL).'
    },
    {
      id: 'var_offreSouscrite',
      name: 'offreSouscrite',
      label: 'Code Offre Commerciale',
      tribu: 'Tribu Catalogue & Offres',
      squad: 'Squad Tarifs & Bundles',
      owner: 'marketing-offers@bouyguestelecom.fr',
      type: 'enum',
      allowedValues: ['BBOX_FIT', 'BBOX_MUST', 'BBOX_ULTYM', 'FORFAIT_B_AND_YOU_20G', 'FORFAIT_5G_130G'],
      pattern: '',
      example: 'BBOX_ULTYM',
      sensitivity: 'Interne',
      status: 'Validé',
      description: 'Code technique de l\'offre commerciale souscrite par le client.'
    },
    {
      id: 'var_statutEligibiliteFibre',
      name: 'statutEligibiliteFibre',
      label: 'Statut d\'Éligibilité FTTH',
      tribu: 'Tribu Réseau & Fibre',
      squad: 'Squad Éligibilité & Adresses',
      owner: 'ftth-eligibility@bouyguestelecom.fr',
      type: 'enum',
      allowedValues: ['ELIGIBLE_FTTH', 'ELIGIBLE_ADSL_ONLY', 'ZONE_EN_COURS_DEPLOIEMENT', 'NON_ELIGIBLE'],
      pattern: '',
      example: 'ELIGIBLE_FTTH',
      sensitivity: 'Interne',
      status: 'Validé',
      description: 'Résultat du test d\'éligibilité technique de l\'adresse client pour le raccordement optique.'
    },
    {
      id: 'var_ptoId',
      name: 'ptoId',
      label: 'Numéro de Prise Terminale Optique (PTO)',
      tribu: 'Tribu Réseau & Fibre',
      squad: 'Squad Déploiement Terrain',
      owner: 'ftth-infra@bouyguestelecom.fr',
      type: 'string',
      pattern: '^FI-[0-9]{4}-[0-9]{4}$',
      example: 'FI-4820-9182',
      sensitivity: 'Technique Réseau',
      status: 'Validé',
      description: 'Référence normalisée ARCEP du boîtier optique mural installé dans le logement client.'
    },
    {
      id: 'var_ibanClient',
      name: 'ibanClient',
      label: 'IBAN Client pour Prélèvement SEPA',
      tribu: 'Tribu Facturation & Paiement',
      squad: 'Squad Encaissement & Mandats',
      owner: 'billing-squad@bouyguestelecom.fr',
      type: 'string',
      pattern: '^FR[0-9]{2}[A-Z0-9]{23}$',
      example: 'FR7630004000031234567890143',
      sensitivity: 'Critique / Donnée Bancaire (PCI/RGPD)',
      status: 'Validé',
      description: 'Coordonnées bancaires pour la mise en place du mandat de prélèvement automatique.'
    },
    {
      id: 'var_numeroCommande',
      name: 'numeroCommande',
      label: 'Numéro de Commande Omnicanale',
      tribu: 'Tribu Commande & Logistique',
      squad: 'Squad Order Management',
      owner: 'oms-lead@bouyguestelecom.fr',
      type: 'string',
      pattern: '^CMD-[0-9]{4}-[0-9]{8}$',
      example: 'CMD-2026-09482711',
      sensitivity: 'Donnée Client',
      status: 'Validé',
      description: 'Identifiant pivot de la commande client transmise à l\'orchestrateur BPMN.'
    },
    {
      id: 'var_statutPortabiliteRIO',
      name: 'statutPortabiliteRIO',
      label: 'Statut de la Portabilité Numéro (RIO)',
      tribu: 'Tribu Mobile & Forfaits',
      squad: 'Squad Portabilité & GIE EGP',
      owner: 'portability@bouyguestelecom.fr',
      type: 'enum',
      allowedValues: ['VALIDE', 'RIO_INVALIDE', 'DATE_DIFFÉRÉE', 'REJET_OPERATEUR_DONNEUR', 'EN_COURS'],
      pattern: '',
      example: 'VALIDE',
      sensitivity: 'Interne',
      status: 'Validé',
      description: 'État du traitement de la portabilité du numéro mobile ou fixe auprès du serveur central GIE EGP.'
    },
    {
      id: 'var_codePromo',
      name: 'codePromo',
      label: 'Code Coupon Promotionnel (Ancien Système)',
      tribu: 'Tribu Marketing',
      squad: 'Squad Fidélité',
      owner: 'marketing@bouyguestelecom.fr',
      type: 'string',
      pattern: '^[A-Z0-9_]{3,12}$',
      example: 'PROMO_FIBRE_2026',
      sensitivity: 'Public',
      status: 'Déprécié',
      description: '⚠️ Déprécié : Utiliser le nouveau format standardisé « discountPayload » avec le moteur DMN.'
    }
  ];

  // Store en mémoire
  window.enterpriseDataCatalog = [...DEFAULT_TELECOM_CATALOG];

  let currentCatalogFilter = {
    tribu: 'all',
    type: 'all',
    status: 'all',
    search: '',
    tab: 'catalog' // 'catalog' ou 'audit'
  };

  // -------------------------------------------------------------
  // INITIALISATION DU MODULE
  // -------------------------------------------------------------
  window.initDataCatalogModule = function () {
    renderDataCatalogTabs();
    renderDataCatalogMain();
  };

  // -------------------------------------------------------------
  // NAVIGATION DES SOUS-ONGLETS
  // -------------------------------------------------------------
  function renderDataCatalogTabs() {
    const navContainer = document.getElementById('dataCatalogNavTabs');
    if (!navContainer) return;

    navContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:22px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:10px;">
          <button class="academy-nav-item ${currentCatalogFilter.tab === 'catalog' ? 'active' : ''}" onclick="switchDataCatalogTab('catalog')">
            <span>📖 Dictionnaire &amp; Schémas des Variables</span>
          </button>
          <button class="academy-nav-item ${currentCatalogFilter.tab === 'audit' ? 'active' : ''}" onclick="switchDataCatalogTab('audit')">
            <span>🔍 Audit BPMN vs Référentiel Central</span>
          </button>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-ghost" onclick="exportDataCatalogJSON()" style="padding:6px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span>📤 Exporter Catalogue (JSON)</span>
          </button>
          <button class="btn-primary" onclick="openAddVariableModal()" style="padding:6px 16px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span>➕ Déclarer une Variable</span>
          </button>
        </div>
      </div>
    `;
  }

  window.switchDataCatalogTab = function (tabName) {
    currentCatalogFilter.tab = tabName;
    renderDataCatalogTabs();
    renderDataCatalogMain();
  };

  // -------------------------------------------------------------
  // VUE PRINCIPALE
  // -------------------------------------------------------------
  function renderDataCatalogMain() {
    const container = document.getElementById('dataCatalogContentArea');
    if (!container) return;

    if (currentCatalogFilter.tab === 'catalog') {
      renderCatalogDictionaryView(container);
    } else {
      renderCatalogAuditView(container);
    }
  }

  // -------------------------------------------------------------
  // VUE 1 : DICTIONNAIRE & CONTRATS DE DONNÉES
  // -------------------------------------------------------------
  function renderCatalogDictionaryView(container) {
    // Collecter les tribus uniques
    const tribus = Array.from(new Set(window.enterpriseDataCatalog.map(x => x.tribu))).sort();

    // Filtrer les variables
    const filtered = window.enterpriseDataCatalog.filter(item => {
      const matchTribu = currentCatalogFilter.tribu === 'all' || item.tribu === currentCatalogFilter.tribu;
      const matchStatus = currentCatalogFilter.status === 'all' || item.status === currentCatalogFilter.status;
      const matchType = currentCatalogFilter.type === 'all' || item.type === currentCatalogFilter.type;
      const matchSearch = !currentCatalogFilter.search ||
        item.name.toLowerCase().includes(currentCatalogFilter.search.toLowerCase()) ||
        item.label.toLowerCase().includes(currentCatalogFilter.search.toLowerCase()) ||
        item.description.toLowerCase().includes(currentCatalogFilter.search.toLowerCase()) ||
        item.squad.toLowerCase().includes(currentCatalogFilter.search.toLowerCase());
      return matchTribu && matchStatus && matchType && matchSearch;
    });

    let tribusOptions = tribus.map(t => `<option value="${t}" ${currentCatalogFilter.tribu === t ? 'selected' : ''}>${t}</option>`).join('');

    let rowsHtml = filtered.map(v => {
      const statusBadge = v.status === 'Validé'
        ? '<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ Validé</span>'
        : (v.status === 'Déprécié'
          ? '<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.3);">⚠️ Déprécié</span>'
          : '<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.3);">Brouillon</span>');

      const sensColor = v.sensitivity.includes('Critique') || v.sensitivity.includes('RGPD') ? '#EA5B0C' : '#009CD7';

      return `
        <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s;" onmouseover="this.style.background='rgba(0,156,215,0.04)'" onmouseout="this.style.background='transparent'">
          <td style="padding:14px 16px;">
            <div style="font-family:JetBrains Mono, monospace; font-size:13px; font-weight:800; color:var(--brand-cyan, #009CD7);">${v.name}</div>
            <div style="font-size:12px; color:var(--text-color); font-weight:600; margin-top:2px;">${v.label}</div>
          </td>
          <td style="padding:14px 16px; font-size:12.5px;">
            <div style="font-weight:700; color:var(--text-color);">${v.tribu}</div>
            <div style="color:var(--text-muted); font-size:11.5px;">${v.squad}</div>
            <div style="color:var(--text-muted); font-size:11px; font-family:monospace; margin-top:2px;">✉️ ${v.owner}</div>
          </td>
          <td style="padding:14px 16px;">
            <span style="font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:var(--text-color); text-transform:uppercase;">
              ${v.type}
            </span>
            ${v.pattern ? `<div style="font-family:monospace; font-size:10.5px; color:#38bdf8; margin-top:4px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="Regex: ${v.pattern}">Regex: ${v.pattern}</div>` : ''}
            ${v.allowedValues ? `<div style="font-size:10.5px; color:var(--text-muted); margin-top:4px;">${v.allowedValues.length} valeurs autorisées</div>` : ''}
          </td>
          <td style="padding:14px 16px;">
            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:8px; background:${sensColor}18; color:${sensColor}; border:1px solid ${sensColor}40;">
              ${v.sensitivity}
            </span>
          </td>
          <td style="padding:14px 16px;">
            ${statusBadge}
          </td>
          <td style="padding:14px 16px; font-size:12px; color:var(--text-muted); max-width:260px; line-height:1.4;">
            ${v.description}
          </td>
          <td style="padding:14px 16px; text-align:right;">
            <div style="display:flex; justify-content:flex-end; gap:6px;">
              <button onclick="testVariablePatternModal('${v.id}')" class="btn-ghost" title="Tester la regex" style="padding:4px 8px; font-size:12px;">🧪</button>
              <button onclick="openEditVariableModal('${v.id}')" class="btn-ghost" title="Modifier" style="padding:4px 8px; font-size:12px;">✏️</button>
              <button onclick="deleteCatalogVariable('${v.id}')" class="btn-ghost" title="Supprimer" style="padding:4px 8px; font-size:12px; color:#EF4444;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <!-- En-tête & Filtres -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:20px 24px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">Référentiel des Données &amp; Contrats de Schémas</h2>
            <p style="font-size:13px; color:var(--text-muted); margin:0;">Catalogue centralisé des variables partagées entre les tribus Bouygues Telecom (Bbox, Mobile, Facturation, Réseau).</p>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="font-size:13px; font-weight:700; color:var(--text-color); background:rgba(0,156,215,0.08); padding:6px 14px; border-radius:10px; border:1px solid rgba(0,156,215,0.25);">
              Total : <span style="color:var(--brand-cyan);">${window.enterpriseDataCatalog.length}</span> variables référencées
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:12px;">
          <input type="text" placeholder="🔍 Rechercher par nom, libellé, description, squad..." value="${currentCatalogFilter.search}" oninput="handleCatalogSearch(this.value)" style="padding:8px 14px; border-radius:10px; border:1px solid var(--border-color); background:var(--input-bg, #0b1528); color:var(--text-color); font-size:13px;">
          <select onchange="handleCatalogTribuFilter(this.value)" style="padding:8px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--input-bg, #0b1528); color:var(--text-color); font-size:13px;">
            <option value="all">Toutes les Tribus</option>
            ${tribusOptions}
          </select>
          <select onchange="handleCatalogTypeFilter(this.value)" style="padding:8px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--input-bg, #0b1528); color:var(--text-color); font-size:13px;">
            <option value="all" ${currentCatalogFilter.type === 'all' ? 'selected' : ''}>Tous les Types</option>
            <option value="string" ${currentCatalogFilter.type === 'string' ? 'selected' : ''}>string</option>
            <option value="number" ${currentCatalogFilter.type === 'number' ? 'selected' : ''}>number</option>
            <option value="boolean" ${currentCatalogFilter.type === 'boolean' ? 'selected' : ''}>boolean</option>
            <option value="enum" ${currentCatalogFilter.type === 'enum' ? 'selected' : ''}>enum</option>
            <option value="json" ${currentCatalogFilter.type === 'json' ? 'selected' : ''}>JSON Object</option>
          </select>
          <select onchange="handleCatalogStatusFilter(this.value)" style="padding:8px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--input-bg, #0b1528); color:var(--text-color); font-size:13px;">
            <option value="all" ${currentCatalogFilter.status === 'all' ? 'selected' : ''}>Tous les Statuts</option>
            <option value="Validé" ${currentCatalogFilter.status === 'Validé' ? 'selected' : ''}>Validé</option>
            <option value="Déprécié" ${currentCatalogFilter.status === 'Déprécié' ? 'selected' : ''}>Déprécié</option>
            <option value="Brouillon" ${currentCatalogFilter.status === 'Brouillon' ? 'selected' : ''}>Brouillon</option>
          </select>
        </div>
      </div>

      <!-- Tableau Référentiel -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(0,0,0,0.25); border-bottom:1px solid var(--border-color); font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">
                <th style="padding:12px 16px;">Variable &amp; Libellé</th>
                <th style="padding:12px 16px;">Tribu &amp; Squad Propriétaire</th>
                <th style="padding:12px 16px;">Type &amp; Contrat Schéma</th>
                <th style="padding:12px 16px;">Sensibilité</th>
                <th style="padding:12px 16px;">Statut</th>
                <th style="padding:12px 16px;">Description Métier</th>
                <th style="padding:12px 16px; text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">Aucune variable ne correspond aux critères de recherche.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // VUE 2 : AUDIT CROISÉ BPMN VS CATALOGUE (ORPHELINES & DÉPRÉCIÉES)
  // -------------------------------------------------------------
  function renderCatalogAuditView(container) {
    const bpmnRows = window.allRows || [];
    const catalogMap = new Map();
    window.enterpriseDataCatalog.forEach(item => catalogMap.set(item.name.toLowerCase().trim(), item));

    if (bpmnRows.length === 0) {
      container.innerHTML = `
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:40px; text-align:center;">
          <div style="font-size:40px; margin-bottom:12px;">📥</div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-color); margin:0 0 8px 0;">Aucun modèle BPMN chargé</h3>
          <p style="font-size:13px; color:var(--text-muted); max-width:500px; margin:0 auto 20px auto;">
            Importez des fichiers BPMN dans l'onglet « Importation » pour croiser automatiquement leurs variables avec le référentiel d'entreprise Bouygues Telecom.
          </p>
          <button class="btn-primary" onclick="switchModule('variables'); switchTab('import');" style="padding:8px 22px; font-size:13px; font-weight:700;">
            Aller à l'Importation BPMN
          </button>
        </div>
      `;
      return;
    }

    // Analyse des variables BPMN
    const bpmnVariablesSet = new Map(); // varName -> { count, processes, sampleRows }
    bpmnRows.forEach(row => {
      const vName = (row.variableName || row.name || row['Nom Variable'] || '').trim();
      if (!vName) return;
      const key = vName.toLowerCase();
      if (!bpmnVariablesSet.has(key)) {
        bpmnVariablesSet.set(key, {
          rawName: vName,
          count: 0,
          processes: new Set(),
          activities: new Set()
        });
      }
      const entry = bpmnVariablesSet.get(key);
      entry.count++;
      if (row.processName || row['Processus']) entry.processes.add(row.processName || row['Processus']);
      if (row.activityName || row['Activité']) entry.activities.add(row.activityName || row['Activité']);
    });

    const totalDistinctBpmn = bpmnVariablesSet.size;
    let compliantCount = 0;
    let orphanCount = 0;
    let deprecatedCount = 0;

    const analysisRows = [];

    bpmnVariablesSet.forEach((vData, key) => {
      const catalogEntry = catalogMap.get(key);
      if (catalogEntry) {
        if (catalogEntry.status === 'Déprécié') {
          deprecatedCount++;
          analysisRows.push({ ...vData, status: 'deprecated', catalog: catalogEntry });
        } else {
          compliantCount++;
          analysisRows.push({ ...vData, status: 'compliant', catalog: catalogEntry });
        }
      } else {
        orphanCount++;
        analysisRows.push({ ...vData, status: 'orphan', catalog: null });
      }
    });

    const complianceRate = totalDistinctBpmn > 0 ? Math.round((compliantCount / totalDistinctBpmn) * 100) : 0;

    let tableRowsHtml = analysisRows.map(row => {
      let badgeHtml;
      let actionBtn;

      if (row.status === 'compliant') {
        badgeHtml = `<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ Conforme Référentiel</span>`;
        actionBtn = `<span style="font-size:11px; color:var(--text-muted); font-weight:600;">Géré par ${row.catalog.tribu}</span>`;
      } else if (row.status === 'deprecated') {
        badgeHtml = `<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.3);">⚠️ Variable Dépréciée</span>`;
        actionBtn = `<button onclick="openEditVariableModal('${row.catalog.id}')" class="btn-ghost" style="padding:4px 10px; font-size:11px; color:#EF4444; font-weight:700;">Voir Recommandation</button>`;
      } else {
        badgeHtml = `<span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.3);">❓ Non Référencée (Orpheline)</span>`;
        actionBtn = `<button onclick="quickRegisterOrphanVariable('${row.rawName}')" class="btn-primary" style="padding:4px 10px; font-size:11px; font-weight:700;">➕ Ajouter au Catalogue</button>`;
      }

      return `
        <tr style="border-bottom:1px solid var(--border-color); font-size:13px;">
          <td style="padding:12px 16px;">
            <strong style="font-family:JetBrains Mono, monospace; color:var(--brand-cyan);">${row.rawName}</strong>
          </td>
          <td style="padding:12px 16px;">
            ${badgeHtml}
          </td>
          <td style="padding:12px 16px; font-weight:700;">
            ${row.count} occurrence(s)
          </td>
          <td style="padding:12px 16px; color:var(--text-muted); font-size:12px;">
            ${Array.from(row.processes).slice(0, 2).join(', ') || 'Modèle principal'} ${row.processes.size > 2 ? `(+${row.processes.size - 2})` : ''}
          </td>
          <td style="padding:12px 16px; text-align:right;">
            ${actionBtn}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <!-- KPI de Gouvernance -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:20px;">
          <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Taux de Conformité Catalogue</div>
          <div style="font-size:28px; font-weight:900; color:${complianceRate >= 80 ? '#10B981' : (complianceRate >= 50 ? '#009CD7' : '#EF4444')};">${complianceRate}%</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${compliantCount} sur ${totalDistinctBpmn} variables normalisées</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:20px;">
          <div style="font-size:12px; font-weight:700; color:#F59E0B; text-transform:uppercase; margin-bottom:6px;">Variables Orphelines</div>
          <div style="font-size:28px; font-weight:900; color:#F59E0B;">${orphanCount}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Absentes du catalogue d'entreprise</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:20px;">
          <div style="font-size:12px; font-weight:700; color:#EF4444; text-transform:uppercase; margin-bottom:6px;">Variables Dépréciées</div>
          <div style="font-size:28px; font-weight:900; color:#EF4444;">${deprecatedCount}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">À remplacer selon les directives CoE</div>
        </div>
      </div>

      <!-- Tableau des résultats de croisement -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); background:rgba(0,0,0,0.15);">
          <h3 style="margin:0; font-size:15px; font-weight:800; color:var(--text-color);">Rapport de Croisement des Variables BPMN</h3>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(0,0,0,0.25); border-bottom:1px solid var(--border-color); font-size:12px; text-transform:uppercase; color:var(--text-muted);">
                <th style="padding:12px 16px;">Variable BPMN</th>
                <th style="padding:12px 16px;">Statut Référentiel</th>
                <th style="padding:12px 16px;">Utilisation</th>
                <th style="padding:12px 16px;">Processus Détectés</th>
                <th style="padding:12px 16px; text-align:right;">Action de Gouvernance</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // GESTIONNAIRES D'ÉVÉNEMENTS & FILTRES
  // -------------------------------------------------------------
  window.handleCatalogSearch = function (val) {
    currentCatalogFilter.search = val;
    renderCatalogDictionaryView(document.getElementById('dataCatalogContentArea'));
  };

  window.handleCatalogTribuFilter = function (val) {
    currentCatalogFilter.tribu = val;
    renderCatalogDictionaryView(document.getElementById('dataCatalogContentArea'));
  };

  window.handleCatalogTypeFilter = function (val) {
    currentCatalogFilter.type = val;
    renderCatalogDictionaryView(document.getElementById('dataCatalogContentArea'));
  };

  window.handleCatalogStatusFilter = function (val) {
    currentCatalogFilter.status = val;
    renderCatalogDictionaryView(document.getElementById('dataCatalogContentArea'));
  };

  // -------------------------------------------------------------
  // MODAL : AJOUT / MODIFICATION DE VARIABLE DU CATALOGUE
  // -------------------------------------------------------------
  window.openAddVariableModal = function (initialName = '') {
    openVariableFormModal({
      id: 'var_' + Date.now(),
      name: initialName,
      label: '',
      tribu: 'Tribu Commande & Logistique',
      squad: 'Squad Order Management',
      owner: 'lead-dev@bouyguestelecom.fr',
      type: 'string',
      pattern: '',
      example: '',
      sensitivity: 'Donnée Client',
      status: 'Validé',
      description: ''
    }, true);
  };

  window.openEditVariableModal = function (varId) {
    const item = window.enterpriseDataCatalog.find(x => x.id === varId);
    if (!item) return;
    openVariableFormModal(item, false);
  };

  window.quickRegisterOrphanVariable = function (varName) {
    openAddVariableModal(varName);
  };

  function openVariableFormModal(item, isNew) {
    let modal = document.getElementById('catalogVariableFormModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'catalogVariableFormModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    const tribusList = [
      'Tribu Bbox & Fixe',
      'Tribu Mobile & Forfaits',
      'Tribu Réseau & Fibre',
      'Tribu Facturation & Paiement',
      'Tribu Commande & Logistique',
      'Tribu SAV & Relation Client',
      'Tribu Catalogue & Offres'
    ];

    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; max-width:680px; width:100%; box-shadow:0 25px 60px -12px rgba(15,23,42,0.3); overflow:hidden; animation:modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:20px 26px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:10px; background:rgba(0,156,215,0.12); border:1px solid #009CD7; display:flex; align-items:center; justify-content:center; font-size:16px;">
              ${isNew ? '➕' : '✏️'}
            </div>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:800; color:#003882;">
                ${isNew ? 'Déclarer une Nouvelle Variable au Référentiel' : 'Modifier la Définition de la Variable'}
              </h3>
              <span style="font-size:12px; color:#64748b; font-weight:600;">Catalogue de Données Centralisé Bouygues Telecom</span>
            </div>
          </div>
          <button onclick="document.getElementById('catalogVariableFormModal').style.display='none'" class="close-modal" style="background:#e2e8f0; color:#334155; width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <form id="catalogVariableForm" onsubmit="saveCatalogVariableForm(event, '${item.id}', ${isNew})" style="padding:26px; max-height:80vh; overflow-y:auto; background:#ffffff;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Nom Technique (CamelCase) *</label>
              <input type="text" id="catVarName" required value="${item.name}" placeholder="ex: msisdn, idClientBbox" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-family:JetBrains Mono, monospace; font-size:13.5px; font-weight:700; outline:none;">
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Libellé Métier Explicite *</label>
              <input type="text" id="catVarLabel" required value="${item.label}" placeholder="ex: Numéro de Ligne Mobile" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Tribu Propriétaire *</label>
              <select id="catVarTribu" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
                ${tribusList.map(t => `<option value="${t}" ${item.tribu === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Squad Responsable</label>
              <input type="text" id="catVarSquad" value="${item.squad}" placeholder="ex: Squad Provisioning Bbox" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:18px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Type Strict</label>
              <select id="catVarType" style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
                <option value="string" ${item.type === 'string' ? 'selected' : ''}>string</option>
                <option value="number" ${item.type === 'number' ? 'selected' : ''}>number</option>
                <option value="boolean" ${item.type === 'boolean' ? 'selected' : ''}>boolean</option>
                <option value="enum" ${item.type === 'enum' ? 'selected' : ''}>enum</option>
                <option value="json" ${item.type === 'json' ? 'selected' : ''}>JSON Object</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Sensibilité Donnée</label>
              <select id="catVarSens" style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
                <option value="Public" ${item.sensitivity === 'Public' ? 'selected' : ''}>Public</option>
                <option value="Interne" ${item.sensitivity === 'Interne' ? 'selected' : ''}>Interne</option>
                <option value="Donnée Client" ${item.sensitivity === 'Donnée Client' ? 'selected' : ''}>Donnée Client</option>
                <option value="RGPD / Donnée Personnelle" ${item.sensitivity === 'RGPD / Donnée Personnelle' ? 'selected' : ''}>RGPD / Personnelle</option>
                <option value="Critique / Donnée Bancaire (PCI/RGPD)" ${item.sensitivity.includes('Bancaire') ? 'selected' : ''}>Critique Bancaire</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Statut CoE</label>
              <select id="catVarStatus" style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
                <option value="Validé" ${item.status === 'Validé' ? 'selected' : ''}>Validé</option>
                <option value="Déprécié" ${item.status === 'Déprécié' ? 'selected' : ''}>Déprécié</option>
                <option value="Brouillon" ${item.status === 'Brouillon' ? 'selected' : ''}>Brouillon</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Expression Régulière de Validation (Regex Pattern optionnelle)</label>
            <input type="text" id="catVarPattern" value="${item.pattern || ''}" placeholder="ex: ^0[67][0-9]{8}$" style="width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0284c7; font-family:JetBrains Mono, monospace; font-size:13.5px; font-weight:700; outline:none;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">Description &amp; Justification Métier</label>
            <textarea id="catVarDesc" style="width:100%; min-height:75px; padding:10px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; line-height:1.5; outline:none;">${item.description || ''}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid #e2e8f0; padding-top:18px;">
            <button type="button" class="btn-ghost" onclick="document.getElementById('catalogVariableFormModal').style.display='none'" style="padding:8px 20px; font-size:13px; font-weight:700; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:10px;">Annuler</button>
            <button type="submit" class="btn-primary" style="padding:9px 24px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:10px; cursor:pointer;">Enregistrer la Variable</button>
          </div>
        </form>
      </div>
    `;
    modal.style.display = 'flex';
  }

  window.saveCatalogVariableForm = function (e, id, isNew) {
    e.preventDefault();
    const name = document.getElementById('catVarName').value.trim();
    const label = document.getElementById('catVarLabel').value.trim();
    const tribu = document.getElementById('catVarTribu').value;
    const squad = document.getElementById('catVarSquad').value.trim();
    const type = document.getElementById('catVarType').value;
    const sensitivity = document.getElementById('catVarSens').value;
    const status = document.getElementById('catVarStatus').value;
    const pattern = document.getElementById('catVarPattern').value.trim();
    const description = document.getElementById('catVarDesc').value.trim();

    const updatedObj = {
      id: id,
      name: name,
      label: label,
      tribu: tribu,
      squad: squad,
      owner: 'squad-lead@bouyguestelecom.fr',
      type: type,
      pattern: pattern,
      sensitivity: sensitivity,
      status: status,
      description: description
    };

    if (isNew) {
      window.enterpriseDataCatalog.unshift(updatedObj);
    } else {
      const idx = window.enterpriseDataCatalog.findIndex(x => x.id === id);
      if (idx >= 0) window.enterpriseDataCatalog[idx] = updatedObj;
    }

    document.getElementById('catalogVariableFormModal').style.display = 'none';
    renderDataCatalogMain();
    if (typeof showToast === 'function') {
      showToast(`Variable "${name}" enregistrée dans le Référentiel Bouygues Telecom !`, "success");
    }
  };

  window.deleteCatalogVariable = function (id) {
    const item = window.enterpriseDataCatalog.find(x => x.id === id);
    if (!item) return;
    if (confirm(`Supprimer la variable "${item.name}" du référentiel central ?`)) {
      window.enterpriseDataCatalog = window.enterpriseDataCatalog.filter(x => x.id !== id);
      renderDataCatalogMain();
      if (typeof showToast === 'function') {
        showToast(`Variable "${item.name}" supprimée du catalogue.`, "info");
      }
    }
  };

  // -------------------------------------------------------------
  // TESTEUR DE VALIDATION DE SCHÉMA / REGEX
  // -------------------------------------------------------------
  window.testVariablePatternModal = function (varId) {
    const item = window.enterpriseDataCatalog.find(x => x.id === varId);
    if (!item) return;

    const sample = prompt(`🧪 Testeur de Contrat de Données (${item.name}) :\n\nEntrez une valeur d'exemple pour tester la conformité Regex :\nPattern : ${item.pattern || '(Aucune restriction)'}`, item.example || '');
    if (sample === null) return;

    if (!item.pattern) {
      alert(`✅ La variable "${item.name}" n'a pas de restriction de format (Regex libre). La valeur "${sample}" est valide.`);
      return;
    }

    try {
      const reg = new RegExp(item.pattern);
      if (reg.test(sample)) {
        alert(`✅ VALIDE ! La valeur "${sample}" respecte parfaitement le contrat de données Bouygues Telecom pour "${item.name}".`);
      } else {
        alert(`❌ NON CONFORME ! La valeur "${sample}" ne respecte pas le pattern attendu : ${item.pattern}`);
      }
    } catch (e) {
      alert("Erreur de syntaxe dans la regex : " + e.message);
    }
  };

  // -------------------------------------------------------------
  // EXPORT JSON DU CATALOGUE
  // -------------------------------------------------------------
  window.exportDataCatalogJSON = function () {
    const dataStr = JSON.stringify(window.enterpriseDataCatalog, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `data_catalog_bouygues_telecom_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast("Catalogue de données exporté avec succès !", "success");
  };

})();
