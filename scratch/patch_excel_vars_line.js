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

  // Helper to clean variable names and format as 1 per line in Excel with bullet points
  function formatVarListForExcel(vars) {
    if (!vars || vars.length === 0) return 'NA';

    const cleaned = [];
    vars.forEach(v => {
      if (!v) return;
      let s = String(v).trim();
      if (s.startsWith('=')) s = s.substring(1).trim();
      const idx = s.indexOf('(');
      if (idx !== -1) s = s.substring(0, idx).trim();
      if (s.includes('=')) s = s.split('=')[0].trim();
      if (s.includes(':')) s = s.split(':')[0].trim();
      s = s.replace(/^[="'\\[]+|[="'\\]]+$/g, '').trim();
      if (s && !cleaned.includes(s)) cleaned.push(s);
    });

    if (cleaned.length === 0) return 'NA';

    return cleaned.map(v => '• ' + escHtml(sanitizeFormula(v))).join('<br style="mso-data-placement:same-cell;" />');
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

  // 3. Strict Multi-Level Hierarchy Construction (N0, N1, N2, N3, N4)
  const rawRows = sortedActivities.map(act => {
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

    const formattedInputs = formatVarListForExcel(act.inputs);
    const formattedOutputs = formatVarListForExcel(act.outputs);

    let modeLabel = act.realizationMode || ((act.type || '').toLowerCase().includes('call') ? 'Call Activity' : 'Manuelle');
    if ((act.type || '').toLowerCase().includes('service')) modeLabel = 'Automatique (Service)';

    return {
      colN0: colN0 || "NA",
      colN1: colN1 || "NA",
      colN2: colN2 || "NA",
      colN3: colN3 || "NA",
      colN4: colN4 || "NA",
      entity: (act.entity && act.entity !== 'Non défini') ? act.entity : 'NA',
      userGroup: cleanGroup || 'NA',
      inputsHtml: formattedInputs,
      outputsHtml: formattedOutputs,
      mode: modeLabel,
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
       <x:AutoFilter x:Range="R3C1:R\${numRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
      </x:WorksheetOptions>
      <x:AutoFilter x:Range="R3C1:R\${numRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>
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
            Inputs (Entrées)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Variables Lues</span>
          </th>
          <th x:autofilter="all" style="width: 220px; background-color: #002060;">
            Outputs (Sorties)<br>
            <span style="font-weight:normal; font-size:7.5pt; color:#93C5FD;">Variables Produites</span>
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

  // 6. Output Table Data Rows with Refined Hierarchy & Line Breaks for Variables
  for (let r = 0; r < numRows; r++) {
    const row = rawRows[r];
    const span = spans[r];

    html += '<tr>';

    // Col N0 : Brique Primaire
    if (span['show_colN0']) {
      const n0Val = row.colN0;
      const n0Bg = n0Palette[Array.from(n0ColorMap.keys()).indexOf(n0Val) % n0Palette.length] || '#FFC000';
      const n0Class = n0Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN0']}" \${n0Class} style="background-color:\${n0Bg}; font-weight:900; font-size:10.5pt; text-align:center; vertical-align:middle; border:1.5px solid #000000; padding:10px 6px;">\${escHtml(sanitizeFormula(n0Val))}</td>\`;
    }

    // Col N1 : Macro Processus
    if (span['show_colN1']) {
      const n1Val = row.colN1;
      const n1Class = n1Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN1']}" \${n1Class} style="font-weight:bold; font-size:9pt; vertical-align:middle; padding:8px 6px; background:#FAFAFA;">\${escHtml(sanitizeFormula(n1Val))}</td>\`;
    }

    // Col N2 : Sous-Processus L2
    if (span['show_colN2']) {
      const n2Val = row.colN2;
      const n2Class = n2Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN2']}" \${n2Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">\${escHtml(sanitizeFormula(n2Val))}</td>\`;
    }

    // Col N3 : Sous-Processus L3
    if (span['show_colN3']) {
      const n3Val = row.colN3;
      const n3Class = n3Val === 'NA' ? 'class="cell-na"' : '';
      html += \`<td rowspan="\${span['span_colN3']}" \${n3Class} style="vertical-align:middle; padding:7px 6px; font-size:9pt;">\${escHtml(sanitizeFormula(n3Val))}</td>\`;
    }

    // Col N4 : Tâche Finale
    const n4Val = row.colN4;
    const n4Class = n4Val === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${n4Class} style="font-weight:600; font-size:9pt; padding:7px 8px; vertical-align:middle;">\${escHtml(sanitizeFormula(n4Val))}</td>\`;

    // Entité
    const entClass = row.entity === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${entClass} style="text-align:center; font-weight:700; color:#0F172A; background:#F8FAFC; vertical-align:middle;">\${escHtml(sanitizeFormula(row.entity))}</td>\`;

    // Groupe Utilisateur
    const grpClass = row.userGroup === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${grpClass} style="text-align:center; font-family:'Cascadia Code', Consolas, Calibri, monospace; font-size:8.5pt; color:#0F172A; vertical-align:middle;">\${escHtml(sanitizeFormula(row.userGroup))}</td>\`;

    // Inputs (Chaque variable sur sa propre ligne)
    const inClass = row.inputsHtml === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${inClass} style="color:#1E3A8A; font-family:'Segoe UI', Calibri, Arial, sans-serif; font-size:8.5pt; vertical-align:top; padding:6px 8px; line-height:1.4;">\${row.inputsHtml}</td>\`;

    // Outputs (Chaque variable sur sa propre ligne)
    const outClass = row.outputsHtml === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${outClass} style="color:#1E3A8A; font-family:'Segoe UI', Calibri, Arial, sans-serif; font-size:8.5pt; vertical-align:top; padding:6px 8px; line-height:1.4;">\${row.outputsHtml}</td>\`;

    // Mode
    let modeBg = '#FFFFFF', modeColor = '#1E293B';
    if (row.mode.includes('Call')) { modeBg = '#FAF5FF'; modeColor = '#6D28D9'; }
    else if (row.mode.includes('Auto')) { modeBg = '#ECFDF5'; modeColor = '#047857'; }
    else if (row.mode.includes('Manuelle')) { modeBg = '#EFF6FF'; modeColor = '#1E40AF'; }
    html += \`<td style="text-align:center; font-weight:700; font-size:8.5pt; background:\${modeBg}; color:\${modeColor}; vertical-align:middle;">\${escHtml(sanitizeFormula(row.mode))}</td>\`;

    // Applicable dans quel cas
    const caseClass = row.applicableCase === 'NA' ? 'class="cell-na"' : '';
    html += \`<td \${caseClass} style="font-size:8.5pt; vertical-align:middle;">\${escHtml(sanitizeFormula(row.applicableCase))}</td>\`;

    // Processus Parent
    html += \`<td style="text-align:center; font-weight:700; color:#002060; font-size:8.5pt; background:#F1F5F9; vertical-align:middle;">\${escHtml(sanitizeFormula(row.parentProcess))}</td>\`;

    // Commentaires
    html += \`<td style="color:#475569; font-size:8.5pt; vertical-align:middle;">\${escHtml(sanitizeFormula(row.comment))}</td>\`;

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
console.log("🎉 Successfully refined exportPmgExcel design with in-cell line breaks for variables!");
