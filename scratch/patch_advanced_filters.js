const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
const indexPath = path.join(__dirname, '..', 'index.html');

let pmgCode = fs.readFileSync(pmgPath, 'utf8');
let htmlCode = fs.readFileSync(indexPath, 'utf8');

// 1. In index.html, update Step 3 (panel 3), Step 4 (panel 4), Step 5 (panel 5) table structures
// Step 3 Table Update:
const oldStep3TableSection = `<div class="tbl-wrap"
                    style="max-height: 380px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px;">
                      <thead>
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 35%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 15%;">Type</th>
                          <th style="padding: 8px; width: 25%;">Entité / Rôle Réalisateur (Lane/Pool)</th>
                          <th style="padding: 8px; width: 25%;">Groupe d'Utilisateurs / Candidats</th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep2ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

const newStep3TableSection = `<!-- Toolbar Filtres Avancés Étape 3 -->
                  <div class="pmg-filter-toolbar" id="pmgStep3FilterToolbar">
                    <div class="pmg-filter-chips-group">
                      <span class="pmg-filter-count-badge" id="pmgStep3FilterCount">🎯 <strong>0</strong> activités affichées</span>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep3UserTasks" onclick="togglePmgStep3Preset('userTasks')">👤 User Tasks</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep3NoGroup" onclick="togglePmgStep3Preset('noGroup')">⚠️ Sans Groupe</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep3Transverse" onclick="togglePmgStep3Preset('transverse')">🔀 Transverses</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep3Inherited" onclick="togglePmgStep3Preset('inherited')">↳ Hérités du Parent</button>
                    </div>
                    <button type="button" class="pmg-filter-reset-btn" onclick="resetPmgStep3Filters()">🔄 Réinitialiser les filtres</button>
                  </div>

                  <div class="tbl-wrap"
                    style="max-height: 440px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px; border-collapse: separate; border-spacing: 0;">
                      <thead style="position: sticky; top: 0; z-index: 5; background: var(--bg-card);">
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 34%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 16%;">Type BPMN</th>
                          <th style="padding: 8px; width: 25%;">Entité / Rôle Réalisateur (Lane/Pool)</th>
                          <th style="padding: 8px; width: 25%;">Groupe d'Utilisateurs / Candidats</th>
                        </tr>
                        <!-- Ligne des filtres avancés par colonne -->
                        <tr class="pmg-col-filter-row">
                          <th>
                            <div class="pmg-col-filter-input-wrap">
                              <input type="text" id="pmgFilterStep3Act" class="pmg-col-filter-input" placeholder="🔍 Filtrer par nom ou ID..." oninput="onPmgStep3FilterChange()">
                              <button class="pmg-col-filter-clear" onclick="clearPmgStep3ColFilter('act')">×</button>
                            </div>
                          </th>
                          <th>
                            <select id="pmgFilterStep3Type" class="pmg-col-filter-select" onchange="onPmgStep3FilterChange()">
                              <option value="all">Tous les types</option>
                            </select>
                          </th>
                          <th>
                            <select id="pmgFilterStep3Entity" class="pmg-col-filter-select" onchange="onPmgStep3FilterChange()">
                              <option value="all">Toutes les entités</option>
                            </select>
                          </th>
                          <th>
                            <div style="display:flex; gap:4px;">
                              <select id="pmgFilterStep3GroupStatus" class="pmg-col-filter-select" style="flex:1;" onchange="onPmgStep3FilterChange()">
                                <option value="all">Tous les statuts</option>
                                <option value="with_group">👤 Avec groupe candidat</option>
                                <option value="no_group">⚠️ Warning : Sans groupe</option>
                                <option value="transverse">🔀 Transverse (Entité externe)</option>
                                <option value="not_applicable">— Non applicable</option>
                              </select>
                              <div class="pmg-col-filter-input-wrap" style="flex:1;">
                                <input type="text" id="pmgFilterStep3GroupText" class="pmg-col-filter-input" placeholder="🔍 Groupe..." oninput="onPmgStep3FilterChange()">
                                <button class="pmg-col-filter-clear" onclick="clearPmgStep3ColFilter('groupText')">×</button>
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep2ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

