const fs = require('fs');
const code = fs.readFileSync('js/pmg.js', 'utf8');
console.log('Has x:AutoFilter:', code.includes('x:AutoFilter'));
console.log('Has x:autofilter="all":', code.includes('x:autofilter="all"'));
console.log("Has ws2 autofilter:", code.includes("ws2['!autofilter']"));
console.log("Has ws3 autofilter:", code.includes("ws3['!autofilter']"));
console.log("Has ws4 autofilter:", code.includes("ws4['!autofilter']"));
