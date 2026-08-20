/**
 * Camunda FlowAudit Pro - ROI Calculator Module
 * Logic, calculations, Chart.js integrations, scenario management and printing.
 */

// Global configuration defaults
const DEFAULT_ROI_CONFIG = {
  rates: {
    operator: 25,   // Operator / Junior
    analyst: 45,    // Analyst / Specialist
    manager: 65,    // Manager / Supervisor
    director: 95    // Director / Executive
  },
  global: {
    workingDays: 220,
    workingHoursPerFte: 7.5,
    errorRate: 2.0,       // 2% of tasks have errors manually
    errorCost: 15,        // Each manual error costs 15€ to resolve
    errorReduction: 99    // Automation reduces 99% of errors
  },
  recurring: {
    license: 0,           // 0€ default (Community Edition)
    infra: 1200,          // 1200€ / year
    maintenance: 2400     // 2400€ / year
  }
};

// Preset Scenarios
const PRESET_SCENARIOS = {
  'demo-rh': {
    name: "Processus RH (Onboarding)",
    devCost: 8500,
    licenseStartCost: 0,
    tasks: [
      { id: 1, name: "Création manuelle des comptes (AD, Email, Slack, etc.)", execsPerDay: 15, time: 20, timeUnit: 'min', profile: 'analyst', automationRate: 95 },
      { id: 2, name: "Planification des réunions d'onboarding & tuteurs", execsPerDay: 8, time: 15, timeUnit: 'min', profile: 'operator', automationRate: 90 },
      { id: 3, name: "Collecte, vérification & archivage des pièces administratives", execsPerDay: 12, time: 30, timeUnit: 'min', profile: 'operator', automationRate: 95 }
    ]
  },
  'demo-finance': {
    name: "Validation Factures (Finance)",
    devCost: 14000,
    licenseStartCost: 0,
    tasks: [
      { id: 1, name: "Saisie comptable des factures entrantes dans l'ERP", execsPerDay: 40, time: 10, timeUnit: 'min', profile: 'operator', automationRate: 98 },
      { id: 2, name: "Rapprochement des écarts et relance fournisseurs", execsPerDay: 10, time: 25, timeUnit: 'min', profile: 'analyst', automationRate: 80 },
      { id: 3, name: "Envoi en banque pour virement et validation de paiement", execsPerDay: 20, time: 12, timeUnit: 'min', profile: 'operator', automationRate: 95 }
    ]
  },
  'demo-client': {
    name: "Support Client (Requêtes)",
    devCost: 18500,
    licenseStartCost: 5000,
    tasks: [
      { id: 1, name: "Qualification, triage & routage des tickets entrants", execsPerDay: 90, time: 6, timeUnit: 'min', profile: 'operator', automationRate: 95 },
      { id: 2, name: "Génération de réponses types & résolutions automatisées", execsPerDay: 60, time: 12, timeUnit: 'min', profile: 'analyst', automationRate: 85 },
      { id: 3, name: "Enquêtes de satisfaction client post-résolution", execsPerDay: 50, time: 8, timeUnit: 'min', profile: 'operator', automationRate: 100 }
    ]
  }
};

// State variables
let roiConfig = JSON.parse(localStorage.getItem('roi_config')) || JSON.parse(JSON.stringify(DEFAULT_ROI_CONFIG));
let currentScenario = {
  devCost: 12000,
  licenseStartCost: 0,
  tasks: []
};

// Chart instances
let breakevenChart = null;
let compareChart = null;
let distributionChart = null;

// Initialize the ROI calculator module
window.initRoiModule = function() {
  loadConfigIntoFields();
  
  // If tasks are empty, load the first demo scenario
  const storedTasks = localStorage.getItem('roi_tasks');
  const storedScenarioMeta = localStorage.getItem('roi_scenario_meta');
  
  if (storedTasks) {
    currentScenario.tasks = JSON.parse(storedTasks);
    if (storedScenarioMeta) {
      const meta = JSON.parse(storedScenarioMeta);
      currentScenario.devCost = meta.devCost || 0;
      currentScenario.licenseStartCost = meta.licenseStartCost || 0;
      document.getElementById('roiDevCost').value = currentScenario.devCost;
      document.getElementById('roiLicenseStartCost').value = currentScenario.licenseStartCost;
    }
    document.getElementById('roiScenarioSelect').value = localStorage.getItem('roi_selected_preset') || 'custom';
  } else {
    loadSelectedRoiScenario('demo-rh');
  }
  
  renderRoiTasks();
  recalculateRoi();
};