// Step 4 Table Update:
const oldStep4TableSection = `<div class="tbl-wrap"
                    style="max-height: 350px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px;">
                      <thead>
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 30%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 12%;">Type</th>
                          <th style="padding: 8px; width: 29%;">Variables d'Entrée (Inputs)</th>
                          <th style="padding: 8px; width: 29%;">Variables de Sortie (Outputs)</th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep3ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

const newStep4TableSection = `<!-- Toolbar Filtres Avancés Étape 4 -->
                  <div class="pmg-filter-toolbar" id="pmgStep4FilterToolbar">
                    <div class="pmg-filter-chips-group">
                      <span class="pmg-filter-count-badge" id="pmgStep4FilterCount">🎯 <strong>0</strong> activités affichées</span>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep4WithInputs" onclick="togglePmgStep4Preset('withInputs')">📥 Avec Inputs</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep4WithOutputs" onclick="togglePmgStep4Preset('withOutputs')">📤 Avec Outputs</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep4NoVars" onclick="togglePmgStep4Preset('noVars')">⚠️ Sans Variables I/O</button>
                    </div>
                    <button type="button" class="pmg-filter-reset-btn" onclick="resetPmgStep4Filters()">🔄 Réinitialiser les filtres</button>
                  </div>

                  <div class="tbl-wrap"
                    style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px; border-collapse: separate; border-spacing: 0;">
                      <thead style="position: sticky; top: 0; z-index: 5; background: var(--bg-card);">
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 30%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 14%;">Type BPMN</th>
                          <th style="padding: 8px; width: 28%;">Variables d'Entrée (Inputs)</th>
                          <th style="padding: 8px; width: 28%;">Variables de Sortie (Outputs)</th>
                        </tr>
                        <tr class="pmg-col-filter-row">
                          <th>
                            <div class="pmg-col-filter-input-wrap">
                              <input type="text" id="pmgFilterStep4Act" class="pmg-col-filter-input" placeholder="🔍 Nom ou ID..." oninput="onPmgStep4FilterChange()">
                              <button class="pmg-col-filter-clear" onclick="clearPmgStep4ColFilter('act')">×</button>
                            </div>
                          </th>
                          <th>
                            <select id="pmgFilterStep4Type" class="pmg-col-filter-select" onchange="onPmgStep4FilterChange()">
                              <option value="all">Tous les types</option>
                            </select>
                          </th>
                          <th>
                            <div style="display:flex; gap:4px;">
                              <select id="pmgFilterStep4InStatus" class="pmg-col-filter-select" style="width:90px;" onchange="onPmgStep4FilterChange()">
                                <option value="all">Tous</option>
                                <option value="has">Avec</option>
                                <option value="none">Sans</option>
                              </select>
                              <div class="pmg-col-filter-input-wrap" style="flex:1;">
                                <input type="text" id="pmgFilterStep4InText" class="pmg-col-filter-input" placeholder="🔍 Nom variable..." oninput="onPmgStep4FilterChange()">
                                <button class="pmg-col-filter-clear" onclick="clearPmgStep4ColFilter('inText')">×</button>
                              </div>
                            </div>
                          </th>
                          <th>
                            <div style="display:flex; gap:4px;">
                              <select id="pmgFilterStep4OutStatus" class="pmg-col-filter-select" style="width:90px;" onchange="onPmgStep4FilterChange()">
                                <option value="all">Tous</option>
                                <option value="has">Avec</option>
                                <option value="none">Sans</option>
                              </select>
                              <div class="pmg-col-filter-input-wrap" style="flex:1;">
                                <input type="text" id="pmgFilterStep4OutText" class="pmg-col-filter-input" placeholder="🔍 Nom variable..." oninput="onPmgStep4FilterChange()">
                                <button class="pmg-col-filter-clear" onclick="clearPmgStep4ColFilter('outText')">×</button>
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep3ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

