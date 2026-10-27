const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let code = fs.readFileSync(pmgPath, 'utf8');

const oldTreeStart = "window.renderPmgVisualTree = function(activities) {";
const oldTreeEnd = "window.togglePmgTreeNode = function(btn) {";

const newTreeFunction = `window.renderPmgVisualTree = function(activities) {
  const container = document.getElementById('pmgVisualTreeContainer');
  const treeBox = document.getElementById('pmgVisualTreeBox');
  if (!container || !treeBox) return;

  let allActs = activities || window.pmgTempSubprocesses || window.pmgActivities || [];
  if (!allActs || allActs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Render filter bars
  if (window.renderPmgTypeFilterBar) window.renderPmgTypeFilterBar();
  if (window.renderPmgParentFilterBar) window.renderPmgParentFilterBar();

  // Sort activities based on active order mode
  allActs = window.sortPmgActivities(allActs, window.pmgActivityOrderMode);

  // Filter according to parent process selection
  const parentFilter = window.pmgParentFilter || 'all';
  let filteredByParentActs = allActs;
  if (parentFilter === 'shared_only') {
    filteredByParentActs = allActs.filter(a => a.isSharedSubprocess);
  } else if (parentFilter !== 'all') {
    filteredByParentActs = allActs.filter(a => a.rootParentId === parentFilter || a.parentProcessId === parentFilter);
  }

  const batch = window.pmgBatchResult;
  const rootProcesses = (batch && batch.rootProcesses && batch.rootProcesses.length > 0)
    ? batch.rootProcesses
    : (window.pmgRootProcesses || []);

  const levelColors = [
    '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6',
    '#ec4899', '#ef4444', '#10b981', '#6366f1'
  ];

  // Helper function to build a sub-tree of nodes
  function buildTreeHTML(nodes) {
    const filteredNodes = nodes.filter(hasVisibleDescendant);
    if (filteredNodes.length === 0) return '';

    let html = '<ul class="pmg-tree-ul" style="list-style:none; padding-left:16px; margin:0;">';
    filteredNodes.forEach(node => {
      const visibleChildren = (node.children || []).filter(hasVisibleDescendant);
      const hasChildren = visibleChildren.length > 0;
      const isCallAct = (node.type || '').toLowerCase().includes('call');
      const isSub = (node.type || '').toLowerCase().includes('sous-processus') || isCallAct;
      const lvlColor = levelColors[((node.level || 1) - 1) % levelColors.length];
      
      const typeKey = window.getPmgTypeKey(node.type || node.typeLabel);
      const meta = PMG_TYPE_META[typeKey] || { icon: '📄', color: '#64748b' };
      const icon = isSub ? '📁' : meta.icon;
      const safeId = node.uniqueId || node.id || node.name || '';

      const nodeOpacity = node.isVisible ? '1' : '0.55';
      const nodeBorder = node.isVisible ? 'var(--border-color)' : '1px dashed rgba(148, 163, 184, 0.45)';

      // Call Activity calledElement badge
      let calledElementBadge = '';
      if (isCallAct && node.calledElement) {
        if (node.targetMissing) {
          calledElementBadge = \`<span style="background:rgba(239, 68, 68, 0.12); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(239, 68, 68, 0.3);" title="Sous-processus introuvable dans le lot importé">⚠️ Cible: \${escHtml(node.calledElement)} (Non trouvé)</span>\`;
        } else {
          calledElementBadge = \`<span style="background:rgba(59, 130, 246, 0.12); color:var(--brand-primary); padding:2px 6px; border-radius:4px; font-size:10px; font-family:var(--font-mono); border:1px solid rgba(59, 130, 246, 0.25);" title="Process ID appelé (calledElement)">🎯 Appelle: \${escHtml(node.calledElement)}</span>\`;
        }
      }

      // Explicit Parent Process Name Badge
      const parentName = node.parentProcessName || node.rootParentName || 'Processus Racine';
      const parentBadge = \`<span class="pmg-parent-badge" title="Nom du Processus Parent Référent">🏛️ Parent : \${escHtml(parentName)}</span>\`;

      // Shared Subprocess Indicator Badge
      let sharedBadge = '';
      if (node.isSharedSubprocess) {
        const sharedParents = node.sharedParentNames && node.sharedParentNames.length > 0 ? node.sharedParentNames.join(', ') : 'Multi-parents';
        sharedBadge = \`<span class="pmg-shared-pill" title="Sous-processus transversal partagé par : \${escHtml(sharedParents)}">🔗 Partagé (\${(node.sharedParentNames || []).length} parents : \${escHtml(sharedParents)})</span>\`;
      }

      // Order Index Pill
      const orderPill = \`<span class="pmg-order-pill" title="Position d\\'ordonnancement \${window.pmgActivityOrderMode} : #\${node.orderIndex || 1}">#\${node.orderIndex || 1}</span>\`;

      html += \`
        <li class="pmg-tree-node" data-name="\${escAttr((node.name || '').toLowerCase())}" data-id="\${escAttr(safeId)}" data-type="\${escAttr(typeKey)}" style="margin:6px 0; opacity:\${nodeOpacity};">
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:6px 10px; border-radius:6px; border:1px solid \${nodeBorder}; flex-wrap:wrap;">
            \${hasChildren ? \`<button class="tree-toggle-btn" onclick="togglePmgTreeNode(this)" style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:bold; font-size:12px; padding:0 4px;">▼</button>\` : \`<span style="width:14px; display:inline-block;"></span>\`}
            \${orderPill}
            <span style="font-size:14px;">\${icon}</span>
            <strong style="color:var(--text-primary); font-size:12px;">\${escHtml(node.name)}</strong>
            <span style="background:\${isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color:\${isSub ? 'var(--brand-primary)' : 'var(--ok)'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">\${escHtml(node.typeLabel || node.type)}</span>
            \${parentBadge}
            \${sharedBadge}
            \${calledElementBadge}
            <span style="background:rgba(255,255,255,0.05); color:\${lvlColor}; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid \${lvlColor}44; margin-left:auto;">Niveau \${node.level || 1}</span>
            
            <!-- Quick Action Buttons -->
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--brand-primary); border:1px solid var(--border-color);" data-act-id="\${escAttr(safeId)}" onclick="openPmgEditTreeNodeModalFromEl(this)" title="Éditer / Réorganiser">✏️ Éditer</button>
            <button class="btn-ghost" style="padding:2px 6px; font-size:10px; height:24px; color:var(--ok); border:1px solid var(--border-color);" data-act-id="\${escAttr(safeId)}" onclick="addNewPmgSubactivityFromEl(this)" title="Ajouter une sous-activité enfant">➕ Enfant</button>
          </div>
          \${hasChildren ? buildTreeHTML(visibleChildren) : ''}
        </li>
      \`;
    });
    html += '</ul>';
    return html;
  }

  function hasVisibleDescendant(node) {
    if (node.isVisible) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some(hasVisibleDescendant);
    }
    return false;
  }

  // Determine effective roots to group by
  let targetRoots = rootProcesses;
  if (parentFilter !== 'all' && parentFilter !== 'shared_only') {
    targetRoots = rootProcesses.filter(r => r.id === parentFilter);
  }

  // If no root processes metadata exists, render flat tree
  if (!targetRoots || targetRoots.length === 0 || parentFilter === 'shared_only') {
    const nodeMap = new Map();
    filteredByParentActs.forEach(act => {
      const isVisible = window.isPmgTypeVisible ? window.isPmgTypeVisible(act.type || act.typeLabel) : true;
      const key = act.uniqueId || act.id || act.name;
      nodeMap.set(key, { ...act, isVisible, children: [] });
    });

    const roots = [];
    filteredByParentActs.forEach(act => {
      const key = act.uniqueId || act.id || act.name;
      const node = nodeMap.get(key);
      if (!node) return;
      if (act.parentId && nodeMap.has(act.parentId) && nodeMap.get(act.parentId) !== node) {
        nodeMap.get(act.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const finalHtml = buildTreeHTML(roots);
    treeBox.innerHTML = finalHtml || '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12px;">⚠️ Aucun composant ne correspond aux filtres sélectionnés.</div>';
    return;
  }

  // Render Structured Multi-Parent Sections
  let multiParentHtml = '';

  targetRoots.forEach((rootProc, rIdx) => {
    const parentActs = filteredByParentActs.filter(a => a.rootParentId === rootProc.id);
    if (parentActs.length === 0) return;

    // Build node map for this root parent branch
    const nodeMap = new Map();
    parentActs.forEach(act => {
      const isVisible = window.isPmgTypeVisible ? window.isPmgTypeVisible(act.type || act.typeLabel) : true;
      const key = act.uniqueId || act.id || act.name;
      nodeMap.set(key, { ...act, isVisible, children: [] });
    });

    const branchRoots = [];
    parentActs.forEach(act => {
      const key = act.uniqueId || act.id || act.name;
      const node = nodeMap.get(key);
      if (!node) return;

      if (act.parentId) {
        let parentNode = nodeMap.get(act.parentId);
        if (!parentNode) {
          for (const [k, n] of nodeMap.entries()) {
            if (n.uniqueId === act.parentId || n.id === act.parentId || (n.name && n.name.toLowerCase() === act.parentId.toLowerCase())) {
              parentNode = n;
              break;
            }
          }
        }
        if (parentNode && parentNode !== node) {
          if (!parentNode.children.includes(node)) {
            parentNode.children.push(node);
          }
        } else {
          if (!branchRoots.includes(node)) branchRoots.push(node);
        }
      } else {
        if (!branchRoots.includes(node)) branchRoots.push(node);
      }
    });

    const branchHtml = buildTreeHTML(branchRoots);
    if (!branchHtml) return;

    multiParentHtml += \`
      <div class="pmg-tree-parent-card" style="margin-bottom:14px; border:1px solid rgba(99, 102, 241, 0.3); border-radius:8px; overflow:hidden; background:var(--bg-card); box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(90deg, rgba(99, 102, 241, 0.12), rgba(0, 156, 215, 0.08)); padding:10px 14px; border-bottom:1px solid rgba(99, 102, 241, 0.2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:17px;">🏛️</span>
            <div>
              <strong style="color:var(--text-primary); font-size:13px;">Processus Parent P\${rIdx + 1} : \${escHtml(rootProc.name)}</strong>
              <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono); margin-top:1px;">Process ID: <code>\${escHtml(rootProc.id)}</code> • Fichier: <em>\${escHtml(rootProc.fileName || 'source.bpmn')}</em></div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; padding:3px 10px; border-radius:12px; background:rgba(99, 102, 241, 0.2); color:#6366f1; font-weight:700; border:1px solid rgba(99, 102, 241, 0.35);">
              \${parentActs.length} activité(s)
            </span>
          </div>
        </div>
        <div style="padding:10px 12px 14px 12px;">
          \${branchHtml}
        </div>
      </div>
    \`;
  });

  if (!multiParentHtml) {
    treeBox.innerHTML = '<div style="padding:25px; text-align:center; color:var(--text-tertiary); font-size:12px;">⚠️ Aucun composant ne correspond aux filtres de processus ou types sélectionnés.</div>';
  } else {
    treeBox.innerHTML = multiParentHtml;
  }
};

`;

const startIdx = code.indexOf(oldTreeStart);
const endIdx = code.indexOf(oldTreeEnd);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newTreeFunction + code.substring(endIdx);
  fs.writeFileSync(pmgPath, code, 'utf8');
  console.log('Successfully updated renderPmgVisualTree with distinct Parent Process Cards and explicit badges!');
} else {
  console.error('Could not find renderPmgVisualTree markers in pmg.js');
}