// Load configurations from config panel inputs
function loadConfigIntoFields() {
  document.getElementById('roiRateOperator').value = roiConfig.rates.operator;
  document.getElementById('roiRateAnalyst').value = roiConfig.rates.analyst;
  document.getElementById('roiRateManager').value = roiConfig.rates.manager;
  document.getElementById('roiRateDirector').value = roiConfig.rates.director;
  
  document.getElementById('roiWorkingDays').value = roiConfig.global.workingDays;
  document.getElementById('roiWorkingHours').value = roiConfig.global.workingHoursPerFte;
  document.getElementById('roiErrorRate').value = roiConfig.global.errorRate;
  document.getElementById('roiErrorCost').value = roiConfig.global.errorCost;
  
  document.getElementById('roiLicenseCost').value = roiConfig.recurring.license;
  document.getElementById('roiInfraCost').value = roiConfig.recurring.infra;
  document.getElementById('roiMaintenanceCost').value = roiConfig.recurring.maintenance;
}

// Save config panel fields into local storage
window.saveRoiConfig = function() {
  roiConfig.rates.operator = parseFloat(document.getElementById('roiRateOperator').value) || 0;
  roiConfig.rates.analyst = parseFloat(document.getElementById('roiRateAnalyst').value) || 0;
  roiConfig.rates.manager = parseFloat(document.getElementById('roiRateManager').value) || 0;
  roiConfig.rates.director = parseFloat(document.getElementById('roiRateDirector').value) || 0;
  
  roiConfig.global.workingDays = parseInt(document.getElementById('roiWorkingDays').value) || 220;
  roiConfig.global.workingHoursPerFte = parseFloat(document.getElementById('roiWorkingHours').value) || 7.5;
  roiConfig.global.errorRate = parseFloat(document.getElementById('roiErrorRate').value) || 0;
  roiConfig.global.errorCost = parseFloat(document.getElementById('roiErrorCost').value) || 0;
  
  roiConfig.recurring.license = parseFloat(document.getElementById('roiLicenseCost').value) || 0;
  roiConfig.recurring.infra = parseFloat(document.getElementById('roiInfraCost').value) || 0;
  roiConfig.recurring.maintenance = parseFloat(document.getElementById('roiMaintenanceCost').value) || 0;
  
  localStorage.setItem('roi_config', JSON.stringify(roiConfig));
  recalculateRoi();
};

// Restore default configuration values
window.restoreDefaultConfig = function() {
  if (confirm("Voulez-vous vraiment restaurer les paramètres par défaut ?")) {
    roiConfig = JSON.parse(JSON.stringify(DEFAULT_ROI_CONFIG));
    localStorage.setItem('roi_config', JSON.stringify(roiConfig));
    loadConfigIntoFields();
    recalculateRoi();
  }
};

// Load selected preset scenario
window.loadSelectedRoiScenario = function(presetId) {
  if (presetId === 'custom') return;
  
  const preset = PRESET_SCENARIOS[presetId];
  if (!preset) return;
  
  currentScenario.devCost = preset.devCost;
  currentScenario.licenseStartCost = preset.licenseStartCost;
  currentScenario.tasks = JSON.parse(JSON.stringify(preset.tasks));
  
  document.getElementById('roiDevCost').value = preset.devCost;
  document.getElementById('roiLicenseStartCost').value = preset.licenseStartCost;
  document.getElementById('roiScenarioSelect').value = presetId;
  
  localStorage.setItem('roi_selected_preset', presetId);
  persistScenarioState();
  
  renderRoiTasks();
  recalculateRoi();
};