// Step 5 Table Update:
const oldStep5TableSection = `<div class="tbl-wrap"
                    style="max-height: 350px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px;">
                      <thead>
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 30%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 20%;">Mode de Réalisation</th>
                          <th style="padding: 8px; width: 25%;">Applicable dans quel cas ? (Condition)</th>
                          <th style="padding: 8px; width: 25%;">Commentaire / Documentation</th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep4ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

const newStep5TableSection = `<!-- Toolbar Filtres Avancés Étape 5 -->
                  <div class="pmg-filter-toolbar" id="pmgStep5FilterToolbar">
                    <div class="pmg-filter-chips-group">
                      <span class="pmg-filter-count-badge" id="pmgStep5FilterCount">🎯 <strong>0</strong> activités affichées</span>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep5Call" onclick="togglePmgStep5Preset('Call Activity')">📁 Call Activity</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep5Auto" onclick="togglePmgStep5Preset('Automatique')">⚙️ Automatique</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep5Manual" onclick="togglePmgStep5Preset('Manuelle')">👤 Manuelle</button>
                      <button type="button" class="pmg-filter-pill-btn" id="pmgChipStep5NoDoc" onclick="togglePmgStep5Preset('noDoc')">⚠️ Sans Doc</button>
                    </div>
                    <button type="button" class="pmg-filter-reset-btn" onclick="resetPmgStep5Filters()">🔄 Réinitialiser les filtres</button>
                  </div>

                  <div class="tbl-wrap"
                    style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                    <table style="width: 100%; font-size: 12px; border-collapse: separate; border-spacing: 0;">
                      <thead style="position: sticky; top: 0; z-index: 5; background: var(--bg-card);">
                        <tr style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
                          <th style="padding: 8px; width: 30%;">Activité (Hiérarchie)</th>
                          <th style="padding: 8px; width: 18%;">Mode de Réalisation</th>
                          <th style="padding: 8px; width: 26%;">Applicable dans quel cas ? (Condition)</th>
                          <th style="padding: 8px; width: 26%;">Commentaire / Documentation</th>
                        </tr>
                        <tr class="pmg-col-filter-row">
                          <th>
                            <div class="pmg-col-filter-input-wrap">
                              <input type="text" id="pmgFilterStep5Act" class="pmg-col-filter-input" placeholder="🔍 Nom ou ID..." oninput="onPmgStep5FilterChange()">
                              <button class="pmg-col-filter-clear" onclick="clearPmgStep5ColFilter('act')">×</button>
                            </div>
                          </th>
                          <th>
                            <select id="pmgFilterStep5Mode" class="pmg-col-filter-select" onchange="onPmgStep5FilterChange()">
                              <option value="all">Tous les modes</option>
                            </select>
                          </th>
                          <th>
                            <div class="pmg-col-filter-input-wrap">
                              <input type="text" id="pmgFilterStep5Case" class="pmg-col-filter-input" placeholder="🔍 Filtrer condition..." oninput="onPmgStep5FilterChange()">
                              <button class="pmg-col-filter-clear" onclick="clearPmgStep5ColFilter('case')">×</button>
                            </div>
                          </th>
                          <th>
                            <div class="pmg-col-filter-input-wrap">
                              <input type="text" id="pmgFilterStep5Comment" class="pmg-col-filter-input" placeholder="🔍 Filtrer commentaire..." oninput="onPmgStep5FilterChange()">
                              <button class="pmg-col-filter-clear" onclick="clearPmgStep5ColFilter('comment')">×</button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="pmgStep4ManualTableBody">
                        <!-- Rempli dynamiquement par JS -->
                      </tbody>
                    </table>
                  </div>`;

if (htmlCode.includes(oldStep3TableSection)) {
  htmlCode = htmlCode.replace(oldStep3TableSection, newStep3TableSection);
  console.log('Successfully updated Step 3 table markup in index.html');
} else {
  console.error('Could not find Step 3 table section');
}

if (htmlCode.includes(oldStep4TableSection)) {
  htmlCode = htmlCode.replace(oldStep4TableSection, newStep4TableSection);
  console.log('Successfully updated Step 4 table markup in index.html');
} else {
  console.error('Could not find Step 4 table section');
}

if (htmlCode.includes(oldStep5TableSection)) {
  htmlCode = htmlCode.replace(oldStep5TableSection, newStep5TableSection);
  console.log('Successfully updated Step 5 table markup in index.html');
} else {
  console.error('Could not find Step 5 table section');
}

fs.writeFileSync(indexPath, htmlCode, 'utf8');

// 2. Now let's implement the JavaScript logic for filter state and reactive rendering in js/pmg.js
const filtersLogic = `
// =========================================================================
// 🎯 PMG ADVANCED COLUMN FILTER ENGINE (Step 3, 4, 5 & Dynamic Sync)
// =========================================================================

window.pmgColFilters = {
  step3: { act: '', type: 'all', entity: 'all', groupStatus: 'all', groupText: '', preset: null },
  step4: { act: '', type: 'all', inStatus: 'all', inText: '', outStatus: 'all', outText: '', preset: null },
  step5: { act: '', mode: 'all', case: '', comment: '', preset: null }
};

window.syncPmgStepActivityField = function(actId, field, val) {
  const list = window.pmgTempSubprocesses || window.pmgActivities || [];
  const act = list.find(a => a.id === actId);
  if (act) {
    if (field === 'inputs' || field === 'outputs') {
      act[field] = typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : (val || []);
    } else {
      act[field] = val;
    }
    if (field === 'entity') {
      act.isInheritedEntity = false;
    }
  }
};

// Step 3 Filtering & Helpers
window.onPmgStep3FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep3Act');
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
  const groupTextInput = document.getElementById('pmgFilterStep3GroupText');

  window.pmgColFilters.step3.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step3.type = typeSelect?.value || 'all';
  window.pmgColFilters.step3.entity = entitySelect?.value || 'all';
  window.pmgColFilters.step3.groupStatus = groupStatusSelect?.value || 'all';
  window.pmgColFilters.step3.groupText = (groupTextInput?.value || '').trim().toLowerCase();

  // Highlight active filters
  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step3.act));
  if (typeSelect) typeSelect.classList.toggle('has-filter', window.pmgColFilters.step3.type !== 'all');
  if (entitySelect) entitySelect.classList.toggle('has-filter', window.pmgColFilters.step3.entity !== 'all');
  if (groupStatusSelect) groupStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step3.groupStatus !== 'all');
  if (groupTextInput) groupTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step3.groupText));

  window.renderPmgStep2ManualTable();
};

window.clearPmgStep3ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep3Act');
    if (el) el.value = '';
  } else if (field === 'groupText') {
    const el = document.getElementById('pmgFilterStep3GroupText');
    if (el) el.value = '';
  }
  window.onPmgStep3FilterChange();
};

