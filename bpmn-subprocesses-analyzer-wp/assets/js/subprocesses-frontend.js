(function($) {
  'use strict';

  // State Variables
  let allSubprocessRows = [];
  let rawSubprocessFileData = [];
  let subprocessFileHeaders = [];
  
  let subSortKey = 'impact';
  let subSortDir = 1; // 1 for DESC impact / ASC name, -1 for inverse

  let visNetworkInstance = null;

  // Escaping XML/HTML tags
  function esc(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Ready Hook
  $(function() {
    initDragAndDrop();
  });

  // Init Drag and Drop for Subprocesses File Upload
  function initDragAndDrop() {
    const $dz = $('#dropZoneSub');
    const $fileInput = $('#fileInputSub');

    if ($fileInput.length) {
      $fileInput.on('change', function(e) {
        if (e.target.files && e.target.files[0]) {
          handleSubprocessFile(e.target.files[0]);
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
        if (files && files[0]) {
          handleSubprocessFile(files[0]);
        }
      });
    }
  }

  // Handle uploaded files (router)
  async function handleSubprocessFile(file) {
    if (!file) return;

    const $loader = $('#bpmnSubLoaderOverlay');
    const $progress = $('#bpmnSubProgressBar');
    const $title = $('#bpmnSubLoaderTitle');
    const $sub = $('#bpmnSubLoaderSub');

    // Loader Spinner 1 : Lecture du fichier
    $title.text("Chargement du fichier...");
    $sub.text("Lecture et analyse de la source de données");
    $progress.css({ 'transition': 'none', 'width': '0%' });
    $loader.show();
    $loader[0].offsetHeight; // force repaint
    $progress.css({ 'transition': 'width 0.8s linear', 'width': '100%' });

    await new Promise(resolve => setTimeout(resolve, 800));

    const name = file.name.toLowerCase();
    if (name.endsWith('.bpmn') || name.endsWith('.xml')) {
      handleBPMNSubprocessFile(file, $loader);
    } else {
      handleExcelCSVSubprocessFile(file, $loader);
    }
  }

  // Process BPMN XML File
  function handleBPMNSubprocessFile(file, $loader) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const xmlText = e.target.result;
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error(parserError.textContent);
        }
        
        const relations = [];
        const allElements = xmlDoc.getElementsByTagName('*');
        let rowId = 1;
        
        function getParentProcessInfo(node) {
          let parent = node.parentNode;
          while (parent) {
            const ln = parent.localName ? parent.localName.toLowerCase() : '';
            if (ln === 'process') {
              const id = parent.getAttribute('id') || '';
              const nameAttr = parent.getAttribute('name') || '';
              return nameAttr ? `${nameAttr} (${id})` : id;
            }
            parent = parent.parentNode;
          }
          return 'Processus inconnu';
        }

        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const localName = el.localName ? el.localName.toLowerCase() : '';
          if (localName === 'callactivity') {
            const calledElement = el.getAttribute('calledElement') || '';
            const activityId = el.getAttribute('id') || '';
            const activityName = el.getAttribute('name') || '';
            const parentProcess = getParentProcessInfo(el);
            
            relations.push({
              parentProcess: parentProcess,
              subprocess: calledElement || '(Sous-processus non défini)',
              elementId: activityName ? `${activityName} (${activityId})` : activityId,
              row: rowId++
            });
          }
        }

        rawSubprocessFileData = [];
        subprocessFileHeaders = [];
        allSubprocessRows = relations.map(r => ({
          ...r,
          status: r.subprocess === '(Sous-processus non défini)' ? 'invalid' : 'valid',
          issues: r.subprocess === '(Sous-processus non défini)' ? ['Sous-processus non défini (appel vide)'] : []
        }));

        $('#uploadTitleSub').text(file.name);
        $('#uploadSubSub').text(`Fichier BPMN chargé (${allSubprocessRows.length} Call Activities trouvées)`);
        $('#manualInputSub').val('');
        $('#mappingSectionSub').hide();
        $('#countHintSub').text(`${allSubprocessRows.length} relations détectées`);

        let previewHTML = '';
        const count = Math.min(allSubprocessRows.length, 5);
        for (let i = 0; i < count; i++) {
          const r = allSubprocessRows[i];
          previewHTML += `<div style="margin-bottom:6px"><strong style="color:var(--brand-primary)">${esc(r.parentProcess)}</strong> ➔ <strong style="color:#10b981">${esc(r.subprocess)}</strong> <span style="color:var(--text-tertiary);font-size:10px">(${esc(r.elementId)})</span></div>`;
        }
        $('#previewBoxSub').html(previewHTML || '<span style="color:var(--text-tertiary)">Aucun Call Activity trouvé...</span>');

      } catch (err) {
        console.error("Erreur de lecture BPMN", err);
        alert("Erreur de parsing XML : " + err.message);
      } finally {
        $loader.hide();
      }
    };
    reader.readAsText(file);
  }

  // Process Excel/CSV File
  function handleExcelCSVSubprocessFile(file, $loader) {
    if (!window.XLSX) {
      alert("La bibliothèque SheetJS n'est pas chargée.");
      $loader.hide();
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        rawSubprocessFileData = [];
        subprocessFileHeaders = [];

        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (sheetData.length > 0) {
          subprocessFileHeaders = sheetData[0].map((h, i) => h ? String(h).trim() : `Colonne ${i}`);
          if (subprocessFileHeaders.filter(h => !h.startsWith('Colonne')).length === 0) {
            subprocessFileHeaders = sheetData[0].map((_, i) => `Colonne ${i}`);
            rawSubprocessFileData = sheetData;
          } else {
            rawSubprocessFileData = sheetData.slice(1);
          }
        }

        allSubprocessRows = [];
        $('#uploadTitleSub').text(file.name);
        $('#uploadSubSub').text('Données chargées, veuillez vérifier le mappage.');
        $('#manualInputSub').val('');
        $('#mappingSectionSub').show();

        populateSubMappingDropdowns();
      } catch (err) {
        console.error("Erreur lors de la lecture d'Excel/CSV :", err);
        alert("Erreur de traitement de fichier : " + err.message);
      } finally {
        $loader.hide();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function populateSubMappingDropdowns() {
    const $pSel = $('#colSubParent');
    const $cSel = $('#colSubChild');
    const $eSel = $('#colSubElementId');

    const selectArray = [$pSel, $cSel, $eSel];
    selectArray.forEach(function($sel, i) {
      if (!$sel.length) return;
      $sel.html(i === 2 ? '<option value="-1">-- Non défini --</option>' : '');

      subprocessFileHeaders.forEach(function(header, idx) {
        const $opt = $('<option></option>').val(idx).text(`${header} (Col ${idx})`);
        $sel.append($opt);
      });

      // Pré-sélection automatique intelligente
      if (i === 0) {
        const found = subprocessFileHeaders.findIndex(h => h.toLowerCase().includes('parent') || h.toLowerCase().includes('caller') || h.toLowerCase().includes('source'));
        if (found >= 0) $sel.val(found);
      } else if (i === 1) {
        const found = subprocessFileHeaders.findIndex(h => h.toLowerCase().includes('sous') || h.toLowerCase().includes('sub') || h.toLowerCase().includes('child') || h.toLowerCase().includes('called') || h.toLowerCase().includes('target'));
        if (found >= 0) $sel.val(found);
      }
    });

    window.updateSubPreview();
  }

  // Update preview table mapping
  window.updateSubPreview = function() {
    const colParentIdx = parseInt($('#colSubParent').val(), 10);
    const colChildIdx = parseInt($('#colSubChild').val(), 10);
    const colElementIdIdx = parseInt($('#colSubElementId').val(), 10);

    if (isNaN(colParentIdx) || isNaN(colChildIdx) || colParentIdx < 0 || colChildIdx < 0) {
      $('#previewBoxSub').html('<span style="color:var(--text-tertiary)">Sélectionnez les colonnes requises...</span>');
      return;
    }

    let previewHTML = '';
    const maxPreview = 5;
    const count = Math.min(rawSubprocessFileData.length, maxPreview);

    for (let i = 0; i < count; i++) {
      const row = rawSubprocessFileData[i];
      const parentVal = row[colParentIdx];
      const childVal = row[colChildIdx];
      if (parentVal && childVal) {
        let details = [];
        if (colElementIdIdx >= 0 && row[colElementIdIdx]) details.push(`ID: ${row[colElementIdIdx]}`);

        previewHTML += `<div style="margin-bottom:6px"><strong style="color:var(--brand-primary)">${esc(parentVal)}</strong> ➔ <strong style="color:#10b981">${esc(childVal)}</strong> <span style="color:var(--text-tertiary);font-size:10px">${details.join(' | ')}</span></div>`;
      }
    }

    const totalRows = rawSubprocessFileData.filter(r => r[colParentIdx] && r[colChildIdx]).length;

    $('#previewBoxSub').html(previewHTML || '<span style="color:var(--text-tertiary)">Aucune relation détectée...</span>');
    $('#colHintSub').text('Mappage configuré.');
    $('#countHintSub').text(`${totalRows} relations détectées`);
  };

  // Switch tabs
  window.switchSubTab = function(tabId) {
    $('.bpmn-sub-panel').hide();
    $('.bpmn-sub-tab').removeClass('active');
    
    $('#panel-' + tabId).show();
    $('#btn-tab-' + tabId).addClass('active');

    // Force network graph rebuild if entering map tab
    if (tabId === 'bpmn-sub-map') {
      setTimeout(() => {
        window.renderSubprocessMap();
      }, 100);
    }
  };

  // Trigger Subprocesses analysis
  window.triggerSubprocessesAudit = async function() {
    const manual = $('#manualInputSub').val().trim();
    let relations = [];

    try {
      // 1. Lire de la saisie manuelle ou du fichier
      if (allSubprocessRows.length > 0 && rawSubprocessFileData.length === 0 && !manual) {
        relations = allSubprocessRows;
      } else if (rawSubprocessFileData.length > 0) {
        const colParentIdx = parseInt($('#colSubParent').val(), 10);
        const colChildIdx = parseInt($('#colSubChild').val(), 10);
        const colElementIdIdx = parseInt($('#colSubElementId').val(), 10);

        if (isNaN(colParentIdx) || isNaN(colChildIdx) || colParentIdx < 0 || colChildIdx < 0) {
          alert("Veuillez mapper les colonnes requises.");
          return;
        }

        rawSubprocessFileData.forEach((row, index) => {
          const parentVal = String(row[colParentIdx] || '').trim();
          const childVal = String(row[colChildIdx] || '').trim();
          const elemId = colElementIdIdx >= 0 ? String(row[colElementIdIdx] || '').trim() : '';
          if (parentVal) {
            relations.push({
              parentProcess: parentVal,
              subprocess: childVal || '(Sous-processus non défini)',
              elementId: elemId || `Ligne ${index + 1}`,
              row: index + 1
            });
          }
        });
      } else if (manual) {
        manual.split('\n').forEach((line, idx) => {
          const parts = line.split(';');
          const parentVal = parts[0] ? parts[0].trim() : '';
          const childVal = parts[1] ? parts[1].trim() : '';
          if (parentVal) {
            relations.push({
              parentProcess: parentVal,
              subprocess: childVal || '(Sous-processus non défini)',
              elementId: `Saisie manuelle L${idx + 1}`,
              row: idx + 1
            });
          }
        });
      }

      if (relations.length === 0) {
        alert("Aucune relation à analyser. Importez un fichier ou effectuez une saisie manuelle.");
        return;
      }

      // Loader overlay 2 : Simulation d'audit
      const $loader = $('#bpmnSubLoaderOverlay');
      const $progress = $('#bpmnSubProgressBar');
      const $title = $('#bpmnSubLoaderTitle');
      const $sub = $('#bpmnSubLoaderSub');

      $title.text("Analyse en cours...");
      $sub.text("Détection des cycles de dépendances et évaluation d'impact");
      $progress.css({ 'transition': 'none', 'width': '0%' });
      $loader.show();
      $loader[0].offsetHeight; // force repaint
      $progress.css({ 'transition': 'width 2s linear', 'width': '100%' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Détection des dépendances circulaires (boucles) via DFS
      const adj = {};
      relations.forEach(r => {
        if (r.parentProcess && r.subprocess && r.subprocess !== '(Sous-processus non défini)') {
          const p = r.parentProcess;
          const c = r.subprocess;
          if (!adj[p]) adj[p] = new Set();
          adj[p].add(c);
        }
      });

      const visited = {};
      const recStack = {};
      const nodesInLoops = new Set();

      function findCycles(node) {
        visited[node] = true;
        recStack[node] = true;

        const neighbors = adj[node] || [];
        for (let neighbor of neighbors) {
          if (!visited[neighbor]) {
            if (findCycles(neighbor)) {
              nodesInLoops.add(node);
              nodesInLoops.add(neighbor);
              return true;
            }
          } else if (recStack[neighbor]) {
            nodesInLoops.add(node);
            nodesInLoops.add(neighbor);
            return true;
          }
        }

        recStack[node] = false;
        return false;
      }

      const allNodes = new Set([...Object.keys(adj), ...relations.map(r => r.subprocess)]);
      for (let node of allNodes) {
        if (!visited[node]) {
          findCycles(node);
        }
      }

      allSubprocessRows = relations.map(r => {
        const issues = [];
        if (r.subprocess === '(Sous-processus non défini)') {
          issues.push('Sous-processus non défini');
        }
        const isParentInLoop = nodesInLoops.has(r.parentProcess);
        const isChildInLoop = nodesInLoops.has(r.subprocess);
        if (isParentInLoop && isChildInLoop) {
          issues.push('Dépendance circulaire détectée (boucle infinie)');
        }

        let status = 'valid';
        if (issues.some(i => i.includes('non défini'))) {
          status = 'invalid';
        } else if (issues.length > 0) {
          status = 'warn';
        }

        return {
          ...r,
          issues,
          status,
          inLoop: isParentInLoop && isChildInLoop
        };
      });

      // Afficher les onglets d'analyse
      $('#tab-bpmn-sub-analysis').show();
      $('#tab-bpmn-sub-map').show();

      initSubGraphFilters();
      window.switchSubTab('bpmn-sub-analysis');
      renderSubprocessResults();

      $loader.hide();
    } catch (e) {
      console.error("Erreur d'audit des sous-processus", e);
      alert("Erreur lors de l'analyse : " + e.message);
      $('#bpmnSubLoaderOverlay').hide();
    }
  };

  // Render diagnostic KPIs
  function renderSubprocessResults() {
    const totalRelations = allSubprocessRows.length;
    const uniqueParents = new Set(allSubprocessRows.map(r => r.parentProcess)).size;
    const uniqueChildren = new Set(allSubprocessRows.filter(r => r.subprocess !== '(Sous-processus non défini)').map(r => r.subprocess)).size;
    const loopsCount = allSubprocessRows.filter(r => r.inLoop).length;

    $('#kpi-sub-total').text(totalRelations);
    $('#kpi-sub-total-status').text('Relations');
    $('#kpi-sub-parents').text(uniqueParents);
    $('#kpi-sub-parents-status').text('Parents');
    $('#kpi-sub-children').text(uniqueChildren);
    $('#kpi-sub-children-status').text('Sous-processus');
    $('#kpi-sub-loops').text(loopsCount);
    $('#kpi-sub-loops-status').text(loopsCount > 0 ? 'Boucles Actives' : 'Sain');
    
    $('#kpi-sub-loops-status').css('color', loopsCount > 0 ? 'var(--err-dark)' : 'var(--ok-dark)');

    renderSubprocessTable();
  }

  // Draw diagnostic results table
  function renderSubprocessTable() {
    const search = $('#subSearchInput').val().trim().toLowerCase();
    const loopFilter = $('#subLoopFilter').val();
    const sortKey = subSortKey;

    const subMap = {};
    allSubprocessRows.forEach(r => {
      const c = r.subprocess;
      if (!subMap[c]) {
        subMap[c] = {
          name: c,
          parents: new Set(),
          issues: new Set(),
          inLoop: false
        };
      }
      if (r.parentProcess) subMap[c].parents.add(r.parentProcess);
      r.issues.forEach(iss => subMap[c].issues.add(iss));
      if (r.inLoop) subMap[c].inLoop = true;
    });

    let uniqueSubs = Object.values(subMap);

    // Filter
    uniqueSubs = uniqueSubs.filter(sub => {
      if (search && !sub.name.toLowerCase().includes(search) && !Array.from(sub.parents).some(p => p.toLowerCase().includes(search))) return false;
      if (loopFilter === 'loop' && !sub.inLoop) return false;
      if (loopFilter === 'noLoop' && sub.inLoop) return false;
      return true;
    });

    // Sort
    uniqueSubs.sort((a, b) => {
      if (sortKey === 'impact') {
        return (b.parents.size - a.parents.size) * subSortDir;
      } else {
        return a.name.localeCompare(b.name) * (-subSortDir);
      }
    });

    const $tbody = $('#subTableBody');
    const $empty = $('#subEmptyMsg');

    if (!$tbody.length) return;

    if (uniqueSubs.length === 0) {
      $tbody.html('');
      $empty.show();
      return;
    }

    $empty.hide();

    const html = uniqueSubs.map(sub => {
      const parentBadges = Array.from(sub.parents).map(p => 
        `<span class="badge badge-process">${esc(p)}</span>`
      ).join(' ');

      let statusBadge = '<span class="badge ok">Sain</span>';
      let issuesList = '';
      if (sub.name === '(Sous-processus non défini)') {
        statusBadge = '<span class="badge err">Incomplet</span>';
        issuesList = '<div class="iss-item" style="color:var(--err-dark)">● Appel vide (non défini)</div>';
      } else if (sub.inLoop) {
        statusBadge = '<span class="badge err">Erreur</span>';
        issuesList = '<div class="iss-item" style="color:var(--err-dark)">● Dépendance circulaire</div>';
      } else if (sub.issues.size > 0) {
        statusBadge = '<span class="badge warn">Attention</span>';
        issuesList = Array.from(sub.issues).map(iss => `<div class="iss-item">● ${esc(iss)}</div>`).join('');
      }

      return `
        <tr>
          <td><strong style="font-family:var(--font-mono); font-size:11px; color:var(--text-primary);">${esc(sub.name)}</strong></td>
          <td><span style="font-weight:600; color:var(--text-primary);">${sub.parents.size} parent(s)</span></td>
          <td>${parentBadges || '<span style="color:var(--text-tertiary);font-size:11px">— (Orphelin)</span>'}</td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px">
              ${statusBadge}
              ${issuesList ? `<div class="iss-list">${issuesList}</div>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    $tbody.html(html);
  }

  // Click sorting
  window.subSortBy = function(key) {
    if (subSortKey === key) {
      subSortDir *= -1;
    } else {
      subSortKey = key;
      subSortDir = 1;
    }
    renderSubprocessTable();
  };

  window.onSubSearch = function() {
    renderSubprocessTable();
  };

  window.onSubFilterChange = function() {
    renderSubprocessTable();
  };

  window.onSubSortChange = function() {
    const key = $('#subSortSel').val();
    subSortKey = key;
    subSortDir = 1;
    renderSubprocessTable();
  };

  // Vis-Network Cartography Map Render
  window.renderSubprocessMap = function() {
    if (!window.vis) return;
    const container = document.getElementById('subNetworkGraph');
    if (!container) return;

    const showLoopsOnly = $('#subGraphLoopsOnly').is(':checked');
    const showCommonOnly = $('#subGraphCommonOnly').is(':checked');
    const parentFilters = getSelectedCheckboxValues('subParentList');
    const childFilters = getSelectedCheckboxValues('subChildList');

    const edgeLineColor = 'rgba(15, 23, 42, 0.15)';
    const nodeTextColor = '#0f172a';

    const nodesMap = new Map();
    const edges = [];

    // Precalculate parents count per child
    const subToParents = {};
    allSubprocessRows.forEach(r => {
      const child = r.subprocess;
      const parent = r.parentProcess;
      if (child && child !== '(Sous-processus non défini)' && parent) {
        if (!subToParents[child]) {
          subToParents[child] = new Set();
        }
        subToParents[child].add(parent);
      }
    });

    allSubprocessRows.forEach(r => {
      if (showLoopsOnly && !r.inLoop) return;

      const parent = r.parentProcess;
      const child = r.subprocess;

      if (!parent) return;

      if (showCommonOnly) {
        if (!child || child === '(Sous-processus non défini)' || !subToParents[child] || subToParents[child].size <= 1) {
          return;
        }
      }

      if (parentFilters.length > 0 && !parentFilters.includes(parent)) return;
      if (childFilters.length > 0 && child && !childFilters.includes(child)) return;

      // Add parent node
      const pId = 'subproc_' + parent;
      if (!nodesMap.has(pId)) {
        const isParentInLoop = allSubprocessRows.some(row => row.parentProcess === parent && row.inLoop);
        const nodeColor = isParentInLoop ? '#ef4444' : '#004F9F';
        nodesMap.set(pId, {
          id: pId,
          label: parent,
          group: 'process',
          shape: 'box',
          color: { background: nodeColor, border: nodeColor, highlight: { background: '#ff7520', border: '#ff7520' } },
          font: { color: 'white', size: 12, face: 'var(--font-sans)', weight: '500' },
          borderWidth: 2
        });
      }

      if (child && child !== '(Sous-processus non défini)') {
        // Add child node
        const cId = 'subproc_' + child;
        if (!nodesMap.has(cId)) {
          const isChildInLoop = allSubprocessRows.some(row => row.subprocess === child && row.inLoop);
          const nodeColor = isChildInLoop ? '#ef4444' : '#10b981';
          nodesMap.set(cId, {
            id: cId,
            label: child,
            group: 'subprocess',
            shape: 'box',
            color: { background: nodeColor, border: nodeColor, highlight: { background: '#ff7520', border: '#ff7520' } },
            font: { color: 'white', size: 11, face: 'var(--font-sans)' },
            borderWidth: 2
          });
        }

        edges.push({
          from: pId,
          to: cId,
          color: { color: r.inLoop ? '#ef4444' : edgeLineColor, highlight: '#ff7520' }
        });
      }
    });

    const nodes = Array.from(nodesMap.values());

    const $kpiGrid = $('#subMapKpiGrid');
    const $sidebarContent = $('#subMapAnalysisContent');

    if (nodes.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:4rem; height: 100%; display: flex; flex-direction: column; justify-content: center;"><div class="empty-icon">⚯</div>Aucune relation correspondante aux filtres actuels.</div>';
      $kpiGrid.hide();
      $sidebarContent.html('<p style="font-style: italic; color: var(--text-tertiary); margin:0;">Aucune donnée disponible avec les filtres actuels.</p>');
      return;
    }

    const uniqueEdges = [];
    const edgeSet = new Set();
    edges.forEach(e => {
      const key = e.from + '_' + e.to;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        uniqueEdges.push(e);
      }
    });

    // Update map KPIs
    const visibleParents = nodes.filter(n => n.group === 'process').length;
    const visibleChildren = nodes.filter(n => n.group === 'subprocess').length;
    const visibleRelations = uniqueEdges.length;
    const reusabilityRate = visibleChildren > 0 ? (visibleRelations / visibleChildren).toFixed(1) : '0.0';

    $kpiGrid.show();
    $('#kpi-sub-map-parents').text(visibleParents);
    $('#kpi-sub-map-children').text(visibleChildren);
    $('#kpi-sub-map-reusability').text(reusabilityRate);
    $('#kpi-sub-map-relations').text(visibleRelations);

    // Generate detailed analysis sidebar
    if ($sidebarContent.length) {
      let analysisHtml = '';

      const childToParentsMap = {};
      const parentToChildrenMap = {};
      let visibleLoops = 0;

      uniqueEdges.forEach(e => {
        const parentName = nodesMap.get(e.from)?.label;
        const childName = nodesMap.get(e.to)?.label;
        if (parentName && childName) {
          if (!childToParentsMap[childName]) childToParentsMap[childName] = [];
          childToParentsMap[childName].push(parentName);

          if (!parentToChildrenMap[parentName]) parentToChildrenMap[parentName] = [];
          parentToChildrenMap[parentName].push(childName);
          
          const edgeRow = allSubprocessRows.find(r => r.parentProcess === parentName && r.subprocess === childName);
          if (edgeRow && edgeRow.inLoop) {
            visibleLoops++;
          }
        }
      });

      // 1. Loops Alert
      if (visibleLoops > 0) {
        analysisHtml += `
          <div style="background:var(--err-light); border:1px solid var(--err); color:var(--text-primary); padding:10px; border-radius:var(--border-radius-md); margin-bottom:10px;">
            <span style="font-weight:600; color:var(--err-dark); display:flex; align-items:center; gap:4px;">⚠️ Dépendances Circulaires</span>
            <p style="margin:4px 0 0 0; font-size:11px; line-height:1.4;">Il y a <strong>${visibleLoops}</strong> liaison(s) impliquée(s) dans une boucle infinie de dépendance dans la vue actuelle.</p>
          </div>
        `;
      }

      // 2. Shared subprocesses (Top reused childs)
      const sortedChildren = Object.entries(childToParentsMap)
        .sort((a, b) => b[1].length - a[1].length);

      analysisHtml += `
        <div style="margin-bottom: 15px;">
          <h5 style="font-size:12px; font-weight:600; color:var(--text-primary); margin:0 0 8px 0; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
            <span>🔗 Réutilisation (Top Partagés)</span>
            <span style="font-size:10px; color:var(--text-tertiary); font-weight:normal;">Total: ${sortedChildren.filter(c => c[1].length > 1).length}</span>
          </h5>
      `;

      if (sortedChildren.length > 0) {
        analysisHtml += '<div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; padding-right:2px;">';
        sortedChildren.slice(0, 5).forEach(([name, parents]) => {
          const isShared = parents.length > 1;
          analysisHtml += `
            <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:8px; border-radius:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
                <span style="font-weight:600; color:${isShared ? 'var(--brand-primary)' : 'var(--text-primary)'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</span>
                <span style="font-size:9px; background:${isShared ? 'var(--brand-light)' : 'rgba(0,0,0,0.05)'}; color:${isShared ? 'var(--brand-primary)' : 'var(--text-secondary)'}; padding:1px 5px; border-radius:10px; font-weight:bold; flex-shrink:0;">
                  ${parents.length} parent${parents.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style="font-size:10px; color:var(--text-tertiary); overflow:hidden; text-overflow:ellipsis; display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                ${parents.map(p => `<span style="background:#ffffff; border:1px solid var(--border-color); padding:1px 4px; border-radius:3px; font-size:9px; color:var(--text-secondary);">${esc(p)}</span>`).join('')}
              </div>
            </div>
          `;
        });
        analysisHtml += '</div>';
      } else {
        analysisHtml += '<p style="font-style:italic; font-size:11px; color:var(--text-tertiary); margin:0;">Aucun sous-processus visible.</p>';
      }
      analysisHtml += '</div>';

      // 3. Parent Complexity (Top Callers)
      const sortedParents = Object.entries(parentToChildrenMap)
        .sort((a, b) => b[1].length - a[1].length);

      analysisHtml += `
        <div>
          <h5 style="font-size:12px; font-weight:600; color:var(--text-primary); margin:0 0 8px 0; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
            <span>⚙️ Complexité (Top Appels)</span>
            <span style="font-size:10px; color:var(--text-tertiary); font-weight:normal;">Total: ${sortedParents.length}</span>
          </h5>
      `;

      if (sortedParents.length > 0) {
        analysisHtml += '<div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; padding-right:2px;">';
        sortedParents.slice(0, 5).forEach(([name, children]) => {
          analysisHtml += `
            <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:8px; border-radius:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
                <span style="font-weight:600; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</span>
                <span style="font-size:9px; background:var(--info-light); color:var(--info-dark); padding:1px 5px; border-radius:10px; font-weight:bold; flex-shrink:0;">
                  ${children.length} appel${children.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style="font-size:10px; color:var(--text-tertiary); overflow:hidden; text-overflow:ellipsis; display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                ${children.map(c => `<span style="background:#ffffff; border:1px solid var(--border-color); padding:1px 4px; border-radius:3px; font-size:9px; color:var(--text-secondary);">${esc(c)}</span>`).join('')}
              </div>
            </div>
          `;
        });
        analysisHtml += '</div>';
      } else {
        analysisHtml += '<p style="font-style:italic; font-size:11px; color:var(--text-tertiary); margin:0;">Aucun processus parent visible.</p>';
      }
      analysisHtml += '</div>';

      $sidebarContent.html(analysisHtml);
    }

    // Build DataSet and Render Vis Network
    const data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(uniqueEdges)
    };

    const options = {
      physics: {
        stabilization: { iterations: 150 },
        barnesHut: { gravitationalConstant: -2000, springLength: 80, springConstant: 0.04 }
      },
      edges: {
        smooth: { type: 'continuous' },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } }
      },
      interaction: { hover: true, tooltipDelay: 200, zoomView: true }
    };

    container.innerHTML = '';
    visNetworkInstance = new vis.Network(container, data, options);

    visNetworkInstance.on("stabilizationIterationsDone", function() {
      visNetworkInstance.setOptions({ physics: false });
    });
  };

  // Init cartography filters lists
  function initSubGraphFilters() {
    const parentSet = new Set();
    const childSet = new Set();
    
    allSubprocessRows.forEach(r => {
      if (r.parentProcess && r.parentProcess.trim()) parentSet.add(r.parentProcess.trim());
      if (r.subprocess && r.subprocess.trim() && r.subprocess !== '(Sous-processus non défini)') {
        childSet.add(r.subprocess.trim());
      }
    });

    const $parentList = $('#subParentList');
    const $childList = $('#subChildList');

    if ($parentList.length) {
      const pHTML = Array.from(parentSet).sort().map((p, i) => `
        <div class="searchable-list-item" data-value="${esc(p)}">
          <input type="checkbox" id="chk_sub_p_${i}" value="${esc(p)}">
          <label for="chk_sub_p_${i}" title="${esc(p)}">${esc(p)}</label>
        </div>
      `).join('');
      $parentList.html(pHTML);
    }

    if ($childList.length) {
      const cHTML = Array.from(childSet).sort().map((c, i) => `
        <div class="searchable-list-item" data-value="${esc(c)}">
          <input type="checkbox" id="chk_sub_c_${i}" value="${esc(c)}">
          <label for="chk_sub_c_${i}" title="${esc(c)}">${esc(c)}</label>
        </div>
      `).join('');
      $childList.html(cHTML);
    }

    $('#searchSubParentInput').val('');
    $('#searchSubChildInput').val('');
  }

  // Get selected checkboxes
  function getSelectedCheckboxValues(listId) {
    const vals = [];
    $(`#${listId} input[type="checkbox"]:checked`).each(function() {
      vals.push($(this).val());
    });
    return vals;
  }

  // Keyup checkbox filtering
  window.filterSubCheckboxes = function(listId, query) {
    const q = query.trim().toLowerCase();
    $(`#${listId} .searchable-list-item`).each(function() {
      const val = $(this).data('value') || '';
      if (val.toLowerCase().includes(q)) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  };

  // Reset cartography map filters
  window.resetSubGraphFilters = function() {
    $('#subParentList input[type=checkbox]').prop('checked', false);
    $('#subChildList input[type=checkbox]').prop('checked', false);
    $('#subGraphLoopsOnly').prop('checked', false);
    $('#subGraphCommonOnly').prop('checked', false);
    
    $('#searchSubParentInput').val('');
    $('#searchSubChildInput').val('');
    
    window.filterSubCheckboxes('subParentList', '');
    window.filterSubCheckboxes('subChildList', '');
    
    window.renderSubprocessMap();
  };

  // Toggle fullscreen mode
  window.toggleSubFullscreen = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isCurrentlyFullscreen = container.classList.contains('is-fullscreen') || document.fullscreenElement === container;

    if (isCurrentlyFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        container.classList.remove('is-fullscreen');
        $(container).find('.path-exit').hide();
        $(container).find('.path-enter').show();
        $(container).find('.fullscreen-text-exit').hide();
        $(container).find('.fullscreen-text-enter').show();
        setTimeout(() => {
          window.renderSubprocessMap();
        }, 150);
      }
    } else {
      if (document.fullscreenEnabled) {
        container.requestFullscreen().then(() => {
          container.classList.add('is-fullscreen');
          $(container).find('.path-enter').hide();
          $(container).find('.path-exit').show();
          $(container).find('.fullscreen-text-enter').hide();
          $(container).find('.fullscreen-text-exit').show();
          setTimeout(() => {
            window.renderSubprocessMap();
          }, 150);
        }).catch(err => {
          container.classList.add('is-fullscreen');
          $(container).find('.path-enter').hide();
          $(container).find('.path-exit').show();
          $(container).find('.fullscreen-text-enter').hide();
          $(container).find('.fullscreen-text-exit').show();
          setTimeout(() => {
            window.renderSubprocessMap();
          }, 150);
        });
      } else {
        container.classList.add('is-fullscreen');
        $(container).find('.path-enter').hide();
        $(container).find('.path-exit').show();
        $(container).find('.fullscreen-text-enter').hide();
        $(container).find('.fullscreen-text-exit').show();
        setTimeout(() => {
          window.renderSubprocessMap();
        }, 150);
      }
    }
  };

  // Listen fullscreen exit events natively
  document.addEventListener('fullscreenchange', () => {
    const container = document.getElementById('subCartoContainer');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.classList.remove('is-fullscreen');
      $(container).find('.path-exit').hide();
      $(container).find('.path-enter').show();
      $(container).find('.fullscreen-text-exit').hide();
      $(container).find('.fullscreen-text-enter').show();
      setTimeout(() => {
        window.renderSubprocessMap();
      }, 150);
    }
  });

})(jQuery);
