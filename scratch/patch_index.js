const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Step 2 panels (Parent filter & Activity Ordering Mode)
const step2Target = '<!-- Composant Arborescence Visuelle Intelligente (Tree View) -->';
const step2Insert = `<!-- Panneau Multi-Parents & Sous-Processus Partagés -->
                  <div id="pmgParentFilterContainer"
                    style="margin-bottom: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 12px 16px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 15px;">🏛️</span>
                        <span style="font-weight: 700; font-size: 12.5px; color: var(--text-primary);">Processus Parents &amp; Sous-processus Partagés :</span>
                        <span id="pmgParentCountBadge" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(99, 102, 241, 0.12); color: #6366f1; font-weight: 600; border: 1px solid rgba(99, 102, 241, 0.25);">Détection auto</span>
                      </div>
                      <button class="btn-ghost" style="padding: 3px 10px; font-size: 11px; height: 26px; color: var(--brand-primary); font-weight: 600; border: 1px solid var(--border-color);" onclick="openPmgParentProcessModal()">
                        ⚙️ Spécifier / Ajuster les Parents (P1, P2...)
                      </button>
                    </div>
                    <div id="pmgParentChipsList" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                      <span style="color: var(--text-tertiary); font-size: 11.5px;">Chargez des BPMN pour voir les filtres par processus parent...</span>
                    </div>
                  </div>

                  <!-- Panneau Mode d'Ordonnancement des Activités -->
                  <div id="pmgOrderModeContainer"
                    style="margin-bottom: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 12px 16px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 15px;">🧭</span>
                        <span style="font-weight: 700; font-size: 12.5px; color: var(--text-primary);">Mode d'ordonnancement des activités :</span>
                        <span id="pmgActiveOrderModeDesc" style="font-size: 11px; color: var(--text-secondary); font-style: italic;">Tri par flux d'exécution séquentiel (StartEvent &rarr; Flow)</span>
                      </div>
                      <div class="pmg-order-mode-bar" style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button class="pmg-order-segmented-btn active" id="btnOrderFlow" onclick="setPmgActivityOrderMode('flow')" title="Parcours séquentiel DAG du flux BPMN depuis les débuts">
                          🌊 Flux BPMN (Flow)
                        </button>
                        <button class="pmg-order-segmented-btn" id="btnOrderDiagram" onclick="setPmgActivityOrderMode('diagram')" title="Position géométrique réelle (coordonnées X, Y sur le diagramme BPMNDI)">
                          📐 Visuel Diagramme (BPMNDI)
                        </button>
                        <button class="pmg-order-segmented-btn" id="btnOrderLevel" onclick="setPmgActivityOrderMode('level')" title="Par niveau de profondeur hiérarchique (Parent > Macro SP > Tâche)">
                          📊 Hiérarchique (Niveau)
                        </button>
                        <button class="pmg-order-segmented-btn" id="btnOrderXml" onclick="setPmgActivityOrderMode('xml')" title="Ordre brut d'apparition dans le document XML source">
                          📄 Document XML
                        </button>
                      </div>
                    </div>
                  </div>

                  `;

if (!html.includes('id="pmgParentFilterContainer"')) {
  html = html.replace(step2Target, step2Insert + step2Target);
}

// 2. Modal modalPmgParentProcesses
const modalTarget = '<div class="modal" id="modalPmgEditTreeNode"';
const modalInsert = `<!-- Modal pour la Sélection et Configuration des Processus Parents (Multi-Parents P1, P2, P3) -->
  <div class="modal" id="modalPmgParentProcesses"
    style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); z-index:9999; justify-content:center; align-items:center;">
    <div class="modal-content"
      style="background:var(--bg-card); border-radius:var(--border-radius-md); padding:24px; max-width:840px; width:92%; max-height:90vh; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 12px 36px rgba(0,0,0,0.45);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">🏛️</span>
          <div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin:0;">
              Configuration des Processus Parents (P1, P2, P3...) &amp; Liaisons Sous-processus
            </h3>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              Définissez les processus parents racines et contrôlez l'affectation des sous-processus dédiés ou partagés.
            </div>
          </div>
        </div>
        <button class="btn-ghost" onclick="closePmgParentProcessModal()" style="padding:4px 10px; font-size:16px;">✕</button>
      </div>

      <div id="pmgParentProcessModalBody" style="flex:1; overflow-y:auto; padding-right:4px; margin-bottom:16px;">
        <!-- Rempli dynamiquement par JS -->
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:14px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn-ghost" style="font-size:11.5px; padding:4px 10px;" onclick="resetPmgParentDetectionToAuto()">🔄 Réinitialiser Détection Auto</button>
          <button class="btn-ghost" style="font-size:11.5px; padding:4px 10px;" onclick="toggleAllPmgProcessesAsParents(true)">✅ Tout marquer comme Parents</button>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-ghost" onclick="closePmgParentProcessModal()">Annuler</button>
          <button class="btn-primary" style="padding:6px 16px; font-weight:600;" onclick="applyPmgParentProcessSelection()">
            💾 Appliquer &amp; Recalculer l'Arborescence
          </button>
        </div>
      </div>
    </div>
  </div>

  `;

if (!html.includes('id="modalPmgParentProcesses"')) {
  html = html.replace(modalTarget, modalInsert + modalTarget);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully patched index.html!');