window.resetPmgStep3Filters = function() {
  window.pmgColFilters.step3 = { act: '', type: 'all', entity: 'all', groupStatus: 'all', groupText: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep3Act');
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
  const groupTextInput = document.getElementById('pmgFilterStep3GroupText');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (typeSelect) { typeSelect.value = 'all'; typeSelect.classList.remove('has-filter'); }
  if (entitySelect) { entitySelect.value = 'all'; entitySelect.classList.remove('has-filter'); }
  if (groupStatusSelect) { groupStatusSelect.value = 'all'; groupStatusSelect.classList.remove('has-filter'); }
  if (groupTextInput) { groupTextInput.value = ''; groupTextInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep3FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep2ManualTable();
};

window.togglePmgStep3Preset = function(presetKey) {
  const current = window.pmgColFilters.step3.preset;
  window.resetPmgStep3Filters();

  if (current === presetKey) {
    window.pmgColFilters.step3.preset = null;
    return;
  }

  window.pmgColFilters.step3.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep3' + presetKey.charAt(0).toUpperCase() + presetKey.slice(1));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'userTasks') {
    window.pmgColFilters.step3.type = 'usertask';
    const typeSelect = document.getElementById('pmgFilterStep3Type');
    if (typeSelect) { typeSelect.value = 'usertask'; typeSelect.classList.add('has-filter'); }
  } else if (presetKey === 'noGroup') {
    window.pmgColFilters.step3.groupStatus = 'no_group';
    const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
    if (groupStatusSelect) { groupStatusSelect.value = 'no_group'; groupStatusSelect.classList.add('has-filter'); }
  } else if (presetKey === 'transverse') {
    window.pmgColFilters.step3.groupStatus = 'transverse';
    const groupStatusSelect = document.getElementById('pmgFilterStep3GroupStatus');
    if (groupStatusSelect) { groupStatusSelect.value = 'transverse'; groupStatusSelect.classList.add('has-filter'); }
  } else if (presetKey === 'inherited') {
    window.pmgColFilters.step3.entity = '__inherited__';
    const entitySelect = document.getElementById('pmgFilterStep3Entity');
    if (entitySelect) { entitySelect.value = '__inherited__'; entitySelect.classList.add('has-filter'); }
  }

  window.renderPmgStep2ManualTable();
};

// Step 4 Filtering & Helpers
window.onPmgStep4FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep4Act');
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  const inStatusSelect = document.getElementById('pmgFilterStep4InStatus');
  const inTextInput = document.getElementById('pmgFilterStep4InText');
  const outStatusSelect = document.getElementById('pmgFilterStep4OutStatus');
  const outTextInput = document.getElementById('pmgFilterStep4OutText');

  window.pmgColFilters.step4.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step4.type = typeSelect?.value || 'all';
  window.pmgColFilters.step4.inStatus = inStatusSelect?.value || 'all';
  window.pmgColFilters.step4.inText = (inTextInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step4.outStatus = outStatusSelect?.value || 'all';
  window.pmgColFilters.step4.outText = (outTextInput?.value || '').trim().toLowerCase();

  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.act));
  if (typeSelect) typeSelect.classList.toggle('has-filter', window.pmgColFilters.step4.type !== 'all');
  if (inStatusSelect) inStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step4.inStatus !== 'all');
  if (inTextInput) inTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.inText));
  if (outStatusSelect) outStatusSelect.classList.toggle('has-filter', window.pmgColFilters.step4.outStatus !== 'all');
  if (outTextInput) outTextInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step4.outText));

  window.renderPmgStep3ManualTable();
};

window.clearPmgStep4ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep4Act');
    if (el) el.value = '';
  } else if (field === 'inText') {
    const el = document.getElementById('pmgFilterStep4InText');
    if (el) el.value = '';
  } else if (field === 'outText') {
    const el = document.getElementById('pmgFilterStep4OutText');
    if (el) el.value = '';
  }
  window.onPmgStep4FilterChange();
};

