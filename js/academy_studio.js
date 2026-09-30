/**
 * PAPRIKA ACADEMY - Studio Modeler Interactif & Atelier d'Audit Temps Réel
 * Permet aux utilisateurs métier de modéliser directement dans l'application,
 * de réaliser des exercices pratiques et de bénéficier d'un audit temps réel avec auto-correction.
 */

(function () {
  'use strict';

  let studioModeler = null;
  let activeExerciseId = 'ex_naming';
  let liveAuditResults = {
    score: 0,
    issues: [],
    passedCount: 0,
    totalRules: 0
  };

  // Liste des exercices interactifs métier
  const EXERCISES_DATA = [
    {
      id: 'ex_naming',
      title: 'Exercice 1 : Charte de Nommage Métier',
      badge: 'Débutant',
      badgeColor: '#10B981',
      goal: 'Corriger les 3 tâches mal nommées (« Traitement », « Vérif », « Validation ») et l\'événement de fin (« Fin ») selon la charte Bouygues Telecom.',
      instructions: [
        'Cliquez sur les tâches directement sur le canevas ou utilisez le panneau de propriétés pour les renommer.',
        'Format des Tâches : <strong>[Verbe infinitif] + [Complément d\'objet]</strong> (ex: <em>Traiter la commande de souscription</em>).',
        'Format de Fin : <strong>[Objet] + [Participe passé]</strong> (ex: <em>Souscription validée et active</em>).'
      ],
      initialXml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Ex1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Souscription_Bbox" name="Souscription Bbox" isExecutable="true">
    <bpmn:startEvent id="Start_1" name="Demande de souscription reçue">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Traitement">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_2" name="Vérif">
      <bpmn:incoming>F2</bpmn:incoming>
      <bpmn:outgoing>F3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_3" name="Validation">
      <bpmn:incoming>F3</bpmn:incoming>
      <bpmn:outgoing>F4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_1" name="Fin">
      <bpmn:incoming>F4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="F2" sourceRef="Task_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="F3" sourceRef="Task_2" targetRef="Task_3" />
    <bpmn:sequenceFlow id="F4" sourceRef="Task_3" targetRef="End_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Souscription_Bbox">
      <bpmndi:BPMNShape id="_BPMNShape_Start_1" bpmnElement="Start_1">
        <dc:Bounds x="160" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_Task1_di" bpmnElement="Task_1">
        <dc:Bounds x="260" y="80" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_Task2_di" bpmnElement="Task_2">
        <dc:Bounds x="440" y="80" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_Task3_di" bpmnElement="Task_3">
        <dc:Bounds x="620" y="80" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_End1_di" bpmnElement="End_1">
        <dc:Bounds x="800" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="F1_di" bpmnElement="F1">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F2_di" bpmnElement="F2">
        <di:waypoint x="390" y="120" />
        <di:waypoint x="440" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F3_di" bpmnElement="F3">
        <di:waypoint x="570" y="120" />
        <di:waypoint x="620" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F4_di" bpmnElement="F4">
        <di:waypoint x="750" y="120" />
        <di:waypoint x="800" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
      autoFixChanges: {
        'Task_1': 'Traiter la demande de souscription client',
        'Task_2': 'Vérifier l\'éligibilité technique Fibre',
        'Task_3': 'Valider le dossier de souscription',
        'End_1': 'Souscription validée et active'
      }
    },
    {
      id: 'ex_xor_default',
      title: 'Exercice 2 : Sécuriser une Passerelle XOR (Flux par Défaut)',
      badge: 'Intermédiaire',
      badgeColor: '#009CD7',
      goal: 'Ajouter un flux par défaut (Default Flow) sur la passerelle exclusive pour empêcher tout blocage en production.',
      instructions: [
        'La passerelle exclusive « Type de raccordement ? » sépare l\'offre Fibre et l\'offre VDSL.',
        'Actuellement, aucun flux de secours par défaut n\'est défini. Si le dossier ne correspond ni à l\'un ni à l\'autre, le processus crashe.',
        'Ajoutez une branche de repli vers « Traiter en manuel » ou marquez une branche existante en flux par défaut.'
      ],
      initialXml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Ex2" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Raccordement" name="Raccordement Client" isExecutable="true">
    <bpmn:startEvent id="Start_Racc" name="Eligibilité confirmée">
      <bpmn:outgoing>F_Start</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:exclusiveGateway id="Gateway_Type" name="Type de raccordement ?">
      <bpmn:incoming>F_Start</bpmn:incoming>
      <bpmn:outgoing>F_Fibre</bpmn:outgoing>
      <bpmn:outgoing>F_VDSL</bpmn:outgoing>
      <bpmn:outgoing>F_Manuel</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_Fibre" name="Raccorder la ligne Fibre FTTH">
      <bpmn:incoming>F_Fibre</bpmn:incoming>
      <bpmn:outgoing>F_Fibre_OK</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:serviceTask id="Task_VDSL" name="Raccorder la ligne VDSL / Cuivre">
      <bpmn:incoming>F_VDSL</bpmn:incoming>
      <bpmn:outgoing>F_VDSL_OK</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Manuel" name="Traiter manuellement le raccordement atypique">
      <bpmn:incoming>F_Manuel</bpmn:incoming>
      <bpmn:outgoing>F_Manuel_OK</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Final" name="Ligne client activée">
      <bpmn:incoming>F_Fibre_OK</bpmn:incoming>
      <bpmn:incoming>F_VDSL_OK</bpmn:incoming>
      <bpmn:incoming>F_Manuel_OK</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F_Start" sourceRef="Start_Racc" targetRef="Gateway_Type" />
    <bpmn:sequenceFlow id="F_Fibre" name="Fibre FTTH" sourceRef="Gateway_Type" targetRef="Task_Fibre" />
    <bpmn:sequenceFlow id="F_VDSL" name="Cuivre VDSL" sourceRef="Gateway_Type" targetRef="Task_VDSL" />
    <bpmn:sequenceFlow id="F_Manuel" name="Autre / Non éligible" sourceRef="Gateway_Type" targetRef="Task_Manuel" />
    <bpmn:sequenceFlow id="F_Fibre_OK" sourceRef="Task_Fibre" targetRef="End_Final" />
    <bpmn:sequenceFlow id="F_VDSL_OK" sourceRef="Task_VDSL" targetRef="End_Final" />
    <bpmn:sequenceFlow id="F_Manuel_OK" sourceRef="Task_Manuel" targetRef="End_Final" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_2">
    <bpmndi:BPMNPlane id="BPMNPlane_2" bpmnElement="Process_Raccordement">
      <bpmndi:BPMNShape id="Start_Racc_di" bpmnElement="Start_Racc">
        <dc:Bounds x="160" y="162" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Type_di" bpmnElement="Gateway_Type" isMarkerVisible="true">
        <dc:Bounds x="260" y="155" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Fibre_di" bpmnElement="Task_Fibre">
        <dc:Bounds x="380" y="60" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_VDSL_di" bpmnElement="Task_VDSL">
        <dc:Bounds x="380" y="150" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Manuel_di" bpmnElement="Task_Manuel">
        <dc:Bounds x="380" y="250" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Final_di" bpmnElement="End_Final">
        <dc:Bounds x="600" y="162" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="F_Start_di" bpmnElement="F_Start">
        <di:waypoint x="196" y="180" />
        <di:waypoint x="260" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_Fibre_di" bpmnElement="F_Fibre">
        <di:waypoint x="285" y="155" />
        <di:waypoint x="285" y="100" />
        <di:waypoint x="380" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_VDSL_di" bpmnElement="F_VDSL">
        <di:waypoint x="310" y="180" />
        <di:waypoint x="380" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_Manuel_di" bpmnElement="F_Manuel">
        <di:waypoint x="285" y="205" />
        <di:waypoint x="285" y="290" />
        <di:waypoint x="380" y="290" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_Fibre_OK_di" bpmnElement="F_Fibre_OK">
        <di:waypoint x="520" y="100" />
        <di:waypoint x="618" y="100" />
        <di:waypoint x="618" y="162" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_VDSL_OK_di" bpmnElement="F_VDSL_OK">
        <di:waypoint x="520" y="180" />
        <di:waypoint x="600" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F_Manuel_OK_di" bpmnElement="F_Manuel_OK">
        <di:waypoint x="520" y="290" />
        <di:waypoint x="618" y="290" />
        <di:waypoint x="618" y="198" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
      autoFixChanges: {
        'defaultGateway': { gatewayId: 'Gateway_Type', flowId: 'F_Manuel' }
      }
    },
    {
      id: 'ex_timer_sla',
      title: 'Exercice 3 : Délais & Escalade SLA (Minuteur)',
      badge: 'Avancé',
      badgeColor: '#EA5B0C',
      goal: 'Attacher un Boundary Timer Event de relance (24h) sur la tâche de validation des pièces pour automatiser les rappels clients.',
      instructions: [
        'La tâche « Valider les pièces justificatives » doit comporter un Événement Minuteur non-interrompant.',
        'La branche de minuterie doit déclencher la tâche « Envoyer SMS de rappel au client ».'
      ],
      initialXml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Ex3" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_SLA_Validation" name="Contrôle Justificatifs SLA" isExecutable="true">
    <bpmn:startEvent id="Start_Docs" name="Pièces déposées">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_ValiderDocs" name="Valider les pièces justificatives">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_DocsOK" name="Dossier complet et validé">
      <bpmn:incoming>F2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_Docs" targetRef="Task_ValiderDocs" />
    <bpmn:sequenceFlow id="F2" sourceRef="Task_ValiderDocs" targetRef="End_DocsOK" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_3">
    <bpmndi:BPMNPlane id="BPMNPlane_3" bpmnElement="Process_SLA_Validation">
      <bpmndi:BPMNShape id="Start_Docs_di" bpmnElement="Start_Docs">
        <dc:Bounds x="160" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ValiderDocs_di" bpmnElement="Task_ValiderDocs">
        <dc:Bounds x="260" y="80" width="160" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_DocsOK_di" bpmnElement="End_DocsOK">
        <dc:Bounds x="500" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="F1_di" bpmnElement="F1">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F2_di" bpmnElement="F2">
        <di:waypoint x="420" y="120" />
        <di:waypoint x="500" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
      autoFixXml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Ex3_Fixed" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_SLA_Validation" name="Contrôle Justificatifs SLA" isExecutable="true">
    <bpmn:startEvent id="Start_Docs" name="Pièces déposées">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_ValiderDocs" name="Valider les pièces justificatives">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="Timer_Rappel" name="Rappel après 24h" cancelActivity="false" attachedToRef="Task_ValiderDocs">
      <bpmn:outgoing>Flow_Timer</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerDef_1">
        <bpmn:timeDuration>PT24H</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:boundaryEvent>
    <bpmn:serviceTask id="Task_SMS" name="Envoyer SMS de rappel au client">
      <bpmn:incoming>Flow_Timer</bpmn:incoming>
      <bpmn:outgoing>Flow_SMS_End</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Rappel" name="SMS de relance envoyé">
      <bpmn:incoming>Flow_SMS_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_DocsOK" name="Dossier complet et validé">
      <bpmn:incoming>F2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_Docs" targetRef="Task_ValiderDocs" />
    <bpmn:sequenceFlow id="F2" sourceRef="Task_ValiderDocs" targetRef="End_DocsOK" />
    <bpmn:sequenceFlow id="Flow_Timer" sourceRef="Timer_Rappel" targetRef="Task_SMS" />
    <bpmn:sequenceFlow id="Flow_SMS_End" sourceRef="Task_SMS" targetRef="End_Rappel" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_3_Fixed">
    <bpmndi:BPMNPlane id="BPMNPlane_3_Fixed" bpmnElement="Process_SLA_Validation">
      <bpmndi:BPMNShape id="Start_Docs_di" bpmnElement="Start_Docs">
        <dc:Bounds x="160" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ValiderDocs_di" bpmnElement="Task_ValiderDocs">
        <dc:Bounds x="260" y="80" width="160" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Timer_Rappel_di" bpmnElement="Timer_Rappel">
        <dc:Bounds x="322" y="142" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_SMS_di" bpmnElement="Task_SMS">
        <dc:Bounds x="400" y="210" width="150" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Rappel_di" bpmnElement="End_Rappel">
        <dc:Bounds x="600" y="232" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_DocsOK_di" bpmnElement="End_DocsOK">
        <dc:Bounds x="500" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="F1_di" bpmnElement="F1">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="F2_di" bpmnElement="F2">
        <di:waypoint x="420" y="120" />
        <di:waypoint x="500" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Timer_di" bpmnElement="Flow_Timer">
        <di:waypoint x="340" y="178" />
        <di:waypoint x="340" y="250" />
        <di:waypoint x="400" y="250" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_SMS_End_di" bpmnElement="Flow_SMS_End">
        <di:waypoint x="550" y="250" />
        <di:waypoint x="600" y="250" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    },
    {
      id: 'ex_free_sandbox',
      title: 'Atelier Libre : Bac à Sable & Audit Temps Réel',
      badge: 'Création Libre',
      badgeColor: '#8B5CF6',
      goal: 'Concevez librement votre processus BPMN 2.0 de A à Z. L\'audit inspecte en continu la conformité de vos activités, passerelles et événements.',
      instructions: [
        'Utilisez la palette de gauche pour glisser-déposer des tâches, passerelles et événements.',
        'Observez le score d\'audit en temps réel dans le volet droit qui s\'ajuste à chaque modification.',
        'Objectif : Atteindre 100% de conformité sur un processus complet de bout-en-bout.'
      ],
      initialXml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Sandbox" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Sandbox" name="Nouveau Processus Métier" isExecutable="true">
    <bpmn:startEvent id="Start_Sandbox" name="Processus démarré">
      <bpmn:outgoing>Flow_Initial</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_Initial" name="Analyser la demande initiale">
      <bpmn:incoming>Flow_Initial</bpmn:incoming>
      <bpmn:outgoing>Flow_Final</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Sandbox" name="Processus finalisé avec succès">
      <bpmn:incoming>Flow_Final</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Initial" sourceRef="Start_Sandbox" targetRef="Task_Initial" />
    <bpmn:sequenceFlow id="Flow_Final" sourceRef="Task_Initial" targetRef="End_Sandbox" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Sandbox">
    <bpmndi:BPMNPlane id="BPMNPlane_Sandbox" bpmnElement="Process_Sandbox">
      <bpmndi:BPMNShape id="Start_Sandbox_di" bpmnElement="Start_Sandbox">
        <dc:Bounds x="160" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Initial_di" bpmnElement="Task_Initial">
        <dc:Bounds x="260" y="80" width="160" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Sandbox_di" bpmnElement="End_Sandbox">
        <dc:Bounds x="480" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Initial_di" bpmnElement="Flow_Initial">
        <di:waypoint x="196" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Final_di" bpmnElement="Flow_Final">
        <di:waypoint x="420" y="120" />
        <di:waypoint x="480" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
      autoFixChanges: null
    }
  ];

  // Rendu de la vue Studio & Atelier dans Paprika Academy
  window.renderAcademyStudioView = function (container) {
    if (!container) return;

    let exercisePillsHtml = EXERCISES_DATA.map(ex => `
      <button class="filter-pill ${activeExerciseId === ex.id ? 'active' : ''}" onclick="selectAcademyExercise('${ex.id}')" style="padding:8px 16px; border-radius:20px; font-size:12.5px; font-weight:700; border:1px solid var(--border-color); background:${activeExerciseId === ex.id ? 'var(--primary-color)' : 'var(--card-bg)'}; color:${activeExerciseId === ex.id ? '#ffffff' : 'var(--text-color)'}; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.2s;">
        <span>${ex.id === 'ex_free_sandbox' ? '🚀' : '🧪'}</span>
        <span>${ex.title}</span>
        <span style="font-size:10px; padding:2px 6px; border-radius:8px; background:${ex.badgeColor}25; color:${ex.badgeColor}; border:1px solid ${ex.badgeColor}50;">${ex.badge}</span>
      </button>
    `).join('');

    const currentEx = EXERCISES_DATA.find(e => e.id === activeExerciseId) || EXERCISES_DATA[0];

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">🎮 Atelier Modeler &amp; Exercices Pratiques avec Audit en Direct</h2>
            <p style="font-size:13px; color:var(--text-muted); margin:0;">Modélisez directement dans le canevas Camunda Modeler intégré. L'audit temps réel évalue votre diagramme et vous guide vers 100% de conformité.</p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-ghost" onclick="resetCurrentExercise()" style="padding:8px 16px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
              🔄 Réinitialiser l'exercice
            </button>
            <button class="btn-primary" onclick="autoFixCurrentExercise()" style="padding:8px 18px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; background:linear-gradient(135deg, #10B981 0%, #059669 100%); border:none;">
              🪄 Auto-Corriger
            </button>
            <button class="btn-ghost" onclick="exportStudioBpmnXml()" style="padding:8px 14px; font-size:12px; font-weight:700;">
              📥 Exporter .BPMN
            </button>
          </div>
        </div>

        <!-- Sélecteur d'exercices -->
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px;">
          ${exercisePillsHtml}
        </div>

        <!-- Fiche Consigne de l'exercice -->
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:16px 20px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span style="font-size:18px;">🎯</span>
              <strong style="color:var(--text-color); font-size:14px;">Objectif :</strong>
              <span style="color:var(--text-color); font-size:13.5px; font-weight:600;">${currentEx.goal}</span>
            </div>
            <div style="font-size:12.5px; color:var(--text-muted); line-height:1.5; padding-left:28px;">
              ${currentEx.instructions.join(' • ')}
            </div>
          </div>
        </div>
      </div>

      <!-- Espace Studio : Modeler Canvas (Gauche) + Volet Live Audit (Droite) -->
      <div style="display:grid; grid-template-columns:1fr 360px; gap:20px; height:680px; margin-bottom:24px;">
        <!-- Canevas Modeler BPMN -->
        <div style="background:#ffffff; border:1.5px solid var(--border-color); border-radius:16px; overflow:hidden; position:relative; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.15);">
          <!-- Barre d'outils du canevas -->
          <div style="padding:10px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; z-index:10;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:12px; font-weight:700; color:#003882;">🎨 Camunda Modeler Canvas</span>
              <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:#e0f2fe; color:#0369a1; font-weight:600;">Interactif</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button onclick="studioZoomIn()" title="Zoom +" style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; cursor:pointer; font-size:11px; font-weight:700; color:#334155;">🔍 +</button>
              <button onclick="studioZoomOut()" title="Zoom -" style="padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; cursor:pointer; font-size:11px; font-weight:700; color:#334155;">🔍 -</button>
              <button onclick="studioZoomFit()" title="Ajuster à l'écran" style="padding:4px 10px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; cursor:pointer; font-size:11px; font-weight:700; color:#334155;">📐 Ajuster</button>
            </div>
          </div>
          <!-- Conteneur BPMN JS -->
          <div id="bpmnStudioCanvas" style="flex:1; width:100%; height:100%; background:#fcfcfc;"></div>
        </div>

        <!-- Volet Live Audit & Score de Conformité -->
        <div id="studioAuditPanel" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:20px; display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
          <!-- Contenu dynamique de l'audit injecté par runLiveStudioAudit() -->
          <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
            ⏳ Analyse du modèle en cours...
          </div>
        </div>
      </div>
    `;

    // Initialiser bpmn-js modeler
    setTimeout(() => {
      initBpmnStudioModeler(currentEx.initialXml);
    }, 50);
  };

  // Initialisation de l'instance BpmnJS
  function initBpmnStudioModeler(xmlString) {
    const canvasContainer = document.getElementById('bpmnStudioCanvas');
    if (!canvasContainer) return;

    canvasContainer.innerHTML = '';

    if (typeof BpmnJS === 'undefined') {
      canvasContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#64748b; padding:20px; text-align:center;">
          <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
          <strong style="color:#0f172a; font-size:15px; margin-bottom:6px;">Bibliothèque BPMN Modeler en cours de chargement...</strong>
          <p style="font-size:13px; max-width:400px; margin:0 0 14px 0;">Veuillez patienter quelques instants ou actualiser la page.</p>
          <button onclick="renderAcademyStudioView(document.getElementById('academyMainView'))" class="btn-primary" style="padding:8px 16px; font-size:12px;">Réessayer</button>
        </div>
      `;
      return;
    }

    try {
      studioModeler = new BpmnJS({
        container: '#bpmnStudioCanvas',
        keyboard: {
          bindTo: document
        }
      });

      studioModeler.importXML(xmlString).then(() => {
        const canvas = studioModeler.get('canvas');
        canvas.zoom('fit-viewport');
        runLiveStudioAudit();

        // Écouter chaque changement d'élément ou commande pour lancer l'audit en direct
        const eventBus = studioModeler.get('eventBus');
        eventBus.on('commandStack.changed', () => {
          runLiveStudioAudit();
        });
        eventBus.on('element.changed', () => {
          runLiveStudioAudit();
        });
      }).catch(err => {
        console.error('Erreur import XML dans le Studio Modeler:', err);
      });
    } catch (e) {
      console.error('Erreur initialisation BpmnJS Modeler:', e);
    }
  }

  // Moteur d'Audit Temps Réel (BPMN Live Linter Métier)
  function runLiveStudioAudit() {
    if (!studioModeler) return;

    try {
      const elementRegistry = studioModeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();

      const issues = [];
      let totalChecks = 0;
      let passedChecks = 0;

      // 1. Audit des Tâches (Verbe à l'infinitif + Complément d'objet)
      const tasks = allElements.filter(el =>
        el.type === 'bpmn:Task' ||
        el.type === 'bpmn:UserTask' ||
        el.type === 'bpmn:ServiceTask' ||
        el.type === 'bpmn:SendTask' ||
        el.type === 'bpmn:ReceiveTask' ||
        el.type === 'bpmn:ManualTask' ||
        el.type === 'bpmn:BusinessRuleTask'
      );

      const verbRegex = /^(traiter|valider|vérifier|verifier|analyser|envoyer|notifier|créer|creer|enregistrer|raccorder|provisionner|activer|résilier|resilier|calculer|éditer|editer|générer|generer|clôturer|cloturer|contrôler|controler|prendre|diagnostiquer|mettre|archiver|mettre à jour|mettre a jour|exécuter|executer)\b/i;

      tasks.forEach(task => {
        totalChecks++;
        const name = (task.businessObject.name || '').trim();
        if (!name) {
          issues.push({
            type: 'error',
            elementId: task.id,
            elementName: 'Tâche sans nom',
            title: `Tâche anonyme (${task.id})`,
            desc: 'La tâche n\'a aucun libellé. Donnez-lui un nom sous forme [Verbe] + [Objet].',
            action: 'Nommer la tâche'
          });
        } else if (name.length < 6 || !name.includes(' ')) {
          issues.push({
            type: 'error',
            elementId: task.id,
            elementName: name,
            title: `Nom de tâche trop court ou incomplet : « ${name} »`,
            desc: 'Une tâche doit comporter un verbe d\'action et son complément (ex: « ' + (verbRegex.test(name) ? name + ' le dossier client' : 'Traiter ' + name.toLowerCase()) + ' »).',
            action: 'Compléter le nom'
          });
        } else if (!verbRegex.test(name)) {
          issues.push({
            type: 'warning',
            elementId: task.id,
            elementName: name,
            title: `Absence de verbe d\'action à l'infinitif : « ${name} »`,
            desc: 'Commencez le nom par un verbe à l\'infinitif (ex: « Traiter... », « Valider... », « Vérifier... »).',
            action: 'Ajouter un verbe'
          });
        } else {
          passedChecks++;
        }
      });

      // 2. Audit des Passerelles Exclusives (XOR) et Présence de Flux par Défaut
      const exclusiveGateways = allElements.filter(el => el.type === 'bpmn:ExclusiveGateway');
      exclusiveGateways.forEach(gw => {
        const outgoing = gw.outgoing || [];
        if (outgoing.length > 1) {
          totalChecks++;
          const hasDefault = !!gw.businessObject.default;
          if (!hasDefault) {
            issues.push({
              type: 'error',
              elementId: gw.id,
              elementName: gw.businessObject.name || 'Passerelle Exclusive',
              title: `Passerelle sans flux par défaut : « ${gw.businessObject.name || gw.id} »`,
              desc: 'Toutes les branches ont des conditions. Vous devez définir une branche par défaut pour éviter le blocage de dossiers.',
              action: 'Définir Default Flow'
            });
          } else {
            passedChecks++;
          }

          // Vérifier si la passerelle pose une question
          totalChecks++;
          const gwName = (gw.businessObject.name || '').trim();
          if (!gwName || !gwName.includes('?')) {
            issues.push({
              type: 'warning',
              elementId: gw.id,
              elementName: gwName || 'Passerelle',
              title: `Passerelle non formulée sous forme de Question : « ${gwName || gw.id} »`,
              desc: 'Formulez le libellé sous forme de question fermée (ex: « Client éligible Fibre ? »).',
              action: 'Formuler la question'
            });
          } else {
            passedChecks++;
          }
        }
      });

      // 3. Audit des Événements de Fin (Participe passé / État atteint)
      const endEvents = allElements.filter(el => el.type === 'bpmn:EndEvent');
      endEvents.forEach(end => {
        totalChecks++;
        const name = (end.businessObject.name || '').trim();
        if (!name) {
          issues.push({
            type: 'warning',
            elementId: end.id,
            elementName: 'Fin anonyme',
            title: `Événement de fin sans libellé (${end.id})`,
            desc: 'Indiquez l\'état final obtenu (ex: « Dossier validé et activé »).',
            action: 'Nommer la fin'
          });
        } else if (name.toLowerCase() === 'fin' || name.toLowerCase() === 'end') {
          issues.push({
            type: 'error',
            elementId: end.id,
            elementName: name,
            title: `Nom d\'événement générique non informatif : « ${name} »`,
            desc: 'Remplacez « Fin » par un état précis au participe passé (ex: « Souscription activée » ou « Commande rejetée »).',
            action: 'Préciser l\'état'
          });
        } else {
          passedChecks++;
        }
      });

      // 4. Audit des Événements Minuteurs (Timer Boundary Events)
      const timerEvents = allElements.filter(el => el.type === 'bpmn:BoundaryEvent' && el.businessObject.eventDefinitions && el.businessObject.eventDefinitions.some(d => d.$type === 'bpmn:TimerEventDefinition'));
      if (activeExerciseId === 'ex_timer_sla') {
        totalChecks++;
        if (timerEvents.length === 0) {
          issues.push({
            type: 'error',
            elementId: 'Task_ValiderDocs',
            elementName: 'Validation des pièces',
            title: 'Événement Minuteur de relance manquant',
            desc: 'Attachez un Boundary Timer Event à la tâche de validation pour surveiller le délai de 24h.',
            action: 'Ajouter Boundary Timer'
          });
        } else {
          passedChecks++;
        }
      }

      // Calcul du score global
      const score = totalChecks > 0 ? Math.min(100, Math.round((passedChecks / totalChecks) * 100)) : 100;
      liveAuditResults = {
        score: score,
        issues: issues,
        passedCount: passedChecks,
        totalRules: totalChecks
      };

      renderStudioAuditPanel();
    } catch (e) {
      console.error('Erreur exécution audit en direct:', e);
    }
  }

  // Rendu du volet d'audit en direct
  function renderStudioAuditPanel() {
    const panel = document.getElementById('studioAuditPanel');
    if (!panel) return;

    const { score, issues, passedCount, totalRules } = liveAuditResults;

    let scoreColor = score === 100 ? '#10B981' : (score >= 70 ? '#009CD7' : (score >= 40 ? '#EA5B0C' : '#EF4444'));
    let scoreBadge = score === 100 ? '✨ Conforme à 100%' : (score >= 70 ? '👍 Bon niveau' : '⚠️ Non Conforme');

    let issuesHtml = '';
    if (issues.length === 0) {
      issuesHtml = `
        <div style="background:rgba(16,185,129,0.08); border:1.5px solid #10B981; border-radius:14px; padding:20px; text-align:center;">
          <div style="font-size:36px; margin-bottom:8px;">🎉</div>
          <h4 style="font-size:15px; font-weight:800; color:#10B981; margin:0 0 6px 0;">Zéro anomalie détectée !</h4>
          <p style="font-size:12.5px; color:var(--text-muted); margin:0 0 14px 0; line-height:1.5;">Votre modèle respecte parfaitement les règles de nommage et les standards BPMN 2.0.</p>
          <button onclick="celebrateExerciseSuccess()" class="btn-primary" style="width:100%; padding:9px 16px; font-size:12.5px; font-weight:700; background:linear-gradient(135deg, #10B981 0%, #059669 100%); border:none;">
            🏆 Valider cet Exercice
          </button>
        </div>
      `;
    } else {
      issuesHtml = issues.map((issue, i) => `
        <div style="background:rgba(0,0,0,0.2); border-left:3.5px solid ${issue.type === 'error' ? '#EF4444' : '#F59E0B'}; border-radius:8px; padding:10px 12px; margin-bottom:10px; font-size:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
            <strong style="color:var(--text-color); font-size:12.5px;">${issue.title}</strong>
            <span style="font-size:9.5px; font-weight:700; padding:2px 6px; border-radius:6px; background:${issue.type === 'error' ? '#EF444420' : '#F59E0B20'}; color:${issue.type === 'error' ? '#EF4444' : '#F59E0B'}; text-transform:uppercase;">
              ${issue.type === 'error' ? 'Erreur' : 'Alerte'}
            </span>
          </div>
          <p style="color:var(--text-muted); margin:0 0 6px 0; line-height:1.4;">${issue.desc}</p>
        </div>
      `).join('');
    }

    panel.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🔍</span>
            <strong style="font-size:15px; color:var(--text-color);">Audit en Temps Réel</strong>
          </div>
          <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:8px; background:${scoreColor}20; color:${scoreColor}; border:1px solid ${scoreColor}40;">
            ${scoreBadge}
          </span>
        </div>

        <!-- Jauge de score -->
        <div style="background:rgba(0,0,0,0.15); border-radius:12px; padding:14px; margin-bottom:16px; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Score de Qualité BPMN</div>
          <div style="font-size:32px; font-weight:900; color:${scoreColor}; line-height:1; margin-bottom:8px;">
            ${score}%
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:6px; overflow:hidden;">
            <div style="width:${score}%; height:100%; background:${scoreColor}; transition:width 0.3s ease;"></div>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">
            ${passedCount} / ${totalRules} règles validées
          </div>
        </div>

        <div style="font-size:12px; font-weight:700; color:var(--text-color); margin-bottom:8px; display:flex; justify-content:space-between;">
          <span>📋 Pistes d'Amélioration (${issues.length})</span>
        </div>

        <div style="max-height:300px; overflow-y:auto; padding-right:4px;">
          ${issuesHtml}
        </div>
      </div>

      <div style="border-top:1px solid var(--border-color); padding-top:14px; margin-top:14px;">
        <button class="btn-primary" onclick="autoFixCurrentExercise()" style="width:100%; padding:9px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); border:none; border-radius:8px;">
          <span>🪄 Appliquer l'Auto-Correction</span>
        </button>
      </div>
    `;
  }

  // Changement d'exercice
  window.selectAcademyExercise = function (exId) {
    activeExerciseId = exId;
    window.renderAcademyStudioView(document.getElementById('academyMainView'));
  };

  // Réinitialiser l'exercice
  window.resetCurrentExercise = function () {
    const currentEx = EXERCISES_DATA.find(e => e.id === activeExerciseId);
    if (!currentEx) return;
    initBpmnStudioModeler(currentEx.initialXml);
    if (typeof showToast === 'function') showToast(`Exercice "${currentEx.title}" réinitialisé.`, 'info');
  };

  // Auto-correction de l'exercice en cours
  window.autoFixCurrentExercise = function () {
    const currentEx = EXERCISES_DATA.find(e => e.id === activeExerciseId);
    if (!currentEx) return;

    if (currentEx.autoFixXml) {
      initBpmnStudioModeler(currentEx.autoFixXml);
      if (typeof showToast === 'function') showToast('Corrections appliquées avec succès !', 'success');
      return;
    }

    if (!studioModeler) return;

    try {
      const elementRegistry = studioModeler.get('elementRegistry');
      const modeling = studioModeler.get('modeling');

      if (currentEx.autoFixChanges) {
        // Remplacement de noms d'éléments
        Object.keys(currentEx.autoFixChanges).forEach(elemId => {
          if (elemId === 'defaultGateway') {
            const conf = currentEx.autoFixChanges.defaultGateway;
            const gw = elementRegistry.get(conf.gatewayId);
            const flow = elementRegistry.get(conf.flowId);
            if (gw && flow) {
              modeling.updateProperties(gw, { default: flow.businessObject });
            }
          } else {
            const el = elementRegistry.get(elemId);
            if (el) {
              modeling.updateLabel(el, currentEx.autoFixChanges[elemId]);
            }
          }
        });

        runLiveStudioAudit();
        if (typeof showToast === 'function') showToast('Auto-correction appliquée directement sur le diagramme !', 'success');
      }
    } catch (err) {
      console.error('Erreur auto-correction:', err);
    }
  };

  // Célébration de réussite d'un exercice
  window.celebrateExerciseSuccess = function () {
    const currentEx = EXERCISES_DATA.find(e => e.id === activeExerciseId);
    let modal = document.getElementById('academySuccessModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'academySuccessModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; max-width:520px; width:100%; padding:32px; text-align:center; box-shadow:0 25px 60px rgba(15,23,42,0.3); animation:modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="font-size:54px; margin-bottom:12px;">🏆</div>
        <h2 style="font-size:22px; font-weight:900; color:#003882; margin:0 0 8px 0;">Félicitations !</h2>
        <h3 style="font-size:15px; font-weight:700; color:#10B981; margin:0 0 14px 0;">Exercice validé avec 100% de conformité</h3>
        <p style="font-size:13.5px; color:#475569; line-height:1.6; margin:0 0 24px 0;">
          Vous avez maîtrisé les règles de modélisation pour l'exercice <strong>« ${currentEx.title} »</strong>. Votre diagramme est désormais clair, standardisé et prêt pour la production.
        </p>
        <div style="display:flex; justify-content:center; gap:12px;">
          <button class="btn-primary" onclick="closeSuccessModalAndNext()" style="padding:10px 24px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); border:none; border-radius:10px; color:#fff; cursor:pointer;">
            Exercice Suivant →
          </button>
          <button class="btn-ghost" onclick="document.getElementById('academySuccessModal').style.display='none'" style="padding:10px 18px; font-size:13px; font-weight:700; border:1px solid #cbd5e1; border-radius:10px; background:#fff; color:#334155; cursor:pointer;">
            Fermer
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

  window.closeSuccessModalAndNext = function () {
    const modal = document.getElementById('academySuccessModal');
    if (modal) modal.style.display = 'none';

    const currentIdx = EXERCISES_DATA.findIndex(e => e.id === activeExerciseId);
    if (currentIdx + 1 < EXERCISES_DATA.length) {
      window.selectAcademyExercise(EXERCISES_DATA[currentIdx + 1].id);
    } else {
      window.selectAcademyExercise(EXERCISES_DATA[0].id);
    }
  };

  // Exporter le BPMN XML
  window.exportStudioBpmnXml = function () {
    if (!studioModeler) return;
    studioModeler.saveXML({ format: true }).then(({ xml }) => {
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `exercice_${activeExerciseId}_bouygues.bpmn`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (typeof showToast === 'function') showToast('Diagramme BPMN exporté avec succès !', 'success');
    }).catch(err => {
      console.error('Erreur export XML:', err);
    });
  };

  // Fonctions de zoom
  window.studioZoomIn = function () {
    if (!studioModeler) return;
    studioModeler.get('zoomScroll').stepZoom(1);
  };
  window.studioZoomOut = function () {
    if (!studioModeler) return;
    studioModeler.get('zoomScroll').stepZoom(-1);
  };
  window.studioZoomFit = function () {
    if (!studioModeler) return;
    studioModeler.get('canvas').zoom('fit-viewport');
  };

})();
