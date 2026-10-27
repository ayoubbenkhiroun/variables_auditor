const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');

let indexContent = fs.readFileSync(indexPath, 'utf8');
let pmgContent = fs.readFileSync(pmgPath, 'utf8');

const isCRLF = indexContent.includes('\r\n');
const newline = isCRLF ? '\r\n' : '\n';

// 1. Update Step 3 header button in index.html
const oldStep3Btn = `<button class="btn-ghost" style="padding: 4px 8px; font-size: 11px;"
                      onclick="applyDefaultEntityToAllPmg()">Appliquer Entité par défaut à tous</button>`.replace(/\r?\n/g, newline);

const newStep3Btns = `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <button class="btn-ghost" style="padding: 4px 10px; font-size: 11.5px; border-color: var(--brand-primary); color: var(--brand-primary); font-weight: 700; background: rgba(0, 156, 215, 0.08);"
                        onclick="openPmgSmartEntityAssignModal()">
                        🪄 Affectation Intelligente des Entités
                      </button>
                      <button class="btn-ghost" style="padding: 4px 10px; font-size: 11.5px;"
                        onclick="openPmgUserGroupMappingModal()">
                        👥 Mappage Groupes &amp; Lanes
                      </button>
                    </div>`.replace(/\r?\n/g, newline);

if (indexContent.includes(oldStep3Btn)) {
  indexContent = indexContent.replace(oldStep3Btn, newStep3Btns);
  console.log('✅ Updated Step 3 header buttons in index.html');
} else {
  console.log('⚠️ Could not find exact oldStep3Btn, checking fallback match...');
  indexContent = indexContent.replace(/<button class="btn-ghost"[^>]*applyDefaultEntityToAllPmg[^>]*>[\s\S]*?<\/button>/, newStep3Btns);
  console.log('✅ Replaced via regex in index.html');
}

// 2. Add Modal for Smart Entity Assignment in index.html before </body>
const smartEntityModalHtml = `
  <!-- Modal d'Affectation Intelligente des Entités (En Masse & Cascades) -->
  <div class="modal" id="modalPmgSmartEntityAssign"
    style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); z-index:9999; justify-content:center; align-items:center;">
    <div class="modal-content"
      style="background:var(--bg-card); border-radius:var(--border-radius-md); padding:24px; max-width:760px; width:92%; max-height:90vh; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 12px 36px rgba(0,0,0,0.45);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">🪄</span>
          <div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin:0;">
              Assistant d'Affectation Intelligente des Entités (Lanes &amp; Rôles)
            </h3>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              Assignez ou harmonisez en masse les entités selon vos règles métiers : par sous-processus parent (avec propagation aux descendants), sur les cases vides, ou par déduction automatique.
            </div>
          </div>
        </div>
        <button class="btn-ghost" onclick="closePmgSmartEntityAssignModal()" style="padding:4px 10px; font-size:16px;">✕</button>
      </div>

      <div id="pmgSmartEntityAssignModalBody" style="flex:1; overflow-y:auto; padding-right:4px; margin-bottom:16px;">
        <!-- Rempli dynamiquement par JS -->
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:14px; flex-wrap:wrap; gap:10px;">
        <div id="pmgSmartEntityImpactCount" style="font-size:12px; font-weight:700; color:var(--brand-primary);">
          📊 Impact : 0 activité(s) sélectionnée(s)
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-ghost" onclick="closePmgSmartEntityAssignModal()">Annuler</button>
          <button class="btn-primary" style="padding:6px 18px; font-weight:700;" onclick="applyPmgSmartEntityAssignment()">
            ✅ Appliquer l'Affectation
          </button>
        </div>
      </div>
    </div>
  </div>
`.replace(/\r?\n/g, newline);

if (!indexContent.includes('id="modalPmgSmartEntityAssign"')) {
  indexContent = indexContent.replace('</body>', smartEntityModalHtml + newline + '</body>');
  console.log('✅ Added modalPmgSmartEntityAssign to index.html');
}

fs.writeFileSync(indexPath, indexContent, 'utf8');