window.resetPmgStep4Filters = function() {
  window.pmgColFilters.step4 = { act: '', type: 'all', inStatus: 'all', inText: '', outStatus: 'all', outText: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep4Act');
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  const inStatusSelect = document.getElementById('pmgFilterStep4InStatus');
  const inTextInput = document.getElementById('pmgFilterStep4InText');
  const outStatusSelect = document.getElementById('pmgFilterStep4OutStatus');
  const outTextInput = document.getElementById('pmgFilterStep4OutText');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (typeSelect) { typeSelect.value = 'all'; typeSelect.classList.remove('has-filter'); }
  if (inStatusSelect) { inStatusSelect.value = 'all'; inStatusSelect.classList.remove('has-filter'); }
  if (inTextInput) { inTextInput.value = ''; inTextInput.classList.remove('has-filter'); }
  if (outStatusSelect) { outStatusSelect.value = 'all'; outStatusSelect.classList.remove('has-filter'); }
  if (outTextInput) { outTextInput.value = ''; outTextInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep4FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep3ManualTable();
};

window.togglePmgStep4Preset = function(presetKey) {
  const current = window.pmgColFilters.step4.preset;
  window.resetPmgStep4Filters();

  if (current === presetKey) {
    window.pmgColFilters.step4.preset = null;
    return;
  }

  window.pmgColFilters.step4.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep4' + presetKey.charAt(0).toUpperCase() + presetKey.slice(1));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'withInputs') {
    window.pmgColFilters.step4.inStatus = 'has';
    const s = document.getElementById('pmgFilterStep4InStatus');
    if (s) { s.value = 'has'; s.classList.add('has-filter'); }
  } else if (presetKey === 'withOutputs') {
    window.pmgColFilters.step4.outStatus = 'has';
    const s = document.getElementById('pmgFilterStep4OutStatus');
    if (s) { s.value = 'has'; s.classList.add('has-filter'); }
  } else if (presetKey === 'noVars') {
    window.pmgColFilters.step4.inStatus = 'none';
    window.pmgColFilters.step4.outStatus = 'none';
    const s1 = document.getElementById('pmgFilterStep4InStatus');
    const s2 = document.getElementById('pmgFilterStep4OutStatus');
    if (s1) { s1.value = 'none'; s1.classList.add('has-filter'); }
    if (s2) { s2.value = 'none'; s2.classList.add('has-filter'); }
  }

  window.renderPmgStep3ManualTable();
};

// Step 5 Filtering & Helpers
window.onPmgStep5FilterChange = function() {
  const actInput = document.getElementById('pmgFilterStep5Act');
  const modeSelect = document.getElementById('pmgFilterStep5Mode');
  const caseInput = document.getElementById('pmgFilterStep5Case');
  const commentInput = document.getElementById('pmgFilterStep5Comment');

  window.pmgColFilters.step5.act = (actInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step5.mode = modeSelect?.value || 'all';
  window.pmgColFilters.step5.case = (caseInput?.value || '').trim().toLowerCase();
  window.pmgColFilters.step5.comment = (commentInput?.value || '').trim().toLowerCase();

  if (actInput) actInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.act));
  if (modeSelect) modeSelect.classList.toggle('has-filter', window.pmgColFilters.step5.mode !== 'all');
  if (caseInput) caseInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.case));
  if (commentInput) commentInput.classList.toggle('has-filter', Boolean(window.pmgColFilters.step5.comment));

  window.renderPmgStep4ManualTable();
};

window.clearPmgStep5ColFilter = function(field) {
  if (field === 'act') {
    const el = document.getElementById('pmgFilterStep5Act');
    if (el) el.value = '';
  } else if (field === 'case') {
    const el = document.getElementById('pmgFilterStep5Case');
    if (el) el.value = '';
  } else if (field === 'comment') {
    const el = document.getElementById('pmgFilterStep5Comment');
    if (el) el.value = '';
  }
  window.onPmgStep5FilterChange();
};

window.resetPmgStep5Filters = function() {
  window.pmgColFilters.step5 = { act: '', mode: 'all', case: '', comment: '', preset: null };
  const actInput = document.getElementById('pmgFilterStep5Act');
  const modeSelect = document.getElementById('pmgFilterStep5Mode');
  const caseInput = document.getElementById('pmgFilterStep5Case');
  const commentInput = document.getElementById('pmgFilterStep5Comment');

  if (actInput) { actInput.value = ''; actInput.classList.remove('has-filter'); }
  if (modeSelect) { modeSelect.value = 'all'; modeSelect.classList.remove('has-filter'); }
  if (caseInput) { caseInput.value = ''; caseInput.classList.remove('has-filter'); }
  if (commentInput) { commentInput.value = ''; commentInput.classList.remove('has-filter'); }

  document.querySelectorAll('#pmgStep5FilterToolbar .pmg-filter-pill-btn').forEach(b => b.classList.remove('active'));

  window.renderPmgStep4ManualTable();
};

