const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const anonKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : 'https://idktihhgvumomyfkniiv.supabase.co';
const supabaseAnonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('Querying Supabase database...');
  const { data, error } = await supabase
    .from('mdp_stock_pallet')
    .select('*')
    .order('tanggal', { ascending: false });

  if (error) {
    console.error('Supabase Error:', error);
    return;
  }

  console.log(`Total stock pallet records: ${data.length}`);
  
  // Group by month and year
  const groups = {};
  data.forEach(item => {
    const parts = (item.tanggal || '').split('-');
    if (parts.length >= 2) {
      const key = `${parts[0]}-${parts[1]}`;
      groups[key] = (groups[key] || 0) + 1;
    }
  });

  console.log('Records per month/year in database:', groups);
  
  console.log('Sample of last 5 records:');
  console.log(data.slice(0, 5));
}

checkData();
