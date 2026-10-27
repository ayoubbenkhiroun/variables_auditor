const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let code = fs.readFileSync(pmgPath, 'utf8');

const oldMatrixStart = "window.renderPmgMatrix = function() {";
const oldMatrixEnd = "window.exportPmgCSV = function() {";

const newMatrix = `window.renderPmgMatrix = function() {
  const tbody = document.getElementById('pmgMatrixTableBody');
  const empty = document.getElementById('pmgMatrixEmptyMsg');
  
  if (!tbody) return;
  
  const filtered = (window.pmgActivities || []).filter(act => {
    if (pmgSearchQuery) {
      const nameMatch = (act.name || '').toLowerCase().includes(pmgSearchQuery);
      const idMatch = (act.id || '').toLowerCase().includes(pmgSearchQuery);
      const caseMatch = (act.applicableCase || '').toLowerCase().includes(pmgSearchQuery);
      const commentMatch = (act.comment || '').toLowerCase().includes(pmgSearchQuery);
      const parentMatch = (act.parentProcessName || act.rootParentName || '').toLowerCase().includes(pmgSearchQuery);
      if (!nameMatch && !idMatch && !caseMatch && !commentMatch && !parentMatch) return false;
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

    if (window.pmgParentFilter && window.pmgParentFilter !== 'all') {
      if (window.pmgParentFilter === 'shared_only') {
        if (!act.isSharedSubprocess) return false;
      } else {
        if (act.rootParentId !== window.pmgParentFilter && act.parentProcessId !== window.pmgParentFilter) return false;
      }
    }
    
    return true;
  });
  
  const countHint = document.getElementById('pmgMatrixRowCount');
  if (countHint) {
    const activeOrderObj = window.PMG_ORDER_MODES[window.pmgActivityOrderMode || 'flow'];
    const orderLabel = activeOrderObj ? activeOrderObj.label : 'Flux';
    countHint.innerHTML = \`<strong>\${filtered.length}</strong> / \${window.pmgActivities.length} activités affichées • Ordre actif : <span style="color:var(--brand-primary); font-weight:700;">\${orderLabel}</span>\`;
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
      ? \`<div class="pmg-io-container">\${act.inputs.map(i => \`<span class="badge-io badge-io-in" title="\${esc(i)}">\${esc(i)}</span>\`).join('')}</div>\` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune entrée</span>';
      
    const outputsHtml = (act.outputs || []).length > 0 
      ? \`<div class="pmg-io-container">\${act.outputs.map(o => \`<span class="badge-io badge-io-out" title="\${esc(o)}">\${esc(o)}</span>\`).join('')}</div>\` 
      : '<span style="color:var(--text-tertiary);font-size:11px;font-style:italic;">Aucune sortie</span>';
      
    let badgeClass = 'type-task';
    if (act.type === 'callactivity' || (act.typeLabel && act.typeLabel.toLowerCase().includes('sous-processus'))) badgeClass = 'type-subprocess';
    
    const indent = (act.level && act.level > 1) ? (act.level - 1) * 18 : 0;
    const arrow = indent > 0 ? '<span style="color:var(--brand-primary);margin-right:4px;font-family:sans-serif;">↳</span>' : '';
    const parentName = act.parentProcessName || act.rootParentName || 'Parent';

    let sharedHtml = '';
    if (act.isSharedSubprocess) {
      const pList = (act.sharedParentNames || []).join(', ') || 'Multi-parents';
      sharedHtml = \`<span class="pmg-shared-pill" style="margin-left:6px;" title="Sous-processus transversal appelé par : \${esc(pList)}">🔗 Partagé (\${esc(pList)})</span>\`;
    }
    
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
          <span class="badge-bpmn \${badgeClass}">\${act.typeLabel || act.type}</span>
        </td>
        <td>
          <span class="badge badge-process" style="padding: 4px 8px; border-radius: 4px;">\${esc(act.entity || 'Non défini')}</span>
        </td>
        <td>\${inputsHtml}</td>
        <td>\${outputsHtml}</td>
        <td>
          <textarea class="pmg-input pmg-case" data-id="\${act.id}" oninput="savePmgDetails()" placeholder="Ex: Si le client est éligible...">\${esc(act.applicableCase || '')}</textarea>
        </td>
        <td>
          <textarea class="pmg-input pmg-comment" data-id="\${act.id}" oninput="savePmgDetails()" placeholder="Ex: Revue manuelle N2...">\${esc(act.comment || '')}</textarea>
        </td>
      </tr>
    \`;
  }).join('');
};

`;

const startIdx = code.indexOf(oldMatrixStart);
const endIdx = code.indexOf(oldMatrixEnd);
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newMatrix + code.substring(endIdx);
  fs.writeFileSync(pmgPath, code, 'utf8');
  console.log('Successfully updated renderPmgMatrix in pmg.js!');
} else {
  console.error('Could not find renderPmgMatrix markers');
}