window.togglePmgStep5Preset = function(presetKey) {
  const current = window.pmgColFilters.step5.preset;
  window.resetPmgStep5Filters();

  if (current === presetKey) {
    window.pmgColFilters.step5.preset = null;
    return;
  }

  window.pmgColFilters.step5.preset = presetKey;
  const chipBtn = document.getElementById('pmgChipStep5' + (presetKey === 'Call Activity' ? 'Call' : presetKey === 'Automatique' ? 'Auto' : presetKey === 'Manuelle' ? 'Manual' : presetKey));
  if (chipBtn) chipBtn.classList.add('active');

  if (presetKey === 'noDoc') {
    window.pmgColFilters.step5.comment = '__no_doc__';
  } else {
    window.pmgColFilters.step5.mode = presetKey;
    const modeSelect = document.getElementById('pmgFilterStep5Mode');
    if (modeSelect) { modeSelect.value = presetKey; modeSelect.classList.add('has-filter'); }
  }

  window.renderPmgStep4ManualTable();
};
`;

// Insert the filters logic and update renderPmgStep2ManualTable, renderPmgStep3ManualTable, renderPmgStep4ManualTable
const newStep2ManualTable = `window.renderPmgStep2ManualTable = function() {
  const tbody = document.getElementById('pmgStep2ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\\'abord charger des activités.</td></tr>';
    return;
  }

  // Populate dynamic select options in filters if not already done or updated
  const typeSelect = document.getElementById('pmgFilterStep3Type');
  if (typeSelect) {
    const currentVal = window.pmgColFilters.step3.type || 'all';
    const typeMap = new Map();
    activities.forEach(a => {
      const k = window.getPmgTypeKey(a.type || a.typeLabel);
      const l = a.typeLabel || a.type || 'Tâche';
      typeMap.set(k, { label: l, count: (typeMap.get(k)?.count || 0) + 1 });
    });
    let typeOpts = '<option value="all">Tous les types (' + activities.length + ')</option>';
    for (const [k, v] of typeMap.entries()) {
      typeOpts += '<option value="' + escAttr(k) + '" ' + (k === currentVal ? 'selected' : '') + '>' + escHtml(v.label) + ' (' + v.count + ')</option>';
    }
    typeSelect.innerHTML = typeOpts;
  }

  const entitySelect = document.getElementById('pmgFilterStep3Entity');
  if (entitySelect) {
    const currentVal = window.pmgColFilters.step3.entity || 'all';
    const entityMap = new Map();
    activities.forEach(a => {
      const e = (a.entity && a.entity !== 'Non défini') ? a.entity : 'Non défini';
      entityMap.set(e, (entityMap.get(e) || 0) + 1);
    });
    let entOpts = '<option value="all">Toutes les entités (' + activities.length + ')</option>';
    entOpts += '<option value="__inherited__" ' + ('__inherited__' === currentVal ? 'selected' : '') + '>↳ Hérités du Parent</option>';
    for (const [e, count] of entityMap.entries()) {
      entOpts += '<option value="' + escAttr(e) + '" ' + (e === currentVal ? 'selected' : '') + '>' + escHtml(e) + ' (' + count + ')</option>';
    }
    entitySelect.innerHTML = entOpts;
  }

  // Apply filters
  const f = window.pmgColFilters.step3;
  const filtered = activities.filter(act => {
    // 1. Act text (name or id or parentProcessName)
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      const p = (act.parentProcessName || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act) && !p.includes(f.act)) return false;
    }

    // 2. Type filter
    if (f.type !== 'all') {
      const k = window.getPmgTypeKey(act.type || act.typeLabel);
      if (k !== f.type) return false;
    }

    // 3. Entity filter
    if (f.entity !== 'all') {
      if (f.entity === '__inherited__') {
        if (!act.isInheritedEntity) return false;
      } else {
        const ent = (act.entity && act.entity !== 'Non défini') ? act.entity : 'Non défini';
        if (ent !== f.entity) return false;
      }
    }

    // 4. Group Status & Group Text
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const groupVal = (act.userGroup || '').trim();
    const hasGroup = groupVal.length > 0;
    const mapping = hasGroup ? window.pmgUserGroupMappings[groupVal] : null;
    const isTransverse = isUserTask && hasGroup && mapping && mapping.targetEntity && mapping.targetEntity !== (act.entity || '');

    if (f.groupStatus !== 'all') {
      if (f.groupStatus === 'with_group' && (!isUserTask || !hasGroup)) return false;
      if (f.groupStatus === 'no_group' && (!isUserTask || hasGroup)) return false;
      if (f.groupStatus === 'transverse' && !isTransverse) return false;
      if (f.groupStatus === 'not_applicable' && isUserTask) return false;
    }

    if (f.groupText) {
      if (!groupVal.toLowerCase().includes(f.groupText)) return false;
    }

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep3FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres sélectionnés. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep3Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const isUserTask = (act.type || '').toLowerCase().includes('user');
    const entityVal = act.entity && act.entity !== 'Non défini' ? act.entity : '';
    const groupVal = act.userGroup || '';
    const hasGroup = groupVal.trim().length > 0;

    // Check if group is mapped or transverse
    let groupExtraBadge = '';
    if (isUserTask && hasGroup) {
      const mapping = window.pmgUserGroupMappings[groupVal.trim()];
      if (mapping && mapping.targetEntity && mapping.targetEntity !== entityVal) {
        groupExtraBadge = '<span style="background:rgba(245, 158, 11, 0.12); color:var(--warn); padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(245, 158, 11, 0.25);" title="Le groupe ' + escAttr(groupVal) + ' est rattaché à l\\'entité ' + escAttr(mapping.targetEntity) + '">⚠️ Transverse : Rattaché à ' + escHtml(mapping.targetEntity) + '</span>';
      }
    }

    let groupCellHtml = '';
    if (isUserTask) {
      if (hasGroup) {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${origIdx}" value="\${escAttr(groupVal)}" placeholder="Ex: Validateurs_N1" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'userGroup', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
              <span class="pmg-badge-ok" style="font-size:10px; width:fit-content;">👤 Groupe candidat défini</span>
              \${groupExtraBadge}
            </div>
          </div>
        \`;
      } else {
        groupCellHtml = \`
          <div style="display:flex; flex-direction:column; gap:4px;">
            <input type="text" id="pmgGroupInput_\${origIdx}" class="pmg-input-warn" value="" placeholder="⚠️ Saisir le groupe candidat (ex: Gestionnaires_RH)" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'userGroup', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); padding: 4px 8px;">
            <span class="pmg-badge-warn" style="font-size:10px; width:fit-content;">⚠️ Warning : User Task sans groupe candidat</span>
          </div>
        \`;
      }
    } else {
      groupCellHtml = \`
        <input type="text" id="pmgGroupInput_\${origIdx}" value="" placeholder="— Non applicable (\${act.typeLabel || act.type})" readonly style="width: 100%; height: 32px; font-size: 11.5px; border-radius: var(--border-radius-md); border: 1px dashed var(--border-color); background: rgba(241, 245, 249, 0.6); color: #94a3b8; padding: 4px 8px; cursor:not-allowed;">
      \`;
    }

    const inheritedPill = act.isInheritedEntity 
      ? '<span style="background:rgba(99, 102, 241, 0.1); color:#6366f1; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; border:1px solid rgba(99, 102, 241, 0.25); margin-top:4px; display:inline-block;" title="Hérité de la Lane du processus parent">↳ Hérité du Parent</span>' 
      : (entityVal ? '<span class="pmg-badge-info" style="font-size:10px; margin-top:4px; width:fit-content;">🏢 Lane / Pool BPMN</span>' : '<span style="font-size:10px; color:#94a3b8; margin-top:4px; display:block;">Optionnel</span>');

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
          <input type="text" id="pmgEntityInput_\${origIdx}" value="\${escAttr(entityVal)}" placeholder="Ex: CDD ou Direction Réseau" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'entity', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
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

const newStep3ManualTable = `window.renderPmgStep3ManualTable = function() {
  const tbody = document.getElementById('pmgStep3ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\\'abord charger les activités dans l\\'étape 2.</td></tr>';
    return;
  }

  // Populate dynamic types in filter
  const typeSelect = document.getElementById('pmgFilterStep4Type');
  if (typeSelect) {
    const currentVal = window.pmgColFilters.step4.type || 'all';
    const typeMap = new Map();
    activities.forEach(a => {
      const k = window.getPmgTypeKey(a.type || a.typeLabel);
      const l = a.typeLabel || a.type || 'Tâche';
      typeMap.set(k, { label: l, count: (typeMap.get(k)?.count || 0) + 1 });
    });
    let typeOpts = '<option value="all">Tous les types (' + activities.length + ')</option>';
    for (const [k, v] of typeMap.entries()) {
      typeOpts += '<option value="' + escAttr(k) + '" ' + (k === currentVal ? 'selected' : '') + '>' + escHtml(v.label) + ' (' + v.count + ')</option>';
    }
    typeSelect.innerHTML = typeOpts;
  }

  // Filter activities
  const f = window.pmgColFilters.step4;
  const filtered = activities.filter(act => {
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act)) return false;
    }

    if (f.type !== 'all') {
      const k = window.getPmgTypeKey(act.type || act.typeLabel);
      if (k !== f.type) return false;
    }

    const ins = act.inputs || [];
    const outs = act.outputs || [];

    if (f.inStatus === 'has' && ins.length === 0) return false;
    if (f.inStatus === 'none' && ins.length > 0) return false;
    if (f.inText && !ins.some(v => v.toLowerCase().includes(f.inText))) return false;

    if (f.outStatus === 'has' && outs.length === 0) return false;
    if (f.outStatus === 'none' && outs.length > 0) return false;
    if (f.outText && !outs.some(v => v.toLowerCase().includes(f.outText))) return false;

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep4FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres variables. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep4Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const inputsVal = (act.inputs || []).join(', ');
    const outputsVal = (act.outputs || []).join(', ');

    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '└─ ' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px;">id: <code>\${escHtml(act.id)}</code></div>
        </td>
        <td style="padding: 8px;">
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: var(--brand-primary); font-weight:600;">
            \${escHtml(act.typeLabel || act.type)}
          </span>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgInputsInput_\${origIdx}" value="\${escAttr(inputsVal)}" placeholder="Ex: varIn1, varIn2" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'inputs', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgOutputsInput_\${origIdx}" value="\${escAttr(outputsVal)}" placeholder="Ex: varOut1, varOut2" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'outputs', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
      </tr>
    \`;
  });

  tbody.innerHTML = html;
};`;

const newStep4ManualTable = `window.renderPmgStep4ManualTable = function() {
  const tbody = document.getElementById('pmgStep4ManualTableBody');
  if (!tbody) return;

  const activities = window.pmgTempSubprocesses || [];
  if (activities.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-tertiary);">Veuillez d\\'abord valider les activités dans l\\'étape 2.</td></tr>';
    return;
  }

  const modes = window.pmgRealizationModes || ['SP0', 'Call Activity', 'Manuelle', 'Automatique'];

  // Populate mode filter dropdown
  const modeSelectFilter = document.getElementById('pmgFilterStep5Mode');
  if (modeSelectFilter) {
    const currentVal = window.pmgColFilters.step5.mode || 'all';
    let modeOpts = '<option value="all">Tous les modes (' + activities.length + ')</option>';
    modes.forEach(m => {
      const cnt = activities.filter(a => (a.realizationMode || '').toLowerCase() === m.toLowerCase()).length;
      modeOpts += '<option value="' + escAttr(m) + '" ' + (m.toLowerCase() === currentVal.toLowerCase() ? 'selected' : '') + '>' + escHtml(m) + ' (' + cnt + ')</option>';
    });
    modeSelectFilter.innerHTML = modeOpts;
  }

  // Filter activities
  const f = window.pmgColFilters.step5;
  const filtered = activities.filter(act => {
    if (f.act) {
      const name = (act.name || '').toLowerCase();
      const id = (act.id || '').toLowerCase();
      if (!name.includes(f.act) && !id.includes(f.act)) return false;
    }

    if (f.mode !== 'all') {
      const curMode = (act.realizationMode || '').toLowerCase();
      if (curMode !== f.mode.toLowerCase()) return false;
    }

    if (f.case) {
      const c = (act.applicableCase || '').toLowerCase();
      if (!c.includes(f.case)) return false;
    }

    if (f.comment) {
      const c = (act.comment || '').toLowerCase();
      if (f.comment === '__no_doc__') {
        if (c.trim().length > 0) return false;
      } else {
        if (!c.includes(f.comment)) return false;
      }
    }

    return true;
  });

  // Update count badge
  const countBadge = document.getElementById('pmgStep5FilterCount');
  if (countBadge) {
    countBadge.innerHTML = '🎯 <strong>' + filtered.length + '</strong> / ' + activities.length + ' activités affichées';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:25px; text-align:center; color:var(--text-tertiary); font-style:italic;">Aucune activité ne correspond aux filtres. <button class="btn-ghost" style="margin-left:8px; font-size:11px;" onclick="resetPmgStep5Filters()">Réinitialiser</button></td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((act) => {
    const origIdx = activities.indexOf(act);
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');
    const defaultMode = act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle');
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';

    let optionsHtml = '';
    modes.forEach(m => {
      const selected = m.toLowerCase() === defaultMode.toLowerCase() ? 'selected' : '';
      optionsHtml += '<option value="' + escAttr(m) + '" ' + selected + '>' + escHtml(m) + '</option>';
    });

    html += \`
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <span style="display:inline-block; margin-left:\${(act.level - 1) * 12}px;">
            \${act.level > 1 ? '└─ ' : ''}<strong>\${escHtml(act.name)}</strong>
          </span>
          <div style="font-size:10.5px; color:#94a3b8; margin-left:\${(act.level - 1) * 12}px;">id: <code>\${escHtml(act.id)}</code></div>
        </td>
        <td style="padding: 6px;">
          <select id="pmgModeSelect_\${origIdx}" class="srt" onchange="syncPmgStepActivityField('\${escAttr(act.id)}', 'realizationMode', this.value)" style="width: 100%; height: 32px; font-size: 12px;">
            \${optionsHtml}
          </select>
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCaseInput_\${origIdx}" value="\${escAttr(caseVal)}" placeholder="Ex: Si dossier prioritaire" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'applicableCase', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
        <td style="padding: 6px;">
          <input type="text" id="pmgCommentInput_\${origIdx}" value="\${escAttr(commentVal)}" placeholder="Ex: Traitement physique" oninput="syncPmgStepActivityField('\${escAttr(act.id)}', 'comment', this.value)" style="width: 100%; height: 32px; font-size: 12px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); padding: 4px 8px;">
        </td>
      </tr>
    \`;
  });

  tbody.innerHTML = html;
};`;

// Replace render functions in pmgCode
pmgCode = pmgCode.replace('window.renderPmgStep2ManualTable = function() {', filtersLogic + '\nwindow.renderPmgStep2ManualTable = function() {');

// Replace table renderer bodies
const oldStep2Full = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgStep2ManualTable = function() {'),
  pmgCode.indexOf('window.applyDefaultEntityToAllPmg = function() {')
);
pmgCode = pmgCode.replace(oldStep2Full, newStep2ManualTable + '\n\n');

const oldStep3Full = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgStep3ManualTable = function() {'),
  pmgCode.indexOf('window.validatePmgStep4Variables = function() {')
);
pmgCode = pmgCode.replace(oldStep3Full, newStep3ManualTable + '\n\n');

const oldStep4Full = pmgCode.substring(
  pmgCode.indexOf('window.renderPmgStep4ManualTable = function() {'),
  pmgCode.indexOf('window.applyDefaultModeToAllPmg = function() {')
);
pmgCode = pmgCode.replace(oldStep4Full, newStep4ManualTable + '\n\n');

fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log('Successfully patched pmg.js with advanced column filter engine!');
