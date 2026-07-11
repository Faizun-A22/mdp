import React, { useState, useEffect, useRef } from 'react';
import useStickyState from '../utils/useStickyState';
import { storageAPI } from '../utils/storage';
import { Plus, Search, ChevronDown, Trash2, Edit3, X, Filter, Download, Check, RefreshCw, Link, Loader2, AlertCircle, ArrowUpDown, Calendar } from 'lucide-react';

export default function StockPallet({ user }) {
  const [data, setData] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [subTab, setSubTab] = useState('mutasi'); // 'mutasi' or 'jenis'
  const [palletTypeSearch, setPalletTypeSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [rincianSearch, setRincianSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useStickyState(false, 'sp_isModalOpen');
  const [isTypeModalOpen, setIsTypeModalOpen] = useStickyState(false, 'sp_isTypeModalOpen');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedMutasiType, setSelectedMutasiType] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // SJ Keluar states
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [isSjModalOpen, setIsSjModalOpen] = useState(false);
  const [reffInput, setReffInput] = useState('');
  const [showReffSuggestions, setShowReffSuggestions] = useState(false);
  const [sjPalletTypeSearch, setSjPalletTypeSearch] = useState('');
  const [showSjPalletDropdown, setShowSjPalletDropdown] = useState(false);
  const [sjDropdownPos, setSjDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const sjPalletSearchInputRef = useRef(null);
  const [sjFormData, setSjFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    palletType: '',
    ukuran: '',
    poId: '',
    reffSuffix: '',
    qtyKeluar: 0
  });

  // Edit Item Trackers
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [selectedRincianHistory, setSelectedRincianHistory] = useState(null);
  
  const palletSearchInputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [summarySort, setSummarySort] = useState({ key: 'nama', direction: 'asc' });
  const [mutasiSort, setMutasiSort] = useState({ key: 'tanggal', direction: 'desc' });
  const [jenisSort, setJenisSort] = useState({ key: 'nama', direction: 'asc' });
  const [selectedReportDate, setSelectedReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const lastDay = new Date(reportYear, reportMonth, 0).getDate();
    const monthStr = String(reportMonth).padStart(2, '0');
    const dayStr = String(lastDay).padStart(2, '0');
    setSelectedReportDate(`${reportYear}-${monthStr}-${dayStr}`);
  }, [reportMonth, reportYear]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyMonth, historyYear, selectedRincianHistory]);

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const getUniqueYears = () => {
    const years = new Set();
    data.forEach(item => {
      if (item.tanggal) {
        const y = item.tanggal.substring(0, 4);
        if (y && !isNaN(Number(y))) {
          years.add(y);
        }
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b - a);
  };

  // Form State - Transaction Mutasi
  const [formData, setFormData] = useStickyState({
    tanggal: new Date().toISOString().split('T')[0],
    customer: '',
    ukuran: '',
    produksi: 0,
    stockAwal: 0,
    dariLumajang: 0,
    dariSubcont: 0,
    subcontNama: '',
    palletKeluar: 0,
    returLumajang: 0,
    returCustomer: 0
  }, 'sp_formData');

  // Form State - Master Jenis Pallet
  const [typeFormData, setTypeFormData] = useStickyState({
    nama: '',
    ukuran: '1000x1200 mm',
    keterangan: ''
  }, 'sp_typeFormData');

  useEffect(() => {
    const loadAllData = async () => {
      const pallets = await storageAPI.getStockPallets();
      const types = await storageAPI.getPalletTypes();
      
      const recalculated = recalculateStockHistory(pallets);
      setData(recalculated);
      setPalletTypes(types);
      
      // Default form size and customer to the first available type, or standard
      if (types.length > 0) {
        setFormData(prev => {
          if (!prev.customer || !prev.ukuran) {
            const todayStr = new Date().toISOString().split('T')[0];
            const stockAwal = calculateStockAwalForLoadedData(recalculated, types[0].nama, types[0].ukuran, todayStr);
            setPalletTypeSearch(types[0].nama);
            return { 
              ...prev, 
              ukuran: types[0].ukuran, 
              customer: types[0].nama,
              stockAwal: stockAwal 
            };
          }
          setPalletTypeSearch(prev.customer);
          return prev;
        });
      } else {
        setFormData(prev => {
          if (!prev.customer || !prev.ukuran) {
            setPalletTypeSearch('');
            return { ...prev, ukuran: '1000x1200 mm', customer: '', stockAwal: 0 };
          }
          return prev;
        });
      }
      const pos = await storageAPI.getOutstandingPOs();
      setOutstandingPOs(pos);
    };
    loadAllData();
  }, []);

  const isAdmin = user?.role === 'admin';

  function calculateTotalStock(item) {
    if (!item) return 0;
    return (
      Number(item.stockAwal || 0) +
      Number(item.produksi || 0) +
      Number(item.dariLumajang || 0) +
      Number(item.dariSubcont || 0) +
      Number(item.returCustomer || 0) -
      Number(item.palletKeluar || 0) -
      Number(item.returLumajang || 0)
    );
  }

  const recalculateStockHistory = (allData) => {
    const groups = {};
    allData.forEach(item => {
      const key = `${item.customer}_${item.ukuran}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item });
    });

    const updatedData = [];

    for (const key in groups) {
      // Sort ascending by date, then by createdAt/id for correct chronological calculation
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

    // Return descending by date, then descending by createdAt/id for UI listing display
    return updatedData.sort((a, b) => {
      const dateA = new Date(a.tanggal);
      const dateB = new Date(b.tanggal);
      if (dateB - dateA !== 0) return dateB - dateA;
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeB.localeCompare(timeA);
    });
  };

  const calculateStockAwalForLoadedData = (loadedData, customer, ukuran, tanggal, excludeId = null) => {
    if (!customer || !ukuran || !tanggal) return 0;
    
    // Filter transactions for this specific type
    const typeTransactions = loadedData.filter(
      item => item.customer === customer && 
              item.ukuran === ukuran && 
              item.id !== excludeId
    );
    
    if (typeTransactions.length === 0) return 0;
    
    // Sort chronologically ascending
    const sorted = [...typeTransactions].sort((a, b) => {
      const dateA = new Date(a.tanggal);
      const dateB = new Date(b.tanggal);
      if (dateA - dateB !== 0) return dateA - dateB;
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeA.localeCompare(timeB);
    });
    
    // Find all transactions that happen on or before the target date
    const targetDate = new Date(tanggal);
    const precedingTx = sorted.filter(item => new Date(item.tanggal) <= targetDate);
    
    if (precedingTx.length === 0) {
      // If no preceding transactions, it's the earliest transaction.
      // We return 0 so user can input initial stock or it defaults to 0.
      return 0;
    }
    
    // The preceding transaction is the last one in precedingTx
    const lastPreceding = precedingTx[precedingTx.length - 1];
    return calculateTotalStock(lastPreceding);
  };

  const calculateStockAwalForForm = (customer, ukuran, tanggal, excludeId = null) => {
    return calculateStockAwalForLoadedData(data, customer, ukuran, tanggal, excludeId);
  };

  const getPalletSummaryForDate = (targetDateStr) => {
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    return palletTypes.map(type => {
      // Find the most recent OPNAME checkpoint for this pallet type on or before targetDate
      const typeTxSorted = data
        .filter(item => item.customer === type.nama && 
                        item.ukuran === type.ukuran && 
                        new Date(item.tanggal) <= targetDate)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || (b.createdAt || '').localeCompare(a.createdAt || ''));

      const lastOpnameTx = typeTxSorted.find(item => item.subcontNama === 'OPNAME');
      const checkpointDateStr = lastOpnameTx ? lastOpnameTx.tanggal : null;

      const allTxUpToDate = data.filter(
        item => item.customer === type.nama && 
                item.ukuran === type.ukuran && 
                new Date(item.tanggal) <= targetDate
      );

      // Only sum transactions that happened on or after the checkpoint date within this month
      const monthTransactions = data.filter(item => {
        const matchesType = item.customer === type.nama && item.ukuran === type.ukuran;
        const withinMonth = new Date(item.tanggal) >= startOfMonth && new Date(item.tanggal) <= targetDate;
        if (!matchesType || !withinMonth) return false;
        
        // If there is an OPNAME checkpoint, ignore transactions before it
        if (checkpointDateStr) {
          return item.tanggal >= checkpointDateStr;
        }
        return true;
      });

      const totalTx = monthTransactions.length;
      const totalProduksi = monthTransactions.reduce((acc, item) => acc + Number(item.produksi || 0), 0);
      const totalInLumajang = monthTransactions.reduce((acc, item) => acc + Number(item.dariLumajang || 0), 0);
      const totalInSubcont = monthTransactions.reduce((acc, item) => acc + Number(item.dariSubcont || 0), 0);
      const totalOutKirim = monthTransactions.reduce((acc, item) => acc + Number(item.palletKeluar || 0), 0);
      const totalReturLmj = monthTransactions.reduce((acc, item) => acc + Number(item.returLumajang || 0), 0);
      const totalReturCust = monthTransactions.reduce((acc, item) => acc + Number(item.returCustomer || 0), 0);

      let currentStock = 0;
      if (allTxUpToDate.length > 0) {
        const sortedAsc = [...allTxUpToDate].sort((a, b) => {
          const dateA = new Date(a.tanggal);
          const dateB = new Date(b.tanggal);
          if (dateA - dateB !== 0) return dateA - dateB;
          const timeA = a.createdAt || a.id || '';
          const timeB = b.createdAt || b.id || '';
          return timeA.localeCompare(timeB);
        });
        const lastTx = sortedAsc[sortedAsc.length - 1];
        currentStock = calculateTotalStock(lastTx);
      }

      return {
        id: type.id,
        nama: type.nama,
        ukuran: type.ukuran,
        totalTx,
        totalProduksi,
        totalInLumajang,
        totalInSubcont,
        totalIn: totalInLumajang + totalInSubcont,
        totalOutKirim,
        totalOut: totalOutKirim,
        totalReturLmj,
        totalReturCust,
        totalRetur: totalReturCust - totalReturLmj,
        currentStock
      };
    });
  };

  const handleSummarySort = (key) => {
    let direction = 'asc';
    if (summarySort.key === key && summarySort.direction === 'asc') direction = 'desc';
    setSummarySort({ key, direction });
  };

  const handleMutasiSort = (key) => {
    let direction = 'asc';
    if (mutasiSort.key === key && mutasiSort.direction === 'asc') direction = 'desc';
    setMutasiSort({ key, direction });
  };

  const handleJenisSort = (key) => {
    let direction = 'asc';
    if (jenisSort.key === key && jenisSort.direction === 'asc') direction = 'desc';
    setJenisSort({ key, direction });
  };

  const getSortedSummary = () => {
    let summary = getPalletSummaryForDate(selectedReportDate);
    if (rincianSearch) {
      summary = summary.filter(item => 
        item.nama.toLowerCase().includes(rincianSearch.toLowerCase()) || 
        item.ukuran.toLowerCase().includes(rincianSearch.toLowerCase())
      );
    }
    summary.sort((a, b) => {
      let aVal = a[summarySort.key];
      let bVal = b[summarySort.key];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return summarySort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return summarySort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return summary;
  };



  const downloadLaporanHarianGambar = () => {
    const today = new Date(selectedReportDate);
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const tanggalStr = `${bulanNames[today.getMonth()]} ${today.getFullYear()}`;
    const fmtUkuran  = (u = '') => u.replace(/\s*mm\s*/gi,'').replace(/[xX]/g,'*').trim();

    let items = getPalletSummaryForDate(selectedReportDate).filter(item => item.currentStock > 0);

    // Sort items: Plywood and Limbah at the bottom
    items.sort((a, b) => {
      const nameA = a.nama.toUpperCase();
      const nameB = b.nama.toUpperCase();
      const isBottomA = nameA.includes('PLYWOOD') || nameA.includes('LIMBAH');
      const isBottomB = nameB.includes('PLYWOOD') || nameB.includes('LIMBAH');
      
      if (isBottomA && !isBottomB) return 1;
      if (!isBottomA && isBottomB) return -1;
      return nameA.localeCompare(nameB);
    });

    // ── Dynamic Canvas Height ────────────────────────────────────
    const W  = 1122; // A4 landscape width
    const ITEM_H = 44;
    const numRows = Math.ceil(items.length / 2);
    const requiredHeight = 130 + (numRows * ITEM_H) + 80; // header + content + footer padding
    const H  = Math.max(794, requiredHeight); // At least A4 landscape height, but expand if needed
    const SC = 1;

    const canvas  = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx     = canvas.getContext('2d');
    ctx.scale(SC, SC);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#4F46E5');
    grad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    // ── Header ────────────────────────────────────────────────────
    const PAD = 52;
    let y = 44;

    ctx.font      = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('Pak Dedy, Berikut laporan bulanan stok pallet WH', PAD, y);
    y += 26;

    ctx.font      = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText(`Laporan Mutasi Pallet - Periode ${tanggalStr} :`, PAD, y);
    y += 20;

    // Header divider
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 20;

    // ── 2-Column Grid ─────────────────────────────────────────────
    const COL_W     = (W - PAD * 2 - 32) / 2;  // two equal columns
    const COL_GAP   = 32;
    const COL2_X    = PAD + COL_W + COL_GAP;

    const visible = items;

    visible.forEach((item, idx) => {
      const col   = idx < numRows ? 0 : 1;
      const row   = idx < numRows ? idx : idx - numRows;
      const x     = col === 0 ? PAD : COL2_X;
      const itemY = y + row * ITEM_H;

      // Number
      ctx.font      = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#4F46E5';
      ctx.fillText(`${idx + 1}.`, x, itemY + 14);

      // Name + ukuran
      ctx.font      = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(`${item.nama} (${fmtUkuran(item.ukuran)})`, x + 24, itemY + 14);

      // Stok wh
      ctx.font      = '12px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText(`stok wh ${item.currentStock}`, x + 24, itemY + 30);

      // Light separator line under each item in the column (except the last one)
      if (row < numRows - 1) {
        ctx.strokeStyle = '#F3F4F6'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, itemY + ITEM_H - 2);
        ctx.lineTo(x + COL_W, itemY + ITEM_H - 2);
        ctx.stroke();
      }
    });

    // Vertical divider between columns
    const divX = PAD + COL_W + COL_GAP / 2;
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, y - 4); ctx.lineTo(divX, H - 44); ctx.stroke();

    // ── Footer ────────────────────────────────────────────────────
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, H - 28); ctx.lineTo(W - PAD, H - 28); ctx.stroke();

    ctx.font      = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(
      `Generated ${today.toLocaleString('id-ID')}  ·  MDP Pallet Management  ·  Total ${items.length} Jenis Pallet`,
      PAD, H - 12
    );

    // Download
    const link = document.createElement('a');
    link.download = `Laporan_Stok_Pallet_${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadHistoryMutasiGambar = () => {
    if (!selectedRincianHistory) return;

    const today = new Date();
    const hariNames  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const hariName   = hariNames[today.getDay()];
    const tanggalStr = `${today.getDate()} ${bulanNames[today.getMonth()]} ${today.getFullYear()}`;
    const periodStr = `${bulanNames[historyMonth - 1]} ${historyYear}`;

    let historyData = data
      .filter(d => d.customer === selectedRincianHistory.nama && d.ukuran === selectedRincianHistory.ukuran)
      .filter(d => {
        const dDate = new Date(d.tanggal);
        return (dDate.getMonth() + 1) === historyMonth && dDate.getFullYear() === historyYear;
      })
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const W = 1122; // A4 landscape
    const ROW_H = 35;
    const requiredHeight = 160 + (historyData.length * ROW_H) + 60; 
    const H = Math.max(794, requiredHeight);
    const SC = 1;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.scale(SC, SC);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#4F46E5');
    grad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    const PAD = 40;
    let y = 50;

    // Header
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('History Mutasi Pallet', PAD, y);
    
    y += 25;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4F46E5';
    ctx.fillText(`${selectedRincianHistory.nama} — ${selectedRincianHistory.ukuran}`, PAD, y);

    y += 20;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText(`Dicetak pada: ${hariName}, ${tanggalStr}`, PAD, y);

    y += 30;

    // Table Headers
    const cols = [
      { w: 100, label: 'Tanggal', align: 'left' },
      { w: 90, label: 'Stok Awal', align: 'center' },
      { w: 90, label: 'Produksi', align: 'center' },
      { w: 110, label: 'In: Lumajang', align: 'center' },
      { w: 110, label: 'In: Subcont', align: 'center' },
      { w: 110, label: 'Out: Kirim', align: 'center' },
      { w: 130, label: 'Retur: LMJ (WS)', align: 'center' },
      { w: 100, label: 'Retur: Cust', align: 'center' },
      { w: 110, label: 'Total Stok', align: 'center' }
    ];

    // Draw header background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(PAD, y - 20, W - PAD * 2, 30);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(PAD, y - 20, W - PAD * 2, 30);

    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#64748B';
    
    let currentX = PAD + 10;
    cols.forEach(col => {
      let textX = currentX;
      if (col.align === 'center') {
        textX = currentX + col.w / 2 - ctx.measureText(col.label).width / 2;
      }
      ctx.fillText(col.label, textX, y);
      currentX += col.w;
    });

    y += 15;

    // Table Rows
    if (historyData.length === 0) {
      y += 20;
      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Tidak ada history transaksi.', W / 2 - ctx.measureText('Tidak ada history transaksi.').width / 2, y);
    } else {
      historyData.forEach((item, idx) => {
        const totalStock = calculateTotalStock(item);
        
        ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(PAD, y - 15, W - PAD * 2, ROW_H);
        
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
        let cx = PAD + 10;
        
        // Helper
        const drawCell = (text, w, color = '#334155', weight = 'normal', align = 'center') => {
          ctx.fillStyle = color;
          ctx.font = `${weight} 13px "Segoe UI", Arial, sans-serif`;
          let tx = cx;
          if (align === 'center') tx = cx + w / 2 - ctx.measureText(text).width / 2;
          ctx.fillText(text, tx, y + 6);
          cx += w;
        };

        const tglStr = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        
        drawCell(tglStr, cols[0].w, '#64748B', 'normal', 'left');
        drawCell(item.stockAwal.toString(), cols[1].w, '#64748B');
        drawCell(item.produksi > 0 ? `+${item.produksi}` : '-', cols[2].w, '#4F46E5', 'bold');
        drawCell(item.dariLumajang > 0 ? `+${item.dariLumajang}` : '-', cols[3].w, '#2563EB', 'bold');
        drawCell(item.dariSubcont > 0 ? `+${item.dariSubcont}` : '-', cols[4].w, '#0891B2', 'bold');
        drawCell(item.palletKeluar > 0 ? `-${item.palletKeluar}` : '-', cols[5].w, '#E11D48', 'bold');
        drawCell(item.returLumajang > 0 ? `-${item.returLumajang}` : '-', cols[6].w, '#D97706', 'bold');
        drawCell(item.returCustomer > 0 ? `+${item.returCustomer}` : '-', cols[7].w, '#059669', 'bold');
        
        // Total Stok background
        ctx.fillStyle = '#EEF2FF';
        ctx.fillRect(cx - cols[8].w + 5, y - 12, cols[8].w - 10, 24);
        drawCell(totalStock.toString(), cols[8].w, '#4338CA', 'bold');
        
        // Row Border
        ctx.strokeStyle = '#F1F5F9';
        ctx.beginPath(); ctx.moveTo(PAD, y + 19); ctx.lineTo(W - PAD, y + 19); ctx.stroke();

        y += ROW_H;
      });
    }

    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(PAD, 100, W - PAD * 2, y - 100);

    const link2 = document.createElement('a');
    link2.download = `History_Mutasi_${selectedRincianHistory.nama.replace(/\s+/g, '_')}_${historyYear}_${String(historyMonth).padStart(2, '0')}.png`;
    link2.href     = canvas.toDataURL('image/png');
    link2.click();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isStringField = ['customer', 'ukuran', 'tanggal', 'subcontNama'].includes(name);
    
    setFormData(prev => {
      const nextState = {
        ...prev,
        [name]: isStringField ? value : Number(value)
      };
      
      // Automatically recalculate stockAwal if tanggal, customer, or ukuran changes
      if (name === 'tanggal' || name === 'customer' || name === 'ukuran') {
        nextState.stockAwal = calculateStockAwalForForm(
          nextState.customer,
          nextState.ukuran,
          nextState.tanggal,
          editingItem?.id
        );
      }
      return nextState;
    });
  };

  const handleTypeInputChange = (e) => {
    const { name, value } = e.target;
    setTypeFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- Handlers for Mutasi Transactions ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) {
      alert('Nama Customer wajib diisi!');
      return;
    }
    if (!formData.ukuran) {
      alert('Ukuran pallet wajib diisi! Pastikan Anda memilih jenis pallet terlebih dahulu.');
      return;
    }

    let updatedData;
    if (editingItem) {
      // Edit mode
      updatedData = data.map(item => item.id === editingItem.id ? { ...formData, id: item.id } : item);
    } else {
      // Add mode
      const newItem = {
        ...formData,
        id: 'sp_' + Date.now(),
        createdAt: new Date().toISOString()
      };
      updatedData = [...data, newItem];
    }

    updatedData = recalculateStockHistory(updatedData);

    setData(updatedData);
    await storageAPI.saveStockPallets(updatedData);
    closeModal();
  };

  const handleSjSubmit = async (e) => {
    e.preventDefault();
    const { tanggal, palletType, poId, reffSuffix, qtyKeluar } = sjFormData;

    if (!palletType) {
      alert('Silakan pilih Jenis Pallet!');
      return;
    }
    if (!poId) {
      alert('Silakan pilih No. Reff / PO!');
      return;
    }
    if (qtyKeluar <= 0) {
      alert('Jumlah pallet keluar harus lebih besar dari 0!');
      return;
    }

    const selectedPo = outstandingPOs.find(p => p.id === poId);
    if (!selectedPo) {
      alert('PO tidak ditemukan!');
      return;
    }

    if (qtyKeluar > selectedPo.sisaPo) {
      if (!window.confirm(`Jumlah kiriman (${qtyKeluar} pcs) melebihi sisa PO (${selectedPo.sisaPo} pcs). Apakah Anda yakin ingin melanjutkan?`)) {
        return;
      }
    }

    const rawReff = selectedPo.noReff || '';
    const slashIndex = rawReff.indexOf('/');
    const baseReff = slashIndex !== -1 ? rawReff.substring(0, slashIndex + 1) : rawReff;
    const fullReff = baseReff + reffSuffix.trim();

    // 1. Simpan pengiriman baru ke PO Deliveries
    const newDelivery = {
      id: 'del_' + Date.now(),
      poId: selectedPo.id,
      tanggalKirim: tanggal,
      noReff: fullReff,
      qtyKirim: qtyKeluar
    };

    const currentDeliveries = await storageAPI.getDeliveries();
    const updatedDeliveries = [...currentDeliveries, newDelivery];
    await storageAPI.saveDeliveries(updatedDeliveries);

    // 2. Hitung ulang kiriman dan sisa PO
    const currentPOs = await storageAPI.getOutstandingPOs();
    const poDels = updatedDeliveries.filter(d => d.poId === selectedPo.id);
    const totalKiriman = poDels.filter(d => d.qtyKirim > 0).reduce((sum, d) => sum + d.qtyKirim, 0);
    const totalRetur = poDels.filter(d => d.qtyKirim < 0).reduce((sum, d) => sum + Math.abs(d.qtyKirim), 0);

    const updatedPOs = currentPOs.map(po => {
      if (po.id === selectedPo.id) {
        return {
          ...po,
          kiriman: totalKiriman,
          kirimanAwal: totalKiriman,
          sisaPo: Math.max(0, Number(po.jumlahPo) - totalKiriman + totalRetur),
          noReff: fullReff
        };
      }
      return po;
    });
    await storageAPI.saveOutstandingPOs(updatedPOs);
    setOutstandingPOs(updatedPOs);

    // 3. Tambahkan ke Mutasi Stock Pallet sebagai Pallet Keluar
    const newMutasi = {
      id: 'sp_' + Date.now(),
      tanggal: tanggal,
      customer: selectedPo.customer,
      ukuran: selectedPo.ukuran,
      produksi: 0,
      stockAwal: calculateStockAwalForLoadedData(data, selectedPo.customer, selectedPo.ukuran, tanggal),
      dariLumajang: 0,
      dariSubcont: 0,
      subcontNama: fullReff,
      palletKeluar: qtyKeluar,
      returLumajang: 0,
      returCustomer: 0,
      createdAt: new Date().toISOString()
    };

    const updatedMutasiData = recalculateStockHistory([...data, newMutasi]);
    setData(updatedMutasiData);
    await storageAPI.saveStockPallets(updatedMutasiData);

    setReffInput('');
    setSjPalletTypeSearch('');
    setSjFormData({
      tanggal: new Date().toISOString().split('T')[0],
      palletType: '',
      ukuran: '',
      poId: '',
      reffSuffix: '',
      qtyKeluar: 0
    });
    setIsSjModalOpen(false);
    alert('Surat Jalan Keluar berhasil disimpan dan PO telah diupdate!');
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setPalletTypeSearch(item.customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data stok pallet ini?')) {
      let updatedData = data.filter(item => item.id !== id);
      updatedData = recalculateStockHistory(updatedData);
      setData(updatedData);
      await storageAPI.deleteStockPallet(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPalletTypeSearch(palletTypes[0]?.nama || '');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultCust = palletTypes[0]?.nama || '';
    const defaultUkuran = palletTypes[0]?.ukuran || '1000x1200 mm';
    const lastStock = calculateStockAwalForForm(defaultCust, defaultUkuran, todayStr);

    setFormData({
      tanggal: todayStr,
      customer: defaultCust,
      ukuran: defaultUkuran,
      produksi: 0,
      stockAwal: lastStock,
      dariLumajang: 0,
      dariSubcont: 0,
      subcontNama: '',
      palletKeluar: 0,
      returLumajang: 0,
      returCustomer: 0
    });
  };

  // --- Handlers for Master Jenis Pallet ---
  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    if (!typeFormData.nama || !typeFormData.ukuran) {
      alert('Nama Jenis Pallet dan Ukuran wajib diisi!');
      return;
    }

    let updated;
    if (editingType) {
      // Edit
      updated = palletTypes.map(pt => pt.id === editingType.id ? { ...typeFormData, id: pt.id } : pt);
    } else {
      // Add
      if (palletTypes.some(pt => pt.nama.toLowerCase().trim() === typeFormData.nama.toLowerCase().trim())) {
        alert('Nama Jenis Pallet sudah ada! Gunakan nama lain.');
        return;
      }
      updated = [{ ...typeFormData, id: 'pt_' + Date.now() }, ...palletTypes];
    }

    setPalletTypes(updated);
    await storageAPI.savePalletTypes(updated);
    closeTypeModal();
  };

  const handleTypeEdit = (pt) => {
    setEditingType(pt);
    setTypeFormData({ ...pt });
    setIsTypeModalOpen(true);
  };

  const handleTypeDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus jenis pallet ini? Pilihan ini mungkin memengaruhi data mutasi yang menggunakannya.')) {
      const updated = palletTypes.filter(pt => pt.id !== id);
      setPalletTypes(updated);
      await storageAPI.deletePalletType(id);
    }
  };

  const closeTypeModal = () => {
    setIsTypeModalOpen(false);
    setEditingType(null);
    setTypeFormData({
      nama: '',
      ukuran: '1000x1200 mm',
      keterangan: ''
    });
  };






  // Filter & Search Logic
  const filteredData = data.filter(item => {
    const matchesSearch = item.customer.toLowerCase().includes(search.toLowerCase()) || 
                          item.ukuran.toLowerCase().includes(search.toLowerCase());
    
    let matchesMutasiType = true;
    if (selectedMutasiType === 'Subcont') {
      matchesMutasiType = Number(item.dariSubcont || 0) > 0;
    } else if (selectedMutasiType === 'Lumajang') {
      matchesMutasiType = Number(item.dariLumajang || 0) > 0;
    } else if (selectedMutasiType === 'Kedatangan (Keduanya)') {
      matchesMutasiType = Number(item.dariLumajang || 0) > 0 || Number(item.dariSubcont || 0) > 0;
    } else if (selectedMutasiType === 'Keluar') {
      matchesMutasiType = Number(item.palletKeluar || 0) > 0;
    }
    
    let matchesMonth = true;
    if (filterMonth !== 'all' && item.tanggal) {
      matchesMonth = item.tanggal.substring(5, 7) === filterMonth;
    }
    
    let matchesYear = true;
    if (filterYear !== 'all' && item.tanggal) {
      matchesYear = item.tanggal.substring(0, 4) === filterYear;
    }
    
    return matchesSearch && matchesMutasiType && matchesMonth && matchesYear;
  });

  const sortedMutasiData = [...filteredData].sort((a, b) => {
    let aVal = a[mutasiSort.key];
    let bVal = b[mutasiSort.key];
    
    if (mutasiSort.key === 'tanggal') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return mutasiSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return mutasiSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedMutasiData.length / ROWS_PER_PAGE));
  const paginatedData = sortedMutasiData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const filteredPalletTypes = palletTypes.filter(pt => 
    pt.nama.toLowerCase().includes(typeSearch.toLowerCase()) ||
    pt.ukuran.toLowerCase().includes(typeSearch.toLowerCase()) ||
    (pt.keterangan || '').toLowerCase().includes(typeSearch.toLowerCase())
  );

  const sortedPalletTypes = [...filteredPalletTypes].sort((a, b) => {
    let aVal = a[jenisSort.key] || '';
    let bVal = b[jenisSort.key] || '';
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return jenisSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return jenisSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const hasPreceding = (() => {
    if (!formData.customer || !formData.ukuran || !formData.tanggal) return false;
    const typeTransactions = data.filter(
      item => item.customer === formData.customer && 
              item.ukuran === formData.ukuran && 
              item.id !== (editingItem?.id || null)
    );
    const targetDate = new Date(formData.tanggal);
    return typeTransactions.some(item => new Date(item.tanggal) <= targetDate);
  })();

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Stok & Mutasi Pallet</h2>
          <p className="text-slate-500 mt-1 font-medium">Kelola dan pantau persediaan stok pallet customer serta data master jenis pallet</p>
        </div>
      </div>

      {/* Sub-tabs Selector */}
      <div className="flex flex-wrap border-b border-slate-200 gap-y-1">
        <button
          onClick={() => setSubTab('mutasi')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            subTab === 'mutasi' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📦 Mutasi Stok Pallet
        </button>
        <button
          onClick={() => setSubTab('rincian')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            subTab === 'rincian' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📊 Rincian Jumlah Pallet
        </button>
        <button
          onClick={() => setSubTab('jenis')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            subTab === 'jenis' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🏷️ Master Jenis Pallet
        </button>
      </div>

      {/* --- PANEL 1: MUTASI STOK PALLET --- */}
      {subTab === 'mutasi' && (
        <div className="space-y-6">
          {/* Action Row */}
          {isAdmin && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Input Transaksi
                </button>
                <button
                  onClick={() => {
                    setReffInput('');
                    setSjPalletTypeSearch('');
                    setSjFormData({
                      tanggal: new Date().toISOString().split('T')[0],
                      palletType: '',
                      ukuran: '',
                      poId: '',
                      reffSuffix: '',
                      qtyKeluar: 0
                    });
                    setIsSjModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Input SJ Keluar
                </button>
              </div>
            </div>
          )}

          {/* Control Panel (Search & Filters) */}
          <div className="glass-card bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari Customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {/* Sort Dropdown */}
              <div className="relative flex-1 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <ArrowUpDown className="w-4 h-4" />
                </span>
                <select
                  value={`${mutasiSort.key}-${mutasiSort.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setMutasiSort({ key, direction });
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer font-medium"
                >
                  <option value="tanggal-desc">Terbaru</option>
                  <option value="tanggal-asc">Terlama</option>
                  <option value="customer-asc">Customer (A-Z)</option>
                  <option value="customer-desc">Customer (Z-A)</option>
                  <option value="stockAwal-desc">Stok Awal Terbanyak</option>
                  <option value="stockAwal-asc">Stok Awal Terkecil</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Filter className="w-4 h-4" />
                </span>
                <select
                  value={selectedMutasiType}
                  onChange={(e) => { setSelectedMutasiType(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer font-medium"
                >
                  <option value="Semua">Semua Mutasi</option>
                  <option value="Subcont">Subcont</option>
                  <option value="Lumajang">Lumajang</option>
                  <option value="Kedatangan (Keduanya)">Kedatangan (Keduanya)</option>
                  <option value="Keluar">Keluar</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filter Bulan */}
              <div className="relative flex-1 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <select
                  value={filterMonth}
                  onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer font-medium"
                >
                  <option value="all">Semua Bulan</option>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filter Tahun */}
              <div className="relative flex-1 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <select
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer font-medium"
                >
                  <option value="all">Semua Tahun</option>
                  {getUniqueYears().map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Main Table Grid / Cards */}
          <div className="space-y-4">
            {/* Desktop & Tablet Table View */}
            <div className="hidden md:block glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4 px-4 w-28 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('tanggal')}>
                        Tanggal {mutasiSort.key === 'tanggal' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-48 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('customer')}>
                        Customer / Ukuran {mutasiSort.key === 'customer' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-24 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('stockAwal')}>
                        Stok Awal {mutasiSort.key === 'stockAwal' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-24 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('produksi')}>
                        Produksi {mutasiSort.key === 'produksi' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-36 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('dariLumajang')}>
                        Masuk (In) {mutasiSort.key === 'dariLumajang' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-24 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('palletKeluar')}>
                        Kirim (Out) {mutasiSort.key === 'palletKeluar' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-32 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleMutasiSort('returCustomer')}>
                        Retur {mutasiSort.key === 'returCustomer' && (mutasiSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-4 w-24 text-center font-extrabold text-slate-700">Total</th>
                      {isAdmin && <th className="py-4 px-4 w-24 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedMutasiData.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400 font-medium">
                          Tidak ada data stok pallet yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((item) => {
                        const totalStock = calculateTotalStock(item);

                        // Format Masuk (In) column
                        let masukStr = '-';
                        if (item.dariLumajang > 0 && item.dariSubcont > 0) {
                          masukStr = `LMJ: +${item.dariLumajang} / SBC: +${item.dariSubcont}`;
                        } else if (item.dariLumajang > 0) {
                          masukStr = `LMJ: +${item.dariLumajang}`;
                        } else if (item.dariSubcont > 0) {
                          masukStr = `SBC: +${item.dariSubcont}`;
                        }

                        // Format Retur column
                        let returStr = '-';
                        if (item.returCustomer > 0 && item.returLumajang > 0) {
                          returStr = `Cust: +${item.returCustomer} / LMJ: -${item.returLumajang}`;
                        } else if (item.returCustomer > 0) {
                          returStr = `Cust: +${item.returCustomer}`;
                        } else if (item.returLumajang > 0) {
                          returStr = `LMJ: -${item.returLumajang}`;
                        }

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-all duration-150 text-slate-600 font-medium">
                            <td className="py-4 px-4 text-slate-500 text-xs">
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 truncate" title={item.customer}>{item.customer}</div>
                              <div className="flex flex-wrap gap-1 items-center mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] border border-slate-200 text-slate-600 font-bold">
                                  {item.ukuran}
                                </span>
                                {item.palletKeluar > 0 && item.subcontNama && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] border border-indigo-150 text-indigo-650 font-bold">
                                    Reff: {item.subcontNama}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center text-slate-500">{item.stockAwal}</td>
                            <td className="py-4 px-4 text-center text-indigo-655 font-bold">
                              {item.subcontNama === 'OPNAME' ? '-' : `+${item.produksi}`}
                            </td>
                            <td className="py-4 px-4 text-center text-blue-650 font-bold text-xs">
                              {item.subcontNama === 'OPNAME' ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black border border-amber-200">
                                  OPNAME
                                </span>
                              ) : (
                                <>
                                  <div>{masukStr}</div>
                                  {item.subcontNama && (
                                    <div className="text-[9px] text-slate-400 font-medium normal-case">
                                      ({item.subcontNama})
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center text-rose-600 font-bold">
                              {item.subcontNama === 'OPNAME' ? '-' : `-${item.palletKeluar}`}
                            </td>
                            <td className="py-4 px-4 text-center text-amber-600 font-bold text-xs">
                              {item.subcontNama === 'OPNAME' ? '-' : returStr}
                            </td>
                            <td className="py-4 px-4 text-center font-extrabold text-indigo-700 bg-indigo-50/20">
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-150 text-xs font-extrabold">
                                {totalStock}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards List View */}
            <div className="md:hidden space-y-4">
              {sortedMutasiData.length === 0 ? (
                <div className="glass-card bg-white rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-100">
                  Tidak ada data stok pallet yang cocok dengan pencarian Anda.
                </div>
              ) : (
                paginatedData.map((item) => {
                  const totalStock = calculateTotalStock(item);
                  
                  // Format Masuk (In) details
                  let masukStr = '-';
                  if (item.dariLumajang > 0 && item.dariSubcont > 0) {
                    masukStr = `LMJ: +${item.dariLumajang} / SBC: +${item.dariSubcont}`;
                  } else if (item.dariLumajang > 0) {
                    masukStr = `LMJ: +${item.dariLumajang}`;
                  } else if (item.dariSubcont > 0) {
                    masukStr = `SBC: +${item.dariSubcont}`;
                  }

                  // Format Retur details
                  let returStr = '-';
                  if (item.returCustomer > 0 && item.returLumajang > 0) {
                    returStr = `Cust: +${item.returCustomer} / LMJ: -${item.returLumajang}`;
                  } else if (item.returCustomer > 0) {
                    returStr = `Cust: +${item.returCustomer}`;
                  } else if (item.returLumajang > 0) {
                    returStr = `LMJ: -${item.returLumajang}`;
                  }

                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs font-semibold">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {item.subcontNama === 'OPNAME' ? (
                          <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                            OPNAME CHECKPOINT
                          </span>
                        ) : (
                          item.subcontNama && (
                            <span className="inline-flex px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-150">
                              SBC: {item.subcontNama}
                            </span>
                          )
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{item.customer}</h4>
                        <div className="flex flex-wrap gap-1 items-center mt-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] border border-slate-200 text-slate-600 font-bold">
                            {item.ukuran}
                          </span>
                          {item.palletKeluar > 0 && item.subcontNama && (
                            <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-[10px] border border-indigo-150 text-indigo-650 font-bold">
                              Reff: {item.subcontNama}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-[11px] border border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Awal</span>
                          <span className="text-slate-700 font-bold">{item.stockAwal}</span>
                        </div>
                        <div>
                          <span className="text-indigo-500 block font-semibold mb-0.5">Produksi</span>
                          <span className="text-indigo-650 font-bold">{item.subcontNama === 'OPNAME' ? '-' : `+${item.produksi}`}</span>
                        </div>
                        <div>
                          <span className="text-blue-500 block font-semibold mb-0.5">Masuk (In)</span>
                          <span className="text-blue-650 font-bold truncate block px-0.5" title={masukStr}>
                            {item.subcontNama === 'OPNAME' ? '-' : (item.dariLumajang + item.dariSubcont > 0 ? masukStr : '-')}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-500 block font-semibold mb-0.5">Kirim (Out)</span>
                          <span className="text-rose-650 font-bold">{item.subcontNama === 'OPNAME' ? '-' : `-${item.palletKeluar}`}</span>
                        </div>
                        <div>
                          <span className="text-amber-500 block font-semibold mb-0.5">Retur</span>
                          <span className="text-amber-650 font-bold truncate block px-0.5" title={returStr}>
                            {item.subcontNama === 'OPNAME' ? '-' : returStr}
                          </span>
                        </div>
                        <div className="bg-indigo-100/50 rounded-lg py-0.5">
                          <span className="text-indigo-700 block font-bold mb-0.5">Total</span>
                          <span className="text-indigo-850 font-black">{totalStock}</span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all text-xs font-bold cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
              <span className="text-xs text-slate-400 font-semibold">
                Menampilkan {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredData.length)}–{Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)} dari {filteredData.length} baris
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[30px] px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )
                }

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PANEL 3: RINCIAN JUMLAH PALLET --- */}
      {subTab === 'rincian' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ringkasan & Rincian Jumlah Pallet</h3>
              <p className="text-xs text-slate-500 mt-0.5">Akumulasi jumlah stok pallet terkini berdasarkan data transaksi mutasi yang tercatat</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="bg-transparent text-slate-700 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={1}>Januari</option>
                  <option value={2}>Februari</option>
                  <option value={3}>Maret</option>
                  <option value={4}>April</option>
                  <option value={5}>Mei</option>
                  <option value={6}>Juni</option>
                  <option value={7}>Juli</option>
                  <option value={8}>Agustus</option>
                  <option value={9}>September</option>
                  <option value={10}>Oktober</option>
                  <option value={11}>November</option>
                  <option value={12}>Desember</option>
                </select>
                <span className="text-slate-300 font-medium">|</span>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="bg-transparent text-slate-700 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={downloadLaporanHarianGambar}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                📷 Download Laporan (PNG)
              </button>
            </div>
          </div>

          {/* Rincian Control Panel (Search & Sort) */}
          <div className="glass-card bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari Jenis Pallet atau Ukuran..."
                value={rincianSearch}
                onChange={(e) => setRincianSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <ArrowUpDown className="w-4 h-4" />
                </span>
                <select
                  value={`${summarySort.key}-${summarySort.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setSummarySort({ key, direction });
                  }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer font-medium"
                >
                  <option value="nama-asc">Nama (A-Z)</option>
                  <option value="nama-desc">Nama (Z-A)</option>
                  <option value="currentStock-desc">Stok Terbanyak</option>
                  <option value="currentStock-asc">Stok Terkecil</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Mini Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Jenis Pallet Aktif</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{palletTypes.length} Tipe</span>
            </div>
            <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Stok Pallet</span>
              <span className="text-2xl font-black text-indigo-655 mt-1 block">
                {getPalletSummaryForDate(selectedReportDate).reduce((acc, curr) => acc + curr.currentStock, 0).toLocaleString('id-ID')} Pcs
              </span>
            </div>
            <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Akumulasi Produksi</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {getPalletSummaryForDate(selectedReportDate).reduce((acc, curr) => acc + curr.totalProduksi, 0).toLocaleString('id-ID')} Pcs
              </span>
            </div>
          </div>
          {/* Rincian Table / Cards */}
          <div className="space-y-4">
            {/* Desktop View Table */}
            <div className="hidden sm:block glass-card bg-white rounded-2xl overflow-hidden border border-slate-150 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4 px-6 w-48 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('nama')}>
                        Nama Jenis Pallet {summarySort.key === 'nama' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-36 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('ukuran')}>
                        Ukuran {summarySort.key === 'ukuran' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-24 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('totalTx')}>
                        Log {summarySort.key === 'totalTx' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-28 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('totalProduksi')}>
                        Produksi {summarySort.key === 'totalProduksi' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-28 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('totalIn')}>
                        In {summarySort.key === 'totalIn' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-28 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('totalOut')}>
                        Out {summarySort.key === 'totalOut' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-32 text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSummarySort('currentStock')}>
                        Stok WH (Pcs) {summarySort.key === 'currentStock' && (summarySort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      {isAdmin && <th className="py-4 px-6 text-center w-24">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650 font-semibold">
                    {getSortedSummary().length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-10 text-center text-slate-400 font-medium">
                          Belum ada jenis pallet yang terdaftar untuk dirinci.
                        </td>
                      </tr>
                    ) : (
                      getSortedSummary().map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => setSelectedRincianHistory(item)}
                          className="hover:bg-slate-50/80 transition-all text-slate-600 cursor-pointer"
                          title="Klik untuk melihat history transaksi"
                        >
                          <td className="py-4 px-6 font-bold text-slate-800 truncate" title={item.nama}>{item.nama}</td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-600 font-bold">
                              {item.ukuran}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-500 font-normal">{item.totalTx} baris log</td>
                          <td className="py-4 px-6 text-center text-emerald-600 font-bold">+{item.totalProduksi}</td>
                          <td className="py-4 px-6 text-center text-blue-600">+{item.totalIn}</td>
                          <td className="py-4 px-6 text-center text-rose-600">-{item.totalOut}</td>
                          <td className="py-4 px-6 text-center font-extrabold bg-indigo-50/10">
                            <span className={`px-2.5 py-1 rounded text-xs font-black border ${
                              item.currentStock > 0 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-150' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {item.currentStock} Pcs
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleTypeDelete(item.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                title="Hapus Jenis Pallet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-4">
              {getSortedSummary().length === 0 ? (
                <div className="glass-card bg-white rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-100">
                  Belum ada jenis pallet yang terdaftar untuk dirinci.
                </div>
              ) : (
                getSortedSummary().map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedRincianHistory(item)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3 cursor-pointer"
                    title="Klik untuk melihat history transaksi"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{item.nama}</h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] border border-slate-200 text-slate-600 font-bold">
                          {item.ukuran}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-black border ${
                        item.currentStock > 0 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-150' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.currentStock} Pcs
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-[10px] border border-slate-100">
                      <div>
                        <span className="text-slate-450 block font-semibold mb-0.5">Log</span>
                        <span className="text-slate-700 font-bold">{item.totalTx}</span>
                      </div>
                      <div>
                        <span className="text-emerald-500 block font-semibold mb-0.5">Prod</span>
                        <span className="text-emerald-650 font-bold">+{item.totalProduksi}</span>
                      </div>
                      <div>
                        <span className="text-blue-500 block font-semibold mb-0.5">In</span>
                        <span className="text-blue-650 font-bold">+{item.totalIn}</span>
                      </div>
                      <div>
                        <span className="text-rose-500 block font-semibold mb-0.5">Out</span>
                        <span className="text-rose-650 font-bold">-{item.totalOut}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleTypeDelete(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Jenis
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL 2: MASTER JENIS PALLET --- */}
      {subTab === 'jenis' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Daftar Jenis Pallet Terdaftar</h3>
            {isAdmin && (
              <button
                onClick={() => setIsTypeModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Jenis Pallet
              </button>
            )}
          </div>

          {/* Search bar for Master Jenis Pallet */}
          <div className="glass-card bg-white rounded-2xl p-4 flex gap-4 items-center justify-between border border-slate-100">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari nama jenis pallet atau ukuran..."
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
              />
            </div>
          </div>

          {/* Jenis Table / Cards */}
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden sm:block glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4 px-6 w-48 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleJenisSort('nama')}>
                        Nama Jenis Pallet {jenisSort.key === 'nama' && (jenisSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 w-36 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleJenisSort('ukuran')}>
                        Ukuran {jenisSort.key === 'ukuran' && (jenisSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-4 px-6 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleJenisSort('keterangan')}>
                        Keterangan {jenisSort.key === 'keterangan' && (jenisSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      {isAdmin && <th className="py-4 px-6 text-center w-28">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650 font-semibold">
                    {palletTypes
                      .filter(pt => 
                        pt.nama.toLowerCase().includes(typeSearch.toLowerCase()) ||
                        pt.ukuran.toLowerCase().includes(typeSearch.toLowerCase()) ||
                        (pt.keterangan || '').toLowerCase().includes(typeSearch.toLowerCase())
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 4 : 3} className="py-10 text-center text-slate-400 font-medium">
                            Tidak ada jenis pallet yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        palletTypes
                          .filter(pt => 
                            pt.nama.toLowerCase().includes(typeSearch.toLowerCase()) ||
                            pt.ukuran.toLowerCase().includes(typeSearch.toLowerCase()) ||
                            (pt.keterangan || '').toLowerCase().includes(typeSearch.toLowerCase())
                          )
                          .map((pt) => (
                            <tr key={pt.id} className="hover:bg-slate-50/80 transition-all text-slate-600">
                              <td className="py-4 px-6 font-bold text-slate-800 truncate" title={pt.nama}>{pt.nama}</td>
                              <td className="py-4 px-6">
                                <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                                  {pt.ukuran}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-500 font-normal truncate" title={pt.keterangan}>{pt.keterangan || '-'}</td>
                              {isAdmin && (
                                <td className="py-4 px-6">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => handleTypeEdit(pt)}
                                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleTypeDelete(pt.id)}
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-4">
              {palletTypes
                .filter(pt => 
                  pt.nama.toLowerCase().includes(typeSearch.toLowerCase()) ||
                  pt.ukuran.toLowerCase().includes(typeSearch.toLowerCase()) ||
                  (pt.keterangan || '').toLowerCase().includes(typeSearch.toLowerCase())
                ).length === 0 ? (
                  <div className="glass-card bg-white rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-100">
                    Tidak ada jenis pallet yang terdaftar.
                  </div>
                ) : (
                  palletTypes
                    .filter(pt => 
                      pt.nama.toLowerCase().includes(typeSearch.toLowerCase()) ||
                      pt.ukuran.toLowerCase().includes(typeSearch.toLowerCase()) ||
                      (pt.keterangan || '').toLowerCase().includes(typeSearch.toLowerCase())
                    )
                    .map((pt) => (
                      <div key={pt.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm">{pt.nama}</h4>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                              {pt.ukuran}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-slate-550 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Keterangan</span>
                          {pt.keterangan || '-'}
                        </p>

                        {isAdmin && (
                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleTypeEdit(pt)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all text-xs font-bold cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleTypeDelete(pt.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                )}
            </div>
          </div>
        </div>
      )}




      {/* --- MODAL 1: INPUT/EDIT TRANSAKSI MUTASI PALLET --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">
                {editingItem ? 'Edit Transaksi Pallet' : 'Input Transaksi Pallet Baru'}
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                </div>

                <div className="relative">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jenis Pallet (Master)</label>
                  <input
                    ref={palletSearchInputRef}
                    type="text"
                    placeholder="🔍 Ketik untuk cari Jenis Pallet..."
                    value={palletTypeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPalletTypeSearch(val);
                      if (palletSearchInputRef.current) {
                        const rect = palletSearchInputRef.current.getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      if (palletSearchInputRef.current) {
                        palletSearchInputRef.current.select();
                        const rect = palletSearchInputRef.current.getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }
                      setShowDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                    autoComplete="off"
                  />

                  {/* Dropdown rendered with fixed position to escape modal overflow clipping */}
                  {showDropdown && (
                    <div
                      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
                      className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                    >
                      {(() => {
                        const filtered = palletTypes.filter(pt => {
                          if (!palletTypeSearch) return true;
                          return pt.nama.toLowerCase().includes(palletTypeSearch.toLowerCase()) ||
                                 pt.ukuran.toLowerCase().includes(palletTypeSearch.toLowerCase());
                        });
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-slate-400 text-xs text-center font-medium">
                              Jenis pallet tidak ditemukan
                            </div>
                          );
                        }
                        return filtered.map(pt => (
                          <button
                            key={pt.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const stockAwal = calculateStockAwalForForm(pt.nama, pt.ukuran, formData.tanggal, editingItem?.id);
                              setFormData(prev => ({
                                ...prev,
                                ukuran: pt.ukuran,
                                customer: pt.nama,
                                stockAwal: stockAwal
                              }));
                              setPalletTypeSearch(pt.nama);
                              setShowDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 text-slate-700 hover:text-slate-900 font-semibold transition-all border-b border-slate-100 last:border-none cursor-pointer flex justify-between items-center"
                          >
                            <span>{pt.nama}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-bold">{pt.ukuran}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ukuran Pallet (Otomatis terisi)</label>
                  <input
                    type="text"
                    name="ukuran"
                    value={formData.ukuran}
                    placeholder="Ukuran terisi otomatis..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 focus:outline-none text-sm font-semibold"
                    readOnly
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-800">Mutasi & Rincian Stok (Unit)</h4>
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 cursor-pointer hover:bg-amber-100/50 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={formData.subcontNama === 'OPNAME'}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          subcontNama: checked ? 'OPNAME' : '',
                          produksi: 0,
                          dariLumajang: 0,
                          dariSubcont: 0,
                          palletKeluar: 0,
                          returLumajang: 0,
                          returCustomer: 0
                        }));
                      }}
                      className="cursor-pointer accent-amber-600 w-4 h-4"
                    />
                    <span>Atur sebagai Stock Opname (Checkpoint)</span>
                  </label>
                </div>

                {formData.subcontNama === 'OPNAME' ? (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-xs text-amber-700 space-y-3">
                    <p className="font-bold">⚠️ Perhatian: Mode Penyesuaian Stock Opname Aktif</p>
                    <p className="font-medium leading-relaxed">
                      Sistem akan menggunakan angka di bawah ini sebagai saldo fisik riil pada tanggal ini. 
                      Semua perhitungan mutasi setelah tanggal ini akan otomatis dimulai dari saldo opname ini.
                    </p>
                    <div className="max-w-[220px]">
                      <label className="block text-slate-600 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">Stok Hasil Opname (Saldo Baru)</label>
                      <input
                        type="number"
                        name="stockAwal"
                        required
                        value={formData.stockAwal}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:outline-none focus:border-amber-500 focus:bg-white text-sm font-bold text-amber-800 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Stok Awal</label>
                      <input
                        type="number"
                        name="stockAwal"
                        value={formData.stockAwal}
                        onChange={handleInputChange}
                        min="0"
                        readOnly={hasPreceding}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none ${
                          hasPreceding
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 text-slate-800 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                        {hasPreceding ? '*Dihitung otomatis (ada transaksi pendahulu)' : '*Saldo awal (bisa diedit manual)'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Produksi</label>
                      <input
                        type="number"
                        name="produksi"
                        value={formData.produksi}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Lumajang</label>
                      <input
                        type="number"
                        name="dariLumajang"
                        value={formData.dariLumajang}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-cyan-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Subcont</label>
                      <input
                        type="number"
                        name="dariSubcont"
                        value={formData.dariSubcont}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-rose-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pallet Keluar</label>
                      <input
                        type="number"
                        name="palletKeluar"
                        value={formData.palletKeluar}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Retur LMJ (WS)</label>
                      <input
                        type="number"
                        name="returLumajang"
                        value={formData.returLumajang}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Retur Cust</label>
                      <input
                        type="number"
                        name="returCustomer"
                        value={formData.returCustomer}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-center items-center text-center">
                      <span className="text-indigo-600 text-[9px] font-bold uppercase tracking-wider">Total Est.</span>
                      <span className="text-lg font-black text-indigo-700">
                        {calculateTotalStock(formData)}
                      </span>
                    </div>

                    {Number(formData.dariSubcont) > 0 && (
                      <div className="col-span-2 sm:col-span-4 mt-2 p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 animate-fadeIn">
                        <label className="block text-cyan-700 text-xs font-bold uppercase tracking-wider">Nama Subcont / Vendor</label>
                        <input
                          type="text"
                          name="subcontNama"
                          value={formData.subcontNama || ''}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama subcont (contoh: CV Abadi Jaya)..."
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-850 focus:outline-none focus:border-cyan-500 focus:bg-white text-sm font-semibold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-sm font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition-all text-sm cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CRUD MASTER JENIS PALLET --- */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">
                {editingType ? 'Edit Jenis Pallet' : 'Tambah Jenis Pallet Baru'}
              </h3>
              <button onClick={closeTypeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTypeSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Nama Jenis Pallet</label>
                <input
                  type="text"
                  name="nama"
                  value={typeFormData.nama}
                  onChange={handleTypeInputChange}
                  placeholder="Contoh: Pallet Kayu Standar A"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ukuran Pallet</label>
                <input
                  type="text"
                  name="ukuran"
                  value={typeFormData.ukuran}
                  onChange={handleTypeInputChange}
                  placeholder="Contoh: 1000x1200 mm"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Keterangan</label>
                <textarea
                  name="keterangan"
                  value={typeFormData.keterangan}
                  onChange={handleTypeInputChange}
                  placeholder="Keterangan tambahan..."
                  rows="2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeTypeModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* --- MODAL 4: HISTORY TRANSAKSI (RINCIAN LOG) --- */}
      {selectedRincianHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 bg-slate-50 gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">History Mutasi Pallet</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  {selectedRincianHistory.nama} — <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedRincianHistory.ukuran}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Month/Year Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(Number(e.target.value))}
                    className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value={1}>Januari</option>
                    <option value={2}>Februari</option>
                    <option value={3}>Maret</option>
                    <option value={4}>April</option>
                    <option value={5}>Mei</option>
                    <option value={6}>Juni</option>
                    <option value={7}>Juli</option>
                    <option value={8}>Agustus</option>
                    <option value={9}>September</option>
                    <option value={10}>Oktober</option>
                    <option value={11}>November</option>
                    <option value={12}>Desember</option>
                  </select>
                  <span className="text-slate-200 font-medium">|</span>
                  <select
                    value={historyYear}
                    onChange={(e) => setHistoryYear(Number(e.target.value))}
                    className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={downloadHistoryMutasiGambar}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold transition-all text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download (PNG)
                </button>
                <button onClick={() => setSelectedRincianHistory(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {(() => {
              const filteredHistory = data
                .filter(d => d.customer === selectedRincianHistory.nama && d.ukuran === selectedRincianHistory.ukuran)
                .filter(d => {
                  const dDate = new Date(d.tanggal);
                  return (dDate.getMonth() + 1) === historyMonth && dDate.getFullYear() === historyYear;
                })
                .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

              const HISTORY_ROWS_PER_PAGE = 5;
              const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_ROWS_PER_PAGE));
              const paginatedHistory = filteredHistory.slice((historyPage - 1) * HISTORY_ROWS_PER_PAGE, historyPage * HISTORY_ROWS_PER_PAGE);

              return (
                <div className="flex-1 overflow-auto p-6 bg-white flex flex-col gap-4">
                  <div className="flex-1 overflow-auto">
                    {/* Desktop Table View */}
                    <div className="hidden sm:block">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                            <th className="py-3 px-4">Tanggal</th>
                            <th className="py-3 px-4 text-center">Stok Awal</th>
                            <th className="py-3 px-4 text-center">Produksi</th>
                            <th className="py-3 px-4 text-center">Masuk (In)</th>
                            <th className="py-3 px-4 text-center">Kirim (Out)</th>
                            <th className="py-3 px-4 text-center">Retur</th>
                            <th className="py-3 px-4 text-center font-extrabold">Total Stok</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                          {paginatedHistory.map((item) => {
                            const totalStock = calculateTotalStock(item);
                            
                            // Format Masuk (In) column
                            let masukStr = '-';
                            if (item.dariLumajang > 0 && item.dariSubcont > 0) {
                              masukStr = `LMJ: +${item.dariLumajang} / SBC: +${item.dariSubcont}`;
                            } else if (item.dariLumajang > 0) {
                              masukStr = `LMJ: +${item.dariLumajang}`;
                            } else if (item.dariSubcont > 0) {
                              masukStr = `SBC: +${item.dariSubcont}`;
                            }

                            // Format Retur column
                            let returStr = '-';
                            if (item.returCustomer > 0 && item.returLumajang > 0) {
                              returStr = `Cust: +${item.returCustomer} / LMJ: -${item.returLumajang}`;
                            } else if (item.returCustomer > 0) {
                              returStr = `Cust: +${item.returCustomer}`;
                            } else if (item.returLumajang > 0) {
                              returStr = `LMJ: -${item.returLumajang}`;
                            }

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-all whitespace-nowrap">
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500">{item.stockAwal}</td>
                                <td className="py-3 px-4 text-center text-indigo-650 font-bold">{item.produksi > 0 ? `+${item.produksi}` : '-'}</td>
                                <td className="py-3 px-4 text-center text-blue-650 font-bold">{masukStr}</td>
                                <td className="py-3 px-4 text-center text-rose-600 font-bold">{item.palletKeluar > 0 ? `-${item.palletKeluar}` : '-'}</td>
                                <td className="py-3 px-4 text-center text-amber-600 font-bold">{returStr}</td>
                                <td className="py-3 px-4 text-center font-extrabold text-indigo-700 bg-indigo-50/30">
                                  {totalStock}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredHistory.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-slate-400">Tidak ada history transaksi pada bulan & tahun ini.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="sm:hidden space-y-3">
                      {filteredHistory.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 font-medium">
                          Tidak ada history transaksi pada bulan & tahun ini.
                        </div>
                      ) : (
                        paginatedHistory.map((item) => {
                          const totalStock = calculateTotalStock(item);
                          
                          // Format Masuk (In) column
                          let masukStr = '-';
                          if (item.dariLumajang > 0 && item.dariSubcont > 0) {
                            masukStr = `LMJ: +${item.dariLumajang} / SBC: +${item.dariSubcont}`;
                          } else if (item.dariLumajang > 0) {
                            masukStr = `LMJ: +${item.dariLumajang}`;
                          } else if (item.dariSubcont > 0) {
                            masukStr = `SBC: +${item.dariSubcont}`;
                          }

                          // Format Retur column
                          let returStr = '-';
                          if (item.returCustomer > 0 && item.returLumajang > 0) {
                            returStr = `Cust: +${item.returCustomer} / LMJ: -${item.returLumajang}`;
                          } else if (item.returCustomer > 0) {
                            returStr = `Cust: +${item.returCustomer}`;
                          } else if (item.returLumajang > 0) {
                            returStr = `LMJ: -${item.returLumajang}`;
                          }

                          return (
                            <div key={item.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 shadow-xs space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-xs font-bold">
                                  {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-indigo-750 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs font-extrabold">
                                  Stok: {totalStock}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-left text-[11px] text-slate-650 bg-white p-3 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-slate-400 block font-semibold">Stok Awal:</span>
                                  <span className="font-bold text-slate-700">{item.stockAwal}</span>
                                </div>
                                <div>
                                  <span className="text-indigo-500 block font-semibold">Produksi:</span>
                                  <span className="font-bold text-indigo-700">{item.produksi > 0 ? `+${item.produksi}` : '-'}</span>
                                </div>
                                <div>
                                  <span className="text-blue-500 block font-semibold">Masuk (In):</span>
                                  <span className="font-bold text-blue-700 truncate block w-full text-xs" title={masukStr}>{masukStr}</span>
                                </div>
                                <div>
                                  <span className="text-rose-500 block font-semibold">Kirim (Out):</span>
                                  <span className="font-bold text-rose-700">{item.palletKeluar > 0 ? `-${item.palletKeluar}` : '-'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-amber-500 block font-semibold">Retur:</span>
                                  <span className="font-bold text-amber-700 truncate block w-full text-xs" title={returStr}>{returStr}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {filteredHistory.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-4 border-t border-slate-100 flex-shrink-0">
                      <span className="text-xs text-slate-400 font-semibold">
                        Menampilkan {Math.min((historyPage - 1) * HISTORY_ROWS_PER_PAGE + 1, filteredHistory.length)}–{Math.min(historyPage * HISTORY_ROWS_PER_PAGE, filteredHistory.length)} dari {filteredHistory.length} baris
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setHistoryPage(1)}
                          disabled={historyPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          ‹
                        </button>

                        {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === historyTotalPages || (p >= historyPage - 1 && p <= historyPage + 1))
                          .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === '...' ? (
                              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setHistoryPage(p)}
                                className={`min-w-[30px] px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  historyPage === p
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )
                        }

                        <button
                          onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                          disabled={historyPage === historyTotalPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setHistoryPage(historyTotalPages)}
                          disabled={historyPage === historyTotalPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Input SJ Keluar Modal */}
      {isSjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">
                Input SJ Keluar (Surat Jalan)
              </h3>
              <button 
                type="button"
                onClick={() => setIsSjModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSjSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Tanggal */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal Kirim</label>
                  <input
                    type="date"
                    required
                    value={sjFormData.tanggal}
                    onChange={(e) => setSjFormData({ ...sjFormData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                </div>

                {/* Jenis Pallet */}
                <div className="relative">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jenis Pallet</label>
                  <input
                    ref={sjPalletSearchInputRef}
                    type="text"
                    required
                    placeholder="🔍 Ketik untuk cari Jenis Pallet..."
                    value={sjPalletTypeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSjPalletTypeSearch(val);
                      if (sjPalletSearchInputRef.current) {
                        const rect = sjPalletSearchInputRef.current.getBoundingClientRect();
                        setSjDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }
                      setShowSjPalletDropdown(true);
                    }}
                    onFocus={() => {
                      if (sjPalletSearchInputRef.current) {
                        sjPalletSearchInputRef.current.select();
                        const rect = sjPalletSearchInputRef.current.getBoundingClientRect();
                        setSjDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }
                      setShowSjPalletDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSjPalletDropdown(false), 200)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                    autoComplete="off"
                  />

                  {showSjPalletDropdown && (
                    <div
                      style={{ position: 'fixed', top: sjDropdownPos.top, left: sjDropdownPos.left, width: sjDropdownPos.width, zIndex: 99999 }}
                      className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                    >
                      {(() => {
                        const filtered = palletTypes.filter(pt => {
                          if (!sjPalletTypeSearch) return true;
                          return pt.nama.toLowerCase().includes(sjPalletTypeSearch.toLowerCase()) ||
                                 pt.ukuran.toLowerCase().includes(sjPalletTypeSearch.toLowerCase());
                        });
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-slate-400 text-xs text-center font-medium">
                              Jenis pallet tidak ditemukan
                            </div>
                          );
                        }
                        return filtered.map(pt => (
                          <button
                            key={pt.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSjFormData(prev => ({
                                ...prev,
                                palletType: pt.nama,
                                poId: '',
                                ukuran: pt.ukuran
                              }));
                              setSjPalletTypeSearch(pt.nama);
                              setReffInput('');
                              setShowSjPalletDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 text-slate-700 hover:text-slate-900 font-semibold transition-all border-b border-slate-100 last:border-none cursor-pointer flex justify-between items-center"
                          >
                            <span>{pt.nama}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-bold">{pt.ukuran}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Ukuran Pallet (Otomatis) */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ukuran Pallet (Otomatis)</label>
                  <input
                    type="text"
                    readOnly
                    value={sjFormData.ukuran || ''}
                    placeholder="Ukuran terisi otomatis..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold"
                  />
                </div>

                {/* Autocomplete Input No. Reff dari PO */}
                <div className="relative">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">No. Reff (Ketik/Pilih Rekomendasi)</label>
                  <input
                    type="text"
                    required
                    disabled={!sjFormData.palletType}
                    value={reffInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReffInput(val);
                      // Try to auto-resolve matching PO if typed exactly (using base reference)
                      const matched = outstandingPOs.find(po => {
                        const rawReff = po.noReff || '';
                        const slashIndex = rawReff.indexOf('/');
                        const baseReff = slashIndex !== -1 ? rawReff.substring(0, slashIndex + 1) : rawReff;
                        return po.batchId === sjFormData.palletType && 
                               po.sisaPo > 0 && 
                               baseReff.toLowerCase().trim() === val.toLowerCase().trim();
                      });
                      setSjFormData(prev => ({
                        ...prev,
                        poId: matched ? matched.id : ''
                      }));
                      setShowReffSuggestions(true);
                    }}
                    onFocus={() => {
                      setShowReffSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowReffSuggestions(false), 200);
                    }}
                    placeholder={sjFormData.palletType ? "Ketik nomor Reff atau pilih dari rekomendasi..." : "Pilih Jenis Pallet terlebih dahulu..."}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-855 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    autoComplete="off"
                  />
                  {showReffSuggestions && sjFormData.palletType && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[999]">
                      {(() => {
                        const filtered = outstandingPOs.filter(po => {
                          const rawReff = po.noReff || '';
                          const slashIndex = rawReff.indexOf('/');
                          const baseReff = slashIndex !== -1 ? rawReff.substring(0, slashIndex + 1) : rawReff;
                          return po.batchId === sjFormData.palletType && 
                                 po.sisaPo > 0 &&
                                 baseReff.toLowerCase().includes(reffInput.toLowerCase());
                        });
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-slate-400 text-xs text-center font-medium">
                              Tidak ada PO/Reff aktif untuk jenis pallet ini
                            </div>
                          );
                        }
                        return filtered.map(po => {
                          const rawReff = po.noReff || '';
                          const slashIndex = rawReff.indexOf('/');
                          const baseReff = slashIndex !== -1 ? rawReff.substring(0, slashIndex + 1) : rawReff;
                          return (
                            <button
                              key={po.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setReffInput(baseReff);
                                setSjFormData(prev => ({ ...prev, poId: po.id }));
                                setShowReffSuggestions(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 text-slate-700 hover:text-slate-900 font-semibold transition-all border-b border-slate-100 last:border-none cursor-pointer flex justify-between items-center"
                            >
                              <span>{baseReff || '(Tanpa Reff)'}</span>
                              <span className="text-xs text-slate-400 font-medium">PO: {po.nomorPo} - {po.customer}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                  {!sjFormData.palletType && (
                    <span className="text-[10px] text-amber-600 font-medium block mt-1">
                      *Pilih Jenis Pallet terlebih dahulu untuk memuat daftar rekomendasi No. Reff
                    </span>
                  )}
                </div>

                {/* Tampilkan PO & Customer Otomatis */}
                {sjFormData.poId && (() => {
                  const selectedPo = outstandingPOs.find(p => p.id === sjFormData.poId);
                  if (selectedPo) {
                    return (
                      <div className="animate-fadeIn bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nomor PO & Customer Terkait (Otomatis)</label>
                        <div className="text-sm font-bold text-slate-800">
                          {selectedPo.nomorPo} ({selectedPo.customer})
                        </div>
                        <span className="text-[11px] text-indigo-650 font-bold block">
                          Sisa PO: {selectedPo.sisaPo} pcs
                        </span>
                      </div>
                    );
                  }
                })()}

                {/* No Reff Suffix (Huruf Urutan) */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Huruf Urutan No. Reff (Suffix)</label>
                  <input
                    type="text"
                    value={sjFormData.reffSuffix}
                    onChange={(e) => setSjFormData({ ...sjFormData, reffSuffix: e.target.value })}
                    placeholder="Contoh: a, b, c, atau d..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                </div>

                {/* Qty Keluar */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jumlah Pallet Keluar</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sjFormData.qtyKeluar || ''}
                    onChange={(e) => setSjFormData({ ...sjFormData, qtyKeluar: parseInt(e.target.value) || 0 })}
                    placeholder="Masukkan jumlah pallet..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                  {sjFormData.poId && (() => {
                    const selectedPo = outstandingPOs.find(p => p.id === sjFormData.poId);
                    if (selectedPo) {
                      return (
                        <span className="text-[10px] text-indigo-600 font-semibold block mt-1">
                          *Batas maksimal kirim untuk PO ini adalah {selectedPo.sisaPo} pcs
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSjModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-sm font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer text-sm"
                >
                  Kirim & Simpan SJ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