// 3. Now implement cleanPmgUserGroupName & Smart Entity Modal Logic in js/pmg.js
const smartLogic = `
// =========================================================================
// 🧹 CLEAN PMG USER GROUP NAME & SMART ENTITY ASSIGNMENT
// =========================================================================

window.cleanPmgUserGroupName = function(raw) {
  if (raw == null) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // 1. Remove leading '=' if present (Camunda 8 / Zeebe FEEL expression indicator)
  if (str.startsWith('=')) {
    str = str.substring(1).trim();
  }

  // 2. If bracketed: =["CDD_SUPPORT_CENTRAL"] or ['A', 'B'] or [groupeResponsable]
  if (str.startsWith('[') && str.endsWith(']')) {
    const inner = str.slice(1, -1).trim();
    try {
      const parsed = JSON.parse('[' + inner.replace(/'/g, '"') + ']');
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean).join(', ');
      }
    } catch (e) {
      // Fallback: use inner without brackets
      str = inner;
    }
  }

  // 3. Remove surrounding single or double quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // 4. Remove residual quotes for list strings
  str = str.replace(/["']/g, '').trim();

  return str;
};

window.openPmgSmartEntityAssignModal = function() {
  const modal = document.getElementById('modalPmgSmartEntityAssign');
  if (!modal) return;
  modal.style.display = 'flex';
  window.renderPmgSmartEntityAssignContent();
};

window.closePmgSmartEntityAssignModal = function() {
  const modal = document.getElementById('modalPmgSmartEntityAssign');
  if (modal) modal.style.display = 'none';
};

window.renderPmgSmartEntityAssignContent = function() {
  const container = document.getElementById('pmgSmartEntityAssignModalBody');
  if (!container) return;

  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary);">⚠️ Aucune activité chargée. Veuillez importer des fichiers BPMN à l\\'étape 1.</div>';
    return;
  }

  // Extract known entities for quick suggestion chips
  const knownEntities = new Set();
  const knownSubprocesses = new Map(); // id -> name
  let emptyEntityCount = 0;
  let userTasksCount = 0;

  activities.forEach(act => {
    if (act.entity && act.entity !== 'Non défini' && act.entity.trim()) {
      knownEntities.add(act.entity.trim());
    } else {
      emptyEntityCount++;
    }

    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    if (isSub || act.level === 1) {
      knownSubprocesses.set(act.name || act.id, act);
    }

    if ((act.type || '').toLowerCase().includes('user')) {
      userTasksCount++;
    }
  });

  // Suggestion chips HTML
  let suggestionsHtml = '';
  knownEntities.forEach(ent => {
    suggestionsHtml += \`<button type="button" class="pmg-filter-pill-btn" onclick="document.getElementById('pmgSmartTargetEntityInput').value='\${escAttr(ent)}'; updatePmgSmartEntityPreview();" style="font-size:11px;">🏢 \${escHtml(ent)}</button>\`;
  });
  if (!suggestionsHtml) {
    suggestionsHtml = '<span style="font-size:11.5px; color:var(--text-tertiary); font-style:italic;">Aucune entité déjà déclarée</span>';
  }

  // Subprocesses options
  let subOptionsHtml = '<option value="">-- Choisir un sous-processus / activité macro --</option>';
  knownSubprocesses.forEach((sub, name) => {
    subOptionsHtml += \`<option value="\${escAttr(sub.id)}">\${escHtml(sub.name)} (Niveau \${sub.level || 1})</option>\`;
  });

  // Unique types
  const typesSet = new Set(activities.map(a => a.typeLabel || a.type).filter(Boolean));
  let typeOptionsHtml = '';
  typesSet.forEach(t => {
    typeOptionsHtml += \`<option value="\${escAttr(t)}">\${escHtml(t)}</option>\`;
  });

  // Existing entities to replace
  let replaceOptionsHtml = '';
  knownEntities.forEach(ent => {
    replaceOptionsHtml += \`<option value="\${escAttr(ent)}">\${escHtml(ent)}</option>\`;
  });

  container.innerHTML = \`
    <div style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Section 1 : Périmètre & Stratégie -->
      <div style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:14px;">
        <label style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:block;">
          1. Choisissez la cible / stratégie d'affectation :
        </label>
        
        <div style="display:flex; flex-direction:column; gap:10px; font-size:12.5px;">
          
          <!-- Option 1: Sous-Processus et sa cascade -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="subprocess_cascade" checked onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🌳 Par Sous-Processus &amp; Cascade sur toute sa branche descendante</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Applique l'entité au sous-processus sélectionné ainsi qu'à l'ensemble de ses activités et tâches enfants.</div>
              <div id="pmgSmartSubprocessSelectWrap" style="margin-top:6px;">
                <select id="pmgSmartScopeSubprocess" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  \${subOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 2: Seulement les cases vides -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="empty_only" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>⚠️ Uniquement les activités sans entité (Vides / Non défini)</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Préserve toutes les entités existantes et ne remplit que les <strong>\${emptyEntityCount}</strong> case(s) vide(s).</div>
            </div>
          </label>

          <!-- Option 3: Auto-Déduction d'après les Groupes Candidats -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="group_deduction" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🧠 Auto-Déduction Intelligente d'après les Groupes Utilisateurs</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Déduit l'entité directement depuis le préfixe du groupe (ex: <code>CDD_SUPPORT_CENTRAL</code> &rarr; <strong>CDD</strong>, <code>ADV_N1</code> &rarr; <strong>ADV</strong>).</div>
            </div>
          </label>

          <!-- Option 4: Par Type BPMN -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="by_type" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🏷️ Par Type de Composant BPMN</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Appliquer l'entité à un type de tâche spécifique.</div>
              <div id="pmgSmartTypeSelectWrap" style="margin-top:6px; display:none;">
                <select id="pmgSmartScopeType" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  \${typeOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 5: Remplacer une entité -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="replace_entity" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🔄 Remplacer une entité existante</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Remplace toutes les occurrences d'une entité par une nouvelle.</div>
              <div id="pmgSmartReplaceSelectWrap" style="margin-top:6px; display:none;">
                <select id="pmgSmartScopeReplaceSource" class="srt" style="width:100%; height:32px; font-size:12px;" onchange="updatePmgSmartEntityPreview()">
                  \${replaceOptionsHtml}
                </select>
              </div>
            </div>
          </label>

          <!-- Option 6: Global à toutes les activités -->
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
            <input type="radio" name="pmgSmartScopeMode" value="all" onchange="updatePmgSmartEntityPreview()" style="margin-top:3px;">
            <div style="flex:1;">
              <strong>🌐 Toutes les activités (\${activities.length} activités)</strong>
              <div style="color:var(--text-secondary); font-size:11.5px; margin-top:2px;">Écrase et applique la même entité à toutes les lignes.</div>
            </div>
          </label>

        </div>
      </div>

      <!-- Section 2 : Entité cible -->
      <div id="pmgSmartTargetEntitySection" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:14px;">
        <label style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
          2. Entité / Lane cible à affecter :
        </label>
        
        <input type="text" id="pmgSmartTargetEntityInput" placeholder="Ex: CDD, Direction Métier, Support Client..." oninput="updatePmgSmartEntityPreview()" style="width:100%; height:36px; font-size:13px; border-radius:var(--border-radius-md); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); padding:6px 10px;">

        <div style="margin-top:10px;">
          <div style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Suggestions rapides (entités détectées) :</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            \${suggestionsHtml}
          </div>
        </div>
      </div>

      <!-- Section 3 : Aperçu des activités impactées -->
      <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:12px; background:var(--bg-primary); max-height:160px; overflow-y:auto;">
        <div style="font-size:11.5px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
          👁️ Aperçu des activités qui seront modifiées :
        </div>
        <div id="pmgSmartPreviewList" style="font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
          Sélectionnez un sous-processus ou un mode ci-dessus...
        </div>
      </div>

    </div>
  \`;

  window.updatePmgSmartEntityPreview();
};

window.getPmgImpactedActivities = function() {
  const activities = window.pmgTempSubprocesses || window.pmgActivities || [];
  const mode = document.querySelector('input[name="pmgSmartScopeMode"]:checked')?.value || 'subprocess_cascade';
  const targetEntity = (document.getElementById('pmgSmartTargetEntityInput')?.value || '').trim();

  let impacted = [];

  if (mode === 'subprocess_cascade') {
    const subId = document.getElementById('pmgSmartScopeSubprocess')?.value;
    if (subId) {
      const targetSub = activities.find(a => a.id === subId);
      if (targetSub) {
        impacted.push(targetSub);

        // Find all descendants in hierarchy
        const parentKeys = new Set([targetSub.id, targetSub.name]);
        let addedNew = true;
        while (addedNew) {
          addedNew = false;
          activities.forEach(act => {
            if (!impacted.includes(act)) {
              if (parentKeys.has(act.parentId) || parentKeys.has(act.embeddedParentId) || (act.parentProcessId && parentKeys.has(act.parentProcessId))) {
                impacted.push(act);
                parentKeys.add(act.id);
                parentKeys.add(act.name);
                addedNew = true;
              }
            }
          });
        }
      }
    }
  } else if (mode === 'empty_only') {
    impacted = activities.filter(a => !a.entity || a.entity === 'Non défini' || a.entity.trim() === '');
  } else if (mode === 'group_deduction') {
    impacted = activities.filter(a => {
      const g = (a.userGroup || '').trim();
      return g.length > 0;
    });
  } else if (mode === 'by_type') {
    const t = document.getElementById('pmgSmartScopeType')?.value || '';
    impacted = activities.filter(a => (a.typeLabel || a.type) === t);
  } else if (mode === 'replace_entity') {
    const src = document.getElementById('pmgSmartScopeReplaceSource')?.value || '';
    impacted = activities.filter(a => a.entity === src);
  } else if (mode === 'all') {
    impacted = [...activities];
  }

  return { mode, targetEntity, impacted };
};

window.updatePmgSmartEntityPreview = function() {
  const mode = document.querySelector('input[name="pmgSmartScopeMode"]:checked')?.value || 'subprocess_cascade';

  // Toggle sub-selects visibility
  const typeWrap = document.getElementById('pmgSmartTypeSelectWrap');
  const replaceWrap = document.getElementById('pmgSmartReplaceSelectWrap');
  const targetSec = document.getElementById('pmgSmartTargetEntitySection');

  if (typeWrap) typeWrap.style.display = mode === 'by_type' ? 'block' : 'none';
  if (replaceWrap) replaceWrap.style.display = mode === 'replace_entity' ? 'block' : 'none';
  if (targetSec) targetSec.style.display = mode === 'group_deduction' ? 'none' : 'block';

  const { targetEntity, impacted } = window.getPmgImpactedActivities();

  const impactCountEl = document.getElementById('pmgSmartEntityImpactCount');
  if (impactCountEl) {
    impactCountEl.innerHTML = \`📊 Impact : <strong>\${impacted.length}</strong> activité(s) sélectionnée(s)\`;
  }

  const previewListEl = document.getElementById('pmgSmartPreviewList');
  if (previewListEl) {
    if (impacted.length === 0) {
      previewListEl.innerHTML = '<span style="color:var(--text-tertiary); font-style:italic;">Aucune activité ciblée par ce critère.</span>';
    } else {
      let itemsHtml = impacted.slice(0, 15).map(a => {
        let dest = targetEntity || 'Entité cible';
        if (mode === 'group_deduction') {
          const gClean = window.cleanPmgUserGroupName(a.userGroup);
          const prefix = gClean.split('_')[0] || gClean;
          dest = prefix.toUpperCase();
        }
        return \`<div style="margin-bottom:3px;">• <strong>\${escHtml(a.name)}</strong> (\${escHtml(a.typeLabel || a.type)}) : <span style="text-decoration:line-through; color:var(--text-tertiary);">\${escHtml(a.entity || 'Non défini')}</span> &rarr; <span style="color:var(--ok); font-weight:700;">\${escHtml(dest)}</span></div>\`;
      }).join('');

      if (impacted.length > 15) {
        itemsHtml += \`<div style="color:var(--brand-primary); font-weight:600; margin-top:4px;">... et \${impacted.length - 15} autre(s) activité(s)</div>\`;
      }
      previewListEl.innerHTML = itemsHtml;
    }
  }
};

window.applyPmgSmartEntityAssignment = function() {
  const { mode, targetEntity, impacted } = window.getPmgImpactedActivities();

  if (impacted.length === 0) {
    alert("Aucune activité n'a été sélectionnée.");
    return;
  }

  if (mode !== 'group_deduction' && !targetEntity) {
    alert("Veuillez saisir le nom de l'entité cible à affecter.");
    return;
  }

  let count = 0;
  impacted.forEach(act => {
    if (mode === 'group_deduction') {
      const gClean = window.cleanPmgUserGroupName(act.userGroup);
      const prefix = (gClean.split('_')[0] || gClean).trim().toUpperCase();
      act.entity = prefix || 'Non défini';
      act.isInheritedEntity = false;
      count++;
    } else {
      act.entity = targetEntity;
      act.isInheritedEntity = false;
      count++;
    }
  });

  window.closePmgSmartEntityAssignModal();

  if (window.renderPmgStep2ManualTable) window.renderPmgStep2ManualTable();
  if (window.renderPmgMatrix) window.renderPmgMatrix();

  alert(\`🎉 Affectation réussie ! \${count} activité(s) mise(s) à jour avec succès.\`);
};
`;

