import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storageAPI } from '../utils/storage';
import * as XLSX from 'xlsx';
import { 
  Table, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Save, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  FileSpreadsheet,
  AlertTriangle,
  X,
  Calendar,
  Smartphone,
  Sliders,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function SpreadsheetView({ user }) {
  const [activeTable, setActiveTable] = useState('stock_pallet'); // 'stock_pallet', 'outstanding_po', 'materials'
  const [gridData, setGridData] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Track unsaved changes
  
  // Persist Easy Mode preference (default to true for elderly users)
  const [isEasyMode, setIsEasyMode] = useState(() => {
    const saved = localStorage.getItem('mdp_spreadsheet_easy_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Modal forms state
  const [editingRow, setEditingRow] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1); // -1 means adding new row

  const fileInputRef = useRef(null);

  // Constants metadata for tables
  const tablesMeta = {
    stock_pallet: {
      name: 'Mutasi Stok Pallet',
      keys: ['tanggal', 'customer', 'ukuran', 'stockAwal', 'produksi', 'dariLumajang', 'dariSubcont', 'subcontNama', 'palletKeluar', 'returLumajang', 'returCustomer'],
      headers: ['Tanggal', 'Customer/Jenis', 'Ukuran', 'Stok Awal', 'Produksi', 'Dr Lumajang', 'Dr Subcont', 'Nama Subcont', 'Pallet Keluar', 'Retur Lumajang', 'Retur Customer'],
      types: ['date', 'select_customer', 'readonly', 'number', 'number', 'number', 'number', 'text', 'number', 'number', 'number'],
      defaultRow: () => ({
        id: 'sp_ss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        tanggal: new Date().toISOString().split('T')[0],
        customer: palletTypes[0]?.nama || '',
        ukuran: palletTypes[0]?.ukuran || '1000x1200 mm',
        stockAwal: 0,
        produksi: 0,
        dariLumajang: 0,
        dariSubcont: 0,
        subcontNama: '',
        palletKeluar: 0,
        returLumajang: 0,
        returCustomer: 0
      })
    },
    outstanding_po: {
      name: 'Outstanding PO (OS)',
      keys: ['tanggal', 'customer', 'nomorPo', 'noReff', 'ukuran', 'jumlahPo', 'kirimanAwal', 'kiriman', 'sisaPo', 'retur'],
      headers: ['Tanggal PO', 'Customer', 'Nomor PO', 'No Reff', 'Ukuran', 'Jumlah PO', 'Kirim Awal', 'Total Kirim', 'Sisa PO (Otomatis)', 'Retur'],
      types: ['date', 'text', 'text', 'text', 'text', 'number', 'number', 'number', 'readonly_number', 'number'],
      defaultRow: () => ({
        id: 'po_ss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        batchId: 'Batch PO',
        tanggal: new Date().toISOString().split('T')[0],
        customer: '',
        nomorPo: '',
        noReff: '',
        ukuran: '1000x1200 mm',
        jumlahPo: 0,
        kirimanAwal: 0,
        kiriman: 0,
        sisaPo: 0,
        retur: 0
      })
    },
    materials: {
      name: 'Stok Bahan & Alat Kerja',
      keys: ['kode', 'nama', 'kategori', 'satuan', 'stokAwal', 'masuk', 'keluar', 'minStok'],
      headers: ['Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Stok Awal', 'Masuk', 'Keluar', 'Min Stok'],
      types: ['text', 'text', 'select_kategori', 'text', 'number', 'number', 'number', 'number'],
      defaultRow: () => ({
        id: 'mat_ss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        kode: 'BP-' + String(Date.now()).substring(7),
        nama: '',
        kategori: 'Bahan Penolong',
        satuan: 'PCS',
        stokAwal: 0,
        masuk: 0,
        keluar: 0,
        minStok: 5
      })
    }
  };

  const categories = ['Bahan Penolong', 'Alat Kerja', 'Lain-lain'];
  const popularSatuans = ['PCS', 'DUS', 'ROLL', 'PAIL', 'SET', 'KILO'];

  const friendlyLabels = {
    // Stock Pallet
    stockAwal: 'Stok Awal Gudang',
    produksi: 'Pallet Baru Dibuat (Produksi)',
    dariLumajang: 'Pallet Masuk dari Lumajang',
    dariSubcont: 'Pallet Masuk dari Subcont (Vendor)',
    subcontNama: 'Nama Subcont / Vendor',
    palletKeluar: 'Pallet Keluar (Kirim ke Customer)',
    returLumajang: 'Pallet Retur Kembali ke Lumajang',
    returCustomer: 'Pallet Retur dari Customer',
    
    // OS PO
    tanggal: 'Tanggal Laporan',
    customer: 'Nama Customer / Pelanggan',
    ukuran: 'Ukuran Pallet',
    nomorPo: 'Nomor Purchase Order (PO)',
    noReff: 'Nomor Surat Jalan (No Reff)',
    jumlahPo: 'Jumlah PO (Total Order)',
    kirimanAwal: 'Kirim Awal',
    kiriman: 'Total Sudah Dikirim',
    sisaPo: 'Sisa PO yang Belum Dikirim',
    retur: 'Palur Retur dari Kiriman',
    
    // Materials
    kode: 'Kode Barang / Alat',
    nama: 'Nama Barang / Nama Alat',
    kategori: 'Kategori Barang',
    satuan: 'Satuan Hitung',
    masuk: 'Jumlah Barang Masuk (+)',
    keluar: 'Jumlah Barang Keluar (-)',
    minStok: 'Stok Minimal Aman'
  };

  // Toggle mode & save preference
  const handleToggleEasyMode = (val) => {
    setIsEasyMode(val);
    localStorage.setItem('mdp_spreadsheet_easy_mode', JSON.stringify(val));
  };

  // Load configuration and data
  const loadData = async (targetTable) => {
    setIsLoading(true);
    try {
      const types = await storageAPI.getPalletTypes();
      setPalletTypes(types);

      let data = [];
      if (targetTable === 'stock_pallet') {
        data = await storageAPI.getStockPallets();
        // Sort descending by date
        data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      } else if (targetTable === 'outstanding_po') {
        data = await storageAPI.getOutstandingPOs();
        data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      } else if (targetTable === 'materials') {
        data = await storageAPI.getMaterials();
        data.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
      }
      setGridData(data);
      setIsDirty(false); // Reset changes status
    } catch (err) {
      console.error('Gagal memuat data spreadsheet:', err);
      alert('Gagal memuat data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTable);
  }, [activeTable]);

  // Recalculate stock history helper for stock pallets
  const recalculateStockHistory = (allData) => {
    const groups = {};
    allData.forEach(item => {
      const key = `${item.customer}_${item.ukuran}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item });
    });

    const updatedData = [];

    for (const key in groups) {
      // Sort ascending chronologically for stock calculation
      const group = groups[key].sort((a, b) => {
        const dateA = new Date(a.tanggal);
        const dateB = new Date(b.tanggal);
        if (dateA - dateB !== 0) return dateA - dateB;
        const timeA = a.createdAt || a.id || '';
        const timeB = b.createdAt || b.id || '';
        return timeA.localeCompare(timeB);
      });
      
      let currentStock = 0;
      group.forEach((item, index) => {
        if (index === 0 || item.subcontNama === 'OPNAME') {
          currentStock = Number(item.stockAwal || 0);
        } else {
          item.stockAwal = currentStock;
        }
        
        currentStock = Number(item.stockAwal) + 
                       Number(item.produksi || 0) + 
                       Number(item.dariLumajang || 0) + 
                       Number(item.dariSubcont || 0) + 
                       Number(item.returCustomer || 0) - 
                       Number(item.palletKeluar || 0) - 
                       Number(item.returLumajang || 0);
                       
        updatedData.push(item);
      });
    }

    // Sort descending for display in table
    return updatedData.sort((a, b) => {
      const dateA = new Date(a.tanggal);
      const dateB = new Date(b.tanggal);
      if (dateA - dateB !== 0) return dateB - dateA;
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeB.localeCompare(timeA);
    });
  };

  // Handle cell edit
  const handleCellChange = (rowIndex, key, value, type) => {
    setIsDirty(true);
    setGridData(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      let parsedValue = value;
      if (type === 'number') {
        parsedValue = value === '' ? 0 : Number(value);
      }
      
      const updatedRow = { ...row, [key]: parsedValue };
      
      // Auto-fill logic
      if (activeTable === 'stock_pallet' && key === 'customer') {
        const matched = palletTypes.find(pt => pt.nama === value);
        if (matched) {
          updatedRow.ukuran = matched.ukuran;
        }
      }
      
      // Auto recalculate outstanding PO balance
      if (activeTable === 'outstanding_po') {
        const jumlahPo = key === 'jumlahPo' ? Number(value) : (row.jumlahPo || 0);
        const kiriman = key === 'kiriman' ? Number(value) : (row.kiriman || 0);
        const retur = key === 'retur' ? Number(value) : (row.retur || 0);
        updatedRow.sisaPo = Math.max(0, jumlahPo - kiriman + retur);
      }
      
      return updatedRow;
    }));
  };

  // Add new row in Table Mode
  const handleAddRow = () => {
    setIsDirty(true);
    const newRow = tablesMeta[activeTable].defaultRow();
    setGridData(prev => [newRow, ...prev]);
  };

  // Open guided assistant to add row
  const handleAddRowEasy = () => {
    const newRow = tablesMeta[activeTable].defaultRow();
    setEditingRow(newRow);
    setEditingIndex(-1);
  };

  // Open guided assistant to edit row
  const handleEditRowEasy = (row) => {
    setEditingRow({ ...row });
    setEditingIndex(gridData.indexOf(row));
  };

  // Delete row
  const handleDeleteRow = (rowIndex) => {
    if (confirm('Apakah Anda yakin ingin menghapus baris ini? (Perlu klik simpan untuk memperbarui database)')) {
      setIsDirty(true);
      setGridData(prev => prev.filter((_, idx) => idx !== rowIndex));
    }
  };

  // Save changes
  const handleSave = async () => {
    if (user && user.role !== 'admin' && activeTable === 'materials') {
      alert('Maaf, hanya Admin yang dapat mengedit data Bahan & Alat Kerja.');
      return;
    }
    
    setIsSaving(true);
    try {
      let finalData = [...gridData];
      if (activeTable === 'stock_pallet') {
        // Recalculate running stock values
        finalData = recalculateStockHistory(finalData);
        await storageAPI.saveStockPallets(finalData);
        setGridData(finalData);
      } else if (activeTable === 'outstanding_po') {
        await storageAPI.saveOutstandingPOs(finalData);
      } else if (activeTable === 'materials') {
        await storageAPI.saveMaterials(finalData);
      }
      setIsDirty(false); // Reset changes status
      alert('Data berhasil disimpan dan disinkronisasikan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered rows for rendering
  const filteredData = useMemo(() => {
    if (!searchQuery) return gridData;
    const q = searchQuery.toLowerCase();
    
    return gridData.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [gridData, searchQuery]);

  // Export to Excel
  const handleExport = () => {
    const meta = tablesMeta[activeTable];
    const exportRows = filteredData.map((row, index) => {
      const obj = { 'No': index + 1 };
      meta.headers.forEach((hdr, idx) => {
        const key = meta.keys[idx];
        obj[hdr] = row[key];
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, meta.name);
    
    XLSX.writeFile(workbook, `Ekspor_Spreadsheet_${activeTable}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Import from Excel
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBin = evt.target.result;
        const workbook = XLSX.read(dataBin, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          alert('File Excel kosong atau tidak valid.');
          return;
        }

        const meta = tablesMeta[activeTable];
        const importedData = [];

        // Dynamic header matching dictionary
        const keyAliases = {
          tanggal: ['tanggal', 'tgl', 'date', 'tanggal po'],
          tanggal_kirim: ['tanggal kirim', 'tgl kirim', 'kirim tgl'],
          customer: ['customer', 'pelanggan', 'jenis', 'jenis pallet', 'pallet type'],
          nomorPo: ['nomor po', 'po', 'no po', 'po no'],
          noReff: ['no reff', 'reff', 'referensi', 'no_reff'],
          ukuran: ['ukuran', 'dimensi', 'size', 'dimension'],
          stockAwal: ['stok awal', 'stock awal', 'stok_awal', 'stock_awal', 'awal'],
          produksi: ['produksi', 'prod', 'qty produksi'],
          dariLumajang: ['dari lumajang', 'lumajang', 'dr lumajang'],
          dariSubcont: ['dari subcont', 'subcont', 'dr subcont'],
          subcontNama: ['subcont nama', 'nama subcont', 'subcont_nama', 'nama_subcont', 'vendor'],
          palletKeluar: ['pallet keluar', 'keluar', 'pallet_keluar', 'pengiriman'],
          returLumajang: ['retur lumajang', 'retur_lumajang', 'retur lmj'],
          returCustomer: ['retur customer', 'retur_customer', 'retur cust', 'retur'],
          jumlahPo: ['jumlah po', 'jumlah_po', 'qty po', 'total po'],
          kirimanAwal: ['kiriman awal', 'kiriman_awal', 'kirim awal'],
          kiriman: ['kiriman', 'total kirim', 'dikirim', 'qty kirim'],
          sisaPo: ['sisa po', 'sisa_po', 'sisa', 'outstanding'],
          retur: ['retur', 'retur po'],
          kode: ['kode barang', 'kode', 'kode_barang', 'item code'],
          nama: ['nama barang', 'nama', 'nama_barang', 'item name'],
          kategori: ['kategori', 'category', 'jenis barang'],
          satuan: ['satuan', 'unit'],
          minStok: ['min stok', 'min_stok', 'minimum stok', 'min stock']
        };

        rows.forEach((excelRow, index) => {
          const rowKeys = Object.keys(excelRow);
          const mappedRow = meta.defaultRow();
          mappedRow.id = `${activeTable}_ss_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`;

          meta.keys.forEach(key => {
            const aliases = keyAliases[key] || [key];
            const matchHeader = rowKeys.find(header => 
              aliases.includes(String(header).toLowerCase().trim())
            );

            if (matchHeader !== undefined) {
              let val = excelRow[matchHeader];
              const idxInKeys = meta.keys.indexOf(key);
              const type = meta.types[idxInKeys];

              if (type === 'number' || type === 'readonly_number') {
                mappedRow[key] = val === undefined || val === '' ? 0 : Number(val);
              } else if (type === 'date') {
                if (typeof val === 'number') {
                  const dateObj = new Date((val - 25569) * 86400 * 1000);
                  if (dateObj && !isNaN(dateObj.getTime())) {
                    mappedRow[key] = dateObj.toISOString().split('T')[0];
                  } else {
                    mappedRow[key] = new Date().toISOString().split('T')[0];
                  }
                } else {
                  mappedRow[key] = String(val || '').trim() || new Date().toISOString().split('T')[0];
                }
              } else {
                mappedRow[key] = String(val || '').trim();
              }
            }
          });

          if (activeTable === 'stock_pallet') {
            const matched = palletTypes.find(pt => pt.nama === mappedRow.customer);
            if (matched) mappedRow.ukuran = matched.ukuran;
          }
          if (activeTable === 'outstanding_po') {
            mappedRow.sisaPo = Math.max(0, (mappedRow.jumlahPo || 0) - (mappedRow.kiriman || 0) + (mappedRow.retur || 0));
          }

          importedData.push(mappedRow);
        });

        setIsDirty(true);
        if (confirm(`Berhasil membaca ${importedData.length} baris dari Excel.\n\nApakah Anda ingin MENGGABUNGKAN (Merge) data ini ke data grid saat ini?\n(Klik 'OK' untuk Merge, Klik 'Batal' untuk OVERWRITE/MENGGANTI semua data grid saat ini)`)) {
          setGridData(prev => [...importedData, ...prev]);
        } else {
          setGridData(importedData);
        }
      } catch (err) {
        console.error(err);
        alert('Gagal mengimpor file Excel: ' + err.message);
      }
      e.target.value = ''; // Reset input uploader
    };
    reader.readAsBinaryString(file);
  };

  // Save changes from Guided Assistant modal
  const handleSaveModalRow = () => {
    if (activeTable === 'stock_pallet') {
      if (!editingRow.customer) {
        alert('Maaf, Anda harus memilih Customer terlebih dahulu!');
        return;
      }
    } else if (activeTable === 'outstanding_po') {
      if (!editingRow.customer) {
        alert('Maaf, Nama Customer tidak boleh kosong!');
        return;
      }
      if (!editingRow.nomorPo) {
        alert('Maaf, Nomor PO tidak boleh kosong!');
        return;
      }
    } else if (activeTable === 'materials') {
      if (!editingRow.nama) {
        alert('Maaf, Nama Barang tidak boleh kosong!');
        return;
      }
      if (!editingRow.kode) {
        alert('Maaf, Kode Barang tidak boleh kosong!');
        return;
      }
    }

    setIsDirty(true);
    if (editingIndex === -1) {
      // Add new row at the top
      setGridData(prev => [editingRow, ...prev]);
    } else {
      // Edit existing row
      setGridData(prev => prev.map((row, idx) => idx === editingIndex ? editingRow : row));
    }
    setEditingRow(null);
  };

  // Helper date function for nice formatting
  const formatIndonesianDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return d.toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  // Helper components for Numeric Adjusters (+ / - buttons) in the modal
  const renderNumericAdjuster = (label, fieldKey, description) => {
    const value = Number(editingRow[fieldKey] || 0);

    const adjust = (amount) => {
      setEditingRow(prev => {
        const current = Number(prev[fieldKey] || 0);
        const newValue = Math.max(0, current + amount);
        const updated = { ...prev, [fieldKey]: newValue };

        // Auto calculation for POs
        if (activeTable === 'outstanding_po') {
          const jumlahPo = fieldKey === 'jumlahPo' ? newValue : (prev.jumlahPo || 0);
          const kiriman = fieldKey === 'kiriman' ? newValue : (prev.kiriman || 0);
          const retur = fieldKey === 'retur' ? newValue : (prev.retur || 0);
          updated.sisaPo = Math.max(0, jumlahPo - kiriman + retur);
        }
        return updated;
      });
    };

    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-350 transition-all space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-black text-slate-700 tracking-wide block uppercase">
            {label}
          </label>
          {description && (
            <span className="text-[10px] bg-slate-200 text-slate-650 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              {description}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2">
          {/* Minus Buttons */}
          <button
            type="button"
            onClick={() => adjust(-10)}
            className="w-12 h-12 bg-white hover:bg-slate-100 text-slate-500 border border-slate-250 rounded-xl text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-xs flex items-center justify-center"
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="w-12 h-12 bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-sm font-extrabold transition-all active:scale-90 cursor-pointer shadow-xs flex items-center justify-center"
          >
            -1
          </button>

          {/* Number Display Input */}
          <input
            type="number"
            value={editingRow[fieldKey] === 0 ? '' : editingRow[fieldKey]}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              setEditingRow(prev => {
                const updated = { ...prev, [fieldKey]: val };
                if (activeTable === 'outstanding_po') {
                  const jumlahPo = fieldKey === 'jumlahPo' ? val : (prev.jumlahPo || 0);
                  const kiriman = fieldKey === 'kiriman' ? val : (prev.kiriman || 0);
                  const retur = fieldKey === 'retur' ? val : (prev.retur || 0);
                  updated.sisaPo = Math.max(0, jumlahPo - kiriman + retur);
                }
                return updated;
              });
            }}
            className="w-24 h-12 text-center text-xl font-black bg-white text-indigo-755 border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
          />

          {/* Plus Buttons */}
          <button
            type="button"
            onClick={() => adjust(1)}
            className="w-12 h-12 bg-indigo-55 hover:bg-indigo-100 text-indigo-650 border border-indigo-150 rounded-xl text-sm font-extrabold transition-all active:scale-90 cursor-pointer shadow-xs flex items-center justify-center"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => adjust(10)}
            className="w-12 h-12 bg-indigo-55 hover:bg-indigo-100 text-indigo-650 border border-indigo-150 rounded-xl text-xs font-extrabold transition-all active:scale-90 cursor-pointer shadow-xs flex items-center justify-center"
          >
            +10
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Table className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Manajemen Laporan Gudang</h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Input Cepat & Monitoring Fleksibel</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          {/* Table Selector */}
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-black uppercase tracking-wider">Pilih Tabel:</label>
            <select
              value={activeTable}
              onChange={(e) => {
                setActiveTable(e.target.value);
                setSearchQuery('');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-sm focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="stock_pallet">Mutasi Stok Pallet</option>
              <option value="outstanding_po">Outstanding PO (OS)</option>
              <option value="materials">Stok Bahan & Alat Kerja</option>
            </select>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400"
            />
          </div>

          <button
            onClick={() => loadData(activeTable)}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Import / Export */}
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Impor Excel</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 bg-gradient-to-r from-indigo-650 to-indigo-800 hover:from-indigo-600 hover:to-indigo-750 text-white font-extrabold py-2.5 px-5 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-indigo-600/10 ${
              isSaving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan ke Database</span>
          </button>
        </div>
      </div>

      {/* Mode Switches Bar - Extremely clear for elderly users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        <button
          onClick={() => handleToggleEasyMode(true)}
          className={`flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl font-extrabold text-sm transition-all cursor-pointer border ${
            isEasyMode 
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
              : 'bg-transparent text-slate-600 hover:text-slate-800 border-transparent'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <div className="text-left">
            <span className="block font-black text-sm">📱 Mode Mudah (Ramah Lansia)</span>
            <span className="block text-[10px] font-bold opacity-80 uppercase">Rekomendasi HP & Orang Tua</span>
          </div>
        </button>
        
        <button
          onClick={() => handleToggleEasyMode(false)}
          className={`flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl font-extrabold text-sm transition-all cursor-pointer border ${
            !isEasyMode 
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
              : 'bg-transparent text-slate-600 hover:text-slate-800 border-transparent'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <div className="text-left">
            <span className="block font-black text-sm">💻 Mode Tabel (Excel Grid)</span>
            <span className="block text-[10px] font-bold opacity-80 uppercase">Rekomendasi Komputer / Admin</span>
          </div>
        </button>
      </div>

      {/* Pulsing Warning Banner for Unsaved Changes */}
      {isDirty && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-550 text-white border-none rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 text-white rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold tracking-wide uppercase">⚠️ PERHATIAN: Laporan Baru Belum Tersimpan!</h4>
              <p className="text-xs text-white/90 font-semibold">Data sudah masuk ke daftar sementara. Tekan tombol di samping atau tombol biru di atas agar tidak hilang saat aplikasi ditutup.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-white hover:bg-slate-50 text-orange-700 font-black text-xs py-3 px-5 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap self-end md:self-auto cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : '💾 SIMPAN DATA SEKARANG'}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center text-slate-400 font-bold text-sm shadow-xs">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-3" />
          <span>Sedang memuat data dari database...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 font-bold text-sm shadow-xs">
          🚫 Tidak ada data yang cocok dengan kriteria pencarian.
        </div>
      ) : isEasyMode ? (
        /* ================= MODE MUDAH (RAMAH LANSIA) ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredData.map((row, index) => {
              // 1. STOCK PALLET CARD
              if (activeTable === 'stock_pallet') {
                const totalStock = Number(row.stockAwal || 0) + 
                                   Number(row.produksi || 0) + 
                                   Number(row.dariLumajang || 0) + 
                                   Number(row.dariSubcont || 0) + 
                                   Number(row.returCustomer || 0) - 
                                   Number(row.palletKeluar || 0) - 
                                   Number(row.returLumajang || 0);

                return (
                  <div key={row.id || index} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">{row.customer}</h3>
                          <span className="inline-block mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase border border-indigo-100">
                            📐 {row.ukuran}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-slate-400 block uppercase">Tanggal</span>
                          <span className="text-sm font-extrabold text-slate-650">{formatIndonesianDate(row.tanggal)}</span>
                        </div>
                      </div>

                      {/* Card Stats Grid */}
                      <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Stok Awal</span>
                          <span className="text-sm font-black text-slate-700">{row.stockAwal}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-emerald-600 font-bold block uppercase">Produksi</span>
                          <span className="text-sm font-black text-emerald-700">+{row.produksi}</span>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                          <span className="text-[10px] text-rose-600 font-bold block uppercase">Kirim</span>
                          <span className="text-sm font-black text-rose-700">-{row.palletKeluar}</span>
                        </div>
                      </div>

                      {/* Detail log */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 text-xs font-semibold text-slate-500 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>Lumajang (Masuk / Retur):</span>
                          <span className="font-extrabold text-slate-750">+{row.dariLumajang} / -{row.returLumajang}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subcont ({row.subcontNama || 'Tanpa Nama'}):</span>
                          <span className="font-extrabold text-slate-750">+{row.dariSubcont}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retur Customer:</span>
                          <span className="font-extrabold text-slate-750">+{row.returCustomer}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Stok Akhir</span>
                        <span className="text-lg font-black text-indigo-700">{totalStock} Pcs</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRowEasy(row)}
                          className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          onClick={() => handleDeleteRow(gridData.indexOf(row))}
                          className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. OUTSTANDING PO CARD
              if (activeTable === 'outstanding_po') {
                const totalNeed = Number(row.jumlahPo || 0);
                const delivered = Number(row.kiriman || 0) - Number(row.retur || 0);
                const percent = totalNeed > 0 ? Math.min(100, Math.max(0, Math.round((delivered / totalNeed) * 100))) : 0;
                const isFinished = row.sisaPo === 0;

                return (
                  <div key={row.id || index} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">{row.customer}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                              PO: {row.nomorPo}
                            </span>
                            {row.noReff && (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                                Reff: {row.noReff}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-slate-400 block uppercase">Tanggal PO</span>
                          <span className="text-sm font-extrabold text-slate-650">{formatIndonesianDate(row.tanggal)}</span>
                        </div>
                      </div>

                      {/* Card Stats Grid */}
                      <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Total PO</span>
                          <span className="text-sm font-black text-slate-700">{row.jumlahPo}</span>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                          <span className="text-[10px] text-indigo-650 font-bold block uppercase">Kirim</span>
                          <span className="text-sm font-black text-indigo-700">{row.kiriman}</span>
                        </div>
                        <div className={`p-2 rounded-xl border ${isFinished ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <span className={`text-[10px] font-bold block uppercase ${isFinished ? 'text-emerald-600' : 'text-rose-600'}`}>
                            Sisa PO
                          </span>
                          <span className={`text-sm font-black ${isFinished ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {row.sisaPo}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4 space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-450">
                          <span>Progres Pengiriman PO:</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Ukuran</span>
                        <span className="text-xs font-black text-slate-750">{row.ukuran}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRowEasy(row)}
                          className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          onClick={() => handleDeleteRow(gridData.indexOf(row))}
                          className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // 3. MATERIALS CARD
              if (activeTable === 'materials') {
                const stockAkhir = Number(row.stokAwal || 0) + Number(row.masuk || 0) - Number(row.keluar || 0);
                const isLow = stockAkhir <= Number(row.minStok || 5);

                return (
                  <div key={row.id || index} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">{row.nama}</h3>
                          <span className="inline-block mt-1 bg-slate-100 text-slate-650 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                            📦 {row.kategori}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-slate-400 block uppercase">Kode</span>
                          <span className="text-sm font-extrabold text-slate-650 bg-slate-55 px-2 py-0.5 rounded-md border border-slate-200 inline-block font-mono">
                            {row.kode}
                          </span>
                        </div>
                      </div>

                      {/* Card Stats Grid */}
                      <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Stok Awal</span>
                          <span className="text-sm font-black text-slate-700">{row.stokAwal}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-emerald-600 font-bold block uppercase">Masuk</span>
                          <span className="text-sm font-black text-emerald-700">+{row.masuk}</span>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                          <span className="text-[10px] text-rose-600 font-bold block uppercase">Keluar</span>
                          <span className="text-sm font-black text-rose-700">-{row.keluar}</span>
                        </div>
                      </div>

                      {/* Low Stock Warning */}
                      {isLow && (
                        <div className="bg-amber-50 text-amber-800 border border-amber-250 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Peringatan: Stok hampir habis! Batas minimal: {row.minStok} {row.satuan}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Stok Akhir</span>
                        <span className="text-lg font-black text-indigo-750">{stockAkhir} {row.satuan}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRowEasy(row)}
                          className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          onClick={() => handleDeleteRow(gridData.indexOf(row))}
                          className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Large Plus Button for Easy Mode */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 gap-4 border-dashed mt-4">
            <button
              onClick={handleAddRowEasy}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base py-4 px-8 rounded-2xl cursor-pointer transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
            >
              <Plus className="w-6 h-6" />
              <span>➕ Tambah Laporan Baru</span>
            </button>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">
              Tekan tombol hijau di atas untuk memasukkan data baru dengan panduan mudah.
            </p>
          </div>
        </div>
      ) : (
        /* ================= MODE TABEL (EXCEL GRID LAMA) ================= */
        <div className="glass-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in">
          <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
            <table className="w-full border-collapse border-slate-200 text-left table-auto">
              {/* Headers */}
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-3 py-3 border-r border-slate-200 text-slate-400 text-center font-bold text-[10px] w-12 bg-slate-150 uppercase tracking-widest">
                    Row
                  </th>
                  
                  {tablesMeta[activeTable].headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 border-r border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider whitespace-nowrap bg-slate-100"
                    >
                      {header}
                    </th>
                  ))}
                  
                  <th className="px-3 py-3 text-slate-400 text-center font-bold text-[10px] w-12 uppercase bg-slate-100">
                    Aksi
                  </th>
                </tr>
              </thead>

              {/* Grid Rows */}
              <tbody className="divide-y divide-slate-200">
                {filteredData.map((row, rowIndex) => {
                  return (
                    <tr 
                      key={row.id || rowIndex} 
                      className="hover:bg-indigo-50/20 group/row transition-all duration-150"
                    >
                      <td className="px-3 py-2 border-r border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold text-center select-none">
                        {rowIndex + 1}
                      </td>

                      {tablesMeta[activeTable].keys.map((key, keyIdx) => {
                        const type = tablesMeta[activeTable].types[keyIdx];
                        const cellValue = row[key];
                        
                        return (
                          <td 
                            key={key} 
                            className="p-0 border-r border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all overflow-hidden"
                          >
                            {type === 'readonly' || type === 'readonly_number' ? (
                              <div className="px-3 py-2 bg-slate-50 text-slate-500 font-bold text-xs select-none h-9 flex items-center min-w-[100px] truncate">
                                {type === 'readonly_number' ? Number(cellValue || 0).toLocaleString('id-ID') : String(cellValue || '')}
                              </div>
                            ) : type === 'select_customer' ? (
                              <select
                                value={cellValue || ''}
                                onChange={(e) => handleCellChange(rowIndex, key, e.target.value, 'text')}
                                className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none h-9 cursor-pointer appearance-none"
                              >
                                <option value="">-- Pilih Customer --</option>
                                {palletTypes.map(pt => (
                                  <option key={pt.id} value={pt.nama}>{pt.nama}</option>
                                ))}
                              </select>
                            ) : type === 'select_kategori' ? (
                              <select
                                value={cellValue || ''}
                                onChange={(e) => handleCellChange(rowIndex, key, e.target.value, 'text')}
                                className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none h-9 cursor-pointer"
                              >
                                {categories.map((cat, catIdx) => (
                                  <option key={catIdx} value={cat}>{cat}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={type}
                                value={cellValue === null || cellValue === undefined ? '' : cellValue}
                                onChange={(e) => handleCellChange(rowIndex, key, e.target.value, type)}
                                className={`w-full px-3 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-xs h-9 ${
                                  type === 'number' 
                                    ? 'text-right font-bold text-indigo-700' 
                                    : type === 'date' 
                                      ? 'text-slate-655 font-semibold' 
                                      : 'text-slate-850 font-medium'
                                }`}
                              />
                            )}
                          </td>
                        );
                      })}

                      <td className="p-0 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          title="Hapus Baris"
                          className="p-1.5 text-rose-450 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer mx-auto block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom toolbar inside card */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              onClick={handleAddRow}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-emerald-600/10 w-full sm:w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris Baru</span>
            </button>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Perubahan dalam grid tidak langsung disimpan ke server. Klik <strong>"Simpan ke Database"</strong> untuk mengunggah.</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= GUIDED ENTRY MODAL (ASISTEN FORMULIR LANSIA) ================= */}
      {editingRow && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">
                  {editingIndex === -1 ? '➕ Tambah Data Laporan' : '✏️ Ubah Data Laporan'}
                </h3>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                  Tabel: {tablesMeta[activeTable].name}
                </p>
              </div>
              <button 
                onClick={() => setEditingRow(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin text-slate-700">
              
              {/* 1. DATE PICKER + SHORTCUTS */}
              {'tanggal' in editingRow && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-700 tracking-wide uppercase">
                      📅 {friendlyLabels.tanggal}
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Format: tgl/bln/thn</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={editingRow.tanggal}
                      onChange={(e) => setEditingRow(prev => ({ ...prev, tanggal: e.target.value }))}
                      className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingRow(prev => ({ ...prev, tanggal: new Date().toISOString().split('T')[0] }))}
                        className="flex-1 sm:flex-none h-12 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setEditingRow(prev => ({ ...prev, tanggal: yesterday.toISOString().split('T')[0] }));
                        }}
                        className="flex-1 sm:flex-none h-12 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Kemarin
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CUSTOMER / PRODUCT SELECTION FOR STOCK PALLET */}
              {activeTable === 'stock_pallet' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                    👤 Pilih Jenis Pallet / Customer
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {palletTypes.map(pt => {
                      const isSelected = editingRow.customer === pt.nama;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setEditingRow(prev => ({
                            ...prev,
                            customer: pt.nama,
                            ukuran: pt.ukuran
                          }))}
                          className={`px-4 py-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-650 border-indigo-650 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-100'
                          }`}
                        >
                          {pt.nama} ({pt.ukuran})
                        </button>
                      );
                    })}
                  </div>
                  {editingRow.customer && (
                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-850 p-3 rounded-xl text-xs font-bold flex justify-between">
                      <span>Ukuran Terpilih (Otomatis):</span>
                      <span className="font-black text-indigo-700">{editingRow.ukuran}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOMER INPUT FOR OUTSTANDING PO */}
              {activeTable === 'outstanding_po' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                    👤 {friendlyLabels.customer}
                  </label>
                  
                  {/* Tap from existing customer list */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Tekan tombol cepat di bawah:</span>
                    <div className="flex flex-wrap gap-2">
                      {palletTypes.map(pt => {
                        const isSelected = editingRow.customer === pt.nama;
                        return (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => setEditingRow(prev => ({
                              ...prev,
                              customer: pt.nama,
                              ukuran: pt.ukuran
                            }))}
                            className={`px-3 py-2 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-650 border-indigo-650 text-white'
                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {pt.nama}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={editingRow.customer || ''}
                    placeholder="Atau ketik nama customer lain..."
                    onChange={(e) => setEditingRow(prev => ({ ...prev, customer: e.target.value }))}
                    className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  
                  {/* Size quick select buttons for PO */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Ukuran Pallet:</span>
                    <div className="flex flex-wrap gap-2">
                      {['1000x1200 mm', '800x1200 mm', '1100x1100 mm', '1150x1150 mm'].map(sz => {
                        const isSelected = editingRow.ukuran === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setEditingRow(prev => ({ ...prev, ukuran: sz }))}
                            className={`px-3 py-2 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-650 border-indigo-650 text-white'
                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={editingRow.ukuran || ''}
                      placeholder="Atau ketik ukuran manual..."
                      onChange={(e) => setEditingRow(prev => ({ ...prev, ukuran: e.target.value }))}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all mt-2"
                    />
                  </div>
                </div>
              )}

              {/* 3. PO NUMBER INPUTS */}
              {activeTable === 'outstanding_po' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                      📝 {friendlyLabels.nomorPo}
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan Nomor PO"
                      value={editingRow.nomorPo || ''}
                      onChange={(e) => setEditingRow(prev => ({ ...prev, nomorPo: e.target.value }))}
                      className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                      🚚 {friendlyLabels.noReff}
                    </label>
                    <input
                      type="text"
                      placeholder="Nomor Surat Jalan / Referensi"
                      value={editingRow.noReff || ''}
                      onChange={(e) => setEditingRow(prev => ({ ...prev, noReff: e.target.value }))}
                      className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* 4. MATERIALS SPECIFIC FIELDS */}
              {activeTable === 'materials' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                        🔑 {friendlyLabels.kode}
                      </label>
                      <input
                        type="text"
                        value={editingRow.kode || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, kode: e.target.value }))}
                        className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                        🏷️ Nama Barang / Alat
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Paku Coil"
                        value={editingRow.nama || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, nama: e.target.value }))}
                        className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Kategori Quick Tap */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                      📁 Kategori Barang
                    </label>
                    <div className="flex gap-2">
                      {categories.map(cat => {
                        const isSelected = editingRow.kategori === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEditingRow(prev => ({ ...prev, kategori: cat }))}
                            className={`flex-1 py-3 px-4 rounded-xl border text-xs font-extrabold text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-650 border-indigo-650 text-white shadow-md'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Satuan Quick Tap */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                      ⚖️ Satuan Unit
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {popularSatuans.map(sat => {
                        const isSelected = editingRow.satuan === sat;
                        return (
                          <button
                            key={sat}
                            type="button"
                            onClick={() => setEditingRow(prev => ({ ...prev, satuan: sat }))}
                            className={`px-3 py-2 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-650 border-indigo-650 text-white'
                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {sat}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Atau tulis satuan kustom (misal: BAG, LITER)..."
                      value={editingRow.satuan || ''}
                      onChange={(e) => setEditingRow(prev => ({ ...prev, satuan: e.target.value.toUpperCase() }))}
                      className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 transition-all mt-2"
                    />
                  </div>
                </div>
              )}

              {/* 5. NUMERIC INPUT ADJUSTERS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeTable === 'stock_pallet' && (
                  <>
                    {renderNumericAdjuster('Stok Awal Gudang', 'stockAwal', 'Stok Lama')}
                    {renderNumericAdjuster('Produksi Pallet Baru', 'produksi', 'Pallet Baru')}
                    {renderNumericAdjuster('Masuk dari Lumajang', 'dariLumajang', 'Lumajang')}
                    {renderNumericAdjuster('Masuk dari Subcont', 'dariSubcont', 'Subcont')}
                    {renderNumericAdjuster('Pallet Keluar (Kirim)', 'palletKeluar', 'Kirim Cust')}
                    {renderNumericAdjuster('Retur ke Lumajang', 'returLumajang', 'Retur Lmj')}
                    {renderNumericAdjuster('Retur dari Customer', 'returCustomer', 'Retur Cust')}
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                      <label className="text-xs font-black text-slate-700 tracking-wide uppercase block">
                        🏢 {friendlyLabels.subcontNama} (Jika ada subcont)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: UD Sumber Jaya, OPNAME, dll."
                        value={editingRow.subcontNama || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, subcontNama: e.target.value }))}
                        className="w-full h-12 px-4 bg-white border border-slate-250 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                  </>
                )}

                {activeTable === 'outstanding_po' && (
                  <>
                    {renderNumericAdjuster('Jumlah PO (Total Order)', 'jumlahPo', 'Jumlah Order')}
                    {renderNumericAdjuster('Pengiriman Awal', 'kirimanAwal', 'Awal')}
                    {renderNumericAdjuster('Total Sudah Kirim', 'kiriman', 'Telah Dikirim')}
                    {renderNumericAdjuster('Pallet Retur PO', 'retur', 'Total Retur')}
                    
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl sm:col-span-2 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-indigo-850 uppercase block">Sisa PO Terhitung:</span>
                        <span className="text-[10px] text-indigo-550 font-bold block uppercase">Otomatis = Jumlah PO - Total Kirim + Retur</span>
                      </div>
                      <span className="text-2xl font-black text-indigo-700 bg-white px-4 py-2 rounded-xl border border-indigo-200">
                        {editingRow.sisaPo}
                      </span>
                    </div>
                  </>
                )}

                {activeTable === 'materials' && (
                  <>
                    {renderNumericAdjuster('Stok Awal Gudang', 'stockAwal', 'Lama')}
                    {renderNumericAdjuster('Barang Masuk (+)', 'masuk', 'Tambah')}
                    {renderNumericAdjuster('Barang Keluar (-)', 'keluar', 'Dipakai')}
                    {renderNumericAdjuster('Minimal Stok Aman', 'minStok', 'Alarm')}
                  </>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-650 font-bold text-sm cursor-pointer transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModalRow}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm cursor-pointer transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Masukkan ke Daftar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
