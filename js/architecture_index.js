/**
 * ==============================================================================
 * Bouygues Telecom - AuditFlow Pro
 * Module : Simulateur de Complexité & Score d'Architecture (BPMN Architecture Index)
 * Analyse de la complexité cyclomatique, maintenabilité et dette technique BPMN
 * ==============================================================================
 */

let currentArchReport = null;

function initArchitectureModule() {
  analyzeArchitectureComplexity();
}

/**
 * Calcul des métriques d'architecture et de complexité cyclomatique
 */
function analyzeArchitectureComplexity() {
  const docs = [];
  if (typeof bpmnBatch !== 'undefined' && bpmnBatch && bpmnBatch.length > 0) {
    bpmnBatch.forEach(b => { if (b.doc) docs.push({ doc: b.doc, name: b.name || b.fileName }); });
  } else if (typeof bpmnXmlDoc !== 'undefined' && bpmnXmlDoc) {
    docs.push({ doc: bpmnXmlDoc, name: bpmnFileName || 'Processus Principal' });
  }

  if (docs.length === 0) {
    renderEmptyArchitecture();
    return;
  }

  let totalNodes = 0;
  let totalFlows = 0;
  let totalGateways = 0;
  let totalCallActivities = 0;
  let totalServiceTasks = 0;
  let totalUserTasks = 0;
  let totalBoundaryEvents = 0;

  const processReports = [];

  docs.forEach((item, idx) => {
    const doc = item.doc;
    const proc = doc.querySelector('process');
    const procId = proc?.getAttribute('id') || `Process_${idx + 1}`;
    const procName = proc?.getAttribute('name') || item.name || procId;

    const nodes = doc.querySelectorAll('startEvent, endEvent, task, serviceTask, userTask, sendTask, receiveTask, scriptTask, businessRuleTask, callActivity, exclusiveGateway, parallelGateway, inclusiveGateway, intermediateCatchEvent');
    const flows = doc.querySelectorAll('sequenceFlow');
    const gateways = doc.querySelectorAll('exclusiveGateway, parallelGateway, inclusiveGateway, complexGateway');
    const calls = doc.querySelectorAll('callActivity');
    const serviceTasks = doc.querySelectorAll('serviceTask, sendTask');
    const userTasks = doc.querySelectorAll('userTask');
    const boundaries = doc.querySelectorAll('boundaryEvent');

    const N = nodes.length;
    const E = flows.length;
    const P = 1; // Un composant connexe
    // Complexité cyclomatique McCabe = E - N + 2P
    const cyclomatic = Math.max(1, E - N + (2 * P));

    totalNodes += N;
    totalFlows += E;
    totalGateways += gateways.length;
    totalCallActivities += calls.length;
    totalServiceTasks += serviceTasks.length;
    totalUserTasks += userTasks.length;
    totalBoundaryEvents += boundaries.length;

    // Score de maintenabilité du processus (0-100)
    let score = 100;
    if (cyclomatic > 15) score -= 30;
    else if (cyclomatic > 8) score -= 15;

    if (N > 25) score -= 20;
    else if (N > 15) score -= 10;

    if (gateways.length > 6) score -= 15;

    score = Math.max(20, Math.min(100, score));

    let grade = 'A';
    if (score < 50) grade = 'D';
    else if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';

    processReports.push({
      name: procName,
      id: procId,
      nodesCount: N,
      flowsCount: E,
      cyclomatic: cyclomatic,
      gatewaysCount: gateways.length,
      callsCount: calls.length,
      serviceTasksCount: serviceTasks.length,
      userTasksCount: userTasks.length,
      score: score,
      grade: grade
    });
  });

  // Calcul du score global d'architecture
  const avgScore = Math.round(processReports.reduce((acc, p) => acc + p.score, 0) / processReports.length);
  let globalGrade = 'A';
  if (avgScore < 50) globalGrade = 'D';
  else if (avgScore < 70) globalGrade = 'C';
  else if (avgScore < 85) globalGrade = 'B';

  const recommendations = [];
  if (totalGateways > 10) {
    recommendations.push('⚠️ Densité élevée de passerelles conditionnelles (XOR/OR). Découper les décisions complexes dans des tables de décision DMN dédiées.');
  }
  if (totalCallActivities === 0 && totalNodes > 20) {
    recommendations.push('💡 Aucun sous-processus modulaire (Call Activity). Modulariser les blocs fonctionnels indépendants pour faciliter la réutilisabilité et la maintenance.');
  }
  if (totalBoundaryEvents === 0) {
    recommendations.push('🛡️ Absence d\'événements frontières (Boundary Events). Prévoir la gestion des erreurs techniques et des timeouts pour garantir la résilience de la production.');
  }
  if (totalServiceTasks > totalUserTasks * 3) {
    recommendations.push('⚡ Forte dominante de microservices automatisés. Assurer un monitoring fin des topics Zeebe et des workers distribués.');
  }

  currentArchReport = {
    globalScore: avgScore,
    globalGrade: globalGrade,
    totalProcesses: processReports.length,
    totalNodes: totalNodes,
    totalFlows: totalFlows,
    totalGateways: totalGateways,
    totalCallActivities: totalCallActivities,
    totalServiceTasks: totalServiceTasks,
    totalUserTasks: totalUserTasks,
    processReports: processReports,
    recommendations: recommendations
  };

  renderArchitectureView();
}

