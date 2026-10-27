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

  // Helper to clean variable names
  function cleanVarName(v) {
    if (!v) return '';
    let s = String(v).trim();
    if (s.startsWith('=')) s = s.substring(1).trim();
    const idx = s.indexOf('(');
    if (idx !== -1) s = s.substring(0, idx).trim();
    if (s.includes('=')) s = s.split('=')[0].trim();
    if (s.includes(':')) s = s.split(':')[0].trim();
    s = s.replace(/^[="'\\[]+|[="'\\]]+$/g, '').trim();
    return s;
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

  // Map activities by uniqueId, id, and name for hierarchical ancestor traversal
  const nodeMapByUniqueId = new Map();
  const nodeMapById = new Map();
  const nodeMapByName = new Map();

  sortedActivities.forEach(act => {
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

  // 3. Strict Multi-Level Hierarchy Construction (N0, N1, N2, N3, N4) & Variable Rows Extraction
  const actBlocks = sortedActivities.map(act => {
    const parents = getAncestors(act);
    const caseVal = act.applicableCase || '';
    const commentVal = act.comment || '';

    let colN0 = act.rootParentName || roots[0].name || 'Processus Principal';
    let colN1 = "NA", colN2 = "NA", colN3 = "NA", colN4 = "NA";

    if (parents.length === 0) {
      if (act.level === 2 && act.parentProcessName && act.parentProcessName !== colN0) {
        colN1 = act.parentProcessName;
        colN2 = act.name;
      } else if (act.level >= 3 && act.parentProcessName && act.parentProcessName !== colN0) {
        colN1 = act.parentProcessName;
        colN2 = act.parentProcessName;
        colN3 = act.name;
      } else {
        colN1 = act.name;
      }
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

    const cleanGroup = (typeof window.cleanPmgUserGroupName === 'function')
      ? window.cleanPmgUserGroupName(act.userGroup)
      : (act.userGroup || '');

    const parentProcLabel = act.parentProcessName || act.rootParentName || roots[0].name || 'VDR';

    let modeLabel = act.realizationMode || ((act.type || '').toLowerCase().includes('call') ? 'Call Activity' : 'Manuelle');
    if ((act.type || '').toLowerCase().includes('service')) modeLabel = 'Automatique (Service)';

    // Extract individual clean variables list for Inputs and Outputs
    const rawInputs = (act.inputs || []).map(cleanVarName).filter(v => v && v !== 'NA');
    const rawOutputs = (act.outputs || []).map(cleanVarName).filter(v => v && v !== 'NA');

    // Deduplicate while keeping order
    const inList = Array.from(new Set(rawInputs));
    const outList = Array.from(new Set(rawOutputs));

    // Each variable gets its own Excel table row!
    const rowCount = Math.max(inList.length, outList.length, 1);

    return {
      colN0: colN0 || "NA",
      colN1: colN1 || "NA",
      colN2: colN2 || "NA",
      colN3: colN3 || "NA",
      colN4: colN4 || "NA",
      entity: (act.entity && act.entity !== 'Non défini') ? act.entity : 'NA',
      userGroup: cleanGroup || 'NA',
      inList,
      outList,
      rowCount,
      mode: modeLabel,
      applicableCase: caseVal || 'NA',
      parentProcess: parentProcLabel,
      comment: commentVal || '—',
      act
    };
  });

  // 4. Compute Merged Spans for N0, N1, N2, N3 accounting for variable sub-rows
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

  // Total Excel table data rows
  const totalExcelDataRows = actBlocks.reduce((sum, a) => sum + a.rowCount, 0);

  // N0 Vibrant Distinct Background Colors
  const n0Palette = ['#FFC000', '#92D050', '#00B0F0', '#FCE4D6', '#E2EFDA', '#D9E1F2', '#FFF2CC'];
  const n0ColorMap = new Map();
  let colorIdx = 0;
  actBlocks.forEach(r => {
    if (!n0ColorMap.has(r.colN0)) {
      n0ColorMap.set(r.colN0, n0Palette[colorIdx % n0Palette.length]);
      colorIdx++;
    }
  });

  // Unique Slicer elements for header cards
  const uniqueN1 = Array.from(new Set(actBlocks.map(r => r.colN1).filter(v => v !== 'NA')));
  const uniqueN2 = Array.from(new Set(actBlocks.map(r => r.colN2).filter(v => v !== 'NA')));
  const uniqueEntities = Array.from(new Set(actBlocks.map(r => r.entity).filter(v => v !== 'NA')));

  let slicerN1Html = uniqueN1.slice(0, 6).map(n => \`<div style="background:#548235; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">\${escHtml(n)}</div>\`).join('');
  let slicerN2Html = uniqueN2.slice(0, 6).map(n => \`<div style="background:#ED7D31; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">\${escHtml(n)}</div>\`).join('');
  let slicerEntHtml = uniqueEntities.slice(0, 5).map(e => \`<div style="background:#2E75B6; color:#fff; padding:2px 6px; margin-bottom:2px; font-size:7.5pt; border-radius:3px; font-weight:600;">\${escHtml(e)}</div>\`).join('');

  // 5. Construct Refined Excel Table XML/HTML
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
      <x:Name>PMG Matrice</x:Name>
      <x:WorksheetOptions>
       <x:DisplayGridlines/>
       <x:FreezePanes/>
       <x:FrozenNoSplit/>
       <x:SplitHorizontal>3</x:SplitHorizontal>
       <x:TopRowBottomPane>3</x:TopRowBottomPane>
       <x:AutoFilter x:Range="R3C1:R\${totalExcelDataRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
      </x:WorksheetOptions>
      <x:AutoFilter x:Range="R3C1:R\${totalExcelDataRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
     </x:ExcelWorksheet>
    </x:ExcelWorksheets>
   </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #1E293B; }
    table { border-collapse: collapse; width: 100%; table-layout: auto; }
    th { background-color: #002060; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #001233; padding: 10px 8px; vertical-align: middle; white-space: normal; line-height: 1.3; }
    td { font-size: 9pt; border: 1px solid #D9D9D9; padding: 6px 8px; vertical-align: middle; mso-number-format:'\\\\@'; }
    .cell-na { background-color: #F8FAFC !important; color: #94A3B8 !important; font-style: italic !important; text-align: center !important; font-weight: normal !important; }
    .cell-empty { color: #CBD5E1 !important; text-align: center !important; }
    .title-banner { background-color: #FFC000; color: #000000; font-size: 13pt; font-weight: 900; text-align: center; border: 2px solid #000000; padding: 14px 10px; }
    .slicer-card { background-color: #FFFFFF; border: 1px solid #CBD5E1; vertical-align: top; padding: 5px; font-size: 8pt; }
    .slicer-header { font-weight: bold; text-align: center; padding: 3px 4px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; border-radius: 2px; }
    .info-box { background-color: #548235; color: #FFFFFF; font-weight: bold; text-align: center; padding: 8px 6px; font-size: 9pt; border: 1px solid #000; }
  </style>
  </head>
  <body>
    <table>
      <!-- Row 1: Big Yellow Header Title Block (Modèle Bouygues PMG) -->
      <tr>
        <td colspan="5" class="title-banner">
          \${escHtml(sanitizeFormula(rootTitles))}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#E2EFDA; color:#385723;">Processus Métier Macro - Niveau N1</div>
          \${slicerN1Html || '<div style="color:#888; text-align:center;">Niveau N1</div>'}
        </td>
        <td colspan="2" class="slicer-card">
          <div class="slicer-header" style="background:#FCE4D6; color:#C65911;">Sous-Processus Métier - Niveau N2</div>
          \${slicerN2Html || '<div style="color:#888; text-align:center;">Niveau N2</div>'}
        </td>
        <td colspan="1" class="slicer-card">
          <div class="slicer-header" style="background:#D9E1F2; color:#1F4E78;">Entités</div>
          \${slicerEntHtml || '<div style="color:#888; text-align:center;">Toutes</div>'}
        </td>
        <td colspan="2" class="info-box">
          PILOTAGE / AVANCEMENT :<br>
          <span style="font-size:8pt; font-weight:normal; opacity:0.95;">\${escHtml(sanitizeFormula(owner))} &bull; \${escHtml(sanitizeFormula(exporter))}</span>
        </td>
        <td colspan="1" style="background:#FFC000; color:#000; font-weight:bold; font-size:8.5pt; text-align:center; border:1px solid #000; padding:6px;">
          CODE / BADGES :<br><strong>\${escHtml(sanitizeFormula(badges))}</strong>
        </td>
      </tr>

      <!-- Empty separator line -->
      <tr style="height:6px;"><td colspan="13" style="border:none; height:6px;"></td></tr>

      <!-- Multi-Level PMG Table Header -->
      <thead>
        <tr x:autofilter="all">
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Briques Primaires<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N0</span>
          </th>
          <th x:autofilter="all" style="width: 200px; background-color: #002060;">
            Processus Métier Macro<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N1</span>
          </th>
          <th x:autofilter="all" style="width: 190px; background-color: #002060;">
            Sous-Processus Métier<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N2</span>
          </th>
          <th x:autofilter="all" style="width: 190px; background-color: #002060;">
            Sous-Processus Métier<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Niveau N3</span>
          </th>
          <th x:autofilter="all" style="width: 240px; background-color: #002060;">
            Tâche Métier<br>
            <span style="font-weight:bold; font-size:7.5pt; color:#FDE047;">Niveau N4 (Finale)</span>
          </th>
          <th x:autofilter="all" style="width: 110px; background-color: #002060;">
            Entité<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Lane / Pôle</span>
          </th>
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Groupe Utilisateur<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Candidate Group</span>
          </th>
          <th x:autofilter="all" style="width: 220px; background-color: #002060;">
            Input (Quoi)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">1 variable / ligne</span>
          </th>
          <th x:autofilter="all" style="width: 220px; background-color: #002060;">
            Output (Quoi)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">1 variable / ligne</span>
          </th>
          <th x:autofilter="all" style="width: 130px; background-color: #002060;">
            Mode de Réalisation<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Auto / Manuelle / SP0</span>
          </th>
          <th x:autofilter="all" style="width: 170px; background-color: #002060;">
            Applicable dans quel cas ?<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Condition / Règle</span>
          </th>
          <th x:autofilter="all" style="width: 150px; background-color: #002060;">
            Processus Parent<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Origine BPMN</span>
          </th>
          <th x:autofilter="all" style="width: 230px; background-color: #002060;">
            Commentaires / Doc<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Spécifications</span>
          </th>
        </tr>
      </thead>
      <tbody>
  \`;

  // 6. Output Table Data Rows: EACH VARIABLE ON ITS OWN EXCEL ROW (<tr>)
  for (let i = 0; i < numActs; i++) {
    const act = actBlocks[i];
    const span = spans[i];
    const count = act.rowCount;

    for (let r = 0; r < count; r++) {
      html += '<tr>';

      // Values for Input and Output on this specific row
      const inVal = act.inList[r] || (act.inList.length === 0 ? 'NA' : '—');
      const outVal = act.outList[r] || (act.outList.length === 0 ? 'NA' : '—');

      const inClass = inVal === 'NA' ? 'class="cell-na"' : (inVal === '—' ? 'class="cell-empty"' : '');
      const outClass = outVal === 'NA' ? 'class="cell-na"' : (outVal === '—' ? 'class="cell-empty"' : '');

      if (r === 0) {
        // Col N0 : Brique Primaire
        if (span['show_colN0']) {
          const n0Val = act.colN0;
          const n0Bg = n0Palette[Array.from(n0ColorMap.keys()).indexOf(n0Val) % n0Palette.length] || '#FFC000';
          const n0Class = n0Val === 'NA' ? 'class="cell-na"' : '';
          html += \`<td rowspan="\${span['span_colN0']}" \${n0Class} style="background-color:\${n0Bg}; font-weight:900; font-size:10.5pt; text-align:center; vertical-align:middle; border:1.5px solid #000000; padding:10px 6px;">\${escHtml(sanitizeFormula(n0Val))}</td>\`;
        }

        // Col N1 : Macro Processus
        if (span['show_colN1']) {
          const n1Val = act.colN1;
          const n1Class = n1Val === 'NA' ? 'class="cell-na"' : '';
          html += \`<td rowspan="\${span['span_colN1']}" \${n1Class} style="font-weight:bold; font-size:9pt; vertical-align:middle; padding:8px 6px; background:#FAFAFA;">\${escHtml(sanitizeFormula(n1Val))}</td>\`;
        }

        // Col N2 : Sous-Processus L2
        if (span['show_colN2']) {
          const n2Val = act.colN2;
          const n2Class = n2Val === 'NA' ? 'class="cell-na"' : '';
          html += \`<td rowspan="\${span['span_colN2']}" \${n2Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">\${escHtml(sanitizeFormula(n2Val))}</td>\`;
        }

        // Col N3 : Sous-Processus L3
        if (span['show_colN3']) {
          const n3Val = act.colN3;
          const n3Class = n3Val === 'NA' ? 'class="cell-na"' : '';
          html += \`<td rowspan="\${span['span_colN3']}" \${n3Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">\${escHtml(sanitizeFormula(n3Val))}</td>\`;
        }

        // Col N4 : Tâche Finale
        const n4Val = act.colN4;
        const n4Class = n4Val === 'NA' ? 'class="cell-na"' : '';
        html += \`<td rowspan="\${count}" \${n4Class} style="font-weight:600; font-size:9pt; padding:7px 8px; vertical-align:middle;">\${escHtml(sanitizeFormula(n4Val))}</td>\`;

        // Entité
        const entClass = act.entity === 'NA' ? 'class="cell-na"' : '';
        html += \`<td rowspan="\${count}" \${entClass} style="text-align:center; font-weight:700; color:#0F172A; background:#F8FAFC; vertical-align:middle;">\${escHtml(sanitizeFormula(act.entity))}</td>\`;

        // Groupe Utilisateur
        const grpClass = act.userGroup === 'NA' ? 'class="cell-na"' : '';
        html += \`<td rowspan="\${count}" \${grpClass} style="text-align:center; font-family:'Cascadia Code', Consolas, Calibri, monospace; font-size:8.5pt; color:#0F172A; vertical-align:middle;">\${escHtml(sanitizeFormula(act.userGroup))}</td>\`;

        // Input 1st row
        html += \`<td \${inClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">\${escHtml(sanitizeFormula(inVal))}</td>\`;

        // Output 1st row
        html += \`<td \${outClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">\${escHtml(sanitizeFormula(outVal))}</td>\`;

        // Mode
        let modeBg = '#FFFFFF', modeColor = '#1E293B';
        if (act.mode.includes('Call')) { modeBg = '#FAF5FF'; modeColor = '#6D28D9'; }
        else if (act.mode.includes('Auto')) { modeBg = '#ECFDF5'; modeColor = '#047857'; }
        else if (act.mode.includes('Manuelle')) { modeBg = '#EFF6FF'; modeColor = '#1E40AF'; }
        html += \`<td rowspan="\${count}" style="text-align:center; font-weight:700; font-size:8.5pt; background:\${modeBg}; color:\${modeColor}; vertical-align:middle;">\${escHtml(sanitizeFormula(act.mode))}</td>\`;

        // Applicable dans quel cas
        const caseClass = act.applicableCase === 'NA' ? 'class="cell-na"' : '';
        html += \`<td rowspan="\${count}" \${caseClass} style="font-size:8.5pt; vertical-align:middle;">\${escHtml(sanitizeFormula(act.applicableCase))}</td>\`;

        // Processus Parent
        html += \`<td rowspan="\${count}" style="text-align:center; font-weight:700; color:#002060; font-size:8.5pt; background:#F1F5F9; vertical-align:middle;">\${escHtml(sanitizeFormula(act.parentProcess))}</td>\`;

        // Commentaires
        html += \`<td rowspan="\${count}" style="color:#475569; font-size:8.5pt; vertical-align:middle;">\${escHtml(sanitizeFormula(act.comment))}</td>\`;
      } else {
        // Sub-rows (r > 0): Only output the Input and Output columns
        html += \`<td \${inClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">\${escHtml(sanitizeFormula(inVal))}</td>\`;
        html += \`<td \${outClass} style="color:#1E3A8A; font-family:'Cascadia Code', Consolas, Calibri, sans-serif; font-size:8.5pt; padding:5px 8px; font-weight:600;">\${escHtml(sanitizeFormula(outVal))}</td>\`;
      }

      html += '</tr>';
    }
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

const oldExportStart = "window.exportPmgExcel = function() {";
const oldExportEnd = "window.exportPmgPDF = function() {";

const startIdx = pmgCode.indexOf(oldExportStart);
const endIdx = pmgCode.indexOf(oldExportEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find exportPmgExcel in pmg.js");
  process.exit(1);
}

pmgCode = pmgCode.substring(0, startIdx) + newExportPmgExcel + '\n\n' + pmgCode.substring(endIdx);
fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log("🎉 Successfully updated exportPmgExcel: Each variable now has its own dedicated Excel table row!");
