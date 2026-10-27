const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');

let indexContent = fs.readFileSync(indexPath, 'utf8');
const isCRLF = indexContent.includes('\r\n');
const newline = isCRLF ? '\r\n' : '\n';

const oldMatrixThead = `              <table id="pmgMatrixTable">
                <thead>
                  <tr>
                    <th style="width: 15%">Activité / Call Activity</th>
                    <th style="width: 12%">Type de composant</th>
                    <th style="width: 15%">Entité réalisatrice</th>
                    <th style="width: 15%">Inputs (Entrées)</th>
                    <th style="width: 15%">Outputs (Sorties)</th>
                    <th style="width: 14%">Applicable dans quel cas ?</th>
                    <th style="width: 14%">Commentaire</th>
                  </tr>
                </thead>`.replace(/\r?\n/g, newline);

const newMatrixThead = `              <table id="pmgMatrixTable" style="border-collapse: separate; border-spacing: 0;">
                <thead style="position: sticky; top: 0; z-index: 5; background: var(--bg-card);">
                  <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                    <th style="width: 22%">Activité / Call Activity</th>
                    <th style="width: 12%">Type BPMN</th>
                    <th style="width: 14%">Entité réalisatrice</th>
                    <th style="width: 14%">Inputs (Entrées)</th>
                    <th style="width: 14%">Outputs (Sorties)</th>
                    <th style="width: 12%">Applicable dans quel cas ?</th>
                    <th style="width: 12%">Commentaire</th>
                  </tr>
                  <tr class="pmg-col-filter-row">
                    <th>
                      <div class="pmg-col-filter-input-wrap">
                        <input type="text" id="pmgMatrixFilterColAct" class="pmg-col-filter-input" placeholder="🔍 Nom ou ID..." oninput="onPmgMatrixColFilterChange()">
                        <button class="pmg-col-filter-clear" onclick="clearPmgMatrixColFilter('act')">×</button>
                      </div>
                    </th>
                    <th>
                      <select id="pmgMatrixFilterColType" class="pmg-col-filter-select" onchange="onPmgMatrixColFilterChange()">
                        <option value="all">Tous types</option>
                      </select>
                    </th>
                    <th>
                      <select id="pmgMatrixFilterColEntity" class="pmg-col-filter-select" onchange="onPmgMatrixColFilterChange()">
                        <option value="all">Toutes entités</option>
                      </select>
                    </th>
                    <th>
                      <div class="pmg-col-filter-input-wrap">
                        <input type="text" id="pmgMatrixFilterColIn" class="pmg-col-filter-input" placeholder="🔍 Variable in..." oninput="onPmgMatrixColFilterChange()">
                        <button class="pmg-col-filter-clear" onclick="clearPmgMatrixColFilter('in')">×</button>
                      </div>
                    </th>
                    <th>
                      <div class="pmg-col-filter-input-wrap">
                        <input type="text" id="pmgMatrixFilterColOut" class="pmg-col-filter-input" placeholder="🔍 Variable out..." oninput="onPmgMatrixColFilterChange()">
                        <button class="pmg-col-filter-clear" onclick="clearPmgMatrixColFilter('out')">×</button>
                      </div>
                    </th>
                    <th>
                      <div class="pmg-col-filter-input-wrap">
                        <input type="text" id="pmgMatrixFilterColCase" class="pmg-col-filter-input" placeholder="🔍 Condition..." oninput="onPmgMatrixColFilterChange()">
                        <button class="pmg-col-filter-clear" onclick="clearPmgMatrixColFilter('case')">×</button>
                      </div>
                    </th>
                    <th>
                      <div class="pmg-col-filter-input-wrap">
                        <input type="text" id="pmgMatrixFilterColComment" class="pmg-col-filter-input" placeholder="🔍 Commentaire..." oninput="onPmgMatrixColFilterChange()">
                        <button class="pmg-col-filter-clear" onclick="clearPmgMatrixColFilter('comment')">×</button>
                      </div>
                    </th>
                  </tr>
                </thead>`.replace(/\r?\n/g, newline);

if (indexContent.includes(oldMatrixThead)) {
  indexContent = indexContent.replace(oldMatrixThead, newMatrixThead);
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('✅ Replaced matrix thead in index.html');
} else {
  console.error('❌ Could not find oldMatrixThead in index.html');
}

// Update pmg.js for matrix column filtering logic
let pmgContent = fs.readFileSync(pmgPath, 'utf8');

const matrixFilterHelpers = `
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
`;

const newRenderPmgMatrix = `window.renderPmgMatrix = function() {
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

    const groupVal = act.userGroup || '';
    const groupBadge = groupVal ? '<div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">👤 <code>' + esc(groupVal) + '</code></div>' : '';
    
    return \`
      <tr>
        <td style="padding-left: \${indent + 8}px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px;">
            <span class="pmg-order-pill" title="Index séquentiel \${window.pmgActivityOrderMode}">#\${act.orderIndex || (idx + 1)}</span>
            \${arrow}
            <strong style="color:var(--text-primary); font-weight:600; font-size:12.5px;">\${esc(act.name)}</strong>
            <span class="pmg-parent-badge">🏛️ \${esc(parentName)}</span>
            \${sharedHtml}
          </div>
          <div class="mono" style="font-size:10px;color:var(--text-tertiary); padding-left:\${indent > 0 ? 18 : 0}px;">id: \${act.id}</div>
        </td>
        <td>
          <span class="badge-bpmn \${badgeClass}">\${esc(act.typeLabel || act.type)}</span>
        </td>
        <td>
          <span class="badge badge-process" style="padding: 4px 8px; border-radius: 4px;">\${esc(act.entity || 'Non défini')}</span>
          \${groupBadge}
        </td>
        <td>\${inputsHtml}</td>
        <td>\${outputsHtml}</td>
        <td>\${esc(act.applicableCase || '—')}</td>
        <td style="max-width: 250px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">
          \${esc(act.comment || '—')}
        </td>
      </tr>
    \`;
  }).join('');
};`;

const oldMatrixSection = pmgContent.substring(
  pmgContent.indexOf('window.renderPmgMatrix = function() {'),
  pmgContent.indexOf('window.exportPmgCSV = function() {')
);

pmgContent = pmgContent.replace(oldMatrixSection, matrixFilterHelpers + '\n' + newRenderPmgMatrix + '\n\n');
fs.writeFileSync(pmgPath, pmgContent, 'utf8');
console.log('🎉 Successfully patched matrix filters in pmg.js!');
