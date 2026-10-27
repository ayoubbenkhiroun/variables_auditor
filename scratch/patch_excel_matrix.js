const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

const newExportPmgExcel = `window.exportPmgExcel = function() {
  const allActs = window.pmgActivities || window.pmgTempSubprocesses || [];
  if (!allActs || allActs.length === 0) {
    alert("La matrice PMG est vide. Veuillez charger des processus BPMN.");
    return;
  }

  const activitiesToExport = typeof window.getPmgFilteredActivities === 'function'
    ? window.getPmgFilteredActivities()
    : allActs;

  if (!activitiesToExport || activitiesToExport.length === 0) {
    alert("Aucune activité ne correspond aux filtres de types sélectionnés.");
    return;
  }

  // 1. Process Metadata & Roots
  const batch = window.pmgBatchResult;
  const roots = (batch && batch.rootProcesses && batch.rootProcesses.length > 0)
    ? batch.rootProcesses
    : [{ id: 'P1', name: document.getElementById('pmgProcessNameStep')?.value || document.getElementById('pmgProcessName')?.value || 'Processus Principal' }];

  let rootTitles = roots.map((r, i) => \`P\${i + 1}: \${r.name || r.id}\`).join(' & ');
  if (!rootTitles) rootTitles = document.getElementById('pmgProcessNameStep')?.value || 'Matrice PMG';

  const processId = document.getElementById('pmgProcessIdStep')?.value || document.getElementById('pmgProcessId')?.value || 'matrice_pmg';
  const owner = document.getElementById('pmgProcessOwnerStep')?.value || document.getElementById('pmgProcessOwner')?.value || 'Direction Métier';
  const exporter = document.getElementById('pmgExporterStep')?.value || document.getElementById('pmgExporter')?.value || 'Équipe PMG';
  const badges = document.getElementById('pmgProjectBadgesStep')?.value || 'CDD / CPE / SGP / SP0 / DMN';

  // 2. Sort activities strictly by DAG flow or hierarchy
  const sortedActivities = window.sortPmgActivities(activitiesToExport, window.pmgActivityOrderMode || 'flow');

  // Map activities by ID for ancestor traversal
  const nodeMap = new Map();
  sortedActivities.forEach(act => {
    if (act.id) nodeMap.set(String(act.id).toLowerCase(), act);
    if (act.name) nodeMap.set(String(act.name).toLowerCase(), act);
  });

  const getAncestors = (act) => {
    const chain = [];
    let curr = act;
    const visited = new Set();
    while (curr && !visited.has(curr.id || curr.name)) {
      visited.add(curr.id || curr.name);
      chain.unshift(curr);
      if (curr.parentId) {
        curr = nodeMap.get(String(curr.parentId).toLowerCase());
      } else {
        break;
      }
    }
    return chain;
  };

  // 3. Build Multi-Level Rows (N0 to N4)
  const rawRows = sortedActivities.map(act => {
    const chain = getAncestors(act);
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';
    const isSub = (act.type || '').toLowerCase().includes('sous-processus') || (act.type || '').toLowerCase().includes('call');

    let colN0 = "NA", colN1 = "NA", colN2 = "NA", colN3 = "NA", colN4 = "NA";

    // N0 : Root Parent / Brique Primaire
    if (chain.length >= 1) {
      colN0 = chain[0].name;
    } else if (act.rootParentName) {
      colN0 = act.rootParentName;
    } else {
      colN0 = roots[0].name || 'Brique Primaire';
    }

    // N1 : Macro Processus
    if (chain.length >= 2) {
      colN1 = chain[1].name;
    } else if (chain.length === 1 && isSub) {
      colN1 = chain[0].name;
    }

    // N2 : Sous-Processus Métier
    if (chain.length >= 3) {
      colN2 = chain[2].name;
    } else if (chain.length === 2 && isSub) {
      colN2 = chain[1].name;
    }

    // N3 : Sous-Processus Métier L3
    if (chain.length >= 4) {
      colN3 = chain[3].name;
    } else if (chain.length === 3 && isSub) {
      colN3 = chain[2].name;
    }

    // N4 : Tâche Finale / Activité Feuille
    if (!isSub) {
      colN4 = act.name;
    } else if (chain.length >= 5) {
      colN4 = chain.slice(4).map(c => c.name).join(' / ');
    }

    const cleanGroup = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(act.userGroup)
      : (act.userGroup || '');

    const parentProcLabel = act.parentProcessName || act.rootParentName || roots[0].name || 'VDR';

    return {
      colN0: colN0 || "NA",
      colN1: colN1 || "NA",
      colN2: colN2 || "NA",
      colN3: colN3 || "NA",
      colN4: colN4 || "NA",
      entity: (act.entity && act.entity !== 'Non défini') ? act.entity : 'NA',
      userGroup: cleanGroup || 'NA',
      inputs: (act.inputs && act.inputs.length > 0) ? act.inputs.join('\\n') : 'NA',
      outputs: (act.outputs && act.outputs.length > 0) ? act.outputs.join('\\n') : 'NA',
      mode: act.realizationMode || (isSub ? 'Call Activity' : 'Manuelle'),
      applicableCase: caseVal || 'NA',
      parentProcess: parentProcLabel,
      comment: commentVal || '—',
      act
    };
  });

  // 4. Compute Merged Spans for N0, N1, N2, N3
  const numRows = rawRows.length;
  const spans = Array.from({ length: numRows }, () => ({}));
  const levelKeys = ['colN0', 'colN1', 'colN2', 'colN3'];

  levelKeys.forEach((key, keyIdx) => {
    const parentKeys = levelKeys.slice(0, keyIdx);

    for (let r = 0; r < numRows; r++) {
      if (spans[r]['show_' + key] === false) continue;

      let count = 1;
      const val = rawRows[r][key];

      // Do not merge "NA" cells across multiple rows
      if (val !== "NA") {
        while (r + count < numRows) {
          let sameParent = true;
          for (const pKey of parentKeys) {
            if (rawRows[r + count][pKey] !== rawRows[r][pKey]) {
              sameParent = false;
              break;
            }
          }
          if (sameParent && rawRows[r + count][key] === val) {
            spans[r + count]['show_' + key] = false;
            count++;
          } else {
            break;
          }
        }
      }

      spans[r]['span_' + key] = count;
      spans[r]['show_' + key] = true;
    }
  });

  // N0 Vibrant Distinct Background Colors
  const n0Palette = ['#FFC000', '#92D050', '#00B0F0', '#FCE4D6', '#E2EFDA', '#D9E1F2', '#FFF2CC'];
  const n0ColorMap = new Map();
  let colorIdx = 0;
  rawRows.forEach(r => {
    if (!n0ColorMap.has(r.colN0)) {
      n0ColorMap.set(r.colN0, n0Palette[colorIdx % n0Palette.length]);
      colorIdx++;
    }
  });

  // Unique Slicer elements for header cards
  const uniqueN1 = Array.from(new Set(rawRows.map(r => r.colN1).filter(v => v !== 'NA')));
  const uniqueN2 = Array.from(new Set(rawRows.map(r => r.colN2).filter(v => v !== 'NA')));
  const uniqueEntities = Array.from(new Set(rawRows.map(r => r.entity).filter(v => v !== 'NA')));

  let slicerN1Html = uniqueN1.slice(0, 6).map(n => \`<div style="background:#548235; color:#fff; padding:2px 5px; margin-bottom:2px; font-size:7.5pt; border-radius:2px;">\${escHtml(n)}</div>\`).join('');
  let slicerN2Html = uniqueN2.slice(0, 6).map(n => \`<div style="background:#ED7D31; color:#fff; padding:2px 5px; margin-bottom:2px; font-size:7.5pt; border-radius:2px;">\${escHtml(n)}</div>\`).join('');
  let slicerEntHtml = uniqueEntities.slice(0, 5).map(e => \`<div style="background:#2E75B6; color:#fff; padding:2px 5px; margin-bottom:2px; font-size:7.5pt; border-radius:2px;">\${escHtml(e)}</div>\`).join('');

  // 5. Construct Beautiful Excel Table XML/HTML
  let html = \`
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
   <x:ExcelWorkbook>
    <x:ExcelWorksheets>
     <x:ExcelWorksheet>
      <x:Name>PMG V(1)</x:Name>
      <x:WorksheetOptions>
       <x:DisplayGridlines/>
       <x:FreezePanes/>
       <x:FrozenNoSplit/>
       <x:SplitHorizontal>7</x:SplitHorizontal>
       <x:TopRowBottomPane>7</x:TopRowBottomPane>
      </x:WorksheetOptions>
     </x:ExcelWorksheet>
    </x:ExcelWorksheets>
   </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; }
    table { border-collapse: collapse; width: 100%; table-layout: auto; }
    th { background-color: #002060; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #000000; padding: 8px 6px; vertical-align: middle; white-space: normal; }
    td { font-size: 9pt; border: 1px solid #D9D9D9; padding: 6px 5px; vertical-align: middle; mso-number-format:'\\\\@'; white-space: pre-line; }
    .cell-na { background-color: #F2F2F2 !important; color: #8C8C8C !important; font-style: italic !important; text-align: center !important; font-weight: normal !important; }
    .title-banner { background-color: #FFC000; color: #000000; font-size: 13pt; font-weight: 900; text-align: center; border: 2px solid #000000; padding: 12px; }
    .slicer-card { background-color: #FFFFFF; border: 1px solid #BFBFBF; vertical-align: top; padding: 4px; font-size: 8pt; }
    .slicer-header { font-weight: bold; text-align: center; padding: 2px; margin-bottom: 3px; border-bottom: 1px solid #BFBFBF; font-size: 8pt; }
    .info-box { background-color: #548235; color: #FFFFFF; font-weight: bold; text-align: center; padding: 6px; font-size: 9pt; border: 1px solid #000; }
  </style>
  </head>
  <body>
    <table>
      <!-- Row 1: Big Yellow Header Title Block (Image 1 Style) -->
      <tr>
        <td colspan="5" class="title-banner">
          \${escHtml(sanitizeFormula(rootTitles))}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#E2EFDA; color:#385723;">Processus Métier Macro - Niveau N1</div>
          \${slicerN1Html || '<div style="color:#888;">Niveau N1</div>'}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#FCE4D6; color:#C65911;">Sous-Processus Métier - Niveau N2</div>
          \${slicerN2Html || '<div style="color:#888;">Niveau N2</div>'}
        </td>
        <td colspan="1" class="slicer-card">
          <div class="slicer-header" style="background:#D9E1F2; color:#1F4E78;">Entités</div>
          \${slicerEntHtml || '<div style="color:#888;">Toutes</div>'}
        </td>
        <td colspan="2" class="info-box">
          PILOTAGE / AVANCEMENT :<br>
          <span style="font-size:8pt; font-weight:normal;">\${escHtml(sanitizeFormula(owner))} &bull; \${escHtml(sanitizeFormula(exporter))}</span>
        </td>
        <td colspan="1" style="background:#FFC000; font-weight:bold; font-size:8.5pt; text-align:center; border:1px solid #000;">
          CODE / BADGES :<br><strong>\${escHtml(sanitizeFormula(badges))}</strong>
        </td>
      </tr>

      <!-- Empty separator line -->
      <tr style="height:8px;"><td colspan="13" style="border:none; height:8px;"></td></tr>

      <!-- Multi-Level PMG Table Header (Image 2 Style) -->
      <thead>
        <tr>
          <th style="width: 140px; background-color: #002060;">
            <u>Briques Primaires</u><br>
            <span style="font-weight:normal; font-size:8pt; color:#BDD7EE;">Niveau : N0 &#9660;</span>
          </th>
          <th style="width: 150px; background-color: #002060;">
            <u>Processus Métier Macro</u><br>
            <span style="font-weight:normal; font-size:8pt; color:#BDD7EE;">Niveau : N1 &#9660;</span>
          </th>
          <th style="width: 150px; background-color: #002060;">
            <u>Sous-Processus Métier</u><br>
            <span style="font-weight:normal; font-size:8pt; color:#BDD7EE;">Niveau : N2 &#9660;</span>
          </th>
          <th style="width: 140px; background-color: #002060;">
            <u>Sous-Processus Métier</u><br>
            <span style="font-weight:normal; font-size:8pt; color:#BDD7EE;">Niveau : N3 &#9660;</span>
          </th>
          <th style="width: 150px; background-color: #002060;">
            <u>Tâche N4</u><br>
            <span style="font-weight:normal; font-size:8pt; color:#FFC000;">(Activité Finale) &#9660;</span>
          </th>
          <th style="width: 100px; background-color: #002060;">
            <u>Entité</u> &#9660;
          </th>
          <th style="width: 130px; background-color: #002060;">
            <u>groupe utilisateur</u> &#9660;
          </th>
          <th style="width: 130px; background-color: #002060;">
            &larr; Input (Quoi) &#9660;
          </th>
          <th style="width: 130px; background-color: #002060;">
            Output (Quoi) &rarr; &#9660;
          </th>
          <th style="width: 120px; background-color: #002060;">
            <u>Mode de réalisation</u><br>
            <span style="font-weight:normal; font-size:7.5pt;">(Auto/Manuelle/SP0) &#9660;</span>
          </th>
          <th style="width: 160px; background-color: #002060;">
            <u>Applicable dans quel cas ?</u><br>
            <span style="font-weight:normal; font-size:7.5pt;">(Exemple FH ou PTTA...) &#9660;</span>
          </th>
          <th style="width: 90px; background-color: #002060;">
            <u>Processus</u> &#9660;
          </th>
          <th style="width: 180px; background-color: #002060;">
            <u>Commentaire / Doc</u> &#9660;
          </th>
        </tr>
      </thead>
      <tbody>
  \`;

  // 6. Output Table Data Rows with Smart Merging and Styling
  for (let r = 0; r < numRows; r++) {
    const row = rawRows[r];
    const span = spans[r];

    html += '<tr>';

    // Col N0 : Brique Primaire
    if (span['show_colN0']) {
      const n0Val = row.colN0;
      const n0Bg = n0Palette[Array.from(n0ColorMap.keys()).indexOf(n0Val) % n0Palette.length] || '#FFC000';
      const n0Class = n0Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN0']}" \${n0Class} style="background-color:\${n0Bg}; font-weight:900; font-size:11pt; text-align:center; vertical-align:middle; border:1.5px solid #000000; padding:10px 4px;">\${escHtml(sanitizeFormula(n0Val))}</td>\`;
    }

    // Col N1 : Macro Processus
    if (span['show_colN1']) {
      const n1Val = row.colN1;
      const n1Class = n1Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN1']}" \${n1Class} style="font-weight:bold; vertical-align:middle; padding:6px; background:#FAFAFA;">\${escHtml(sanitizeFormula(n1Val))}</td>\`;
    }

    // Col N2 : Sous-Processus L2
    if (span['show_colN2']) {
      const n2Val = row.colN2;
      const n2Class = n2Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN2']}" \${n2Class} style="vertical-align:middle; padding:6px;">\${escHtml(sanitizeFormula(n2Val))}</td>\`;
    }

    // Col N3 : Sous-Processus L3
    if (span['show_colN3']) {
      const n3Val = row.colN3;
      const n3Class = n3Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN3']}" \${n3Class} style="vertical-align:middle; padding:6px;">\${escHtml(sanitizeFormula(n3Val))}</td>\`;
    }

    // Col N4 : Tâche Finale
    const n4Val = row.colN4;
    const n4Class = n4Val === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${n4Class} style="font-weight:600; padding:6px;">\${escHtml(sanitizeFormula(n4Val))}</td>\`;

    // Entité
    const entClass = row.entity === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${entClass} style="text-align:center; font-weight:700; background:#F8FAFC;">\${escHtml(sanitizeFormula(row.entity))}</td>\`;

    // Groupe Utilisateur
    const grpClass = row.userGroup === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${grpClass} style="text-align:center; font-family:Consolas, monospace; font-size:8.5pt;">\${escHtml(sanitizeFormula(row.userGroup))}</td>\`;

    // Inputs
    const inClass = row.inputs === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${inClass} style="color:#1F4E78; font-size:8.5pt;">\${escHtml(sanitizeFormula(row.inputs))}</td>\`;

    // Outputs
    const outClass = row.outputs === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${outClass} style="color:#1F4E78; font-size:8.5pt;">\${escHtml(sanitizeFormula(row.outputs))}</td>\`;

    // Mode
    html += \`<td style="text-align:center; font-weight:600; background:#FDFDFD;">\${escHtml(sanitizeFormula(row.mode))}</td>\`;

    // Applicable dans quel cas
    const caseClass = row.applicableCase === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${caseClass} style="font-size:8.5pt;">\${escHtml(sanitizeFormula(row.applicableCase))}</td>\`;

    // Processus Parent
    html += \`<td style="text-align:center; font-weight:700; color:#002060; font-size:8.5pt;">\${escHtml(sanitizeFormula(row.parentProcess))}</td>\`;

    // Commentaires
    html += \`<td style="color:#595959; font-size:8.5pt;">\${escHtml(sanitizeFormula(row.comment))}</td>\`;

    html += '</tr>';
  }

  html += \`
      </tbody>
    </table>
  </body>
  </html>
  \`;

  // 7. Trigger Excel (.xls) Download
  const blob = new Blob(["\\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', \`pmg_matrice_\${processId || 'process'}.xls\`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};`;

const oldExportFunc = pmgCode.substring(
  pmgCode.indexOf('window.exportPmgExcel = function() {'),
  pmgCode.indexOf('window.exportPmgPDF = function() {')
);

pmgCode = pmgCode.replace(oldExportFunc, newExportPmgExcel + '\n\n');
fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log('🎉 Successfully replaced exportPmgExcel in pmg.js!');
