const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const divOpen = (html.match(/<div[\s>]/gi) || []).length;
const divClose = (html.match(/<\/div>/gi) || []).length;

console.log(`HTML Div Check -> Open: ${divOpen}, Close: ${divClose}, Difference: ${divOpen - divClose}`);
