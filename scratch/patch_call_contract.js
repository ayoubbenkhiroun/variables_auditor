const fs = require('fs');
const path = require('path');

const bpmnParserPath = path.join(__dirname, '..', 'js', 'bpmn_parser.js');
let code = fs.readFileSync(bpmnParserPath, 'utf8');

// 1. Add root export
if (!code.includes('root.bpmnGetProcessContract')) {
  code = code.replace(
    'root.bpmnExtractFeelVariables = parser.extractFeelVariables;',
    'root.bpmnExtractFeelVariables = parser.extractFeelVariables;\r\n    root.bpmnGetProcessContract = parser.getProcessContract;'
  );
}

// 2. Add getProcessContract implementation before section 6
const contractFn = `
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
`;

if (!code.includes('function getProcessContract')) {
  // Try CRLF first, then LF
  if (code.includes('  // =========================================================================\r\n  // 6. API Publique du Module')) {
    code = code.replace(
      '  // =========================================================================\r\n  // 6. API Publique du Module',
      contractFn + '\r\n  // =========================================================================\r\n  // 6. API Publique du Module'
    );
  } else {
    code = code.replace(
      '  // =========================================================================\n  // 6. API Publique du Module',
      contractFn + '\n  // =========================================================================\n  // 6. API Publique du Module'
    );
  }
}

// 3. Export getProcessContract
if (!code.includes('getProcessContract,')) {
  code = code.replace(
    /extractFeelVariables,\s*parseDocument/,
    'extractFeelVariables,\r\n    getProcessContract,\r\n    parseDocument'
  );
}

fs.writeFileSync(bpmnParserPath, code, 'utf8');
console.log('bpmn_parser.js patched successfully');
