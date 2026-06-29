const XLSX = require('xlsx');
const fs = require('fs');

const safeParseNumber = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  let str = String(val).trim();
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return fallback;
  
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      str = str.replace(/\./g, '');
    }
  }
  const parsed = Number(str);
  return isNaN(parsed) ? fallback : parsed;
};

const parseWorksheet = (worksheet, sheetName) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (rows.length === 0) return [];

  let headers = [];
  let headerIndex = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row) continue;
    const isHeader = row.some(cell => {
      const val = String(cell || '').toLowerCase();
      return val.includes('po') || val.includes('customer') || val.includes('pelanggan') || val.includes('kiriman') || val.includes('sisa') || val.includes('qty');
    });
    if (isHeader) {
      headers = row.map(h => String(h || '').trim());
      headerIndex = r;
      break;
    }
  }

  if (headerIndex === -1) {
    headers = rows[0]?.map(h => String(h || '').trim()) || [];
    headerIndex = 0;
  }

  const dataRows = rows.slice(headerIndex + 1);

  const colMap = {
    tanggal: -1,
    tenggatWaktu: -1,
    customer: -1,
    nomorPo: -1,
    ukuran: -1,
    jumlahPo: -1,
    kiriman: -1,
    genericQty: -1,
    sisa: -1
  };

  headers.forEach((h, i) => {
    const lh = h.toLowerCase();
    // Prioritize sisa/kekurangan checks to avoid conflicts
    if (lh.includes('tenggat') || lh.includes('deadline') || lh.includes('tempo') || lh.includes('limit')) {
      colMap.tenggatWaktu = i;
    } else if (lh.includes('tgl') || lh.includes('tanggal') || lh.includes('date')) {
      colMap.tanggal = i;
    } else if (lh.includes('cust') || lh.includes('pelanggan') || lh.includes('nama pt') || lh.includes('pt') || lh.includes('jenis')) {
      colMap.customer = i;
    } else if (lh.includes('ukuran') || lh.includes('size')) {
      colMap.ukuran = i;
    } else if (lh.includes('qty po') || lh.includes('jumlah po') || lh.includes('qty order') || lh.includes('jumlah order') || lh.includes('volume po')) {
      colMap.jumlahPo = i;
    } else if (lh.includes('sisa') || lh.includes('os') || lh.includes('kekurangan') || lh.includes('kurang')) {
      colMap.sisa = i;
    } else if (lh.includes('qty kirim') || lh.includes('jumlah kirim') || lh.includes('realisasi') || lh.includes('delivery') || lh.includes('terkirim') || lh.includes('kirim')) {
      colMap.kiriman = i;
    } else if (lh.includes('po') || lh.includes('order')) {
      colMap.nomorPo = i;
    } else if (lh.includes('qty') || lh.includes('quantity') || lh.includes('jumlah') || lh.includes('volume')) {
      colMap.genericQty = i;
    }
  });

  const parsedItems = [];
  
  let activePoNumber = '';
  let activeSize = '1000x1200 mm';
  let activeDate = new Date().toISOString().split('T')[0];
  let activeTenggat = activeDate;
  let activeCustomer = String(sheetName || 'PT Unknown').trim();

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;

    const custRaw = colMap.customer !== -1 ? row[colMap.customer] : '';
    const poRaw = colMap.nomorPo !== -1 ? row[colMap.nomorPo] : '';
    const sizeRaw = colMap.ukuran !== -1 ? row[colMap.ukuran] : '';
    const tglRaw = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    const tenggatRaw = colMap.tenggatWaktu !== -1 ? row[colMap.tenggatWaktu] : '';

    const isTotalRow = [custRaw, poRaw].some(val => {
      const s = String(val || '').toUpperCase().trim();
      return s.includes('TOTAL') || s.includes('LUNAS') || s.includes('TAHUN');
    });
    if (isTotalRow) return;

    if (poRaw) {
      activePoNumber = String(poRaw).trim();
      
      if (tglRaw) {
        let tanggalStr = '';
        try {
          if (typeof tglRaw === 'number') {
            const date = new Date((tglRaw - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) tanggalStr = date.toISOString().split('T')[0];
          } else {
            const trimmedTgl = String(tglRaw).trim();
            const date = new Date(trimmedTgl);
            if (!isNaN(date.getTime())) {
              tanggalStr = date.toISOString().split('T')[0];
            } else {
              const parts = trimmedTgl.split(/[-/.]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  tanggalStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  tanggalStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
          }
        } catch (e) {}
        if (tanggalStr) activeDate = tanggalStr;
      }

      // Parse tenggat waktu
      activeTenggat = activeDate;
      if (tenggatRaw) {
        let tenggatStr = '';
        try {
          if (typeof tenggatRaw === 'number') {
            const date = new Date((tenggatRaw - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) tenggatStr = date.toISOString().split('T')[0];
          } else {
            const trimmedTenggat = String(tenggatRaw).trim();
            const date = new Date(trimmedTenggat);
            if (!isNaN(date.getTime())) {
              tenggatStr = date.toISOString().split('T')[0];
            } else {
              const parts = trimmedTenggat.split(/[-/.]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  tenggatStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  tenggatStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
          }
        } catch (e) {}
        if (tenggatStr) activeTenggat = tenggatStr;
      }
    }

    if (custRaw) {
      activeCustomer = String(custRaw).trim();
    }
    if (sizeRaw) {
      activeSize = String(sizeRaw).trim();
    }

    // Determine Qty PO
    let qtyPo = 0;
    if (colMap.jumlahPo !== -1) {
      qtyPo = safeParseNumber(row[colMap.jumlahPo], 0);
    } else if (colMap.genericQty !== -1) {
      qtyPo = safeParseNumber(row[colMap.genericQty], 0);
    }

    if (qtyPo === 0 && !activePoNumber) return;

    // Determine Kiriman
    let kiriman = 0;
    if (colMap.kiriman !== -1) {
      kiriman = safeParseNumber(row[colMap.kiriman], 0);
    }

    // Determine Sisa
    let sisa = qtyPo - kiriman;
    if (colMap.sisa !== -1) {
      const sisaVal = safeParseNumber(row[colMap.sisa], -9999);
      if (sisaVal !== -9999) {
        sisa = sisaVal;
      }
    }

    if (qtyPo > 0 && sisa > 0) {
      parsedItems.push({
        sheetName: sheetName,
        customer: activeCustomer,
        tanggal: activeDate,
        tenggatWaktu: activeTenggat,
        nomorPo: activePoNumber || 'NO PO',
        ukuran: activeSize,
        jumlahPo: qtyPo,
        kiriman: kiriman,
        sisaPo: sisa
      });
    }
  });

  return parsedItems;
};

const workbook = XLSX.readFile('c:/mdp/test_sheet_sync.xlsx');
let allOutstanding = [];
workbook.SheetNames.forEach(sheetName => {
  if (sheetName.toLowerCase().includes('database') || sheetName.toLowerCase().includes('rekap') || sheetName.toLowerCase().includes('template') || sheetName.toLowerCase().includes('user')) return;
  const ws = workbook.Sheets[sheetName];
  const items = parseWorksheet(ws, sheetName);
  allOutstanding.push(...items);
});

console.log('TOTAL_OUTSTANDING_COUNT:', allOutstanding.length);
console.log('SAMPLE_OUTSTANDING:', JSON.stringify(allOutstanding, null, 2));
