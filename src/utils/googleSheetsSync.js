import { storageAPI } from './storage';

// Helper to parse date
const parseDateParts = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return { year: 0, month: 0, day: 0 };
  const parts = dateStr.split('-');
  if (parts.length < 3) return { year: 0, month: 0, day: 0 };
  return {
    year: parseInt(parts[0], 10) || 0,
    month: parseInt(parts[1], 10) || 0,
    day: parseInt(parts[2], 10) || 0
  };
};

/**
 * Calculates the ledger matrix for a given month and year.
 * Mimics initializeMatrix from SpreadsheetView.jsx.
 */
const calculateMatrix = (flatData, palletTypes, month, year) => {
  const days = new Date(year, month, 0).getDate();
  const customerKeys = [];
  const seen = new Set();
  
  const safeTypes = Array.isArray(palletTypes) ? palletTypes : [];
  const safeFlatData = Array.isArray(flatData) ? flatData : [];
  
  safeTypes.filter(Boolean).forEach(pt => {
    const key = `${pt.nama || ''}_${pt.ukuran || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      customerKeys.push({ customer: pt.nama || '', ukuran: pt.ukuran || '1000x1200 mm' });
    }
  });
  
  safeFlatData.filter(Boolean).forEach(item => {
    const key = `${item.customer || ''}_${item.ukuran || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      customerKeys.push({ customer: item.customer || '', ukuran: item.ukuran || '1000x1200 mm' });
    }
  });

  return customerKeys.map(ck => {
    const group = {
      customer: ck.customer,
      ukuran: ck.ukuran,
      A: Array(days + 1).fill(0),
      M: Array(days + 1).fill(0),
      K: Array(days + 1).fill(0),
      RCust: Array(days + 1).fill(0),
      RWS: Array(days + 1).fill(0),
      S: Array(days + 1).fill(0)
    };

    const filtered = safeFlatData.filter(Boolean).filter(item => {
      if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
      const dateParts = parseDateParts(item.tanggal);
      return dateParts.month === month && dateParts.year === year;
    });

    filtered.forEach(item => {
      const dateParts = parseDateParts(item.tanggal);
      const day = dateParts.day;
      if (day >= 1 && day <= days) {
        group.M[day] = Number(item.produksi || 0) + Number(item.dariLumajang || 0) + Number(item.dariSubcont || 0);
        group.K[day] = Number(item.palletKeluar || 0);
        group.RCust[day] = Number(item.returCustomer || 0);
        group.RWS[day] = Number(item.returLumajang || 0);
        if (day === 1) {
          group.A[1] = Number(item.stockAwal || 0);
        }
      }
    });

    // Stock Awal lookup fallback
    const recordsBeforeMonth = safeFlatData.filter(Boolean).filter(item => {
      if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
      const dateParts = parseDateParts(item.tanggal);
      if (dateParts.year < year) return true;
      if (dateParts.year === year && dateParts.month < month) return true;
      return false;
    });

    if (group.A[1] === 0 && recordsBeforeMonth.length > 0) {
      recordsBeforeMonth.sort((a, b) => {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return dateB - dateA;
      });
      const lastRecord = recordsBeforeMonth[0];
      if (lastRecord) {
        const lastSisa = Number(lastRecord.stockAwal || 0) + 
                          Number(lastRecord.produksi || 0) + 
                          Number(lastRecord.dariLumajang || 0) + 
                          Number(lastRecord.dariSubcont || 0) + 
                          Number(lastRecord.returCustomer || 0) - 
                          Number(lastRecord.palletKeluar || 0) - 
                          Number(lastRecord.returLumajang || 0);
        group.A[1] = lastSisa;
      }
    }

    // Daily running stock
    group.S[1] = group.A[1] + group.M[1] - group.K[1] + group.RCust[1] - group.RWS[1];
    for (let d = 2; d <= days; d++) {
      group.A[d] = group.S[d - 1];
      group.S[d] = group.A[d] + group.M[d] - group.K[d] + group.RCust[d] - group.RWS[d];
    }

    return group;
  });
};

/**
 * Trigger synchronization for a specific month/year to Google Sheets.
 */
export const syncMonthToGoogleSheets = async (month, year) => {
  const scriptUrl = localStorage.getItem('mdp_google_script_url') || 
                    import.meta.env.VITE_GOOGLE_SCRIPT_URL || 
                    'https://script.google.com/macros/s/AKfycbyyEjyLzz9eZTDsL0J25QC2_0VYy_g95UZQtcmNKrJxtcwra1BfQ7GLpsJ5mw97uDtn/exec';
  if (!scriptUrl) {
    console.log('Google Sheets sync skipped: URL not configured.');
    return;
  }

  // Dispatch event starting sync
  window.dispatchEvent(new CustomEvent('mdp_sheets_sync_status', { 
    detail: { status: 'syncing', month, year } 
  }));

  try {
    // Fetch fresh data
    const flatData = await storageAPI.getStockPallets() || [];
    const palletTypes = await storageAPI.getPalletTypes() || [];

    // Calculate matrix
    const matrix = calculateMatrix(flatData, palletTypes, month, year);

    // Send payload to Web App URL
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Crucial to avoid CORS Preflight request issues with Google Script Web App
      },
      body: JSON.stringify({
        month,
        year,
        matrix
      })
    });

    const resData = await response.json();
    if (resData && resData.status === 'success') {
      window.dispatchEvent(new CustomEvent('mdp_sheets_sync_status', { 
        detail: { status: 'success', month, year } 
      }));
    } else {
      throw new Error((resData && resData.message) || 'Response was not success');
    }
  } catch (error) {
    console.error('Error synchronizing with Google Sheets:', error);
    window.dispatchEvent(new CustomEvent('mdp_sheets_sync_status', { 
      detail: { status: 'error', message: error.message, month, year } 
    }));
  }
};
