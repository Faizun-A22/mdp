import { supabase } from './supabaseClient';

// Key Names for LocalStorage
const KEYS = {
  USERS: 'mdp_users',
  PALLET_TYPES: 'mdp_pallet_types',
  STOCK_PALLET: 'mdp_stock_pallet',
  KILN_DRY_BELUM: 'mdp_kd_belum',
  KILN_DRY_SETELAH: 'mdp_kd_setelah',
  KILN_DRY_LISTRIK: 'mdp_kd_listrik',
  MATERIALS: 'mdp_materials',
  MATERIAL_LOGS: 'mdp_material_logs',
  REPAIRS: 'mdp_repairs',
  OUTSTANDING_PO: 'mdp_outstanding_po',
  PO_DELIVERIES: 'mdp_po_deliveries',
  CURRENT_USER: 'mdp_current_user'
};

// Initial Mock Data
const MOCK_USERS = [
  { id: 'u1', username: 'admin', password: 'admin', name: 'Budi Santoso', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100' },
  { id: 'u2', username: 'user', password: 'user', name: 'Eko Wijaya', role: 'user', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' }
];

const MOCK_PALLET_TYPES = [
  { id: 'pt1', nama: 'Pallet Kayu Standar A', ukuran: '1000x1200 mm', keterangan: 'Pallet kayu standar tipe A Sidoarjo' },
  { id: 'pt2', nama: 'Pallet Kayu Standar B', ukuran: '800x1200 mm', keterangan: 'Pallet kayu standar tipe B Sidoarjo' },
  { id: 'pt3', nama: 'Pallet Kayu Standar C', ukuran: '1100x1100 mm', keterangan: 'Pallet kayu standar tipe C Sidoarjo' }
];

const MOCK_STOCK_PALLET = [
  {
    id: 'sp1',
    tanggal: '2026-06-10',
    customer: 'PT Indofood CBP',
    ukuran: '1000x1200 mm',
    produksi: 150,
    stockAwal: 500,
    dariLumajang: 100,
    dariSubcont: 50,
    palletKeluar: 200,
    returLumajang: 10,
    returCustomer: 15
  },
  {
    id: 'sp2',
    tanggal: '2026-06-11',
    customer: 'PT Unilever Indonesia',
    ukuran: '800x1200 mm',
    produksi: 200,
    stockAwal: 350,
    dariLumajang: 80,
    dariSubcont: 40,
    palletKeluar: 150,
    returLumajang: 5,
    returCustomer: 10
  },
  {
    id: 'sp3',
    tanggal: '2026-06-12',
    customer: 'PT Mayora Indah',
    ukuran: '1100x1100 mm',
    produksi: 100,
    stockAwal: 600,
    dariLumajang: 120,
    dariSubcont: 0,
    palletKeluar: 250,
    returLumajang: 20,
    returCustomer: 8
  },
  {
    id: 'sp4',
    tanggal: '2026-06-13',
    customer: 'PT Gudang Garam Tbk',
    ukuran: '1000x1200 mm',
    produksi: 180,
    stockAwal: 420,
    dariLumajang: 0,
    dariSubcont: 70,
    palletKeluar: 190,
    returLumajang: 0,
    returCustomer: 12
  },
  {
    id: 'sp5',
    tanggal: '2026-06-14',
    customer: 'PT Santos Jaya Abadi',
    ukuran: '1000x1200 mm',
    produksi: 120,
    stockAwal: 502,
    dariLumajang: 150,
    dariSubcont: 80,
    palletKeluar: 300,
    returLumajang: 15,
    returCustomer: 25
  }
];

const MOCK_KD_BELUM = [
  { id: 'kdb1', tanggal: '2026-06-14', customer: 'PT Indofood CBP', ukuran: '1000x1200 mm', qty: 250, status: 'Antri' },
  { id: 'kdb2', tanggal: '2026-06-15', customer: 'PT Mayora Indah', ukuran: '1100x1100 mm', qty: 180, status: 'Proses' },
  { id: 'kdb3', tanggal: '2026-06-15', customer: 'PT Unilever Indonesia', ukuran: '800x1200 mm', qty: 300, status: 'Antri' }
];

const MOCK_KD_SETELAH = [
  { id: 'kds1', tanggalMulai: '2026-06-12', tanggalSelesai: '2026-06-14', customer: 'PT Indofood CBP', ukuran: '1000x1200 mm', qty: 200, kd: 'KD 01', hasil: 'Baik', catatan: 'Proses pengeringan sempurna, MC 12%' },
  { id: 'kds2', tanggalMulai: '2026-06-11', tanggalSelesai: '2026-06-13', customer: 'PT Gudang Garam Tbk', ukuran: '1000x1200 mm', qty: 150, kd: 'KD 02', hasil: 'Baik', catatan: 'Kadar air rata-rata 14%' }
];

const MOCK_KD_LISTRIK = [
  {
    id: 'kdl1',
    namaPt: 'PT Indofood CBP',
    kd: 'KD 01',
    qty: 200,
    hari: { Senin: true, Selasa: true, Rabu: true, Kamis: false, Jumat: false, Sabtu: false, Minggu: false },
    jumlah: 3,
    tanggalMulai: '2026-06-08',
    jamMulai: '08:00',
    tanggalSelesai: '2026-06-10',
    jamSelesai: '16:00'
  },
  {
    id: 'kdl2',
    namaPt: 'PT Gudang Garam Tbk',
    kd: 'KD 02',
    qty: 150,
    hari: { Senin: false, Tuesday: false, Rabu: true, Kamis: true, Jumat: true, Sabtu: false, Minggu: false },
    jumlah: 3,
    tanggalMulai: '2026-06-10',
    jamMulai: '10:00',
    tanggalSelesai: '2026-06-12',
    jamSelesai: '18:00'
  },
  {
    id: 'kdl3',
    namaPt: 'PT Mayora Indah',
    kd: 'KD 01',
    qty: 180,
    hari: { Senin: false, Selasa: false, Rabu: false, Kamis: false, Jumat: true, Sabtu: true, Minggu: true },
    jumlah: 3,
    tanggalMulai: '2026-06-12',
    jamMulai: '13:00',
    tanggalSelesai: '2026-06-15',
    jamSelesai: '09:00'
  }
];

const MOCK_MATERIALS = [
  { id: 'm1', kode: 'BP-001', nama: 'Paku Coil 2.5"', kategori: 'Bahan Penolong', stokAwal: 50, masuk: 20, keluar: 15, satuan: 'DUS', minStok: 10 },
  { id: 'm2', kode: 'BP-002', nama: 'Paku Coil 1.5"', kategori: 'Bahan Penolong', stokAwal: 30, masuk: 10, keluar: 25, satuan: 'DUS', minStok: 15 },
  { id: 'm3', kode: 'BP-003', nama: 'Strap Band Plastik 15mm', kategori: 'Bahan Penolong', stokAwal: 15, masuk: 5, keluar: 12, satuan: 'ROLL', minStok: 5 },
  { id: 'm4', kode: 'AK-001', nama: 'Gergaji Kayu Circular 7"', kategori: 'Alat Kerja', stokAwal: 8, masuk: 2, keluar: 1, satuan: 'PCS', minStok: 3 },
  { id: 'm5', kode: 'AK-002', nama: 'Palu Besi 1.5 lbs', kategori: 'Alat Kerja', stokAwal: 12, masuk: 0, keluar: 2, satuan: 'PCS', minStok: 5 },
  { id: 'm6', kode: 'AK-003', nama: 'Mesin Amplas Udara (Pneumatic)', kategori: 'Alat Kerja', stokAwal: 5, masuk: 1, keluar: 0, satuan: 'PCS', minStok: 2 },
  { id: 'm7', kode: 'BP-004', nama: 'Cat Oven Hitam (Gloss)', kategori: 'Bahan Penolong', stokAwal: 25, masuk: 0, keluar: 22, satuan: 'PAIL', minStok: 8 }
];

const MOCK_MATERIAL_LOGS = [
  { id: 'ml1', materialId: 'm1', tanggal: '2026-06-20', tipe: 'masuk', qty: 10, catatan: 'Restock supplier A' },
  { id: 'ml2', materialId: 'm1', tanggal: '2026-06-22', tipe: 'masuk', qty: 10, catatan: 'Restock supplier B' },
  { id: 'ml3', materialId: 'm1', tanggal: '2026-06-23', tipe: 'keluar', qty: 5, catatan: 'Pemakaian tim perbaikan' },
  { id: 'ml4', materialId: 'm1', tanggal: '2026-06-24', tipe: 'keluar', qty: 10, catatan: 'Pemakaian perakitan pallet' },
  
  { id: 'ml5', materialId: 'm2', tanggal: '2026-06-21', tipe: 'masuk', qty: 10, catatan: 'Restock paku coil' },
  { id: 'ml6', materialId: 'm2', tanggal: '2026-06-22', tipe: 'keluar', qty: 15, catatan: 'Pemakaian produksi standar B' },
  { id: 'ml7', materialId: 'm2', tanggal: '2026-06-24', tipe: 'keluar', qty: 10, catatan: 'Pemakaian produksi standar C' },
  
  { id: 'ml8', materialId: 'm3', tanggal: '2026-06-22', tipe: 'masuk', qty: 5, catatan: 'Pembelian toko bangunan' },
  { id: 'ml9', materialId: 'm3', tanggal: '2026-06-23', tipe: 'keluar', qty: 6, catatan: 'Packing pengiriman Mayora' },
  { id: 'ml10', materialId: 'm3', tanggal: '2026-06-24', tipe: 'keluar', qty: 6, catatan: 'Packing pengiriman Indofood' },
  
  { id: 'ml11', materialId: 'm4', tanggal: '2026-06-20', tipe: 'masuk', qty: 2, catatan: 'Restock alat kerja baru' },
  { id: 'ml12', materialId: 'm4', tanggal: '2026-06-22', tipe: 'keluar', qty: 1, catatan: 'Gergaji lama tumpul' },
  
  { id: 'ml13', materialId: 'm5', tanggal: '2026-06-21', tipe: 'keluar', qty: 2, catatan: 'Dibagikan ke tim perbaikan baru' },
  
  { id: 'ml14', materialId: 'm6', tanggal: '2026-06-23', tipe: 'masuk', qty: 1, catatan: 'Pembelian mesin amplas cadangan' },
  
  { id: 'ml15', materialId: 'm7', tanggal: '2026-06-22', tipe: 'keluar', qty: 12, catatan: 'Pengecatan pallet hitam order Unilever' },
  { id: 'ml16', materialId: 'm7', tanggal: '2026-06-24', tipe: 'keluar', qty: 10, catatan: 'Pengecatan sisa stock pallet' }
];

const MOCK_REPAIRS = [
  { id: 'r1', tanggal: '2026-06-12', ukuran: '1000x1200 mm', qtyMasuk: 45, qtySelesai: 40, qtyScrap: 5, petugas: 'Supriadi', catatan: 'Kerusakan pada papan atas' },
  { id: 'r2', tanggal: '2026-06-13', ukuran: '800x1200 mm', qtyMasuk: 30, qtySelesai: 28, qtyScrap: 2, petugas: 'Anto Wijaya', catatan: 'Penggantian balok tengah' },
  { id: 'r3', tanggal: '2026-06-14', ukuran: '1100x1100 mm', qtyMasuk: 25, qtySelesai: 20, qtyScrap: 5, petugas: 'Supriadi', catatan: 'Papan banyak patah' },
  { id: 'r4', tanggal: '2026-06-15', ukuran: '1000x1200 mm', qtyMasuk: 15, qtySelesai: 10, qtyScrap: 2, petugas: 'Rian Kurnia', catatan: 'Dalam proses perbaikan' }
];

const MOCK_OUTSTANDING_PO = [
  { id: 'os1', batchId: 'b1', tanggal: '2026-06-01', customer: 'PT Indofood CBP', nomorPo: 'PO-2026-001', ukuran: '1000x1200 mm', jumlahPo: 1000, kiriman: 200, sisaPo: 800 },
  { id: 'os2', batchId: 'b1', tanggal: '2026-06-02', customer: 'PT Mayora Indah', nomorPo: 'PO-2026-002', ukuran: '1100x1100 mm', jumlahPo: 500, kiriman: 500, sisaPo: 0 },
  { id: 'os3', batchId: 'b2', tanggal: '2026-06-10', customer: 'PT Gudang Garam Tbk', nomorPo: 'PO-2026-003', ukuran: '1000x1200 mm', jumlahPo: 2000, kiriman: 0, sisaPo: 2000 }
];

// Helper functions for LocalStorage
export const getFromStorage = (key, initialValue) => {
  try {
    const value = localStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
    localStorage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return initialValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
};

// --- MAPPING HELPERS FOR SUPABASE (snake_case <-> camelCase) ---

const mapUserToDb = (u) => ({
  id: u.id,
  username: u.username,
  password: u.password,
  name: u.name,
  role: u.role,
  avatar: u.avatar
});
const mapDbToUser = (u) => ({
  id: u.id,
  username: u.username,
  password: u.password,
  name: u.name,
  role: u.role,
  avatar: u.avatar
});

const mapPalletTypeToDb = (pt) => ({
  id: pt.id,
  nama: pt.nama,
  ukuran: pt.ukuran,
  keterangan: pt.keterangan
});
const mapDbToPalletType = (pt) => ({
  id: pt.id,
  nama: pt.nama,
  ukuran: pt.ukuran,
  keterangan: pt.keterangan
});

const safeNum = (val) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const mapStockToDb = (s) => ({
  id: s.id || ('sp_' + Date.now()),
  tanggal: s.tanggal || new Date().toISOString().split('T')[0],
  customer: s.customer || 'UNKNOWN',
  ukuran: s.ukuran || '1000x1200 mm',
  produksi: safeNum(s.produksi),
  stock_awal: safeNum(s.stockAwal),
  dari_lumajang: safeNum(s.dariLumajang),
  dari_subcont: safeNum(s.dariSubcont),
  subcont_nama: s.subcontNama || '',
  pallet_keluar: safeNum(s.palletKeluar),
  retur_lumajang: safeNum(s.returLumajang),
  retur_customer: safeNum(s.returCustomer),
  created_at: s.createdAt || new Date().toISOString()
});
const mapDbToStock = (s) => ({
  id: s.id,
  tanggal: s.tanggal,
  customer: s.customer,
  ukuran: s.ukuran,
  produksi: Number(s.produksi || 0),
  stockAwal: Number(s.stock_awal || 0),
  dariLumajang: Number(s.dari_lumajang || 0),
  dariSubcont: Number(s.dari_subcont || 0),
  subcontNama: s.subcont_nama || '',
  palletKeluar: Number(s.pallet_keluar || 0),
  returLumajang: Number(s.retur_lumajang || 0),
  returCustomer: Number(s.retur_customer || 0),
  createdAt: s.created_at || ''
});

const mapKDBelumToDb = (k) => {
  const logsStr = k.monitoringLogs && k.monitoringLogs.length > 0 ? JSON.stringify(k.monitoringLogs) : '';
  return {
    id: k.id,
    tanggal: k.tanggal,
    customer: k.customer,
    ukuran: k.ukuran,
    qty: Number(k.qty || 0),
    status: logsStr ? `${k.status}||${logsStr}` : k.status
  };
};
const mapDbToKDBelum = (k) => {
  let status = k.status || 'Antri';
  let monitoringLogs = [];
  if (status.includes('||')) {
    const parts = status.split('||');
    status = parts[0];
    try {
      monitoringLogs = JSON.parse(parts[1]);
    } catch (e) {
      monitoringLogs = [];
    }
  }
  return {
    id: k.id,
    tanggal: k.tanggal,
    customer: k.customer,
    ukuran: k.ukuran,
    qty: Number(k.qty || 0),
    status,
    monitoringLogs
  };
};

const mapKDSetelahToDb = (k) => ({
  id: k.id,
  tanggal_mulai: k.tanggalMulai,
  tanggal_selesai: k.tanggalSelesai,
  customer: k.customer,
  ukuran: k.ukuran,
  qty: Number(k.qty || 0),
  kd: k.kd,
  hasil: k.hasil,
  catatan: k.catatan
});
const mapDbToKDSetelah = (k) => ({
  id: k.id,
  tanggalMulai: k.tanggal_mulai,
  tanggalSelesai: k.tanggal_selesai,
  customer: k.customer,
  ukuran: k.ukuran,
  qty: Number(k.qty || 0),
  kd: k.kd,
  hasil: k.hasil,
  catatan: k.catatan
});

const mapKDListrikToDb = (k) => ({
  id: k.id,
  nama_pt: k.namaPt,
  kd: k.kd,
  qty: Number(k.qty || 0),
  hari: k.hari,
  jumlah: Number(k.jumlah || 0),
  tanggal_mulai: k.tanggalMulai,
  jam_mulai: k.jamMulai,
  tanggal_selesai: k.tanggalSelesai,
  jam_selesai: k.jamSelesai
});
const mapDbToKDListrik = (k) => ({
  id: k.id,
  namaPt: k.nama_pt,
  kd: k.kd,
  qty: Number(k.qty || 0),
  hari: k.hari,
  jumlah: Number(k.jumlah || 0),
  tanggalMulai: k.tanggal_mulai,
  jamMulai: k.jam_mulai,
  tanggalSelesai: k.tanggal_selesai,
  jam_selesai: k.jam_selesai
});

const mapMaterialToDb = (m) => ({
  id: m.id,
  kode: m.kode,
  nama: m.nama,
  kategori: m.kategori,
  stok_awal: Number(m.stokAwal || 0),
  masuk: Number(m.masuk || 0),
  keluar: Number(m.keluar || 0),
  satuan: m.satuan,
  min_stok: Number(m.minStok || 0)
});
const mapDbToMaterial = (m) => ({
  id: m.id,
  kode: m.kode,
  nama: m.nama,
  kategori: m.kategori,
  stokAwal: Number(m.stok_awal || 0),
  masuk: Number(m.masuk || 0),
  keluar: Number(m.keluar || 0),
  satuan: m.satuan,
  minStok: Number(m.min_stok || 0)
});

const mapMaterialLogToDb = (ml) => ({
  id: ml.id,
  material_id: ml.materialId,
  tanggal: ml.tanggal,
  tipe: ml.tipe,
  qty: Number(ml.qty || 0),
  catatan: ml.catatan || ''
});
const mapDbToMaterialLog = (ml) => ({
  id: ml.id,
  materialId: ml.material_id,
  tanggal: ml.tanggal,
  tipe: ml.tipe,
  qty: Number(ml.qty || 0),
  catatan: ml.catatan || ''
});

const mapRepairToDb = (r) => ({
  id: r.id,
  tanggal: r.tanggal,
  ukuran: r.ukuran,
  qty_masuk: Number(r.qtyMasuk || 0),
  qty_selesai: Number(r.qtySelesai || 0),
  qty_scrap: Number(r.qtyScrap || 0),
  petugas: r.petugas,
  catatan: r.catatan
});
const mapDbToRepair = (r) => ({
  id: r.id,
  tanggal: r.tanggal,
  ukuran: r.ukuran,
  qtyMasuk: Number(r.qty_masuk || 0),
  qtySelesai: Number(r.qty_selesai || 0),
  qtyScrap: Number(r.qty_scrap || 0),
  petugas: r.petugas,
  catatan: r.catatan
});

const mapOSToDb = (o) => ({
  id: o.id,
  batch_id: o.batchId,
  tanggal: o.tanggal,
  tanggal_kirim: o.tanggalKirim || null,
  customer: o.customer,
  nomor_po: o.nomorPo,
  no_reff: o.noReff || '',
  ukuran: o.ukuran,
  jumlah_po: Number(o.jumlahPo || 0),
  kiriman: Number(o.kiriman || 0),
  kiriman_awal: Number(o.kirimanAwal !== undefined ? o.kirimanAwal : o.kiriman || 0),
  sisa_po: Number(o.sisaPo || 0),
  retur: Number(o.retur || 0)
});
const mapDbToOS = (o) => ({
  id: o.id,
  batchId: o.batch_id,
  tanggal: o.tanggal,
  tanggal_kirim: o.tanggal_kirim || '',
  customer: o.customer,
  nomorPo: o.nomor_po,
  noReff: o.no_reff || '',
  ukuran: o.ukuran,
  jumlahPo: Number(o.jumlah_po || 0),
  kiriman: Number(o.kiriman || 0),
  kirimanAwal: Number(o.kiriman_awal !== undefined ? o.kiriman_awal : o.kiriman || 0),
  sisaPo: Number(o.sisa_po || 0),
  retur: Number(o.retur || 0)
});

const mapDeliveryToDb = (d) => ({
  id: d.id,
  po_id: d.poId,
  tanggal_kirim: d.tanggalKirim,
  no_reff: d.noReff || '',
  qty_kirim: Number(d.qtyKirim || 0)
});

const mapDbToDelivery = (d) => ({
  id: d.id,
  poId: d.po_id,
  tanggalKirim: d.tanggal_kirim,
  noReff: d.no_reff || '',
  qtyKirim: Number(d.qty_kirim || 0)
});

const recalculatePOsWithMutasi = (pos, mutasiList, dels = []) => {
  // 1. Group deliveries and returns by poId
  const delsByPoId = {};
  const returByPoId = {};
  dels.forEach(d => {
    const poId = d.poId;
    const qty = Number(d.qtyKirim || 0);
    if (qty >= 0) {
      if (!delsByPoId[poId]) delsByPoId[poId] = 0;
      delsByPoId[poId] += qty;
    } else {
      if (!returByPoId[poId]) returByPoId[poId] = 0;
      returByPoId[poId] += Math.abs(qty);
    }
  });

  // Calculate stats directly based strictly on explicit deliveries and returns
  return pos.map(po => {
    const manualSum = delsByPoId[po.id] || 0;
    const manualRetur = returByPoId[po.id] || 0;
    
    po.kirimanAwal = manualSum;
    po.kiriman = manualSum;
    po.retur = manualRetur;
    po.sisaPo = Math.max(0, Number(po.jumlahPo) - po.kiriman + po.retur);
    
    return po;
  });
};

// --- GENERIC SYNC TABLE HELPER ---
const syncTable = async (tableName, frontendData, mapToDbRow, silent = false) => {
  try {
    if (frontendData.length > 0) {
      const dbRows = frontendData.map(mapToDbRow);
      // Chunk UPSERT into batches of 500 rows to prevent Payload Too Large / Bad Request
      const CHUNK_SIZE = 500;
      for (let i = 0; i < dbRows.length; i += CHUNK_SIZE) {
        const chunk = dbRows.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }
    }
  } catch (error) {
    console.error(`Gagal melakukan sinkronisasi tabel ${tableName} ke Supabase:`, error);
    if (!silent) {
      const detailMsg = error.details || error.hint || JSON.stringify(error);
      alert(`Supabase Sync Error (${tableName}): ${error.message || error} \nDetails: ${detailMsg}`);
    }
    throw error;
  }
};

// --- PALLET TYPES SYNC (upsert on 'nama' to respect unique constraint) ---
const syncPalletTypes = async (frontendData) => {
  try {
    // De-duplicate by nama (keep first occurrence) before sending to Supabase
    const seenNames = new Set();
    const deduped = frontendData.filter(pt => {
      const key = (pt.nama || '').toLowerCase().trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // Fetch all existing records from DB (by nama) to get their real IDs
    const { data: dbData, error: fetchErr } = await supabase
      .from('mdp_pallet_types')
      .select('id, nama');
    if (fetchErr) throw fetchErr;

    const dbByNama = {};
    if (dbData) dbData.forEach(r => { dbByNama[r.nama.toLowerCase().trim()] = r.id; });

    // Build rows — reuse DB id when same nama already exists so upsert on id works cleanly
    const rows = deduped.map(pt => {
      const key = (pt.nama || '').toLowerCase().trim();
      const existingId = dbByNama[key];
      return {
        id: existingId || pt.id,   // prefer the real DB id to avoid pk conflicts
        nama: pt.nama,
        ukuran: pt.ukuran,
        keterangan: pt.keterangan || ''
      };
    });

    // Upsert using id as the conflict target (chunked to prevent limits)
    if (rows.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase
          .from('mdp_pallet_types')
          .upsert(chunk, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }
    }
  } catch (error) {
    console.error('Gagal melakukan sinkronisasi tabel mdp_pallet_types ke Supabase:', error);
    alert('Supabase Sync Error (mdp_pallet_types): ' + (error.message || error));
  }
};

// Application Data Manager API (Dual Driver)
export const storageAPI = {
  init: async () => {
    if (supabase) {
      console.log('Supabase terdeteksi aktif. Mengabaikan inisialisasi LocalStorage.');
      return;
    }
    getFromStorage(KEYS.USERS, MOCK_USERS);
    getFromStorage(KEYS.PALLET_TYPES, MOCK_PALLET_TYPES);
    getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
    getFromStorage(KEYS.KILN_DRY_BELUM, MOCK_KD_BELUM);
    getFromStorage(KEYS.KILN_DRY_SETELAH, MOCK_KD_SETELAH);
    getFromStorage(KEYS.KILN_DRY_LISTRIK, MOCK_KD_LISTRIK);
    getFromStorage(KEYS.MATERIALS, MOCK_MATERIALS);
    getFromStorage(KEYS.MATERIAL_LOGS, MOCK_MATERIAL_LOGS);
    getFromStorage(KEYS.REPAIRS, MOCK_REPAIRS);
    getFromStorage(KEYS.OUTSTANDING_PO, MOCK_OUTSTANDING_PO);
  },

  // Users
  getUsers: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_users').select('*').order('name');
      if (error) {
        console.error('Error loading users, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.USERS, MOCK_USERS);
      }
      return (data || []).map(mapDbToUser);
    }
    return getFromStorage(KEYS.USERS, MOCK_USERS);
  },
  saveUsers: async (users) => {
    saveToStorage(KEYS.USERS, users);
    if (supabase) {
      try {
        await syncTable('mdp_users', users, mapUserToDb);
      } catch (e) {
        console.error('Failed to sync users to Supabase:', e);
      }
    }
  },

  // Current User
  getCurrentUser: () => {
    const user = localStorage.getItem(KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  // Pallet Types (Master)
  getPalletTypes: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_pallet_types').select('*').order('nama');
      if (error) {
        console.error('Error loading pallet types, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.PALLET_TYPES, MOCK_PALLET_TYPES);
      }
      return (data || []).map(mapDbToPalletType);
    }
    return getFromStorage(KEYS.PALLET_TYPES, MOCK_PALLET_TYPES);
  },
  savePalletTypes: async (data) => {
    saveToStorage(KEYS.PALLET_TYPES, data);
    if (supabase) {
      try {
        await syncPalletTypes(data);
      } catch (e) {
        console.error('Failed to sync pallet types to Supabase:', e);
      }
    }
  },

  // Stock Pallets
  getStockPallets: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_stock_pallet').select('*').order('tanggal', { ascending: false });
      if (error) {
        console.error('Error loading stock pallets, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
      }
      return (data || []).map(mapDbToStock);
    }
    return getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
  },
  saveStockPallets: async (data) => {
    saveToStorage(KEYS.STOCK_PALLET, data);
    if (supabase) {
      try {
        await syncTable('mdp_stock_pallet', data, mapStockToDb);
      } catch (e) {
        console.error('Failed to sync stock pallets to Supabase:', e);
      }
    }

    // Sinkronisasi Otomatis dengan Outstanding POs
    try {
      const pos = await storageAPI.getOutstandingPOs();
      const dels = await storageAPI.getDeliveries();
      const updatedPOs = recalculatePOsWithMutasi(pos, data, dels);
      saveToStorage(KEYS.OUTSTANDING_PO, updatedPOs);
      if (supabase) {
        try {
          await syncTable('mdp_outstanding_po', updatedPOs, mapOSToDb);
        } catch (e) {
          console.error("Gagal sinkronisasi otomatis Outstanding PO ke Supabase:", e);
        }
      }
    } catch (e) {
      console.error("Gagal sinkronisasi otomatis Outstanding PO dari Mutasi:", e);
    }
  },

  // Kiln Dry (Belum)
  getKDBelum: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_kd_belum').select('*').order('tanggal', { ascending: false });
      if (error) {
        console.error('Error loading KD Belum, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.KILN_DRY_BELUM, MOCK_KD_BELUM);
      }
      return (data || []).map(mapDbToKDBelum);
    }
    return getFromStorage(KEYS.KILN_DRY_BELUM, MOCK_KD_BELUM);
  },
  saveKDBelum: async (data) => {
    saveToStorage(KEYS.KILN_DRY_BELUM, data);
    if (supabase) {
      try {
        await syncTable('mdp_kd_belum', data, mapKDBelumToDb);
      } catch (e) {
        console.error('Failed to sync KD Belum to Supabase:', e);
      }
    }
  },

  // Kiln Dry (Setelah)
  getKDSetelah: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_kd_setelah').select('*').order('tanggal_selesai', { ascending: false });
      if (error) {
        console.error('Error loading KD Setelah, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.KILN_DRY_SETELAH, MOCK_KD_SETELAH);
      }
      return (data || []).map(mapDbToKDSetelah);
    }
    return getFromStorage(KEYS.KILN_DRY_SETELAH, MOCK_KD_SETELAH);
  },
  saveKDSetelah: async (data) => {
    saveToStorage(KEYS.KILN_DRY_SETELAH, data);
    if (supabase) {
      try {
        await syncTable('mdp_kd_setelah', data, mapKDSetelahToDb);
      } catch (e) {
        console.error('Failed to sync KD Setelah to Supabase:', e);
      }
    }
  },

  // Kiln Dry (Listrik)
  getKDListrik: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_kd_listrik').select('*').order('tanggal_mulai', { ascending: false });
      if (error) {
        console.error('Error loading KD Listrik, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.KILN_DRY_LISTRIK, MOCK_KD_LISTRIK);
      }
      return (data || []).map(mapDbToKDListrik);
    }
    return getFromStorage(KEYS.KILN_DRY_LISTRIK, MOCK_KD_LISTRIK);
  },
  saveKDListrik: async (data) => {
    saveToStorage(KEYS.KILN_DRY_LISTRIK, data);
    if (supabase) {
      try {
        await syncTable('mdp_kd_listrik', data, mapKDListrikToDb);
      } catch (e) {
        console.error('Failed to sync KD Listrik to Supabase:', e);
      }
    }
  },

  // Materials & Tools
  getMaterials: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_materials').select('*').order('kode');
      if (error) {
        console.error('Error loading materials, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.MATERIALS, MOCK_MATERIALS);
      }
      return (data || []).map(mapDbToMaterial);
    }
    return getFromStorage(KEYS.MATERIALS, MOCK_MATERIALS);
  },
  saveMaterials: async (data) => {
    saveToStorage(KEYS.MATERIALS, data);
    if (supabase) {
      try {
        await syncTable('mdp_materials', data, mapMaterialToDb);
      } catch (e) {
        console.error('Failed to sync materials to Supabase:', e);
      }
    }
  },

  // Material Logs (Mutations)
  getMaterialLogs: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_material_logs').select('*').order('tanggal', { ascending: false });
      if (error) {
        console.error('Error loading material logs, falling back to LocalStorage:', error);
        // Fallback to local storage if table doesn't exist yet
        return getFromStorage(KEYS.MATERIAL_LOGS, MOCK_MATERIAL_LOGS);
      }
      return (data || []).map(mapDbToMaterialLog);
    }
    return getFromStorage(KEYS.MATERIAL_LOGS, MOCK_MATERIAL_LOGS);
  },
  saveMaterialLogs: async (data) => {
    saveToStorage(KEYS.MATERIAL_LOGS, data);
    if (supabase) {
      try {
        // Run silently to avoid showing blocking alerts if table hasn't been created yet
        await syncTable('mdp_material_logs', data, mapMaterialLogToDb, true);
      } catch (e) {
        console.warn('Failed to sync material logs to Supabase, falling back to LocalStorage only:', e);
      }
    }
  },

  // Repair Warehouse
  getRepairs: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_repairs').select('*').order('tanggal', { ascending: false });
      if (error) {
        console.error('Error loading repairs, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.REPAIRS, MOCK_REPAIRS);
      }
      return (data || []).map(mapDbToRepair);
    }
    return getFromStorage(KEYS.REPAIRS, MOCK_REPAIRS);
  },
  saveRepairs: async (data) => {
    saveToStorage(KEYS.REPAIRS, data);
    if (supabase) {
      try {
        await syncTable('mdp_repairs', data, mapRepairToDb);
      } catch (e) {
        console.error('Failed to sync repairs to Supabase:', e);
      }
    }
  },

  // Outstanding PO
  getOutstandingPOs: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_outstanding_po').select('*').order('tanggal', { ascending: false });
      if (error) {
        console.error('Error loading outstanding POs, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.OUTSTANDING_PO, MOCK_OUTSTANDING_PO);
      }
      return (data || []).map(mapDbToOS);
    }
    return getFromStorage(KEYS.OUTSTANDING_PO, MOCK_OUTSTANDING_PO);
  },
  saveOutstandingPOs: async (data) => {
    let updated = data;
    try {
      const mutasi = await storageAPI.getStockPallets();
      const dels = await storageAPI.getDeliveries();
      updated = recalculatePOsWithMutasi(data, mutasi, dels);
    } catch (e) {
      console.error("Gagal sinkronisasi saat menyimpan Outstanding PO:", e);
    }

    saveToStorage(KEYS.OUTSTANDING_PO, updated);
    if (supabase) {
      try {
        await syncTable('mdp_outstanding_po', updated, mapOSToDb);
      } catch (e) {
        console.error('Failed to sync outstanding POs to Supabase:', e);
      }
    }
  },

  // PO Deliveries (Shipments)
  getDeliveries: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('mdp_po_deliveries').select('*');
      if (error) {
        console.error('Error loading PO deliveries, falling back to LocalStorage:', error);
        return getFromStorage(KEYS.PO_DELIVERIES, []);
      }
      return (data || []).map(mapDbToDelivery);
    }
    return getFromStorage(KEYS.PO_DELIVERIES, []);
  },
  saveDeliveries: async (data) => {
    // 1. Get old deliveries to detect changes
    const oldDels = getFromStorage(KEYS.PO_DELIVERIES, []);
    saveToStorage(KEYS.PO_DELIVERIES, data);
    
    if (supabase) {
      try {
        // 1. Fetch all valid PO ids from DB
        const { data: poRows, error: poErr } = await supabase
          .from('mdp_outstanding_po')
          .select('id');
        if (poErr) throw poErr;
        const validPoIds = new Set((poRows || []).map(r => r.id));

        // 2. Only sync deliveries that have a valid parent PO
        const validDeliveries = data.filter(d => validPoIds.has(d.poId));

        await syncTable('mdp_po_deliveries', validDeliveries, mapDeliveryToDb);
      } catch (error) {
        console.error('Gagal melakukan sinkronisasi tabel mdp_po_deliveries ke Supabase:', error);
      }
    }

    // 2. Detect if any delivery was updated, and update corresponding stock pallet mutation
    try {
      for (const newDel of data) {
        const oldDel = oldDels.find(d => d.id === newDel.id);
        if (oldDel && (oldDel.noReff !== newDel.noReff || oldDel.qtyKirim !== newDel.qtyKirim || oldDel.tanggalKirim !== newDel.tanggalKirim)) {
          // Delivery was modified! Update stock pallet
          const localStock = getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
          let updatedStock = localStock.map(item => {
            if (item.subcontNama === oldDel.noReff) {
              return {
                ...item,
                tanggal: newDel.tanggalKirim,
                subcontNama: newDel.noReff,
                palletKeluar: Math.abs(newDel.qtyKirim)
              };
            }
            return item;
          });
          saveToStorage(KEYS.STOCK_PALLET, updatedStock);
          
          if (supabase) {
            try {
              // Fetch the existing stock pallet row id
              const { data: stockRows } = await supabase
                .from('mdp_stock_pallet')
                .select('id')
                .eq('subcont_nama', oldDel.noReff);
                
              if (stockRows && stockRows.length > 0) {
                const stockId = stockRows[0].id;
                await supabase.from('mdp_stock_pallet').update({
                  tanggal: newDel.tanggalKirim,
                  subcont_nama: newDel.noReff,
                  pallet_keluar: Math.abs(newDel.qtyKirim)
                }).eq('id', stockId);
              }
            } catch (e) {
              console.error('Failed to update matching stock pallet on Supabase:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to sync delivery modifications to stock pallets:', e);
    }
  },

  deleteUser: async (id) => {
    const local = getFromStorage(KEYS.USERS, MOCK_USERS);
    const updated = local.filter(u => u.id !== id);
    saveToStorage(KEYS.USERS, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_users').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete user from Supabase:', e);
      }
    }
  },

  deletePalletType: async (id) => {
    const local = getFromStorage(KEYS.PALLET_TYPES, MOCK_PALLET_TYPES);
    const updated = local.filter(pt => pt.id !== id);
    saveToStorage(KEYS.PALLET_TYPES, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_pallet_types').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete pallet type from Supabase:', e);
      }
    }
  },

  deleteStockPallet: async (id) => {
    const local = getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
    const updated = local.filter(item => item.id !== id);
    saveToStorage(KEYS.STOCK_PALLET, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_stock_pallet').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete stock pallet from Supabase:', e);
      }
    }

    // Auto recalculate Outstanding POs (since mutasi history changed)
    try {
      const pos = await storageAPI.getOutstandingPOs();
      const dels = await storageAPI.getDeliveries();
      const updatedPOs = recalculatePOsWithMutasi(pos, updated, dels);
      saveToStorage(KEYS.OUTSTANDING_PO, updatedPOs);
      if (supabase) {
        try {
          await syncTable('mdp_outstanding_po', updatedPOs, mapOSToDb);
        } catch (e) {
          console.error("Gagal sinkronisasi otomatis Outstanding PO ke Supabase:", e);
        }
      }
    } catch (e) {
      console.error("Gagal sinkronisasi otomatis Outstanding PO dari Mutasi:", e);
    }
  },

  deleteKDBelum: async (id) => {
    const local = getFromStorage(KEYS.KILN_DRY_BELUM, MOCK_KD_BELUM);
    const updated = local.filter(item => item.id !== id);
    saveToStorage(KEYS.KILN_DRY_BELUM, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_kd_belum').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete KD Belum from Supabase:', e);
      }
    }
  },

  deleteKDSetelah: async (id) => {
    const local = getFromStorage(KEYS.KILN_DRY_SETELAH, MOCK_KD_SETELAH);
    const updated = local.filter(item => item.id !== id);
    saveToStorage(KEYS.KILN_DRY_SETELAH, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_kd_setelah').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete KD Setelah from Supabase:', e);
      }
    }
  },

  deleteKDListrik: async (id) => {
    const local = getFromStorage(KEYS.KILN_DRY_LISTRIK, MOCK_KD_LISTRIK);
    const updated = local.filter(item => item.id !== id);
    saveToStorage(KEYS.KILN_DRY_LISTRIK, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_kd_listrik').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete KD Listrik from Supabase:', e);
      }
    }
  },

  deleteMaterial: async (id) => {
    const local = getFromStorage(KEYS.MATERIALS, MOCK_MATERIALS);
    const updated = local.filter(m => m.id !== id);
    saveToStorage(KEYS.MATERIALS, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_materials').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete material from Supabase:', e);
      }
    }

    // Cascade delete material logs
    const localLogs = getFromStorage(KEYS.MATERIAL_LOGS, MOCK_MATERIAL_LOGS);
    const updatedLogs = localLogs.filter(log => log.materialId !== id);
    saveToStorage(KEYS.MATERIAL_LOGS, updatedLogs);
    if (supabase) {
      try {
        await supabase.from('mdp_material_logs').delete().eq('material_id', id);
      } catch (e) {
        console.error('Failed to cascade delete material logs from Supabase:', e);
      }
    }
  },

  deleteMaterialLog: async (id) => {
    const local = getFromStorage(KEYS.MATERIAL_LOGS, MOCK_MATERIAL_LOGS);
    const updated = local.filter(log => log.id !== id);
    saveToStorage(KEYS.MATERIAL_LOGS, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_material_logs').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete material log from Supabase:', e);
      }
    }
  },

  deleteRepair: async (id) => {
    const local = getFromStorage(KEYS.REPAIRS, MOCK_REPAIRS);
    const updated = local.filter(r => r.id !== id);
    saveToStorage(KEYS.REPAIRS, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_repairs').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete repair log from Supabase:', e);
      }
    }
  },

  deleteOutstandingPO: async (id) => {
    const local = getFromStorage(KEYS.OUTSTANDING_PO, MOCK_OUTSTANDING_PO);
    const updated = local.filter(po => po.id !== id);
    saveToStorage(KEYS.OUTSTANDING_PO, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_outstanding_po').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete outstanding PO from Supabase:', e);
      }
    }

    // Cascade delete PO deliveries
    const localDels = getFromStorage(KEYS.PO_DELIVERIES, []);
    const updatedDels = localDels.filter(del => del.poId !== id);
    saveToStorage(KEYS.PO_DELIVERIES, updatedDels);
    if (supabase) {
      try {
        await supabase.from('mdp_po_deliveries').delete().eq('po_id', id);
      } catch (e) {
        console.error('Failed to cascade delete PO deliveries from Supabase:', e);
      }
    }
  },

  deleteDelivery: async (id) => {
    const local = getFromStorage(KEYS.PO_DELIVERIES, []);
    const delToDelete = local.find(d => d.id === id);
    const updated = local.filter(del => del.id !== id);
    saveToStorage(KEYS.PO_DELIVERIES, updated);
    if (supabase) {
      try {
        const { error } = await supabase.from('mdp_po_deliveries').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete PO delivery from Supabase:', e);
      }
    }

    // Cascade delete matching stock pallet mutation to keep them in sync
    if (delToDelete && delToDelete.noReff) {
      const localStock = getFromStorage(KEYS.STOCK_PALLET, MOCK_STOCK_PALLET);
      const updatedStock = localStock.filter(item => item.subcontNama !== delToDelete.noReff);
      saveToStorage(KEYS.STOCK_PALLET, updatedStock);
      
      if (supabase) {
        try {
          await supabase.from('mdp_stock_pallet').delete().eq('subcont_nama', delToDelete.noReff);
        } catch (e) {
          console.error('Failed to delete matching stock pallet mutation from Supabase:', e);
        }
      }
    }
  }
};
