const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom'); // or DOMParser mock

const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:modeler="http://camunda.org/schema/modeler/1.0" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Web Modeler" exporterVersion="57aa69a" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.8.0">
  <bpmn:process id="VDR_Obtenir_Lautorisation_Administrative" name="VDR Obtenir l&#39;autorisation administrative" isExecutable="true">
    <bpmn:startEvent id="Event_0l5lp17" name="Autorisation demandée">
      <bpmn:outgoing>Flow_06n4huf</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_06n4huf" sourceRef="Event_0l5lp17" targetRef="VDR_saveMigrationVariableValue" />
    <bpmn:callActivity id="VDR_deposerLeIaEtAa" name="Déposer le IA &#38;AA">
      <bpmn:extensionElements>
        <zeebe:ioMapping>
          <zeebe:input source="=&#34;Déposer les IA : &#34;+ livrable" target="nomDeTache" />
          <zeebe:input source="=idProjet" target="idProjet" />
          <zeebe:input source="=groupeRELANCE" target="groupeRELANCE" />
          <zeebe:input source="=groupeSUPPORT" target="groupeSUPPORT" />
          <zeebe:input source="=objectInstanceId" target="objectInstanceId" />
          <zeebe:input source="=region" target="region" />
        </zeebe:ioMapping>
        <zeebe:calledElement processId="itres-reso-tache-atteint" propagateAllChildVariables="false" propagateAllParentVariables="false" />
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_08crhyd</bpmn:incoming>
      <bpmn:outgoing>Flow_0hk47ap</bpmn:outgoing>
    </bpmn:callActivity>
    <bpmn:endEvent id="Event_03jldmy" name="autorisation obtenue">
      <bpmn:incoming>Flow_01w7p7s</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:callActivity id="VDR_constituerLeIaEtAa" name="Constituer le IA &#38;AA">
      <bpmn:extensionElements>
        <zeebe:calledElement processId="VDR_Constituer_IA_AA" propagateAllChildVariables="false" propagateAllParentVariables="false" />
      </bpmn:extensionElements>
    </bpmn:callActivity>
    <bpmn:scriptTask id="VDR_incLoop" name="inc loop">
      <bpmn:extensionElements>
        <zeebe:script expression="=migration_loop + 1" resultVariable="migration_loop" />
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_07nimy7</bpmn:incoming>
      <bpmn:outgoing>Flow_0pwgivv</bpmn:outgoing>
    </bpmn:scriptTask>
    <bpmn:scriptTask id="VDR_saveMigrationVariableValue" name="save migration variable value">
      <bpmn:extensionElements>
        <zeebe:script expression="=migration" resultVariable="old_migration" />
      </bpmn:extensionElements>
    </bpmn:scriptTask>
    <bpmn:scriptTask id="VDR_restMigrationVariableValue" name="reset migration variable value">
      <bpmn:extensionElements>
        <zeebe:script expression="=old_migration" resultVariable="migration" />
      </bpmn:extensionElements>
    </bpmn:scriptTask>
  </bpmn:process>
</bpmn:definitions>`;

// Test DOMParser with native browser or mock
console.log('XML snippet verification:');
console.log('Contains <bpmn:scriptTask id="VDR_incLoop" name="inc loop">: ', xmlContent.includes('<bpmn:scriptTask id="VDR_incLoop" name="inc loop">'));
