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

function printRawRow(rowIndex) {
  const rowHtml = rows[rowIndex - 1];
  if (!rowHtml) return;
  console.log(`\n=== Raw Row ${rowIndex} ===`);
  const cellRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  let idx = 0;
  while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
    idx++;
    console.log(`  Cell ${idx}: tag="<td${cellMatch[1]}>", content="${cellMatch[2].replace(/<[^>]*>/g, '').trim()}"`);
  }
}

printRawRow(7);
printRawRow(8);
printRawRow(9);
printRawRow(10);
