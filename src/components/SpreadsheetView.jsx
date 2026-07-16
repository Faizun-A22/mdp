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
  AlertTriangle
} from 'lucide-react';

export default function SpreadsheetView({ user }) {
  const [activeTable, setActiveTable] = useState('stock_pallet'); // 'stock_pallet', 'outstanding_po', 'materials'
  const [gridData, setGridData] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Track unsaved changes
  const fileInputRef = useRef(null);

  // Month & Year selection for Monthly Matrix view
  const [selectedMonth, setSelectedMonth] = useState(6); // Default to June (6) since mock data has dates in June 2026
  const [selectedYear, setSelectedYear] = useState(2026); // Default to 2026
  
  // Matrix data state specifically for stock_pallet
  const [matrixData, setMatrixData] = useState([]);
  
  // Track which cell is active for click-to-edit (prevents input rendering lag)
  const [activeCell, setActiveCell] = useState(null); // { groupIndex, rowType, day }

  // Constants metadata for tables (used for Po and Materials, and definitions)
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

  const monthsList = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  // Number of days in selected month with fallbacks to prevent RangeError
  const daysInMonth = useMemo(() => {
    const month = selectedMonth || 6;
    const year = selectedYear || 2026;
    return new Date(year, month, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Safe date parser to prevent splitting errors if date is undefined/null
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

  // Transform flat database rows to monthly matrix grid
  const initializeMatrix = (flatData = [], types = [], month = 6, year = 2026) => {
    const days = new Date(year, month, 0).getDate();
    
    // Collect all customer + size combinations
    const customerKeys = [];
    const seen = new Set();
    
    const safeTypes = Array.isArray(types) ? types : [];
    const safeFlatData = Array.isArray(flatData) ? flatData : [];
    
    // 1. From palletTypes
    safeTypes.filter(Boolean).forEach(pt => {
      const key = `${pt.nama || ''}_${pt.ukuran || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        customerKeys.push({ customer: pt.nama || '', ukuran: pt.ukuran || '1000x1200 mm' });
      }
    });
    
    // 2. From flatData (in case there are other customers not registered in master)
    safeFlatData.filter(Boolean).forEach(item => {
      const key = `${item.customer || ''}_${item.ukuran || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        customerKeys.push({ customer: item.customer || '', ukuran: item.ukuran || '1000x1200 mm' });
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
        S: Array(days + 1).fill(0),
        originalIds: {} // day -> { id, createdAt }
      };

      // Filter database rows for this customer, size, and selected month/year
      const filtered = safeFlatData.filter(Boolean).filter(item => {
        if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
        const dateParts = parseDateParts(item.tanggal);
        return dateParts.month === month && dateParts.year === year;
      });

      // Populate daily values
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
          group.originalIds[day] = { id: item.id, createdAt: item.createdAt };
        }
      });

      // If Day 1 Stock Awal is 0, lookup the last ending balance from previous months
      const recordsBeforeMonth = safeFlatData.filter(Boolean).filter(item => {
        if (item.customer !== ck.customer || item.ukuran !== ck.ukuran) return false;
        const dateParts = parseDateParts(item.tanggal);
        
        if (dateParts.year < year) return true;
        if (dateParts.year === year && dateParts.month < month) return true;
        return false;
      });

      if (group.A[1] === 0 && recordsBeforeMonth.length > 0) {
        // Sort descending to get most recent sisa
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

      // Calculate running stock daily ledger
      group.S[1] = group.A[1] + group.M[1] - group.K[1] + group.RCust[1] - group.RWS[1];
      for (let d = 2; d <= days; d++) {
        group.A[d] = group.S[d-1];
        group.S[d] = group.A[d] + group.M[d] - group.K[d] + group.RCust[d] - group.RWS[d];
      }

      return group;
    });

    return matrix;
  };

  // Load data from Supabase/LocalStorage
  const loadData = async (targetTable) => {
    setIsLoading(true);
    try {
      const types = await storageAPI.getPalletTypes() || [];
      setPalletTypes(types);

      let data = [];
      if (targetTable === 'stock_pallet') {
        data = await storageAPI.getStockPallets() || [];
        data.sort((a, b) => {
          const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateB - dateA;
        });
      } else if (targetTable === 'outstanding_po') {
        data = await storageAPI.getOutstandingPOs() || [];
        data.sort((a, b) => {
          const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateB - dateA;
        });
      } else if (targetTable === 'materials') {
        data = await storageAPI.getMaterials() || [];
        data.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
      }
      setGridData(data);

      if (targetTable === 'stock_pallet') {
        const matrix = initializeMatrix(data, types, selectedMonth, selectedYear);
        setMatrixData(matrix);
      }
      setIsDirty(false);
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

  // Reload matrix when period (Month/Year) changes
  useEffect(() => {
    if (activeTable === 'stock_pallet' && gridData.length > 0) {
      const matrix = initializeMatrix(gridData, palletTypes, selectedMonth, selectedYear);
      setMatrixData(matrix);
    }
  }, [selectedMonth, selectedYear, activeTable]);

  // Recalculate stock history helper for stock pallets (in flat data mode)
  const recalculateStockHistory = (allData) => {
    const groups = {};
    allData.forEach(item => {
      const key = `${item.customer || ''}_${item.ukuran || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item });
    });

    const updatedData = [];

    for (const key in groups) {
      const group = groups[key].sort((a, b) => {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
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

    return updatedData.sort((a, b) => {
      const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
      const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
      if (dateA - dateB !== 0) return dateB - dateA;
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeB.localeCompare(timeA);
    });
  };

  // Handle cell edit for Outstanding PO and Materials
  const handleCellChange = (rowIndex, key, value, type) => {
    setIsDirty(true);
    setGridData(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      let parsedValue = value;
      if (type === 'number') {
        parsedValue = value === '' ? 0 : Number(value);
      }
      
      const updatedRow = { ...row, [key]: parsedValue };
      
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

  // Handle cell edit in Monthly Ledger Matrix (stock_pallet)
  const handleMatrixCellChange = (groupIndex, type, day, value) => {
    const numValue = value === '' ? 0 : Number(value);
    
    setMatrixData(prev => {
      return prev.map((group, idx) => {
        if (idx !== groupIndex) return group;
        
        const updated = { ...group };
        updated[type] = [...updated[type]];
        updated[type][day] = numValue;
        
        // Recalculate daily running stock
        updated.A = [...updated.A];
        updated.S = [...updated.S];
        
        // S(1) = A(1) + M(1) - K(1) + RCust(1) - RWS(1)
        updated.S[1] = updated.A[1] + updated.M[1] - updated.K[1] + updated.RCust[1] - updated.RWS[1];
        for (let d = 2; d <= daysInMonth; d++) {
          updated.A[d] = updated.S[d - 1];
          updated.S[d] = updated.A[d] + updated.M[d] - updated.K[d] + updated.RCust[d] - updated.RWS[d];
        }
        
        return updated;
      });
    });
    
    setIsDirty(true);
  };

  // Add new row in transactional grid mode
  const handleAddRow = () => {
    setIsDirty(true);
    const newRow = tablesMeta[activeTable].defaultRow();
    setGridData(prev => [newRow, ...prev]);
  };

  // Add customer group in matrix mode
  const handleAddCustomerGroup = () => {
    const availableTypesStr = palletTypes.map((pt, i) => `${i + 1}. ${pt.nama} (${pt.ukuran})`).join('\n');
    const choice = prompt(`Pilih Jenis Pallet dengan memasukkan nomornya:\n\n${availableTypesStr}\n\nAtau ketik nama customer baru secara manual:`);
    if (!choice) return;
    
    let customerName = '';
    let ukuran = '1000x1200 mm';
    
    const choiceNum = parseInt(choice, 10);
    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= palletTypes.length) {
      const pt = palletTypes[choiceNum - 1];
      customerName = pt.nama;
      ukuran = pt.ukuran;
    } else {
      customerName = choice.trim();
      const customUkuran = prompt('Masukkan ukuran pallet:', '1000x1200 mm');
      if (customUkuran) ukuran = customUkuran.trim();
    }
    
    if (!customerName) return;
    
    setMatrixData(prev => {
      const exists = prev.some(g => g.customer === customerName && g.ukuran === ukuran);
      if (exists) {
        alert('Customer dengan ukuran tersebut sudah ada di tabel!');
        return prev;
      }
      
      const newGroup = {
        customer: customerName,
        ukuran: ukuran,
        A: Array(daysInMonth + 1).fill(0),
        M: Array(daysInMonth + 1).fill(0),
        K: Array(daysInMonth + 1).fill(0),
        RCust: Array(daysInMonth + 1).fill(0),
        RWS: Array(daysInMonth + 1).fill(0),
        S: Array(daysInMonth + 1).fill(0),
        originalIds: {}
      };
      
      return [...prev, newGroup];
    });
    setIsDirty(true);
  };

  // Delete customer group in matrix mode
  const handleRemoveCustomerGroup = (groupIndex) => {
    if (confirm('Apakah Anda yakin ingin menghapus data customer ini dari mutasi bulan ini? (Perubahan baru akan disimpan setelah Anda mengklik Simpan)')) {
      setMatrixData(prev => prev.filter((_, idx) => idx !== groupIndex));
      setIsDirty(true);
    }
  };

  // Delete row in transactional grid mode
  const handleDeleteRow = (rowIndex) => {
    if (confirm('Apakah Anda yakin ingin menghapus baris ini dari grid? (Perlu klik simpan untuk memperbarui database)')) {
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
      if (activeTable === 'stock_pallet') {
        // Filter out current month's rows from the main array safely
        const otherMonthsData = gridData.filter(item => {
          const dateParts = parseDateParts(item.tanggal);
          return !(dateParts.month === selectedMonth && dateParts.year === selectedYear);
        });

        // Flatten current month's matrix data
        const currentMonthRows = [];
        matrixData.forEach(group => {
          for (let day = 1; day <= daysInMonth; day++) {
            const hasTransaction = group.M[day] > 0 || 
                                   group.K[day] > 0 || 
                                   group.RCust[day] > 0 || 
                                   group.RWS[day] > 0 || 
                                   (day === 1 && group.A[1] > 0);
            
            const orig = group.originalIds[day];
            
            if (hasTransaction || orig) {
              const pad = (num) => String(num).padStart(2, '0');
              const dateStr = `${selectedYear}-${pad(selectedMonth)}-${pad(day)}`;
              
              currentMonthRows.push({
                id: orig ? orig.id : 'sp_ss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                tanggal: dateStr,
                customer: group.customer,
                ukuran: group.ukuran,
                stockAwal: group.A[day],
                produksi: group.M[day], // map matrix incoming count to produksi column
                dariLumajang: 0,
                dariSubcont: 0,
                subcontNama: '',
                palletKeluar: group.K[day],
                returLumajang: group.RWS[day],
                returCustomer: group.RCust[day],
                createdAt: orig ? orig.createdAt : new Date().toISOString()
              });
            }
          }
        });

        const combinedData = recalculateStockHistory([...otherMonthsData, ...currentMonthRows]);
        await storageAPI.saveStockPallets(combinedData);
        setGridData(combinedData);
        
        // Re-initialize matrix from the newly saved data
        const updatedMatrix = initializeMatrix(combinedData, palletTypes, selectedMonth, selectedYear);
        setMatrixData(updatedMatrix);
      } else {
        // Save for outstanding_po and materials
        let finalData = [...gridData];
        if (activeTable === 'outstanding_po') {
          await storageAPI.saveOutstandingPOs(finalData);
        } else if (activeTable === 'materials') {
          await storageAPI.saveMaterials(finalData);
        }
      }
      setIsDirty(false);
      alert('Data berhasil disimpan dan disinkronisasikan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered rows/groups for rendering
  const filteredMatrixData = useMemo(() => {
    if (!searchQuery) return matrixData;
    const q = searchQuery.toLowerCase();
    
    return matrixData.filter(group => {
      return (
        (group.customer || '').toLowerCase().includes(q) ||
        (group.ukuran || '').toLowerCase().includes(q)
      );
    });
  }, [matrixData, searchQuery]);

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
    if (activeTable === 'stock_pallet') {
      // Export Monthly Matrix
      const exportRows = [];
      filteredMatrixData.forEach((group, index) => {
        const rowTypes = [
          { label: 'Stok Awal', key: 'A', ket: '' },
          { label: 'Masuk', key: 'M', ket: 'WS' },
          { label: 'Keluar', key: 'K', ket: '' },
          { label: 'Retur Customer', key: 'RCust', ket: 'RETUR' },
          { label: 'Retur WS', key: 'RWS', ket: '' },
          { label: 'Sisa', key: 'S', ket: '' }
        ];

        rowTypes.forEach(rt => {
          const obj = {
            'No': rt.key === 'A' ? index + 1 : '',
            'Customer': rt.key === 'A' ? group.customer : '',
            'Ukuran': rt.key === 'A' ? group.ukuran : '',
            'Keterangan': rt.ket,
            'Tipe': rt.key
          };

          // Days 1..31
          for (let day = 1; day <= daysInMonth; day++) {
            obj[`Day ${day}`] = group[rt.key][day];
          }

          // Jumlah
          if (rt.key === 'M') {
            obj['Jumlah'] = group.M.reduce((sum, val) => sum + val, 0);
          } else if (rt.key === 'K') {
            obj['Jumlah'] = group.K.reduce((sum, val) => sum + val, 0);
          } else if (rt.key === 'RCust') {
            obj['Jumlah'] = group.RCust.reduce((sum, val) => sum + val, 0);
          } else if (rt.key === 'RWS') {
            obj['Jumlah'] = group.RWS.reduce((sum, val) => sum + val, 0);
          } else {
            obj['Jumlah'] = group.S[daysInMonth];
          }

          exportRows.push(obj);
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Mutasi_Pallet_${selectedMonth}_${selectedYear}`);
      XLSX.writeFile(workbook, `Laporan_Mutasi_Stok_Pallet_${selectedMonth}_${selectedYear}.xlsx`);
    } else {
      // Export transactional lists
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
    }
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
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // Helper component to render matrix cell (Read Only Mode)
  const renderMatrixCell = (groupIndex, rowType, day, val) => {
    let textClass = 'text-slate-500';
    if (rowType === 'M') textClass = 'text-emerald-650 font-bold';
    else if (rowType === 'K') textClass = 'text-rose-650 font-bold';
    else if (rowType === 'RCust') textClass = 'text-indigo-600';
    else if (rowType === 'RWS') textClass = 'text-amber-600';
    else if (rowType === 'S') textClass = 'text-slate-800 font-bold';

    const showReadOnlyAlert = () => {
      alert("⚠️ DATA HANYA BACA (READ-ONLY)\n\nData spreadsheet tidak dapat diubah di sini. Silakan lakukan pencatatan Mutasi Stok atau OS melalui menu Dashboard/Mutasi!");
    };

    return (
      <td 
        key={day}
        onClick={showReadOnlyAlert}
        className={`h-8 border-r border-slate-200 text-center text-xs select-none min-w-[48px] cursor-pointer hover:bg-slate-100 transition-colors ${textClass}`}
      >
        {val === 0 ? '-' : val}
      </td>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controller Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Table className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Mode Spreadsheet (Excel Grid)</h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {activeTable === 'stock_pallet' ? 'Laporan Mutasi Ledgers Bulanan' : 'Input Cepat Tanpa Modal Form'}
              </p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          {/* Table Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tabel:</label>
              <select
                value={activeTable}
                onChange={(e) => {
                  setActiveTable(e.target.value);
                  setSearchQuery('');
                  setActiveCell(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
              >
                <option value="stock_pallet">Mutasi Stok Pallet</option>
                <option value="outstanding_po">Outstanding PO (OS)</option>
                <option value="materials">Stok Bahan & Alat Kerja</option>
              </select>
            </div>

            {/* Month & Year Selectors for Mutasi Stok Pallet */}
            {activeTable === 'stock_pallet' && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setActiveCell(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setActiveCell(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
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
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="glass-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[65vh] scrollbar-thin">
          
          {isLoading ? (
            <div className="px-6 py-24 text-center text-slate-400 font-bold text-sm">
              <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-3" />
              <span>Sedang memuat data dari database...</span>
            </div>
          ) : activeTable === 'stock_pallet' ? (
            /* =======================================================
               1. MONTHLY LEDGER MATRIX VIEW (MUTASI STOK PALLET)
               ======================================================= */
            <table className="w-full border-collapse border-slate-200 text-left table-auto">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 sticky top-0 z-40">
                  <th rowSpan={2} className="sticky left-0 z-40 w-[25px] min-w-[25px] md:w-[45px] md:min-w-[45px] px-1 md:px-3 py-2 border-r border-slate-200 text-slate-600 text-center font-extrabold text-[8px] md:text-[11px] uppercase whitespace-nowrap bg-slate-100">
                    No
                  </th>
                  <th rowSpan={2} className="sticky left-[25px] md:left-[45px] z-40 w-[80px] min-w-[80px] md:w-[200px] md:min-w-[200px] px-1 md:px-4 py-2 border-r border-slate-200 text-slate-600 text-left font-extrabold text-[8px] md:text-[11px] uppercase whitespace-nowrap bg-slate-100">
                    Customer / Pallet
                  </th>
                  <th rowSpan={2} className="sticky left-[105px] md:left-[245px] z-40 w-[55px] min-w-[55px] md:w-[100px] md:min-w-[100px] px-1 md:px-4 py-2 border-r border-slate-200 text-slate-600 text-center font-extrabold text-[8px] md:text-[11px] uppercase whitespace-nowrap bg-slate-100">
                    Ukuran
                  </th>
                  <th rowSpan={2} className="sticky left-[160px] md:left-[345px] z-40 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-2 border-r border-slate-200 text-slate-600 text-center font-extrabold text-[8px] md:text-[11px] uppercase whitespace-nowrap bg-slate-100">
                    Ket
                  </th>
                  <th rowSpan={2} className="sticky left-[195px] md:left-[395px] z-40 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-2 border-r-2 border-slate-300 text-slate-600 text-center font-extrabold text-[8px] md:text-[11px] uppercase whitespace-nowrap bg-slate-100 font-mono shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Tipe
                  </th>
                  <th colSpan={daysInMonth} className="px-4 py-1.5 border-r border-slate-200 text-slate-600 text-center font-extrabold text-[11px] uppercase tracking-wider bg-slate-100">
                    Tanggal (1 - {daysInMonth} {monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear})
                  </th>
                  <th rowSpan={2} className="px-4 py-2.5 text-slate-600 text-center font-extrabold text-[11px] uppercase whitespace-nowrap bg-slate-100">
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 sticky top-[37px] z-20">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="px-1 py-1 border-r border-slate-200 text-slate-500 text-center font-bold text-[10px] w-12 bg-slate-50">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMatrixData.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 6} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                      🚫 Tidak ada data customer untuk mutasi bulan ini. Klik "Tambah Customer Baru" di bawah.
                    </td>
                  </tr>
                ) : (
                  filteredMatrixData.filter(Boolean).map((group, groupIndex) => {
                    const sumM = (group.M || []).reduce((sum, val) => sum + val, 0);
                    const sumK = (group.K || []).reduce((sum, val) => sum + val, 0);
                    const sumRCust = (group.RCust || []).reduce((sum, val) => sum + val, 0);
                    const sumRWS = (group.RWS || []).reduce((sum, val) => sum + val, 0);
                    const finalStock = (group.S || [])[daysInMonth] || 0;

                    return (
                      <React.Fragment key={`${group.customer || ''}_${group.ukuran || ''}_${groupIndex}`}>
                        {/* Row 1: A (Stok Awal) */}
                        <tr className="hover:bg-slate-50/50">
                          <td rowSpan={6} className="sticky left-0 z-10 w-[25px] min-w-[25px] md:w-[45px] md:min-w-[45px] px-1 md:px-3 py-2 border-r border-b border-slate-200 text-slate-400 text-[9px] md:text-[11px] font-bold text-center bg-slate-50">
                            {groupIndex + 1}
                          </td>
                          <td rowSpan={6} className="sticky left-[25px] md:left-[45px] z-10 w-[80px] min-w-[80px] md:w-[200px] md:min-w-[200px] px-1 md:px-4 py-2 border-r border-b border-slate-200 text-slate-800 text-[9px] md:text-xs font-black bg-white">
                            <span className="block break-words line-clamp-3 md:line-clamp-none leading-tight tracking-tighter md:tracking-normal">{group.customer}</span>
                          </td>
                          <td rowSpan={6} className="sticky left-[105px] md:left-[245px] z-10 w-[55px] min-w-[55px] md:w-[100px] md:min-w-[100px] px-1 md:px-4 py-2 border-r border-b border-slate-200 text-slate-500 text-[8px] md:text-xs font-bold text-center bg-slate-50 whitespace-normal md:whitespace-nowrap overflow-hidden text-ellipsis leading-tight tracking-tighter md:tracking-normal">
                            {group.ukuran}
                          </td>
                          
                          <td className="sticky left-[160px] md:left-[345px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-1.5 border-r border-slate-200 text-slate-400 text-center font-bold text-[8px] md:text-[10px] bg-slate-50"></td>
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-slate-600 text-center font-mono font-bold text-[9px] md:text-xs bg-indigo-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">A</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.A || [])[day];
                            return renderMatrixCell(groupIndex, 'A', day, val);
                          })}
                          <td className="px-4 py-2 text-slate-700 font-extrabold text-xs text-right bg-slate-50/30">
                            {finalStock}
                          </td>
                        </tr>

                        {/* Row 2: M (Masuk) */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="sticky left-[160px] md:left-[345px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-1.5 border-r border-slate-200 text-slate-500 text-center font-bold text-[8px] md:text-[10px] bg-slate-50">WS</td>
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-emerald-600 text-center font-mono font-bold text-[9px] md:text-xs bg-emerald-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">M</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.M || [])[day];
                            return renderMatrixCell(groupIndex, 'M', day, val);
                          })}
                          <td className="px-4 py-2 text-emerald-700 font-extrabold text-xs text-right bg-emerald-50/10">
                            {sumM}
                          </td>
                        </tr>

                        {/* Row 3: K (Keluar) */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="sticky left-[160px] md:left-[345px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-1.5 border-r border-slate-200 text-slate-500 text-center font-bold text-[8px] md:text-[10px] bg-slate-50"></td>
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-rose-600 text-center font-mono font-bold text-[9px] md:text-xs bg-rose-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">K</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.K || [])[day];
                            return renderMatrixCell(groupIndex, 'K', day, val);
                          })}
                          <td className="px-4 py-2 text-rose-700 font-extrabold text-xs text-right bg-rose-50/10">
                            {sumK}
                          </td>
                        </tr>

                        {/* Row 4: R. Cust (Retur Customer) */}
                        <tr className="hover:bg-slate-50/50">
                          <td rowSpan={2} className="sticky left-[160px] md:left-[345px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-1.5 border-r border-slate-200 text-slate-500 text-center font-bold text-[7px] md:text-[9px] bg-slate-50 leading-tight">RETUR</td>
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-indigo-650 text-center font-mono font-bold text-[8px] md:text-[10px] bg-indigo-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">R. Cust</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.RCust || [])[day];
                            return renderMatrixCell(groupIndex, 'RCust', day, val);
                          })}
                          <td className="px-4 py-2 text-indigo-750 font-extrabold text-xs text-right bg-indigo-50/10">
                            {sumRCust}
                          </td>
                        </tr>

                        {/* Row 5: R. WS (Retur WS/Lumajang) */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-amber-600 text-center font-mono font-bold text-[8px] md:text-[10px] bg-amber-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">R. WS</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.RWS || [])[day];
                            return renderMatrixCell(groupIndex, 'RWS', day, val);
                          })}
                          <td className="px-4 py-2 text-amber-700 font-extrabold text-xs text-right bg-amber-50/10">
                            {sumRWS}
                          </td>
                        </tr>

                        {/* Row 6: S (Sisa/Stok Akhir) */}
                        <tr className="border-b-2 border-slate-350 hover:bg-slate-50/50 bg-slate-50/20 font-bold">
                          <td className="sticky left-[160px] md:left-[345px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-2 py-1.5 border-r border-slate-200 text-slate-500 text-center font-bold text-[8px] md:text-[10px] bg-slate-50"></td>
                          <td className="sticky left-[195px] md:left-[395px] z-10 w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px] px-1 md:px-3 py-1.5 border-r-2 border-slate-300 text-slate-800 text-center font-mono font-bold text-[9px] md:text-xs bg-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">S</td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const val = (group.S || [])[day];
                            return renderMatrixCell(groupIndex, 'S', day, val);
                          })}
                          <td className="px-4 py-2 text-indigo-750 font-black text-sm text-right bg-indigo-50/10">
                            {finalStock}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* =======================================================
               2. TRANSACTIONAL GRID VIEW (OUTSTANDING PO & MATERIALS)
               ======================================================= */
            <table className="w-full border-collapse border-slate-200 text-left table-auto">
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
              <tbody className="divide-y divide-slate-200">
                {filteredData.length === 0 ? (
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
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom toolbar inside card */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={activeTable === 'stock_pallet' ? handleAddCustomerGroup : handleAddRow}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-emerald-600/10 w-full sm:w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTable === 'stock_pallet' ? 'Tambah Customer Baru' : 'Tambah Baris Baru'}</span>
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
