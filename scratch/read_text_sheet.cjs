const fs = require('fs');
const path = require('path');

const filePath = 'c:\\mdp\\test_sheet.xlsx';
if (fs.existsSync(filePath)) {
  console.log('=== Reading test_sheet.xlsx as UTF-16LE ===');
  const content = fs.readFileSync(filePath, 'utf16le');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  lines.slice(0, 30).forEach((line, idx) => {
    console.log(`Line ${idx + 1}:`, line);
  });
} else {
  console.log('test_sheet.xlsx not found');
}

const csvPath = 'c:\\mdp\\mdp_os_sheet.csv';
if (fs.existsSync(csvPath)) {
  console.log('\n=== Reading mdp_os_sheet.csv ===');
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in CSV: ${lines.length}`);
  lines.slice(0, 15).forEach((line, idx) => {
    console.log(`Line ${idx + 1}:`, line);
  });
}
