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
    colN0: 'P1: Process VDR',
    colN1: 'Vérifier l\'état du projet',
    colN2: 'NA',
    colN3: 'NA',
    colN4: 'NA',
    entity: 'CDD',
    userGroup: 'CDD_SUPPORT',
    inputs: ['idProjet', 'region', 'groupeSUPPORT'],
    outputs: ['NA'],
    mode: 'Call Activity',
    applicableCase: 'Si bypass non',
    parentProcess: 'Process VDR',
    comment: '—'
  },
  {
    colN0: 'P1: Process VDR',
    colN1: 'Vérifier et paramétrer instance',
    colN2: 'NA',
    colN3: 'NA',
    colN4: 'NA',
    entity: 'CDD',
    userGroup: 'CDD_SUPPORT',
    inputs: ['idProjet', 'idBesoin', 'etatProjet'],
    outputs: ['solutionDO', 'modeleAjout4G'],
    mode: 'Call Activity',
    applicableCase: 'Si bypass non',
    parentProcess: 'Process VDR',
    comment: '—'
  }
];

// 1. Prepare raw activity blocks
const actBlocks = mockActivities.map(act => {
  const inList = (act.inputs || []).map(cleanVar).filter(v => v && v !== 'NA');
  const outList = (act.outputs || []).map(cleanVar).filter(v => v && v !== 'NA');
  const rowCount = Math.max(inList.length, outList.length, 1);

  return {
    ...act,
    inList,
    outList,
    rowCount
  };
});

// 2. Compute spans for N0, N1, N2, N3
const numActs = actBlocks.length;
const spans = Array.from({ length: numActs }, () => ({}));
const levelKeys = ['colN0', 'colN1', 'colN2', 'colN3'];

levelKeys.forEach((key, keyIdx) => {
  const parentKeys = levelKeys.slice(0, keyIdx);

  for (let i = 0; i < numActs; i++) {
    if (spans[i]['show_' + key] === false) continue;

    let mergedRowCount = actBlocks[i].rowCount;
    const val = actBlocks[i][key];

    if (val !== "NA") {
      for (let j = i + 1; j < numActs; j++) {
        let sameParent = true;
        for (const pKey of parentKeys) {
          if (actBlocks[j][pKey] !== actBlocks[i][pKey]) {
            sameParent = false;
            break;
          }
        }
        if (sameParent && actBlocks[j][key] === val) {
          spans[j]['show_' + key] = false;
          mergedRowCount += actBlocks[j].rowCount;
        } else {
          break;
        }
      }
    }

    spans[i]['span_' + key] = mergedRowCount;
    spans[i]['show_' + key] = true;
  }
});

console.log("Activity Spans calculation:");
actBlocks.forEach((act, i) => {
  console.log(`Act ${i + 1} (${act.colN1}): rowCount=${act.rowCount}, N0 span=${spans[i].span_colN0}, N0 show=${spans[i].show_colN0}`);
});

// 3. Generate HTML rows
let html = '';
let totalExcelRows = 0;

for (let i = 0; i < numActs; i++) {
  const act = actBlocks[i];
  const span = spans[i];
  const count = act.rowCount;

  for (let r = 0; r < count; r++) {
    totalExcelRows++;
    html += `<tr>`;

    const inVal = act.inList[r] || (act.inList.length === 0 ? 'NA' : '—');
    const outVal = act.outList[r] || (act.outList.length === 0 ? 'NA' : '—');

    if (r === 0) {
      // N0
      if (span['show_colN0']) html += `<td rowspan="${span['span_colN0']}">N0: ${act.colN0}</td>`;
      // N1
      if (span['show_colN1']) html += `<td rowspan="${span['span_colN1']}">N1: ${act.colN1}</td>`;
      // N2
      if (span['show_colN2']) html += `<td rowspan="${span['span_colN2']}">N2: ${act.colN2}</td>`;
      // N3
      if (span['show_colN3']) html += `<td rowspan="${span['span_colN3']}">N3: ${act.colN3}</td>`;
      // N4
      html += `<td rowspan="${count}">N4: ${act.colN4}</td>`;
      // Entité
      html += `<td rowspan="${count}">Entité: ${act.entity}</td>`;
      // Groupe
      html += `<td rowspan="${count}">Groupe: ${act.userGroup}</td>`;
      // Input
      html += `<td>${inVal}</td>`;
      // Output
      html += `<td>${outVal}</td>`;
      // Mode
      html += `<td rowspan="${count}">Mode: ${act.mode}</td>`;
      // Applicable
      html += `<td rowspan="${count}">Applicable: ${act.applicableCase}</td>`;
      // Processus
      html += `<td rowspan="${count}">Proc: ${act.parentProcess}</td>`;
      // Comment
      html += `<td rowspan="${count}">Comment: ${act.comment}</td>`;
    } else {
      // Sub-row: ONLY Input and Output are emitted
      html += `<td>${inVal}</td>`;
      html += `<td>${outVal}</td>`;
    }

    html += `</tr>\n`;
  }
}

console.log(`Generated ${totalExcelRows} total Excel rows successfully!`);
console.log("HTML Sample:\n", html);
