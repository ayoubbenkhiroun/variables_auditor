const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let pmgCode = fs.readFileSync(pmgPath, 'utf8');

// 1. Update exportPmgExcel to include perfect AutoFilter in WorksheetOptions and thead tr
const oldExportExcelStart = "window.exportPmgExcel = function() {";
const oldExportExcelEnd = "window.exportPmgPDF = function() {";

const exportExcelIdx = pmgCode.indexOf(oldExportExcelStart);
const exportPdfIdx = pmgCode.indexOf(oldExportExcelEnd);

if (exportExcelIdx === -1 || exportPdfIdx === -1) {
  console.error("Could not locate exportPmgExcel in pmg.js");
  process.exit(1);
}

const currentExportExcel = pmgCode.substring(exportExcelIdx, exportPdfIdx);

// Ensure split horizontal is 3 and AutoFilter is added to both WorksheetOptions and ExcelWorksheet
let updatedExportExcel = currentExportExcel
  .replace(/<x:SplitHorizontal>\d+<\/x:SplitHorizontal>/g, '<x:SplitHorizontal>3</x:SplitHorizontal>')
  .replace(/<x:TopRowBottomPane>\d+<\/x:TopRowBottomPane>/g, '<x:TopRowBottomPane>3</x:TopRowBottomPane>');

if (!updatedExportExcel.includes('<x:AutoFilter')) {
  updatedExportExcel = updatedExportExcel.replace(
    '</x:WorksheetOptions>',
    `       <x:AutoFilter x:Range="R3C1:R\${numRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>\n      </x:WorksheetOptions>\n      <x:AutoFilter x:Range="R3C1:R\${numRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>`
  );
} else {
  updatedExportExcel = updatedExportExcel.replace(
    /<x:AutoFilter[^>]*\/>/g,
    `<x:AutoFilter x:Range="R3C1:R\${numRows + 3}C13" xmlns="urn:schemas-microsoft-com:office:excel"/>`
  );
}

// Add x:autofilter="all" to thead and tr
updatedExportExcel = updatedExportExcel.replace(
  '<thead>\n        <tr>',
  '<thead>\n        <tr x:autofilter="all">'
);
updatedExportExcel = updatedExportExcel.replace(
  /<th style="/g,
  '<th x:autofilter="all" style="'
);

pmgCode = pmgCode.substring(0, exportExcelIdx) + updatedExportExcel + pmgCode.substring(exportPdfIdx);

// 2. Update exportPmgMultiSheetExcel to add ws['!autofilter'] for SheetJS
const oldMultiSheetStart = "window.exportPmgMultiSheetExcel = function() {";
const oldMultiSheetEnd = "// FEATURE 6: DIAGRAMMES & FLUX INTERACTIFS";

const multiSheetIdx = pmgCode.indexOf(oldMultiSheetStart);
const multiSheetEndIdx = pmgCode.indexOf(oldMultiSheetEnd);

if (multiSheetIdx !== -1 && multiSheetEndIdx !== -1) {
  let currentMultiSheet = pmgCode.substring(multiSheetIdx, multiSheetEndIdx);
  
  // Update ws2
  if (!currentMultiSheet.includes("ws2['!autofilter']")) {
    currentMultiSheet = currentMultiSheet.replace(
      "const ws2 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws2Data) : ws2Data);",
      "const ws2 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws2Data) : ws2Data);\n  ws2['!autofilter'] = { ref: `A1:J\${activities.length + 1}` };\n  ws2['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 40 }];"
    );
  }
  
  // Update ws3
  if (!currentMultiSheet.includes("ws3['!autofilter']")) {
    currentMultiSheet = currentMultiSheet.replace(
      "const ws3 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws3Data) : ws3Data);",
      "const ws3 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws3Data) : ws3Data);\n  const lastColLetter = XLSX.utils.encode_col ? XLSX.utils.encode_col(ws3Header.length - 1) : 'Z';\n  ws3['!autofilter'] = { ref: `A1:\${lastColLetter}\${activities.length + 1}` };"
    );
  }
  
  // Update ws4
  if (!currentMultiSheet.includes("ws4['!autofilter']")) {
    currentMultiSheet = currentMultiSheet.replace(
      "const ws4 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws4Data) : ws4Data);",
      "const ws4 = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(ws4Data) : ws4Data);\n  ws4['!autofilter'] = { ref: `A1:D\${varMap.size + 1}` };\n  ws4['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 30 }];"
    );
  }
  
  pmgCode = pmgCode.substring(0, multiSheetIdx) + currentMultiSheet + pmgCode.substring(multiSheetEndIdx);
}

fs.writeFileSync(pmgPath, pmgCode, 'utf8');
console.log("🎉 Successfully configured ready-to-use AutoFilters in exportPmgExcel and exportPmgMultiSheetExcel!");
