const fs = require('fs');
const XLSX = require('xlsx');

const filePath = 'c:\\mdp\\scratch\\sample.xlsx';
try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find ALDZAMA
  const aldzamaIndex = json.findIndex(row => row[1] === 'ALDZAMA');
  console.log(`ALDZAMA found at index ${aldzamaIndex}`);
  
  // Print headers
  console.log('Headers:', json[5]);
  console.log('Days:', json[6]);
  
  // Print ALDZAMA rows (5 rows: A, WS M, WS K, Retur R.Cust, Retur R.WS, S)
  for (let i = aldzamaIndex; i < aldzamaIndex + 6; i++) {
    const row = json[i];
    if (!row) continue;
    console.log(`\nRow ${i + 1} (${row[4] || row[3] || 'S'}):`);
    console.log(`  Col 0 (No):`, row[0]);
    console.log(`  Col 1 (Nama):`, row[1]);
    console.log(`  Col 2 (Ukuran):`, row[2]);
    console.log(`  Col 3 (Sub):`, row[3]);
    console.log(`  Col 4 (Type):`, row[4]);
    
    // Daily values from day 1 to 31 (indices 5 to 35)
    const daily = [];
    for (let day = 1; day <= 31; day++) {
      daily.push(`${day}:${row[day + 4]}`);
    }
    console.log(`  Daily (Day:Val):`, daily.join(', '));
    console.log(`  Col 36 (Jumlah):`, row[36]);
  }
} catch (err) {
  console.error('Error:', err.message);
}
