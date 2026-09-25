const fs = require('fs');

// Mock window
global.window = global;
require('../js/duplicates.js');

const sampleRows = [
  { name: 'Xnodes', status: 'invalid', parentProcess: 'Process_A', fileName: 'order.bpmn', role: 'write', elementName: 'Task 1' },
  { name: 'x_nodes', status: 'invalid', parentProcess: 'Process_A', fileName: 'order.bpmn', role: 'read', elementName: 'Task 2' },
  { name: 'xnodes', status: 'valid', parentProcess: 'Process_B', fileName: 'delivery.bpmn', role: 'in', elementName: 'Subproc' },
  { name: 'idClient', status: 'valid', parentProcess: 'Process_A', fileName: 'order.bpmn', role: 'read', elementName: 'Task 3' },
  { name: 'client_id', status: 'invalid', parentProcess: 'Process_B', fileName: 'delivery.bpmn', role: 'out', elementName: 'Task 4' },
  { name: 'validVar', status: 'valid', parentProcess: 'Process_A', fileName: 'order.bpmn', role: 'read', elementName: 'Task 5' }
];

console.log("Testing detectVariableDuplicates...");
const result = window.DuplicatesEngine.detectVariableDuplicates(sampleRows);
console.log("Total clusters found:", result.totalClustersCount);
console.log("Total duplicates count:", result.totalDuplicatesCount);
console.log("Inter-process conflicts:", result.interProcessConflictsCount);

result.clusters.forEach(c => {
  console.log(`\nCluster [${c.id}] -> Recommended Target: ${c.recommendedName} (Type: ${c.primaryLabel}, AvgSim: ${c.avgSimilarityPercent}%, InterProc: ${c.isInterProcess})`);
  c.variants.forEach(v => {
    console.log(`  - Variant: ${v.name} (Diff: ${v.diffInfo.diffDescription}, Occ: ${v.occurrencesCount})`);
  });
});

console.log("\nTesting generateVisualDiff('x_nodes', 'xNodes')...");
const diff = window.DuplicatesEngine.generateVisualDiff('x_nodes', 'xNodes');
console.log("Variant diff HTML:", diff.variantDiffHtml);
console.log("Target diff HTML:", diff.targetDiffHtml);

console.log("\nTesting generateCoherenceGraphData...");
const graphData = window.DuplicatesEngine.generateCoherenceGraphData(result.clusters);
console.log("Nodes generated:", graphData.nodes.length);
console.log("Edges generated:", graphData.edges.length);

console.log("\nAll tests passed successfully!");
