const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\Thosiba\\.gemini\\antigravity\\brain\\d5829976-f330-4eab-9146-c9989ed7fd6e\\.system_generated\\steps\\26\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find occurrences of text in cells (Google Sheets HTML exports cells with specific tags or arrays)
// Let's look for sheet names or text content.
console.log('Content length:', content.length);

// Search for some potential strings
const searchTerms = ['Indofood', 'Unilever', 'Mayora', 'Gudang Garam', 'Awal', 'Masuk', 'Keluar', 'Mutasi', 'Stok', 'Pallet', 'Customer', 'Tanggal'];
searchTerms.forEach(term => {
  const count = (content.match(new RegExp(term, 'gi')) || []).length;
  console.log(`Term "${term}": ${count} matches`);
});

// Let's extract some plain text from the HTML tags to see what it's showing.
const textMatches = [];
const regex = />([^<]+)</g;
let match;
while ((match = regex.exec(content)) !== null) {
  const text = match[1].trim();
  if (text.length > 2 && text.length < 100) {
    textMatches.push(text);
  }
}

console.log('First 50 text matches found in HTML:');
console.log(textMatches.slice(0, 50));
console.log('Text matches containing "Jul" or "2026":');
console.log(textMatches.filter(t => t.includes('Jul') || t.includes('2026') || t.includes('26')).slice(0, 30));