// Save current scenario state to local storage
function persistScenarioState() {
  localStorage.setItem('roi_tasks', JSON.stringify(currentScenario.tasks));
  localStorage.setItem('roi_scenario_meta', JSON.stringify({
    devCost: currentScenario.devCost,
    licenseStartCost: currentScenario.licenseStartCost
  }));
}

// Reset current scenario tasks
window.resetRoiToDefault = function() {
  const currentPreset = document.getElementById('roiScenarioSelect').value;
  if (currentPreset !== 'custom') {
    if (confirm("Voulez-vous réinitialiser ce scénario à ses valeurs d'origine ?")) {
      loadSelectedRoiScenario(currentPreset);
    }
  } else {
    if (confirm("Voulez-vous effacer toutes les tâches du scénario personnalisé ?")) {
      currentScenario.tasks = [];
      persistScenarioState();
      renderRoiTasks();
      recalculateRoi();
    }
  }
};

// Render tasks list in UI
function renderRoiTasks() {
  const container = document.getElementById('roiTasksContainer');
  if (!container) return;
  
  if (currentScenario.tasks.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; border: 1px dashed var(--border-color); border-radius: var(--border-radius-md); color: var(--text-tertiary);">
        <p style="margin-bottom: 12px;">Aucune tâche définie dans ce scénario.</p>
        <button class="btn-ghost" onclick="addNewRoiTask()">Ajouter une première tâche</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = currentScenario.tasks.map((task, idx) => `
    <div class="roi-task-item" data-id="${task.id}" style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 12px 15px; position: relative;">
      <!-- Delete Task Button -->
      <button onclick="removeRoiTask(${task.id})" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: var(--err); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%;" title="Supprimer la tâche">
        &times;
      </button>
      
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Task Name Input -->
        <div style="padding-right: 25px;">
          <input type="text" value="${escapeHtml(task.name)}" placeholder="Nom de la tâche manuelle" 
            style="width: 100%; font-weight: 500; font-size: 13px; background: transparent; border: none; border-bottom: 1px dashed var(--border-color); padding: 4px 0; color: var(--text-primary);" 
            onchange="updateTaskField(${task.id}, 'name', this.value)">
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div>
            <label class="input-label" style="font-size: 10px; margin-bottom: 2px;">Nombre d'exécutions / jour</label>
            <input type="number" value="${task.execsPerDay}" min="0" max="10000" class="srt" style="width: 100%; padding: 4px 8px; font-size: 12px;"
              onchange="updateTaskField(${task.id}, 'execsPerDay', parseInt(this.value) || 0)">
          </div>
          <div>
            <label class="input-label" style="font-size: 10px; margin-bottom: 2px;">Temps moyen par tâche</label>
            <div style="display: flex; gap: 4px;">
              <input type="number" value="${task.time}" min="1" max="1440" class="srt" style="flex: 1; padding: 4px 8px; font-size: 12px;"
                onchange="updateTaskField(${task.id}, 'time', parseInt(this.value) || 0)">
              <select class="srt" style="width: 60px; padding: 4px; font-size: 12px;" 
                onchange="updateTaskField(${task.id}, 'timeUnit', this.value)">
                <option value="min" ${task.timeUnit === 'min' ? 'selected' : ''}>min</option>
                <option value="h" ${task.timeUnit === 'h' ? 'selected' : ''}>heures</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div>
            <label class="input-label" style="font-size: 10px; margin-bottom: 2px;">Profil d'exécutant</label>
            <select class="srt" style="width: 100%; padding: 4px; font-size: 12px;"
              onchange="updateTaskField(${task.id}, 'profile', this.value)">
              <option value="operator" ${task.profile === 'operator' ? 'selected' : ''}>Opérateur (Junior)</option>
              <option value="analyst" ${task.profile === 'analyst' ? 'selected' : ''}>Analyste (Spécialiste)</option>
              <option value="manager" ${task.profile === 'manager' ? 'selected' : ''}>Manager (Superviseur)</option>
              <option value="director" ${task.profile === 'director' ? 'selected' : ''}>Directeur (Décideur)</option>
            </select>
          </div>
          <div>
            <label class="input-label" style="font-size: 10px; margin-bottom: 2px;">Taux d'automatisation (%)</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="range" value="${task.automationRate}" min="0" max="100" style="flex: 1; height: 4px; accent-color: var(--brand-primary);"
                oninput="this.nextElementSibling.value = this.value + '%'; updateTaskField(${task.id}, 'automationRate', parseInt(this.value))">
              <output style="font-size: 11px; font-family: var(--font-mono); width: 34px; text-align: right;">${task.automationRate}%</output>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Add a new empty task to current scenario
window.addNewRoiTask = function() {
  const newId = currentScenario.tasks.length > 0 ? Math.max(...currentScenario.tasks.map(t => t.id)) + 1 : 1;
  currentScenario.tasks.push({
    id: newId,
    name: `Tâche manuelle #${newId}`,
    execsPerDay: 10,
    time: 15,
    timeUnit: 'min',
    profile: 'operator',
    automationRate: 90
  });
  
  document.getElementById('roiScenarioSelect').value = 'custom';
  localStorage.setItem('roi_selected_preset', 'custom');
  
  persistScenarioState();
  renderRoiTasks();
  recalculateRoi();
  
  // Scroll to bottom of task list container
  const container = document.getElementById('roiTasksContainer');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// Remove task from current scenario
window.removeRoiTask = function(taskId) {
  currentScenario.tasks = currentScenario.tasks.filter(t => t.id !== taskId);
  
  document.getElementById('roiScenarioSelect').value = 'custom';
  localStorage.setItem('roi_selected_preset', 'custom');
  
  persistScenarioState();
  renderRoiTasks();
  recalculateRoi();
};

// Update specific task field
window.updateTaskField = function(taskId, field, value) {
  const task = currentScenario.tasks.find(t => t.id === taskId);
  if (task) {
    task[field] = value;
    
    // If the user modified values, switch preset selector to custom
    const presetSelect = document.getElementById('roiScenarioSelect');
    if (presetSelect.value !== 'custom') {
      // Check if current matches preset exactly (usually easier to switch to custom on any touch)
      presetSelect.value = 'custom';
      localStorage.setItem('roi_selected_preset', 'custom');
    }
    
    persistScenarioState();
    recalculateRoi();
  }
};

// Recalculate ROI and cashflows
window.recalculateRoi = function() {
  // Load dev costs
  currentScenario.devCost = parseFloat(document.getElementById('roiDevCost').value) || 0;
  currentScenario.licenseStartCost = parseFloat(document.getElementById('roiLicenseStartCost').value) || 0;
  persistScenarioState();
  
  const workingDays = roiConfig.global.workingDays;
  const errorRate = roiConfig.global.errorRate / 100.0;
  const errorCost = roiConfig.global.errorCost;
  const errorReduction = roiConfig.global.errorReduction / 100.0;
  
  let totalTimeSavedHours = 0;
  let totalManualLaborCost = 0;
  let totalAutomatedLaborCost = 0;
  let totalManualErrorCost = 0;
  let totalAutomatedErrorCost = 0;
  
  let taskSavings = [];
  
  currentScenario.tasks.forEach(t => {
    // Convert time to hours
    const rawTimeHours = t.timeUnit === 'h' ? t.time : (t.time / 60.0);
    const hourlyRate = roiConfig.rates[t.profile] || 25;
    
    // Volume metrics per year
    const yearlyVolume = t.execsPerDay * workingDays;
    const manualHoursYear = rawTimeHours * yearlyVolume;
    
    const automationPct = t.automationRate / 100.0;
    const savedHoursYear = manualHoursYear * automationPct;
    totalTimeSavedHours += savedHoursYear;
    
    // Cost calculation
    const manualCost = manualHoursYear * hourlyRate;
    const automatedCost = (manualHoursYear - savedHoursYear) * hourlyRate;
    totalManualLaborCost += manualCost;
    totalAutomatedLaborCost += automatedCost;
    
    // Manual error costs
    const manualErrors = yearlyVolume * errorRate;
    const manualErrCost = manualErrors * errorCost;
    totalManualErrorCost += manualErrCost;
    
    // Automated error costs (reduced error rate)
    const automatedErrCost = manualErrCost * (1 - errorReduction);
    totalAutomatedErrorCost += automatedErrCost;
    
    const laborSavings = manualCost - automatedCost;
    const errorSavings = manualErrCost - automatedErrCost;
    const taskSavingsYear = laborSavings + errorSavings;
    
    taskSavings.push({
      name: t.name,
      savings: taskSavingsYear
    });
  });
  
  const totalAnnualErrorSavings = totalManualErrorCost - totalAutomatedErrorCost;
  const totalLaborSavings = totalManualLaborCost - totalAutomatedLaborCost;
  const grossAnnualSavings = totalLaborSavings + totalAnnualErrorSavings;
  
  // Solution Costs Year 1 and next years
  const initialInvestment = currentScenario.devCost + currentScenario.licenseStartCost;
  const annualRunningCosts = roiConfig.recurring.license + roiConfig.recurring.infra + roiConfig.recurring.maintenance;
  
  // Year-by-year cashflow calculation
  let projections = [];
  let cumulativeCashflow = -initialInvestment;
  
  for (let year = 1; year <= 5; year++) {
    const yearCost = (year === 1) ? (initialInvestment + annualRunningCosts) : annualRunningCosts;
    const cashFlowNet = grossAnnualSavings - yearCost;
    cumulativeCashflow += cashFlowNet;
    
    projections.push({
      year: year,
      costs: yearCost,
      laborSavings: totalLaborSavings,
      errorSavings: totalAnnualErrorSavings,
      grossSavings: grossAnnualSavings,
      netCashflow: cashFlowNet,
      cumulative: cumulativeCashflow
    });
  }
  
  // Calculate Payback Period in months
  let paybackMonths = 0;
  if (grossAnnualSavings > annualRunningCosts) {
    const monthlyNetSavings = (grossAnnualSavings - annualRunningCosts) / 12.0;
    if (monthlyNetSavings > 0) {
      paybackMonths = initialInvestment / monthlyNetSavings;
    }
  }
  
  // Calculate ETP (FTE) Equivalent
  const hoursPerFteYear = workingDays * roiConfig.global.workingHoursPerFte;
  const fteSaved = hoursPerFteYear > 0 ? (totalTimeSavedHours / hoursPerFteYear) : 0;
  
  // Update KPI displays
  document.getElementById('roi-kpi-time').textContent = Math.round(totalTimeSavedHours).toLocaleString('fr-FR') + " h/an";
  document.getElementById('roi-kpi-etp').textContent = `Soit ${fteSaved.toFixed(1)} Equivalent Temps Plein`;
  
  const avgNetSavings = grossAnnualSavings - annualRunningCosts;
  document.getElementById('roi-kpi-cash').textContent = Math.round(avgNetSavings).toLocaleString('fr-FR') + " €";
  document.getElementById('roi-kpi-brut').textContent = `Gain Brut : ${Math.round(grossAnnualSavings).toLocaleString('fr-FR')} €/an`;
  
  if (paybackMonths > 0) {
    if (paybackMonths < 1) {
      document.getElementById('roi-kpi-payback').textContent = "< 1 mois";
    } else {
      document.getElementById('roi-kpi-payback').textContent = paybackMonths.toFixed(1) + " mois";
    }
    document.getElementById('roi-kpi-breakeven').textContent = `Investissement remboursé en ${Math.ceil(paybackMonths)} mois`;
  } else {
    document.getElementById('roi-kpi-payback').textContent = "N/A";
    document.getElementById('roi-kpi-breakeven').textContent = "Pas d'amortissement possible";
  }
  
  // ROI over 3 years: Net gains over 3 years / Total expenses over 3 years
  const totalExpenses3y = initialInvestment + (annualRunningCosts * 3);
  const totalGrossSavings3y = grossAnnualSavings * 3;
  const netProfit3y = totalGrossSavings3y - totalExpenses3y;
  const roiPercent3y = totalExpenses3y > 0 ? ((netProfit3y / totalExpenses3y) * 100) : 0;
  
  document.getElementById('roi-kpi-pct').textContent = (roiPercent3y > 0 ? "+" : "") + Math.round(roiPercent3y) + "%";
  
  const statusEl = document.getElementById('roi-kpi-status');
  if (roiPercent3y > 50) {
    statusEl.textContent = "Excellent retour sur investissement";
    statusEl.style.color = "var(--ok)";
  } else if (roiPercent3y > 0) {
    statusEl.textContent = "Projet rentable";
    statusEl.style.color = "var(--info)";
  } else {
    statusEl.textContent = "Projet non rentable à ce coût";
    statusEl.style.color = "var(--err)";
  }
  
  // Inject Year-by-Year projections into cash flow table
  const tableBody = document.getElementById('roiCashflowTableBody');
  if (tableBody) {
    tableBody.innerHTML = projections.map(p => `
      <tr>
        <td style="font-weight:600; color:var(--text-primary)">Année ${p.year}</td>
        <td style="color:var(--err-dark)">${Math.round(p.costs).toLocaleString('fr-FR')} €</td>
        <td>${Math.round(p.laborSavings).toLocaleString('fr-FR')} €</td>
        <td>${Math.round(p.errorSavings).toLocaleString('fr-FR')} €</td>
        <td style="font-weight:500">${Math.round(p.grossSavings).toLocaleString('fr-FR')} €</td>
        <td style="font-weight:600; color:${p.netCashflow >= 0 ? 'var(--ok-dark)' : 'var(--err-dark)'}">
          ${p.netCashflow >= 0 ? '+' : ''}${Math.round(p.netCashflow).toLocaleString('fr-FR')} €
        </td>
        <td style="font-weight:700; color:${p.cumulative >= 0 ? 'var(--ok)' : 'var(--warn-dark)'}">
          ${p.cumulative >= 0 ? '+' : ''}${Math.round(p.cumulative).toLocaleString('fr-FR')} €
        </td>
      </tr>
    `).join('');
  }
  
  // Re-draw Charts
  updateBreakevenChart(projections, initialInvestment);
  updateCompareChart(totalManualLaborCost + totalManualErrorCost, totalAutomatedLaborCost + totalAutomatedErrorCost + annualRunningCosts);
  updateDistributionChart(taskSavings);
};

// Render Breakeven line chart (Cumulative Cashflow over 5 years)
function updateBreakevenChart(projections, initialInvestment) {
  const ctx = document.getElementById('roiBreakevenChart');
  if (!ctx) return;
  
  const labels = ['Jour 0', 'Année 1', 'Année 2', 'Année 3', 'Année 4', 'Année 5'];
  
  // Cost trajectory: start at initialInvestment, add annual recurring costs
  const costData = [initialInvestment];
  // Cumulative savings: starts at 0, adds gross savings year-by-year
  const savingsData = [0];
  // Cumulative net cash flow (Break-even line): starts at -initialInvestment, reaches positive values
  const netTrajectory = [-initialInvestment];
  
  let currentCost = initialInvestment;
  let currentSavings = 0;
  
  projections.forEach(p => {
    currentCost += (p.costs - (p.year === 1 ? initialInvestment : 0)); // Year 1 recurring cost is already counted in costs
    currentSavings += p.grossSavings;
    costData.push(currentCost);
    savingsData.push(currentSavings);
    netTrajectory.push(p.cumulative);
  });
  
  if (breakevenChart) {
    breakevenChart.destroy();
  }
  
  breakevenChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Coûts cumulés Camunda',
          data: costData,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.05)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Économies cumulées (Main-d\'œuvre + Erreurs)',
          data: savingsData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        },
        {
          label: 'ROI Net cumulé (Bénéfice/Perte)',
          data: netTrajectory,
          borderColor: '#3b82f6',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointStyle: 'circle',
          pointRadius: 4,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
        },
        tooltip: {
          padding: 10,
          callbacks: {
            label: function(context) {
              return ' ' + context.dataset.label + ': ' + Math.round(context.raw).toLocaleString('fr-FR') + ' €';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#64748b',
            font: { family: 'Outfit' },
            callback: function(value) { return value.toLocaleString('fr-FR') + ' €'; }
          }
        }
      }
    }
  });
}

