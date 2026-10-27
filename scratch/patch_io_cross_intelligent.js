const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

const newIoCrossCode = `window.pmgIoCrossState = window.pmgIoCrossState || {
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
    s = s.replace(/^[="'\\[]+|[="'\\]]+$/g, '').trim();
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
    let csv = "\\uFEFFVariable;Statut Lignage;Nb Producteurs;Producteurs (Activité [Processus]);Nb Consommateurs;Consommateurs (Activité [Processus]);Flux Inter-Processus\\r\\n";
    filteredVars.forEach(v => {
      const prodsStr = v.producers.map(p => \`\${p.actName} [\${p.process}]\`).join(' | ');
      const consStr = v.consumers.map(c => \`\${c.actName} [\${c.process}]\`).join(' | ');
      csv += \`"\${v.name}";"\${v.statusLabel}";"\${v.producers.length}";"\${prodsStr}";"\${v.consumers.length}";"\${consStr}";"\${v.isInterProcess ? 'OUI' : 'NON'}"\\r\\n\`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = \`pmg_flux_io_lignage_\${Date.now()}.csv\`;
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
      contentHtml = \`
        <div style="padding:40px; text-align:center; color:var(--text-tertiary); background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
          <div style="font-size:28px; margin-bottom:8px;">🔍</div>
          <strong>Aucune variable ne correspond aux critères de filtre.</strong>
          <p style="margin:4px 0 0; font-size:12px;">Essayez de réinitialiser la recherche ou de changer les filtres de statut.</p>
        </div>
      \`;
    } else {
      let rows = '';
      pagedVars.forEach((v, vIdx) => {
        const rowBg = vIdx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-hover)';

        // Format Producers chips
        let prodChips = '';
        if (v.producers.length === 0) {
          prodChips = '<span style="color:var(--text-tertiary); font-style:italic; font-size:11px;">Aucun producteur (Variable d\\'entrée système ou utilisateur)</span>';
        } else {
          prodChips = v.producers.map(p => \`
            <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:6px; padding:4px 8px; margin-bottom:4px; font-size:11px; display:inline-block; margin-right:4px;">
              <strong style="color:var(--text-primary);">\${escHtml(p.actName)}</strong>
              <div style="color:#009cd7; font-size:10px; margin-top:2px;">🏛️ \${escHtml(p.process)} \${p.entity !== 'Non défini' ? '&bull; 👤 ' + escHtml(p.entity) : ''}</div>
            </div>
          \`).join('');
        }

        // Format Consumers chips
        let consChips = '';
        if (v.consumers.length === 0) {
          consChips = '<span style="color:var(--warn); font-style:italic; font-size:11px;">Aucun consommateur direct dans ce lot de processus</span>';
        } else {
          consChips = v.consumers.map(c => \`
            <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); border-radius:6px; padding:4px 8px; margin-bottom:4px; font-size:11px; display:inline-block; margin-right:4px;">
              <strong style="color:var(--text-primary);">\${escHtml(c.actName)}</strong>
              <div style="color:#009cd7; font-size:10px; margin-top:2px;">🏛️ \${escHtml(c.process)} \${c.entity !== 'Non défini' ? '&bull; 👤 ' + escHtml(c.entity) : ''}</div>
            </div>
          \`).join('');
        }

        // Flow diagram snippet
        const flowId = \`pmgFlowSnippet_\${vIdx}\`;

        rows += \`
          <tr style="background:\${rowBg}; border-bottom:1px solid var(--border-color); vertical-align:top;">
            <td style="padding:10px 12px; font-family:var(--font-mono, monospace); font-weight:700; color:var(--text-primary); font-size:12px; width:220px; word-break:break-all;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#009cd7;">📦</span>
                <span>\${escHtml(v.name)}</span>
              </div>
            </td>
            <td style="padding:10px 8px; width:170px; text-align:center;">
              \${v.statusBadge}
            </td>
            <td style="padding:10px 12px; width:35%;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); padding:1px 6px; border-radius:4px;">SORTIE / ÉCRITURE (\${v.producers.length})</span>
              </div>
              <div>\${prodChips}</div>
            </td>
            <td style="padding:10px 12px; width:35%;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:10px; font-weight:700; color:#3b82f6; background:rgba(59,130,246,0.15); padding:1px 6px; border-radius:4px;">ENTRÉE / LECTURE (\${v.consumers.length})</span>
              </div>
              <div>\${consChips}</div>
            </td>
          </tr>
        \`;
      });

      contentHtml = \`
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
                \${rows}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:var(--bg-card); border-top:1px solid var(--border-color); font-size:12px;">
            <div style="color:var(--text-secondary);">
              Affichage de <strong>\${(page - 1) * pageSize + 1}</strong> à <strong>\${Math.min(page * pageSize, filteredVars.length)}</strong> sur <strong>\${filteredVars.length}</strong> variables
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn-ghost" style="padding:3px 8px; font-size:11px;" \${page <= 1 ? 'disabled' : ''} onclick="window.pmgIoCrossState.page--; window.renderPmgIoCrossMatrix('\${containerId}');">
                &larr; Précédent
              </button>
              <span style="font-weight:700; color:var(--text-primary); padding:0 4px;">Page \${page} / \${totalPages}</span>
              <button class="btn-ghost" style="padding:3px 8px; font-size:11px;" \${page >= totalPages ? 'disabled' : ''} onclick="window.pmgIoCrossState.page++; window.renderPmgIoCrossMatrix('\${containerId}');">
                Suivant &rarr;
              </button>
            </div>
          </div>
        </div>
      \`;
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
      headersHtml += \`
        <th style="padding:8px 10px; min-width:150px; max-width:180px; text-align:center; position:sticky; top:0; background:#002060; color:#fff; font-family:var(--font-mono, monospace); font-size:11px; z-index:5; border-left:1px solid rgba(255,255,255,0.15); word-break:break-word;">
          <div style="font-weight:700; color:#fff;">\${escHtml(v.name)}</div>
          <div style="font-size:9.5px; opacity:0.8; font-weight:normal; margin-top:2px;">\${v.producers.length} prod / \${v.consumers.length} cons</div>
        </th>
      \`;
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

      matrixRowsHtml += \`
        <tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:8px 12px; position:sticky; left:0; background:var(--bg-card); font-weight:600; z-index:2; border-right:2px solid var(--border-color); min-width:240px; max-width:280px;">
            <div style="font-size:11.5px; color:var(--text-primary); font-weight:700;">\${escHtml(act.name)}</div>
            <div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">
              🏛️ <strong style="color:#009cd7;">\${escHtml(parentProc)}</strong> &bull; \${escHtml(act.entity || '')}
            </div>
          </td>
          \${cells}
        </tr>
      \`;
    });

    contentHtml = \`
      <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow:hidden; background:var(--bg-card);">
        \${hasMore ? \`
          <div style="background:#FEF3C7; color:#92400E; padding:8px 12px; font-size:11.5px; font-weight:600; border-bottom:1px solid #FDE68A; display:flex; align-items:center; justify-content:space-between;">
            <span>ℹ️ Affichage des 30 premières variables sur \${filteredVars.length}. Utilisez le filtre de recherche ci-dessus pour cibler des variables spécifiques.</span>
            <button class="btn-ghost" style="padding:2px 8px; font-size:11px; background:#fff;" onclick="window.setPmgIoCrossViewMode('lineage')">Basculer en Vue Lignage Complète</button>
          </div>
        \` : ''}
        <div style="max-height:560px; overflow:auto;">
          <table style="width:max-content; min-width:100%; font-size:11.5px; border-collapse:separate; border-spacing:0;">
            <thead>
              <tr>\${headersHtml}</tr>
            </thead>
            <tbody>
              \${matrixRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    \`;
  }

  // 4. Overall Layout Construction
  const html = \`
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
            <div style="font-size:16px; font-weight:800; color:var(--text-primary);">\${totalVars}</div>
          </div>
          <div style="background:rgba(16,185,129,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#10b981; font-weight:700;">✅ Flux Valides</div>
            <div style="font-size:16px; font-weight:800; color:#10b981;">\${completeCount}</div>
          </div>
          <div style="background:rgba(59,130,246,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(59,130,246,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#2563eb; font-weight:700;">📥 Entrées Initiales</div>
            <div style="font-size:16px; font-weight:800; color:#2563eb;">\${noProducerCount}</div>
          </div>
          <div style="background:rgba(245,158,11,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(245,158,11,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#d97706; font-weight:700;">⚠️ Sorties Non Lues</div>
            <div style="font-size:16px; font-weight:800; color:#d97706;">\${deadOutputCount}</div>
          </div>
          <div style="background:rgba(139,92,246,0.06); padding:6px 12px; border-radius:8px; border:1px solid rgba(139,92,246,0.25); text-align:center;">
            <div style="font-size:10px; text-transform:uppercase; color:#7c3aed; font-weight:700;">🔄 Inter-Processus</div>
            <div style="font-size:16px; font-weight:800; color:#7c3aed;">\${interProcessCount}</div>
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
            value="\${escHtml(state.search)}"
            oninput="window.onPmgIoCrossSearch(this.value)"
            style="width:100%; height:36px; font-size:12px; padding-left:12px; border-radius:6px;">
        </div>

        <!-- Filter Statut -->
        <select class="srch"
          onchange="window.setPmgIoCrossFilter('statusFilter', this.value)"
          style="height:36px; font-size:12px; min-width:180px; border-radius:6px;">
          <option value="all" \${state.statusFilter === 'all' ? 'selected' : ''}>🎯 Tous les statuts (\${totalVars})</option>
          <option value="complete" \${state.statusFilter === 'complete' ? 'selected' : ''}>✅ Flux Valides (\${completeCount})</option>
          <option value="no_producer" \${state.statusFilter === 'no_producer' ? 'selected' : ''}>📥 Entrées Initiales (\${noProducerCount})</option>
          <option value="dead_output" \${state.statusFilter === 'dead_output' ? 'selected' : ''}>⚠️ Sorties Non Relues (\${deadOutputCount})</option>
          <option value="inter_process" \${state.statusFilter === 'inter_process' ? 'selected' : ''}>🔄 Inter-Processus (\${interProcessCount})</option>
        </select>

        <!-- Filter Process -->
        <select class="srch"
          onchange="window.setPmgIoCrossFilter('processFilter', this.value)"
          style="height:36px; font-size:12px; min-width:180px; border-radius:6px;">
          <option value="all" \${state.processFilter === 'all' ? 'selected' : ''}>🏛️ Tous les Processus Parent</option>
          \${allProcessNames.map(p => \`<option value="\${escHtml(p)}" \${state.processFilter === p ? 'selected' : ''}>\${escHtml(p)}</option>\`).join('')}
        </select>

        <!-- View Switcher (Lineage Cards vs 2D Matrix) -->
        <div style="display:flex; border:1px solid var(--border-color); border-radius:6px; overflow:hidden; height:36px;">
          <button style="padding:0 12px; font-size:11.5px; font-weight:700; border:none; cursor:pointer; background:\${state.viewMode === 'lineage' ? 'var(--brand-primary)' : 'var(--bg-hover)'}; color:\${state.viewMode === 'lineage' ? '#fff' : 'var(--text-primary)'};"
            onclick="window.setPmgIoCrossViewMode('lineage')">
            📋 Vue Dictionnaire &amp; Lignage
          </button>
          <button style="padding:0 12px; font-size:11.5px; font-weight:700; border:none; border-left:1px solid var(--border-color); cursor:pointer; background:\${state.viewMode === 'matrix' ? 'var(--brand-primary)' : 'var(--bg-hover)'}; color:\${state.viewMode === 'matrix' ? '#fff' : 'var(--text-primary)'};"
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
    \${contentHtml}
  \`;

  container.innerHTML = html;
};
`;

// Replace renderPmgIoCrossMatrix in pmg.js
const oldIoCrossStart = "window.renderPmgIoCrossMatrix = function(";
const oldIoCrossEnd = "window.exportPmgMultiSheetExcel = function() {";

const ioStartIdx = pmgCode.indexOf(oldIoCrossStart);
const ioEndIdx = pmgCode.indexOf(oldIoCrossEnd);

if (ioStartIdx === -1 || ioEndIdx === -1) {
  console.error("Could not find renderPmgIoCrossMatrix boundaries");
  process.exit(1);
}

pmgCode = pmgCode.substring(0, ioStartIdx) + newIoCrossCode + '\n\n' + pmgCode.substring(ioEndIdx);

fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log("🎉 Successfully updated renderPmgIoCrossMatrix with intelligent lineage view, advanced filters, and readable 2D matrix!");
