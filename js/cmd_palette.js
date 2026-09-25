/**
 * Paprika AuditFlow Pro - Palette de Commandes & Recherche Globale (Ctrl + K)
 */

(function() {
  let selectedIndex = 0;
  let filteredCommands = [];

  const COMMANDS = [
    // Navigation Modules
    { id: 'nav-import', title: 'Aller à : Importation', category: 'Navigation', icon: '📥', action: () => { switchModule('variables'); switchTab('import'); } },
    { id: 'nav-config', title: 'Aller à : Configuration des Règles', category: 'Navigation', icon: '⚙️', action: () => { switchModule('variables'); switchTab('config'); } },
    { id: 'nav-results', title: 'Aller à : Résultats d\'Audit', category: 'Navigation', icon: '📋', action: () => { switchModule('variables'); switchTab('results'); } },
    { id: 'nav-dashboard', title: 'Aller à : Tableau de bord', category: 'Navigation', icon: '📊', action: () => { switchModule('variables'); switchTab('dashboard'); } },
    { id: 'nav-graph', title: 'Aller à : Cartographie Relationnelle', category: 'Navigation', icon: '🕸️', action: () => { switchModule('variables'); switchTab('graph'); } },
    { id: 'nav-ranking', title: 'Aller à : Classement & Recommandations', category: 'Navigation', icon: '🏆', action: () => { switchModule('variables'); switchTab('ranking'); } },
    { id: 'nav-duplicates', title: 'Aller à : Détection des Doublons & Cohérence', category: 'Navigation', icon: '🔍', action: () => { switchModule('variables'); switchTab('duplicates'); switchDupSubView('cards'); } },
    { id: 'nav-dup-table', title: 'Doublons : Vue Tableau Synthétique & Sélection', category: 'Navigation', icon: '📊', action: () => { switchModule('variables'); switchTab('duplicates'); switchDupSubView('table'); } },
    { id: 'nav-dup-graph', title: 'Doublons : Constellation & Graphe Réseau Vis.js', category: 'Navigation', icon: '🕸️', action: () => { switchModule('variables'); switchTab('duplicates'); switchDupSubView('graph'); } },
    { id: 'nav-dup-diff', title: 'Doublons : Comparateur Diff & Contexte', category: 'Navigation', icon: '⚖️', action: () => { switchModule('variables'); switchTab('duplicates'); switchDupSubView('diff'); } },
    { id: 'nav-bpmn-rules', title: 'Aller à : Audit Nommage BPMN', category: 'Navigation', icon: '📐', action: () => { switchModule('bpmn-rules'); } },
    { id: 'nav-subprocesses', title: 'Aller à : Sous-processus & Boucles', category: 'Navigation', icon: '🔄', action: () => { switchModule('subprocesses'); } },
    { id: 'nav-pmg', title: 'Aller à : Process Matrix Governance (PMG)', category: 'Navigation', icon: '📑', action: () => { switchModule('pmg'); } },
    { id: 'nav-diff', title: 'Aller à : Comparateur de Versions BPMN (Diff)', category: 'Navigation', icon: '⚖️', action: () => { switchModule('diff'); } },
    { id: 'nav-roi', title: 'Aller à : Calculateur ROI & Valeur', category: 'Navigation', icon: '💶', action: () => { switchModule('roi'); } },
    { id: 'nav-guide', title: 'Aller à : Guide d\'utilisation', category: 'Navigation', icon: '📖', action: () => { switchModule('guide'); } },

    // Actions Rapides
    { id: 'act-demo', title: 'Charger les Données Démo', category: 'Action Rapide', icon: '⚡', action: () => { loadDemo(); } },
    { id: 'act-harmonize-dup', title: 'Harmoniser Tous les Doublons de Variables', category: 'Action Rapide', icon: '✨', action: () => { applyAllClustersHarmonization(); } },
    { id: 'act-export-dup-report', title: 'Générer le Rapport des Doublons & Cohérence', category: 'Gouvernance', icon: '📊', action: () => { openDuplicatesExportModal(); } },
    { id: 'act-autofix', title: 'Auto-Fix BPMN & Télécharger XML Corrigé', category: 'Action Rapide', icon: '✨', action: () => { applyBpmnAutoFixAndDownload(); } },
    { id: 'act-export-json', title: 'Exporter le Rapport en JSON', category: 'Action Rapide', icon: '💾', action: () => { exportReport('json'); } },
    { id: 'act-export-csv', title: 'Exporter le Rapport en CSV', category: 'Action Rapide', icon: '📊', action: () => { exportReport('csv'); } },
    { id: 'act-toggle-sidebar', title: 'Réduire / Agrandir la barre latérale', category: 'Action Rapide', icon: '↔️', action: () => { toggleSidebar(); } },
    { id: 'act-reset', title: 'Réinitialiser toutes les données', category: 'Action Rapide', icon: '🗑️', action: () => { resetAll(); } },
    { id: 'act-export-rules', title: 'Exporter la Configuration des Règles (JSON)', category: 'Gouvernance', icon: '📤', action: () => { exportRulesConfig(); } },
    { id: 'act-import-rules', title: 'Importer une Configuration de Règles (JSON)', category: 'Gouvernance', icon: '📥', action: () => { importRulesConfig(); } }
  ];

  window.openCommandPalette = function() {
    let modal = document.getElementById('cmdPaletteModal');
    if (!modal) {
      createCommandPaletteModal();
      modal = document.getElementById('cmdPaletteModal');
    }
    modal.style.display = 'flex';
    const input = document.getElementById('cmdPaletteInput');
    if (input) {
      input.value = '';
      input.focus();
      renderPaletteResults('');
    }
  };

  window.closeCommandPalette = function() {
    const modal = document.getElementById('cmdPaletteModal');
    if (modal) modal.style.display = 'none';
  };

  function createCommandPaletteModal() {
    const modal = document.createElement('div');
    modal.id = 'cmdPaletteModal';
    modal.className = 'modal cmd-palette-modal';
    modal.onclick = (e) => { if (e.target === modal) closeCommandPalette(); };

    modal.innerHTML = `
      <div class="cmd-palette-box">
        <div class="cmd-palette-search">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="cmdPaletteInput" placeholder="Rechercher une action, variable, module... (Esc pour fermer)" autocomplete="off">
          <kbd class="cmd-kbd">ESC</kbd>
        </div>
        <div class="cmd-palette-list" id="cmdPaletteList"></div>
        <div class="cmd-palette-footer">
          <span><strong>↑↓</strong> pour naviguer</span>
          <span><strong>↵</strong> pour sélectionner</span>
          <span><strong>ESC</strong> pour fermer</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('cmdPaletteInput');
    input.addEventListener('input', (e) => renderPaletteResults(e.target.value));
    input.addEventListener('keydown', handlePaletteKeydown);
  }

  function renderPaletteResults(query) {
    const q = (query || '').trim().toLowerCase();
    const listEl = document.getElementById('cmdPaletteList');
    if (!listEl) return;

    let matches = COMMANDS.filter(cmd => 
      cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)
    );

    // Recherche dynamique parmi les variables auditées
    if (q.length >= 2 && window.allRows && allRows.length > 0) {
      const varMatches = allRows
        .filter(r => r.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map(r => ({
          id: `var-${r.name}`,
          title: `Variable : ${r.name} (${r.status === 'valid' ? 'Conforme' : 'Non conforme'})`,
          category: 'Variables Auditées',
          icon: r.status === 'valid' ? '🟢' : '🔴',
          action: () => {
            switchModule('variables');
            switchTab('results');
            const searchInput = document.getElementById('search');
            if (searchInput) {
              searchInput.value = r.name;
              filterTable();
            }
          }
        }));
      matches = [...matches, ...varMatches];
    }

    filteredCommands = matches;
    selectedIndex = 0;

    if (matches.length === 0) {
      listEl.innerHTML = `<div class="cmd-empty">Aucun résultat trouvé pour "<strong>${escapeHtml(query)}</strong>"</div>`;
      return;
    }

    let currentCat = '';
    let html = '';

    matches.forEach((cmd, idx) => {
      if (cmd.category !== currentCat) {
        currentCat = cmd.category;
        html += `<div class="cmd-group-title">${escapeHtml(currentCat)}</div>`;
      }
      html += `
        <div class="cmd-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}" onclick="executeCommandByIndex(${idx})">
          <span class="cmd-item-icon">${cmd.icon}</span>
          <span class="cmd-item-title">${escapeHtml(cmd.title)}</span>
          <span class="cmd-item-cat">${escapeHtml(cmd.category)}</span>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  function handlePaletteKeydown(e) {
    if (e.key === 'Escape') {
      closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        updateSelectedUI();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        updateSelectedUI();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommandByIndex(selectedIndex);
      }
    }
  }

  function updateSelectedUI() {
    document.querySelectorAll('.cmd-item').forEach((el, idx) => {
      if (idx === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  window.executeCommandByIndex = function(idx) {
    const cmd = filteredCommands[idx];
    if (cmd && typeof cmd.action === 'function') {
      closeCommandPalette();
      cmd.action();
    }
  };

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#96;');
  }

  // Raccourci global Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openCommandPalette();
    }
  });
})();
