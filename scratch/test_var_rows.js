const fs = require('fs');

function cleanVar(str) {
  if (!str) return '';
  let s = String(str).trim();
  if (s.startsWith('=')) s = s.substring(1).trim();
  const idx = s.indexOf('(');
  if (idx !== -1) s = s.substring(0, idx).trim();
  if (s.includes('=')) s = s.split('=')[0].trim();
  if (s.includes(':')) s = s.split(':')[0].trim();
  s = s.replace(/^[="'\[]+|[="'\]]+$/g, '').trim();
  return s;
}

const mockActivities = [
  {
    name: 'Vérifier l\'état du projet',
    level: 1,
    entity: 'CDD',
    userGroup: 'CDD_SUPPORT',
    inputs: ['idProjet', 'region', 'groupeSUPPORT', 'migration_loop'],
    outputs: ['NA'],
    mode: 'Call Activity',
    applicableCase: 'Si bypass non',
    parentProcess: 'Process VDR',
    comment: '—'
  },
  {
    name: 'Vérifier et paramétrer instance',
    level: 1,
    entity: 'CDD',
    userGroup: 'CDD_SUPPORT',
    inputs: ['idProjet', 'idBesoin', 'etatProjet', 'List region'],
    outputs: ['solutionDO', 'modeleAjout4G', 'modeleSWAP'],
    mode: 'Call Activity',
    applicableCase: 'Si bypass non',
    parentProcess: 'Process VDR',
    comment: '—'
  }
];

// Calculate rows
mockActivities.forEach((act, actIdx) => {
  const inList = (act.inputs || []).map(cleanVar).filter(v => v && v !== 'NA');
  const outList = (act.outputs || []).map(cleanVar).filter(v => v && v !== 'NA');
  const numRows = Math.max(inList.length, outList.length, 1);

  console.log(`Activity ${actIdx + 1}: "${act.name}" -> ${numRows} Excel rows`);
  for (let r = 0; r < numRows; r++) {
    const inV = inList[r] || (inList.length === 0 ? 'NA' : '—');
    const outV = outList[r] || (outList.length === 0 ? 'NA' : '—');
    console.log(`  Row ${r + 1}: In = "${inV}", Out = "${outV}"`);
  }
});