// Render comparison bar chart
function updateCompareChart(manualTotal, automatedTotal) {
  const ctx = document.getElementById('roiCompareChart');
  if (!ctx) return;
  
  if (compareChart) {
    compareChart.destroy();
  }
  
  compareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Situation Actuelle (Manuel)', 'Cible Camunda (Automatisé)'],
      datasets: [{
        label: 'Coût Annuel Global (Salaires + Erreurs + Ops/Maintenance)',
        data: [manualTotal, automatedTotal],
        backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['#f59e0b', '#10b981'],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' Coût total : ' + Math.round(context.raw).toLocaleString('fr-FR') + ' € / an';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#64748b',
            font: { family: 'Outfit' },
            callback: function(value) { return value.toLocaleString('fr-FR') + ' €'; }
          }
        }
      }
    }
  });
}

// Render distribution donut chart
function updateDistributionChart(taskSavings) {
  const ctx = document.getElementById('roiDistributionChart');
  if (!ctx) return;
  
  if (distributionChart) {
    distributionChart.destroy();
  }
  
  const labels = taskSavings.map(t => t.name.length > 30 ? t.name.substring(0, 27) + '...' : t.name);
  const data = taskSavings.map(t => Math.round(t.savings));
  
  // Custom colors matching the dashboard style
  const colors = [
    'rgba(255, 117, 32, 0.85)',
    'rgba(59, 130, 246, 0.85)',
    'rgba(16, 185, 129, 0.85)',
    'rgba(139, 92, 246, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(20, 184, 166, 0.85)'
  ];
  
  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['Aucune tâche'],
      datasets: [{
        data: data.length > 0 ? data : [0],
        backgroundColor: colors.slice(0, Math.max(1, labels.length)),
        borderColor: 'rgba(9, 13, 22, 0.6)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' Économie : ' + context.raw.toLocaleString('fr-FR') + ' € / an';
            }
          }
        }
      }
    }
  });
}

