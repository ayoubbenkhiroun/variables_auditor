const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');

let html = fs.readFileSync(indexPath, 'utf8');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

// 1. Update index.html
// Replace button in Step 3
const step3BtnOld = `<button class="btn-ghost" style="padding: 4px 8px; font-size: 11px;"
                      onclick="applyDefaultEntityToAllPmg()">Appliquer Entité par défaut à tous</button>`;

const step3BtnNew = `<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                      <button class="btn-ghost" style="padding: 4px 10px; font-size: 11.5px; color: var(--brand-primary); font-weight: 600; border: 1px solid var(--border-color);"
                        onclick="openPmgUserGroupMappingModal()">
                        👥 Configurer Mappage Groupes &amp; Pools/Lanes
                      </button>
                      <button class="btn-ghost" style="padding: 4px 8px; font-size: 11px;"
                        onclick="applyDefaultEntityToAllPmg()">Appliquer Entité par défaut à tous</button>
                    </div>`;

if (html.includes(step3BtnOld)) {
  html = html.replace(step3BtnOld, step3BtnNew);
}

// Add modalPmgUserGroupMapping
const userGroupModal = `<!-- Modal pour le Mappage Groupes Utilisateurs <-> Pools/Lanes & Entités -->
  <div class="modal" id="modalPmgUserGroupMapping"
    style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); z-index:9999; justify-content:center; align-items:center;">
    <div class="modal-content"
      style="background:var(--bg-card); border-radius:var(--border-radius-md); padding:24px; max-width:860px; width:92%; max-height:90vh; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 12px 36px rgba(0,0,0,0.45);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">👥</span>
          <div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin:0;">
              Mappage des Groupes Utilisateurs &amp; Entités Responsables (Lanes/Pools)
            </h3>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              Associez chaque groupe candidat BPMN à son Entité / Lane d'appartenance pour automatiser l'assignation et détecter les détachements transverses.
            </div>
          </div>
        </div>
        <button class="btn-ghost" onclick="closePmgUserGroupMappingModal()" style="padding:4px 10px; font-size:16px;">✕</button>
      </div>

      <div id="pmgUserGroupMappingModalBody" style="flex:1; overflow-y:auto; padding-right:4px; margin-bottom:16px;">
        <!-- Rempli dynamiquement par JS -->
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:14px; flex-wrap:wrap; gap:10px;">
        <div style="font-size:11.5px; color:var(--text-secondary);">
          💡 Ce mappage permet d'aligner les rôles opérationnels avec la structure organisationnelle (Lanes).
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-ghost" onclick="closePmgUserGroupMappingModal()">Fermer</button>
          <button class="btn-primary" style="padding:6px 16px; font-weight:600;" onclick="applyPmgUserGroupMappings()">
            🚀 Appliquer le Mappage à Toutes les User Tasks
          </button>
        </div>
      </div>
    </div>
  </div>

  `;

