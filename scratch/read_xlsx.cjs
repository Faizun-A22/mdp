const XLSX = require('xlsx');

const workbook = XLSX.readFile('MUTASI WH - APRIL 2026 NEW (update) (3).xlsx', { cellFormula: true });
const sheet = workbook.Sheets['MUTASI MEI 2026 '];

function printRowCols(r) {
  const cells = [];
  for (let c = 38; c <= 48; c++) { // Column AL to AV
    const letter = getColLetter(c);
    const cell = sheet[`${letter}${r}`];
    let valStr = 'empty';
    if (cell) {
      if (cell.f) valStr = `Formula="${cell.f}"`;
      else if (cell.v !== undefined) valStr = `Val=${JSON.stringify(cell.v)}`;
    }
    cells.push(`${letter}: ${valStr}`);
  }
  console.log(`Row ${r}:`, cells.join(' | '));
}

printRowCols(6);
printRowCols(7);
printRowCols(8);
printRowCols(9);
printRowCols(14);

function getColLetter(col) {
  let letter = '';
  while (col > 0) {
    let temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}
