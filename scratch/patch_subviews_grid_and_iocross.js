const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

// 1. Fix switchPmgSubView function to properly map all button and section IDs
const newSwitchPmgSubView = `window.switchPmgSubView = function(viewKey) {
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
};`;

// 2. Enhance renderPmgGlobalGridTable
const newRenderPmgGlobalGridTable = `window.renderPmgGlobalGridTable = function(containerId = 'pmgMatrixGlobalGridContainer') {
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
      modeOptsHtml += \`<option value="\${escAttr(m)}" \${sel}>\${escHtml(m)}</option>\`;
    });

    const parentProc = act.parentProcessName || act.rootParentName || 'Parent';
    const cleanGroup = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(act.userGroup)
      : (act.userGroup || '');

    const inStr = Array.isArray(act.inputs) ? act.inputs.join(', ') : (act.inputs || '');
    const outStr = Array.isArray(act.outputs) ? act.outputs.join(', ') : (act.outputs || '');

    rowsHtml += \`
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:6px; text-align:center; color:var(--text-tertiary); font-weight:700; width:45px;">#\${idx + 1}</td>
        <td style="padding:4px; min-width:180px;">
          <input type="text" value="\${escAttr(act.name)}" oninput="updatePmgGridCell(\${idx}, 'name', this.value)" style="width:100%; height:28px; font-size:11.5px; font-weight:600; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
          <div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">id: <code>\${escHtml(act.id)}</code> &bull; 🏛️ \${escHtml(parentProc)}</div>
        </td>
        <td style="padding:4px; width:110px;">
          <span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:rgba(0,156,215,0.1); color:var(--brand-primary); font-weight:600; display:inline-block;">\${escHtml(act.typeLabel || act.type)}</span>
        </td>
        <td style="padding:4px; min-width:130px;">
          <input type="text" value="\${escAttr(act.entity || '')}" placeholder="Entité..." oninput="updatePmgGridCell(\${idx}, 'entity', this.value)" style="width:100%; height:28px; font-size:11.5px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="\${escAttr(cleanGroup)}" placeholder="Groupe..." oninput="updatePmgGridCell(\${idx}, 'userGroup', this.value)" style="width:100%; height:28px; font-size:11.5px; font-family:var(--font-mono); border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="\${escAttr(inStr)}" placeholder="Inputs (séparés par virgule)..." oninput="updatePmgGridCell(\${idx}, 'inputs', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:#1e40af; padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:140px;">
          <input type="text" value="\${escAttr(outStr)}" placeholder="Outputs..." oninput="updatePmgGridCell(\${idx}, 'outputs', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:#15803d; padding:2px 6px;">
        </td>
        <td style="padding:4px; width:120px;">
          <select onchange="updatePmgGridCell(\${idx}, 'realizationMode', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 4px;">
            \${modeOptsHtml}
          </select>
        </td>
        <td style="padding:4px; min-width:150px;">
          <input type="text" value="\${escAttr(act.applicableCase || '')}" placeholder="Condition..." oninput="updatePmgGridCell(\${idx}, 'applicableCase', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:2px 6px;">
        </td>
        <td style="padding:4px; min-width:160px;">
          <input type="text" value="\${escAttr(act.comment || '')}" placeholder="Documentation..." oninput="updatePmgGridCell(\${idx}, 'comment', this.value)" style="width:100%; height:28px; font-size:11px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-secondary); padding:2px 6px;">
        </td>
      </tr>
    \`;
  });

  const html = \`
    <div class="chart-card" style="padding:16px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            🩻 Grille Rapide d'Édition Tableur (\${activities.length} activités)
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
          \${rowsHtml}
        </tbody>
      </table>
    </div>
  \`;

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
};`;