function renderEmptyArchitecture() {
  const container = document.getElementById('archContentArea');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <div>Aucun processus BPMN chargé. Importez un modèle pour calculer le score de complexité et l'indice d'architecture.</div>
      </div>
    `;
  }
}

function renderArchitectureView() {
  const container = document.getElementById('archContentArea');
  if (!container || !currentArchReport) return;

  const rep = currentArchReport;
  const gradeColor = rep.globalGrade === 'A' ? '#16a34a' : rep.globalGrade === 'B' ? '#009cd7' : rep.globalGrade === 'C' ? '#ea5b0c' : '#dc2626';

  let html = `
    <!-- KPI Header Row -->
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat ok">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="val" style="color:${gradeColor}; font-size:36px;">${rep.globalGrade}</div>
          <div class="badge ok" style="font-size:12px;">Score: ${rep.globalScore}/100</div>
        </div>
        <div class="lbl">Indice Global d'Architecture</div>
      </div>

      <div class="stat info">
        <div class="val">${rep.totalNodes}</div>
        <div class="lbl">Éléments &amp; Tâches BPMN</div>
      </div>

      <div class="stat warn">
        <div class="val">${rep.totalGateways}</div>
        <div class="lbl">Passerelles de Décision (Gateways)</div>
      </div>

      <div class="stat ok">
        <div class="val">${rep.totalCallActivities}</div>
        <div class="lbl">Sous-processus Réutilisables</div>
      </div>
    </div>

    <!-- Recommendations & Actions -->
    ${rep.recommendations.length > 0 ? `
      <div class="arch-recs-card" style="margin-bottom:24px; padding:18px 22px; background:#ffffff; border:1px solid var(--border-color); border-left:4px solid var(--brand-primary); border-radius:var(--border-radius-md); box-shadow:var(--shadow-xs);">
        <h4 style="font-size:14px; font-weight:800; color:var(--brand-primary); margin:0 0 10px 0; text-transform:uppercase; letter-spacing:0.5px;">
          Plan d'Action &amp; Conseils d'Architecture Bouygues Telecom
        </h4>
        <ul style="margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--text-secondary);">
          ${rep.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Tableau Détaillé par Processus -->
    <div class="tbl-wrap">
      <div style="padding:16px 20px; background:#ffffff; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:14.5px; font-weight:800; color:var(--brand-primary); margin:0;">
          Détail de la Complexité par Processus Orchestré
        </h4>
        <span style="font-size:12px; color:var(--text-tertiary); font-weight:600;">Formule McCabe : E - N + 2P</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:30%;">Nom du Processus</th>
            <th style="width:12%;">Grade</th>
            <th style="width:15%;">Complexité Cyclomatique</th>
            <th style="width:14%;">Tâches / Nœuds</th>
            <th style="width:14%;">Gateways</th>
            <th style="width:15%;">Score Maintenabilité</th>
          </tr>
        </thead>
        <tbody>
          ${rep.processReports.map(p => {
            const pColor = p.grade === 'A' ? '#16a34a' : p.grade === 'B' ? '#009cd7' : p.grade === 'C' ? '#ea5b0c' : '#dc2626';
            return `
              <tr>
                <td style="font-weight:700; color:var(--text-primary);">${escapeHtml(p.name)}</td>
                <td><span class="badge" style="background:${pColor}15; color:${pColor}; border:1px solid ${pColor}40; font-size:13px; font-weight:800;">${p.grade}</span></td>
                <td style="font-family:var(--font-mono); font-weight:700; color:${p.cyclomatic > 10 ? '#dc2626' : '#16a34a'};">${p.cyclomatic}</td>
                <td>${p.nodesCount} (${p.serviceTasksCount} auto, ${p.userTasksCount} manuel)</td>
                <td>${p.gatewaysCount}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="score-track" style="height:6px; flex:1;">
                      <div class="score-fill" style="width:${p.score}%; background:${pColor};"></div>
                    </div>
                    <span style="font-weight:700; font-size:12px;">${p.score}%</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

window.initArchitectureModule = initArchitectureModule;
window.analyzeArchitectureComplexity = analyzeArchitectureComplexity;
