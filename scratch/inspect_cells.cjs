const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Thosiba\\.gemini\\antigravity\\brain\\d5829976-f330-4eab-9146-c9989ed7fd6e\\.system_generated\\steps\\186\\content.md', 'utf8');

const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
const tables = [];
let match;
while ((match = tableRegex.exec(html)) !== null) {
  tables.push(match[1]);
}

const tableHtml = tables[0];
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const rows = [];
let rowMatch;
while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
  rows.push(rowMatch[1]);
}

function printRowDetails(rowIndex) {
  const rowHtml = rows[rowIndex - 1];
  if (!rowHtml) return;
  const cellRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  let colIndex = 0;
  console.log(`\n=== Row ${rowIndex} Details ===`);
  while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
    colIndex++;
    if (colIndex > 10) break;
    const attrs = cellMatch[1];
    const val = cellMatch[2].replace(/<[^>]*>/g, '').trim();
    const rowspan = attrs.match(/rowspan="(\d+)"/i) ? attrs.match(/rowspan="(\d+)"/i)[1] : 1;
    const colspan = attrs.match(/colspan="(\d+)"/i) ? attrs.match(/colspan="(\d+)"/i)[1] : 1;
    const colLetter = String.fromCharCode(64 + colIndex);
    console.log(`Col ${colIndex} (${colLetter}): Val="${val}" Rowspan=${rowspan} Colspan=${colspan}`);
  }
}

printRowDetails(7);
printRowDetails(8);
printRowDetails(11);
printRowDetails(12);
printRowDetails(13);
printRowDetails(14);
printRowDetails(15);