// Insert smartLogic before validatePmgStep3Entities
if (pmgContent.includes('window.validatePmgStep3Entities = function() {')) {
  pmgContent = pmgContent.replace('window.validatePmgStep3Entities = function() {', smartLogic + '\nwindow.validatePmgStep3Entities = function() {');
  console.log('✅ Inserted smartLogic in pmg.js');
} else {
  console.error('❌ Could not find insertion marker in pmg.js');
}

// 4. Update parseBpmnBatchForPmg to clean userGroup name automatically
const oldUserGroupExtract = `            if (localName === 'usertask') {
              userGroup = el.getAttribute('camunda:candidateGroups') || el.getAttribute('candidateGroups') || '';
              if (!userGroup) {
                const assignDef = el.querySelector('assignmentDefinition, zeebe\\\\:assignmentDefinition');
                if (assignDef) {
                  userGroup = assignDef.getAttribute('candidateGroups') || assignDef.getAttribute('candidateUsers') || '';
                }
              }
              if (!userGroup) {
                userGroup = el.getAttribute('camunda:candidateUsers') || el.getAttribute('candidateUsers') || '';
              }
              if (!userGroup) {
                const assignee = el.getAttribute('camunda:assignee') || el.getAttribute('assignee') || '';
                if (assignee) userGroup = \`Assigné: \${assignee}\`;
              }
              if (!userGroup) {
                userGroupWarning = true;
              }
            }`;

