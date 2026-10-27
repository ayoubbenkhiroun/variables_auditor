/**
 * ==============================================================================
 * Bouygues Telecom - AuditFlow Pro
 * Module : Studio de Génération de Tests BPMN & Scénarios Exécutables
 * ==============================================================================
 */

(function () {
  'use strict';

  // State Management
  let testGenFiles = [];
  let testGenActiveTab = 'import'; // 'import', 'overview', 'scenarios', 'simulator', 'export'
  let testGenFilter = 'all'; // 'all', 'nominal', 'branch', 'error', 'timer', 'user'
  let testGenSearch = '';
  let testGenSelectedProcess = 'all';
  let testGenSelectedScenarioId = null;
  let testGenSimActiveStep = -1;
  let currentTestScenarios = [];
  let testGenViewerInstance = null;
  let testGenListenersAttached = false;

  const testGenOptions = {
    mockProfile: 'bouygues', // 'bouygues', 'standard', 'edge_cases'
    pathStrategy: 'smart_branches', // 'exhaustive', 'smart_branches', 'nominal_errors'
    maxLoopDepth: 1,
    generateAssertions: true,
    includeStepLog: true
  };

  // Helper Sanitization / Escape
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Initialisation du Module Studio de Tests
   */
  function initTestGenModule() {
    // Si aucun fichier n'a été importé directement, vérifier si des BPMN sont déjà chargés dans le workspace
    if (testGenFiles.length === 0) {
      autoLoadWorkspaceBpmn();
    }
    renderTestGenNavTabs();
    renderTestGenContent();
  }

  /**
   * Chargement automatique des BPMN déjà présents dans l'application
   */
  function autoLoadWorkspaceBpmn() {
    const loaded = [];
    if (typeof window.bpmnBatch !== 'undefined' && Array.isArray(window.bpmnBatch) && window.bpmnBatch.length > 0) {
      window.bpmnBatch.forEach((item, idx) => {
        if (item.xml || item.source) {
          const src = item.xml || item.source;
          const doc = item.doc || new DOMParser().parseFromString(src, 'application/xml');
          loaded.push({
            id: `file_ws_${idx}`,
            fileName: item.name || item.fileName || `Processus_${idx + 1}.bpmn`,
            source: src,
            xmlDoc: doc,
            parseError: null
          });
        }
      });
    } else if (typeof window.bpmnXmlDoc !== 'undefined' && window.bpmnXmlDoc) {
      const src = window.bpmnXmlContent || new XMLSerializer().serializeToString(window.bpmnXmlDoc);
      loaded.push({
        id: 'file_ws_main',
        fileName: window.bpmnFileName || 'Processus_Principal.bpmn',
        source: src,
        xmlDoc: window.bpmnXmlDoc,
        parseError: null
      });
    } else if (typeof window.bpmnLintFiles !== 'undefined' && Array.isArray(window.bpmnLintFiles) && window.bpmnLintFiles.length > 0) {
      window.bpmnLintFiles.forEach((f, idx) => {
        if (f.source) {
          loaded.push({
            id: `file_lint_${idx}`,
            fileName: f.fileName,
            source: f.source,
            xmlDoc: f.xmlDoc || new DOMParser().parseFromString(f.source, 'application/xml'),
            parseError: f.parseError || null
          });
        }
      });
    }

    if (loaded.length > 0) {
      testGenFiles = loaded;
      generateAllTestScenarios(false);
      testGenActiveTab = 'overview';
    }
  }

  /**
   * Gestion de l'import de fichiers BPMN / XML / ZIP
   */
  async function handleTestGenFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      const name = file.name;
      if (name.endsWith('.zip')) {
        if (typeof JSZip !== 'undefined') {
          try {
            const zip = await JSZip.loadAsync(file);
            const entries = Object.keys(zip.files);
            for (const entryName of entries) {
              if (/\.(bpmn|xml)$/i.test(entryName) && !zip.files[entryName].dir) {
                const text = await zip.files[entryName].async('text');
                addParsedBpmnFile(entryName, text);
              }
            }
          } catch (e) {
            console.error('Erreur lecture ZIP:', e);
          }
        }
      } else if (/\.(bpmn|xml)$/i.test(name)) {
        try {
          const text = await file.text();
          addParsedBpmnFile(name, text);
        } catch (e) {
          console.error('Erreur lecture BPMN:', e);
        }
      }
    }

    generateAllTestScenarios(true);
    testGenActiveTab = 'overview';
    renderTestGenNavTabs();
    renderTestGenContent();
  }

  function addParsedBpmnFile(fileName, source) {
    // Éviter les doublons
    testGenFiles = testGenFiles.filter(f => f.fileName.toLowerCase() !== fileName.toLowerCase());
    try {
      const xmlDoc = new DOMParser().parseFromString(source, 'application/xml');
      const err = xmlDoc.querySelector('parsererror');
      testGenFiles.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        fileName,
        source,
        xmlDoc: err ? null : xmlDoc,
        parseError: err ? err.textContent.trim() : null
      });
    } catch (e) {
      testGenFiles.push({
        id: `file_err_${Date.now()}`,
        fileName,
        source,
        xmlDoc: null,
        parseError: e.message
      });
    }
  }

  function removeTestGenFile(idx) {
    testGenFiles.splice(idx, 1);
    generateAllTestScenarios(false);
    renderTestGenContent();
  }

  function clearTestGenFiles() {
    testGenFiles = [];
    currentTestScenarios = [];
    testGenSelectedScenarioId = null;
    testGenActiveTab = 'import';
    renderTestGenNavTabs();
    renderTestGenContent();
  }

  /**
   * Navigation par sous-onglets
   */
  function setTestGenActiveTab(tabName) {
    testGenActiveTab = tabName;
    renderTestGenNavTabs();
    renderTestGenContent();
    if (tabName === 'simulator') {
      setTimeout(() => initTestSimulatorCanvas(), 150);
    }
  }

  function renderTestGenNavTabs() {
    const container = document.getElementById('testGenNavTabs');
    if (!container) return;

    const totalScenarios = currentTestScenarios.length;
    const tabs = [
      { id: 'import', label: '📥 Import & Modèles', icon: '📥', count: testGenFiles.length },
      { id: 'overview', label: '📊 Synthèse & Couverture', icon: '📊' },
      { id: 'scenarios', label: '🧪 Scénarios & Payloads', icon: '🧪', count: totalScenarios },
      { id: 'simulator', label: '🗺️ Simulateur de Parcours', icon: '🗺️' },
      { id: 'export', label: '📤 Centre d\'Exportation', icon: '📤' }
    ];

    container.innerHTML = `
      <div class="test-gen-tab-bar">
        ${tabs.map(t => `
          <button class="test-gen-tab-btn ${testGenActiveTab === t.id ? 'active' : ''}" onclick="setTestGenActiveTab('${t.id}')">
            <span>${t.label}</span>
            ${t.count !== undefined ? `<span class="badge-count">${t.count}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Moteur d'Exploration des Chemins BPMN & Génération de Scénarios
   */
  function generateAllTestScenarios(notify = true) {
    const scenarios = [];

    testGenFiles.forEach((fileItem, fileIdx) => {
      if (!fileItem.xmlDoc) return;
      const doc = fileItem.xmlDoc;
      const processes = Array.from(doc.querySelectorAll('process'));

      processes.forEach((proc, pIdx) => {
        const procId = proc.getAttribute('id') || `Process_${fileIdx + 1}_${pIdx + 1}`;
        const procName = proc.getAttribute('name') || fileItem.fileName.replace(/\.(bpmn|xml)$/i, '');

        // Indexation du graphe du processus
        const elementsMap = new Map();
        const sequenceFlows = [];
        const incomingMap = new Map();
        const outgoingMap = new Map();
        const boundaryMap = new Map(); // targetActivityId -> [boundaryEvent]

        Array.from(proc.children).forEach(node => {
          const tag = (node.localName || node.tagName || '').toLowerCase();
          const id = node.getAttribute('id');
          if (!id) return;

          if (tag === 'sequenceflow') {
            const src = node.getAttribute('sourceRef');
            const tgt = node.getAttribute('targetRef');
            const name = node.getAttribute('name') || '';
            const condEl = node.querySelector('conditionExpression');
            const cond = condEl ? condEl.textContent.trim() : '';
            const isDefault = node.getAttribute('isDefault') === 'true';
            sequenceFlows.push({ id, sourceRef: src, targetRef: tgt, name, condition: cond, isDefault });
          } else {
            const name = node.getAttribute('name') || id;
            elementsMap.set(id, { id, tag, name, element: node });

            if (tag === 'boundaryevent') {
              const attachedTo = node.getAttribute('attachedToRef');
              if (attachedTo) {
                if (!boundaryMap.has(attachedTo)) boundaryMap.set(attachedTo, []);
                boundaryMap.get(attachedTo).push({ id, name, element: node });
              }
            }
          }
        });

        // Construction des liens In/Out
        sequenceFlows.forEach(flow => {
          if (!outgoingMap.has(flow.sourceRef)) outgoingMap.set(flow.sourceRef, []);
          outgoingMap.get(flow.sourceRef).push(flow);

          if (!incomingMap.has(flow.targetRef)) incomingMap.set(flow.targetRef, []);
          incomingMap.get(flow.targetRef).push(flow);
        });

        // Détection des Start Events
        const startEvents = Array.from(elementsMap.values()).filter(e => e.tag === 'startevent');
        if (startEvents.length === 0) {
          // Fallback s'il n'y a pas d'événement de début explicite
          const firstNode = Array.from(elementsMap.values())[0];
          if (firstNode) startEvents.push(firstNode);
        }

        // Variables globales détectées dans le processus
        const processVariables = extractProcessVariables(doc, proc);

        // 1. Exploration des Chemins par DFS
        const discoveredPaths = [];
        startEvents.forEach(startNode => {
          explorePathsDFS(startNode.id, [startNode.id], elementsMap, outgoingMap, boundaryMap, discoveredPaths, 0, testGenOptions.maxLoopDepth);
        });

        // 2. Transformation des Chemins en Scénarios de Test Qualifiés
        let scenarioSeq = 1;
        discoveredPaths.forEach((pathNodeIds, pathIdx) => {
          const pathElements = pathNodeIds.map(id => elementsMap.get(id) || { id, tag: 'node', name: id });
          const endNode = pathElements[pathElements.length - 1];
          const hasError = pathElements.some(e => e.tag === 'erroreventdefinition' || e.tag === 'boundaryevent' || (endNode && endNode.element && endNode.element.querySelector('errorEventDefinition')));
          const hasTimer = pathElements.some(e => e.tag === 'timereventdefinition' || (e.element && e.element.querySelector('timerEventDefinition')));
          const hasGateways = pathElements.some(e => ['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(e.tag));
          const hasUserTask = pathElements.some(e => e.tag === 'usertask');

          let type = 'nominal';
          let badge = 'Happy Path (Nominal)';
          let badgeClass = 'ok';

          if (hasError) {
            type = 'error';
            badge = 'Cas d\'Erreur / Exception';
            badgeClass = 'err';
          } else if (hasTimer) {
            type = 'timer';
            badge = 'Timeout / Événement Temporel';
            badgeClass = 'warn';
          } else if (hasGateways && pathIdx > 0) {
            type = 'branch';
            badge = 'Branche Alternative (XOR/OR)';
            badgeClass = 'warn';
          } else if (hasUserTask) {
            type = 'user';
            badge = 'Intervention Utilisateur';
            badgeClass = 'info';
          }

          // Génération du Mock Payload intelligent selon le type et le profil
          const payload = generateSmartPayload(processVariables, type, pathElements, testGenOptions.mockProfile);

          // Construction des Assertions
          const assertions = generateAssertionsForPath(pathElements, endNode, type);

          const scenarioObj = {
            id: `TC_${procId.toUpperCase()}_${String(scenarioSeq++).padStart(3, '0')}`,
            processId: procId,
            processName: procName,
            fileName: fileItem.fileName,
            type: type,
            badge: badge,
            badgeClass: badgeClass,
            title: `${badge} · ${procName}`,
            description: `Parcours de ${pathElements.length} étapes : ${pathElements.map(e => e.name || e.id).slice(0, 4).join(' ➔ ')}${pathElements.length > 4 ? ' ➔ ...' : ''}`,
            path: pathNodeIds,
            pathElements: pathElements,
            payload: payload,
            customPayload: null,
            assertions: assertions,
            estimatedDuration: `${Math.max(50, pathElements.length * 45)}ms`,
            executionSteps: pathElements.map((e, sIdx) => ({
              step: sIdx + 1,
              elementId: e.id,
              name: e.name || e.id,
              type: formatElementType(e.tag),
              icon: getElementIcon(e.tag)
            }))
          };

          scenarios.push(scenarioObj);
        });
      });
    });

    currentTestScenarios = scenarios;
    if (scenarios.length > 0 && !testGenSelectedScenarioId) {
      testGenSelectedScenarioId = scenarios[0].id;
    }
  }

  /**
   * Exploration DFS récursive des chemins avec limitation de boucles
   */
  function explorePathsDFS(currentNodeId, currentPath, elementsMap, outgoingMap, boundaryMap, discoveredPaths, loopCount, maxDepth) {
    if (discoveredPaths.length >= 30) return; // Limite de sécurité max

    const outgoing = outgoingMap.get(currentNodeId) || [];
    const boundaries = boundaryMap.get(currentNodeId) || [];

    // Ajouter les branches des événements de bordure
    boundaries.forEach(bEvent => {
      const bOutgoing = outgoingMap.get(bEvent.id) || [];
      bOutgoing.forEach(flow => {
        if (!currentPath.includes(flow.targetRef)) {
          explorePathsDFS(flow.targetRef, [...currentPath, bEvent.id, flow.targetRef], elementsMap, outgoingMap, boundaryMap, discoveredPaths, loopCount, maxDepth);
        }
      });
    });

    if (outgoing.length === 0) {
      // Fin de chemin
      discoveredPaths.push([...currentPath]);
      return;
    }

    outgoing.forEach(flow => {
      const targetId = flow.targetRef;
      const targetNode = elementsMap.get(targetId);

      // Gestion des cycles
      const visitedCount = currentPath.filter(id => id === targetId).length;
      if (visitedCount <= maxDepth) {
        explorePathsDFS(targetId, [...currentPath, targetId], elementsMap, outgoingMap, boundaryMap, discoveredPaths, visitedCount > 0 ? loopCount + 1 : loopCount, maxDepth);
      } else {
        discoveredPaths.push([...currentPath, targetId]);
      }
    });
  }

  /**
   * Extraction exhaustive des variables déclarées et utilisées
   */
  function extractProcessVariables(doc, proc) {
    const varsMap = new Map();

    // Inputs & Outputs Zeebe / Camunda
    doc.querySelectorAll('input, zeebe\\:input, output, zeebe\\:output, inputParameter, outputParameter, camunda\\:inputParameter, camunda\\:outputParameter').forEach(el => {
      const name = el.getAttribute('target') || el.getAttribute('name') || el.getAttribute('source') || '';
      const cleanName = name.replace(/^=/, '').trim();
      if (cleanName && cleanName.length > 1 && !cleanName.includes(' ') && !varsMap.has(cleanName)) {
        varsMap.set(cleanName, { name: cleanName, type: inferVarType(cleanName) });
      }
    });

    // Form fields
    doc.querySelectorAll('formField, camunda\\:formField').forEach(el => {
      const id = el.getAttribute('id') || el.getAttribute('name') || '';
      const type = el.getAttribute('type') || 'string';
      if (id && !varsMap.has(id)) {
        varsMap.set(id, { name: id, type: type });
      }
    });

    // Expressions conditionnelles ${var == 'X'} ou FEEL =var = "X"
    doc.querySelectorAll('conditionExpression').forEach(el => {
      const text = el.textContent || '';
      const matches = text.match(/[a-zA-Z_][a-zA-Z0-9_]{2,}/g) || [];
      matches.forEach(m => {
        if (!['true', 'false', 'null', 'and', 'or', 'not', 'contains', 'matches', 'startsWith'].includes(m) && !varsMap.has(m)) {
          varsMap.set(m, { name: m, type: inferVarType(m) });
        }
      });
    });

    // Si aucune variable détectée, injecter des variables standard de processus
    if (varsMap.size === 0) {
      ['numero_dossier', 'id_client', 'type_demande', 'code_offre', 'statut'].forEach(v => {
        varsMap.set(v, { name: v, type: inferVarType(v) });
      });
    }

    return Array.from(varsMap.values());
  }

  function inferVarType(varName) {
    const lower = varName.toLowerCase();
    if (lower.includes('amount') || lower.includes('montant') || lower.includes('prix') || lower.includes('score')) return 'number';
    if (lower.includes('is_') || lower.includes('flag') || lower.includes('eligible') || lower.includes('actif') || lower.startsWith('has')) return 'boolean';
    if (lower.includes('date') || lower.includes('timestamp')) return 'date';
    if (lower.includes('list') || lower.includes('items') || lower.includes('articles')) return 'array';
    return 'string';
  }

  /**
   * Générateur de valeurs fictives intelligentes
   */
  function generateSmartPayload(variables, scenarioType, pathElements, profile) {
    const payload = {};

    variables.forEach(v => {
      const name = v.name;
      const lower = name.toLowerCase();

      if (scenarioType === 'error') {
        // Injecter des valeurs invalides pour les cas d'erreur
        if (lower.includes('montant') || lower.includes('amount')) payload[name] = -50.00;
        else if (lower.includes('email') || lower.includes('mail')) payload[name] = 'format-invalide-bouygues';
        else if (lower.includes('id') || lower.includes('code')) payload[name] = 'ERR_INVALID_CODE_00';
        else if (v.type === 'number') payload[name] = -999;
        else if (v.type === 'boolean') payload[name] = false;
        else payload[name] = 'VALEUR_INVALIDE_TEST';
        return;
      }

      if (scenarioType === 'branch') {
        if (lower.includes('statut') || lower.includes('status')) payload[name] = 'ALTERNATIVE_BRANCHE';
        else if (lower.includes('montant') || lower.includes('amount')) payload[name] = 125000.00; // Montant élevé
        else if (v.type === 'boolean') payload[name] = false;
        else payload[name] = `BRANCHE_${name.toUpperCase()}`;
        return;
      }

      // Profil Bouygues Telecom Réaliste
      if (profile === 'bouygues') {
        if (lower.includes('msisdn') || lower.includes('tel') || lower.includes('phone') || lower.includes('ligne')) payload[name] = '0612345678';
        else if (lower.includes('imsi')) payload[name] = '208201234567890';
        else if (lower.includes('imei')) payload[name] = '358921098765432';
        else if (lower.includes('client') || lower.includes('customer')) payload[name] = 'CLI-BOUYGUES-784512';
        else if (lower.includes('commande') || lower.includes('order')) payload[name] = 'CMD-2026-FR-99482';
        else if (lower.includes('offre') || lower.includes('forfait') || lower.includes('offer')) payload[name] = 'BBOX_FIBRE_MUST_2026';
        else if (lower.includes('email') || lower.includes('mail')) payload[name] = 'abonne.bouygues@telecom.fr';
        else if (lower.includes('iban')) payload[name] = 'FR7630001007941234567890185';
        else if (lower.includes('postal') || lower.includes('zip')) payload[name] = '92130';
        else if (lower.includes('statut') || lower.includes('status')) payload[name] = 'VALIDE';
        else if (lower.includes('montant') || lower.includes('amount') || lower.includes('prix')) payload[name] = 49.99;
        else if (v.type === 'date') payload[name] = '2026-09-29T14:30:00.000Z';
        else if (v.type === 'boolean') payload[name] = true;
        else payload[name] = `mock_${name}_val`;
      } else {
        // Standard Profile
        if (v.type === 'number') payload[name] = 100;
        else if (v.type === 'boolean') payload[name] = true;
        else if (v.type === 'date') payload[name] = new Date().toISOString();
        else payload[name] = `test_${name}`;
      }
    });

    return payload;
  }

  function generateAssertionsForPath(pathElements, endNode, type) {
    const assertions = [];
    assertions.push('Instance de processus démarrée avec succès (ProcessInstance started)');

    const tasks = pathElements.filter(e => ['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'callactivity'].includes(e.tag));
    if (tasks.length > 0) {
      assertions.push(`Passage ordonné sur les ${tasks.length} activités du parcours (${tasks.map(t => t.name || t.id).slice(0, 3).join(', ')}${tasks.length > 3 ? '...' : ''})`);
    }

    if (type === 'nominal') {
      assertions.push('Atteinte de l’événement de fin nominal (isCompleted)');
      assertions.push('Aucun incident Zeebe / Camunda levé en cours d’exécution');
      assertions.push('Variables de sortie générées et conformes au schéma attendu');
    } else if (type === 'error') {
      assertions.push('Déclenchement et capture de l’exception (Boundary Error / ErrorEndEvent)');
      assertions.push('Exécution de la branche de compensation / notification d’anomalie');
      assertions.push('Statut final de l’instance : Terminated with Error Code');
    } else if (type === 'branch') {
      assertions.push('Évaluation à VRAI de la condition de passerelle sur le flux alternatif');
      assertions.push('Validation du comportement de routage spécifique');
    } else if (type === 'timer') {
      assertions.push('Expiration du délai SLA / Minuteur (Timer Triggered)');
      assertions.push('Routage vers l’escalade ou relance automatique');
    }

    return assertions;
  }

  function formatElementType(tag) {
    const map = {
      'startevent': 'Début (Start Event)',
      'endevent': 'Fin (End Event)',
      'servicetask': 'Service Task (Automatique)',
      'usertask': 'User Task (Utilisateur)',
      'scripttask': 'Script Task',
      'callactivity': 'Call Activity',
      'exclusivegateway': 'Passerelle Exclusive (XOR)',
      'inclusivegateway': 'Passerelle Inclusive (OR)',
      'parallelgateway': 'Passerelle Parallèle (AND)',
      'boundaryevent': 'Événement de Bordure (Boundary)'
    };
    return map[tag] || tag;
  }

  function getElementIcon(tag) {
    const map = {
      'startevent': '🟢',
      'endevent': '🏁',
      'servicetask': '⚡',
      'usertask': '👤',
      'scripttask': '📜',
      'callactivity': '📦',
      'exclusivegateway': '🔶',
      'inclusivegateway': '🔷',
      'parallelgateway': '➕',
      'boundaryevent': '⚠️'
    };
    return map[tag] || '🔹';
  }

  /**
   * Rendu dynamique du contenu selon le sous-onglet actif
   */
  function renderTestGenContent() {
    const container = document.getElementById('testGenContentArea');
    if (!container) return;

    if (testGenActiveTab === 'import') {
      renderImportTab(container);
    } else if (testGenActiveTab === 'overview') {
      renderOverviewTab(container);
    } else if (testGenActiveTab === 'scenarios') {
      renderScenariosTab(container);
    } else if (testGenActiveTab === 'simulator') {
      renderSimulatorTab(container);
    } else if (testGenActiveTab === 'export') {
      renderExportTab(container);
    }
  }

  /**
   * 1. Onglet Import & Modèles
   */
  function renderImportTab(container) {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:20px;">
        <div>
          <!-- Zone de Drop -->
          <div class="test-gen-dropzone" id="testGenDropzone">
            <div style="font-size:36px; margin-bottom:12px;">📥</div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
              Glissez-déposez vos fichiers BPMN 2.0 / XML / ZIP
            </h3>
            <p style="font-size:13px; color:var(--text-tertiary); margin-bottom:16px;">
              Analyse automatique des passerelles, branches d'exception, tâches utilisateur et variables
            </p>
            <input type="file" id="testGenFileInput" multiple accept=".bpmn,.xml,.zip" style="display:none;">
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
              <button class="btn-primary" onclick="document.getElementById('testGenFileInput').click()">
                📂 Sélectionner des fichiers
              </button>
              <button class="btn-ghost" onclick="autoLoadWorkspaceBpmn()">
                🔄 Charger depuis le Workspace
              </button>
            </div>
          </div>

          <!-- Liste des fichiers chargés -->
          <div style="margin-top:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h4 style="font-size:14px; font-weight:700; color:var(--text-primary);">
                Modèles BPMN Prêts pour la Génération (${testGenFiles.length})
              </h4>
              ${testGenFiles.length > 0 ? `<button class="btn-ghost" style="color:var(--err); font-size:12px;" onclick="clearTestGenFiles()">Tout vider</button>` : ''}
            </div>

            ${testGenFiles.length === 0 ? `
              <div class="empty-state" style="padding:25px; border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
                <div style="font-size:24px; margin-bottom:6px;">📁</div>
                <div>Aucun modèle BPMN importé pour le moment.</div>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${testGenFiles.map((f, idx) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-sm);">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-size:16px;">🗺️</span>
                      <div>
                        <strong style="font-size:13px; color:var(--brand-primary);">${escapeHtml(f.fileName)}</strong>
                        <div style="font-size:11px; color:var(--text-tertiary);">
                          ${f.xmlDoc ? `XML BPMN 2.0 Valide · ${f.xmlDoc.querySelectorAll('process').length} processus` : `<span style="color:var(--err);">Erreur de parsing XML</span>`}
                        </div>
                      </div>
                    </div>
                    <button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--err);" onclick="removeTestGenFile(${idx})">✕</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Paramètres de Génération -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:18px;">
          <h4 style="font-size:14px; font-weight:700; color:var(--brand-primary); margin-bottom:14px;">
            ⚙️ Paramètres du Moteur de Test
          </h4>

          <div class="form-group" style="margin-bottom:14px;">
            <label class="input-label" style="font-size:12px;">Profil de Données Mock :</label>
            <select class="srt" style="width:100%;" onchange="testGenOptions.mockProfile = this.value; generateAllTestScenarios(false);">
              <option value="bouygues" ${testGenOptions.mockProfile === 'bouygues' ? 'selected' : ''}>🔵 Bouygues Telecom (MSISDN, IMSI, Offres)</option>
              <option value="standard" ${testGenOptions.mockProfile === 'standard' ? 'selected' : ''}>🌐 Standard Générique</option>
              <option value="edge_cases" ${testGenOptions.mockProfile === 'edge_cases' ? 'selected' : ''}>⚠️ Valeurs Limites & Extremums</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label class="input-label" style="font-size:12px;">Stratégie d'Exploration des Chemins :</label>
            <select class="srt" style="width:100%;" onchange="testGenOptions.pathStrategy = this.value; generateAllTestScenarios(false);">
              <option value="smart_branches" ${testGenOptions.pathStrategy === 'smart_branches' ? 'selected' : ''}>🎯 Smart Branches (Nominal + Gateways + Erreurs)</option>
              <option value="exhaustive" ${testGenOptions.pathStrategy === 'exhaustive' ? 'selected' : ''}>⚡ Exhaustif Complet (Toutes combinaisons)</option>
              <option value="nominal_errors" ${testGenOptions.pathStrategy === 'nominal_errors' ? 'selected' : ''}>🟢 Happy Path & Erreurs seules</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label class="input-label" style="font-size:12px;">Profondeur Max des Boucles :</label>
            <select class="srt" style="width:100%;" onchange="testGenOptions.maxLoopDepth = parseInt(this.value, 10); generateAllTestScenarios(false);">
              <option value="1" ${testGenOptions.maxLoopDepth === 1 ? 'selected' : ''}>1 itération (Sans répétition infinie)</option>
              <option value="2" ${testGenOptions.maxLoopDepth === 2 ? 'selected' : ''}>2 itérations (Test de re-jeu)</option>
            </select>
          </div>

          <button class="btn-primary" style="width:100%; padding:10px;" onclick="generateAllTestScenarios(true); setTestGenActiveTab('scenarios');">
            🚀 Générer les Scénarios (${currentTestScenarios.length})
          </button>
        </div>
      </div>
    `;

    // Attacher listeners drag & drop
    const dropzone = document.getElementById('testGenDropzone');
    const fileInput = document.getElementById('testGenFileInput');
    if (dropzone && fileInput) {
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag');
        if (e.dataTransfer.files) handleTestGenFiles(e.dataTransfer.files);
      });
      fileInput.addEventListener('change', e => {
        if (e.target.files) handleTestGenFiles(e.target.files);
      });
    }
  }

  /**
   * 2. Onglet Synthèse & Couverture
   */
  function renderOverviewTab(container) {
    const total = currentTestScenarios.length;
    const nominal = currentTestScenarios.filter(s => s.type === 'nominal').length;
    const branches = currentTestScenarios.filter(s => s.type === 'branch').length;
    const errors = currentTestScenarios.filter(s => s.type === 'error').length;
    const timers = currentTestScenarios.filter(s => s.type === 'timer').length;
    const user = currentTestScenarios.filter(s => s.type === 'user').length;

    // Calcul de couverture des éléments
    const allElementsSet = new Set();
    const coveredElementsSet = new Set();
    testGenFiles.forEach(f => {
      if (f && f.xmlDoc) {
        Array.from(f.xmlDoc.querySelectorAll('task, bpmn\\:task, serviceTask, bpmn\\:serviceTask, userTask, bpmn\\:userTask, scriptTask, bpmn\\:scriptTask, exclusiveGateway, bpmn\\:exclusiveGateway, inclusiveGateway, bpmn\\:inclusiveGateway, boundaryEvent, bpmn\\:boundaryEvent, endEvent, bpmn\\:endEvent')).filter(el => {
          if (el.prefix === 'zeebe' || el.prefix === 'camunda' || el.prefix === 'modeler') return false;
          let p = el.parentElement;
          while (p && p.nodeType === 1) {
            const pLn = (p.localName || '').toLowerCase();
            if (pLn === 'extensionelements' || pLn === 'extension_elements') return false;
            p = p.parentElement;
          }
          return true;
        }).forEach(el => {
          const id = el.getAttribute('id');
          if (id) allElementsSet.add(id);
        });
      }
    });

    currentTestScenarios.forEach(s => {
      s.path.forEach(id => coveredElementsSet.add(id));
    });

    const coveragePct = allElementsSet.size > 0 ? Math.min(100, Math.round((coveredElementsSet.size / allElementsSet.size) * 100)) : 100;

    container.innerHTML = `
      <!-- KPIs Grid -->
      <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 22px;">
        <div class="stat info">
          <div class="val">${total}</div>
          <div class="lbl">Scénarios Détectés</div>
        </div>
        <div class="stat ok">
          <div class="val">${nominal}</div>
          <div class="lbl">Happy Paths (Nominaux)</div>
        </div>
        <div class="stat warn">
          <div class="val">${branches}</div>
          <div class="lbl">Branches XOR / OR</div>
        </div>
        <div class="stat err">
          <div class="val">${errors}</div>
          <div class="lbl">Cas d'Erreurs / Exceptions</div>
        </div>
        <div class="stat ok">
          <div class="val">${coveragePct}%</div>
          <div class="lbl">Taux de Couverture BPMN</div>
        </div>
      </div>

      <!-- Synthèse par Processus -->
      <div class="tbl-wrap" style="margin-bottom:24px;">
        <div style="padding:14px 18px; background:var(--bg-card); border-bottom:1px solid var(--border-color); font-weight:700; color:var(--brand-primary); font-size:14px; display:flex; justify-content:space-between; align-items:center;">
          <span>Couverture & Auditabilité par Processus</span>
          <button class="btn-ghost" style="font-size:12px;" onclick="setTestGenActiveTab('scenarios')">Voir tous les scénarios ➔</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fichier BPMN</th>
              <th>Process ID</th>
              <th>Nom du Processus</th>
              <th>Scénarios Générés</th>
              <th>Répartition (N / B / E / T)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${testGenFiles.map(f => {
              const fileScenarios = currentTestScenarios.filter(s => s.fileName === f.fileName);
              const n = fileScenarios.filter(s => s.type === 'nominal').length;
              const b = fileScenarios.filter(s => s.type === 'branch').length;
              const e = fileScenarios.filter(s => s.type === 'error').length;
              const t = fileScenarios.filter(s => s.type === 'timer').length;
              const pId = fileScenarios[0]?.processId || '-';
              const pName = fileScenarios[0]?.processName || f.fileName;

              return `
                <tr>
                  <td><strong>🗺️ ${escapeHtml(f.fileName)}</strong></td>
                  <td><code>${escapeHtml(pId)}</code></td>
                  <td>${escapeHtml(pName)}</td>
                  <td><strong>${fileScenarios.length}</strong></td>
                  <td>
                    <span class="badge ok">${n} Nom.</span>
                    <span class="badge warn">${b} Bran.</span>
                    <span class="badge err">${e} Err.</span>
                    ${t > 0 ? `<span class="badge info">${t} Tim.</span>` : ''}
                  </td>
                  <td>
                    <button class="btn-ghost" style="padding:3px 8px; font-size:12px;" onclick="testGenSelectedProcess='${escapeHtml(pId)}'; setTestGenActiveTab('scenarios');">
                      Examiner
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * 3. Onglet Scénarios & Payloads (Explorateur et Éditeur)
   */
  function renderScenariosTab(container) {
    let filtered = currentTestScenarios;

    if (testGenFilter !== 'all') {
      filtered = filtered.filter(s => s.type === testGenFilter);
    }
    if (testGenSelectedProcess !== 'all') {
      filtered = filtered.filter(s => s.processId === testGenSelectedProcess);
    }
    if (testGenSearch) {
      const q = testGenSearch.toLowerCase();
      filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }

    const uniqueProcesses = Array.from(new Set(currentTestScenarios.map(s => s.processId)));

    container.innerHTML = `
      <!-- Toolbar Filtres & Recherche -->
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; background:var(--bg-card); padding:12px 16px; border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn-ghost ${testGenFilter === 'all' ? 'active' : ''}" onclick="testGenFilter='all'; renderTestGenContent();">Tous (${currentTestScenarios.length})</button>
          <button class="btn-ghost ${testGenFilter === 'nominal' ? 'active' : ''}" onclick="testGenFilter='nominal'; renderTestGenContent();">🟢 Nominaux</button>
          <button class="btn-ghost ${testGenFilter === 'branch' ? 'active' : ''}" onclick="testGenFilter='branch'; renderTestGenContent();">🟡 Branches</button>
          <button class="btn-ghost ${testGenFilter === 'error' ? 'active' : ''}" onclick="testGenFilter='error'; renderTestGenContent();">🔴 Erreurs</button>
          <button class="btn-ghost ${testGenFilter === 'timer' ? 'active' : ''}" onclick="testGenFilter='timer'; renderTestGenContent();">⏱️ Timers</button>
          <button class="btn-ghost ${testGenFilter === 'user' ? 'active' : ''}" onclick="testGenFilter='user'; renderTestGenContent();">👤 User Tasks</button>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <select class="srt" onchange="testGenSelectedProcess=this.value; renderTestGenContent();">
            <option value="all">Tous les Processus</option>
            ${uniqueProcesses.map(p => `<option value="${escapeHtml(p)}" ${testGenSelectedProcess === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
          </select>
          <input type="text" class="srch" placeholder="Rechercher scénario..." value="${escapeHtml(testGenSearch)}" oninput="testGenSearch=this.value; renderTestGenContent();" style="width:200px;">
        </div>
      </div>

      <!-- Scenarios Grid -->
      ${filtered.length === 0 ? `
        <div class="empty-state" style="padding:40px; border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
          <div style="font-size:32px; margin-bottom:10px;">🔍</div>
          <div>Aucun scénario ne correspond aux critères de filtre sélectionnés.</div>
        </div>
      ` : `
        <div class="test-scenarios-grid">
          ${filtered.map((s, idx) => {
            const payloadToDisplay = s.customPayload || s.payload;
            const jsonStr = JSON.stringify(payloadToDisplay, null, 2);

            return `
              <div class="test-scenario-card" id="card_${s.id}">
                <div class="test-scenario-header">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge ${s.badgeClass}">${s.badge}</span>
                    <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--text-tertiary);">${s.id}</span>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="btn-ghost" style="padding:2px 8px; font-size:11px;" onclick="copyScenarioPayload('${s.id}', this)">📋 Copier JSON</button>
                    <button class="btn-ghost" style="padding:2px 8px; font-size:11px;" onclick="openScenarioInSimulator('${s.id}')">🗺️ Visualiser</button>
                  </div>
                </div>

                <h4 style="font-size:14px; font-weight:700; color:var(--brand-primary); margin:8px 0 4px 0;">
                  ${escapeHtml(s.title)}
                </h4>
                <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">
                  ${escapeHtml(s.description)}
                </p>

                <!-- Fil d'Ariane du Parcours (Steps) -->
                <div class="test-path-trail">
                  ${s.executionSteps.map(st => `
                    <span class="test-path-chip chip-${st.type.toLowerCase().includes('start') ? 'start' : st.type.toLowerCase().includes('end') ? 'end' : st.type.toLowerCase().includes('gate') ? 'gw' : st.type.toLowerCase().includes('user') ? 'user' : 'task'}" title="${st.type}">
                      <span>${st.icon}</span> ${escapeHtml(st.name)}
                    </span>
                  `).join(' <span style="color:var(--text-muted); font-size:10px;">➔</span> ')}
                </div>

                <!-- Live Payload Editor -->
                <div class="test-payload-preview">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:11px; color:#94a3b8;">
                    <span>Payload Mock JSON (${Object.keys(payloadToDisplay).length} variables) :</span>
                    <span style="font-size:10px; color:#38bdf8;">Éditable en direct</span>
                  </div>
                  <textarea id="payload_input_${s.id}" onchange="updateScenarioPayload('${s.id}', this.value)">${escapeHtml(jsonStr)}</textarea>
                </div>

                <!-- Assertions Attendues -->
                <div style="margin-top:12px; border-top:1px solid var(--border-color-subtle); padding-top:8px;">
                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:4px;">
                    Résultats & Assertions Attendues :
                  </div>
                  <ul style="margin:0 0 0 16px; font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
                    ${s.assertions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  }

  /**
   * 4. Onglet Simulateur de Parcours & Visualiseur BPMN
   */
  function renderSimulatorTab(container) {
    const selectedScenario = currentTestScenarios.find(s => s.id === testGenSelectedScenarioId) || currentTestScenarios[0];

    container.innerHTML = `
      <div class="test-sim-layout">
        <!-- Sidebar Liste des Scénarios & Étapes -->
        <div class="test-sim-sidebar">
          <h4 style="font-size:13.5px; font-weight:700; color:var(--brand-primary); margin-bottom:10px;">
            🧪 Sélectionner un Scénario
          </h4>

          <select class="srt" style="width:100%; margin-bottom:14px;" onchange="selectSimScenario(this.value)">
            ${currentTestScenarios.map(s => `
              <option value="${s.id}" ${selectedScenario && selectedScenario.id === s.id ? 'selected' : ''}>
                ${s.id} - ${escapeHtml(s.badge)} (${s.processName})
              </option>
            `).join('')}
          </select>

          ${selectedScenario ? `
            <div style="margin-bottom:12px; padding:10px; background:var(--bg-card-subtle); border-radius:var(--border-radius-sm); border:1px solid var(--border-color-subtle);">
              <span class="badge ${selectedScenario.badgeClass}">${selectedScenario.badge}</span>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:6px;">
                Durée estimée : <strong>${selectedScenario.estimatedDuration}</strong> · <strong>${selectedScenario.path.length} étapes</strong>
              </div>
            </div>

            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:8px;">
              Étapes du Parcours :
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:360px; overflow-y:auto;">
              ${selectedScenario.executionSteps.map((st, idx) => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:6px; background:${testGenSimActiveStep === idx ? 'var(--brand-cyan-light)' : '#ffffff'}; border:1px solid ${testGenSimActiveStep === idx ? 'var(--brand-cyan)' : 'var(--border-color-subtle)'}; cursor:pointer;" onclick="focusSimStep(${idx}, '${st.elementId}')">
                  <span style="font-size:12px; font-weight:700; color:var(--text-tertiary);">${st.step}.</span>
                  <span>${st.icon}</span>
                  <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:600;">
                    ${escapeHtml(st.name)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Canvas BPMN-JS avec Surlignage de Trajectoire -->
        <div class="test-sim-canvas" id="testGenSimCanvasContainer">
          <div style="position:absolute; top:12px; right:12px; z-index:10; display:flex; gap:6px; background:rgba(255,255,255,0.9); padding:4px 8px; border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
            <button class="btn-ghost" style="padding:4px 8px;" onclick="testSimZoomIn()" title="Zoom +">🔍+</button>
            <button class="btn-ghost" style="padding:4px 8px;" onclick="testSimZoomOut()" title="Zoom -">🔍-</button>
            <button class="btn-ghost" style="padding:4px 8px;" onclick="testSimZoomFit()" title="Ajuster">⛶</button>
            <button class="btn-ghost" style="padding:4px 8px;" onclick="highlightFullScenarioPath()" title="Tout Surligner">✨ Tout Surligner</button>
          </div>
          <div id="testGenBpmnCanvas" style="width:100%; height:100%;"></div>
        </div>
      </div>
    `;
  }

  function selectSimScenario(scId) {
    testGenSelectedScenarioId = scId;
    testGenSimActiveStep = -1;
    renderTestGenContent();
    setTimeout(() => initTestSimulatorCanvas(), 100);
  }

  function openScenarioInSimulator(scId) {
    testGenSelectedScenarioId = scId;
    testGenActiveTab = 'simulator';
    renderTestGenNavTabs();
    renderTestGenContent();
    setTimeout(() => initTestSimulatorCanvas(), 150);
  }

  function initTestSimulatorCanvas() {
    const container = document.getElementById('testGenBpmnCanvas');
    if (!container || typeof BpmnJS === 'undefined') return;

    const selectedScenario = currentTestScenarios.find(s => s.id === testGenSelectedScenarioId) || currentTestScenarios[0];
    if (!selectedScenario) return;

    const file = testGenFiles.find(f => f.fileName === selectedScenario.fileName) || testGenFiles[0];
    if (!file || !file.source) return;

    if (testGenViewerInstance) {
      try { testGenViewerInstance.destroy(); } catch (e) {}
      testGenViewerInstance = null;
    }

    try {
      testGenViewerInstance = new BpmnJS({ container });
      testGenViewerInstance.importXML(file.source).then(() => {
        const canvas = testGenViewerInstance.get('canvas');
        canvas.zoom('fit-viewport');
        highlightFullScenarioPath();
      }).catch(err => {
        console.error('Erreur import XML dans test sim:', err);
      });
    } catch (e) {
      console.error('Erreur initialisation BPMN JS:', e);
    }
  }

  function highlightFullScenarioPath() {
    if (!testGenViewerInstance) return;
    const canvas = testGenViewerInstance.get('canvas');
    const overlays = testGenViewerInstance.get('overlays');
    const selectedScenario = currentTestScenarios.find(s => s.id === testGenSelectedScenarioId);
    if (!selectedScenario) return;

    selectedScenario.path.forEach((elId, idx) => {
      try {
        canvas.addMarker(elId, 'bpmn-highlight-focus');
        overlays.add(elId, 'step-badge', {
          position: { top: -10, right: -10 },
          html: `<div style="background:#003882; color:#fff; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${idx + 1}</div>`
        });
      } catch (e) {}
    });
  }

  function focusSimStep(stepIdx, elementId) {
    testGenSimActiveStep = stepIdx;
    if (!testGenViewerInstance || !elementId) return;
    const canvas = testGenViewerInstance.get('canvas');
    const registry = testGenViewerInstance.get('elementRegistry');
    const shape = registry.get(elementId);
    if (shape) {
      try {
        canvas.scrollToElement(shape);
      } catch (e) {}
    }
    renderSimulatorTab(document.getElementById('testGenContentArea'));
  }

  function testSimZoomIn() {
    if (!testGenViewerInstance) return;
    testGenViewerInstance.get('canvas').zoom(testGenViewerInstance.get('canvas').zoom() * 1.25);
  }
  function testSimZoomOut() {
    if (!testGenViewerInstance) return;
    testGenViewerInstance.get('canvas').zoom(testGenViewerInstance.get('canvas').zoom() * 0.8);
  }
  function testSimZoomFit() {
    if (!testGenViewerInstance) return;
    testGenViewerInstance.get('canvas').zoom('fit-viewport');
  }

  /**
   * 5. Onglet Centre d'Exportation & Code Templates
   */
  function renderExportTab(container) {
    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:16px; font-weight:700; color:var(--brand-primary); margin-bottom:6px;">
          📤 Centre d'Exportation des Scénarios de Test
        </h3>
        <p style="font-size:13px; color:var(--text-secondary);">
          Générez instantanément des suites de tests automatisées compatibles Camunda 8 (Zeebe), Camunda 7, Cucumber et Postman.
        </p>
      </div>

      <div class="test-export-grid">
        <!-- 1. JUnit 5 / Camunda 8 Zeebe -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">☕</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">JUnit 5 · Camunda 8 Zeebe Test</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">@ZeebeProcessTest · BpmnAssert</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Classe de test Java prête pour l'intégration continue (CI/CD) avec mocks de variables et vérifications d'instances.
            </p>
          </div>
          <button class="btn-primary" onclick="exportZeebeProcessTestJava()">
            📥 Télécharger BpmnZeebeTest.java
          </button>
        </div>

        <!-- 2. JUnit / Camunda 7 Spring Boot -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">☕</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">JUnit 4/5 · Camunda 7 Engine</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">ProcessEngineCoverage · BpmnAwareTests</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Suite de test Spring Boot Camunda 7 avec calcul de couverture et validation des branches.
            </p>
          </div>
          <button class="btn-primary" onclick="exportCamunda7TestJava()">
            📥 Télécharger Camunda7ProcessTest.java
          </button>
        </div>

        <!-- 3. Cucumber / Gherkin Feature -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">🥒</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Cucumber / Gherkin Feature</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">Spécifications BDD · Given / When / Then</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Fichier de scénarios lisibles par le métier et exécutables par les frameworks BDD / QA.
            </p>
          </div>
          <button class="btn-primary" onclick="exportGherkinFeature()">
            📥 Télécharger bpmn_scenarios.feature
          </button>
        </div>

        <!-- 4. Postman / Newman Collection -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">📬</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Collection Postman REST API</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">Camunda REST Gateway Ready</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Collection HTTP prête à l'emploi avec variables pré-remplies pour démarrer les processus par API.
            </p>
          </div>
          <button class="btn-primary" onclick="exportPostmanCollection()">
            📥 Télécharger Postman_Collection.json
          </button>
        </div>

        <!-- 5. Cahier de Recette Excel (XLSX) -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">📊</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Cahier de Recette Excel Pro</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">Multi-Feuilles · Étapes & Statuts QA</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Tableur de recette structuré pour les équipes d'homologation, tests manuels et PV de recette.
            </p>
          </div>
          <button class="btn-primary" onclick="exportTestBookExcel()">
            📥 Télécharger Cahier_Recette.xlsx
          </button>
        </div>

        <!-- 6. Export JSON / CSV Brut -->
        <div class="test-export-card">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:24px;">💾</span>
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Export Brut JSON & CSV</h4>
                <span style="font-size:11px; color:var(--text-tertiary);">Intégration d'outils tiers</span>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:14px;">
              Export intégral de tous les scénarios, chemins et assertions au format JSON structuré.
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-ghost" style="flex:1;" onclick="exportAllTestsJson()">JSON</button>
            <button class="btn-ghost" style="flex:1;" onclick="exportAllTestsCsv()">CSV</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Action Helpers (Copy, Edit, Exports)
   */
  function copyScenarioPayload(scId, btn) {
    const sc = currentTestScenarios.find(s => s.id === scId);
    if (!sc) return;
    const jsonStr = JSON.stringify(sc.customPayload || sc.payload, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✅ Copié !';
      setTimeout(() => btn.textContent = orig, 1800);
    });
  }

  function updateScenarioPayload(scId, newJsonStr) {
    const sc = currentTestScenarios.find(s => s.id === scId);
    if (!sc) return;
    try {
      sc.customPayload = JSON.parse(newJsonStr);
    } catch (e) {
      console.warn('JSON invalide lors de l\'édition manuelle:', e);
    }
  }

  // --- Exporters Implementations ---

  function exportZeebeProcessTestJava() {
    if (currentTestScenarios.length === 0) return;
    const firstProcId = currentTestScenarios[0].processId;

    let code = `package fr.bouyguestelecom.bpmn.tests;

import io.camunda.zeebe.client.ZeebeClient;
import io.camunda.zeebe.client.api.response.ProcessInstanceEvent;
import io.camunda.zeebe.process.test.api.ZeebeTestEngine;
import io.camunda.zeebe.process.test.extension.ZeebeProcessTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.time.Duration;

import static io.camunda.zeebe.process.test.assertions.BpmnAssert.assertThat;

/**
 * Suite de Tests Automatisée générée par Paprika AuditFlow Pro (Bouygues Telecom)
 * Processus : ${firstProcId}
 */
@ZeebeProcessTest
public class ${firstProcId.replace(/[^a-zA-Z0-9]/g, '')}GeneratedTest {

    private ZeebeClient client;
    private ZeebeTestEngine engine;
`;

    currentTestScenarios.forEach(s => {
      const methodName = `test_${s.id.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const payload = s.customPayload || s.payload;
      const entries = Object.entries(payload);

      code += `
    @Test
    @DisplayName("${s.id} - ${s.title.replace(/"/g, '\\"')}")
    public void ${methodName}() throws Exception {
        // Préparation des variables mock
        Map<String, Object> variables = Map.of(
`;
      entries.forEach(([k, v], eIdx) => {
        const valStr = typeof v === 'string' ? `"${v}"` : typeof v === 'boolean' ? `${v}` : `${v}`;
        code += `            "${k}", ${valStr}${eIdx < entries.length - 1 ? ',' : ''}\n`;
      });
      code += `        );

        // Démarrage de l'instance
        ProcessInstanceEvent processInstance = client.newCreateInstanceCommand()
            .bpmnProcessId("${s.processId}")
            .latestVersion()
            .variables(variables)
            .send()
            .join();

        // Assertions générées
        assertThat(processInstance).isStarted();
`;
      if (s.type === 'nominal') {
        code += `        // Attendre la fin nominale du processus\n`;
        code += `        engine.waitForIdleState(Duration.ofSeconds(2));\n`;
        code += `        assertThat(processInstance).isCompleted();\n`;
      } else if (s.type === 'error') {
        code += `        // Vérification de la capture d'erreur\n`;
        code += `        engine.waitForIdleState(Duration.ofSeconds(2));\n`;
        code += `        assertThat(processInstance).isTerminated();\n`;
      }
      code += `    }\n`;
    });

    code += `}\n`;
    downloadFile(code, `${firstProcId}_ZeebeTest.java`, 'text/plain;charset=utf-8');
  }

  function exportCamunda7TestJava() {
    if (currentTestScenarios.length === 0) return;
    const firstProcId = currentTestScenarios[0].processId;

    let code = `package fr.bouyguestelecom.bpmn.tests;

import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.test.Deployment;
import org.camunda.bpm.engine.test.ProcessEngineRule;
import org.camunda.bpm.extension.process_test_coverage.junit.rules.TestCoverageProcessEngineRuleBuilder;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import java.util.Map;
import java.util.HashMap;

import static org.camunda.bpm.engine.test.assertions.bpmn.BpmnAwareTests.*;

public class ${firstProcId.replace(/[^a-zA-Z0-9]/g, '')}Camunda7Test {

    @Rule
    @ClassRule
    public static ProcessEngineRule rule = TestCoverageProcessEngineRuleBuilder.create().build();

    @Test
    @Deployment(resources = "${currentTestScenarios[0].fileName}")
    public void testHappyPath() {
        RuntimeService runtimeService = rule.getRuntimeService();
        Map<String, Object> variables = new HashMap<>();
`;
    const payload = currentTestScenarios[0].payload;
    Object.entries(payload).forEach(([k, v]) => {
      const valStr = typeof v === 'string' ? `"${v}"` : `${v}`;
      code += `        variables.put("${k}", ${valStr});\n`;
    });
    code += `
        ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("${firstProcId}", variables);
        assertThat(processInstance).isStarted().isEnded();
    }
}
`;
    downloadFile(code, `${firstProcId}_Camunda7Test.java`, 'text/plain;charset=utf-8');
  }

  function exportGherkinFeature() {
    if (currentTestScenarios.length === 0) return;
    const firstProc = currentTestScenarios[0];

    let feat = `# language: fr
Fonctionnalité: Validation et Recette du Processus BPMN ${firstProc.processName} (${firstProc.processId})
  En tant qu'équipe projet Bouygues Telecom
  Je souhaite vérifier les branches et cas nominaux du diagramme BPMN

`;

    currentTestScenarios.forEach(s => {
      feat += `  Scénario: ${s.id} - ${s.title}\n`;
      feat += `    Étant donné que le processus BPMN "${s.processId}" est déployé\n`;
      feat += `    Et que les données d'entrée suivantes sont fournies:\n`;
      feat += `      | Variable | Valeur |\n`;
      const payload = s.customPayload || s.payload;
      Object.entries(payload).slice(0, 8).forEach(([k, v]) => {
        feat += `      | ${k} | ${v} |\n`;
      });
      feat += `    Quand je démarre une nouvelle instance du processus\n`;
      feat += `    Alors l'instance doit être initiée avec succès\n`;
      if (s.type === 'nominal') {
        feat += `    Et toutes les tâches doivent être exécutées sans incident\n`;
        feat += `    Et l'instance doit atteindre l'état final terminé\n`;
      } else if (s.type === 'error') {
        feat += `    Et l'anomalie métier doit être capturée par le Boundary Error Event\n`;
      }
      feat += `\n`;
    });

    downloadFile(feat, `${firstProc.processId}_scenarios.feature`, 'text/plain;charset=utf-8');
  }

  function exportPostmanCollection() {
    if (currentTestScenarios.length === 0) return;
    const firstProc = currentTestScenarios[0];

    const collection = {
      info: {
        name: `BPMN Test Collection - ${firstProc.processName}`,
        description: `Collection de tests générée automatiquement par Paprika AuditFlow Pro (Bouygues Telecom)`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: currentTestScenarios.map(s => {
        const payload = s.customPayload || s.payload;
        return {
          name: `${s.id} - ${s.title}`,
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                processDefinitionKey: s.processId,
                variables: payload
              }, null, 2)
            },
            url: {
              raw: "{{CAMUNDA_GATEWAY_URL}}/v1/process-instances",
              host: ["{{CAMUNDA_GATEWAY_URL}}"],
              path: ["v1", "process-instances"]
            }
          }
        };
      })
    };

    downloadFile(JSON.stringify(collection, null, 2), `${firstProc.processId}_Postman_Collection.json`, 'application/json;charset=utf-8');
  }

  function exportTestBookExcel() {
    if (typeof XLSX === 'undefined' || currentTestScenarios.length === 0) {
      alert('La bibliothèque XLSX est requise pour l\'export Excel.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Feuille Synthèse
    const summaryData = [
      ['CAHIER DE RECETTE BPMN - BOUYGUES TELECOM', ''],
      ['Date de Génération', new Date().toLocaleString('fr-FR')],
      ['Nombre Total de Scénarios', currentTestScenarios.length],
      ['Happy Paths (Nominaux)', currentTestScenarios.filter(s => s.type === 'nominal').length],
      ['Branches Alternatives (Gateways)', currentTestScenarios.filter(s => s.type === 'branch').length],
      ['Cas d\'Erreurs & Exceptions', currentTestScenarios.filter(s => s.type === 'error').length],
      ['Fichiers BPMN inclus', testGenFiles.map(f => f.fileName).join(', ')]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(summaryData) : summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse');

    // 2. Feuille Détail des Scénarios de Recette
    const detailHeaders = [
      'ID Scénario',
      'Process ID',
      'Nom du Processus',
      'Type de Test',
      'Titre du Scénario',
      'Description & Déroulé',
      'Données d\'Entrée (Payload JSON)',
      'Résultats & Assertions Attendues',
      'Statut Homologation (À tester / Conforme / KO)',
      'Commentaire Testeur'
    ];

    const detailRows = currentTestScenarios.map(s => [
      s.id,
      s.processId,
      s.processName,
      s.badge,
      s.title,
      s.description,
      JSON.stringify(s.customPayload || s.payload),
      s.assertions.join('\n• '),
      'À tester',
      ''
    ]);

    const wsDetails = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA([detailHeaders, ...detailRows]) : [detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Scénarios de Recette');

    XLSX.writeFile(wb, `Cahier_Recette_BPMN_Bouygues_${Date.now()}.xlsx`);
  }

  function exportAllTestsJson() {
    if (currentTestScenarios.length === 0) return;
    downloadFile(JSON.stringify(currentTestScenarios, null, 2), `bpmn_scenarios_${Date.now()}.json`, 'application/json;charset=utf-8');
  }

  function exportAllTestsCsv() {
    if (currentTestScenarios.length === 0) return;
    const headers = ['ID', 'ProcessId', 'ProcessName', 'Type', 'Title', 'Payload', 'Assertions'];
    const rows = currentTestScenarios.map(s => [
      s.id,
      s.processId,
      s.processName,
      s.type,
      s.title,
      JSON.stringify(s.customPayload || s.payload).replace(/"/g, '""'),
      s.assertions.join('; ').replace(/"/g, '""')
    ]);

    let csvContent = headers.map(h => `"${(window.sanitizeFormula ? window.sanitizeFormula(h) : h)}"`).join(';') + '\n';
    rows.forEach(r => {
      csvContent += r.map(cell => `"${(window.sanitizeFormula ? window.sanitizeFormula(cell) : cell)}"`).join(';') + '\n';
    });

    downloadFile(csvContent, `bpmn_scenarios_${Date.now()}.csv`, 'text/csv;charset=utf-8');
  }

  // Exports Globaux
  window.initTestGenModule = initTestGenModule;
  window.handleTestGenFiles = handleTestGenFiles;
  window.removeTestGenFile = removeTestGenFile;
  window.clearTestGenFiles = clearTestGenFiles;
  window.autoLoadWorkspaceBpmn = autoLoadWorkspaceBpmn;
  window.setTestGenActiveTab = setTestGenActiveTab;
  window.selectSimScenario = selectSimScenario;
  window.openScenarioInSimulator = openScenarioInSimulator;
  window.focusSimStep = focusSimStep;
  window.testSimZoomIn = testSimZoomIn;
  window.testSimZoomOut = testSimZoomOut;
  window.testSimZoomFit = testSimZoomFit;
  window.highlightFullScenarioPath = highlightFullScenarioPath;
  window.copyScenarioPayload = copyScenarioPayload;
  window.updateScenarioPayload = updateScenarioPayload;
  window.exportZeebeProcessTestJava = exportZeebeProcessTestJava;
  window.exportCamunda7TestJava = exportCamunda7TestJava;
  window.exportGherkinFeature = exportGherkinFeature;
  window.exportPostmanCollection = exportPostmanCollection;
  window.exportTestBookExcel = exportTestBookExcel;
  window.exportAllTestsJson = exportAllTestsJson;
  window.exportAllTestsCsv = exportAllTestsCsv;

})();
