import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file to get supabase credentials
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

console.log('URL:', supabaseUrl);
console.log('Anon Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('\n--- Inspecting mdp_outstanding_po ---');
  const { data: pos, error: poErr } = await supabase
    .from('mdp_outstanding_po')
    .select('*')
    .limit(1);
  if (poErr) {
    console.error('Error fetching PO:', poErr);
  } else {
    console.log('PO keys:', pos.length > 0 ? Object.keys(pos[0]) : 'No records found');
    console.log('PO sample:', pos[0]);
  }

  console.log('\n--- Inspecting mdp_po_deliveries ---');
  const { data: dels, error: delErr } = await supabase
    .from('mdp_po_deliveries')
    .select('*')
    .limit(1);
  if (delErr) {
    console.error('Error fetching deliveries:', delErr);
  } else {
    console.log('Delivery keys:', dels.length > 0 ? Object.keys(dels[0]) : 'No records found');
    console.log('Delivery sample:', dels[0]);
  }
}

inspect();
