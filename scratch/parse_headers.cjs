const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Thosiba\\.gemini\\antigravity\\brain\\d5829976-f330-4eab-9146-c9989ed7fd6e\\.system_generated\\steps\\186\\content.md', 'utf8');

// Let's find all table cells in the HTML
const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

let tableMatch;
let tableIndex = 0;

while ((tableMatch = tableRegex.exec(html)) !== null) {
  tableIndex++;
  const tableHtml = tableMatch[1];
  let rowMatch;
  let rowIndex = 0;
  console.log(`--- Table ${tableIndex} ---`);
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    rowIndex++;
    const rowHtml = rowMatch[1];
    let cellMatch;
    const cells = [];
    
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // clean tags and whitespace
      const txt = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(txt);
    }
    
    // Log the first 15 rows of the table to find headers
    if (rowIndex <= 15) {
      if (cells.some(c => c.length > 0)) {
        console.log(`Row ${rowIndex}:`, cells.slice(0, 15));
      }
    }
  }
}
