const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

// 1. Update renderPmgStep3ManualTable (Step 4 table) to ALWAYS show parentProcessName
const oldStep3TableContent = `    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '└─ ' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px;">id: <code>\${escHtml(act.id)}</code></div>
        </td>`;

const newStep3TableContent = `    const parentProcLabel = act.parentProcessName || act.rootParentName || 'Processus Principal';
    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px; margin-top:2px;">
            id: <code>\${escHtml(act.id)}</code> • <em style="color:#009cd7; font-weight:500;">🏛️ \${escHtml(parentProcLabel)}</em>
          </div>
        </td>`;

if (pmgCode.includes(oldStep3TableContent)) {
  pmgCode = pmgCode.replace(oldStep3TableContent, newStep3TableContent);
  console.log('✅ Updated Step 4 table to always display parent process name!');
} else {
  console.error('❌ Could not find oldStep3TableContent');
}

// 2. Update renderPmgStep4ManualTable (Step 5 table) to ALWAYS show parentProcessName
const oldStep4TableContent = `    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '└─ ' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px;">id: <code>\${escHtml(act.id)}</code></div>
        </td>`;

const newStep4TableContent = `    const parentProcLabel = act.parentProcessName || act.rootParentName || 'Processus Principal';
    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px; margin-top:2px;">
            id: <code>\${escHtml(act.id)}</code> • <em style="color:#009cd7; font-weight:500;">🏛️ \${escHtml(parentProcLabel)}</em>
          </div>
        </td>`;

if (pmgCode.includes(oldStep4TableContent)) {
  pmgCode = pmgCode.replace(oldStep4TableContent, newStep4TableContent);
  console.log('✅ Updated Step 5 table to always display parent process name!');
} else {
  console.error('❌ Could not find oldStep4TableContent');
}

