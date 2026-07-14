const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = 'c:\\mdp\\scratch\\sample.xlsx';
try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  console.log(`=== First 25 rows of sheet "${sheetName}" ===`);
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  json.slice(0, 25).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, row);
  });
} catch (err) {
  console.error('Error:', err.message);
}
