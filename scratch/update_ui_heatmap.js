const fs = require('fs');
const path = require('path');

// 1. Mise à jour de css/style.css
const cssPath = path.join(__dirname, '../css/style.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

const heatmapCss = `
/* ==========================================================================
   🔥 Overlay Heatmap de Santé BPMN & Markers Visuels
   ========================================================================== */

/* Nœud 100% Conforme (Vert Émeraude) */
.djs-element.bpmn-heatmap-ok:not(.djs-connection) .djs-visual > :nth-child(1) {
  stroke: #16a34a !important;
  stroke-width: 2.5px !important;
  fill: #f0fdf4 !important;
  filter: drop-shadow(0 0 6px rgba(22, 163, 74, 0.35)) !important;
  transition: all 0.25s ease;
}

/* Nœud avec Avertissements / Nommage (Ambre / Orange) */
.djs-element.bpmn-heatmap-warn:not(.djs-connection) .djs-visual > :nth-child(1) {
  stroke: #ea580c !important;
  stroke-width: 2.5px !important;
  fill: #fff7ed !important;
  filter: drop-shadow(0 0 8px rgba(234, 88, 12, 0.45)) !important;
  transition: all 0.25s ease;
}

/* Nœud avec Anomalies Bloquantes / Erreurs (Rouge Flamboyant Pulsant) */
.djs-element.bpmn-heatmap-blocker:not(.djs-connection) .djs-visual > :nth-child(1) {
  stroke: #dc2626 !important;
  stroke-width: 3px !important;
  fill: #fef2f2 !important;
  filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0.6)) !important;
  animation: bpmnHeatmapPulse 1.8s infinite ease-in-out;
  transition: all 0.25s ease;
}

@keyframes bpmnHeatmapPulse {
  0% {
    filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(220, 38, 38, 0.85));
    stroke-width: 3.5px;
  }
  100% {
    filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.4));
  }
}

/* Bouton Heatmap dans la toolbar du visualiseur */
#btnToggleBpmnLintHeatmap.active {
  background: linear-gradient(135deg, #ea580c, #dc2626) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 10px rgba(234, 88, 12, 0.4) !important;
  border-color: transparent !important;
}
`;

if (!cssContent.includes('bpmn-heatmap-ok')) {
  cssContent += '\n' + heatmapCss;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('✅ css/style.css enrichi avec les styles Heatmap !');
}

// 2. Mise à jour de index.html pour ajouter le bouton Heatmap
const htmlPath = path.join(__dirname, '../index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetToolbarSearch = `<button class="btn-ghost" onclick="bpmnLintClearFocus()" title="Afficher tous les éléments sans focus spécifique">🎯 Vue globale</button>`;
const heatmapButtonHtml = `<button class="btn-ghost" onclick="bpmnLintClearFocus()" title="Afficher tous les éléments sans focus spécifique">🎯 Vue globale</button>
                <button class="btn-ghost" id="btnToggleBpmnLintHeatmap" onclick="bpmnLintToggleHeatmap()" title="Activer/Désactiver la Heatmap de santé sur le diagramme (Code couleur Vert/Ambre/Rouge)">🔥 Heatmap</button>`;

if (htmlContent.includes(targetToolbarSearch) && !htmlContent.includes('btnToggleBpmnLintHeatmap')) {
  htmlContent = htmlContent.replace(targetToolbarSearch, heatmapButtonHtml);
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✅ index.html enrichi avec le bouton Heatmap !');
}