// Export ROI scenario as JSON file
window.exportRoiScenario = function() {
  const data = {
    appName: 'Camunda FlowAudit Pro ROI Scenario',
    date: new Date().toISOString(),
    config: roiConfig,
    scenario: currentScenario
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const fileName = 'scenari_roi_camunda_' + (document.getElementById('roiScenarioSelect').value) + '.json';
  
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Trigger file input for importing JSON
window.triggerRoiScenarioImport = function() {
  document.getElementById('roiImportFile').click();
};

// Import scenario from JSON file
window.importRoiScenario = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.scenario && Array.isArray(data.scenario.tasks)) {
        if (data.config) {
          roiConfig = data.config;
          localStorage.setItem('roi_config', JSON.stringify(roiConfig));
          loadConfigIntoFields();
        }
        
        currentScenario = data.scenario;
        document.getElementById('roiDevCost').value = currentScenario.devCost || 0;
        document.getElementById('roiLicenseStartCost').value = currentScenario.licenseStartCost || 0;
        document.getElementById('roiScenarioSelect').value = 'custom';
        localStorage.setItem('roi_selected_preset', 'custom');
        
        persistScenarioState();
        renderRoiTasks();
        recalculateRoi();
        
        alert("Le scénario ROI a été importé avec succès !");
      } else {
        alert("Format de fichier invalide. Impossible d'importer le scénario.");
      }
    } catch (err) {
      alert("Erreur de lecture du fichier JSON : " + err.message);
    }
  };
  reader.readAsText(file);
};

// Print the ROI Report nicely or save as PDF
window.printRoiReport = function() {
  window.print();
};

// Safe HTML Escape utility
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
