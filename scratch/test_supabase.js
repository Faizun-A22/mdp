import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve('c:/mdp/.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const dummyRow = {
    id: 'sp_imp_test_123',
    tanggal: '2026-06-20',
    customer: 'Test',
    ukuran: '1000x1200 mm',
    produksi: 0,
    stock_awal: 0,
    dari_lumajang: 0,
    dari_subcont: 0,
    pallet_keluar: 0,
    retur_lumajang: 0,
    retur_customer: 0
  };

  console.log('Testing insert with payload:', dummyRow);
  const { data, error } = await supabase.from('mdp_stock_pallet').upsert([dummyRow]);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

test();
