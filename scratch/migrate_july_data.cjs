const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read Env
const envContent = fs.readFileSync('.env', 'utf8');
const anonKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : 'https://idktihhgvumomyfkniiv.supabase.co';
const supabaseAnonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbyyEjyLzz9eZTDsL0J25QC2_0VYy_g95UZQtcmNKrJxtcwra1BfQ7GLpsJ5mw97uDtn/exec';

// Parse date parts
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

async function migrate() {
  console.log('Fetching stock pallet and pallet types from Supabase...');
  
  const { data: flatData, error: flatError } = await supabase
    .from('mdp_stock_pallet')
    .select('*')
    .order('tanggal', { ascending: true });

  if (flatError) {
    console.error('Error fetching stock pallets:', flatError);
    return;
  }

  const { data: palletTypes, error: typesError } = await supabase
    .from('mdp_pallet_types')
    .select('*');

  if (typesError) {
    console.error('Error fetching pallet types:', typesError);
    return;
  }

  const month = 7; // July
  const year = 2026;
  const days = new Date(year, month, 0).getDate();

  console.log(`Calculating monthly ledger matrix for July ${year} (${days} days)...`);

  // Group by customer and ukuran
  const customerKeys = [];
  const seen = new Set();
  
  palletTypes.forEach(pt => {
    const key = `${pt.nama || ''}_${pt.ukuran || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      customerKeys.push({ customer: pt.nama, ukuran: pt.ukuran });
    }
  });

  flatData.forEach(item => {
    const key = `${item.customer || ''}_${item.ukuran || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      customerKeys.push({ customer: item.customer, ukuran: item.ukuran });
    }
  });

  const matrix = customerKeys.map(ck => {
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

    const filtered = flatData.filter(item => {
      if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
      const dateParts = parseDateParts(item.tanggal);
      return dateParts.month === month && dateParts.year === year;
    });

    filtered.forEach(item => {
      const dateParts = parseDateParts(item.tanggal);
      const day = dateParts.day;
      if (day >= 1 && day <= days) {
        group.M[day] = Number(item.produksi || 0) + Number(item.dari_lumajang || 0) + Number(item.dari_subcont || 0);
        group.K[day] = Number(item.pallet_keluar || 0);
        group.RCust[day] = Number(item.retur_customer || 0);
        group.RWS[day] = Number(item.retur_lumajang || 0);
        if (day === 1) {
          group.A[1] = Number(item.stock_awal || 0);
        }
      }
    });

    // Lookup starting stock from previous records
    const recordsBeforeMonth = flatData.filter(item => {
      if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
      const dateParts = parseDateParts(item.tanggal);
      if (dateParts.year < year) return true;
      if (dateParts.year === year && dateParts.month < month) return true;
      return false;
    });

    if (group.A[1] === 0 && recordsBeforeMonth.length > 0) {
      recordsBeforeMonth.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      const lastRecord = recordsBeforeMonth[0];
      if (lastRecord) {
        const lastSisa = Number(lastRecord.stock_awal || 0) + 
                          Number(lastRecord.produksi || 0) + 
                          Number(lastRecord.dari_lumajang || 0) + 
                          Number(lastRecord.dari_subcont || 0) + 
                          Number(lastRecord.retur_customer || 0) - 
                          Number(lastRecord.pallet_keluar || 0) - 
                          Number(lastRecord.retur_lumajang || 0);
        group.A[1] = lastSisa;
      }
    }

    // Daily calculation
    group.S[1] = group.A[1] + group.M[1] - group.K[1] + group.RCust[1] - group.RWS[1];
    for (let d = 2; d <= days; d++) {
      group.A[d] = group.S[d - 1];
      group.S[d] = group.A[d] + group.M[d] - group.K[d] + group.RCust[d] - group.RWS[d];
    }

    return group;
  });

  console.log(`Matrix generated with ${matrix.length} customer groups.`);
  console.log('Sending payload to Google Sheets Web App URL...');

  try {
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        month,
        year,
        matrix
      })
    });

    const resText = await response.text();
    console.log('Raw response (first 1000 characters):');
    console.log(resText.substring(0, 1000));
    
    try {
      const resJson = JSON.parse(resText);
      console.log('Parsed JSON response:', resJson);
    } catch (e) {
      console.log('Failed to parse response as JSON. It is probably HTML.');
    }
  } catch (err) {
    console.error('Network error during Google Sheets sync:', err);
  }
}

migrate();
