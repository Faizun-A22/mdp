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
  FileSpreadsheet
} from 'lucide-react';

export default function SpreadsheetView({ user }) {
  const [activeTable, setActiveTable] = useState('stock_pallet'); // 'stock_pallet', 'outstanding_po', 'materials'
  const [gridData, setGridData] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
        batchId: palletTypes[0]?.nama || 'Batch PO',
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

  // Add new row
  const handleAddRow = () => {
    const newRow = tablesMeta[activeTable].defaultRow();
    setGridData(prev => [newRow, ...prev]);
  };

  // Delete row
  const handleDeleteRow = (rowIndex) => {
    if (confirm('Apakah Anda yakin ingin menghapus baris ini dari grid? (Perlu klik simpan untuk memperbarui database)')) {
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
          // Date
          tanggal: ['tanggal', 'tgl', 'date', 'tanggal po'],
          tanggal_kirim: ['tanggal kirim', 'tgl kirim', 'kirim tgl'],
          // Pallets & customers
          customer: ['customer', 'pelanggan', 'jenis', 'jenis pallet', 'pallet type'],
          nomorPo: ['nomor po', 'po', 'no po', 'po no'],
          noReff: ['no reff', 'reff', 'referensi', 'no_reff'],
          ukuran: ['ukuran', 'dimensi', 'size', 'dimension'],
          // Stock Pallet numbers
          stockAwal: ['stok awal', 'stock awal', 'stok_awal', 'stock_awal', 'awal'],
          produksi: ['produksi', 'prod', 'qty produksi'],
          dariLumajang: ['dari lumajang', 'lumajang', 'dr lumajang'],
          dariSubcont: ['dari subcont', 'subcont', 'dr subcont'],
          subcontNama: ['subcont nama', 'nama subcont', 'subcont_nama', 'nama_subcont', 'vendor'],
          palletKeluar: ['pallet keluar', 'keluar', 'pallet_keluar', 'pengiriman'],
          returLumajang: ['retur lumajang', 'retur_lumajang', 'retur lmj'],
          returCustomer: ['retur customer', 'retur_customer', 'retur cust', 'retur'],
          // OS PO numbers
          jumlahPo: ['jumlah po', 'jumlah_po', 'qty po', 'total po'],
          kirimanAwal: ['kiriman awal', 'kiriman_awal', 'kirim awal'],
          kiriman: ['kiriman', 'total kirim', 'dikirim', 'qty kirim'],
          sisaPo: ['sisa po', 'sisa_po', 'sisa', 'outstanding'],
          retur: ['retur', 'retur po'],
          // Material parameters
          kode: ['kode barang', 'kode', 'kode_barang', 'item code'],
          nama: ['nama barang', 'nama', 'nama_barang', 'item name'],
          kategori: ['kategori', 'category', 'jenis barang'],
          satuan: ['satuan', 'unit'],
          minStok: ['min stok', 'min_stok', 'minimum stok', 'min stock']
        };

        rows.forEach((excelRow, index) => {
          const rowKeys = Object.keys(excelRow);
          const mappedRow = meta.defaultRow();
          // Generate unique ID
          mappedRow.id = `${activeTable}_ss_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`;

          meta.keys.forEach(key => {
            const aliases = keyAliases[key] || [key];
            // Find match in Excel row headers
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
                // Handle Excel numeric date serials
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

          // Extra auto-fill & auto-calc for safety
          if (activeTable === 'stock_pallet') {
            const matched = palletTypes.find(pt => pt.nama === mappedRow.customer);
            if (matched) mappedRow.ukuran = matched.ukuran;
          }
          if (activeTable === 'outstanding_po') {
            mappedRow.sisaPo = Math.max(0, (mappedRow.jumlahPo || 0) - (mappedRow.kiriman || 0) + (mappedRow.retur || 0));
          }

          importedData.push(mappedRow);
        });

        // Prompt user choice: merge or overwrite
        if (confirm(`Berhasil membaca ${importedData.length} baris dari Excel.\n\nApakah Anda ingin MENGGABUNGKAN (Merge) data ini ke data grid saat ini?\n(Klik 'OK' untuk Merge, Klik 'Batal' untuk OVERWRITE/MENGGANTI semua data grid saat ini)`)) {
          setGridData(prev => [...importedData, ...prev]);
        } else {
          setGridData(importedData);
        }
      } catch (err) {
        console.error(err);
        alert('Gagal mengimpor file Excel: ' + err.message);
      }
      e.target.value = ''; // Reset uploader input
    };
    reader.readAsBinaryString(file);
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
              <h2 className="text-xl font-extrabold text-slate-800">Mode Spreadsheet (Excel Grid)</h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Input Cepat Tanpa Modal Form</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          {/* Table Selector */}
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tabel:</label>
            <select
              value={activeTable}
              onChange={(e) => setActiveTable(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 bg-slate-50 focus:bg-white text-slate-850 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400"
            />
          </div>

          <button
            onClick={() => loadData(activeTable)}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Import / Export */}
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
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
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-indigo-600/10 ${
              isSaving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan & Sinkronkan</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid Container */}
      <div className="glass-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
          <table className="w-full border-collapse border-slate-200 text-left table-auto">
            {/* Headers */}
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
              <tr>
                {/* Index col */}
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
                
                {/* Delete col */}
                <th className="px-3 py-3 text-slate-400 text-center font-bold text-[10px] w-12 uppercase bg-slate-100">
                  Aksi
                </th>
              </tr>
            </thead>

            {/* Grid Rows */}
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={tablesMeta[activeTable].headers.length + 2} className="px-6 py-20 text-center text-slate-400 font-bold text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
                    <span>Sedang memuat data dari database...</span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={tablesMeta[activeTable].headers.length + 2} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                    🚫 Tidak ada data yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => {
                  return (
                    <tr 
                      key={row.id || rowIndex} 
                      className="hover:bg-indigo-50/20 group/row transition-all duration-150"
                    >
                      {/* Row Index Number */}
                      <td className="px-3 py-2 border-r border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold text-center select-none">
                        {rowIndex + 1}
                      </td>

                      {/* Spreadsheet Columns */}
                      {tablesMeta[activeTable].keys.map((key, keyIdx) => {
                        const type = tablesMeta[activeTable].types[keyIdx];
                        const cellValue = row[key];
                        
                        return (
                          <td 
                            key={key} 
                            className="p-0 border-r border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all overflow-hidden"
                          >
                            {/* Read-Only render */}
                            {type === 'readonly' || type === 'readonly_number' ? (
                              <div className="px-3 py-2 bg-slate-50 text-slate-500 font-bold text-xs select-none h-9 flex items-center min-w-[100px] truncate">
                                {type === 'readonly_number' ? Number(cellValue || 0).toLocaleString('id-ID') : String(cellValue || '')}
                              </div>
                            ) : type === 'select_customer' ? (
                              /* Customer dropdown */
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
                              /* Kategori dropdown */
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
                              /* General inputs (Date, Number, Text) */
                              <input
                                type={type}
                                value={cellValue === null || cellValue === undefined ? '' : cellValue}
                                onChange={(e) => handleCellChange(rowIndex, key, e.target.value, type)}
                                className={`w-full px-3 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-xs h-9 ${
                                  type === 'number' 
                                    ? 'text-right font-bold text-indigo-700' 
                                    : type === 'date' 
                                      ? 'text-slate-600 font-semibold' 
                                      : 'text-slate-800 font-medium'
                                }`}
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Action Delete button */}
                      <td className="p-0 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          title="Hapus Baris"
                          className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer mx-auto block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
            <span>Perubahan dalam grid tidak langsung disimpan ke server. Klik <strong>"Simpan & Sinkronkan"</strong> untuk mengunggah.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
