const https = require('https');
const XLSX = require('xlsx');

const fileUrl = 'https://docs.google.com/spreadsheets/d/1Lexmjg4ce0ro7b01WRfTgUErH9Q5bxMV3l7JTxMdfmE/export?format=xlsx';

https.get(fileUrl, (res) => {
  if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
    https.get(res.headers.location, handleResponse);
  } else {
    handleResponse(res);
  }
});

function handleResponse(res) {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('--- CUSTOMERS FOUND ---');
    let count = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      
      const colB = String(row[1] || '').trim(); // Column B
      const colC = String(row[2] || '').trim(); // Column C
      const colE = String(row[4] || '').trim().toUpperCase(); // Column E (Status)
      
      if (colE === 'A' && colB !== '') {
        count++;
        console.log(`${count}. Row ${r}: Customer="${colB}", Size="${colC}"`);
      }
    }
  });
}
