-- ==========================================
-- SKEMA DATABASE SUPABASE - CV MITRA DUNIA PALLETINDO
-- Jalankan query ini di SQL Editor Supabase Anda
-- ==========================================

-- Hapus tabel lama jika ada
DROP TABLE IF EXISTS mdp_material_logs;
DROP TABLE IF EXISTS mdp_repairs;
DROP TABLE IF EXISTS mdp_materials;
DROP TABLE IF EXISTS mdp_kd_listrik;
DROP TABLE IF EXISTS mdp_kd_setelah;
DROP TABLE IF EXISTS mdp_kd_belum;
DROP TABLE IF EXISTS mdp_stock_pallet;
DROP TABLE IF EXISTS mdp_pallet_types;
DROP TABLE IF EXISTS mdp_outstanding_po;
DROP TABLE IF EXISTS mdp_users;

-- 1. TABEL USER / PENGGUNA
CREATE TABLE mdp_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL MASTER JENIS PALLET
CREATE TABLE mdp_pallet_types (
    id TEXT PRIMARY KEY,
    nama TEXT UNIQUE NOT NULL,
    ukuran TEXT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL STOK PALLET CUSTOMER
CREATE TABLE mdp_stock_pallet (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL,
    customer TEXT NOT NULL,
    ukuran TEXT NOT NULL,
    produksi INTEGER DEFAULT 0,
    stock_awal INTEGER DEFAULT 0,
    dari_lumajang INTEGER DEFAULT 0,
    dari_subcont INTEGER DEFAULT 0,
    subcont_nama TEXT,
    pallet_keluar INTEGER DEFAULT 0,
    retur_lumajang INTEGER DEFAULT 0,
    retur_customer INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL KILN DRY (BELUM OVEN / ANTREAN)
CREATE TABLE mdp_kd_belum (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL,
    customer TEXT NOT NULL,
    ukuran TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Antri',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL KILN DRY (SETELAH OVEN / RIWAYAT)
CREATE TABLE mdp_kd_setelah (
    id TEXT PRIMARY KEY,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    customer TEXT NOT NULL,
    ukuran TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    kd TEXT NOT NULL,
    hasil TEXT DEFAULT 'Baik',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL LOG PEMAKAIAN LISTRIK KILN DRY
CREATE TABLE mdp_kd_listrik (
    id TEXT PRIMARY KEY,
    nama_pt TEXT NOT NULL,
    kd TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    hari JSONB NOT NULL,
    jumlah INTEGER DEFAULT 0,
    tanggal_mulai DATE NOT NULL,
    jam_mulai TEXT NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jam_selesai TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL BAHAN PENOLONG & ALAT KERJA
CREATE TABLE mdp_materials (
    id TEXT PRIMARY KEY,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL,
    stok_awal INTEGER DEFAULT 0,
    masuk INTEGER DEFAULT 0,
    keluar INTEGER DEFAULT 0,
    satuan TEXT NOT NULL,
    min_stok INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL REPAIR WAREHOUSE
CREATE TABLE mdp_repairs (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL,
    ukuran TEXT NOT NULL,
    qty_masuk INTEGER DEFAULT 0,
    qty_selesai INTEGER DEFAULT 0,
    qty_scrap INTEGER DEFAULT 0,
    petugas TEXT NOT NULL,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL OUTSTANDING PO (OS)
CREATE TABLE mdp_outstanding_po (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    tanggal DATE NOT NULL,
    tanggal_kirim DATE,
    customer TEXT NOT NULL,
    nomor_po TEXT NOT NULL,
    no_reff TEXT DEFAULT '',
    ukuran TEXT NOT NULL,
    jumlah_po INTEGER DEFAULT 0,
    kiriman INTEGER DEFAULT 0,
    kiriman_awal INTEGER DEFAULT 0,
    sisa_po INTEGER DEFAULT 0,
    retur INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nonaktifkan Row Level Security (RLS) untuk kemudahan akses client-side tanpa setup auth berlebih
ALTER TABLE mdp_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_pallet_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_stock_pallet DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_kd_belum DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_kd_setelah DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_kd_listrik DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_repairs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_outstanding_po DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- ISI DATA AWAL (SEED MOCK DATA)
-- ==========================================

-- Data Pengguna Default
INSERT INTO mdp_users (id, username, password, name, role, avatar) VALUES
('u1', 'admin', 'admin', 'Budi Santoso', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'),
('u2', 'user', 'user', 'Eko Wijaya', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100');

-- Data Jenis Pallet Default
INSERT INTO mdp_pallet_types (id, nama, ukuran, keterangan) VALUES
('pt1', 'Pallet Kayu Standar A', '1000x1200 mm', 'Pallet kayu standar tipe A Sidoarjo'),
('pt2', 'Pallet Kayu Standar B', '800x1200 mm', 'Pallet kayu standar tipe B Sidoarjo'),
('pt3', 'Pallet Kayu Standar C', '1100x1100 mm', 'Pallet kayu standar tipe C Sidoarjo');

-- Data Stok Pallet Awal
INSERT INTO mdp_stock_pallet (id, tanggal, customer, ukuran, produksi, stock_awal, dari_lumajang, dari_subcont, pallet_keluar, retur_lumajang, retur_customer) VALUES
('sp1', '2026-06-10', 'PT Indofood CBP', '1000x1200 mm', 150, 500, 100, 50, 200, 10, 15),
('sp2', '2026-06-11', 'PT Unilever Indonesia', '800x1200 mm', 200, 350, 80, 40, 150, 5, 10),
('sp3', '2026-06-12', 'PT Mayora Indah', '1100x1100 mm', 100, 600, 120, 0, 250, 20, 8),
('sp4', '2026-06-13', 'PT Gudang Garam Tbk', '1000x1200 mm', 180, 420, 0, 70, 190, 0, 12),
('sp5', '2026-06-14', 'PT Santos Jaya Abadi', '1000x1200 mm', 120, 502, 150, 80, 300, 15, 25);

-- Data Antrean Kiln Dry
INSERT INTO mdp_kd_belum (id, tanggal, customer, ukuran, qty, status) VALUES
('kdb1', '2026-06-14', 'PT Indofood CBP', '1000x1200 mm', 250, 'Antri'),
('kdb2', '2026-06-15', 'PT Mayora Indah', '1100x1100 mm', 180, 'Proses'),
('kdb3', '2026-06-15', 'PT Unilever Indonesia', '800x1200 mm', 300, 'Antri');

-- Data Riwayat Oven Kiln Dry
INSERT INTO mdp_kd_setelah (id, tanggal_mulai, tanggal_selesai, customer, ukuran, qty, kd, hasil, catatan) VALUES
('kds1', '2026-06-12', '2026-06-14', 'PT Indofood CBP', '1000x1200 mm', 200, 'KD 01', 'Baik', 'Proses pengeringan sempurna, MC 12%'),
('kds2', '2026-06-11', '2026-06-13', 'PT Gudang Garam Tbk', '1000x1200 mm', 150, 'KD 02', 'Baik', 'Kadar air rata-rata 14%');

-- Data Log Listrik Oven
INSERT INTO mdp_kd_listrik (id, nama_pt, kd, qty, hari, jumlah, tanggal_mulai, jam_mulai, tanggal_selesai, jam_selesai) VALUES
('kdl1', 'PT Indofood CBP', 'KD 01', 200, '{"Senin": true, "Selasa": true, "Rabu": true, "Kamis": false, "Jumat": false, "Sabtu": false, "Minggu": false}', 3, '2026-06-08', '08:00', '2026-06-10', '16:00'),
('kdl2', 'PT Gudang Garam Tbk', 'KD 02', 150, '{"Senin": false, "Selasa": false, "Rabu": true, "Kamis": true, "Jumat": true, "Sabtu": false, "Minggu": false}', 3, '2026-06-10', '10:00', '2026-06-12', '18:00'),
('kdl3', 'PT Mayora Indah', 'KD 01', 180, '{"Senin": false, "Selasa": false, "Rabu": false, "Kamis": false, "Jumat": true, "Sabtu": true, "Minggu": true}', 3, '2026-06-12', '13:00', '2026-06-15', '09:00');

-- Data Bahan & Alat Kerja
INSERT INTO mdp_materials (id, kode, nama, kategori, stok_awal, masuk, keluar, satuan, min_stok) VALUES
('m1', 'BP-001', 'Paku Coil 2.5"', 'Bahan Penolong', 50, 20, 15, 'DUS', 10),
('m2', 'BP-002', 'Paku Coil 1.5"', 'Bahan Penolong', 30, 10, 25, 'DUS', 15),
('m3', 'BP-003', 'Strap Band Plastik 15mm', 'Bahan Penolong', 15, 5, 12, 'ROLL', 5),
('m4', 'AK-001', 'Gergaji Kayu Circular 7"', 'Alat Kerja', 8, 2, 1, 'PCS', 3),
('m5', 'AK-002', 'Palu Besi 1.5 lbs', 'Alat Kerja', 12, 0, 2, 'PCS', 5),
('m6', 'AK-003', 'Mesin Amplas Udara (Pneumatic)', 'Alat Kerja', 5, 1, 0, 'PCS', 2),
('m7', 'BP-004', 'Cat Oven Hitam (Gloss)', 'Bahan Penolong', 25, 0, 22, 'PAIL', 8);

-- Data Reparasi Pallet
INSERT INTO mdp_repairs (id, tanggal, ukuran, qty_masuk, qty_selesai, qty_scrap, petugas, catatan) VALUES
('r1', '2026-06-12', '1000x1200 mm', 45, 40, 5, 'Supriadi', 'Kerusakan pada papan atas'),
('r2', '2026-06-13', '800x1200 mm', 30, 28, 2, 'Anto Wijaya', 'Penggantian balok tengah'),
('r3', '2026-06-14', '1100x1100 mm', 25, 20, 5, 'Supriadi', 'Papan banyak patah'),
('r4', '2026-06-15', '1000x1200 mm', 15, 10, 2, 'Rian Kurnia', 'Dalam proses perbaikan');

-- 10. TABEL RINCIAN PENGIRIMAN PO
CREATE TABLE IF NOT EXISTS mdp_po_deliveries (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES mdp_outstanding_po(id) ON DELETE CASCADE,
    tanggal_kirim DATE NOT NULL,
    no_reff TEXT DEFAULT '',
    qty_kirim INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nonaktifkan RLS untuk tabel pengiriman
ALTER TABLE mdp_po_deliveries DISABLE ROW LEVEL SECURITY;

-- Buat policy akses publik penuh agar read & write diizinkan meskipun RLS aktif/tidak bisa dinonaktifkan
DROP POLICY IF EXISTS "Allow public access" ON mdp_po_deliveries;
CREATE POLICY "Allow public access" ON mdp_po_deliveries FOR ALL TO public USING (true) WITH CHECK (true);

-- 11. TABEL LOG MUTASI BAHAN & ALAT KERJA
CREATE TABLE IF NOT EXISTS mdp_material_logs (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES mdp_materials(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    qty INTEGER NOT NULL CHECK (qty > 0),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nonaktifkan RLS untuk tabel log
ALTER TABLE mdp_material_logs DISABLE ROW LEVEL SECURITY;

-- Buat policy akses publik penuh agar read & write diizinkan meskipun RLS aktif
DROP POLICY IF EXISTS "Allow public access" ON mdp_material_logs;
CREATE POLICY "Allow public access" ON mdp_material_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- Data awal log mutasi bahan (sesuai dengan stok masuk/keluar di mdp_materials)
INSERT INTO mdp_material_logs (id, material_id, tanggal, tipe, qty, catatan) VALUES
('ml1', 'm1', '2026-06-20', 'masuk', 10, 'Restock supplier A'),
('ml2', 'm1', '2026-06-22', 'masuk', 10, 'Restock supplier B'),
('ml3', 'm1', '2026-06-23', 'keluar', 5, 'Pemakaian tim perbaikan'),
('ml4', 'm1', '2026-06-24', 'keluar', 10, 'Pemakaian perakitan pallet'),
('ml5', 'm2', '2026-06-21', 'masuk', 10, 'Restock paku coil'),
('ml6', 'm2', '2026-06-22', 'keluar', 15, 'Pemakaian produksi standar B'),
('ml7', 'm2', '2026-06-24', 'keluar', 10, 'Pemakaian produksi standar C'),
('ml8', 'm3', '2026-06-22', 'masuk', 5, 'Pembelian toko bangunan'),
('ml9', 'm3', '2026-06-23', 'keluar', 6, 'Packing pengiriman Mayora'),
('ml10', 'm3', '2026-06-24', 'keluar', 6, 'Packing pengiriman Indofood'),
('ml11', 'm4', '2026-06-20', 'masuk', 2, 'Restock alat kerja baru'),
('ml12', 'm4', '2026-06-22', 'keluar', 1, 'Gergaji lama tumpul'),
('ml13', 'm5', '2026-06-21', 'keluar', 2, 'Dibagikan ke tim perbaikan baru'),
('ml14', 'm6', '2026-06-23', 'masuk', 1, 'Pembelian mesin amplas cadangan'),
('ml15', 'm7', '2026-06-22', 'keluar', 12, 'Pengecatan pallet hitam order Unilever'),
('ml16', 'm7', '2026-06-24', 'keluar', 10, 'Pengecatan sisa stock pallet');
