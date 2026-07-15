(function($) {
  'use strict';

  // State Variables
  let bpmnRules = [];
  let bpmnNamingElements = [];
  let filteredBpmnNamingElements = [];
  let bpmnNamingXmlDoc = null;
  let bpmnNamingFileName = "";
  let bpmnNamingFilter = 'all';
  let bpmnNamingSearch = '';
  let bpmnNamingSort = { key: 'status', dir: 1 };
  let bpmnNamingPage = 1;
  const bpmnNamingItemsPerPage = 10; // Plus compact pour intégration WP

  let bpmnDonutChartInstance = null;
  let bpmnBarChartInstance = null;

  // Initialize on document ready
  $(document).ready(function() {
    initBpmnAuditor();
  });

  function initBpmnAuditor() {
    // Charger les règles transmises par WordPress
    if (window.bpmnAuditorSettings && window.bpmnAuditorSettings.rules) {
      const rawRules = window.bpmnAuditorSettings.rules;
      bpmnRules = Array.isArray(rawRules) ? rawRules : Object.values(rawRules);
    }
    
    renderImportRulesSelector();
    setupEventListeners();
  }

  // Render checkable rules list on the upload page
  function renderImportRulesSelector() {
    const $grid = $('#bpmnNamingImportRulesGrid');
    if (!$grid.length) return;

    if (bpmnRules.length === 0) {
      $grid.html('<p style="color:var(--text-tertiary);font-size:12px;">Aucune règle disponible.</p>');
      return;
    }

    const html = bpmnRules.map((rule, idx) => `
      <div class="conf-item">
        <input type="checkbox" id="chk_wp_rule_${idx}" ${rule.enabled ? 'checked' : ''} data-index="${idx}">
        <label for="chk_wp_rule_${idx}">
          ${escHtml(rule.label)}
          <small>${escHtml(rule.desc)}</small>
        </label>
      </div>
    `).join('');

    $grid.html(html);

    // Écouter les changements pour activer/désactiver temporairement pour l'audit
    $grid.find('input[type="checkbox"]').on('change', function() {
      const idx = $(this).data('index');
      bpmnRules[idx].enabled = $(this).is(':checked');
    });
  }

  function setupEventListeners() {
    const $dz = $('#dropZoneBpmnNaming');
    const $input = $('#fileInputBpmnNaming');

    if ($input.length) {
      $input.on('change', function(e) {
        if (e.target.files.length > 0) {
          handleBpmnFile(e.target.files[0]);
        }
      });
    }

    if ($dz.length) {
      $dz.on('dragover', function(e) {
        e.preventDefault();
        $dz.addClass('drag');
      });
      $dz.on('dragleave', function() {
        $dz.removeClass('drag');
      });
      $dz.on('drop', function(e) {
        e.preventDefault();
        $dz.removeClass('drag');
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
          handleBpmnFile(files[0]);
        }
      });
    }
  }

  function handleBpmnFile(file) {
    if (!file) return;

    // Afficher le spinner de chargement de fichier
    const $loader = $('#bpmnLoaderOverlay');
    const $progress = $('#bpmnProgressBar');
    const $title = $('#bpmnLoaderTitle');
    const $sub = $('#bpmnLoaderSub');

    $title.text("Chargement du fichier...");
    $sub.text("Lecture et analyse du modèle BPMN XML...");
    $progress.css({ 'transition': 'none', 'width': '0%' });
    $loader.show();
    $loader[0].offsetHeight; // force repaint

    $progress.css({ 'transition': 'width 0.8s linear', 'width': '100%' });

    const reader = new FileReader();
    reader.onload = async function(e) {
      // Léger délai simulé (800ms) pour apprécier la transition visuelle
      await new Promise(resolve => setTimeout(resolve, 800));

      const xmlText = e.target.result;
      bpmnNamingFileName = file.name;

      try {
        const parser = new DOMParser();
        bpmnNamingXmlDoc = parser.parseFromString(xmlText, "application/xml");

        const parserError = bpmnNamingXmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error(parserError.textContent);
        }

        // Extraction brute
        bpmnNamingElements = auditBpmnXmlDoc(bpmnNamingXmlDoc);

        // Activer le bouton
        $('#analyzeBpmnNamingBtn').removeAttr('disabled');
        $('#uploadTitleBpmnNaming').text(file.name);
        $('#uploadSubBpmnNaming').text(`Fichier BPMN chargé (${bpmnNamingElements.length} éléments identifiés)`);

        // Synthèse et aperçu
        updateSummarySection();
        updatePreviewSection();

      } catch (err) {
        console.error("Erreur de parsing BPMN :", err);
        alert("Erreur de parsing XML : " + err.message);
      } finally {
        $loader.hide();
      }
    };
    reader.readAsText(file);
  }

  function updateSummarySection() {
    const $container = $('#bpmnNamingSummarySection');
    const $summaryEl = $('#bpmnNamingElementSummary');
    const $hint = $('#bpmnNamingCountHint');

    if (!$container.length || !$summaryEl.length) return;

    const stats = {};
    bpmnNamingElements.forEach(item => {
      stats[item.typeLabel] = (stats[item.typeLabel] || 0) + 1;
    });

    const total = bpmnNamingElements.length;
    if ($hint.length) $hint.text(`${total} éléments détectés`);

    if (total === 0) {
      $container.hide();
      return;
    }

    $container.show();
    const html = Object.entries(stats).map(([label, count]) => `
      <div>
        <strong>${count}</strong> ${escHtml(label)}
      </div>
    `).join('');
    $summaryEl.html(html);
  }

  function updatePreviewSection() {
    const $box = $('#bpmnNamingPreviewBox');
    if (!$box.length) return;

    if (bpmnNamingElements.length === 0) {
      $box.html('<span style="color:var(--text-tertiary)">Aucun élément trouvé...</span>');
      return;
    }

    let html = '';
    const count = Math.min(bpmnNamingElements.length, 10);
    for (let i = 0; i < count; i++) {
      const el = bpmnNamingElements[i];
      html += `<div style="margin-bottom:6px; line-height:1.5;">
        <span class="badge-bpmn type-${el.type}">${escHtml(el.typeLabel)}</span>
        <strong style="color:var(--text-primary); font-size:11px;">${escHtml(el.id)}</strong>
        <span style="color:var(--text-secondary); font-size:11px;">: "${escHtml(el.name || '[Sans nom]')}"</span>
      </div>`;
    }

    if (bpmnNamingElements.length > 10) {
      html += `<div style="color:var(--text-tertiary); font-size:11px; margin-top:4px;">... et ${bpmnNamingElements.length - 10} autres éléments.</div>`;
    }

    $box.html(html);
  }

  // Trigger Naming Audit with Progress Spinner
  window.triggerBpmnNamingAudit = async function() {
    if (bpmnNamingElements.length === 0) return;

    try {
      const $loader = $('#bpmnLoaderOverlay');
      const $progress = $('#bpmnProgressBar');
      const $title = $('#bpmnLoaderTitle');
      const $sub = $('#bpmnLoaderSub');

      $title.text("Analyse en cours...");
      $sub.text("Audit syntaxique des identifiants et des libellés BPMN");
      $progress.css({ 'transition': 'none', 'width': '0%' });
      $loader.show();
      $loader[0].offsetHeight; // force repaint

      $progress.css({ 'transition': 'width 2s linear', 'width': '100%' });

      // Simuler le traitement asynchrone de 2s
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Exécuter l'audit complet avec les règles sélectionnées
      bpmnNamingElements = auditBpmnXmlDoc(bpmnNamingXmlDoc);

      // Initialiser les filtres
      bpmnNamingFilter = 'all';
      bpmnNamingSearch = '';
      bpmnNamingSort = { key: 'status', dir: 1 };
      bpmnNamingPage = 1;

      // Afficher l'onglet Résultats
      $('#tab-bpmn-naming-results').show();
      window.switchBpmnTab('bpmn-naming-results');

      // Mettre à jour l'affichage des résultats
      renderResultsPage();

      // Masquer le loader
      $loader.hide();
    } catch (e) {
      console.error("Erreur lors de l'audit de nommage BPMN :", e);
      alert("Erreur lors de l'audit : " + e.message);
      $('#bpmnLoaderOverlay').hide();
    }
  };

  // Render Results Page
  function renderResultsPage() {
    const total = bpmnNamingElements.length;
    const valid = bpmnNamingElements.filter(r => r.status === 'valid').length;
    const warn = bpmnNamingElements.filter(r => r.status === 'warn').length;
    const invalid = bpmnNamingElements.filter(r => r.status === 'invalid').length;

    const score = Math.round((valid / total) * 100) || 0;
    const scoreColor = score >= 90 ? 'var(--ok-dark)' : score >= 70 ? 'var(--brand-primary)' : 'var(--err-dark)';

    // Mettre à jour les KPIs
    $('#kpi-bpmn-total').text(total);
    $('#kpi-bpmn-score').text(`${score}%`).css('color', scoreColor);
    
    let scoreText = 'Insuffisant';
    if (score >= 90) scoreText = 'Excellent';
    else if (score >= 70) scoreText = 'Acceptable';
    $('#kpi-bpmn-score-status').text(scoreText).css('color', scoreColor);

    $('#kpi-bpmn-errors').text(invalid);
    $('#kpi-bpmn-warnings').text(warn);

    // Barre de progression
    $('#bpmnScoreBar').html(`
      <span class="score-label">Score de conformité de nommage</span>
      <div class="score-track"><div class="score-fill" style="width:${score}%;background:${scoreColor}"></div></div>
      <span class="score-val" style="color:${scoreColor}">${score}%</span>
    `);

    // Toolbar
    $('#bpmnToolbarEl').html(`
      <button class="pill active" id="pbAll">Tous (${total})</button>
      <button class="pill p-ok" id="pbOk">Conformes (${valid})</button>
      <button class="pill p-err" id="pbErr">Non conformes (${invalid})</button>
      <button class="pill p-warn" id="pbWarn">Avertissements (${warn})</button>
      <input class="srch" placeholder="Rechercher..." id="bpmnSearchInput" value="${escHtml(bpmnNamingSearch)}">
      <select class="srt" id="bpmnSortSel">
        <option value="status" ${bpmnNamingSort.key === 'status' ? 'selected' : ''}>Trier : statut</option>
        <option value="type" ${bpmnNamingSort.key === 'type' ? 'selected' : ''}>Trier : type d'élément</option>
        <option value="name" ${bpmnNamingSort.key === 'name' ? 'selected' : ''}>Trier : nom</option>
      </select>
    `);

    setupResultsToolbarEvents();
    renderCharts(valid, warn, invalid);
    renderTable();
  }

  function setupResultsToolbarEvents() {
    // Filtres Pilules
    $('#pbAll').on('click', () => { bpmnNamingFilter = 'all'; updateToolbarPills(); renderTable(); });
    $('#pbOk').on('click', () => { bpmnNamingFilter = 'valid'; updateToolbarPills(); renderTable(); });
    $('#pbErr').on('click', () => { bpmnNamingFilter = 'invalid'; updateToolbarPills(); renderTable(); });
    $('#pbWarn').on('click', () => { bpmnNamingFilter = 'warn'; updateToolbarPills(); renderTable(); });

    // Recherche
    $('#bpmnSearchInput').on('input', function() {
      bpmnNamingSearch = $(this).val();
      bpmnNamingPage = 1;
      renderTable();
    });

    // Tri
    $('#bpmnSortSel').on('change', function() {
      bpmnNamingSort.key = $(this).val();
      bpmnNamingSort.dir = 1;
      renderTable();
    });
  }

  function updateToolbarPills() {
    $('.bpmn-naming-container .pill').removeClass('active');
    if (bpmnNamingFilter === 'all') $('#pbAll').addClass('active');
    else if (bpmnNamingFilter === 'valid') $('#pbOk').addClass('active');
    else if (bpmnNamingFilter === 'invalid') $('#pbErr').addClass('active');
    else if (bpmnNamingFilter === 'warn') $('#pbWarn').addClass('active');
  }

  function renderCharts(valid, warn, invalid) {
    if (!window.Chart) return;

    // 1. Donut Chart
    const ctxDonut = document.getElementById('bpmnDonutChart');
    if (ctxDonut) {
      if (bpmnDonutChartInstance) bpmnDonutChartInstance.destroy();
      bpmnDonutChartInstance = new Chart(ctxDonut.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Conformes', 'Avertissements', 'Non conformes'],
          datasets: [{
            data: [valid, warn, invalid],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#475569', font: { size: 10 } }
            }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Bar Chart (violations par type)
    const violationsByType = {};
    bpmnNamingElements.forEach(item => {
      if (item.status !== 'valid') {
        violationsByType[item.typeLabel] = (violationsByType[item.typeLabel] || 0) + 1;
      }
    });

    const barLabels = Object.keys(violationsByType);
    const barData = Object.values(violationsByType);

    const ctxBar = document.getElementById('bpmnBarChart');
    if (ctxBar) {
      if (bpmnBarChartInstance) bpmnBarChartInstance.destroy();
      bpmnBarChartInstance = new Chart(ctxBar.getContext('2d'), {
        type: 'bar',
        data: {
          labels: barLabels.length ? barLabels : ['Aucune'],
          datasets: [{
            label: 'Violations',
            data: barLabels.length ? barData : [0],
            backgroundColor: 'rgba(255, 117, 32, 0.75)',
            borderColor: '#ff7520',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } },
            y: { ticks: { precision: 0, color: '#475569', font: { size: 10 } } }
          }
        }
      });
    }
  }

  // Render table rows and pagination
  function renderTable() {
    const $tbody = $('#bpmnTableBody');
    if (!$tbody.length) return;

    // Filtrer
    let rows = bpmnNamingElements.filter(item => {
      // Filtre statut
      if (bpmnNamingFilter !== 'all' && item.status !== bpmnNamingFilter) {
        return false;
      }
      // Filtre recherche
      if (bpmnNamingSearch) {
        const q = bpmnNamingSearch.toLowerCase();
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchType = (item.typeLabel || '').toLowerCase().includes(q);
        return matchId || matchName || matchType;
      }
      return true;
    });

    // Trier
    const key = bpmnNamingSort.key;
    const dir = bpmnNamingSort.dir;
    rows.sort((a, b) => {
      let valA = a[key] || '';
      let valB = b[key] || '';
      if (key === 'status') {
        const order = { 'invalid': 1, 'warn': 2, 'valid': 3 };
        valA = order[a.status] || 99;
        valB = order[b.status] || 99;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    filteredBpmnNamingElements = rows;

    // Pagination
    const totalItems = filteredBpmnNamingElements.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / bpmnNamingItemsPerPage);
    if (bpmnNamingPage > totalPages) bpmnNamingPage = totalPages;

    const startIdx = (bpmnNamingPage - 1) * bpmnNamingItemsPerPage;
    const paginatedRows = filteredBpmnNamingElements.slice(startIdx, startIdx + bpmnNamingItemsPerPage);

    // Dessiner lignes
    if (paginatedRows.length === 0) {
      $tbody.html('<tr><td colspan="6" style="text-align:center; color:var(--text-tertiary); padding:30px;">Aucun élément correspondant aux critères.</td></tr>');
      renderPagination(0, 0, 0);
      return;
    }

    let html = '';
    paginatedRows.forEach(item => {
      const globalIdx = bpmnNamingElements.indexOf(item);
      const errorsList = item.issues.map(i => {
        const color = i.sev === 'err' ? 'var(--err-dark)' : 'var(--warn-dark)';
        return `<div style="margin-bottom:4px; color:${color}; font-size:11px;">⚠️ ${escHtml(i.msg)} <span style="color:var(--text-tertiary); font-size:9px;">(${escHtml(i.ruleLabel)})</span></div>`;
      }).join('');

      const suggestionInput = item.status === 'valid' 
        ? `<span style="color:var(--text-tertiary); font-style:italic;">Conforme</span>`
        : `<input type="text" class="inline-suggest-edit" value="${escHtml(item.editedSuggestion || '')}" data-index="${globalIdx}">`;

      html += `<tr>
        <td><span class="badge-bpmn type-${item.type}">${escHtml(item.typeLabel)}</span></td>
        <td style="font-family:var(--font-mono); font-size:11px; color:var(--text-primary);">${escHtml(item.id)}</td>
        <td>${escHtml(item.name || '[Sans nom]')}</td>
        <td><span class="badge-status ${item.status}">${item.status === 'valid' ? 'Conforme' : item.status === 'warn' ? 'Alerte' : 'Invalide'}</span></td>
        <td>${errorsList || '<span style="color:var(--ok);">Aucune violation</span>'}</td>
        <td style="vertical-align:middle;">${suggestionInput}</td>
      </tr>`;
    });

    $tbody.html(html);

    // Attacher l'événement d'édition
    $tbody.find('.inline-suggest-edit').on('input', function() {
      const idx = $(this).data('index');
      bpmnNamingElements[idx].editedSuggestion = $(this).val();
    });

    renderPagination(totalItems, bpmnNamingPage, totalPages);
  }

  // Draw Pagination Bar
  function renderPagination(total, page, totalPages) {
    const $pagEl = $('#bpmnPaginationEl');
    if (!$pagEl.length) return;

    if (total === 0) {
      $pagEl.html('');
      return;
    }

    const start = (page - 1) * bpmnNamingItemsPerPage + 1;
    const end = Math.min(page * bpmnNamingItemsPerPage, total);

    let buttonsHtml = `
      <button class="btn-page" ${page === 1 ? 'disabled' : ''} id="btnPrevPage">Précédent</button>
    `;

    // Dessiner boutons numérotés
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 6 && i > 3 && i < totalPages - 1) {
        if (i === 4) buttonsHtml += `<span style="margin: 0 4px;color:var(--text-tertiary);">...</span>`;
        continue;
      }
      buttonsHtml += `<button class="btn-page ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    buttonsHtml += `
      <button class="btn-page" ${page === totalPages ? 'disabled' : ''} id="btnNextPage">Suivant</button>
    `;

    $pagEl.html(`
      <div>Affichage de ${start} à ${end} sur ${total} éléments</div>
      <div class="pagination-buttons">
        ${buttonsHtml}
      </div>
    `);

    // Listeners
    $('#btnPrevPage').on('click', () => { if (bpmnNamingPage > 1) { bpmnNamingPage--; renderTable(); } });
    $('#btnNextPage').on('click', () => { if (bpmnNamingPage < totalPages) { bpmnNamingPage++; renderTable(); } });
    $pagEl.find('button[data-page]').on('click', function() {
      bpmnNamingPage = parseInt($(this).data('page'), 10);
      renderTable();
    });
  }

  // Local Sort Handler
  window.sortBpmnResultsLocal = function(key) {
    if (bpmnNamingSort.key === key) {
      bpmnNamingSort.dir *= -1;
    } else {
      bpmnNamingSort.key = key;
      bpmnNamingSort.dir = 1;
    }

    // Indicateur visuel de tri
    ['type', 'id', 'name', 'status'].forEach(k => {
      const $span = $('#sort-bpmn-' + k);
      if ($span.length) {
        if (k === key) {
          $span.html(bpmnNamingSort.dir === 1 ? '▲' : '▼');
        } else {
          $span.html('');
        }
      }
    });

    renderTable();
  };

  // Switch Tab local
  window.switchBpmnTab = function(tabId) {
    $('.bpmn-naming-container .bpmn-auditor-panel').hide();
    $('#panel-' + tabId).show();
    $('.bpmn-naming-container .bpmn-auditor-tab').removeClass('active');
    $('#tab-' + tabId).addClass('active');
  };

  // XML Correction & Download
  window.downloadCorrectedBpmnFile = function() {
    if (!bpmnNamingXmlDoc || bpmnNamingElements.length === 0) return;

    try {
      const clonedDoc = bpmnNamingXmlDoc.cloneNode(true);
      const updatedXmlText = generateCorrectedBpmnXml(clonedDoc, bpmnNamingElements);

      const blob = new Blob([updatedXmlText], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dotIdx = bpmnNamingFileName.lastIndexOf('.');
      const base = dotIdx >= 0 ? bpmnNamingFileName.substring(0, dotIdx) : bpmnNamingFileName;
      const ext = dotIdx >= 0 ? bpmnNamingFileName.substring(dotIdx) : '.bpmn';
      a.download = base + '_corrected' + ext;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du fichier corrigé : " + e.message);
    }
  };

  // Excel & CSV Exports
  window.exportBpmnNamingToExcel = function() {
    if (!bpmnNamingElements.length) { alert("Le rapport est vide."); return; }

    const data = [
      ["Type d'élément", "ID technique", "Libellé original", "Statut", "Violations de conventions", "Correction suggérée"]
    ];

    bpmnNamingElements.forEach(r => {
      const violations = r.issues.map(i => i.msg).join(" | ");
      data.push([
        r.typeLabel,
        r.id,
        r.name || "",
        r.status === 'valid' ? 'Conforme' : r.status === 'warn' ? 'Avertissement' : 'Non conforme',
        violations || "Aucune",
        r.editedSuggestion || ""
      ]);
    });

    try {
      if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rapport Nommage BPMN");
        XLSX.writeFile(wb, "Rapport_Nommage_" + bpmnNamingFileName.replace(/\.[^/.]+$/, "") + ".xlsx");
      } else {
        alert("La bibliothèque SheetJS n'est pas chargée. Exportation CSV à la place.");
        window.exportBpmnNamingToCSV();
      }
    } catch(e) {
      console.error(e);
      alert("Erreur lors de l'export Excel.");
    }
  };

  window.exportBpmnNamingToCSV = function() {
    if (!bpmnNamingElements.length) { alert("Le rapport est vide."); return; }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type;ID;Libelle;Statut;Violations;Correction\r\n";

    bpmnNamingElements.forEach(r => {
      const violations = r.issues.map(i => i.msg).join(" | ");
      const row = [
        r.typeLabel,
        r.id,
        r.name || "",
        r.status,
        violations || "Aucune",
        r.editedSuggestion || ""
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(";");

      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Rapport_Nommage_" + bpmnNamingFileName.replace(/\.[^/.]+$/, "") + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Escaping
  function escHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  //   BPMN AUDITING ENGINE LOGIC (derived from bpmn_rules.js and rules.js)
  // =========================================================================

  const FRENCH_INFINITIVE_ENDINGS = ['er', 'ir', 're', 'oir'];
  const FRENCH_EXCEPTIONS_INFINITIVE = new Set([
    'sur', 'par', 'pour', 'soir', 'noir', 'hier', 'mer', 'fer', 'ver', 'air', 'clair', 'danger', 
    'cancer', 'hiver', 'leger', 'premier', 'dernier', 'car', 'bar', 'char', 'dur', 'mur', 'pur', 
    'sûr', 'empire', 'frère', 'père', 'mère', 'arrière', 'derrière', 'manière', 'matière', 
    'histoire', 'victoire', 'maire', 'paire', 'contraire', 'inventaire', 'commentaire', 
    'partenaire', 'secrétaire', 'itinéraire'
  ]);

  function startsWithInfinitiveVerb(str) {
    if (!str) return false;
    const words = str.trim().split(/[\s'\-]+/);
    if (words.length === 0) return false;
    
    const firstWord = words[0].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Sans accents
    
    const matchesEnding = FRENCH_INFINITIVE_ENDINGS.some(ending => firstWord.endsWith(ending));
    if (!matchesEnding) return false;
    
    return !FRENCH_EXCEPTIONS_INFINITIVE.has(firstWord);
  }

  function checkFrenchPastParticipleEnding(word) {
    if (!word) return false;
    const w = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /(e|i|u|t|s)e?$/.test(w);
  }

  function convertToKebabCase(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function convertToPascalCase(s) {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }

  function convertToCamelCaseLocal(s) {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w, idx) => {
      if (idx === 0) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join('');
  }

  function suggestBpmnNameCorrection(targetType, currentLabel, ruleId) {
    if (!currentLabel) return '';
    const label = currentLabel.trim();
    
    switch(ruleId) {
      case 'process-id-kebab':
        return convertToKebabCase(label);
      case 'process-name-capital':
        return label.charAt(0).toUpperCase() + label.slice(1);
      case 'variable-camel':
        return convertToCamelCaseLocal(label);
      case 'variable-reserved':
        return convertToCamelCaseLocal(label) + 'Val';
      case 'variable-collection-plural':
        if (label.endsWith('List') || label.endsWith('Items') || label.endsWith('s')) return label;
        return label + 'Items';
      case 'task-verb-infinitive':
        if (!startsWithInfinitiveVerb(label)) {
          const words = label.split(/\s+/);
          const first = words[0];
          if (first.toLowerCase() === 'gestion') return 'Gérer ' + words.slice(1).join(' ');
          if (first.toLowerCase() === 'creation') return 'Créer ' + words.slice(1).join(' ');
          if (first.toLowerCase() === 'validation') return 'Valider ' + words.slice(1).join(' ');
          if (first.toLowerCase() === 'envoi') return 'Envoyer ' + words.slice(1).join(' ');
          if (first.toLowerCase() === 'calcul') return 'Calculer ' + words.slice(1).join(' ');
          return 'Traiter ' + label.charAt(0).toLowerCase() + label.slice(1);
        }
        return label;
      case 'subprocess-noun-phrase':
        if (startsWithInfinitiveVerb(label)) {
          const words = label.split(/\s+/);
          const first = words[0].toLowerCase();
          if (first.startsWith('gerer')) return 'Gestion ' + words.slice(1).join(' ');
          if (first.startsWith('creer')) return 'Création ' + words.slice(1).join(' ');
          if (first.startsWith('valider')) return 'Validation ' + words.slice(1).join(' ');
          if (first.startsWith('envoyer')) return 'Envoi ' + words.slice(1).join(' ');
          if (first.startsWith('calculer')) return 'Calcul ' + words.slice(1).join(' ');
        }
        return label.charAt(0).toUpperCase() + label.slice(1);
      case 'gateway-divergent-question':
        if (!label.endsWith('?')) return label + ' ?';
        return label;
      case 'gateway-parallel-no-question':
        return label.replace(/\?/g, '').trim();
      case 'sequence-flow-labeled':
        return label || '[Réponse]';
      case 'event-start-noun-pastpart':
        if (label.split(/\s+/).length < 2) return label + ' reçu';
        return label;
      case 'event-catch-waiting':
        return label || 'Message reçu';
      case 'event-end-state':
        return label || 'Processus terminé';
      case 'event-boundary-exception':
        return label || 'Erreur interceptée';
      case 'message-pascal-suffix':
        const pascalMsg = convertToPascalCase(label);
        if (pascalMsg.endsWith('Message')) return pascalMsg;
        return pascalMsg + 'Message';
      case 'signal-pascal-suffix':
        const pascalSig = convertToPascalCase(label);
        if (pascalSig.endsWith('Signal') || pascalSig.endsWith('Signak')) return pascalSig;
        return pascalSig + 'Signal';
      default:
        return label;
    }
  }

  function auditBpmnElement(targetType, elementId, elementName, elementNode, extraData = {}) {
    const activeRules = bpmnRules.filter(r => r.enabled && r.target === targetType);
    const issues = [];
    const nameToCheck = (elementName || '').trim();
    
    activeRules.forEach(rule => {
      let passed = true;
      
      if (rule.type === 'regex') {
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern);
          passed = regex.test(nameToCheck);
        }
      } else if (rule.type === 'custom') {
        switch(rule.id) {
          case 'variable-reserved':
            const reservedSet = new Set(['if','else','for','in','return','true','false','null','and','or','not','between','instance','of','function','every','satisfies','some','context','is','date','time','duration','years','months','days','hours','minutes','seconds']);
            passed = !reservedSet.has(nameToCheck.toLowerCase());
            break;
          case 'task-verb-infinitive':
            if (nameToCheck) {
              const hasInfinitive = startsWithInfinitiveVerb(nameToCheck);
              const hasComplement = nameToCheck.split(/\s+/).length >= 2;
              passed = hasInfinitive && hasComplement;
            } else {
              passed = false;
            }
            break;
          case 'subprocess-noun-phrase':
            if (nameToCheck) {
              const hasInfinitive = startsWithInfinitiveVerb(nameToCheck);
              const startsCapital = /^[A-ZÀ-ÖØ-ß]/.test(nameToCheck);
              passed = !hasInfinitive && startsCapital;
            } else {
              passed = false;
            }
            break;
          case 'sequence-flow-labeled':
            if (extraData.sourceIsDivergent) {
              passed = nameToCheck.length > 0;
            } else {
              passed = true;
            }
            break;
          case 'event-start-noun-pastpart':
            if (nameToCheck) {
              const words = nameToCheck.split(/\s+/);
              if (words.length >= 2) {
                const lastWord = words[words.length - 1];
                passed = checkFrenchPastParticipleEnding(lastWord);
              } else {
                passed = false;
              }
            } else {
              passed = false;
            }
            break;
          case 'event-catch-waiting':
          case 'event-end-state':
          case 'event-boundary-exception':
            if (nameToCheck) {
              passed = /^[A-ZÀ-ÖØ-ß]/.test(nameToCheck);
            } else {
              passed = false;
            }
            break;
        }
      }
      
      if (!passed) {
        issues.push({
          ruleId: rule.id,
          msg: rule.errorMessage || 'Format invalide',
          sev: rule.severity || 'warn',
          ruleLabel: rule.label
        });
      }
    });
    
    const hasErr = issues.some(i => i.sev === 'err');
    const hasWarn = issues.some(i => i.sev === 'warn');
    const status = hasErr ? 'invalid' : (hasWarn ? 'warn' : 'valid');
    
    let suggested = nameToCheck;
    issues.forEach(issue => {
      suggested = suggestBpmnNameCorrection(targetType, suggested, issue.ruleId);
    });
    
    return {
      issues,
      status,
      suggested: (status !== 'valid') ? suggested : ''
    };
  }

  function auditBpmnXmlDoc(xmlDoc) {
    const elements = [];
    let uniqueIdCounter = 1;
    
    function addElement(targetType, id, name, node, typeLabel, extraData = {}) {
      const cleanName = (name || '').trim();
      const { issues, status, suggested } = auditBpmnElement(targetType, id, cleanName, node, extraData);
      
      if (node && typeof node.setAttribute === 'function') {
        if (!node.hasAttribute('data-bpmn-auditor-id')) {
          node.setAttribute('data-bpmn-auditor-id', 'wp_bpmn_el_' + uniqueIdCounter++);
        }
      }
      
      elements.push({
        id: id,
        name: cleanName,
        type: targetType,
        typeLabel: typeLabel,
        status: status,
        issues: issues,
        suggested: suggested,
        editedSuggestion: suggested,
        xmlId: node ? node.getAttribute('data-bpmn-auditor-id') : null
      });
    }

    // 1. Process
    const processes = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS('*', 'process') : xmlDoc.getElementsByTagName('process');
    for (let i = 0; i < processes.length; i++) {
      const proc = processes[i];
      const procId = proc.getAttribute('id') || '';
      const procName = proc.getAttribute('name') || '';
      
      if (procId) addElement('process-id', procId, procId, proc, 'ID de Processus');
      if (procName) addElement('process-name', procId, procName, proc, 'Nom de Processus');
    }

    // Divergent mapping
    const divergentGateways = new Set();
    const allElements = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const ln = el.localName ? el.localName.toLowerCase() : '';
      if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(ln)) {
        const id = el.getAttribute('id');
        if (id) divergentGateways.add(id);
      }
    }

    // 2. Elements
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const localName = el.localName ? el.localName.toLowerCase() : '';
      const nameAttr = el.getAttribute('name') || '';
      const idAttr = el.getAttribute('id') || '';

      if (['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity'].includes(localName)) {
        addElement('task', idAttr, nameAttr, el, 'Tâche');
      } else if (localName === 'subprocess') {
        addElement('subprocess', idAttr, nameAttr, el, 'Sous-processus');
      } else if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(localName)) {
        addElement('gateway-divergent', idAttr, nameAttr, el, 'Passerelle Divergente');
      } else if (localName === 'parallelgateway') {
        addElement('gateway-parallel', idAttr, nameAttr, el, 'Passerelle Parallèle (AND)');
      } else if (localName === 'startevent') {
        addElement('event-start', idAttr, nameAttr, el, 'Événement Début');
      } else if (localName === 'endevent') {
        addElement('event-end', idAttr, nameAttr, el, 'Événement Fin');
      } else if (['intermediatecatchevent', 'intermediatethrowevent'].includes(localName)) {
        addElement('event-catch', idAttr, nameAttr, el, 'Événement Intermédiaire');
      } else if (localName === 'boundaryevent') {
        addElement('event-boundary', idAttr, nameAttr, el, 'Événement Bordure');
      } else if (localName === 'message') {
        addElement('message', idAttr, nameAttr || idAttr, el, 'Message');
      } else if (localName === 'signal') {
        addElement('signal', idAttr, nameAttr || idAttr, el, 'Signal');
      } else if (localName === 'sequenceflow') {
        const sourceRef = el.getAttribute('sourceRef') || '';
        if (divergentGateways.has(sourceRef)) {
          addElement('sequence-flow', idAttr, nameAttr, el, 'Flux Sortant', { sourceIsDivergent: true });
        }
      }
    }

    return elements;
  }

  function generateCorrectedBpmnXml(clonedDoc, bpmnElements) {
    const nodeMap = new Map();
    
    bpmnElements.forEach(item => {
      if (item.status !== 'valid' && item.editedSuggestion && item.editedSuggestion.trim() !== item.name) {
        if (item.xmlId) {
          nodeMap.set(item.xmlId, item.editedSuggestion.trim());
        }
      }
    });

    nodeMap.forEach((newVal, xmlTempId) => {
      const node = clonedDoc.querySelector(`[data-bpmn-auditor-id="${xmlTempId}"]`);
      if (node) {
        const matchingItems = bpmnElements.filter(e => e.xmlId === xmlTempId);
        matchingItems.forEach(item => {
          if (item.type === 'process-id') {
            node.setAttribute('id', newVal);
          } else {
            node.setAttribute('name', newVal);
          }
        });
      }
    });

    // Clean up temporary attributes
    const tempNodes = clonedDoc.querySelectorAll('[data-bpmn-auditor-id]');
    tempNodes.forEach(n => n.removeAttribute('data-bpmn-auditor-id'));

    const serializer = new XMLSerializer();
    return serializer.serializeToString(clonedDoc);
  }

})(jQuery);
