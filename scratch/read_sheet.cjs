const XLSX = require('xlsx');
const workbook = XLSX.readFile('test_sheet.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
  console.log(`\n--- Sheet: ${name} ---`);
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Rows (first 10):');
  rows.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
});
