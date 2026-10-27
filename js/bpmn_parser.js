/**
 * Bouygues Telecom - AuditFlow Pro / Module Audit & Santé BPMN
 * Moteur de Parsing XML Robuste & Normalisation AST Camunda 8 (Zeebe 8.x)
 * 
 * - Résolution stricte et agnostique des namespaces BPMN 2.0 et Zeebe
 * - Détection exhaustive de tous les composants Camunda 8 (Tasks, Gateways, Events, Extensions Zeebe)
 * - Traçabilité fine des variables (Producteurs, Consommateurs, Expressions FEEL)
 * - Prise en charge des patterns de migration technique (boucles de throttle PT2S, bypass conditionnels)
 */

(function (root, factory) {
  const parser = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = parser;
  }
  const g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : root);
  if (g) {
    g.BpmnZeebeParser = parser;
    g.bpmnGetLocalName = parser.getLocalName;
    g.bpmnGetAttr = parser.getAttr;
    g.bpmnGetZeebeExtension = parser.getZeebeExtension;
    g.bpmnExtractFeelVariables = parser.extractFeelVariables;
    g.bpmnGetProcessContract = parser.getProcessContract;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 1. Constantes des Namespaces Canoniques
  const NS = {
    BPMN: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
    ZEEBE: 'http://camunda.org/schema/zeebe/1.0',
    ZEEBE_ALT: 'http://camunda.org/schema/1.0/zeebe',
    BPMNDI: 'http://www.omg.org/spec/BPMN/20100524/DI',
    DC: 'http://www.omg.org/spec/DD/20100524/DC',
    DI: 'http://www.omg.org/spec/DD/20100524/DI',
    MODELER: 'http://camunda.org/schema/modeler/1.0',
    CAMUNDA: 'http://camunda.org/schema/1.0/bpmn',
    XSI: 'http://www.w3.org/2001/XMLSchema-instance'
  };

  // Mots réservés FEEL & Camunda (à ne pas considérer comme des variables métier)
  const FEEL_RESERVED_WORDS = new Set([
    'if', 'then', 'else', 'true', 'false', 'null', 'and', 'or', 'not', 'for', 'in', 'return',
    'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg',
    'append', 'insert', 'sublist', 'contains', 'string', 'number', 'boolean', 'date', 'time',
    'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'now', 'today',
    'abs', 'floor', 'ceiling', 'round', 'sort', 'reverse', 'flatten', 'distinct', 'values',
    'list', 'context', 'get', 'value', 'put', 'is', 'defined', 'execution', 'task',
    'authenticateduserid', 'getvariable', 'setvariable', 'between', 'empty', 'all', 'any',
    'upper', 'lower', 'case', 'replace', 'split', 'join', 'matches', 'starts', 'ends', 'with',
    'before', 'after', 'substring', 'length', 'sqrt', 'exp', 'log', 'ln', 'modulo', 'odd', 'even',
    'mean', 'median', 'stddev', 'mode', 'product', 'union', 'remove', 'indexof', 'entries'
  ]);

  // Types de nœuds d'activité reconnus
  const TASK_TYPES = new Set([
    'servicetask', 'usertask', 'scripttask', 'businessruletask', 'callactivity',
    'sendtask', 'receivetask', 'manualtask', 'task', 'subprocess'
  ]);

  // Types de passerelles reconnues
  const GATEWAY_TYPES = new Set([
    'exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway'
  ]);

  // Types d'événements reconnus
  const EVENT_TYPES = new Set([
    'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent'
  ]);

  // =========================================================================
  // 2. Fonctions Utilitaires DOM & Namespaces (Prefix-Agnostic & Safe)
  // =========================================================================

  function getLocalName(el) {
    if (!el) return '';
    const raw = el.localName || el.tagName || '';
    return raw.split(':').pop().toLowerCase();
  }

  function getNamespaceURI(el) {
    if (!el) return '';
    return el.namespaceURI || '';
  }

  function getAttr(el, ...names) {
    if (!el || typeof el.getAttribute !== 'function') return '';
    
    // 1. Recherche par nom exact ou variantes passées
    for (const name of names) {
      if (el.hasAttribute(name)) {
        const val = el.getAttribute(name);
        if (val !== null && val !== undefined) return String(val).trim();
      }
    }

    // 2. Recherche insensible à la casse et sans préfixe
    const lowerNames = names.map(n => n.split(':').pop().toLowerCase());
    const attrs = el.attributes || [];
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      const aLocal = (a.localName || a.name || '').split(':').pop().toLowerCase();
      if (lowerNames.includes(aLocal)) {
        return (a.value || '').trim();
      }
    }
    return '';
  }

  function getDirectChildren(parent, ...localNames) {
    if (!parent || !parent.children) return [];
    const targets = localNames.length ? new Set(localNames.map(n => n.toLowerCase())) : null;
    const result = [];
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === 1) {
        if (!targets || targets.has(getLocalName(child))) {
          result.push(child);
        }
      }
    }
    return result;
  }

  function getDescendants(parent, ...localNames) {
    if (!parent) return [];
    const targets = localNames.length ? new Set(localNames.map(n => n.toLowerCase())) : null;
    const all = parent.getElementsByTagName('*');
    const result = [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (el.nodeType === 1) {
        if (!targets || targets.has(getLocalName(el))) {
          result.push(el);
        }
      }
    }
    return result;
  }

  function getExtensionElements(flowNode) {
    if (!flowNode) return null;
    const direct = getDirectChildren(flowNode, 'extensionelements');
    if (direct.length > 0) return direct[0];
    const desc = getDescendants(flowNode, 'extensionelements');
    return desc.length > 0 ? desc[0] : null;
  }

  function isZeebeElement(el, targetLocalName) {
    if (!el) return false;
    const lName = getLocalName(el);
    if (lName !== targetLocalName.toLowerCase()) return false;
    const ns = getNamespaceURI(el);
    if (ns === NS.ZEEBE || ns === NS.ZEEBE_ALT) return true;
    const prefix = (el.prefix || el.tagName.split(':')[0] || '').toLowerCase();
    return prefix === 'zeebe' || prefix === 'z' || ns === '';
  }

  function getZeebeExtension(flowNode, extensionLocalName) {
    const extContainer = getExtensionElements(flowNode);
    if (!extContainer) return null;
    const children = getDescendants(extContainer, extensionLocalName);
    return children.find(child => isZeebeElement(child, extensionLocalName)) || children[0] || null;
  }

  function getAllZeebeExtensions(flowNode, extensionLocalName) {
    const extContainer = getExtensionElements(flowNode);
    if (!extContainer) return [];
    const children = getDescendants(extContainer, extensionLocalName);
    return children.filter(child => isZeebeElement(child, extensionLocalName));
  }

  // =========================================================================
  // 3. Extraction Sémantique des Identifiants & Expressions FEEL (Zeebe C8)
  // =========================================================================

  function extractFeelVariables(expr) {
    if (!expr) return [];
    let text = String(expr).trim();

    // Expression FEEL débute par '=' ou JUEL Camunda 7 '${...}' / '#{...}'
    if (text.startsWith('=')) {
      text = text.substring(1).trim();
    } else {
      const juelMatch = text.match(/[$#]\{([^}]+)\}/);
      if (juelMatch) text = juelMatch[1].trim();
    }

    // 1. Supprimer les littéraux de chaîne ("..." ou '...') pour ne pas capter leur contenu
    text = text.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ');

    // 2. Remplacer les accès de propriétés (ex: client.adresse.codePostal -> ne garder que client)
    text = text.replace(/\.\s*[\p{L}_][\p{L}\p{N}_]*/gu, ' ');

    // 3. Supprimer les appels de fonctions FEEL (ex: count(...) ou number(...) -> ne pas considérer le nom de la fonction)
    text = text.replace(/[\p{L}_][\p{L}\p{N}_]*\s*(?=\()/gu, ' ');

    // 4. Supprimer les opérateurs ou expressions à mots multiples (ex: "list contains", "string length", etc.)
    text = text.replace(/\b(list\s+contains|string\s+length|string\s+join|starts\s+with|ends\s+with|substring\s+before|substring\s+after|date\s+and\s+time|years\s+and\s+months\s+duration|days\s+and\s+time\s+duration|get\s+value|get\s+entries|distinct\s+values|insert\s+before|instance\s+of)\b/gi, ' ');

    // 5. Extraire les identifiants valides (support unicode complet pour variables françaises)
    const matches = text.match(/[\p{L}_][\p{L}\p{N}_]*/gu) || [];

    // 6. Filtrer les mots-clés réservés
    const result = new Set();
    for (const m of matches) {
      const lower = m.toLowerCase();
      if (!FEEL_RESERVED_WORDS.has(lower) && isNaN(Number(m))) {
        result.add(m);
      }
    }
    return Array.from(result);
  }

  // =========================================================================
  // 4. Analyseur Spécialisé des Composants Camunda 8
  // =========================================================================

  function parseSingleProcessNode(procEl) {
    const processId = getAttr(procEl, 'id');
    const processName = getAttr(procEl, 'name') || processId;
    const isExecutable = getAttr(procEl, 'isExecutable') === 'true';

    return {
      id: processId,
      name: processName,
      isExecutable,
      element: procEl
    };
  }

  function parseZeebeTaskExtensions(taskEl, taskType) {
    const extensions = {
      taskDefinition: null,
      script: null,
      calledElement: null,
      calledDecision: null,
      userTask: null,
      ioMapping: { inputs: [], outputs: [] },
      loopCharacteristics: null,
      properties: [],
      taskHeaders: []
    };

    // 1. Task Definition (ServiceTask, SendTask, BusinessRuleTask)
    const taskDefEl = getZeebeExtension(taskEl, 'taskDefinition');
    if (taskDefEl) {
      extensions.taskDefinition = {
        type: getAttr(taskDefEl, 'type'),
        retries: getAttr(taskDefEl, 'retries') || '3'
      };
    }

    // 2. Script Zeebe (ScriptTask Camunda 8)
    const scriptEl = getZeebeExtension(taskEl, 'script');
    if (scriptEl) {
      extensions.script = {
        expression: getAttr(scriptEl, 'expression'),
        resultVariable: getAttr(scriptEl, 'resultVariable')
      };
    } else if (taskType === 'scripttask') {
      // Fallback Camunda 7 <bpmn:script>
      const directScript = getDescendants(taskEl, 'script')[0];
      const resVar = getAttr(taskEl, 'camunda:resultVariable', 'resultVariable');
      if (directScript || resVar) {
        extensions.script = {
          expression: directScript ? (directScript.textContent || '').trim() : '',
          resultVariable: resVar
        };
      }
    }

    // 3. Called Element (CallActivity Camunda 8)
    const calledEl = getZeebeExtension(taskEl, 'calledElement');
    if (calledEl) {
      extensions.calledElement = {
        processId: getAttr(calledEl, 'processId'),
        propagateAllParentVariables: getAttr(calledEl, 'propagateAllParentVariables') !== 'false',
        propagateAllChildVariables: getAttr(calledEl, 'propagateAllChildVariables') !== 'false',
        bindingType: getAttr(calledEl, 'bindingType') || 'latest'
      };
    } else if (taskType === 'callactivity') {
      // Fallback Camunda 7
      const targetProc = getAttr(taskEl, 'calledElement');
      if (targetProc) {
        extensions.calledElement = {
          processId: targetProc,
          propagateAllParentVariables: true,
          propagateAllChildVariables: true,
          bindingType: 'latest'
        };
      }
    }

    // 4. Called Decision DMN (BusinessRuleTask Camunda 8)
    const calledDecisionEl = getZeebeExtension(taskEl, 'calledDecision');
    if (calledDecisionEl) {
      extensions.calledDecision = {
        decisionId: getAttr(calledDecisionEl, 'decisionId'),
        resultVariable: getAttr(calledDecisionEl, 'resultVariable'),
        bindingType: getAttr(calledDecisionEl, 'bindingType') || 'latest'
      };
    }

    // 5. User Task Configuration (UserTask Camunda 8)
    if (taskType === 'usertask') {
      const formDef = getZeebeExtension(taskEl, 'formDefinition');
      const assignDef = getZeebeExtension(taskEl, 'assignmentDefinition');
      const scheduleDef = getZeebeExtension(taskEl, 'taskSchedule');
      const hasNativeZeebeUserTask = !!getZeebeExtension(taskEl, 'userTask');

      extensions.userTask = {
        isNativeC8: hasNativeZeebeUserTask || !!(formDef || assignDef),
        formId: formDef ? getAttr(formDef, 'formId') : getAttr(taskEl, 'camunda:formKey', 'formKey'),
        formKey: formDef ? getAttr(formDef, 'formKey') : '',
        assignee: assignDef ? getAttr(assignDef, 'assignee') : getAttr(taskEl, 'camunda:assignee', 'assignee'),
        candidateGroups: assignDef ? getAttr(assignDef, 'candidateGroups') : getAttr(taskEl, 'camunda:candidateGroups', 'candidateGroups'),
        candidateUsers: assignDef ? getAttr(assignDef, 'candidateUsers') : getAttr(taskEl, 'camunda:candidateUsers', 'candidateUsers'),
        dueDate: scheduleDef ? getAttr(scheduleDef, 'dueDate') : getAttr(taskEl, 'camunda:dueDate'),
        followUpDate: scheduleDef ? getAttr(scheduleDef, 'followUpDate') : getAttr(taskEl, 'camunda:followUpDate')
      };
    }

    // 6. I/O Mapping (<zeebe:ioMapping>)
    const ioEl = getZeebeExtension(taskEl, 'ioMapping');
    if (ioEl) {
      const inputs = getDescendants(ioEl, 'input').filter(i => isZeebeElement(i, 'input') || getLocalName(i) === 'input');
      inputs.forEach(inp => {
        extensions.ioMapping.inputs.push({
          source: getAttr(inp, 'source'),
          target: getAttr(inp, 'target'),
          element: inp
        });
      });

      const outputs = getDescendants(ioEl, 'output').filter(o => isZeebeElement(o, 'output') || getLocalName(o) === 'output');
      outputs.forEach(out => {
        extensions.ioMapping.outputs.push({
          source: getAttr(out, 'source'),
          target: getAttr(out, 'target'),
          element: out
        });
      });
    }

    // Support Camunda 7 in/out parameters
    const camInList = getDescendants(taskEl, 'inputparameter', 'in');
    camInList.forEach(cin => {
      const src = getAttr(cin, 'source', 'sourceExpression') || (cin.textContent || '').trim();
      const tgt = getAttr(cin, 'name', 'target');
      if (tgt || src) {
        extensions.ioMapping.inputs.push({ source: src, target: tgt, element: cin });
      }
    });

    const camOutList = getDescendants(taskEl, 'outputparameter', 'out');
    camOutList.forEach(cout => {
      const src = getAttr(cout, 'source', 'sourceExpression') || (cout.textContent || '').trim();
      const tgt = getAttr(cout, 'name', 'target');
      if (tgt || src) {
        extensions.ioMapping.outputs.push({ source: src, target: tgt, element: cout });
      }
    });

    // 7. Multi-Instance Loop Characteristics
    const miEl = getDescendants(taskEl, 'multiInstanceLoopCharacteristics')[0];
    if (miEl) {
      const isSequential = getAttr(miEl, 'isSequential') === 'true';
      const zeebeLoop = getZeebeExtension(miEl, 'loopCharacteristics');
      const completionCondEl = getDescendants(miEl, 'completionCondition')[0];

      extensions.loopCharacteristics = {
        isSequential,
        inputCollection: zeebeLoop ? getAttr(zeebeLoop, 'inputCollection') : getAttr(miEl, 'camunda:collection', 'collection'),
        inputElement: zeebeLoop ? getAttr(zeebeLoop, 'inputElement') : getAttr(miEl, 'camunda:elementVariable', 'elementVariable'),
        outputCollection: zeebeLoop ? getAttr(zeebeLoop, 'outputCollection') : '',
        outputElement: zeebeLoop ? getAttr(zeebeLoop, 'outputElement') : '',
        completionCondition: completionCondEl ? (completionCondEl.textContent || '').trim() : ''
      };
    }

    // 8. Zeebe Properties
    const propsContainer = getZeebeExtension(taskEl, 'properties');
    if (propsContainer) {
      const props = getDescendants(propsContainer, 'property');
      props.forEach(p => {
        const k = getAttr(p, 'key', 'name');
        const v = getAttr(p, 'value');
        if (k) extensions.properties.push({ key: k, value: v, element: p });
      });
    }

    // 9. Task Headers
    const headersContainer = getZeebeExtension(taskEl, 'taskHeaders');
    if (headersContainer) {
      const headers = getDescendants(headersContainer, 'header');
      headers.forEach(h => {
        const k = getAttr(h, 'key');
        const v = getAttr(h, 'value');
        if (k) extensions.taskHeaders.push({ key: k, value: v, element: h });
      });
    }

    return extensions;
  }

  function parseEventDefinitions(eventEl) {
    const defs = {
      timer: null,
      message: null,
      error: null,
      escalation: null,
      signal: null,
      terminate: false,
      compensation: false
    };

    // Timer Definition
    const timerEl = getDescendants(eventEl, 'timerEventDefinition')[0];
    if (timerEl) {
      const durationEl = getDescendants(timerEl, 'timeDuration')[0];
      const cycleEl = getDescendants(timerEl, 'timeCycle')[0];
      const dateEl = getDescendants(timerEl, 'timeDate')[0];
      
      const durationVal = durationEl ? (durationEl.textContent || '').trim() : '';
      const cycleVal = cycleEl ? (cycleEl.textContent || '').trim() : '';
      const dateVal = dateEl ? (dateEl.textContent || '').trim() : '';

      const rawVal = durationVal || cycleVal || dateVal;
      const isFeel = rawVal.startsWith('=');
      const isMigrationTimer = /PT[12]S/i.test(rawVal) || rawVal.includes('migration');

      defs.timer = {
        kind: durationVal ? 'duration' : (cycleVal ? 'cycle' : 'date'),
        value: rawVal,
        isFeel,
        isMigrationTimer
      };
    }

    // Message Definition
    const msgEl = getDescendants(eventEl, 'messageEventDefinition')[0];
    if (msgEl) {
      defs.message = {
        messageRef: getAttr(msgEl, 'messageRef')
      };
    }

    // Error Definition
    const errEl = getDescendants(eventEl, 'errorEventDefinition')[0];
    if (errEl) {
      defs.error = {
        errorRef: getAttr(errEl, 'errorRef'),
        errorCode: getAttr(errEl, 'errorCode')
      };
    }

    // Escalation Definition
    const escEl = getDescendants(eventEl, 'escalationEventDefinition')[0];
    if (escEl) {
      defs.escalation = {
        escalationRef: getAttr(escEl, 'escalationRef'),
        escalationCode: getAttr(escEl, 'escalationCode')
      };
    }

    // Signal Definition
    const sigEl = getDescendants(eventEl, 'signalEventDefinition')[0];
    if (sigEl) {
      defs.signal = {
        signalRef: getAttr(sigEl, 'signalRef')
      };
    }

    if (getDescendants(eventEl, 'terminateEventDefinition').length > 0) defs.terminate = true;
    if (getDescendants(eventEl, 'compensateEventDefinition').length > 0) defs.compensation = true;

    return defs;
  }

  // =========================================================================
  // 5. Moteur de Normalisation Complet : AST & Graphe Camunda 8
  // =========================================================================

  function parseDocument(xmlSourceOrDoc, fileName = 'process.bpmn') {
    let xmlDoc = null;
    let rawXml = '';

    if (typeof xmlSourceOrDoc === 'string') {
      rawXml = xmlSourceOrDoc;
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(rawXml, 'application/xml');
      const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
      if (parserError) {
        throw new Error('Erreur de parsing XML BPMN : ' + parserError.textContent.trim());
      }
    } else if (xmlSourceOrDoc && xmlSourceOrDoc.documentElement) {
      xmlDoc = xmlSourceOrDoc;
      try {
        rawXml = new XMLSerializer().serializeToString(xmlDoc);
      } catch (e) {
        rawXml = '';
      }
    } else {
      throw new Error('Document XML invalide ou non fourni.');
    }

    const root = xmlDoc.documentElement;
    const isBpmn = getLocalName(root) === 'definitions';

    const result = {
      id: 'bpmn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      fileName,
      rawXml,
      xmlDoc,
      isBpmn,
      definitions: {
        id: getAttr(root, 'id'),
        targetNamespace: getAttr(root, 'targetNamespace'),
        exporter: getAttr(root, 'exporter'),
        executionPlatform: getAttr(root, 'modeler:executionPlatform', 'executionPlatform') || 'Camunda Cloud',
        executionPlatformVersion: getAttr(root, 'modeler:executionPlatformVersion', 'executionPlatformVersion') || '8.x'
      },
      processes: [],
      // Structures de rétrocompatibilité attendues par AuditFlow Pro (app.js, pmg.js, lineage.js)
      processId: '',
      processName: '',
      activities: [],
      callActivities: [],
      variables: [],
      flows: [],
      gateways: [],
      events: [],
      elementsMap: new Map(),
      outgoingMap: new Map(),
      incomingMap: new Map(),
      isRoot: true
    };

    // 1. Détecter tous les processus (support multi-processus et pools)
    const procElements = getDescendants(root, 'process');
    if (procElements.length === 0) {
      // Cas de repli si la balise n'a pas été trouvée
      const direct = getDirectChildren(root, 'process');
      if (direct.length > 0) procElements.push(...direct);
    }

    let globalRowId = 1;

    procElements.forEach((pEl, pIdx) => {
      const pInfo = parseSingleProcessNode(pEl);
      if (pIdx === 0) {
        result.processId = pInfo.id || ('Process_' + Math.random().toString(36).substr(2, 5));
        result.processName = pInfo.name || fileName.replace(/\.bpmn$/i, '');
      }

      const procObj = {
        ...pInfo,
        activities: [],
        gateways: [],
        events: [],
        flows: [],
        variables: []
      };

      // Parcourir les enfants directs du processus pour extraire activités, flux et passerelles
      const pChildren = pEl.children || [];
      for (let i = 0; i < pChildren.length; i++) {
        const child = pChildren[i];
        if (child.nodeType !== 1) continue;

        const localName = getLocalName(child);
        const childId = getAttr(child, 'id');
        const childName = getAttr(child, 'name') || childId;

        // A. Flux de séquence (Sequence Flows)
        if (localName === 'sequenceflow') {
          const sourceRef = getAttr(child, 'sourceRef');
          const targetRef = getAttr(child, 'targetRef');
          
          let conditionExpression = '';
          const condEl = getDescendants(child, 'conditionExpression')[0];
          if (condEl) {
            conditionExpression = (condEl.textContent || '').trim();
          } else {
            conditionExpression = getAttr(child, 'conditionExpression');
          }

          // Détection sémantique des patterns de migration
          const isMigrationBypass = /migration\s*=\s*["']O["']/i.test(conditionExpression) ||
            /migrationActivities/i.test(conditionExpression);
          const isMigrationLoopGuard = /migration_loop\s*<\s*number\(/i.test(conditionExpression) ||
            /migration_loop\s*<\s*\w+/i.test(conditionExpression);

          const flowItem = {
            id: childId,
            name: childName,
            sourceRef,
            targetRef,
            conditionExpression,
            isMigrationBypass,
            isMigrationLoopGuard,
            processId: pInfo.id,
            element: child
          };

          procObj.flows.push(flowItem);
          result.flows.push(flowItem);

          // Indexation des graphes orientés
          if (sourceRef) {
            if (!result.outgoingMap.has(sourceRef)) result.outgoingMap.set(sourceRef, []);
            result.outgoingMap.get(sourceRef).push(flowItem);
          }
          if (targetRef) {
            if (!result.incomingMap.has(targetRef)) result.incomingMap.set(targetRef, []);
            result.incomingMap.get(targetRef).push(flowItem);
          }

          // Extraction des variables lues dans la condition FEEL
          if (conditionExpression) {
            const feelVars = extractFeelVariables(conditionExpression);
            feelVars.forEach(vName => {
              const varEntry = {
                name: vName,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `Transition (${childName || childId})`,
                fileName,
                processId: pInfo.id,
                role: 'consumer',
                row: globalRowId++,
                bpmnMeta: {
                  node: child,
                  attr: null,
                  originalValue: conditionExpression,
                  type: 'expression'
                }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            });
          }
          continue;
        }

        // B. Activités & Tâches
        if (TASK_TYPES.has(localName)) {
          const extensions = parseZeebeTaskExtensions(child, localName);
          const actItem = {
            id: childId,
            name: childName,
            type: localName,
            processId: pInfo.id,
            processName: pInfo.name,
            extensions,
            element: child
          };

          procObj.activities.push(actItem);
          result.activities.push(actItem);
          result.elementsMap.set(childId, actItem);

          // Cas spécifique des Call Activities pour le graphe inter-processus
          if (localName === 'callactivity') {
            const calledProcId = extensions.calledElement ? extensions.calledElement.processId : '';
            result.callActivities.push({
              activityId: childId,
              activityName: childName,
              calledElement: calledProcId || '(Non défini)',
              propagateAllParentVariables: extensions.calledElement ? extensions.calledElement.propagateAllParentVariables : true,
              propagateAllChildVariables: extensions.calledElement ? extensions.calledElement.propagateAllChildVariables : true,
              inMappings: extensions.ioMapping.inputs,
              outMappings: extensions.ioMapping.outputs,
              parentProcessId: pInfo.id,
              parentProcessName: pInfo.name,
              fileName,
              element: child
            });
          }

          // Extraction des variables de la tâche Camunda 8
          // 1. Script Zeebe (<zeebe:script>)
          if (extensions.script) {
            // A. Variable produite (resultVariable) -> PRODUCER
            if (extensions.script.resultVariable) {
              const resVar = extensions.script.resultVariable.trim();
              const varEntry = {
                name: resVar,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `${childName || childId} (Script Résultat)`,
                fileName,
                processId: pInfo.id,
                role: 'producer',
                row: globalRowId++,
                bpmnMeta: {
                  node: child,
                  attr: 'resultVariable',
                  originalValue: resVar,
                  type: 'attribute'
                }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            }

            // B. Variables consommées dans l'expression FEEL -> CONSUMER
            if (extensions.script.expression) {
              const feelVars = extractFeelVariables(extensions.script.expression);
              feelVars.forEach(vName => {
                const varEntry = {
                  name: vName,
                  parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                  callingProcess: `${childName || childId} (Expression Script)`,
                  fileName,
                  processId: pInfo.id,
                  role: 'consumer',
                  row: globalRowId++,
                  bpmnMeta: {
                    node: child,
                    attr: 'expression',
                    originalValue: extensions.script.expression,
                    type: 'expression'
                  }
                };
                procObj.variables.push(varEntry);
                result.variables.push(varEntry);
              });
            }
          }

          // 2. I/O Mappings Zeebe (<zeebe:ioMapping>)
          // Inputs : la source consomme depuis le scope parent
          extensions.ioMapping.inputs.forEach(inp => {
            if (inp.source) {
              extractFeelVariables(inp.source).forEach(vName => {
                const varEntry = {
                  name: vName,
                  parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                  callingProcess: `${childName || childId} (Input Source)`,
                  fileName,
                  processId: pInfo.id,
                  role: 'consumer',
                  row: globalRowId++,
                  bpmnMeta: { node: inp.element || child, attr: 'source', originalValue: inp.source, type: 'expression' }
                };
                procObj.variables.push(varEntry);
                result.variables.push(varEntry);
              });
            }
            // La cible (target) est le paramètre local de tâche (contrat de tâche)
            if (inp.target) {
              const varEntry = {
                name: inp.target,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `${childName || childId} (Param Entrée Tâche)`,
                fileName,
                processId: pInfo.id,
                role: 'task_input', // Rôle dédié pour éviter de fausses alertes d'orpheline dans le processus
                row: globalRowId++,
                bpmnMeta: { node: inp.element || child, attr: 'target', originalValue: inp.target, type: 'attribute' }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            }
          });

          // Outputs : la target produit une variable dans le processus
          extensions.ioMapping.outputs.forEach(out => {
            if (out.target) {
              const varEntry = {
                name: out.target,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `${childName || childId} (Output Target)`,
                fileName,
                processId: pInfo.id,
                role: 'producer',
                row: globalRowId++,
                bpmnMeta: { node: out.element || child, attr: 'target', originalValue: out.target, type: 'attribute' }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            }
          });

          // 3. Multi-Instance Loop (<zeebe:loopCharacteristics>)
          if (extensions.loopCharacteristics) {
            const lc = extensions.loopCharacteristics;
            if (lc.inputCollection) {
              extractFeelVariables(lc.inputCollection).forEach(vName => {
                const varEntry = {
                  name: vName,
                  parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                  callingProcess: `${childName || childId} (Multi-Instance Collection)`,
                  fileName,
                  processId: pInfo.id,
                  role: 'consumer',
                  row: globalRowId++,
                  bpmnMeta: { node: child, attr: 'inputCollection', originalValue: lc.inputCollection, type: 'expression' }
                };
                procObj.variables.push(varEntry);
                result.variables.push(varEntry);
              });
            }
            if (lc.inputElement) {
              const varEntry = {
                name: lc.inputElement,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `${childName || childId} (Élément d'Itération)`,
                fileName,
                processId: pInfo.id,
                role: 'producer',
                row: globalRowId++,
                bpmnMeta: { node: child, attr: 'inputElement', originalValue: lc.inputElement, type: 'attribute' }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            }
            if (lc.outputCollection) {
              const varEntry = {
                name: lc.outputCollection,
                parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                callingProcess: `${childName || childId} (Collection Finale)`,
                fileName,
                processId: pInfo.id,
                role: 'producer',
                row: globalRowId++,
                bpmnMeta: { node: child, attr: 'outputCollection', originalValue: lc.outputCollection, type: 'attribute' }
              };
              procObj.variables.push(varEntry);
              result.variables.push(varEntry);
            }
          }

          // 4. Called Decision DMN (<zeebe:calledDecision>)
          if (extensions.calledDecision && extensions.calledDecision.resultVariable) {
            const varEntry = {
              name: extensions.calledDecision.resultVariable,
              parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
              callingProcess: `${childName || childId} (Décision DMN)`,
              fileName,
              processId: pInfo.id,
              role: 'producer',
              row: globalRowId++,
              bpmnMeta: { node: child, attr: 'resultVariable', originalValue: extensions.calledDecision.resultVariable, type: 'attribute' }
            };
            procObj.variables.push(varEntry);
            result.variables.push(varEntry);
          }

          // 5. User Task Assignee / Groups expressions
          if (extensions.userTask) {
            ['assignee', 'candidateGroups', 'candidateUsers'].forEach(attr => {
              const val = extensions.userTask[attr];
              if (val) {
                extractFeelVariables(val).forEach(vName => {
                  const varEntry = {
                    name: vName,
                    parentProcess: pInfo.name ? `${pInfo.name} (${pInfo.id})` : pInfo.id,
                    callingProcess: `${childName || childId} (Affectation ${attr})`,
                    fileName,
                    processId: pInfo.id,
                    role: 'consumer',
                    row: globalRowId++,
                    bpmnMeta: { node: child, attr, originalValue: val, type: 'expression' }
                  };
                  procObj.variables.push(varEntry);
                  result.variables.push(varEntry);
                });
              }
            });
          }

          continue;
        }

        // C. Passerelles (Gateways)
        if (GATEWAY_TYPES.has(localName)) {
          const defaultFlow = getAttr(child, 'default');
          const gwItem = {
            id: childId,
            name: childName,
            type: localName,
            defaultFlow,
            processId: pInfo.id,
            element: child
          };
          procObj.gateways.push(gwItem);
          result.gateways.push(gwItem);
          result.elementsMap.set(childId, gwItem);
          continue;
        }

        // D. Événements (Events)
        if (EVENT_TYPES.has(localName)) {
          const attachedToRef = getAttr(child, 'attachedToRef');
          const cancelActivity = getAttr(child, 'cancelActivity') !== 'false';
          const defs = parseEventDefinitions(child);

          const evtItem = {
            id: childId,
            name: childName,
            type: localName,
            attachedToRef,
            cancelActivity,
            definitions: defs,
            processId: pInfo.id,
            element: child
          };
          procObj.events.push(evtItem);
          result.events.push(evtItem);
          result.elementsMap.set(childId, evtItem);
          continue;
        }
      }

      result.processes.push(procObj);
    });

    return result;
  }


  // =========================================================================
  // 5. Contrat de Données & Résolution des Variables d'un Processus
  // =========================================================================

  function getProcessContract(procOrEl) {
    if (!procOrEl) return null;

    const produced = new Set();
    const consumed = new Set();
    let processId = '';
    let processName = '';

    // Cas 1 : procOrEl est un objet déjà parsé (BpmnZeebeParser ou bpmnBatch)
    if (procOrEl.variables && Array.isArray(procOrEl.variables)) {
      processId = procOrEl.processId || procOrEl.id || '';
      processName = procOrEl.processName || procOrEl.name || processId;

      procOrEl.variables.forEach(v => {
        if (!v || !v.name) return;
        if (v.role === 'producer') produced.add(v.name);
        else if (v.role === 'consumer') consumed.add(v.name);
      });
    } else {
      // Cas 2 : procOrEl est un élément DOM (<bpmn:process> ou <bpmn:subProcess>)
      const el = procOrEl;
      processId = getAttr(el, 'id');
      processName = getAttr(el, 'name') || processId;

      // 1. Outputs & Variables produites
      // Zeebe ioMapping outputs
      const outputs = getDescendants(el, 'output');
      outputs.forEach(out => {
        const tgt = getAttr(out, 'target');
        if (tgt) produced.add(tgt);
      });

      // Scripts
      const scripts = getDescendants(el, 'script');
      scripts.forEach(sc => {
        const resVar = getAttr(sc, 'resultVariable', 'camunda:resultVariable');
        if (resVar) produced.add(resVar);
      });
      // Tâches avec script direct ou attribut resultVariable
      const tasksWithRes = getDescendants(el, 'scripttask', 'servicetask', 'businessruletask');
      tasksWithRes.forEach(t => {
        const rVar = getAttr(t, 'resultVariable', 'camunda:resultVariable');
        if (rVar) produced.add(rVar);
      });

      // Multi-Instance outputs
      const multiInstances = getDescendants(el, 'multiInstanceLoopCharacteristics');
      multiInstances.forEach(mi => {
        const elemVar = getAttr(mi, 'inputElement', 'camunda:elementVariable');
        if (elemVar) produced.add(elemVar);
        const outColl = getAttr(mi, 'outputCollection');
        if (outColl) produced.add(outColl);
        const zeebeLoop = getZeebeExtension(mi, 'loopCharacteristics');
        if (zeebeLoop) {
          const zElem = getAttr(zeebeLoop, 'inputElement');
          if (zElem) produced.add(zElem);
          const zOut = getAttr(zeebeLoop, 'outputCollection');
          if (zOut) produced.add(zOut);
        }
      });

      // Call Activities outputs
      const callActs = getDescendants(el, 'callactivity');
      callActs.forEach(ca => {
        const caOutputs = getDescendants(ca, 'output', 'out');
        caOutputs.forEach(cout => {
          const tgt = getAttr(cout, 'target', 'name');
          if (tgt) produced.add(tgt);
        });
      });

      // 2. Inputs & Variables consommées
      // Zeebe ioMapping inputs
      const inputs = getDescendants(el, 'input');
      inputs.forEach(inp => {
        const src = getAttr(inp, 'source');
        if (src) {
          extractFeelVariables(src).forEach(v => consumed.add(v));
        }
      });

      // Script expressions
      scripts.forEach(sc => {
        const expr = getAttr(sc, 'expression') || (sc.textContent || '').trim();
        if (expr) {
          extractFeelVariables(expr).forEach(v => consumed.add(v));
        }
      });

      // Sequence flows conditions
      const condExprs = getDescendants(el, 'conditionexpression');
      condExprs.forEach(c => {
        const expr = (c.textContent || '').trim() || getAttr(c, 'body');
        if (expr) {
          extractFeelVariables(expr).forEach(v => consumed.add(v));
        }
      });

      // Multi-instance input collection
      multiInstances.forEach(mi => {
        const inColl = getAttr(mi, 'collection', 'camunda:collection');
        if (inColl) extractFeelVariables(inColl).forEach(v => consumed.add(v));
        const zeebeLoop = getZeebeExtension(mi, 'loopCharacteristics');
        if (zeebeLoop) {
          const zIn = getAttr(zeebeLoop, 'inputCollection');
          if (zIn) extractFeelVariables(zIn).forEach(v => consumed.add(v));
        }
      });
    }

    // Exclusion des variables techniques de migration et pseudo-mots réservés
    const technicalVars = new Set(['migration_loop', 'old_migration', 'migration', 'loopCounter', 'now', 'today']);

    const requiredInputs = [];
    consumed.forEach(v => {
      if (!produced.has(v) && !technicalVars.has(v)) {
        requiredInputs.push(v);
      }
    });

    return {
      processId,
      processName,
      requiredInputs,
      producedVariables: Array.from(produced),
      consumedVariables: Array.from(consumed)
    };
  }

  // =========================================================================
  // 6. API Publique du Module
  // =========================================================================

  return {
    NS,
    FEEL_RESERVED_WORDS,
    getLocalName,
    getNamespaceURI,
    getAttr,
    getDirectChildren,
    getDescendants,
    getExtensionElements,
    getZeebeExtension,
    getAllZeebeExtensions,
    extractFeelVariables,
    getProcessContract,
    parseDocument
  };
});