if (!html.includes('id="modalPmgUserGroupMapping"')) {
  html = html.replace('<div class="modal" id="modalPmgEditTreeNode"', userGroupModal + '<div class="modal" id="modalPmgEditTreeNode"');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('index.html updated with User Group Mapping modal & button!');

// 2. Update pmg.js
// Logic for User Group Mapping & Clean Lane extraction & Subprocess entity inheritance
const userGroupLogic = `
// =========================================================================
// PMG USER GROUP <-> POOL/LANE MAPPING & ENTITY INHERITANCE SYSTEM
// =========================================================================

window.pmgUserGroupMappings = {}; // Map of userGroupName -> { targetEntity: '...', isCustom: true }

window.openPmgUserGroupMappingModal = function() {
  const modal = document.getElementById('modalPmgUserGroupMapping');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgUserGroupMappingContent();
};

window.closePmgUserGroupMappingModal = function() {
  const modal = document.getElementById('modalPmgUserGroupMapping');
  if (modal) modal.style.display = 'none';
};

window.renderPmgUserGroupMappingContent = function() {
  const container = document.getElementById('pmgUserGroupMappingModalBody');
  if (!container) return;

  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  
  // 1. Collect all distinct user groups from user tasks
  const groupStats = new Map(); // groupName -> { count: N, associatedLanes: Set(), sampleActs: [] }
  const allKnownLanes = new Set();

  activities.forEach(act => {
    if (act.entity && act.entity !== 'Non défini') {
      allKnownLanes.add(act.entity);
    }
    const isUser = (act.type || '').toLowerCase().includes('user');
    if (isUser && act.userGroup && act.userGroup.trim().length > 0) {
      const gName = act.userGroup.trim();
      if (!groupStats.has(gName)) {
        groupStats.set(gName, { count: 0, associatedLanes: new Set(), sampleActs: [] });
      }
      const st = groupStats.get(gName);
      st.count++;
      if (act.entity && act.entity !== 'Non défini') st.associatedLanes.add(act.entity);
      if (st.sampleActs.length < 3) st.sampleActs.push(act.name);
    }
  });

  const lanesList = Array.from(allKnownLanes).sort();

  if (groupStats.size === 0) {
    container.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12.5px;">⚠️ Aucun groupe candidat (camunda:candidateGroups / zeebe:assignmentDefinition) n\\'a été trouvé sur les User Tasks du lot BPMN.</div>';
    return;
  }

  let rowsHtml = '';
  let rowIdx = 0;

  groupStats.forEach((st, gName) => {
    const currentMapped = window.pmgUserGroupMappings[gName]?.targetEntity || Array.from(st.associatedLanes)[0] || '';
    const lanesStr = Array.from(st.associatedLanes).join(', ') || '<span style="color:var(--text-tertiary); font-style:italic;">Aucune Lane</span>';

    // Build Lane/Pool datalist options
    let optionsHtml = '';
    lanesList.forEach(l => {
      optionsHtml += \`<option value="\${escAttr(l)}">\${escHtml(l)}</option>\`;
    });

    rowsHtml += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px 8px; vertical-align: middle;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">👤</span>
            <strong style="color:var(--text-primary); font-size:12.5px;">\${escHtml(gName)}</strong>
          </div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">Ex: \${escHtml(st.sampleActs.join(', '))}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; vertical-align: middle;">
          <span style="font-size:11.5px; font-weight:700; background:rgba(0, 156, 215, 0.1); color:var(--brand-primary); padding:2px 8px; border-radius:10px;">
            \${st.count} tâche(s)
          </span>
        </td>
        <td style="padding: 10px 8px; font-size:11.5px; color:var(--text-secondary); vertical-align: middle;">
          \${lanesStr}
        </td>
        <td style="padding: 8px 6px; vertical-align: middle;">
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" id="pmgMappedEntity_\${rowIdx}" list="pmgKnownLanesList" value="\${escAttr(currentMapped)}" placeholder="Saisir ou choisir une Lane / Entité..." style="flex:1; height:32px; font-size:12px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-primary); padding:4px 8px;" onchange="savePmgSingleGroupMapping('\${escAttr(gName)}', this.value)">
          </div>
        </td>
      </tr>
    \`;
    rowIdx++;
  });

  container.innerHTML = \`
    <datalist id="pmgKnownLanesList">
      \${lanesList.map(l => \`<option value="\${escAttr(l)}">\`).join('')}
    </datalist>

    <div style="margin-bottom:14px; background:rgba(99, 102, 241, 0.06); border:1px solid rgba(99, 102, 241, 0.25); border-radius:6px; padding:12px 16px; font-size:12px; color:var(--text-secondary); line-height:1.5;">
      💡 <strong>Gestion des Groupes Transverses &amp; Rôles Déportés :</strong> Si un groupe d'utilisateurs (ex: <em>Auditeurs_Fraude</em>) intervient sur une Lane différente de son entité de rattachement (ex: <em>Pôle Conformité</em>), spécifiez ici son <strong>Entité Référente</strong>. Vous pourrez ensuite appliquer cette règle à toutes les tâches correspondantes en 1 clic.
    </div>

    <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); overflow-x:auto; background:var(--bg-card);">
      <table style="width:100%; font-size:12px; border-collapse:collapse;">
        <thead>
          <tr style="background:var(--bg-card); border-bottom:1px solid var(--border-color); text-align:left;">
            <th style="padding:10px;">Groupe Utilisateur BPMN</th>
            <th style="padding:10px; width:100px; text-align:center;">Occurrences</th>
            <th style="padding:10px; width:220px;">Lanes BPMN actuelles</th>
            <th style="padding:10px; width:280px;">Entité / Lane de Rattachement Cible</th>
          </tr>
        </thead>
        <tbody>
          \${rowsHtml}
        </tbody>
      </table>
    </div>
  \`;
};

window.savePmgSingleGroupMapping = function(groupName, entityVal) {
  if (!groupName) return;
  window.pmgUserGroupMappings[groupName] = {
    targetEntity: (entityVal || '').trim(),
    isCustom: true
  };
};

window.applyPmgUserGroupMappings = function() {
  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  let updatedCount = 0;

  activities.forEach((act, idx) => {
    const isUser = (act.type || '').toLowerCase().includes('user');
    if (isUser && act.userGroup && act.userGroup.trim().length > 0) {
      const gName = act.userGroup.trim();
      const mapping = window.pmgUserGroupMappings[gName];
      if (mapping && mapping.targetEntity) {
        act.entity = mapping.targetEntity;
        const input = document.getElementById(\`pmgEntityInput_\${idx}\`);
        if (input) input.value = mapping.targetEntity;
        updatedCount++;
      }
    }
  });

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgStep3Kpis) window.renderPmgStep3Kpis();
  window.closePmgUserGroupMappingModal();
  alert(\`🚀 Mappage appliqué avec succès : \${updatedCount} tâche(s) utilisateur(s) mise(s) à jour avec leurs entités cibles.\`);
};
`;

// Insert userGroupLogic before renderPmgStep2ManualTable
if (!pmgCode.includes('window.openPmgUserGroupMappingModal =')) {
  pmgCode = pmgCode.replace('window.renderPmgStep2ManualTable = function() {', userGroupLogic + '\nwindow.renderPmgStep2ManualTable = function() {');
}

// 3. Update renderPmgStep2ManualTable in pmg.js
const oldStep2Table = `window.renderPmgStep2ManualTable = function() {
  const tbody = document.getElementById('pmgStep2ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\\'abord valider l\\'étape 1 pour charger les activités.</td></tr>';
    return;
  }

  let html = '';
  activities.forEach((act, idx) => {
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const entityVal = act.entity && act.entity !== 'Non défini' ? act.entity : '';
    const groupVal = act.userGroup || '';
    const hasGroup = groupVal.trim().length > 0;

    let groupCellHtml = '';
    if (isUserTask) {
      if (hasGroup) {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${idx}" value="\${escAttr(groupVal)}" placeholder="Ex: Validateurs_N1" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
            <span class="pmg-badge-ok" style="font-size:10px; width:fit-content;">👤 Groupe candidat défini</span>
          </div>
        \`;
      } else {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${idx}" class="pmg-input-warn" value="" placeholder="⚠️ Saisir le groupe candidat (ex: Gestionnaires_RH)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); padding: 4px 8px;">
            <span class="pmg-badge-warn" style="font-size:10px; width:fit-content;">⚠️ Warning : User Task sans groupe candidat</span>
          </div>
        \`;
      }
    } else {
      groupCellHtml = \`
        <input type="text" id="pmgGroupInput_\${idx}" value="" placeholder="— Non applicable (\${act.typeLabel || act.type})" readonly style="width: 100%; height: 32px; font-size: 11.5px; border-radius: var(--border-radius-md); border: 1px dashed var(--border-color); background: rgba(241, 245, 249, 0.6); color: #94a3b8; padding: 4px 8px; cursor:not-allowed;">
      \`;
    }

    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 14}px;">
            \${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 14}px;">id: <code>\${escHtml(act.id)}</code></div>
        </td>
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight:700; \${isUserTask ? 'background: rgba(234, 91, 12, 0.1); color: #ea5b0c; border: 1px solid rgba(234, 91, 12, 0.25);' : 'background: rgba(0, 156, 215, 0.1); color: #009cd7; border: 1px solid rgba(0, 156, 215, 0.25);'}">
            \${escHtml(act.typeLabel || act.type)}
          </span>
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          <input type="text" id="pmgEntityInput_\${idx}" value="\${escAttr(entityVal)}" placeholder="Ex: Direction Réseau / Lane" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
          \${entityVal ? \`<span class="pmg-badge-info" style="font-size:10px; margin-top:4px; width:fit-content;">🏢 Entité / Lane liée</span>\` : \`<span style="font-size:10px; color:#94a3b8; margin-top:4px; display:block;">Optionnel (à compléter)</span>\`}
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          \${groupCellHtml}
        </td>
      </tr>
    \`;
  });

  tbody.innerHTML = html;
};`;

const newStep2Table = `window.renderPmgStep2ManualTable = function() {
  const tbody = document.getElementById('pmgStep2ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\\'abord charger des activités.</td></tr>';
    return;
  }

  let html = '';
  activities.forEach((act, idx) => {
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const entityVal = act.entity && act.entity !== 'Non défini' ? act.entity : '';
    const groupVal = act.userGroup || '';
    const hasGroup = groupVal.trim().length > 0;

    // Check if group is mapped or transverse
    let groupExtraBadge = '';
    if (isUserTask && hasGroup) {
      const mapping = window.pmgUserGroupMappings[groupVal.trim()];
      if (mapping && mapping.targetEntity && mapping.targetEntity !== entityVal) {
        groupExtraBadge = \`<span style="background:rgba(245, 158, 11, 0.12); color:var(--warn); padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(245, 158, 11, 0.25);" title="Le groupe \${escAttr(groupVal)} est rattaché à l\\'entité \${escAttr(mapping.targetEntity)}">⚠️ Transverse : Rattaché à \${escHtml(mapping.targetEntity)}</span>\`;
      }
    }

    let groupCellHtml = '';
    if (isUserTask) {
      if (hasGroup) {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${idx}" value="\${escAttr(groupVal)}" placeholder="Ex: Validateurs_N1" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
              <span class="pmg-badge-ok" style="font-size:10px; width:fit-content;">👤 Groupe candidat défini</span>
              \${groupExtraBadge}
            </div>
          </div>
        \`;
      } else {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${idx}" class="pmg-input-warn" value="" placeholder="⚠️ Saisir le groupe candidat (ex: Gestionnaires_RH)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); padding: 4px 8px;">
            <span class="pmg-badge-warn" style="font-size:10px; width:fit-content;">⚠️ Warning : User Task sans groupe candidat</span>
          </div>
        \`;
      }
    } else {
      groupCellHtml = \`
        <input type="text" id="pmgGroupInput_\${idx}" value="" placeholder="— Non applicable (\${act.typeLabel || act.type})" readonly style="width: 100%; height: 32px; font-size: 11.5px; border-radius: var(--border-radius-md); border: 1px dashed var(--border-color); background: rgba(241, 245, 249, 0.6); color: #94a3b8; padding: 4px 8px; cursor:not-allowed;">
      \`;
    }

    const inheritedPill = act.isInheritedEntity 
      ? \`<span style="background:rgba(99, 102, 241, 0.1); color:#6366f1; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(99, 102, 241, 0.25); margin-top:4px; display:inline-block;" title="Hérité de la Lane du processus parent">↳ Hérité du Parent</span>\` 
      : (entityVal ? \`<span class="pmg-badge-info" style="font-size:10px; margin-top:4px; width:fit-content;">🏢 Lane / Pool BPMN</span>\` : \`<span style="font-size:10px; color:#94a3b8; margin-top:4px; display:block;">Optionnel</span>\`);

    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 14}px;">
            \${act.level > 1 ? '<span style="color:#009cd7;">└─ </span>' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 14}px;">id: <code>\${escHtml(act.id)}</code> • <em>\${escHtml(act.parentProcessName || '')}</em></div>
        </td>
        <td style="padding: 10px 8px; vertical-align: top;">
          <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight:700; \${isUserTask ? 'background: rgba(234, 91, 12, 0.1); color: #ea5b0c; border: 1px solid rgba(234, 91, 12, 0.25);' : 'background: rgba(0, 156, 215, 0.1); color: #009cd7; border: 1px solid rgba(0, 156, 215, 0.25);'}">
            \${escHtml(act.typeLabel || act.type)}
          </span>
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          <input type="text" id="pmgEntityInput_\${idx}" value="\${escAttr(entityVal)}" placeholder="Ex: CDD ou Direction Réseau" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
          \${inheritedPill}
        </td>
        <td style="padding: 8px 6px; vertical-align: top;">
          \${groupCellHtml}
        </td>
      </tr>
    \`;
  });

  tbody.innerHTML = html;
};`;

pmgCode = pmgCode.replace(oldStep2Table, newStep2Table);

// 4. Update parseBpmnBatchForPmg entity extraction to be clean (LANE ONLY without process name) and inherit for SPs
const oldEntityExtract = `            const laneName = nodeToLane.get(actId) || '';
            let entity = '';
            if (poolName && laneName) {
              entity = \`\${poolName} (Lane: \${laneName})\`;
            } else if (laneName) {
              entity = \`Lane: \${laneName}\`;
            } else if (poolName) {
              entity = poolName;
            } else {
              entity = '';
            }`;

const newEntityExtract = `            const rawLaneName = nodeToLane.get(actId) || '';
            let entity = '';
            if (rawLaneName) {
              entity = rawLaneName.replace(/^Lane\\s*:\\s*/i, '').trim();
            } else if (poolName) {
              entity = poolName.replace(/^Pool\\s*:\\s*/i, '').trim();
            } else {
              entity = '';
            }`;

pmgCode = pmgCode.replace(oldEntityExtract, newEntityExtract);

// Update traverseProcess to pass and inherit parent lane/pool
const oldTraverseStart = "function traverseProcess(procId, currentLevel, parentNodeId, branchPath, rootParent) {";
const newTraverseStart = "function traverseProcess(procId, currentLevel, parentNodeId, branchPath, rootParent, inheritedEntity) {";

pmgCode = pmgCode.replace(oldTraverseStart, newTraverseStart);

const oldActivityRecord = `        const activityRecord = {
          ...act,
          id: act.id,
          uniqueId: uniqueHierarchicalId,
          parentId: effectiveParentId,
          level: effectiveLevel,
          rootParentId: rootParent.id,
          rootParentName: rootParent.name,
          parentProcessId: procId,
          parentProcessName: proc.name,
          targetMissing: isMissingTarget,
          isSharedSubprocess: isProcShared,
          sharedParentNames: sharedParentNames,
          callers: proc.callers || [],
          xmlOrder: act.xmlOrder,
          flowOrder: act.flowOrder,
          diagramX: act.diagramX,
          diagramY: act.diagramY
        };`;

const newActivityRecord = `        let finalEntity = act.entity || '';
        let isInheritedEntity = false;
        if (!finalEntity && inheritedEntity) {
          finalEntity = inheritedEntity;
          isInheritedEntity = true;
        }

        const activityRecord = {
          ...act,
          id: act.id,
          entity: finalEntity,
          isInheritedEntity: isInheritedEntity,
          uniqueId: uniqueHierarchicalId,
          parentId: effectiveParentId,
          level: effectiveLevel,
          rootParentId: rootParent.id,
          rootParentName: rootParent.name,
          parentProcessId: procId,
          parentProcessName: proc.name,
          targetMissing: isMissingTarget,
          isSharedSubprocess: isProcShared,
          sharedParentNames: sharedParentNames,
          callers: proc.callers || [],
          xmlOrder: act.xmlOrder,
          flowOrder: act.flowOrder,
          diagramX: act.diagramX,
          diagramY: act.diagramY
        };`;

pmgCode = pmgCode.replace(oldActivityRecord, newActivityRecord);

// Update recursive call to pass Call Activity's entity down
const oldRecursiveCall = `          if (!branchPath.includes(childProcId) && processCatalog.has(childProcId)) {
            traverseProcess(childProcId, currentLevel + 1, uniqueHierarchicalId, nextBranch, rootParent);
          }`;

const newRecursiveCall = `          if (!branchPath.includes(childProcId) && processCatalog.has(childProcId)) {
            const nextInheritedEntity = act.entity || inheritedEntity || '';
            traverseProcess(childProcId, currentLevel + 1, uniqueHierarchicalId, nextBranch, rootParent, nextInheritedEntity);
          }`;

pmgCode = pmgCode.replace(oldRecursiveCall, newRecursiveCall);

// Update root process call
pmgCode = pmgCode.replace(
  "traverseProcess(rootProc.id, 1, '', rootProc.id, rootProc);",
  "traverseProcess(rootProc.id, 1, '', rootProc.id, rootProc, '');"
);

fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log('pmg.js updated with User Group Mapping, Clean Lane names & Subprocess inheritance!');