// 3. Rebuild renderPmgDataLineageAudit with rich explanations, deduplication and smart categorization
const newAuditLogic = `
window.renderPmgDataLineageAudit = function() {
  const container = document.getElementById('pmgDataLineageAuditContainer');
  if (!container) return;

  const activities = (window.pmgTempSubprocesses && window.pmgTempSubprocesses.length > 0)
    ? window.pmgTempSubprocesses
    : (window.pmgActivities || []);

  if (activities.length === 0) {
    container.innerHTML = '<span style="color:var(--text-tertiary);">Aucune activité chargée pour analyser le lignage.</span>';
    return;
  }

  function getCleanVarName(str) {
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

  function suggestCamelCase(v) {
    if (!v) return '';
    let s = v.replace(/^[._\\-]+/, ''); // remove leading underscores/dots
    s = s.replace(/[\\s_\\-]+(.)/g, (_, c) => c.toUpperCase());
    s = s.replace(/^[A-Z]/, c => c.toLowerCase());
    return s || v;
  }

  const allInputs = new Map(); // varName -> Array of { actName, parentProc }
  const allOutputs = new Map(); // varName -> Array of { actName, parentProc }
  const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;

  activities.forEach(act => {
    const parentProc = act.parentProcessName || act.rootParentName || 'Processus';
    (act.inputs || []).forEach(i => {
      const v = getCleanVarName(i);
      if (v && v.length > 0) {
        if (!allInputs.has(v)) allInputs.set(v, []);
        allInputs.get(v).push({ actName: act.name, parentProc });
      }
    });
    (act.outputs || []).forEach(o => {
      const v = getCleanVarName(o);
      if (v && v.length > 0) {
        if (!allOutputs.has(v)) allOutputs.set(v, []);
        allOutputs.get(v).push({ actName: act.name, parentProc });
      }
    });
  });

  const orphanInputs = [];
  const unusedOutputs = [];
  const namingIssues = [];

  // Detect Orphan Inputs & Categorize Reason
  allInputs.forEach((consumersList, v) => {
    if (!allOutputs.has(v)) {
      // Deduplicate consumer names
      const uniqueConsumers = Array.from(new Set(consumersList.map(c => c.actName)));
      const uniqueParents = Array.from(new Set(consumersList.map(c => c.parentProc)));

      // Intelligent Reason Classification
      let category = 'risk';
      let reasonLabel = '⚠️ Non initialisée en amont (Risque d\\'exécution)';
      let badgeStyle = 'background:rgba(239, 68, 68, 0.1); color:var(--err); border:1px solid rgba(239, 68, 68, 0.25);';

      const vLower = v.toLowerCase();
      if (vLower.includes('id') || vLower.includes('dossier') || vLower.includes('site') || vLower.includes('demande') || vLower.includes('projet') || vLower.includes('client') || vLower.includes('token') || vLower.includes('auth')) {
        category = 'payload_start';
        reasonLabel = '🌟 Payload d\\'Initialisation (Start Event / API)';
        badgeStyle = 'background:rgba(59, 130, 246, 0.1); color:var(--brand-primary); border:1px solid rgba(59, 130, 246, 0.25);';
      } else if (vLower.includes('loop') || vLower.includes('count') || vLower.includes('index') || vLower.includes('iteration') || vLower.includes('missing') || vLower.includes('flag')) {
        category = 'context_loop';
        reasonLabel = '🔄 Variable de Contexte / Boucle Zeebe';
        badgeStyle = 'background:rgba(99, 102, 241, 0.1); color:#6366f1; border:1px solid rgba(99, 102, 241, 0.25);';
      }

      orphanInputs.push({
        varName: v,
        consumers: uniqueConsumers,
        parents: uniqueParents,
        category,
        reasonLabel,
        badgeStyle
      });
    }

    if (!camelCaseRegex.test(v)) {
      let problem = 'Format non-camelCase';
      if (v.includes(' ')) problem = 'Espaces interdits';
      else if (v.startsWith('_') || v.startsWith('.')) problem = 'Préfixe spécial non recommandé';
      else if (v.includes('_')) problem = 'snake_case détecté';
      else if (/^[A-Z]/.test(v)) problem = 'PascalCase / Majuscule initiale';

      namingIssues.push({
        varName: v,
        problem,
        suggestion: suggestCamelCase(v)
      });
    }
  });

  // Detect Unused Outputs & Categorize Reason
  allOutputs.forEach((producersList, v) => {
    if (!allInputs.has(v)) {
      const uniqueProducers = Array.from(new Set(producersList.map(p => p.actName)));
      const uniqueParents = Array.from(new Set(producersList.map(p => p.parentProc)));

      let category = 'unused';
      let reasonLabel = '📊 Donnée d\\'Audit / Stockage d\\'instance';
      let badgeStyle = 'background:rgba(245, 158, 11, 0.1); color:var(--warn); border:1px solid rgba(245, 158, 11, 0.25);';

      const vLower = v.toLowerCase();
      if (vLower.includes('statut') || vLower.includes('result') || vLower.includes('accord') || vLower.includes('rapport') || vLower.includes('pv') || vLower.includes('output') || vLower.includes('ack') || vLower.includes('code') || vLower.includes('valide')) {
        category = 'payload_end';
        reasonLabel = '📤 Livrable Final / Payload Exporté';
        badgeStyle = 'background:rgba(16, 185, 129, 0.1); color:var(--ok); border:1px solid rgba(16, 185, 129, 0.25);';
      }

      unusedOutputs.push({
        varName: v,
        producers: uniqueProducers,
        parents: uniqueParents,
        category,
        reasonLabel,
        badgeStyle
      });
    }

    if (!camelCaseRegex.test(v) && !namingIssues.some(n => n.varName === v)) {
      let problem = 'Format non-camelCase';
      if (v.includes(' ')) problem = 'Espaces interdits';
      else if (v.startsWith('_') || v.startsWith('.')) problem = 'Préfixe spécial non recommandé';
      else if (v.includes('_')) problem = 'snake_case détecté';
      else if (/^[A-Z]/.test(v)) problem = 'PascalCase / Majuscule initiale';

      namingIssues.push({
        varName: v,
        problem,
        suggestion: suggestCamelCase(v)
      });
    }
  });

  const totalFlows = allInputs.size + allOutputs.size;
  const criticalOrphans = orphanInputs.filter(o => o.category === 'risk').length;

  let html = \`
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:10px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">🔍</span>
        <div>
          <h5 style="margin:0; font-size:13.5px; font-weight:700; color:var(--text-primary);">
            Audit de Lignage &amp; Cohérence des Variables (\${totalFlows} variables déclarées)
          </h5>
          <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">
            Analyse sémantique du cycle de vie des données : entrées requises, sorties livrées et conformité BPMN.
          </div>
        </div>
      </div>
      <span style="font-size:11px; padding:3px 10px; border-radius:12px; \${criticalOrphans === 0 ? 'background:rgba(16, 185, 129, 0.12); color:var(--ok); border:1px solid rgba(16, 185, 129, 0.3);' : 'background:rgba(239, 68, 68, 0.12); color:var(--err); border:1px solid rgba(239, 68, 68, 0.3);'} font-weight:700;">
        \${criticalOrphans === 0 ? '✅ Flux de Données Équilibré' : '⚠️ ' + criticalOrphans + ' Entrée(s) Non Initialisée(s)'}
      </span>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
  \`;

  // 1. ORPHAN INPUTS CARD
  html += \`
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>🔴 Variables d'Entrée Consommées (\${orphanInputs.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Non produites localement</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  \`;

  if (orphanInputs.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ Toutes les variables consommées sont produites en amont par d\\'autres tâches !</div>';
  } else {
    orphanInputs.forEach(item => {
      const consumersPreview = item.consumers.slice(0, 2).join(', ');
      const extraCount = item.consumers.length - 2;
      const extraText = extraCount > 0 ? \` <span style="color:var(--brand-primary); cursor:pointer;" title="\${escAttr(item.consumers.join(', '))}">+ \${extraCount} autre(s)</span>\` : '';
      const parentName = item.parents.slice(0, 2).join(', ');

      html += \`
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
            <code style="color:var(--text-primary); font-weight:700; font-size:12px; background:rgba(0,156,215,0.08); padding:1px 5px; border-radius:4px;">\${escHtml(item.varName)}</code>
            <span style="font-size:10px; padding:1px 6px; border-radius:10px; font-weight:600; \${item.badgeStyle}">\${item.reasonLabel}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            <strong>Consommée par :</strong> \${escHtml(consumersPreview)}\${extraText}
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">
            🏛️ <em>\${escHtml(parentName)}</em>
          </div>
        </div>
      \`;
    });
  }
  html += '</div></div>';

  // 2. UNUSED OUTPUTS CARD
  html += \`
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>🟡 Variables de Sortie Générées (\${unusedOutputs.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Non consommées en interne</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  \`;

  if (unusedOutputs.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ Toutes les variables générées sont consommées par des tâches en aval !</div>';
  } else {
    unusedOutputs.forEach(item => {
      const producersPreview = item.producers.slice(0, 2).join(', ');
      const extraCount = item.producers.length - 2;
      const extraText = extraCount > 0 ? \` <span style="color:var(--brand-primary); cursor:pointer;" title="\${escAttr(item.producers.join(', '))}">+ \${extraCount} autre(s)</span>\` : '';
      const parentName = item.parents.slice(0, 2).join(', ');

      html += \`
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
            <code style="color:var(--text-primary); font-weight:700; font-size:12px; background:rgba(245,158,11,0.08); padding:1px 5px; border-radius:4px;">\${escHtml(item.varName)}</code>
            <span style="font-size:10px; padding:1px 6px; border-radius:10px; font-weight:600; \${item.badgeStyle}">\${item.reasonLabel}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            <strong>Produite par :</strong> \${escHtml(producersPreview)}\${extraText}
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">
            🏛️ <em>\${escHtml(parentName)}</em>
          </div>
        </div>
      \`;
    });
  }
  html += '</div></div>';

  // 3. NAMING CONVENTIONS CARD
  html += \`
    <div style="background:var(--bg-card); padding:14px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column;">
      <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>💡 Conventions &amp; Qualité du Nommage (\${namingIssues.length})</span>
        <span style="font-size:10.5px; color:var(--text-tertiary);">Recommandations camelCase</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); flex:1; max-height:220px; overflow-y:auto; padding-right:4px;">
  \`;

  if (namingIssues.length === 0) {
    html += '<div style="color:var(--ok); padding:15px 0; text-align:center;">✨ 100% des variables respectent la norme <code>camelCase</code> !</div>';
  } else {
    namingIssues.forEach(item => {
      html += \`
        <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <code style="color:var(--err); font-weight:700;">\${escHtml(item.varName)}</code>
            <span style="font-size:10px; color:var(--text-tertiary); font-style:italic;">\${escHtml(item.problem)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">
            Correction suggérée : <strong style="color:var(--ok); font-family:var(--font-mono);">\${escHtml(item.suggestion)}</strong>
          </div>
        </div>
      \`;
    });
  }
  html += '</div></div></div>';

  container.innerHTML = html;
};
`;

const oldAuditFunc = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgDataLineageAudit = function() {'),
  pmgCode.indexOf('window.renderPmgGlobalGridTable = function() {')
);

pmgCode = pmgCode.replace(oldAuditFunc, newAuditLogic + '\n\n');
fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log('🎉 Successfully saved updated pmg.js with intelligent lineage audit!');