// 3. Enhance renderPmgIoCrossMatrix
const newRenderPmgIoCrossMatrix = `window.renderPmgIoCrossMatrix = function(containerId = 'pmgIoCrossContainer') {
  let container = document.getElementById(containerId);
  if (!container) container = document.getElementById('pmgIoCrossContainer');
  if (!container) return;

  const activities = (window.pmgActivities && window.pmgActivities.length > 0)
    ? window.pmgActivities
    : (window.pmgTempSubprocesses || []);

  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-tertiary);"><span style="font-size:24px;">🔄</span><br><br>Chargez des processus BPMN pour afficher la matrice croisée des flux.</div>';
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

  // 1. Collect all unique clean variables
  const varSet = new Set();
  activities.forEach(a => {
    (a.inputs || []).forEach(v => { const n = getCleanVar(v); if (n) varSet.add(n); });
    (a.outputs || []).forEach(v => { const n = getCleanVar(v); if (n) varSet.add(n); });
  });
  const variables = Array.from(varSet).sort();

  if (variables.length === 0) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-tertiary);"><span style="font-size:24px;">🔄</span><br><br>Aucune variable d\\'entrée ou de sortie détectée dans le lot BPMN.</div>';
    return;
  }

  // 2. Map producers & consumers
  const producersMap = new Map();
  const consumersMap = new Map();

  variables.forEach(v => {
    producersMap.set(v, []);
    consumersMap.set(v, []);
  });

  activities.forEach(a => {
    (a.inputs || []).forEach(inVar => {
      const v = getCleanVar(inVar);
      if (consumersMap.has(v)) consumersMap.get(v).push(a.name);
    });
    (a.outputs || []).forEach(outVar => {
      const v = getCleanVar(outVar);
      if (producersMap.has(v)) producersMap.get(v).push(a.name);
    });
  });

  let neverConsumedCount = 0;
  let noProducerCount = 0;
  variables.forEach(v => {
    if (producersMap.get(v).length > 0 && consumersMap.get(v).length === 0) neverConsumedCount++;
    if (consumersMap.get(v).length > 0 && producersMap.get(v).length === 0) noProducerCount++;
  });

  // 3. Build Table Headers
  let headersHtml = '<th style="padding:10px 8px; min-width:220px; text-align:left; position:sticky; left:0; top:0; background:#002060; color:#fff; z-index:10; border-right:2px solid #001233;">Activité BPMN (Ligne)</th>';
  variables.forEach(v => {
    headersHtml += '<th style="padding:8px 6px; min-width:120px; text-align:center; position:sticky; top:0; background:#002060; color:#fff; font-family:var(--font-mono, monospace); font-size:11px; z-index:5; border-left:1px solid rgba(255,255,255,0.15);">' + escHtml(v) + '</th>';
  });

  // 4. Build Table Rows
  let rowsHtml = '';
  activities.forEach((act, idx) => {
    const inSet = new Set((act.inputs || []).map(getCleanVar));
    const outSet = new Set((act.outputs || []).map(getCleanVar));
    const parentProc = act.parentProcessName || act.rootParentName || 'Parent';

    let cellsHtml = '';
    variables.forEach(v => {
      const isIn = inSet.has(v);
      const isOut = outSet.has(v);

      if (isIn && isOut) {
        cellsHtml += '<td style="padding:6px; text-align:center; background:rgba(99,102,241,0.06); border-left:1px solid var(--border-color);"><span style="font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px; background:#6366f1; color:#fff;" title="Transformateur : Reçoit en entrée et produit en sortie">E/S</span></td>';
      } else if (isOut) {
        cellsHtml += '<td style="padding:6px; text-align:center; background:rgba(16,185,129,0.06); border-left:1px solid var(--border-color);"><span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; background:#10b981; color:#fff;" title="Producteur (Sortie)">🟢 Sortie</span></td>';
      } else if (isIn) {
        cellsHtml += '<td style="padding:6px; text-align:center; background:rgba(59,130,246,0.06); border-left:1px solid var(--border-color);"><span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; background:#3b82f6; color:#fff;" title="Consommateur (Entrée)">🔵 Entrée</span></td>';
      } else {
        cellsHtml += '<td style="padding:6px; text-align:center; color:var(--text-tertiary); opacity:0.4; border-left:1px solid var(--border-color);">&mdash;</td>';
      }
    });

    rowsHtml += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding:8px 10px; position:sticky; left:0; background:var(--bg-card); font-weight:600; z-index:2; border-right:2px solid var(--border-color);">
          <div style="font-size:12px; color:var(--text-primary); font-weight:700;">\${escHtml(act.name)}</div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">
            id: <code>\${escHtml(act.id)}</code> &bull; <em style="color:#009cd7;">🏛️ \${escHtml(parentProc)}</em>
          </div>
        </td>
        \${cellsHtml}
      </tr>
    \`;
  });

  const html = \`
    <!-- En-tête et Métriques -->
    <div class="chart-card" style="padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            🔄 Matrice Croisée Flux de Données &amp; Traçabilité Lignage (Producer-Consumer Matrix)
          </h4>
          <div style="font-size:12px; color:var(--text-secondary);">
            Visualisez instantanément qui produit (🟢 Sortie) et qui consomme (🔵 Entrée) chaque variable pour sécuriser le lignage.
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            Variables Détectées : <strong>\${variables.length}</strong>
          </div>
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            📤 Sorties Non Consommées : <strong style="color:var(--warn);">\${neverConsumedCount}</strong>
          </div>
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            📥 Entrées Initiales : <strong style="color:var(--ok);">\${noProducerCount}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau Croisé -->
    <div class="tbl-wrap" style="max-height:560px; overflow:auto; border:1px solid var(--border-color); border-radius:var(--border-radius-md); background:var(--bg-card);">
      <table style="width:100%; font-size:11.5px; border-collapse:separate; border-spacing:0;">
        <thead>
          <tr>
            \${headersHtml}
          </tr>
        </thead>
        <tbody>
          \${rowsHtml}
        </tbody>
      </table>
    </div>
  \`;

  container.innerHTML = html;
};`;

// Replace in pmgCode
const oldGridAndSwitch = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgGlobalGridTable = function() {'),
  pmgCode.indexOf('window.autoFillPmgMissingDoc = function() {')
);

pmgCode = pmgCode.replace(oldGridAndSwitch, newRenderPmgGlobalGridTable + '\n\n' + newSwitchPmgSubView + '\n\n');

const oldIoCross = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgIoCrossMatrix = function('),
  pmgCode.indexOf('window.exportPmgMultiSheetExcel = function() {')
);

pmgCode = pmgCode.replace(oldIoCross, newRenderPmgIoCrossMatrix + '\n\n');

fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log('🎉 Successfully patched switchPmgSubView, renderPmgGlobalGridTable, and renderPmgIoCrossMatrix!');
