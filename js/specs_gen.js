/**
 * ==============================================================================
 * Bouygues Telecom - Paprika AuditFlow Pro
 * Module : Générateur de Dossiers de Spécifications & Living Documentation BPMN
 * Génération automatique de spécifications fonctionnelles et techniques
 * ==============================================================================
 */

(function() {
  'use strict';

  // État local du module Living Documentation
  let specsFiles = [];
  let currentSpecsDoc = null;
  let specsActiveTab = 'complete'; // 'complete', 'business', 'technical', 'lineage', 'gherkin', 'diagram'
  let specsSelectedProcessId = 'all';
  let specsSearchQuery = '';
  let specsActiveViewerInstance = null;
  let specsViewerActiveFile = null;

  function lintEsc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function specsDownload(content, filename, mimeType) {
    if (typeof window.dl === 'function') {
      window.dl(content, filename, mimeType);
      return;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Initialisation du module Living Documentation
   */
  function initSpecsGenModule() {
    // Si aucun fichier local n'est chargé, tenter de synchroniser avec les autres modules
    if (specsFiles.length === 0) {
      syncSpecsWithGlobalFiles(false);
    }
    if (specsFiles.length > 0) {
      generateLivingSpecs();
    } else {
      renderEmptySpecs();
    }
    setupSpecsDragAndDrop();
  }

  /**
   * Synchronisation automatique avec les fichiers chargés dans d'autres modules
   */
  function syncSpecsWithGlobalFiles(forceRender = true) {
    let importedCount = 0;
    const existingNames = new Set(specsFiles.map(f => f.name.toLowerCase()));

    // 1. Source : bpmnBatch (Module Audit Principal)
    if (typeof window.bpmnBatch !== 'undefined' && Array.isArray(window.bpmnBatch) && window.bpmnBatch.length > 0) {
      window.bpmnBatch.forEach(b => {
        const name = b.name || b.fileName || 'process.bpmn';
        if (!existingNames.has(name.toLowerCase()) && (b.doc || b.source)) {
          let doc = b.doc;
          if (!doc && b.source) {
            try { doc = new DOMParser().parseFromString(b.source, 'application/xml'); } catch (e) {}
          }
          specsFiles.push({ name, source: b.source || (doc ? new XMLSerializer().serializeToString(doc) : ''), xmlDoc: doc });
          existingNames.add(name.toLowerCase());
          importedCount++;
        }
      });
    }

    // 2. Source : bpmnLintFiles (Audit Santé BPMN)
    if (typeof window.bpmnLintFiles !== 'undefined' && Array.isArray(window.bpmnLintFiles) && window.bpmnLintFiles.length > 0) {
      window.bpmnLintFiles.forEach(f => {
        const name = f.fileName || 'process.bpmn';
        if (!existingNames.has(name.toLowerCase()) && (f.xmlDoc || f.source)) {
          let doc = f.xmlDoc;
          if (!doc && f.source) {
            try { doc = new DOMParser().parseFromString(f.source, 'application/xml'); } catch (e) {}
          }
          specsFiles.push({ name, source: f.source || (doc ? new XMLSerializer().serializeToString(doc) : ''), xmlDoc: doc });
          existingNames.add(name.toLowerCase());
          importedCount++;
        }
      });
    }

    // 3. Source : pmgState / allPmgProcesses (Module PMG)
    if (typeof window.allPmgProcesses !== 'undefined' && Array.isArray(window.allPmgProcesses) && window.allPmgProcesses.length > 0) {
      window.allPmgProcesses.forEach(p => {
        const name = p.fileName || `${p.processId || 'process'}.bpmn`;
        if (!existingNames.has(name.toLowerCase()) && (p.xmlDoc || p.xmlSource)) {
          let doc = p.xmlDoc;
          if (!doc && p.xmlSource) {
            try { doc = new DOMParser().parseFromString(p.xmlSource, 'application/xml'); } catch (e) {}
          }
          specsFiles.push({ name, source: p.xmlSource || (doc ? new XMLSerializer().serializeToString(doc) : ''), xmlDoc: doc });
          existingNames.add(name.toLowerCase());
          importedCount++;
        }
      });
    }

    // 4. Source : bpmnXmlDoc (Fichier unique racine)
    if (typeof window.bpmnXmlDoc !== 'undefined' && window.bpmnXmlDoc) {
      const name = window.bpmnFileName || 'Processus_Principal.bpmn';
      if (!existingNames.has(name.toLowerCase())) {
        specsFiles.push({ name, source: window.bpmnRawXml || new XMLSerializer().serializeToString(window.bpmnXmlDoc), xmlDoc: window.bpmnXmlDoc });
        existingNames.add(name.toLowerCase());
        importedCount++;
      }
    }

    if (forceRender) {
      if (specsFiles.length > 0) {
        generateLivingSpecs();
        if (typeof window.showNotification === 'function') {
          window.showNotification(`🔄 Synchronisation réussie : ${specsFiles.length} fichier(s) BPMN prêts pour la documentation.`, 'success');
        }
      } else {
        alert('Aucun fichier BPMN n’est actuellement chargé dans les autres modules. Veuillez déposer des fichiers BPMN ci-dessous.');
      }
    }
  }

  /**
   * Configuration de la zone de glisser-déposer
   */
  function setupSpecsDragAndDrop() {
    const dropZone = document.getElementById('specsDropZone');
    const fileInput = document.getElementById('specsFileInput');

    if (dropZone && !dropZone.dataset.bound) {
      dropZone.dataset.bound = 'true';
      dropZone.addEventListener('click', (e) => {
        if (fileInput && (e.target === dropZone || e.target.closest('.specs-drop-cta'))) {
          fileInput.click();
        }
      });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addSpecsFiles(e.dataTransfer.files);
        }
      });
    }

    if (fileInput && !fileInput.dataset.bound) {
      fileInput.dataset.bound = 'true';
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          addSpecsFiles(e.target.files);
          e.target.value = '';
        }
      });
    }
  }

  /**
   * Ajout de nouveaux fichiers BPMN dans le module
   */
  async function addSpecsFiles(fileList) {
    const files = Array.from(fileList || []);
    let loaded = 0;

    for (const file of files) {
      if (!/\.(bpmn|xml)$/i.test(file.name)) continue;
      const text = await file.text();
      try {
        const xmlDoc = new DOMParser().parseFromString(text, 'application/xml');
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          console.warn(`Erreur XML dans le fichier ${file.name}:`, parseError.textContent);
        }
        // Remplacer si déjà existant
        const existingIdx = specsFiles.findIndex(f => f.name.toLowerCase() === file.name.toLowerCase());
        if (existingIdx >= 0) {
          specsFiles[existingIdx] = { name: file.name, source: text, xmlDoc: parseError ? null : xmlDoc };
        } else {
          specsFiles.push({ name: file.name, source: text, xmlDoc: parseError ? null : xmlDoc });
        }
        loaded++;
      } catch (err) {
        console.error(`Impossible de lire le fichier ${file.name}:`, err);
      }
    }

    if (loaded > 0) {
      generateLivingSpecs();
    }
  }

  function removeSpecsFile(index) {
    if (specsFiles[index]) {
      specsFiles.splice(index, 1);
      if (specsFiles.length > 0) {
        generateLivingSpecs();
      } else {
        currentSpecsDoc = null;
        renderEmptySpecs();
      }
    }
  }

  function clearSpecsFiles() {
    if (confirm('Voulez-vous réinitialiser tous les fichiers de la documentation vivante ?')) {
      specsFiles = [];
      currentSpecsDoc = null;
      renderEmptySpecs();
    }
  }

  /**
   * Chargement de la suite de démonstration Bouygues Telecom
   */
  function loadSpecsDemoSuite() {
    if (typeof window.loadPmgDemoBpmnSuite === 'function') {
      window.loadPmgDemoBpmnSuite();
      syncSpecsWithGlobalFiles(true);
      return;
    }

    // Suite de démo intégrée
    const parentBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" id="Def_Demo_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="Part_Commande" name="Direction Relation Client &amp; Ventes" processRef="Process_Commande_Bouygues" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Commande_Bouygues" name="Parcours Souscription Offre Bbox &amp; Mobile" isExecutable="true">
    <bpmn:documentation>Processus d'orchestration de la commande client avec vérification d'éligibilité, scoring risque, facturation et activation SIM/Box.</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_Conseiller" name="Conseiller Commercial (Front-Office)">
        <bpmn:flowNodeRef>Start_Demande</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Saisie_Panier</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Validation_Risque</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Automate" name="Système d'Information &amp; Facturation">
        <bpmn:flowNodeRef>Task_Paiement_CB</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Call_Expedition</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>End_Succes</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_Demande" name="Demande de souscription reçue">
      <bpmn:documentation>Déclenchement lors de la validation du panier par le client sur le portail web ou en boutique.</bpmn:documentation>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_Saisie_Panier" name="Vérifier pièces justificatives &amp; éligibilité" camunda:candidateGroups="Gestionnaires_ADV" camunda:formKey="form_verification_panier">
      <bpmn:documentation>Contrôle de la pièce d'identité (CNI/Passeport), du justificatif de domicile et du RIO en cas de portabilité.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="= raw_panier_payload" target="panierData" />
          <zeebe:output source="= client_valide" target="isClientEligible" />
          <zeebe:output source="= order_id" target="orderId" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:callActivity id="Call_Validation_Risque" name="Évaluer Risque &amp; Solvabilité (IA)" calledElement="Process_Scoring_Risque">
      <bpmn:documentation>Appel du sous-processus d'évaluation du risque financier et de prévention des fraudes.</bpmn:documentation>
      <bpmn:extensionElements>
        <camunda:in source="orderId" target="subOrderId" />
        <camunda:out source="riskScore" target="globalRiskScore" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:serviceTask id="Task_Paiement_CB" name="Débiter Premier Mois &amp; Caution">
      <bpmn:documentation>Prélèvement bancaire sécurisé via passerelle monétique PCI-DSS.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="payment-service-worker" retries="3" />
        <zeebe:ioMapping>
          <zeebe:input source="= orderId" target="paymentRef" />
          <zeebe:input source="= montantTTC" target="amount" />
          <zeebe:output source="= transaction_id" target="transactionId" />
          <zeebe:output source="= payment_status" target="paymentStatus" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:callActivity id="Call_Expedition" name="Préparer &amp; Expédier Colis Équipement" calledElement="Process_Logistique_Colis">
      <bpmn:documentation>Orchestration de la préparation en entrepôt et de la remise au transporteur (Chronopost/Colissimo).</bpmn:documentation>
      <bpmn:extensionElements>
        <camunda:in source="orderId" target="shippingOrderId" />
        <camunda:out source="trackingNumber" target="trackingCode" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:endEvent id="End_Succes" name="Ligne &amp; Équipement Actifs">
      <bpmn:documentation>Souscription finalisée, email de confirmation et dossier archivé dans le CRM.</bpmn:documentation>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="Start_Demande" targetRef="Task_Saisie_Panier" />
    <bpmn:sequenceFlow id="f2" sourceRef="Task_Saisie_Panier" targetRef="Call_Validation_Risque" />
    <bpmn:sequenceFlow id="f3" sourceRef="Call_Validation_Risque" targetRef="Task_Paiement_CB" />
    <bpmn:sequenceFlow id="f4" sourceRef="Task_Paiement_CB" targetRef="Call_Expedition" />
    <bpmn:sequenceFlow id="f5" sourceRef="Call_Expedition" targetRef="End_Succes" />
  </bpmn:process>
</bpmn:definitions>`;

    const subRiskBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:zeebe="http://camunda.org/schema/1.0/zeebe" id="Def_Demo_2" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Scoring_Risque" name="Contrôle Solvabilité &amp; Fraude Prédictive" isExecutable="true">
    <bpmn:documentation>Sous-processus de vérification de l'encours impayé, scoring préventif et interrogation du fichier Préventel.</bpmn:documentation>
    <bpmn:startEvent id="Start_Risk" name="Demande de scoring" />
    <bpmn:serviceTask id="Task_Interroger_Preventel" name="Interroger Annuaire Préventel">
      <bpmn:documentation>Vérification des antécédents d'impayés sur le GIE Préventel.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="preventel-api-client" retries="2" />
        <zeebe:ioMapping>
          <zeebe:input source="= clientSiren" target="siren" />
          <zeebe:output source="= preventel_status" target="preventelStatus" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:businessRuleTask id="Task_Regle_Decision" name="Calculer Niveau de Garantie DMN" camunda:decisionRef="DMN_Matrice_Caution">
      <bpmn:documentation>Table de décision DMN déterminant le montant de la caution demandée selon le scoring.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:calledDecision decisionId="DMN_Matrice_Caution" resultVariable="montantCaution" />
      </bpmn:extensionElements>
    </bpmn:businessRuleTask>
    <bpmn:endEvent id="End_Risk" name="Scoring Clôturé" />
    <bpmn:sequenceFlow id="rf1" sourceRef="Start_Risk" targetRef="Task_Interroger_Preventel" />
    <bpmn:sequenceFlow id="rf2" sourceRef="Task_Interroger_Preventel" targetRef="Task_Regle_Decision" />
    <bpmn:sequenceFlow id="rf3" sourceRef="Task_Regle_Decision" targetRef="End_Risk" />
  </bpmn:process>
</bpmn:definitions>`;

    const parser = new DOMParser();
    specsFiles = [
      { name: '01_Souscription_Bbox_Mobile.bpmn', source: parentBpmn, xmlDoc: parser.parseFromString(parentBpmn, 'application/xml') },
      { name: '02_Controle_Solvabilite_Risque.bpmn', source: subRiskBpmn, xmlDoc: parser.parseFromString(subRiskBpmn, 'application/xml') }
    ];

    generateLivingSpecs();
  }

  /**
   * Analyse sémantique et génération du modèle complet de spécifications
   */
  function generateLivingSpecs() {
    if (!specsFiles || specsFiles.length === 0) {
      renderEmptySpecs();
      return;
    }

    const docModel = {
      title: 'Dossier de Spécifications Techniques & Living Documentation BPMN',
      client: 'Bouygues Telecom',
      organization: 'Direction des Systèmes d’Information & Architecture des Processus',
      author: 'Paprika AuditFlow Pro - Moteur de Living Documentation',
      generatedAt: new Date().toLocaleString('fr-FR'),
      version: '2.4.0-PROD',
      stats: {
        processCount: 0,
        totalSteps: 0,
        serviceTasks: 0,
        userTasks: 0,
        scriptTasks: 0,
        ruleTasks: 0,
        gateways: 0,
        events: 0,
        callActivities: 0,
        distinctVariables: 0,
        lanesCount: 0
      },
      variableDictionary: {}, // varName -> { producedBy: [], consumedBy: [], types: [] }
      processes: []
    };

    const allVariablesSet = new Set();

    specsFiles.forEach((fileItem, fIdx) => {
      const doc = fileItem.xmlDoc;
      if (!doc) return;

      const processes = Array.from(doc.querySelectorAll('process, bpmn\\:process'));
      if (processes.length === 0) return;

      processes.forEach((procElem, pIdx) => {
        const procId = procElem.getAttribute('id') || `Process_${fIdx + 1}_${pIdx + 1}`;
        const procName = procElem.getAttribute('name') || fileItem.name.replace(/\.(bpmn|xml)$/i, '') || procId;
        const isExecutable = procElem.getAttribute('isExecutable') === 'true';
        const procDoc = procElem.querySelector(':scope > documentation, :scope > bpmn\\:documentation')?.textContent?.trim() || 'Aucune description générale documentée pour ce processus.';

        // Extraction des Couloirs (Lanes) et Acteurs
        const lanes = [];
        const laneElements = procElem.querySelectorAll('lane, bpmn\\:lane');
        const nodeToLaneMap = new Map();

        laneElements.forEach(l => {
          const laneId = l.getAttribute('id') || '';
          const laneName = l.getAttribute('name') || 'Acteur non nommé';
          lanes.push({ id: laneId, name: laneName });

          l.querySelectorAll('flowNodeRef, bpmn\\:flowNodeRef').forEach(fn => {
            const nodeId = fn.textContent?.trim();
            if (nodeId) nodeToLaneMap.set(nodeId, laneName);
          });
        });

        // Extraction ordonnée des étapes
        const stepSelector = 'startEvent, bpmn\\:startEvent, endEvent, bpmn\\:endEvent, task, bpmn\\:task, serviceTask, bpmn\\:serviceTask, userTask, bpmn\\:userTask, sendTask, bpmn\\:sendTask, receiveTask, bpmn\\:receiveTask, scriptTask, bpmn\\:scriptTask, businessRuleTask, bpmn\\:businessRuleTask, callActivity, bpmn\\:callActivity, exclusiveGateway, bpmn\\:exclusiveGateway, parallelGateway, bpmn\\:parallelGateway, inclusiveGateway, bpmn\\:inclusiveGateway, eventBasedGateway, bpmn\\:eventBasedGateway, intermediateCatchEvent, bpmn\\:intermediateCatchEvent, intermediateThrowEvent, bpmn\\:intermediateThrowEvent, boundaryEvent, bpmn\\:boundaryEvent, subProcess, bpmn\\:subProcess';

        const rawElements = Array.from(procElem.querySelectorAll(stepSelector)).filter(el => {
          if (el.prefix === 'zeebe' || el.prefix === 'camunda' || el.prefix === 'modeler') return false;
          let p = el.parentElement;
          while (p && p !== procElem && p.nodeType === 1) {
            const pLn = (p.localName || '').toLowerCase();
            if (pLn === 'extensionelements' || pLn === 'extension_elements') return false;
            p = p.parentElement;
          }
          return true;
        });
        const steps = [];

        rawElements.forEach((el, elIdx) => {
          const rawTag = (el.localName || el.tagName || '').replace(/^bpmn:/i, '');
          const elId = el.getAttribute('id') || `Step_${elIdx + 1}`;
          const elName = el.getAttribute('name') || elId;
          const elDoc = el.querySelector(':scope > documentation, :scope > bpmn\\:documentation')?.textContent?.trim() || '';
          const assignedLane = nodeToLaneMap.get(elId) || 'Non spécifié';

          // Variables I/O Mappings
          const inputs = [];
          const outputs = [];

          // Zeebe IO Mapping
          el.querySelectorAll('zeebe\\:input, input').forEach(inp => {
            const src = inp.getAttribute('source') || inp.textContent?.trim() || '';
            const tgt = inp.getAttribute('target') || inp.getAttribute('name') || '';
            if (src || tgt) {
              inputs.push({ source: src, target: tgt });
              if (src && !src.startsWith('=')) allVariablesSet.add(src);
              if (tgt) allVariablesSet.add(tgt);
            }
          });

          el.querySelectorAll('zeebe\\:output, output').forEach(out => {
            const src = out.getAttribute('source') || out.textContent?.trim() || '';
            const tgt = out.getAttribute('target') || out.getAttribute('name') || '';
            if (src || tgt) {
              outputs.push({ source: src, target: tgt });
              if (tgt) allVariablesSet.add(tgt);
            }
          });

          // Camunda 7 inputOutput
          el.querySelectorAll('camunda\\:inputParameter').forEach(inp => {
            const name = inp.getAttribute('name') || '';
            const val = inp.textContent?.trim() || '';
            inputs.push({ source: val, target: name });
            if (name) allVariablesSet.add(name);
          });

          el.querySelectorAll('camunda\\:outputParameter').forEach(out => {
            const name = out.getAttribute('name') || '';
            const val = out.textContent?.trim() || '';
            outputs.push({ source: val, target: name });
            if (name) allVariablesSet.add(name);
          });

          // Camunda in/out for Call Activities
          el.querySelectorAll('camunda\\:in, camunda\\:out').forEach(io => {
            const isOut = io.tagName.includes('out');
            const src = io.getAttribute('source') || '';
            const tgt = io.getAttribute('target') || '';
            if (isOut) {
              outputs.push({ source: src, target: tgt });
            } else {
              inputs.push({ source: src, target: tgt });
            }
            if (src) allVariablesSet.add(src);
            if (tgt) allVariablesSet.add(tgt);
          });

          // Données techniques spécifiques
          const technicalMeta = {};

          // User Tasks
          if (rawTag.toLowerCase().includes('usertask')) {
            technicalMeta.formKey = el.getAttribute('camunda:formKey') || el.getAttribute('formKey') || el.querySelector('zeebe\\:formDefinition')?.getAttribute('formKey') || 'Formulaire Camunda Form Designer';
            technicalMeta.candidateGroups = el.getAttribute('camunda:candidateGroups') || el.getAttribute('candidateGroups') || 'Rôle standard';
            technicalMeta.assignee = el.getAttribute('camunda:assignee') || el.getAttribute('assignee') || '';
            technicalMeta.priority = el.getAttribute('camunda:priority') || '50 (Normal)';
            docModel.stats.userTasks++;
          }

          // Service Tasks / Send Tasks / Receive Tasks
          else if (['servicetask', 'sendtask', 'receivetask'].includes(rawTag.toLowerCase())) {
            technicalMeta.jobType = el.querySelector('zeebe\\:taskDefinition')?.getAttribute('type') || el.getAttribute('camunda:topic') || el.getAttribute('camunda:class') || el.getAttribute('camunda:delegateExpression') || 'Worker API / Service';
            technicalMeta.retries = el.querySelector('zeebe\\:taskDefinition')?.getAttribute('retries') || '3';
            docModel.stats.serviceTasks++;
          }

          // Script Tasks
          else if (rawTag.toLowerCase().includes('scripttask')) {
            const scriptEl = el.querySelector('script, bpmn\\:script');
            technicalMeta.scriptFormat = el.getAttribute('scriptFormat') || 'FEEL / JavaScript';
            technicalMeta.scriptBody = scriptEl?.textContent?.trim() || '// Script interne';
            docModel.stats.scriptTasks++;
          }

          // Business Rule Tasks (DMN)
          else if (rawTag.toLowerCase().includes('businessruletask')) {
            technicalMeta.decisionRef = el.getAttribute('camunda:decisionRef') || el.querySelector('zeebe\\:calledDecision')?.getAttribute('decisionId') || 'DMN_Table';
            technicalMeta.resultVariable = el.getAttribute('camunda:resultVariable') || el.querySelector('zeebe\\:calledDecision')?.getAttribute('resultVariable') || 'decisionResult';
            docModel.stats.ruleTasks++;
          }

          // Call Activities
          else if (rawTag.toLowerCase().includes('callactivity')) {
            technicalMeta.calledElement = el.getAttribute('calledElement') || el.querySelector('zeebe\\:calledElement')?.getAttribute('processId') || 'Processus_Externe';
            docModel.stats.callActivities++;
          }

          // Gateways
          else if (rawTag.toLowerCase().includes('gateway')) {
            docModel.stats.gateways++;
          }

          // Events
          else if (rawTag.toLowerCase().includes('event')) {
            docModel.stats.events++;
          }

          const stepObj = {
            index: elIdx + 1,
            id: elId,
            name: elName,
            rawType: rawTag,
            typeFormatted: formatBpmnType(rawTag),
            lane: assignedLane,
            documentation: elDoc || 'Aucune description rédigée dans le BPMN.',
            inputs: inputs,
            outputs: outputs,
            technicalMeta: technicalMeta
          };

          steps.push(stepObj);

          // Remplir le dictionnaire de variables
          inputs.forEach(inp => {
            const varName = inp.target || inp.source;
            if (varName && !varName.startsWith('=')) {
              if (!docModel.variableDictionary[varName]) {
                docModel.variableDictionary[varName] = { producedBy: [], consumedBy: [], description: '' };
              }
              docModel.variableDictionary[varName].consumedBy.push({ procName, stepName: elName, stepId: elId });
            }
          });

          outputs.forEach(out => {
            const varName = out.target || out.source;
            if (varName && !varName.startsWith('=')) {
              if (!docModel.variableDictionary[varName]) {
                docModel.variableDictionary[varName] = { producedBy: [], consumedBy: [], description: '' };
              }
              docModel.variableDictionary[varName].producedBy.push({ procName, stepName: elName, stepId: elId });
            }
          });
        });

        docModel.stats.totalSteps += steps.length;
        docModel.stats.lanesCount += lanes.length;

        docModel.processes.push({
          id: procId,
          name: procName,
          fileName: fileItem.name,
          sourceXml: fileItem.source,
          isExecutable: isExecutable,
          documentation: procDoc,
          lanes: lanes,
          stepsCount: steps.length,
          steps: steps
        });
      });
    });

    docModel.stats.processCount = docModel.processes.length;
    docModel.stats.distinctVariables = Object.keys(docModel.variableDictionary).length;

    currentSpecsDoc = docModel;
    renderSpecsView();
  }

  function formatBpmnType(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('startevent')) return 'Événement de Début';
    if (t.includes('endevent')) return 'Événement de Fin';
    if (t.includes('servicetask')) return 'Tâche de Service (Worker/API)';
    if (t.includes('usertask')) return 'Tâche Utilisateur (IHM/Formulaire)';
    if (t.includes('scripttask')) return 'Tâche de Script (Calcul/FEEL)';
    if (t.includes('businessruletask')) return 'Règle Métier DMN';
    if (t.includes('sendtask')) return 'Tâche d’Envoi (Message/Kafka)';
    if (t.includes('receivetask')) return 'Tâche de Réception';
    if (t.includes('callactivity')) return 'Appel de Sous-Processus';
    if (t.includes('exclusivegateway')) return 'Passerelle Exclusive (XOR)';
    if (t.includes('parallelgateway')) return 'Passerelle Parallèle (AND)';
    if (t.includes('inclusivegateway')) return 'Passerelle Inclusive (OR)';
    if (t.includes('eventbasedgateway')) return 'Passerelle Événementielle';
    if (t.includes('intermediatecatchevent')) return 'Événement Intermédiaire (Attente)';
    if (t.includes('intermediatethrowevent')) return 'Événement Intermédiaire (Émission)';
    if (t.includes('boundaryevent')) return 'Événement de Bordure (Exception)';
    if (t.includes('subprocess')) return 'Sous-Processus Embarqué';
    return type || 'Activité';
  }

  function getBpmnIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('startevent')) return '🟢';
    if (t.includes('endevent')) return '🔴';
    if (t.includes('servicetask')) return '⚙️';
    if (t.includes('usertask')) return '👤';
    if (t.includes('scripttask')) return '📜';
    if (t.includes('businessruletask')) return '📐';
    if (t.includes('sendtask')) return '📤';
    if (t.includes('receivetask')) return '📥';
    if (t.includes('callactivity')) return '🔄';
    if (t.includes('exclusivegateway')) return '🔀';
    if (t.includes('parallelgateway')) return '➕';
    if (t.includes('inclusivegateway')) return '🔂';
    if (t.includes('boundaryevent')) return '⚡';
    if (t.includes('subprocess')) return '📦';
    return '📌';
  }

  /**
   * Rendu de l'état vide
   */
  function renderEmptySpecs() {
    const container = document.getElementById('specsContentArea');
    if (!container) return;

    container.innerHTML = `
      <div class="specs-document-wrapper">
        <!-- Hero Header -->
        <div class="specs-header-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div>
              <div class="header-status-badge" style="margin-bottom:8px;">
                <span class="pulse-dot"></span>
                <span>LIVING DOCUMENTATION &bull; BOUYGUES TELECOM</span>
              </div>
              <h2 style="font-size:24px; font-weight:800; color:var(--brand-primary); margin:0 0 6px 0;">
                Dossier de Spécifications Techniques &amp; Living Documentation BPMN
              </h2>
              <p style="font-size:13px; color:var(--text-secondary); margin:0;">
                Génération automatique de spécifications fonctionnelles vivantes, contrats d’API et scénarios BDD Gherkin.
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost" onclick="syncSpecsWithGlobalFiles(true)" title="Récupérer les BPMN ouverts dans d'autres onglets">
                🔄 Synchroniser Session
              </button>
              <button class="btn-primary" onclick="loadSpecsDemoSuite()" style="background:linear-gradient(135deg, #009CD7, #003882);">
                ✨ Charger Démo Multi-BPMN
              </button>
            </div>
          </div>
        </div>

        <!-- Zone de Dépôt de Fichiers BPMN -->
        <div class="specs-dropzone-card" id="specsDropZone" style="margin-top:16px;">
          <input type="file" id="specsFileInput" accept=".bpmn,.xml" multiple style="display:none;">
          <div class="specs-drop-cta">
            <div class="specs-drop-icon">📂</div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin:8px 0 4px;">
              Glissez-déposez vos fichiers BPMN (.bpmn, .xml) ici
            </h3>
            <p style="font-size:12.5px; color:var(--text-secondary); margin:0 0 14px;">
              Ou cliquez pour parcourir vos dossiers et sélectionner un ou plusieurs diagrammes BPMN.
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="btn-primary" onclick="document.getElementById('specsFileInput').click()">
                Parcourir les fichiers
              </button>
              <button class="btn-ghost" onclick="loadSpecsDemoSuite()">
                ✨ Charger le jeu d’essai
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    setupSpecsDragAndDrop();
  }

  /**
   * Rendu principal de la vue Living Documentation
   */
  function renderSpecsView() {
    const container = document.getElementById('specsContentArea');
    if (!container || !currentSpecsDoc) return;

    const stats = currentSpecsDoc.stats;
    const activeProcesses = currentSpecsDoc.processes.filter(p => specsSelectedProcessId === 'all' || p.id === specsSelectedProcessId);

    let html = `
      <div class="specs-document-wrapper">
        
        <!-- Cartouche Officiel Bouygues Telecom -->
        <div class="specs-header-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div>
              <div class="header-status-badge" style="margin-bottom:8px;">
                <span class="pulse-dot"></span>
                <span>LIVING DOCUMENTATION &bull; BOUYGUES TELECOM</span>
              </div>
              <h2 style="font-size:24px; font-weight:800; color:var(--brand-primary); margin:0 0 6px 0;">
                ${lintEsc(currentSpecsDoc.title)}
              </h2>
              <p style="font-size:13px; color:var(--text-secondary); margin:0;">
                Généré automatiquement le <strong>${lintEsc(currentSpecsDoc.generatedAt)}</strong> &bull; <strong>${currentSpecsDoc.stats.processCount} processus</strong> analysés
              </p>
            </div>

            <!-- Boutons d'Action & Exports -->
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn-ghost" onclick="document.getElementById('specsFileInputAdd').click()" title="Ajouter des BPMN au dossier">
                ➕ Ajouter BPMN
              </button>
              <input type="file" id="specsFileInputAdd" accept=".bpmn,.xml" multiple style="display:none;" onchange="addSpecsFiles(this.files)">
              
              <button class="btn-ghost" onclick="syncSpecsWithGlobalFiles(true)" title="Synchroniser avec les autres modules">
                🔄 Synchro
              </button>
              
              <div class="specs-export-dropdown-wrap">
                <button class="btn-primary" onclick="toggleSpecsExportMenu()" id="btnSpecsExportMain">
                  📥 Exporter la Documentation ▾
                </button>
                <div class="specs-export-menu" id="specsExportDropdownMenu" style="display:none;">
                  <a href="javascript:void(0)" onclick="exportSpecsMarkdown()">📝 Markdown GFM (.md)</a>
                  <a href="javascript:void(0)" onclick="exportSpecsHtmlStandalone()">🌐 Page HTML Autonome (.html)</a>
                  <a href="javascript:void(0)" onclick="exportSpecsExcel()">📊 Classeur Excel Multi-onglets (.xlsx)</a>
                  <a href="javascript:void(0)" onclick="exportSpecsGherkin()">🥒 Scénarios BDD Gherkin (.feature)</a>
                  <a href="javascript:void(0)" onclick="exportSpecsJson()">💾 Schéma JSON Technique (.json)</a>
                  <a href="javascript:void(0)" onclick="printSpecsReport()">🖨️ Imprimer / PDF</a>
                </div>
              </div>

              <button class="btn-ghost" onclick="clearSpecsFiles()" title="Vider et réinitialiser" style="color:var(--err);">
                🗑️
              </button>
            </div>
          </div>

          <!-- Liste des Fichiers Chargés -->
          <div class="specs-loaded-files-bar" style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border-color); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Fichiers Sources :</span>
            ${specsFiles.map((f, i) => `
              <span class="badge ok" style="font-size:11px; display:inline-flex; align-items:center; gap:5px; background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd;">
                📄 ${lintEsc(f.name)}
                <span onclick="event.stopPropagation(); removeSpecsFile(${i})" style="cursor:pointer; font-weight:800; margin-left:4px;" title="Retirer ce fichier">&times;</span>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Synthèse Chiffrée & KPIs Qualité -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
          <div class="kpi-card">
            <div class="kpi-title">Processus</div>
            <div class="kpi-value" style="color:var(--brand-primary);">${stats.processCount}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Activités</div>
            <div class="kpi-value">${stats.totalSteps}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Tâches Service/API</div>
            <div class="kpi-value" style="color:#0284c7;">${stats.serviceTasks}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Tâches Utilisateur</div>
            <div class="kpi-value" style="color:#059669;">${stats.userTasks}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Variables I/O Distinctes</div>
            <div class="kpi-value" style="color:#d97706;">${stats.distinctVariables}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Couloirs &amp; Rôles</div>
            <div class="kpi-value" style="color:#7c3aed;">${stats.lanesCount}</div>
          </div>
        </div>

        <!-- Barre de Navigation par Vues & Filtres Dynamiques -->
        <div class="specs-toolbar-card">
          <div class="specs-view-tabs">
            <button class="specs-tab-btn ${specsActiveTab === 'complete' ? 'active' : ''}" onclick="setSpecsActiveTab('complete')">
              📑 Dossier Global
            </button>
            <button class="specs-tab-btn ${specsActiveTab === 'business' ? 'active' : ''}" onclick="setSpecsActiveTab('business')">
              👔 Vue Métier &amp; MOA
            </button>
            <button class="specs-tab-btn ${specsActiveTab === 'technical' ? 'active' : ''}" onclick="setSpecsActiveTab('technical')">
              ⚙️ Vue Technique &amp; Camunda
            </button>
            <button class="specs-tab-btn ${specsActiveTab === 'lineage' ? 'active' : ''}" onclick="setSpecsActiveTab('lineage')">
              🔄 Matrice Données I/O (${stats.distinctVariables})
            </button>
            <button class="specs-tab-btn ${specsActiveTab === 'gherkin' ? 'active' : ''}" onclick="setSpecsActiveTab('gherkin')">
              🥒 Scénarios BDD Gherkin
            </button>
            <button class="specs-tab-btn ${specsActiveTab === 'diagram' ? 'active' : ''}" onclick="setSpecsActiveTab('diagram')">
              🗺️ Diagramme BPMN
            </button>
          </div>

          <div class="specs-filter-row" style="display:flex; gap:12px; margin-top:14px; flex-wrap:wrap; align-items:center;">
            <div style="flex:1; min-width:240px;">
              <input type="search" placeholder="🔍 Rechercher par mot-clé, variable, rôle, worker..." 
                     value="${lintEsc(specsSearchQuery)}" 
                     oninput="setSpecsSearchQuery(this.value)"
                     style="width:100%; height:36px; padding:0 12px; border:1px solid var(--border-color); border-radius:var(--border-radius-xs); font-size:12.5px;">
            </div>

            <div style="min-width:200px;">
              <select onchange="setSpecsProcessFilter(this.value)" style="width:100%; height:36px; border:1px solid var(--border-color); border-radius:var(--border-radius-xs); font-size:12.5px; padding:0 8px;">
                <option value="all" ${specsSelectedProcessId === 'all' ? 'selected' : ''}>📌 Tous les processus (${currentSpecsDoc.processes.length})</option>
                ${currentSpecsDoc.processes.map(p => `
                  <option value="${lintEsc(p.id)}" ${specsSelectedProcessId === p.id ? 'selected' : ''}>${lintEsc(p.name)}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Zone de Contenu Spécifique selon la Vue Active -->
        <div id="specsMainViewContainer">
          ${renderActiveSpecsContent(activeProcesses)}
        </div>

      </div>
    `;

    container.innerHTML = html;

    // Si l'onglet actif est le diagramme, initialiser BpmnJS
    if (specsActiveTab === 'diagram') {
      setTimeout(() => initSpecsDiagramViewer(activeProcesses[0] || currentSpecsDoc.processes[0]), 50);
    }
  }

  function setSpecsActiveTab(tabName) {
    specsActiveTab = tabName;
    renderSpecsView();
  }

  function setSpecsProcessFilter(procId) {
    specsSelectedProcessId = procId;
    renderSpecsView();
  }

  function setSpecsSearchQuery(query) {
    specsSearchQuery = query || '';
    renderSpecsView();
  }

  /**
   * Rendu du contenu selon l'onglet actif
   */
  function renderActiveSpecsContent(processes) {
    if (processes.length === 0) {
      return `<div class="empty-state"><p>Aucun processus ne correspond aux filtres sélectionnés.</p></div>`;
    }

    if (specsActiveTab === 'complete') {
      return renderCompleteSpecsView(processes);
    } else if (specsActiveTab === 'business') {
      return renderBusinessSpecsView(processes);
    } else if (specsActiveTab === 'technical') {
      return renderTechnicalSpecsView(processes);
    } else if (specsActiveTab === 'lineage') {
      return renderLineageMatrixView();
    } else if (specsActiveTab === 'gherkin') {
      return renderGherkinView(processes);
    } else if (specsActiveTab === 'diagram') {
      return renderDiagramView(processes);
    }
    return '';
  }

  /**
   * 1. Vue Dossier Complet & Exécutif
   */
  function renderCompleteSpecsView(processes) {
    return processes.map((proc, idx) => {
      const filteredSteps = filterSteps(proc.steps);

      return `
        <div class="specs-section-card" style="margin-top:20px;">
          <div class="specs-section-header">
            <span class="specs-section-num">${idx + 1}</span>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <h3 style="font-size:18px; font-weight:700; color:var(--text-primary); margin:0;">
                  ${lintEsc(proc.name)}
                </h3>
                <span class="badge ${proc.isExecutable ? 'ok' : 'warn'}" style="font-size:11px;">
                  ${proc.isExecutable ? '⚡ Processus Exécutable Camunda' : '📘 Processus Documentaire'}
                </span>
              </div>
              <span style="font-size:12px; color:var(--text-tertiary); font-family:var(--font-mono);">
                ID Technique : <code>${lintEsc(proc.id)}</code> &bull; Source : ${lintEsc(proc.fileName)} &bull; ${proc.steps.length} étapes
              </span>
            </div>
          </div>

          <!-- Description Générale du Processus -->
          <div class="specs-proc-desc-box" style="margin-top:14px; padding:12px 16px; background:#f8fafc; border-radius:var(--border-radius-sm); border-left:4px solid var(--brand-primary); font-size:13px; line-height:1.6; color:#334155;">
            <strong>🎯 Objectif &amp; Périmètre Fonctionnel :</strong><br>
            ${lintEsc(proc.documentation)}
          </div>

          <!-- Couloirs / Acteurs (Lanes) -->
          ${proc.lanes.length > 0 ? `
            <div style="margin-top:14px; padding:10px 14px; background:#fff; border:1px solid var(--border-color); border-radius:var(--border-radius-sm);">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary);">Acteurs &amp; Couloirs Responsables (Lanes) :</span>
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
                ${proc.lanes.map(l => `<span class="badge" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; font-size:11px;">👤 ${lintEsc(l.name)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Tableau Détaillé des Étapes -->
          <h4 style="font-size:14px; font-weight:700; color:var(--brand-primary); margin:22px 0 10px 0; text-transform:uppercase; letter-spacing:0.5px;">
            Chronologie Détaillée des Étapes &amp; Contrats d'Interface
          </h4>

          <div class="tbl-wrap">
            <table class="specs-table">
              <thead>
                <tr>
                  <th style="width:45px; text-align:center;">#</th>
                  <th style="width:24%;">Nom de l'étape &amp; Acteur</th>
                  <th style="width:18%;">Type BPMN</th>
                  <th style="width:26%;">Description &amp; Règles Métier</th>
                  <th style="width:16%;">Données Entrantes (In)</th>
                  <th style="width:16%;">Données Sortantes (Out)</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSteps.map(s => {
                  const inStr = s.inputs.map(i => `<div class="specs-var-tag in">&bull; ${lintEsc(i.target || i.source)}</div>`).join('') || '<span class="specs-muted-cell">—</span>';
                  const outStr = s.outputs.map(o => `<div class="specs-var-tag out">&bull; ${lintEsc(o.target || o.source)}</div>`).join('') || '<span class="specs-muted-cell">—</span>';
                  
                  return `
                    <tr>
                      <td style="font-weight:700; text-align:center; color:var(--text-tertiary);">${s.index}</td>
                      <td>
                        <strong style="color:var(--text-primary); font-size:13px;">${getBpmnIcon(s.rawType)} ${lintEsc(s.name)}</strong>
                        <div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">
                          <code>${lintEsc(s.id)}</code> &bull; 👤 ${lintEsc(s.lane)}
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155; font-size:10.5px;">
                          ${lintEsc(s.typeFormatted)}
                        </span>
                        ${s.technicalMeta.jobType ? `<div style="font-size:10px; color:#0284c7; font-family:var(--font-mono); margin-top:3px;">Worker: ${lintEsc(s.technicalMeta.jobType)}</div>` : ''}
                      </td>
                      <td style="font-size:12px; color:#475569; line-height:1.45;">
                        ${lintEsc(s.documentation)}
                      </td>
                      <td>${inStr}</td>
                      <td>${outStr}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 2. Vue Métier & Parcours MOA
   */
  function renderBusinessSpecsView(processes) {
    return processes.map(proc => {
      const filteredSteps = filterSteps(proc.steps);
      const userSteps = filteredSteps.filter(s => s.rawType.toLowerCase().includes('usertask') || s.rawType.toLowerCase().includes('startevent') || s.rawType.toLowerCase().includes('endevent'));

      return `
        <div class="specs-section-card" style="margin-top:20px;">
          <div class="specs-section-header">
            <span class="specs-section-num">👔</span>
            <div>
              <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">
                Spécifications Métier : ${lintEsc(proc.name)}
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                Focus sur les interventions humaines, écrans, rôles et règles de gestion opérationnelles.
              </p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-top:18px;">
            ${userSteps.map(s => `
              <div class="specs-biz-card" style="padding:16px; border:1px solid var(--border-color); border-radius:var(--border-radius-sm); background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <strong style="font-size:13.5px; color:var(--text-primary);">${getBpmnIcon(s.rawType)} ${lintEsc(s.name)}</strong>
                  <span class="badge ok" style="font-size:10px;">${lintEsc(s.lane)}</span>
                </div>
                <p style="font-size:12px; color:#475569; margin:0 0 10px; line-height:1.5;">
                  ${lintEsc(s.documentation)}
                </p>
                ${s.technicalMeta.formKey ? `
                  <div style="font-size:11px; background:#f0f9ff; color:#0369a1; padding:6px 10px; border-radius:4px; margin-bottom:8px;">
                    📝 Formulaire / Écran associé : <strong>${lintEsc(s.technicalMeta.formKey)}</strong>
                  </div>
                ` : ''}
                ${s.technicalMeta.candidateGroups ? `
                  <div style="font-size:11px; color:var(--text-secondary);">
                    👥 Groupe d'affectation : <strong>${lintEsc(s.technicalMeta.candidateGroups)}</strong>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 3. Vue Technique & Architecture Camunda
   */
  function renderTechnicalSpecsView(processes) {
    return processes.map(proc => {
      const filteredSteps = filterSteps(proc.steps);

      return `
        <div class="specs-section-card" style="margin-top:20px;">
          <div class="specs-section-header">
            <span class="specs-section-num">⚙️</span>
            <div>
              <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">
                Spécifications Techniques Camunda 7/8 : ${lintEsc(proc.name)}
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                Contrats d'interface, Topics Zeebe, Handlers Java, Mappings et expressions d'évaluation.
              </p>
            </div>
          </div>

          <div class="tbl-wrap" style="margin-top:16px;">
            <table class="specs-table">
              <thead>
                <tr>
                  <th style="width:25%;">Activité / ID</th>
                  <th style="width:20%;">Type &amp; Implémentation</th>
                  <th style="width:25%;">Topic Zeebe / Handler</th>
                  <th style="width:30%;">Contrat de Variables (I/O Mappings)</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSteps.map(s => `
                  <tr>
                    <td>
                      <strong>${getBpmnIcon(s.rawType)} ${lintEsc(s.name)}</strong>
                      <div style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono);">ID: ${lintEsc(s.id)}</div>
                    </td>
                    <td><span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px;">${lintEsc(s.rawType)}</span></td>
                    <td>
                      ${s.technicalMeta.jobType ? `<code>${lintEsc(s.technicalMeta.jobType)}</code> <small style="color:var(--text-tertiary);">(Retries: ${s.technicalMeta.retries || 3})</small>` : ''}
                      ${s.technicalMeta.decisionRef ? `<code>DMN: ${lintEsc(s.technicalMeta.decisionRef)}</code>` : ''}
                      ${s.technicalMeta.calledElement ? `<code>Appel: ${lintEsc(s.technicalMeta.calledElement)}</code>` : ''}
                      ${s.technicalMeta.scriptFormat ? `<div><small style="color:#0284c7;">Langage: ${lintEsc(s.technicalMeta.scriptFormat)}</small></div>` : ''}
                    </td>
                    <td>
                      ${s.inputs.length ? `<div style="font-size:11px; color:#0369a1;"><strong>Inputs :</strong> ${s.inputs.map(i => `${lintEsc(i.target)}=${lintEsc(i.source)}`).join(', ')}</div>` : ''}
                      ${s.outputs.length ? `<div style="font-size:11px; color:#15803d; margin-top:3px;"><strong>Outputs :</strong> ${s.outputs.map(o => `${lintEsc(o.target)}=${lintEsc(o.source)}`).join(', ')}</div>` : ''}
                      ${!s.inputs.length && !s.outputs.length ? '<span class="specs-muted-cell">Aucun mapping de variable</span>' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 4. Vue Matrice de Traçabilité des Données (Data Lineage)
   */
  function renderLineageMatrixView() {
    const dict = currentSpecsDoc.variableDictionary || {};
    const varNames = Object.keys(dict).sort();

    if (varNames.length === 0) {
      return `<div class="empty-state"><p>Aucune variable explicite n'a été détectée dans les mappings I/O des processus chargés.</p></div>`;
    }

    return `
      <div class="specs-section-card" style="margin-top:20px;">
        <div class="specs-section-header">
          <span class="specs-section-num">🔄</span>
          <div>
            <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">
              Matrice de Traçabilité &amp; Dictionnaire des Variables
            </h3>
            <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
              Cartographie des ${varNames.length} variables identifiées (Producteurs / Consommateurs).
            </p>
          </div>
        </div>

        <div class="tbl-wrap" style="margin-top:16px;">
          <table class="specs-table">
            <thead>
              <tr>
                <th style="width:22%;">Nom de la Variable</th>
                <th style="width:39%;">Produite / Écrite par (Outputs)</th>
                <th style="width:39%;">Consommée / Lue par (Inputs)</th>
              </tr>
            </thead>
            <tbody>
              ${varNames.map(name => {
                const item = dict[name];
                const prod = item.producedBy.map(p => `<div><strong>${lintEsc(p.stepName)}</strong> <small style="color:var(--text-tertiary);">(${lintEsc(p.procName)})</small></div>`).join('') || '<span class="specs-muted-cell">Variable transmise en amont (Payload d\'init)</span>';
                const cons = item.consumedBy.map(c => `<div><strong>${lintEsc(c.stepName)}</strong> <small style="color:var(--text-tertiary);">(${lintEsc(c.procName)})</small></div>`).join('') || '<span class="specs-muted-cell">Non consommée directement</span>';

                return `
                  <tr>
                    <td><code style="font-size:12px; font-weight:700; color:var(--brand-primary);">${lintEsc(name)}</code></td>
                    <td>${prod}</td>
                    <td>${cons}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * 5. Vue Scénarios BDD / Gherkin
   */
  function renderGherkinView(processes) {
    return processes.map(proc => {
      const gherkinText = generateGherkinForProcess(proc);

      return `
        <div class="specs-section-card" style="margin-top:20px;">
          <div class="specs-section-header">
            <span class="specs-section-num">🥒</span>
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
              <div>
                <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">
                  Scénarios BDD (Gherkin / Cucumber) : ${lintEsc(proc.name)}
                </h3>
                <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                  Spécifications exécutables par le comportement (Given - When - Then)
                </p>
              </div>
              <button class="btn-ghost" onclick="copyGherkinCode('${lintEsc(proc.id)}')" title="Copier le code Gherkin">
                📋 Copier Gherkin
              </button>
            </div>
          </div>

          <div style="margin-top:14px; background:#0f172a; border-radius:var(--border-radius-sm); padding:16px; overflow-x:auto;">
            <pre id="gherkin-code-${lintEsc(proc.id)}" style="margin:0; font-family:var(--font-mono); font-size:12.5px; color:#38bdf8; line-height:1.6;">${lintEsc(gherkinText)}</pre>
          </div>
        </div>
      `;
    }).join('');
  }

  function generateGherkinForProcess(proc) {
    let g = `Feature: Traitement du processus ${proc.name}\n`;
    g += `  En tant que gestionnaire ou client Bouygues Telecom\n`;
    g += `  Je souhaite exécuter le parcours ${proc.name}\n`;
    g += `  Afin de mener à bien l'opération de manière fluide et sécurisée.\n\n`;

    g += `  Scenario: Parcours Nominal (Happy Path)\n`;
    g += `    Given le processus "${proc.name}" est initialisé avec un payload valide\n`;

    proc.steps.slice(0, 8).forEach(s => {
      if (s.rawType.toLowerCase().includes('startevent')) {
        g += `    When l'événement initial "${s.name}" est déclenché\n`;
      } else if (s.rawType.toLowerCase().includes('usertask')) {
        g += `    And l'acteur "${s.lane}" valide la tâche "${s.name}"\n`;
      } else if (s.rawType.toLowerCase().includes('servicetask')) {
        g += `    And le service "${s.name}" est exécuté avec succès\n`;
      } else if (s.rawType.toLowerCase().includes('endevent')) {
        g += `    Then le processus atteint l'état final "${s.name}"\n`;
      }
    });

    return g;
  }

  /**
   * 6. Vue Diagramme BPMN Intégré
   */
  function renderDiagramView(processes) {
    const activeProc = processes[0] || currentSpecsDoc.processes[0];
    if (!activeProc) return `<div class="empty-state"><p>Aucun diagramme sélectionné.</p></div>`;

    return `
      <div class="specs-section-card" style="margin-top:20px;">
        <div class="specs-section-header">
          <span class="specs-section-num">🗺️</span>
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">
                Visualisation Interactive du Diagramme : ${lintEsc(activeProc.name)}
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                Explorez le diagramme BPMN 2.0 complet avec zoom, panoramique et navigation.
              </p>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-ghost" onclick="specsZoomIn()">🔍 +</button>
              <button class="btn-ghost" onclick="specsZoomOut()">🔍 -</button>
              <button class="btn-ghost" onclick="specsZoomFit()">📐 Ajuster</button>
            </div>
          </div>
        </div>

        <div id="specsEmbeddedCanvas" style="height:550px; background:#fafafa; border:1px solid var(--border-color); border-radius:var(--border-radius-sm); margin-top:14px; position:relative;"></div>
      </div>
    `;
  }

  function initSpecsDiagramViewer(proc) {
    const canvasContainer = document.getElementById('specsEmbeddedCanvas');
    if (!canvasContainer || !proc || !proc.sourceXml) return;

    if (typeof BpmnJS === 'undefined') {
      canvasContainer.innerHTML = '<div style="padding:40px; text-align:center; color:var(--err);">La bibliothèque BpmnJS n’est pas disponible.</div>';
      return;
    }

    if (specsActiveViewerInstance) {
      try { specsActiveViewerInstance.destroy(); } catch (e) {}
      specsActiveViewerInstance = null;
    }

    try {
      specsActiveViewerInstance = new BpmnJS({ container: canvasContainer });
      specsActiveViewerInstance.importXML(proc.sourceXml).then(() => {
        const canvas = specsActiveViewerInstance.get('canvas');
        canvas.zoom('fit-viewport');
      }).catch(err => {
        console.error('Erreur import XML dans Living Doc:', err);
      });
    } catch (e) {
      console.error('Erreur BpmnJS dans Living Doc:', e);
    }
  }

  function specsZoomIn() {
    if (specsActiveViewerInstance) {
      const canvas = specsActiveViewerInstance.get('canvas');
      canvas.zoom(canvas.zoom() * 1.25);
    }
  }

  function specsZoomOut() {
    if (specsActiveViewerInstance) {
      const canvas = specsActiveViewerInstance.get('canvas');
      canvas.zoom(canvas.zoom() * 0.8);
    }
  }

  function specsZoomFit() {
    if (specsActiveViewerInstance) {
      const canvas = specsActiveViewerInstance.get('canvas');
      canvas.zoom('fit-viewport');
    }
  }

  function filterSteps(steps) {
    if (!specsSearchQuery) return steps;
    const q = specsSearchQuery.toLowerCase();
    return steps.filter(s => {
      return (s.name || '').toLowerCase().includes(q) ||
             (s.id || '').toLowerCase().includes(q) ||
             (s.lane || '').toLowerCase().includes(q) ||
             (s.documentation || '').toLowerCase().includes(q) ||
             (s.typeFormatted || '').toLowerCase().includes(q) ||
             s.inputs.some(i => (i.target || i.source).toLowerCase().includes(q)) ||
             s.outputs.some(o => (o.target || o.source).toLowerCase().includes(q));
    });
  }

  function toggleSpecsExportMenu() {
    const menu = document.getElementById('specsExportDropdownMenu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Fermer le menu au clic extérieur
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      const wrap = document.querySelector ? document.querySelector('.specs-export-dropdown-wrap') : null;
      const menu = document.getElementById('specsExportDropdownMenu');
      if (menu && wrap && typeof wrap.contains === 'function' && !wrap.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  /**
   * Export Markdown GFM
   */
  function exportSpecsMarkdown() {
    if (!currentSpecsDoc) return;

    let md = `# Dossier de Spécifications Techniques & Living Documentation BPMN\n\n`;
    md += `**Client** : ${currentSpecsDoc.client}  \n`;
    md += `**Organisation** : ${currentSpecsDoc.organization}  \n`;
    md += `**Auteur** : ${currentSpecsDoc.author}  \n`;
    md += `**Généré le** : ${currentSpecsDoc.generatedAt}  \n\n`;
    md += `---\n\n`;

    currentSpecsDoc.processes.forEach((proc, idx) => {
      md += `## ${idx + 1}. Processus : ${proc.name}\n\n`;
      md += `- **ID Technique** : \`${proc.id}\`\n`;
      md += `- **Fichier Source** : \`${proc.fileName}\`\n`;
      md += `- **Exécutable** : ${proc.isExecutable ? 'Oui (Moteur Camunda)' : 'Non (Documentaire)'}\n`;
      md += `- **Objectif** : ${proc.documentation}\n\n`;

      if (proc.lanes.length > 0) {
        md += `### Rôles & Couloirs (Lanes)\n`;
        proc.lanes.forEach(l => {
          md += `- **${l.name}** (\`${l.id}\`)\n`;
        });
        md += `\n`;
      }

      md += `### Chronologie des Étapes & Contrats de Données\n\n`;
      md += `| # | Étape | Type BPMN | Acteur / Lane | Données Entrantes (In) | Données Sortantes (Out) |\n`;
      md += `|---|-------|-----------|---------------|------------------------|-------------------------|\n`;

      proc.steps.forEach(s => {
        const inStr = s.inputs.map(i => `\`${i.target || i.source}\``).join(', ') || 'N/A';
        const outStr = s.outputs.map(o => `\`${o.target || o.source}\``).join(', ') || 'N/A';
        md += `| ${s.index} | **${s.name.replace(/\|/g, '-')}** | ${s.typeFormatted} | ${s.lane} | ${inStr} | ${outStr} |\n`;
      });

      md += `\n---\n\n`;
    });

    specsDownload(md, `dossier_specifications_bpmn_${Date.now()}.md`, 'text/markdown;charset=utf-8');
  }

  /**
   * Export HTML Autonome
   */
  function exportSpecsHtmlStandalone() {
    if (!currentSpecsDoc) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${lintEsc(currentSpecsDoc.title)} - Bouygues Telecom</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h1 { color: #003882; margin: 0 0 10px; font-size: 26px; }
    .header-bar { border-bottom: 3px solid #009CD7; padding-bottom: 16px; margin-bottom: 24px; }
    .proc-card { margin-top: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
    h2 { color: #003882; font-size: 20px; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; color: #334155; }
    code { background: #e0f2fe; color: #0369a1; padding: 2px 5px; border-radius: 4px; font-size: 12px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
    @media print { body { background: #fff; margin: 10mm; } .container { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <h1>${lintEsc(currentSpecsDoc.title)}</h1>
      <p style="margin:0; color:#64748b;">${lintEsc(currentSpecsDoc.client)} &bull; ${lintEsc(currentSpecsDoc.organization)} &bull; Généré le ${lintEsc(currentSpecsDoc.generatedAt)}</p>
    </div>

    ${currentSpecsDoc.processes.map(proc => `
      <div class="proc-card">
        <h2>${lintEsc(proc.name)}</h2>
        <p><strong>ID Technique :</strong> <code>${lintEsc(proc.id)}</code> | <strong>Source :</strong> ${lintEsc(proc.fileName)}</p>
        <p>${lintEsc(proc.documentation)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nom de l'étape</th>
              <th>Type BPMN</th>
              <th>Rôle / Lane</th>
              <th>Inputs</th>
              <th>Outputs</th>
            </tr>
          </thead>
          <tbody>
            ${proc.steps.map(s => `
              <tr>
                <td>${s.index}</td>
                <td><strong>${lintEsc(s.name)}</strong></td>
                <td>${lintEsc(s.typeFormatted)}</td>
                <td>${lintEsc(s.lane)}</td>
                <td>${s.inputs.map(i => lintEsc(i.target || i.source)).join(', ') || '—'}</td>
                <td>${s.outputs.map(o => lintEsc(o.target || o.source)).join(', ') || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    specsDownload(htmlContent, `dossier_specifications_bpmn_${Date.now()}.html`, 'text/html;charset=utf-8');
  }

  /**
   * Export Classeur Excel (.xlsx)
   */
  function exportSpecsExcel() {
    if (!currentSpecsDoc || !window.XLSX) {
      alert('La bibliothèque Excel n’est pas disponible.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Onglet 1 : Synthèse des Processus
    const summaryRows = [
      ['DOSSIER DE SPÉCIFICATIONS TECHNIQUES & LIVING DOCUMENTATION'],
      ['Organisation', currentSpecsDoc.organization],
      ['Date de Génération', currentSpecsDoc.generatedAt],
      ['Nombre Total de Processus', currentSpecsDoc.stats.processCount],
      ['Nombre Total d’Étapes', currentSpecsDoc.stats.totalSteps],
      [],
      ['ID Processus', 'Nom du Processus', 'Fichier Source', 'Exécutable', 'Nombre d’Étapes', 'Description']
    ];

    currentSpecsDoc.processes.forEach(p => {
      summaryRows.push([p.id, p.name, p.fileName, p.isExecutable ? 'Oui' : 'Non', p.steps.length, p.documentation]);
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(summaryRows) : summaryRows), 'Synthèse Processus');

    // Onglet 2 : Catalogue des Étapes
    const stepRows = [
      ['Processus', 'Index', 'ID Élément', 'Nom de l’Étape', 'Type BPMN', 'Acteur / Lane', 'Worker / Topic', 'Formulaire IHM', 'Inputs', 'Outputs', 'Description']
    ];

    currentSpecsDoc.processes.forEach(p => {
      p.steps.forEach(s => {
        stepRows.push([
          p.name,
          s.index,
          s.id,
          s.name,
          s.typeFormatted,
          s.lane,
          s.technicalMeta.jobType || '',
          s.technicalMeta.formKey || '',
          s.inputs.map(i => i.target || i.source).join(', '),
          s.outputs.map(o => o.target || o.source).join(', '),
          s.documentation
        ]);
      });
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(stepRows) : stepRows), 'Catalogue Étapes');

    // Onglet 3 : Dictionnaire des Variables I/O
    const varRows = [
      ['Nom de la Variable', 'Produite par (Étapes)', 'Consommée par (Étapes)']
    ];
    Object.entries(currentSpecsDoc.variableDictionary).forEach(([name, item]) => {
      varRows.push([
        name,
        item.producedBy.map(p => `${p.procName} > ${p.stepName}`).join(' | '),
        item.consumedBy.map(c => `${c.procName} > ${c.stepName}`).join(' | ')
      ]);
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(varRows) : varRows), 'Dictionnaire Variables');

    XLSX.writeFile(wb, `specifications_living_doc_${Date.now()}.xlsx`);
  }

  /**
   * Export Gherkin (.feature)
   */
  function exportSpecsGherkin() {
    if (!currentSpecsDoc) return;
    let fullGherkin = '';
    currentSpecsDoc.processes.forEach(p => {
      fullGherkin += generateGherkinForProcess(p) + '\n\n';
    });
    specsDownload(fullGherkin, `specifications_bdd_${Date.now()}.feature`, 'text/plain;charset=utf-8');
  }

  /**
   * Export JSON
   */
  function exportSpecsJson() {
    if (!currentSpecsDoc) return;
    specsDownload(JSON.stringify(currentSpecsDoc, null, 2), `specifications_doc_${Date.now()}.json`, 'application/json;charset=utf-8');
  }

  function copyGherkinCode(procId) {
    const el = document.getElementById(`gherkin-code-${procId}`);
    if (el && navigator.clipboard) {
      navigator.clipboard.writeText(el.textContent).then(() => {
        alert('Scénarios Gherkin copiés dans le presse-papiers !');
      });
    }
  }

  function printSpecsReport() {
    window.print();
  }

  // Exports publics
  window.initSpecsGenModule = initSpecsGenModule;
  window.generateLivingSpecs = generateLivingSpecs;
  window.syncSpecsWithGlobalFiles = syncSpecsWithGlobalFiles;
  window.loadSpecsDemoSuite = loadSpecsDemoSuite;
  window.addSpecsFiles = addSpecsFiles;
  window.removeSpecsFile = removeSpecsFile;
  window.clearSpecsFiles = clearSpecsFiles;
  window.setSpecsActiveTab = setSpecsActiveTab;
  window.setSpecsProcessFilter = setSpecsProcessFilter;
  window.setSpecsSearchQuery = setSpecsSearchQuery;
  window.specsZoomIn = specsZoomIn;
  window.specsZoomOut = specsZoomOut;
  window.specsZoomFit = specsZoomFit;
  window.toggleSpecsExportMenu = toggleSpecsExportMenu;
  window.exportSpecsMarkdown = exportSpecsMarkdown;
  window.exportSpecsHtmlStandalone = exportSpecsHtmlStandalone;
  window.exportSpecsExcel = exportSpecsExcel;
  window.exportSpecsGherkin = exportSpecsGherkin;
  window.exportSpecsJson = exportSpecsJson;
  window.copyGherkinCode = copyGherkinCode;
  window.printSpecsReport = printSpecsReport;

})();