const newUserGroupExtract = `            if (localName === 'usertask') {
              userGroup = el.getAttribute('camunda:candidateGroups') || el.getAttribute('candidateGroups') || '';
              if (!userGroup) {
                const assignDef = el.querySelector('assignmentDefinition, zeebe\\\\:assignmentDefinition');
                if (assignDef) {
                  userGroup = assignDef.getAttribute('candidateGroups') || assignDef.getAttribute('candidateUsers') || '';
                }
              }
              if (!userGroup) {
                userGroup = el.getAttribute('camunda:candidateUsers') || el.getAttribute('candidateUsers') || '';
              }
              if (!userGroup) {
                const assignee = el.getAttribute('camunda:assignee') || el.getAttribute('assignee') || '';
                if (assignee) userGroup = \`Assigné: \${assignee}\`;
              }
              // Clean user group name (remove FEEL brackets =["..."], quotes, etc.)
              if (userGroup && typeof window.cleanPmgUserGroupName === 'function') {
                userGroup = window.cleanPmgUserGroupName(userGroup);
              }
              if (!userGroup) {
                userGroupWarning = true;
              }
            }`;

// Clean in table renderers as well
pmgContent = pmgContent.replace(
  "const groupVal = act.userGroup || '';",
  "const groupVal = (typeof window.cleanPmgUserGroupName === 'function') ? window.cleanPmgUserGroupName(act.userGroup) : (act.userGroup || '');"
);

fs.writeFileSync(pmgPath, pmgContent, 'utf8');
console.log('🎉 Successfully saved updated pmg.js!');
