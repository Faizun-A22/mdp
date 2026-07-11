import React, { useState, useEffect } from 'react';
import useStickyState from '../utils/useStickyState';
import { storageAPI } from '../utils/storage';
import { Plus, Search, AlertTriangle, ArrowUp, ArrowDown, Edit3, Trash2, X, Calendar, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Materials({ user }) {
  const [materials, setMaterials] = useState([]);
  const [materialLogs, setMaterialLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState('aktual'); // 'aktual', 'harian', 'rekapan'
  
  // Date and search filters for reports
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeeklyDate, setSelectedWeeklyDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportSearch, setReportSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useStickyState(false, 'mat_isModalOpen');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useStickyState(false, 'mat_isAdjustModalOpen');
  const [editingItem, setEditingItem] = useState(null);
  const [adjustingItem, setAdjustingItem] = useState(null);

  // Form states
  const [formData, setFormData] = useStickyState({
    kode: '',
    nama: '',
    kategori: 'Bahan Penolong',
    stokAwal: 0,
    masuk: 0,
    keluar: 0,
    satuan: 'PCS',
    minStok: 5
  }, 'mat_formData');

  const [adjustData, setAdjustData] = useStickyState({
    type: 'masuk', // masuk or keluar
    qty: 0,
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ''
  }, 'mat_adjustData');

  useEffect(() => {
    const loadAllData = async () => {
      const mats = await storageAPI.getMaterials();
      const logs = await storageAPI.getMaterialLogs();
      setMaterials(mats);
      setMaterialLogs(logs);
    };
    loadAllData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const calculateStockAkhir = (item) => {
    return Number(item.stokAwal) + Number(item.masuk) - Number(item.keluar);
  };

  const generateNextCode = (kategori, allMaterials) => {
    const prefix = kategori === 'Bahan Penolong' ? 'BP-' : 'AK-';
    const related = allMaterials.filter(m => m.kode && m.kode.startsWith(prefix));
    if (related.length === 0) return `${prefix}001`;
    let max = 0;
    related.forEach(m => {
      const numPart = m.kode.substring(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > max) max = num;
    });
    return `${prefix}${(max + 1).toString().padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.kode) {
      alert('Nama dan Kode barang wajib diisi!');
      return;
    }

    let updated;
    if (editingItem) {
      updated = materials.map(item => item.id === editingItem.id ? { ...formData, id: item.id } : item);
    } else {
      updated = [{ ...formData, id: 'mat_' + Date.now() }, ...materials];
    }
    setMaterials(updated);
    await storageAPI.saveMaterials(updated);
    closeModal();
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (adjustData.qty <= 0) {
      alert('Jumlah perubahan harus lebih dari 0!');
      return;
    }

    const newLog = {
      id: 'ml_' + Date.now(),
      materialId: adjustingItem.id,
      tanggal: adjustData.tanggal || new Date().toISOString().split('T')[0],
      tipe: adjustData.type,
      qty: adjustData.qty,
      catatan: adjustData.catatan || ''
    };

    const updatedLogs = [newLog, ...materialLogs];
    setMaterialLogs(updatedLogs);
    await storageAPI.saveMaterialLogs(updatedLogs);

    const updated = materials.map(item => {
      if (item.id === adjustingItem.id) {
        return {
          ...item,
          masuk: adjustData.type === 'masuk' ? item.masuk + adjustData.qty : item.masuk,
          keluar: adjustData.type === 'keluar' ? item.keluar + adjustData.qty : item.keluar
        };
      }
      return item;
    });

    setMaterials(updated);
    await storageAPI.saveMaterials(updated);
    closeAdjustModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus aset bahan/alat kerja ini? Semua catatan mutasi terkait juga akan terhapus.')) {
      const updated = materials.filter(item => item.id !== id);
      const updatedLogs = materialLogs.filter(log => log.materialId !== id);
      
      setMaterials(updated);
      setMaterialLogs(updatedLogs);
      
      await storageAPI.deleteMaterial(id);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan mutasi ini? Stok barang akan disesuaikan kembali.')) {
      return;
    }
    const logToDelete = materialLogs.find(log => log.id === logId);
    if (!logToDelete) return;
    
    const updatedMaterials = materials.map(item => {
      if (item.id === logToDelete.materialId) {
        return {
          ...item,
          masuk: logToDelete.tipe === 'masuk' ? Math.max(0, item.masuk - logToDelete.qty) : item.masuk,
          keluar: logToDelete.tipe === 'keluar' ? Math.max(0, item.keluar - logToDelete.qty) : item.keluar
        };
      }
      return item;
    });
    
    const updatedLogs = materialLogs.filter(log => log.id !== logId);
    
    setMaterials(updatedMaterials);
    setMaterialLogs(updatedLogs);
    
    await storageAPI.deleteMaterialLog(logId);
    await storageAPI.saveMaterials(updatedMaterials);
  };

  const openAdjustModal = (item) => {
    setAdjustingItem(item);
    setAdjustData({ 
      type: 'masuk', 
      qty: 0, 
      tanggal: new Date().toISOString().split('T')[0], 
      catatan: '' 
    });
    setIsAdjustModalOpen(true);
  };

  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      monday,
      sunday
    };
  };

  const exportDailyToExcel = () => {
    const dailyLogs = materialLogs.filter(log => log.tanggal === selectedDailyDate);
    
    if (dailyLogs.length === 0) {
      alert('Tidak ada data mutasi untuk tanggal ini.');
      return;
    }
    
    const exportData = dailyLogs.map((log, index) => {
      const mat = materials.find(m => m.id === log.materialId) || {};
      return {
        'No': index + 1,
        'Tanggal': log.tanggal,
        'Kode': mat.kode || '',
        'Nama Barang': mat.nama || '',
        'Kategori': mat.kategori || '',
        'Jenis Mutasi': log.tipe === 'masuk' ? 'Stok Masuk (+)' : 'Stok Keluar (-)',
        'Jumlah': log.qty,
        'Satuan': mat.satuan || '',
        'Catatan': log.catatan || ''
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Harian");
    
    const max_len = [5, 12, 12, 25, 15, 15, 8, 8, 30];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));
    
    XLSX.writeFile(workbook, `Laporan_Harian_Bahan_${selectedDailyDate}.xlsx`);
  };

  const exportWeeklyToExcel = () => {
    const { start, end } = getWeekRange(selectedWeeklyDate);
    
    const exportData = materials.map((item, index) => {
      const logsBefore = materialLogs.filter(log => log.materialId === item.id && log.tanggal < start);
      const totalMasukBefore = logsBefore.filter(l => l.tipe === 'masuk').reduce((acc, curr) => acc + curr.qty, 0);
      const totalKeluarBefore = logsBefore.filter(l => l.tipe === 'keluar').reduce((acc, curr) => acc + curr.qty, 0);
      const stockAwalWeek = item.stokAwal + totalMasukBefore - totalKeluarBefore;
      
      const logsDuring = materialLogs.filter(log => log.materialId === item.id && log.tanggal >= start && log.tanggal <= end);
      const totalMasukDuring = logsDuring.filter(l => l.tipe === 'masuk').reduce((acc, curr) => acc + curr.qty, 0);
      const totalKeluarDuring = logsDuring.filter(l => l.tipe === 'keluar').reduce((acc, curr) => acc + curr.qty, 0);
      
      const stockAkhirWeek = stockAwalWeek + totalMasukDuring - totalKeluarDuring;
      
      return {
        'No': index + 1,
        'Kode': item.kode,
        'Nama Barang': item.nama,
        'Kategori': item.kategori,
        'Stok Awal Mingguan': stockAwalWeek,
        'Masuk (Minggu Ini)': totalMasukDuring,
        'Keluar (Minggu Ini)': totalKeluarDuring,
        'Stok Akhir Mingguan': stockAkhirWeek,
        'Satuan': item.satuan,
        'Batas Min': item.minStok,
        'Status': stockAkhirWeek <= item.minStok ? 'Kritis' : 'Aman'
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Mingguan");
    
    const max_len = [5, 12, 25, 15, 18, 18, 18, 18, 8, 10, 10];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));
    
    XLSX.writeFile(workbook, `Rekap_Mingguan_Bahan_${start}_s.d_${end}.xlsx`);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      kode: '',
      nama: '',
      kategori: 'Bahan Penolong',
      stokAwal: 0,
      masuk: 0,
      keluar: 0,
      satuan: 'PCS',
      minStok: 5
    });
  };

  const openNewItemModal = () => {
    setEditingItem(null);
    setFormData({
      kode: generateNextCode('Bahan Penolong', materials),
      nama: '',
      kategori: 'Bahan Penolong',
      stokAwal: 0,
      masuk: 0,
      keluar: 0,
      satuan: 'PCS',
      minStok: 5
    });
    setIsModalOpen(true);
  };

  const closeAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setAdjustingItem(null);
  };

  const filteredMaterials = materials.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || 
                          item.kode.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || item.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Bahan Penolong & Alat Kerja</h2>
          <p className="text-slate-500 mt-1 font-medium">Kelola stok paku, cat, strapping band, gergaji, palu, dan kebutuhan warehouse lainnya</p>
        </div>
        {isAdmin && activeSubTab === 'aktual' && (
          <button
            onClick={openNewItemModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-50 hover:to-indigo-50 text-white font-bold transition-all text-sm cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Tambah Barang Baru
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveSubTab('aktual'); setReportSearch(''); }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'aktual'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Stok Aktual
        </button>
        <button
          onClick={() => { setActiveSubTab('harian'); setReportSearch(''); }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'harian'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Laporan Harian (Mutasi)
        </button>
        <button
          onClick={() => { setActiveSubTab('rekapan'); setReportSearch(''); }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'rekapan'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rekap Mingguan
        </button>
      </div>

      {/* TAB 1: STOK AKTUAL */}
      {activeSubTab === 'aktual' && (
        <>
          {/* Control Panel */}
          <div className="glass-card bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari kode atau nama barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-880 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
              />
            </div>

            <div className="flex gap-2.5 w-full md:w-auto">
              {['Semua', 'Bahan Penolong', 'Alat Kerja'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-150 shadow-xs'
                      : 'bg-transparent text-slate-500 border-slate-200 hover:text-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.length === 0 ? (
              <div className="col-span-full py-16 text-center glass-card bg-white rounded-2xl text-slate-400 font-medium">
                Tidak ada persediaan barang yang sesuai.
              </div>
            ) : (
              filteredMaterials.map(item => {
                const stockAkhir = calculateStockAkhir(item);
                const isCritical = stockAkhir <= item.minStok;
                return (
                  <div
                    key={item.id}
                    className={`glass-card bg-white rounded-2xl p-5 border relative overflow-hidden transition-all duration-200 ${
                      isCritical 
                        ? 'border-rose-200 bg-rose-50/[0.15] hover:border-rose-300' 
                        : 'border-slate-100 hover:border-indigo-100'
                    }`}
                  >
                    {/* Critical Ribbon */}
                    {isCritical && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Kritis
                      </div>
                    )}

                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {item.kategori}
                    </span>

                    <div className="mt-4">
                      <span className="text-xs font-bold text-slate-400">{item.kode}</span>
                      <h3 className="text-base font-bold text-slate-800 mt-0.5 line-clamp-1">{item.nama}</h3>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Awal</span>
                        <span className="font-bold text-slate-700 block mt-0.5">{item.stokAwal}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600 text-[9px] font-bold uppercase tracking-wider block">Masuk</span>
                        <span className="font-bold text-emerald-600 block mt-0.5">+{item.masuk}</span>
                      </div>
                      <div>
                        <span className="text-rose-600 text-[9px] font-bold uppercase tracking-wider block">Keluar</span>
                        <span className="font-bold text-rose-600 block mt-0.5">-{item.keluar}</span>
                      </div>
                    </div>

                    {/* Bottom row: Stock calculation and actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Stok Akhir</span>
                        <span className={`text-xl font-black ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                          {stockAkhir} <span className="text-xs font-normal text-slate-500">{item.satuan}</span>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openAdjustModal(item)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              Mutasi
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: LAPORAN HARIAN */}
      {activeSubTab === 'harian' && (
        <div className="space-y-6">
          {/* Control Panel Harian */}
          <div className="glass-card bg-white rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between border border-slate-100 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Laporan</label>
                <div className="relative w-full sm:w-56">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>
              
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cari Barang</label>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari kode atau nama..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={exportDailyToExcel}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-xs cursor-pointer shadow-md w-full sm:w-auto justify-center self-end"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ekspor Laporan Harian
            </button>
          </div>

          {/* Table Harian */}
          <div className="glass-card bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Kode</th>
                    <th className="px-6 py-4">Nama Barang</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Tipe Mutasi</th>
                    <th className="px-6 py-4 text-right">Jumlah</th>
                    <th className="px-6 py-4">Satuan</th>
                    <th className="px-6 py-4">Catatan</th>
                    {isAdmin && <th className="px-6 py-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const dailyLogs = materialLogs.filter(log => {
                      if (log.tanggal !== selectedDailyDate) return false;
                      const mat = materials.find(m => m.id === log.materialId);
                      if (!mat) return false;
                      const term = reportSearch.toLowerCase();
                      return mat.nama.toLowerCase().includes(term) || mat.kode.toLowerCase().includes(term);
                    });

                    if (dailyLogs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                            Tidak ada aktivitas mutasi barang pada tanggal ini.
                          </td>
                        </tr>
                      );
                    }

                    return dailyLogs.map((log, idx) => {
                      const mat = materials.find(m => m.id === log.materialId) || {};
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-700">{mat.kode}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{mat.nama}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded uppercase tracking-wider">
                              {mat.kategori}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              log.tipe === 'masuk' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-105' 
                                : 'bg-rose-50 text-rose-600 border-rose-105'
                            }`}>
                              {log.tipe === 'masuk' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {log.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-700">{log.qty}</td>
                          <td className="px-6 py-4 font-semibold text-slate-500 text-xs">{mat.satuan}</td>
                          <td className="px-6 py-4 text-slate-500 font-medium italic text-xs max-w-xs truncate">{log.catatan || '-'}</td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                title="Hapus mutasi (stok disesuaikan kembali)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP MINGGUAN */}
      {activeSubTab === 'rekapan' && (
        <div className="space-y-6">
          {/* Control Panel Rekapan */}
          {(() => {
            const { start, end } = getWeekRange(selectedWeeklyDate);
            return (
              <div className="glass-card bg-white rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between border border-slate-100 shadow-xs">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Acuan</label>
                    <div className="relative w-full sm:w-56">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="date"
                        value={selectedWeeklyDate}
                        onChange={(e) => setSelectedWeeklyDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col w-full sm:w-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rentang Rekap Mingguan</span>
                    <span className="text-sm font-bold text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 inline-block text-center sm:text-left">
                      📅 {new Date(start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} s.d. {new Date(end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex flex-col w-full sm:w-auto">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cari Barang</label>
                    <div className="relative w-full sm:w-60">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Cari kode atau nama..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={exportWeeklyToExcel}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-xs cursor-pointer shadow-md w-full sm:w-auto justify-center self-end"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Ekspor Rekap Mingguan
                </button>
              </div>
            );
          })()}

          {/* Table Rekap */}
          <div className="glass-card bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Kode</th>
                    <th className="px-6 py-4">Nama Barang</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4 text-right">Stok Awal</th>
                    <th className="px-6 py-4 text-right text-emerald-650">Masuk</th>
                    <th className="px-6 py-4 text-right text-rose-650">Keluar</th>
                    <th className="px-6 py-4 text-right">Stok Akhir</th>
                    <th className="px-6 py-4">Satuan</th>
                    <th className="px-6 py-4 text-center">Batas Min</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const { start, end } = getWeekRange(selectedWeeklyDate);
                    
                    const filtered = materials.filter(m => {
                      const term = reportSearch.toLowerCase();
                      return m.nama.toLowerCase().includes(term) || m.kode.toLowerCase().includes(term);
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                            Tidak ada barang yang sesuai.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((item, idx) => {
                      // Calculate stock before week start
                      const logsBefore = materialLogs.filter(log => log.materialId === item.id && log.tanggal < start);
                      const totalMasukBefore = logsBefore.filter(l => l.tipe === 'masuk').reduce((acc, curr) => acc + curr.qty, 0);
                      const totalKeluarBefore = logsBefore.filter(l => l.tipe === 'keluar').reduce((acc, curr) => acc + curr.qty, 0);
                      const stockAwalWeek = item.stokAwal + totalMasukBefore - totalKeluarBefore;
                      
                      // Calculate during the week
                      const logsDuring = materialLogs.filter(log => log.materialId === item.id && log.tanggal >= start && log.tanggal <= end);
                      const totalMasukDuring = logsDuring.filter(l => l.tipe === 'masuk').reduce((acc, curr) => acc + curr.qty, 0);
                      const totalKeluarDuring = logsDuring.filter(l => l.tipe === 'keluar').reduce((acc, curr) => acc + curr.qty, 0);
                      
                      const stockAkhirWeek = stockAwalWeek + totalMasukDuring - totalKeluarDuring;
                      const isCriticalWeek = stockAkhirWeek <= item.minStok;

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isCriticalWeek ? 'bg-rose-50/10' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-700">{item.kode}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{item.nama}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded uppercase tracking-wider">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-700">{stockAwalWeek}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600">+{totalMasukDuring}</td>
                          <td className="px-6 py-4 text-right font-bold text-rose-600 text-slate-700">-{totalKeluarDuring}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-black text-[15px] ${isCriticalWeek ? 'text-rose-600' : 'text-slate-800'}`}>
                              {stockAkhirWeek}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-500 text-xs">{item.satuan}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-500">{item.minStok}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isCriticalWeek 
                                ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-105'
                            }`}>
                              {isCriticalWeek ? 'Kritis' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH/EDIT BARANG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">{editingItem ? 'Edit Informasi Aset' : 'Registrasi Aset Barang Baru'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Kode Aset</label>
                  <input
                    type="text"
                    placeholder="BP-001"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData({ 
                        ...formData, 
                        kategori: newCat,
                        kode: editingItem ? formData.kode : generateNextCode(newCat, materials)
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold cursor-pointer"
                  >
                    <option value="Bahan Penolong">Bahan Penolong</option>
                    <option value="Alat Kerja">Alat Kerja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Nama Barang / Aset</label>
                <input
                  type="text"
                  placeholder="Contoh: Paku Coil 2 Inch"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Stok Awal</label>
                  <input
                    type="number"
                    value={formData.stokAwal}
                    onChange={(e) => setFormData({ ...formData, stokAwal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Batas Min</label>
                  <input
                    type="number"
                    value={formData.minStok}
                    onChange={(e) => setFormData({ ...formData, minStok: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Satuan</label>
                  <input
                    type="text"
                    placeholder="DUS, PCS, ROLL"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan Aset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MUTASI STOK */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">Mutasi / Penyesuaian Stok</h3>
              <button onClick={closeAdjustModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] text-slate-400 font-bold">{adjustingItem?.kode}</span>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">{adjustingItem?.nama}</h4>
                <p className="text-slate-500 text-xs mt-1 font-medium">Stok saat ini: {calculateStockAkhir(adjustingItem)} {adjustingItem?.satuan}</p>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jenis Mutasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'masuk' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustData.type === 'masuk'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" /> Stok Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'keluar' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustData.type === 'keluar'
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" /> Stok Keluar (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal Mutasi</label>
                <input
                  type="date"
                  value={adjustData.tanggal}
                  onChange={(e) => setAdjustData({ ...adjustData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jumlah Mutasi ({adjustingItem?.satuan})</label>
                <input
                  type="number"
                  min="1"
                  value={adjustData.qty}
                  onChange={(e) => setAdjustData({ ...adjustData, qty: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Catatan / Deskripsi</label>
                <textarea
                  placeholder="Keterangan mutasi (contoh: restock supplier, pemakaian perbaikan pallet, dll)..."
                  value={adjustData.catatan}
                  onChange={(e) => setAdjustData({ ...adjustData, catatan: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeAdjustModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Terapkan Mutasi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
