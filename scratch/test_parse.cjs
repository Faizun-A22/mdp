const XLSX = require('xlsx');
const wb = XLSX.readFile('test_sheet_sync.xlsx');

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
    if (rows[r] && rows[r].some(cell => {
      const val = String(cell || '').toLowerCase();
      return val.includes('po') || val.includes('customer') || val.includes('pelanggan') || val.includes('kiriman') || val.includes('sisa') || val.includes('qty');
    })) {
      headers = rows[r].map(h => String(h || '').trim());
      headerIndex = r;
      break;
    }
  }
  
  if (headerIndex === -1) {
    headers = rows[0]?.map(h => String(h || '').trim()) || [];
    headerIndex = 0;
  }
  
  const dataRows = rows.slice(headerIndex + 1);
  const colMap = { tanggal: -1, customer: -1, nomorPo: -1, ukuran: -1, jumlahPo: -1, kiriman: -1, genericQty: -1, sisa: -1 };
  
  headers.forEach((h, i) => {
    const lh = h.toLowerCase();
    if (lh.includes('tgl') || lh.includes('tanggal') || lh.includes('date')) colMap.tanggal = i;
    else if (lh.includes('cust') || lh.includes('pelanggan') || lh.includes('nama pt') || lh.includes('pt') || lh.includes('jenis')) colMap.customer = i;
    else if (lh.includes('ukuran') || lh.includes('size')) colMap.ukuran = i;
    else if (lh.includes('qty po') || lh.includes('jumlah po') || lh.includes('qty order') || lh.includes('jumlah order') || lh.includes('volume po')) colMap.jumlahPo = i;
    else if (lh.includes('qty kirim') || lh.includes('jumlah kirim') || lh.includes('realisasi') || lh.includes('delivery') || lh.includes('terkirim') || lh.includes('kirim')) colMap.kiriman = i;
    else if (lh.includes('po') || lh.includes('order')) colMap.nomorPo = i;
    else if (lh.includes('qty') || lh.includes('quantity') || lh.includes('jumlah') || lh.includes('volume')) colMap.genericQty = i;
    else if (lh.includes('sisa') || lh.includes('os') || lh.includes('kekurangan') || lh.includes('kurang')) colMap.sisa = i;
  });
  
  const parsedMap = {};
  let activePoNumber = '';
  let activeSize = '1000x1200 mm';
  let activeDate = new Date().toISOString().split('T')[0];
  let activeCustomer = String(sheetName || 'PT Unknown').trim();
  let activeJumlahPo = 0;
  
  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    
    const getVal = (colIdx, fallback) => colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx] : fallback;
    const custRaw = colMap.customer !== -1 ? row[colMap.customer] : '';
    const poRaw = colMap.nomorPo !== -1 ? row[colMap.nomorPo] : '';
    const sizeRaw = colMap.ukuran !== -1 ? row[colMap.ukuran] : '';
    const tglRaw = colMap.tanggal !== -1 ? row[colMap.tanggal] : '';
    
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
        } catch (e) {
          console.error('Gagal mengurai tanggal:', tglRaw, e);
        }
        if (tanggalStr && !isNaN(new Date(tanggalStr).getTime())) {
          activeDate = tanggalStr;
        }
      }
      if (custRaw) activeCustomer = String(custRaw).trim();
      if (sizeRaw) activeSize = String(sizeRaw).trim();
    }
    
    if (!activePoNumber) return;
    
    let rowJumlahPo = 0;
    let rowKiriman = 0;
    
    const hasSpecificPoQty = colMap.jumlahPo !== -1;
    const hasSpecificKirimQty = colMap.kiriman !== -1;
    const hasGenericQty = colMap.genericQty !== -1;
    const hasSisaQty = colMap.sisa !== -1;
    
    if (hasSpecificPoQty) {
      rowJumlahPo = safeParseNumber(getVal(colMap.jumlahPo, 0), 0);
      rowKiriman = safeParseNumber(getVal(colMap.kiriman, 0), 0);
      if (poRaw) {
        activeJumlahPo = rowJumlahPo;
      } else {
        rowJumlahPo = 0;
      }
    } else if (hasGenericQty && hasSisaQty) {
      rowKiriman = safeParseNumber(getVal(colMap.genericQty, 0), 0);
      const sisaVal = safeParseNumber(getVal(colMap.sisa, 0), 0);
      if (poRaw) {
        rowJumlahPo = rowKiriman + sisaVal;
        activeJumlahPo = rowJumlahPo;
      } else {
        rowJumlahPo = 0;
      }
    } else if (hasGenericQty) {
      const qtyVal = safeParseNumber(getVal(colMap.genericQty, 0), 0);
      if (poRaw) {
        rowJumlahPo = qtyVal;
        activeJumlahPo = rowJumlahPo;
      } else {
        rowKiriman = qtyVal;
      }
    }
    
    if (rowJumlahPo === 0 && rowKiriman === 0) return;
    
    const cleanPo = activePoNumber.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanCust = activeCustomer.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanSize = activeSize.toLowerCase().replace(/\s+/g, '');
    const itemId = 'po_' + cleanPo + '_' + cleanCust + '_' + cleanSize;
    
    if (parsedMap[itemId]) {
      parsedMap[itemId].kiriman += rowKiriman;
      parsedMap[itemId].sisaPo = parsedMap[itemId].jumlahPo - parsedMap[itemId].kiriman;
    } else {
      parsedMap[itemId] = {
        id: itemId,
        batchId: sheetName,
        tanggal: activeDate,
        customer: activeCustomer,
        nomorPo: activePoNumber,
        ukuran: activeSize,
        jumlahPo: activeJumlahPo || rowJumlahPo || rowKiriman,
        kiriman: rowKiriman,
        sisaPo: 0
      };
      parsedMap[itemId].sisaPo = parsedMap[itemId].jumlahPo - parsedMap[itemId].kiriman;
    }
  });
  
  return Object.values(parsedMap);
};

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const parsed = parseWorksheet(ws, name);
  const outstandingList = parsed.filter(p => p.sisaPo > 0);
  console.log(`Sheet: ${name} -> Parsed ${parsed.length} POs. Outstanding count: ${outstandingList.length}`);
  if (outstandingList.length > 0) {
     console.log('   Sample OS PO:', outstandingList[0]);
  }
});
