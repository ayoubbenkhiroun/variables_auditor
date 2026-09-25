/**
 * Paprika AuditFlow Pro - Module Auto-Fix & Détecteur de Ghost Variables
 */

let originalBpmnXml = '';
let originalBpmnFileName = 'process_corrige.bpmn';
let lastAutofixLog = [];
let detectedGhostVariables = [];

// Enregistrement du fichier source pour l'auto-fix
window.setOriginalBpmnSource = function(xmlString, fileName) {
  originalBpmnXml = xmlString;
  originalBpmnFileName = fileName || 'process_corrige.bpmn';
};

// Moteur d'Auto-Fix 1-Clic
window.applyBpmnAutoFixAndDownload = function() {
  if (!originalBpmnXml) {
    if (rawFileData && rawFileData.length > 0 && isBPMNMode) {
      // Si on a les données brutes
      alert("Veuillez importer un fichier .bpmn pour exécuter l'Auto-Fix XML direct.");
      return;
    }
    alert("Aucun fichier BPMN XML chargé pour l'Auto-Fix. Veuillez importer un fichier .bpmn.");
    return;
  }

  if (!allRows || allRows.length === 0) {
    alert("Aucune analyse active pour appliquer l'Auto-Fix.");
    return;
  }

  let modifiedXml = originalBpmnXml;
  const replacements = [];
  const fixCandidates = allRows.filter(r => r.status !== 'valid' && r.suggestion && r.suggestion !== r.name);

  if (fixCandidates.length === 0) {
    alert("Toutes les variables sont déjà conformes ! Aucune correction nécessaire.");
    return;
  }

  fixCandidates.forEach(item => {
    const oldName = item.name.trim();
    const newName = item.suggestion.trim();

    if (!oldName || !newName || oldName === newName) return;

    // 1. Remplacement exact dans les attributs name, target, source
    const attrRegexes = [
      new RegExp(`(name=["'])${escapeRegex(oldName)}(["'])`, 'g'),
      new RegExp(`(target=["'])${escapeRegex(oldName)}(["'])`, 'g'),
      new RegExp(`(source=["'])${escapeRegex(oldName)}(["'])`, 'g')
    ];

    attrRegexes.forEach(rgx => {
      if (rgx.test(modifiedXml)) {
        modifiedXml = modifiedXml.replace(rgx, `$1${newName}$2`);
        replacements.push({ from: oldName, to: newName, type: 'Attribut XML' });
      }
    });

    // 2. Remplacement dans les expressions JUEL / FEEL (${varName}, #{varName})
    const exprRegexes = [
      new RegExp(`(\\$\\{[^}]*\\b)${escapeRegex(oldName)}(\\b[^}]*\\})`, 'g'),
      new RegExp(`(\\#[^}]*\\b)${escapeRegex(oldName)}(\\b[^}]*\\})`, 'g')
    ];

    exprRegexes.forEach(rgx => {
      if (rgx.test(modifiedXml)) {
        modifiedXml = modifiedXml.replace(rgx, `$1${newName}$2`);
        replacements.push({ from: oldName, to: newName, type: 'Expression ${}' });
      }
    });
  });

  lastAutofixLog = replacements;

  // Téléchargement du fichier BPMN assaini
  const blob = new Blob([modifiedXml], { type: 'application/xml;charset=utf-8' });
  const downloadName = originalBpmnFileName.replace(/\.bpmn$/i, '') + '_autofix_paprika.bpmn';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);

  showAutofixSummaryModal(replacements, downloadName);
};

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Modal de résumé d'auto-fix
function showAutofixSummaryModal(replacements, fileName) {
  let modal = document.getElementById('autofixSummaryModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'autofixSummaryModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  const uniqueCount = new Set(replacements.map(r => r.from)).size;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 580px;">
      <div class="modal-header">
        <h3 style="display:flex; align-items:center; gap:8px;">
          <span style="color:var(--ok); font-size:18px;">✓</span> Auto-Fix BPMN Appliqué avec Succès
        </h3>
        <button class="close-modal" onclick="document.getElementById('autofixSummaryModal').style.display='none'">&times;</button>
      </div>
      <div style="padding:20px;">
        <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:16px;">
          Le fichier assaini <strong>${escapeHtml(fileName)}</strong> a été généré et téléchargé.
        </p>
        <div class="stats-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:16px;">
          <div class="stat ok">
            <div class="val">${uniqueCount}</div>
            <div class="lbl">Variables corrigées</div>
          </div>
          <div class="stat info">
            <div class="val">${replacements.length}</div>
            <div class="lbl">Occurrences remplacées</div>
          </div>
        </div>
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 8px 12px; background:#f8fafc; font-size:12px; font-family:var(--font-mono);">
          ${replacements.slice(0, 30).map(r => `<div><span style="color:var(--err);">${escapeHtml(r.from)}</span> ➔ <span style="color:var(--ok); font-weight:600;">${escapeHtml(r.to)}</span> <small style="color:var(--text-tertiary);">(${r.type})</small></div>`).join('')}
          ${replacements.length > 30 ? `<div style="color:var(--text-tertiary); margin-top:4px;">... et ${replacements.length - 30} autres remplacements.</div>` : ''}
        </div>
        <div style="margin-top:20px; text-align:right;">
          <button class="btn-primary" onclick="document.getElementById('autofixSummaryModal').style.display='none'">Fermer</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

// ---------- Détecteur de Variables Mortes (Ghost Variables) ----------
window.analyzeGhostVariables = function(xmlString) {
  if (!xmlString) return [];
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const writtenVars = new Map();
  const readVars = new Set();

  const allElements = xmlDoc.getElementsByTagName('*');
  for (let el of allElements) {
    const tagName = el.tagName;

    // Variables écrites / produites
    if (tagName.endsWith(':outputParameter') || tagName.endsWith(':out')) {
      const vName = el.getAttribute('name') || el.getAttribute('source');
      if (vName) {
        const clean = vName.replace(/[\$\{\}\#]/g, '').trim();
        writtenVars.set(clean, {
          name: clean,
          element: el.parentElement?.getAttribute('name') || el.id || 'Task',
          type: tagName
        });
      }
    }

    // Variables lues / consommées
    if (tagName.endsWith(':inputParameter') || tagName.endsWith(':in')) {
      const val = el.textContent || el.getAttribute('source') || '';
      extractVarsFromExpression(val).forEach(v => readVars.add(v));
    }

    // Dans les conditions de séquence
    if (tagName.endsWith('conditionExpression')) {
      extractVarsFromExpression(el.textContent || '').forEach(v => readVars.add(v));
    }

    // Dans les attributs
    for (let attr of el.attributes) {
      if (attr.value && (attr.value.includes('${') || attr.value.includes('#{'))) {
        extractVarsFromExpression(attr.value).forEach(v => readVars.add(v));
      }
    }
  }

  // Les variables écrites mais jamais lues dans le BPMN
  const ghosts = [];
  writtenVars.forEach((info, name) => {
    if (!readVars.has(name)) {
      ghosts.push(info);
    }
  });

  detectedGhostVariables = ghosts;
  return ghosts;
};

window.toggleGhostVarListModal = function() {
  let modal = document.getElementById('ghostVarsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ghostVarsModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  const ghosts = detectedGhostVariables || [];

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 style="display:flex; align-items:center; gap:8px;">
          <span>👻</span> Variables Mortes / Inutilisées Détectées (${ghosts.length})
        </h3>
        <button class="close-modal" onclick="document.getElementById('ghostVarsModal').style.display='none'">&times;</button>
      </div>
      <div style="padding:20px;">
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Ces variables sont générées dans le flux mais ne sont jamais exploitées en entrée d'activités, dans des passerelles ou des expressions FEEL.
        </p>
        <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr style="background:#f8fafc; text-align:left; border-bottom:1px solid var(--border-color);">
                <th style="padding:8px 12px;">Variable</th>
                <th style="padding:8px 12px;">Origine / Tâche</th>
                <th style="padding:8px 12px;">Type</th>
              </tr>
            </thead>
            <tbody>
              ${ghosts.length === 0 ? '<tr><td colspan="3" style="padding:16px; text-align:center; color:var(--text-tertiary);">Aucune variable morte détectée.</td></tr>' : 
                ghosts.map(g => `
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:8px 12px; font-family:var(--font-mono); font-weight:600; color:var(--err);">${escapeHtml(g.name)}</td>
                    <td style="padding:8px 12px; color:var(--text-secondary);">${escapeHtml(g.element)}</td>
                    <td style="padding:8px 12px;"><span class="badge warn">${escapeHtml(g.type)}</span></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
        <div style="margin-top:20px; text-align:right;">
          <button class="btn-primary" onclick="document.getElementById('ghostVarsModal').style.display='none'">Fermer</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

function extractVarsFromExpression(expr) {
  const matches = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const reserved = ['true', 'false', 'null', 'and', 'or', 'not', 'empty', 'execution', 'authenticatedUserId', 'user'];
  return matches.filter(m => !reserved.includes(m));
}

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

