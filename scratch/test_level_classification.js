const fs = require('fs');
const path = require('path');

// Simulate the activities structure
const demoActivities = [
  // N1: Macro 1 (Level 1)
  { id: 'act_101', name: 'Vérifier le dépôt COMSIS', parentId: '', level: 1, type: 'Sous-processus', entity: 'CDD', userGroup: 'CDD_COMSIS' },
  // N2 under Macro 1
  { id: 'act_102', name: 'Contrôler la conformité du dossier', parentId: 'act_101', level: 2, type: 'User Task', entity: 'CDD', userGroup: 'CDD_COMSIS' },
  
  // N1: Macro 2 (Level 1)
  { id: 'act_104', name: 'Vérifier le réglementaire', parentId: '', level: 1, type: 'Sous-processus', entity: 'REGLEMENTAIRE', userGroup: 'CDD_REGLEMENTAIRE' },
  // N2 under Macro 2
  { id: 'act_105', name: 'Notifier ANFR Date allumage 4G 700', parentId: 'act_104', level: 2, type: 'Service Task', entity: 'REGLEMENTAIRE', userGroup: 'CDD_REGLEMENTAIRE' },
  { id: 'act_106', name: 'Notifier ANFR Date allumage 4G 800', parentId: 'act_104', level: 2, type: 'Service Task', entity: 'REGLEMENTAIRE', userGroup: 'CDD_REGLEMENTAIRE' },
  { id: 'act_107', name: 'Réaliser Remédiation 4G', parentId: 'act_104', level: 2, type: 'Sous-processus', entity: 'REGLEMENTAIRE', userGroup: 'CDD_REMEDIATION' },
  // N3 under Subprocess 107
  { id: 'act_108', name: 'Préciser le groupe responsable', parentId: 'act_107', level: 3, type: 'User Task', entity: 'REGLEMENTAIRE', userGroup: 'CDD_REMEDIATION' }
];

const nodeMapByUniqueId = new Map();
const nodeMapById = new Map();
const nodeMapByName = new Map();

demoActivities.forEach(act => {
  if (act.uniqueId) nodeMapByUniqueId.set(act.uniqueId, act);
  if (act.id) nodeMapById.set(act.id, act);
  if (act.name) nodeMapByName.set(act.name, act);
});

const getAncestors = (act) => {
  const chain = [];
  let currParentId = act.parentId;
  const visited = new Set([act.uniqueId || act.id]);

  while (currParentId) {
    const parentNode = nodeMapByUniqueId.get(currParentId) || nodeMapById.get(currParentId) || nodeMapByName.get(currParentId);
    if (parentNode && !visited.has(parentNode.uniqueId || parentNode.id)) {
      visited.add(parentNode.uniqueId || parentNode.id);
      chain.unshift(parentNode);
      currParentId = parentNode.parentId;
    } else {
      break;
    }
  }
  return chain;
};

const rootName = "Lancement projet";

const rows = demoActivities.map(act => {
  const parents = getAncestors(act);
  let colN0 = rootName;
  let colN1 = "NA", colN2 = "NA", colN3 = "NA", colN4 = "NA";

  if (parents.length === 0) {
    colN1 = act.name;
  } else if (parents.length === 1) {
    colN1 = parents[0].name;
    colN2 = act.name;
  } else if (parents.length === 2) {
    colN1 = parents[0].name;
    colN2 = parents[1].name;
    colN3 = act.name;
  } else if (parents.length === 3) {
    colN1 = parents[0].name;
    colN2 = parents[1].name;
    colN3 = parents[2].name;
    colN4 = act.name;
  } else {
    colN1 = parents[0].name;
    colN2 = parents[1].name;
    colN3 = parents[2].name;
    colN4 = parents.slice(3).map(p => p.name).concat([act.name]).join(' / ');
  }

  return { colN0, colN1, colN2, colN3, colN4, act: act.name, type: act.type };
});

console.table(rows);
