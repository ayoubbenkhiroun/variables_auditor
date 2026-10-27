const fs = require('fs');
const knowledge = require('./generate_knowledge.js');

const jsPath = 'c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/bpmn_lint.js';
let content = fs.readFileSync(jsPath, 'utf8');

const knowledgeString = JSON.stringify(knowledge, null, 2);

const startMarker = "let bpmnLintRulesCategoryFilter = 'all';";
const endMarker = "let bpmnLintViewerInstance = null;";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Markers not found! startIdx:", startIdx, "endIdx:", endIdx);
  process.exit(1);
}

const replacementBlock = `
const BPMN_LINT_RULE_KNOWLEDGE = ${knowledgeString};

let bpmnLintRulesCategoryFilter = 'all';
let bpmnLintRuleSearchQuery = '';
let bpmnLintRuleSeverityFilter = 'all';
let bpmnLintExpandedRules = new Set();

window.filterBpmnLintRulesCategory = function(cat) {
  bpmnLintRulesCategoryFilter = cat;
  renderBpmnLintRules();
};

window.onBpmnLintRulesSearch = function(query) {
  bpmnLintRuleSearchQuery = (query || '').trim().toLowerCase();
  renderBpmnLintRules();
};

window.onBpmnLintRulesSeverityChange = function(sev) {
  bpmnLintRuleSeverityFilter = sev || 'all';
  renderBpmnLintRules();
};

window.toggleBpmnLintRuleDetail = function(ruleId) {
  if (bpmnLintExpandedRules.has(ruleId)) {
    bpmnLintExpandedRules.delete(ruleId);
  } else {
    bpmnLintExpandedRules.add(ruleId);
  }
  renderBpmnLintRules();
};

window.bpmnLintToggleAllRuleDetails = function(expand) {
  if (expand) {
    bpmnLintRules.forEach(r => bpmnLintExpandedRules.add(r.id));
  } else {
    bpmnLintExpandedRules.clear();
  }
  renderBpmnLintRules();
};

window.bpmnLintToggleAllRules = function(enable) {
  bpmnLintRules.forEach(r => { r.enabled = !!enable; });
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.copyBpmnLintRuleSnippet = function(ruleId, type) {
  const k = BPMN_LINT_RULE_KNOWLEDGE[ruleId];
  if (!k) return;
  const snippet = type === 'bad' ? k.badSnippet : k.goodSnippet;
  if (!snippet) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet).then(() => {
      alert(\`📋 Extrait XML (\${type === 'bad' ? 'Anti-pattern' : 'Bonne pratique'}) copié dans le presse-papiers !\`);
    }).catch(() => {
      prompt('Copiez le code ci-dessous :', snippet);
    });
  } else {
    prompt('Copiez le code ci-dessous :', snippet);
  }
};

window.applyBpmnLintPreset = function(presetName) {
  if (!bpmnLintRules || !bpmnLintRules.length) {
    loadBpmnLintRules();
  }

  if (presetName === 'bouygues') {
    // Profil Standard Bouygues Telecom (Équilibré & Robuste)
    bpmnLintRules.forEach(r => {
      const def = DEFAULT_BPMN_LINT_RULES.find(d => d.id === r.id);
      if (def) {
        r.enabled = def.enabled;
        r.severity = def.severity;
      } else {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('🛡️ Profil « Standard Bouygues Telecom » appliqué avec succès !');
  } else if (presetName === 'strict') {
    // Profil Strict Production (CI/CD Zero-Defect)
    bpmnLintRules.forEach(r => {
      r.enabled = true;
      if (r.category === 'Structure' || r.category === 'Dépendances' || r.id.includes('propagation') || r.id.includes('loop')) {
        r.severity = 'blocker';
      } else {
        r.severity = 'error';
      }
    });
    alert('🚀 Profil « Strict Production (CI/CD Zero-Defect) » appliqué : Toutes les règles sont activées en Bloquant / Erreur !');
  } else if (presetName === 'prototyping') {
    // Profil Prototypage / Conception Rapide
    bpmnLintRules.forEach(r => {
      if (r.category === 'Structure') {
        r.enabled = true;
        r.severity = 'error';
      } else if (r.category === 'Nommage' || r.category === 'Documentation') {
        r.enabled = false;
        r.severity = 'info';
      } else {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('🎨 Profil « Prototypage Rapide » appliqué : Focus sur la structure sans contraintes de nommage.');
  } else if (presetName === 'naming') {
    // Profil Focus Nommage & Sémantique Métier
    bpmnLintRules.forEach(r => {
      if (r.category === 'Nommage') {
        r.enabled = true;
        r.severity = 'error';
      } else if (r.category === 'Documentation' || r.category === 'Gouvernance') {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('✍️ Profil « Focus Nommage & Métier » appliqué avec sévérité renforcée sur les libellés et variables.');
  }

  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.loadBpmnLintRules = function() {
  try {
    const raw = localStorage.getItem(BPMN_LINT_RULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Fusionner avec les règles par défaut pour intégrer les nouvelles règles éventuelles
        const loadedMap = new Map(parsed.map(r => [r.id, r]));
        bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(def => {
          if (loadedMap.has(def.id)) {
            const saved = loadedMap.get(def.id);
            return { ...def, enabled: saved.enabled, severity: saved.severity };
          }
          return { ...def };
        });
        // Ajouter les règles personnalisées d'équipe sauvegardées
        parsed.filter(r => r.custom).forEach(cr => {
          if (!bpmnLintRules.some(r => r.id === cr.id)) {
            bpmnLintRules.push(cr);
          }
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des règles BPMN Lint depuis localStorage:', e);
  }
  bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(r => ({ ...r }));
};

window.saveBpmnLintRules = function() {
  try {
    localStorage.setItem(BPMN_LINT_RULES_KEY, JSON.stringify(bpmnLintRules));
  } catch (e) {
    console.warn('Impossible de sauvegarder les règles BPMN Lint dans localStorage:', e);
  }
};

window.resetBpmnLintRules = function() {
  if (confirm('Voulez-vous réinitialiser toutes les règles à la configuration standard Bouygues Telecom ?')) {
    bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(r => ({ ...r }));
    saveBpmnLintRules();
    renderBpmnLintRules();
    invalidateBpmnLintReport();
    alert('🔄 Configuration des règles réinitialisée par défaut.');
  }
};

window.exportBpmnLintRules = function() {
  const data = JSON.stringify(bpmnLintRules, null, 2);
  const now = new Date().toISOString().slice(0, 10);
  dl(data, \`regles_bpmn_lint_\${now}.json\`, 'application/json;charset=utf-8;');
};

window.importBpmnLintRules = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed)) {
        bpmnLintRules = parsed;
        saveBpmnLintRules();
        renderBpmnLintRules();
        invalidateBpmnLintReport();
        alert(\`✅ \${parsed.length} règles importées avec succès !\`);
      } else {
        alert('Format de fichier JSON invalide : une liste de règles est attendue.');
      }
    } catch (err) {
      alert(\`Erreur lors de l'import : \${err.message}\`);
    }
  };
  reader.readAsText(file);
};

function renderBpmnLintRules() {
  if (!bpmnLintRules || !bpmnLintRules.length) {
    loadBpmnLintRules();
  }

  const body = document.getElementById('bpmnLintRulesBody');
  const catFilterContainer = document.getElementById('bpmnLintRulesCatFilters');
  const kpiContainer = document.getElementById('bpmnLintRulesCountsBadges');

  // 1. Rendu des KPIs et statistiques de couverture
  if (kpiContainer) {
    const total = bpmnLintRules.length;
    const active = bpmnLintRules.filter(r => r.enabled).length;
    const blockers = bpmnLintRules.filter(r => r.enabled && r.severity === 'blocker').length;
    const errors = bpmnLintRules.filter(r => r.enabled && r.severity === 'error').length;
    const warnings = bpmnLintRules.filter(r => r.enabled && r.severity === 'warning').length;
    const infos = bpmnLintRules.filter(r => r.enabled && r.severity === 'info').length;
    const customCount = bpmnLintRules.filter(r => r.custom).length;

    kpiContainer.innerHTML = \`
      <span style="font-size:12px; font-weight:800; color:var(--text-primary); margin-right:4px;">Couverture :</span>
      <span class="badge" style="background:#f1f5f9; color:#334155; font-weight:700; padding:3px 8px;" title="Nombre total de règles dans le référentiel">\${total} règles</span>
      <span class="badge" style="background:#dcfce7; color:#166534; font-weight:800; padding:3px 8px;" title="Règles actuellement actives">\${active} actives</span>
      <span class="badge" style="background:#fee2e2; color:#991b1b; font-weight:800; padding:3px 8px;" title="Contrôles bloquants (No-Go)">\${blockers} bloquants</span>
      <span class="badge" style="background:#ffedd5; color:#9a3412; font-weight:800; padding:3px 8px;" title="Erreurs">\${errors} erreurs</span>
      <span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; padding:3px 8px;" title="Avertissements">\${warnings} avertissements</span>
      \${infos > 0 ? \`<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:3px 8px;" title="Informations">\${infos} infos</span>\` : ''}
      \${customCount > 0 ? \`<span class="badge" style="background:#f3e8ff; color:#6b21a8; font-weight:800; padding:3px 8px;" title="Règles d'équipe personnalisées">\${customCount} équipe</span>\` : ''}
    \`;
  }

  // 2. Rendu des filtres de catégories (Pills)
  if (catFilterContainer) {
    const categories = ['all', 'Structure', 'Modélisation', 'Nommage', 'Dépendances', 'Déploiement', 'Documentation', 'Gouvernance', 'Règle équipe'];
    catFilterContainer.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'Toutes les règles' : cat;
      const count = cat === 'all' ? bpmnLintRules.length : bpmnLintRules.filter(r => (r.category || 'Règle équipe') === cat || (cat === 'Règle équipe' && r.custom)).length;
      const active = bpmnLintRulesCategoryFilter === cat ? 'active' : '';
      return \`<button class="pill \${active}" onclick="filterBpmnLintRulesCategory('\${lintEscape(cat)}')">\${lintEscape(label)} (\${count})</button>\`;
    }).join('');
  }

  if (!body) return;

  // 3. Filtrage multi-critères
  const filtered = bpmnLintRules.filter(rule => {
    // Filtre de catégorie
    if (bpmnLintRulesCategoryFilter !== 'all') {
      if (bpmnLintRulesCategoryFilter === 'Règle équipe') {
        if (!rule.custom && rule.category !== 'Règle équipe') return false;
      } else {
        if ((rule.category || 'Règle équipe') !== bpmnLintRulesCategoryFilter) return false;
      }
    }

    // Filtre de sévérité / statut
    if (bpmnLintRuleSeverityFilter === 'enabled' && !rule.enabled) return false;
    if (bpmnLintRuleSeverityFilter === 'disabled' && rule.enabled) return false;
    if (['blocker', 'error', 'warning', 'info'].includes(bpmnLintRuleSeverityFilter)) {
      if (rule.severity !== bpmnLintRuleSeverityFilter) return false;
    }

    // Filtre de recherche texte
    if (bpmnLintRuleSearchQuery) {
      const k = BPMN_LINT_RULE_KNOWLEDGE[rule.id] || {};
      const searchable = [
        rule.id,
        rule.label,
        rule.category,
        rule.severity,
        rule.target || '',
        rule.pattern || '',
        k.standard || '',
        k.badge || '',
        k.explanation || '',
        k.badDesc || '',
        k.goodDesc || '',
        k.badSnippet || '',
        k.goodSnippet || ''
      ].join(' ').toLowerCase();

      if (!searchable.includes(bpmnLintRuleSearchQuery)) return false;
    }

    return true;
  });

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px; text-align:center; color:var(--text-secondary);">🔍 Aucune règle ne correspond aux critères de recherche et filtres actuels.</td></tr>';
    return;
  }

  // 4. Génération des lignes du tableau et tiroirs d'explications accordéons
  body.innerHTML = filtered.map(rule => {
    const index = bpmnLintRules.indexOf(rule);
    const k = BPMN_LINT_RULE_KNOWLEDGE[rule.id] || {
      standard: rule.custom ? 'Règle Équipe Projet' : 'Standard OMG BPMN 2.0 / Camunda',
      badge: rule.category || 'Général',
      explanation: rule.custom ? \`Contrôle par expression régulière sur l'élément <\${rule.target}> et l'attribut '\${rule.attribute || 'name'}'.\` : 'Contrôle intégré du moteur d\\'audit BPMN 2.0.',
      badDesc: rule.custom ? \`L'attribut ne correspond pas au motif '\${rule.pattern}'.\` : 'Cas de non-conformité détecté.',
      badSnippet: \`<!-- ❌ Non-conforme : Violation de la règle \${rule.label} -->\`,
      goodDesc: rule.custom ? \`L'attribut doit respecter le motif '\${rule.pattern}'.\` : 'Pratique recommandée pour ce composant.',
      goodSnippet: \`<!-- ✅ Conforme : Respect des conventions d'architecture -->\`,
      impact: rule.severity === 'blocker' ? '🚨 Incident bloquant pour le déploiement' : '⚠️ Non-conformité aux bonnes pratiques',
      autoFixable: false
    };

    const isExpanded = bpmnLintExpandedRules.has(rule.id);

    return \`
    <tr class="bpmn-lint-rule-row \${isExpanded ? 'expanded' : ''}" onclick="toggleBpmnLintRuleDetail('\${lintEscape(rule.id)}')">
      <td style="text-align:center;" onclick="event.stopPropagation();">
        <input type="checkbox" \${rule.enabled ? 'checked' : ''} onchange="toggleBpmnLintRule(\${index}, this.checked)" title="Activer / Désactiver la règle" style="cursor:pointer; width:16px; height:16px;">
      </td>
      <td>
        <div class="bpmn-lint-rule-label-container">
          <div class="bpmn-lint-rule-title">
            <span>\${lintEscape(rule.label)}</span>
            \${k.autoFixable ? '<span class="bpmn-lint-autofix-badge" title="Cette règle dispose d\\'un Auto-Fix automatique">⚙️ Auto-Fix</span>' : ''}
            \${rule.custom ? '<small class="bpmn-lint-custom-label" style="background:#f3e8ff; color:#6b21a8; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">ÉQUIPE</small>' : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:3px;">
            <span class="bpmn-lint-standard-badge">\${lintEscape(k.standard)}</span>
            <span style="font-size:11px; color:var(--text-tertiary);">ID: <code>\${lintEscape(rule.id)}</code></span>
          </div>
        </div>
      </td>
      <td>
        <span class="badge" style="font-size:11px; font-weight:700;">\${lintEscape(rule.category || 'Équipe')}</span>
      </td>
      <td onclick="event.stopPropagation();">
        <button type="button" class="btn-ghost" onclick="toggleBpmnLintRuleDetail('\${lintEscape(rule.id)}')" style="display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; padding:4px 10px; border:1px solid var(--border-color, #cbd5e1); border-radius:6px; background:#fff; color:var(--brand-primary, #003882);">
          <span>💡</span>
          <span>\${isExpanded ? 'Masquer détails' : 'Voir explications & exemples'}</span>
          <span style="font-size:10px; transition:transform 0.2s; transform:\${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}">▼</span>
        </button>
      </td>
      <td onclick="event.stopPropagation();">
        <select class="srt" onchange="setBpmnLintSeverity(\${index}, this.value)" style="font-weight:700; font-size:11.5px; padding:4px 8px; border-radius:6px;">
          \${['blocker', 'error', 'warning', 'info'].map(value => \`<option value="\${value}" \${rule.severity === value ? 'selected' : ''}>\${value === 'blocker' ? '🔴 Bloquant' : value === 'error' ? '🟠 Erreur' : value === 'warning' ? '🟡 Avertissement' : '🔵 Info'}</option>\`).join('')}
        </select>
      </td>
      <td style="text-align:center;" onclick="event.stopPropagation();">
        \${rule.custom ? \`<button class="btn-ghost" onclick="deleteBpmnLintRule(\${index})" aria-label="Supprimer la règle" style="color:#dc2626; font-size:11px; font-weight:700; padding:4px 8px; border:1px solid #fecdd3; border-radius:4px; background:#fff1f2;">🗑️ Supprimer</button>\` : \`<button class="btn-ghost" onclick="toggleBpmnLintRuleDetail('\${lintEscape(rule.id)}')" style="font-size:11px; padding:4px 8px; border:1px solid var(--border-color); border-radius:4px; background:#fff;" title="Consulter la fiche pédagogique">\${isExpanded ? '▲ Replier' : '📖 Fiche'}</button>\`}
      </td>
    </tr>
    \${isExpanded ? \`
    <tr class="bpmn-lint-drawer-row">
      <td colspan="6" style="padding:0 0 12px 0; border-top:none;">
        <div class="bpmn-lint-rule-drawer">
          <!-- En-tête du tiroir pédagogique -->
          <div class="bpmn-lint-drawer-header">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="bpmn-lint-standard-badge" style="background:#003882; color:#fff; font-weight:800; border:none; padding:3px 9px;">\${lintEscape(k.standard)}</span>
                <span class="badge" style="font-size:11px; background:#e0f2fe; color:#0369a1; font-weight:800;">\${lintEscape(k.badge)}</span>
                \${k.autoFixable ? '<span class="bpmn-lint-autofix-badge">✨ Correction automatique disponible</span>' : ''}
              </div>
              <strong style="font-size:14px; color:var(--text-primary); display:block; margin-top:4px;">\${lintEscape(rule.label)}</strong>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn-ghost" onclick="copyBpmnLintRuleSnippet('\${lintEscape(rule.id)}', 'good')" title="Copier le snippet XML de bonne pratique" style="font-size:11px; font-weight:700; padding:4px 10px; border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; border-radius:6px;">
                📋 Copier XML Conforme
              </button>
              <button type="button" class="btn-ghost" onclick="toggleBpmnLintRuleDetail('\${lintEscape(rule.id)}')" title="Fermer ce tiroir" style="font-size:11px; font-weight:700; padding:4px 8px; border:1px solid var(--border-color); border-radius:6px;">
                ✖
              </button>
            </div>
          </div>

          <!-- Explication technique et métier -->
          <div class="bpmn-lint-drawer-explanation">
            <strong>Pourquoi ce contrôle est essentiel :</strong><br>
            \${lintEscape(k.explanation)}
          </div>

          <!-- Alerte impact opérationnel -->
          <div class="bpmn-lint-drawer-impact-box">
            <span>\${lintEscape(k.impact)}</span>
          </div>

          <!-- Grille comparative : Anti-pattern vs Standard Recommandé -->
          <div class="bpmn-lint-diff-grid">
            <!-- ❌ Mauvaise Pratique -->
            <div class="bpmn-lint-diff-card bad">
              <div class="bpmn-lint-diff-header">
                <span>❌ Mauvaise Pratique (Anti-pattern)</span>
                <button type="button" class="bpmn-lint-btn-copy-code" onclick="copyBpmnLintRuleSnippet('\${lintEscape(rule.id)}', 'bad')">📋 Copier</button>
              </div>
              <div class="bpmn-lint-diff-desc">
                \${lintEscape(k.badDesc)}
              </div>
              <div class="bpmn-lint-code-wrapper">
                <pre><code>\${lintEscape(k.badSnippet)}</code></pre>
              </div>
            </div>

            <!-- ✅ Bonne Pratique -->
            <div class="bpmn-lint-diff-card good">
              <div class="bpmn-lint-diff-header">
                <span>✅ Bonne Pratique (Standard Recommandé)</span>
                <button type="button" class="bpmn-lint-btn-copy-code" onclick="copyBpmnLintRuleSnippet('\${lintEscape(rule.id)}', 'good')">📋 Copier</button>
              </div>
              <div class="bpmn-lint-diff-desc">
                \${lintEscape(k.goodDesc)}
              </div>
              <div class="bpmn-lint-code-wrapper">
                <pre><code>\${lintEscape(k.goodSnippet)}</code></pre>
              </div>
            </div>
          </div>

          <!-- Pied du tiroir avec actions rapides -->
          <div class="bpmn-lint-drawer-actions">
            <div style="font-size:11.5px; color:var(--text-secondary);">
              <span>Statut de la règle : </span>
              <strong style="color:\${rule.enabled ? '#166534' : '#991b1b'};">\${rule.enabled ? '✅ Active' : '❌ Désactivée'}</strong>
              <span> · Sévérité configurée : </span>
              <strong style="text-transform:uppercase;">\${lintEscape(rule.severity)}</strong>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-ghost" onclick="toggleBpmnLintRule(\${index}, \${!rule.enabled}); renderBpmnLintRules();" style="font-size:11.5px; font-weight:700; padding:4px 12px; border:1px solid var(--border-color); border-radius:6px; background:#fff;">
                \${rule.enabled ? 'Désactiver' : 'Activer'} cette règle
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>\` : ''}
    \`;
  }).join('');
}

`;

const newContent = content.slice(0, startIdx) + replacementBlock.trim() + '\n\n' + content.slice(endIdx);
fs.writeFileSync(jsPath, newContent, 'utf8');
console.log("Successfully updated bpmn_lint.js!");
