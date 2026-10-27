const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Normalise line endings for matching if needed
const isCRLF = content.includes('\r\n');
const newline = isCRLF ? '\r\n' : '\n';

// Replace Step 3
const oldS3 = `                  <!-- Mini-Dashboard & Analyses Étape 3 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep3Kpis"></div>

                  <div class="tbl-wrap"
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
                  </div>`.replace(/\r?\n/g, newline);

const newS3 = `                  <!-- Mini-Dashboard & Analyses Étape 3 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep3Kpis"></div>

                  <!-- Toolbar Filtres Avancés Étape 3 -->
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
                              <input type="text" id="pmgFilterStep3Act" class="pmg-col-filter-input" placeholder="🔍 Filtrer nom ou ID..." oninput="onPmgStep3FilterChange()">
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
                                <option value="with_group">👤 Avec groupe</option>
                                <option value="no_group">⚠️ Sans groupe</option>
                                <option value="transverse">🔀 Transverse</option>
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
                  </div>`.replace(/\r?\n/g, newline);

// Replace Step 4
const oldS4 = `                  <!-- Mini-Dashboard & Analyses Étape 4 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep4Kpis"></div>

                  <div class="tbl-wrap"
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
                  </div>`.replace(/\r?\n/g, newline);

const newS4 = `                  <!-- Mini-Dashboard & Analyses Étape 4 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep4Kpis"></div>

                  <!-- Toolbar Filtres Avancés Étape 4 -->
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
                              <select id="pmgFilterStep4InStatus" class="pmg-col-filter-select" style="width:80px;" onchange="onPmgStep4FilterChange()">
                                <option value="all">Tous</option>
                                <option value="has">Avec</option>
                                <option value="none">Sans</option>
                              </select>
                              <div class="pmg-col-filter-input-wrap" style="flex:1;">
                                <input type="text" id="pmgFilterStep4InText" class="pmg-col-filter-input" placeholder="🔍 Variable..." oninput="onPmgStep4FilterChange()">
                                <button class="pmg-col-filter-clear" onclick="clearPmgStep4ColFilter('inText')">×</button>
                              </div>
                            </div>
                          </th>
                          <th>
                            <div style="display:flex; gap:4px;">
                              <select id="pmgFilterStep4OutStatus" class="pmg-col-filter-select" style="width:80px;" onchange="onPmgStep4FilterChange()">
                                <option value="all">Tous</option>
                                <option value="has">Avec</option>
                                <option value="none">Sans</option>
                              </select>
                              <div class="pmg-col-filter-input-wrap" style="flex:1;">
                                <input type="text" id="pmgFilterStep4OutText" class="pmg-col-filter-input" placeholder="🔍 Variable..." oninput="onPmgStep4FilterChange()">
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
                  </div>`.replace(/\r?\n/g, newline);

// Replace Step 5
const oldS5 = `                  <!-- Mini-Dashboard & Analyses Étape 5 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep5Kpis"></div>

                  <!-- Container pour Grille Globale Éditable Excel-Like -->
                  <div id="pmgGlobalGridContainer"
                    style="display: none; margin-bottom: 15px; padding: 12px; background: var(--bg-hover); border-radius: var(--border-radius-md); border: 1px solid var(--border-color);">
                    <!-- Rempli dynamiquement par renderPmgGlobalGridTable() -->
                  </div>

                  <div class="tbl-wrap"
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
                  </div>`.replace(/\r?\n/g, newline);

const newS5 = `                  <!-- Mini-Dashboard & Analyses Étape 5 -->
                  <div class="pmg-step-kpis-banner" id="pmgStep5Kpis"></div>

                  <!-- Toolbar Filtres Avancés Étape 5 -->
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

                  <!-- Container pour Grille Globale Éditable Excel-Like -->
                  <div id="pmgGlobalGridContainer"
                    style="display: none; margin-bottom: 15px; padding: 12px; background: var(--bg-hover); border-radius: var(--border-radius-md); border: 1px solid var(--border-color);">
                    <!-- Rempli dynamiquement par renderPmgGlobalGridTable() -->
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
                  </div>`.replace(/\r?\n/g, newline);

let ok = true;
if (content.includes(oldS3)) {
  content = content.replace(oldS3, newS3);
  console.log('✅ Replaced Step 3 in index.html');
} else {
  console.error('❌ Could not match oldS3');
  ok = false;
}

if (content.includes(oldS4)) {
  content = content.replace(oldS4, newS4);
  console.log('✅ Replaced Step 4 in index.html');
} else {
  console.error('❌ Could not match oldS4');
  ok = false;
}

if (content.includes(oldS5)) {
  content = content.replace(oldS5, newS5);
  console.log('✅ Replaced Step 5 in index.html');
} else {
  console.error('❌ Could not match oldS5');
  ok = false;
}

if (ok) {
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('🎉 Successfully saved updated index.html!');
}
