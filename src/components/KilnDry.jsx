import React, { useState, useEffect } from 'react';
import useStickyState from '../utils/useStickyState';
import { storageAPI } from '../utils/storage';
import { Plus, Check, Play, Zap, Trash2, Edit3, X, RefreshCw, Download } from 'lucide-react';

const parseCustomerItems = (customer, defaultUkuran = '1000x1200 mm', defaultQty = 0) => {
  try {
    const parsed = JSON.parse(customer);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [{ palletName: customer || '', ukuran: defaultUkuran, qty: defaultQty }];
};

export default function KilnDry({ user }) {
  const [activeTab, setActiveTab] = useState('belum'); // belum, setelah, listrik
  const [belumKD, setBelumKD] = useState([]);
  const [setelahKD, setSetelahKD] = useState([]);
  const [listrikKD, setListrikKD] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);

  // States for multiple pallet items inside oven/chamber
  const [belumKDItems, setBelumKDItems] = useStickyState([{ palletName: '', ukuran: '1000x1200 mm', qty: 0 }], 'kd_belumItems');
  const [setelahKDItems, setSetelahKDItems] = useStickyState([{ palletName: '', ukuran: '1000x1200 mm', qty: 0 }], 'kd_setelahItems');



  // Modals state
  const [isBelumModalOpen, setIsBelumModalOpen] = useStickyState(false, 'kd_isBelumModalOpen');
  const [isSetelahModalOpen, setIsSetelahModalOpen] = useStickyState(false, 'kd_isSetelahModalOpen');
  const [isListrikModalOpen, setIsListrikModalOpen] = useStickyState(false, 'kd_isListrikModalOpen');

  // Edit Item Trackers
  const [editingItem, setEditingItem] = useState(null);
  const [completingQueueItem, setCompletingQueueItem] = useState(null);

  // States for searchable input dropdowns
  const [activeBelumRowIndex, setActiveBelumRowIndex] = useState(null);
  const [activeSetelahRowIndex, setActiveSetelahRowIndex] = useState(null);
  const [showListrikDrop, setShowListrikDrop] = useState(false);

  // Forms State
  const [formBelum, setFormBelum] = useStickyState({
    tanggal: new Date().toISOString().split('T')[0],
    customer: '',
    ukuran: '1000x1200 mm',
    qty: 0,
    status: 'Chamber 1',
    monitoringLogs: []
  }, 'kd_formBelum');

  const [formSetelah, setFormSetelah] = useStickyState({
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    customer: '',
    ukuran: '1000x1200 mm',
    qty: 0,
    kd: 'KD 01',
    catatan: ''
  }, 'kd_formSetelah');

  const [formListrik, setFormListrik] = useStickyState({
    namaPt: '',
    kd: 'KD 01',
    qty: 0,
    hari: { Senin: false, Selasa: false, Rabu: false, Kamis: false, Jumat: false, Sabtu: false, Minggu: false },
    jumlah: 0, // Jumlah hari aktif
    tanggalMulai: new Date().toISOString().split('T')[0],
    jamMulai: '08:00',
    tanggalSelesai: new Date().toISOString().split('T')[0],
    jamSelesai: '17:00'
  }, 'kd_formListrik');

  useEffect(() => {
    const loadKDData = async () => {
      const belum = await storageAPI.getKDBelum();
      const setelah = await storageAPI.getKDSetelah();
      const listrik = await storageAPI.getKDListrik();
      const types = await storageAPI.getPalletTypes();
      setBelumKD(belum);
      setSetelahKD(setelah);
      setListrikKD(listrik);
      setPalletTypes(types);

      if (types.length > 0) {
        setFormBelum(prev => prev.ukuran ? prev : { ...prev, ukuran: types[0].ukuran });
        setFormSetelah(prev => prev.ukuran ? prev : { ...prev, ukuran: types[0].ukuran });
        setBelumKDItems(prev => prev[0]?.palletName ? prev : [{ palletName: types[0].nama, ukuran: types[0].ukuran, qty: 0 }]);
        setSetelahKDItems(prev => prev[0]?.palletName ? prev : [{ palletName: types[0].nama, ukuran: types[0].ukuran, qty: 0 }]);
      }
    };
    loadKDData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const uniqueSizes = [
    '1000x1200 mm',
    '800x1200 mm',
    '1100x1100 mm',
    ...new Set([
      ...belumKD.map(i => i.ukuran),
      ...setelahKD.map(i => i.ukuran)
    ].filter(Boolean))
  ];

  // --- Handlers for Belum KD ---
  const handleBelumSubmit = async (e) => {
    e.preventDefault();

    if (belumKDItems.length === 0 || belumKDItems.some(i => !i.palletName)) {
      alert('Pilih Jenis Pallet terlebih dahulu!');
      return;
    }

    const totalQty = belumKDItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
    const customerJson = JSON.stringify(belumKDItems.map(item => ({
      palletName: item.palletName,
      ukuran: item.ukuran,
      qty: Number(item.qty) || 0
    })));
    const combinedUkuran = Array.from(new Set(belumKDItems.map(item => item.ukuran))).join(', ');

    const finalForm = {
      ...formBelum,
      customer: customerJson,
      ukuran: combinedUkuran,
      qty: totalQty
    };

    let updated;
    if (editingItem) {
      updated = belumKD.map(item => item.id === editingItem.id ? { ...finalForm, id: item.id } : item);
    } else {
      updated = [{ ...finalForm, id: 'kdb_' + Date.now() }, ...belumKD];
    }
    setBelumKD(updated);
    await storageAPI.saveKDBelum(updated);
    closeBelumModal();
  };

  const handleStartKD = async (item) => {
    const updated = belumKD.map(i => i.id === item.id ? { ...i, status: 'Proses' } : i);
    setBelumKD(updated);
    await storageAPI.saveKDBelum(updated);
  };

  const handleFinishKD = async (item) => {
    let totalMinutes = 0;
    if (item.monitoringLogs && item.monitoringLogs.length > 0) {
      item.monitoringLogs.forEach(log => {
        if (log.jamMulai && log.jamSelesai) {
          const startParts = log.jamMulai.split(':');
          const endParts = log.jamSelesai.split(':');
          const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
          let diff = endMin - startMin;
          if (diff < 0) diff += 24 * 60;
          totalMinutes += diff;
        }
      });
    }
    const totalHours = (totalMinutes / 60).toFixed(1);
    const sessionDetail = item.monitoringLogs && item.monitoringLogs.length > 0
      ? `Total ${totalHours} Jam (${item.monitoringLogs.map(l => `${l.jamMulai}-${l.jamSelesai}`).join(', ')})`
      : 'Diselesaikan dari antrean.';

    setCompletingQueueItem(item);
    setFormSetelah({
      tanggalMulai: item.tanggal,
      tanggalSelesai: new Date().toISOString().split('T')[0],
      customer: item.customer,
      ukuran: item.ukuran,
      qty: item.qty,
      kd: 'KD 01',
      catatan: sessionDetail
    });

    const items = parseCustomerItems(item.customer, item.ukuran, item.qty);
    setSetelahKDItems(items);
    setIsSetelahModalOpen(true);
  };

  const handleBelumDelete = async (id) => {
    if (window.confirm('Hapus antrean KD ini?')) {
      const updated = belumKD.filter(i => i.id !== id);
      setBelumKD(updated);
      await storageAPI.deleteKDBelum(id);
    }
  };

  const closeBelumModal = () => {
    setIsBelumModalOpen(false);
    setEditingItem(null);
    setFormBelum({
      tanggal: new Date().toISOString().split('T')[0],
      customer: '',
      ukuran: palletTypes.length > 0 ? palletTypes[0].ukuran : '1000x1200 mm',
      qty: 0,
      status: 'Chamber 1',
      monitoringLogs: []
    });
    setBelumKDItems(palletTypes.length > 0 ? [{ palletName: palletTypes[0].nama, ukuran: palletTypes[0].ukuran, qty: 0 }] : [{ palletName: '', ukuran: '1000x1200 mm', qty: 0 }]);
  };

  const handleBelumEdit = (item) => {
    setEditingItem(item);
    setFormBelum({ 
      ...item,
      monitoringLogs: item.monitoringLogs || []
    });
    setBelumKDItems(parseCustomerItems(item.customer, item.ukuran, item.qty));
    setIsBelumModalOpen(true);
  };

  // --- Handlers for Setelah KD ---
  const handleSetelahSubmit = async (e) => {
    e.preventDefault();

    if (setelahKDItems.length === 0 || setelahKDItems.some(i => !i.palletName)) {
      alert('Pilih Jenis Pallet terlebih dahulu!');
      return;
    }

    const totalQty = setelahKDItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
    const customerJson = JSON.stringify(setelahKDItems.map(item => ({
      palletName: item.palletName,
      ukuran: item.ukuran,
      qty: Number(item.qty) || 0
    })));
    const combinedUkuran = Array.from(new Set(setelahKDItems.map(item => item.ukuran))).join(', ');

    const finalForm = {
      ...formSetelah,
      customer: customerJson,
      ukuran: combinedUkuran,
      qty: totalQty
    };

    let updated;
    if (editingItem) {
      updated = setelahKD.map(item => item.id === editingItem.id ? { ...finalForm, id: item.id } : item);
    } else {
      updated = [{ ...finalForm, id: 'kds_' + Date.now() }, ...setelahKD];
    }
    setSetelahKD(updated);
    await storageAPI.saveKDSetelah(updated);

    if (completingQueueItem) {
      const updatedBelum = belumKD.filter(i => i.id !== completingQueueItem.id);
      setBelumKD(updatedBelum);
      await storageAPI.deleteKDBelum(completingQueueItem.id);
      setCompletingQueueItem(null);
    }

    closeSetelahModal();
  };

  const handleSetelahDelete = async (id) => {
    if (window.confirm('Hapus riwayat KD ini?')) {
      const updated = setelahKD.filter(i => i.id !== id);
      setSetelahKD(updated);
      await storageAPI.deleteKDSetelah(id);
    }
  };

  const handleSetelahEdit = (item) => {
    setEditingItem(item);
    setFormSetelah({ ...item });
    setSetelahKDItems(parseCustomerItems(item.customer, item.ukuran, item.qty));
    setIsSetelahModalOpen(true);
  };

  const closeSetelahModal = () => {
    setIsSetelahModalOpen(false);
    setEditingItem(null);
    setCompletingQueueItem(null);
    setFormSetelah({
      tanggalMulai: new Date().toISOString().split('T')[0],
      tanggalSelesai: new Date().toISOString().split('T')[0],
      customer: '',
      ukuran: palletTypes[0]?.ukuran || '1000x1200 mm',
      qty: 0,
      kd: 'KD 01',
      catatan: ''
    });
    setSetelahKDItems(palletTypes.length > 0 ? [{ palletName: palletTypes[0].nama, ukuran: palletTypes[0].ukuran, qty: 0 }] : [{ palletName: '', ukuran: '1000x1200 mm', qty: 0 }]);
  };

  // --- Handlers for Listrik KD ---
  const handleListrikSubmit = async (e) => {
    e.preventDefault();

    const activeDays = Object.values(formListrik.hari).filter(v => v).length;
    const itemData = {
      ...formListrik,
      jumlah: activeDays
    };

    let updated;
    if (editingItem) {
      updated = listrikKD.map(item => item.id === editingItem.id ? { ...itemData, id: item.id } : item);
    } else {
      updated = [{ ...itemData, id: 'kdl_' + Date.now() }, ...listrikKD];
    }
    setListrikKD(updated);
    await storageAPI.saveKDListrik(updated);
    closeListrikModal();
  };

  const handleListrikDelete = async (id) => {
    if (window.confirm('Hapus log pemakaian listrik ini?')) {
      const updated = listrikKD.filter(i => i.id !== id);
      setListrikKD(updated);
      await storageAPI.deleteKDListrik(id);
    }
  };

  const handleHariChange = (day) => {
    setFormListrik(prev => {
      const updatedHari = { ...prev.hari, [day]: !prev.hari[day] };
      return { ...prev, hari: updatedHari };
    });
  };

  const closeListrikModal = () => {
    setIsListrikModalOpen(false);
    setEditingItem(null);
    setFormListrik({
      namaPt: palletTypes.length > 0 ? palletTypes[0].nama : '',
      kd: 'KD 01',
      qty: 0,
      hari: { Senin: false, Selasa: false, Rabu: false, Kamis: false, Jumat: false, Sabtu: false, Minggu: false },
      jumlah: 0,
      tanggalMulai: new Date().toISOString().split('T')[0],
      jamMulai: '08:00',
      tanggalSelesai: new Date().toISOString().split('T')[0],
      jamSelesai: '17:00'
    });
  };





  const downloadListrikGambar = () => {
    const today = new Date();
    const hariNames  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const hariName   = hariNames[today.getDay()];
    const tanggalStr = `${today.getDate()} ${bulanNames[today.getMonth()]} ${today.getFullYear()}`;

    const W = 1122; // A4 landscape
    const ROW_H = 35;
    const requiredHeight = 200 + (listrikKD.length * ROW_H) + 60; 
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
    grad.addColorStop(0, '#D97706');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    const PAD = 40;
    let y = 50;

    // Header
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('CV MITRA DUNIA PALLETINDO', PAD, y);
    
    y += 25;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#D97706';
    ctx.fillText(`AKTIVITAS PEMAKAIAN LISTRIK KD CABANG SIDOARJO`, PAD, y);

    y += 20;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText(`Dicetak pada: ${hariName}, ${tanggalStr}`, PAD, y);

    y += 40;

    // Table Headers
    const cols = [
      { w: 40, label: 'No', align: 'center' },
      { w: 200, label: 'Nama PT / Customer', align: 'left' },
      { w: 70, label: 'KD', align: 'center' },
      { w: 60, label: 'QTY', align: 'center' },
      { w: 210, label: 'Sen Sel Rab Kam Jum Sab Min', align: 'center' },
      { w: 90, label: 'Jml Hari', align: 'center' },
      { w: 150, label: 'Mulai (Tgl & Jam)', align: 'center' },
      { w: 150, label: 'Selesai (Tgl & Jam)', align: 'center' }
    ];

    // Draw header background
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(PAD, y - 20, W - PAD * 2, 35);
    ctx.strokeStyle = '#FDE68A';
    ctx.strokeRect(PAD, y - 20, W - PAD * 2, 35);

    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#92400E';
    
    let currentX = PAD + 10;
    cols.forEach(col => {
      let textX = currentX;
      if (col.align === 'center') {
        textX = currentX + col.w / 2 - ctx.measureText(col.label).width / 2;
      }
      ctx.fillText(col.label, textX, y + 2);
      currentX += col.w;
    });

    y += 20;

    // Table Rows
    if (listrikKD.length === 0) {
      y += 30;
      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Belum ada catatan aktivitas pemakaian listrik KD.', W / 2 - ctx.measureText('Belum ada catatan aktivitas pemakaian listrik KD.').width / 2, y);
    } else {
      listrikKD.forEach((item, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#FEF3C7';
        ctx.fillRect(PAD, y - 10, W - PAD * 2, ROW_H);
        
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
        let cx = PAD + 10;
        
        // Helper
        const drawCell = (text, w, color = '#334155', weight = 'normal', align = 'center') => {
          ctx.fillStyle = color;
          ctx.font = `${weight} 13px "Segoe UI", Arial, sans-serif`;
          let tx = cx;
          if (align === 'center') tx = cx + w / 2 - ctx.measureText(text).width / 2;
          ctx.fillText(text, tx, y + 12);
          cx += w;
        };

        const tglMulai = new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        const tglSelesai = new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        
        drawCell((idx + 1).toString(), cols[0].w, '#64748B', 'bold');
        drawCell(item.namaPt, cols[1].w, '#1E293B', 'bold', 'left');
        drawCell(item.kd, cols[2].w, '#0891B2', 'bold');
        drawCell(item.qty.toString(), cols[3].w, '#1E293B', 'bold');
        
        // Draw Hari
        let hariX = cx;
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        days.forEach(d => {
           const isDayActive = item.hari[d] || item.hari[d === 'Jumat' ? "Jum'at" : d];
           ctx.fillStyle = isDayActive ? '#D97706' : '#E2E8F0';
           ctx.font = 'bold 10px Arial';
           ctx.fillText(isDayActive ? '⚡' : '•', hariX + 10, y + 12);
           hariX += 30;
        });
        cx += cols[4].w;

        drawCell(`${item.jumlah} Hari`, cols[5].w, '#B45309', 'bold');
        drawCell(`${tglMulai} ${item.jamMulai}`, cols[6].w, '#475569');
        drawCell(`${tglSelesai} ${item.jamSelesai}`, cols[7].w, '#475569');
        
        // Row Border
        ctx.strokeStyle = '#FEF3C7';
        ctx.beginPath(); ctx.moveTo(PAD, y + 25); ctx.lineTo(W - PAD, y + 25); ctx.stroke();

        y += ROW_H;
      });
    }

    ctx.strokeStyle = '#FDE68A';
    ctx.strokeRect(PAD, 145, W - PAD * 2, y - 145);

    // Download
    const todayStr2 = today.toISOString().split('T')[0];
    const link2 = document.createElement('a');
    link2.download = `Laporan_Pemakaian_Listrik_KD_${todayStr2}.png`;
    link2.href     = canvas.toDataURL('image/png');
    link2.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Google Sheets Sync */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Aktivitas Kiln Dry (KD)</h2>
          <p className="text-slate-500 mt-1 font-medium">Pantau proses, riwayat oven pengeringan, dan log pemakaian listrik</p>
        </div>


      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap border-b border-slate-200 gap-y-1">
        <button
          onClick={() => setActiveTab('belum')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'belum' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ⚙️ Dalam Proses KD
        </button>
        <button
          onClick={() => setActiveTab('setelah')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'setelah' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ✓ Setelah KD (Riwayat Selesai)
        </button>
        <button
          onClick={() => setActiveTab('listrik')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-150 cursor-pointer ${
            activeTab === 'listrik' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ⚡ Pemakaian Listrik KD (Sidoarjo)
        </button>
      </div>

      {/* --- TAB 1: BELUM KD --- */}
      {activeTab === 'belum' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Pallet Dalam Proses KD</h3>
            {isAdmin && (
              <button
                onClick={() => setIsBelumModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Proses KD
              </button>
            )}
          </div>

          {['Chamber 1', 'Chamber 2', 'Container'].map(lokasi => {
            const groupItems = belumKD.filter(item => item.status === lokasi);
            if (groupItems.length === 0) return null;

            const totalQty = groupItems.reduce((acc, curr) => acc + curr.qty, 0);

            return (
              <div key={lokasi} className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150 mb-6">
                <div className="bg-slate-50 border-b border-slate-150 px-5 py-3 flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-700 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      lokasi === 'Chamber 1' ? 'bg-amber-500' :
                      lokasi === 'Chamber 2' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></span>
                    {lokasi}
                  </h4>
                  <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-600">
                    Total: {totalQty} pcs
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4">Tgl Masuk</th>
                        <th className="py-3 px-4">Nama PT / Customer</th>
                        <th className="py-3 px-4">Ukuran Pallet</th>
                        <th className="py-3 px-4 text-center">QTY</th>
                        <th className="py-3 px-4 text-center">Total Jam Operasi</th>
                        {isAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {groupItems.map(item => {
                        let totalMinutes = 0;
                        if (item.monitoringLogs && item.monitoringLogs.length > 0) {
                          item.monitoringLogs.forEach(log => {
                            if (log.jamMulai && log.jamSelesai) {
                              const startParts = log.jamMulai.split(':');
                              const endParts = log.jamSelesai.split(':');
                              const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                              const endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                              let diff = endMin - startMin;
                              if (diff < 0) diff += 24 * 60; // handle cross-midnight
                              totalMinutes += diff;
                            }
                          });
                        }
                        const totalHours = (totalMinutes / 60).toFixed(1);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-all text-slate-600 font-medium whitespace-nowrap">
                            <td className="py-3.5 px-4 text-slate-500 text-xs">
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4 text-slate-800">
                              <div className="space-y-1">
                                {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                                  <div key={idx} className="font-bold text-slate-800">
                                    {subItem.palletName || 'Tanpa Nama'}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1">
                                {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                                  <div key={idx}>
                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs border border-slate-200 text-slate-600 font-bold">
                                      {subItem.ukuran}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                              <div className="flex flex-col gap-1">
                                {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                                  <div key={idx} className="text-xs text-slate-600">
                                    {subItem.qty} pcs
                                  </div>
                                ))}
                                <div className="text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-0.5 mt-0.5">
                                  Total: {item.qty} pcs
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.monitoringLogs && item.monitoringLogs.length > 0 ? (
                                <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold">
                                  ⏱️ {totalHours} Jam
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Belum ada log</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="py-3.5 px-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleFinishKD(item)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Selesai KD
                                  </button>
                                  <button
                                    onClick={() => handleBelumEdit(item)}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleBelumDelete(item.id)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          
          {belumKD.length === 0 && (
            <div className="glass-card bg-white rounded-2xl border border-slate-150 p-10 text-center">
              <p className="text-slate-400 font-medium">Tidak ada pallet dalam proses KD saat ini.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: SETELAH KD --- */}
      {activeTab === 'setelah' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Riwayat Pallet Selesai Oven</h3>
            {isAdmin && (
              <button
                onClick={() => setIsSetelahModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Input Riwayat Manual
              </button>
            )}
          </div>

          <div className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <th className="py-4 px-4">Tgl Mulai - Selesai</th>
                    <th className="py-4 px-4">Customer</th>
                    <th className="py-4 px-4">Ukuran</th>
                    <th className="py-4 px-4 text-center">KD Unit</th>
                    <th className="py-4 px-4 text-center">QTY</th>
                    <th className="py-4 px-4">Catatan</th>
                    {isAdmin && <th className="py-4 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {setelahKD.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-slate-400 font-medium">Belum ada riwayat proses kiln dry.</td>
                    </tr>
                  ) : (
                    setelahKD.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-all text-slate-600 font-medium whitespace-nowrap">
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 text-slate-800">
                           <div className="space-y-1">
                             {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                               <div key={idx} className="font-bold text-slate-800">
                                 {subItem.palletName || 'Tanpa Nama'}
                               </div>
                             ))}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="flex flex-col gap-1">
                             {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                               <div key={idx}>
                                 <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs border border-slate-200 text-slate-600 font-bold">
                                   {subItem.ukuran}
                                 </span>
                               </div>
                             ))}
                           </div>
                         </td>
                        <td className="py-4 px-4 text-center text-cyan-600 font-bold">{item.kd}</td>
                        <td className="py-4 px-4 text-center font-extrabold text-slate-800">
                           <div className="flex flex-col gap-1">
                             {parseCustomerItems(item.customer, item.ukuran, item.qty).map((subItem, idx) => (
                               <div key={idx} className="text-xs text-slate-600">
                                 {subItem.qty} pcs
                               </div>
                             ))}
                             <div className="text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-0.5 mt-0.5">
                               Total: {item.qty} pcs
                             </div>
                           </div>
                         </td>
                        <td className="py-4 px-4 text-slate-500 text-xs max-w-xs truncate">{item.catatan || '-'}</td>
                        {isAdmin && (
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleSetelahEdit(item)}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSetelahDelete(item.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* --- TAB 3: LISTRIK KD (Excel structure) --- */}
      {activeTab === 'listrik' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider">CV MITRA DUNIA PALLETINDO</h3>
              </div>
              <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-0.5">AKTIVITAS PEMAKAIAN LISTRIK KD CABANG SIDOARJO</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={downloadListrikGambar}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold transition-all text-xs shadow-xs cursor-pointer border border-emerald-100"
              >
                <Download className="w-4 h-4" /> Download Laporan (PNG)
              </button>
              {isAdmin && (
                <button
                  onClick={() => setIsListrikModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold transition-all text-xs cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" /> Input Log Listrik
                </button>
              )}
            </div>
          </div>

          <div className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  {/* Row 1 Headers */}
                  <tr className="bg-slate-50 border-b border-slate-250 text-slate-500 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3 border-r border-slate-200" rowSpan={2}>No</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-left" rowSpan={2}>Nama PT / Customer</th>
                    <th className="py-3 px-3 border-r border-slate-200" rowSpan={2}>KD</th>
                    <th className="py-3 px-3 border-r border-slate-200" rowSpan={2}>QTY</th>
                    <th className="py-3 px-3 border-r border-slate-200" colSpan={7}>Hari Operasional Aktif</th>
                    <th className="py-3 px-3 border-r border-slate-200" rowSpan={2}>Jumlah Hari</th>
                    <th className="py-3 px-4 border-r border-slate-200" colSpan={2}>Mulai</th>
                    <th className="py-3 px-4 border-r border-slate-200" colSpan={2}>Selesai</th>
                    {isAdmin && <th className="py-3 px-3" rowSpan={2}>Aksi</th>}
                  </tr>
                  {/* Row 2 Headers */}
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {/* Days column */}
                    <th className="py-2 px-1.5 border-r border-slate-150">Sen</th>
                    <th className="py-2 px-1.5 border-r border-slate-150">Sel</th>
                    <th className="py-2 px-1.5 border-r border-slate-150">Rab</th>
                    <th className="py-2 px-1.5 border-r border-slate-150">Kam</th>
                    <th className="py-2 px-1.5 border-r border-slate-150">Jum</th>
                    <th className="py-2 px-1.5 border-r border-slate-150">Sab</th>
                    <th className="py-2 px-1.5 border-r border-slate-200">Min</th>
                    
                    {/* Mulai Details */}
                    <th className="py-2 px-2 border-r border-slate-150 text-slate-500">Tanggal</th>
                    <th className="py-2 px-2 border-r border-slate-200">Jam</th>
                    
                    {/* Selesai Details */}
                    <th className="py-2 px-2 border-r border-slate-150 text-slate-500">Tanggal</th>
                    <th className="py-2 px-2 border-r border-slate-200">Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {listrikKD.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 17 : 16} className="py-12 text-center text-slate-400 text-sm font-medium">Belum ada catatan aktivitas pemakaian listrik KD.</td>
                    </tr>
                  ) : (
                    listrikKD.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-all text-slate-600 whitespace-nowrap">
                        {/* No */}
                        <td className="py-3.5 px-3 border-r border-slate-150 text-slate-400 font-bold">{idx + 1}</td>
                        {/* Nama PT */}
                        <td className="py-3.5 px-4 border-r border-slate-150 text-left font-bold text-slate-800">{item.namaPt}</td>
                        {/* KD Unit */}
                        <td className="py-3.5 px-3 border-r border-slate-150 font-bold text-cyan-600">{item.kd}</td>
                        {/* Qty */}
                        <td className="py-3.5 px-3 border-r border-slate-150 font-bold text-slate-800">{item.qty}</td>
                        
                        {/* Days status indicator (Senin - Minggu) */}
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d) => {
                          const isDayActive = item.hari[d] || item.hari[d === 'Jumat' ? "Jum'at" : d];
                          return (
                            <td key={d} className="py-3.5 px-1.5 border-r border-slate-100">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                                isDayActive 
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-xs' 
                                  : 'bg-transparent text-slate-200 border border-slate-100'
                              }`}>
                                {isDayActive ? '⚡' : '•'}
                              </span>
                            </td>
                          );
                        })}
                        
                        {/* Jumlah Hari */}
                        <td className="py-3.5 px-3 border-r border-slate-150 font-extrabold text-amber-700 bg-amber-50/50">{item.jumlah} Hari</td>
                        
                        {/* Start Date & Time */}
                        <td className="py-3.5 px-2 border-r border-slate-100 text-[10px] text-slate-500">
                          {new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-2 border-r border-slate-150 text-[11px] font-bold text-slate-700">{item.jamMulai}</td>
                        
                        {/* End Date & Time */}
                        <td className="py-3.5 px-2 border-r border-slate-100 text-[10px] text-slate-500">
                          {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-2 border-r border-slate-150 text-[11px] font-bold text-slate-700">{item.jamSelesai}</td>
                        
                        {/* Actions */}
                        {isAdmin && (
                          <td className="py-3.5 px-2">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => { setEditingItem(item); setFormListrik({ ...item }); setIsListrikModalOpen(true); }}
                                className="p-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleListrikDelete(item.id)}
                                className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* --- MODALS CODE --- */}
      
      {/* 1. Modal Belum KD */}
      {isBelumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-extrabold text-slate-800">{editingItem ? 'Edit Proses KD' : 'Tambah Proses KD'}</h3>
              <button onClick={closeBelumModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBelumSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal Antre</label>
                <input
                  type="date"
                  value={formBelum.tanggal}
                  onChange={(e) => setFormBelum({ ...formBelum, tanggal: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              {/* Dynamic Pallet Items List */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Daftar Pallet Oven</label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPT = palletTypes.length > 0 ? palletTypes[0] : { nama: '', ukuran: '1000x1200 mm' };
                      setBelumKDItems([...belumKDItems, { palletName: defaultPT.nama, ukuran: defaultPT.ukuran, qty: 0 }]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-650 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Jenis Pallet
                  </button>
                </div>

                <div className="space-y-3">
                  {belumKDItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 relative space-y-3">
                      {belumKDItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBelumKDItems(belumKDItems.filter((_, i) => i !== idx));
                          }}
                          className="absolute right-2 top-2 p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="relative">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Jenis Pallet</label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Ketik nama pallet..."
                          value={item.palletName}
                          onFocus={() => setActiveBelumRowIndex(idx)}
                          onBlur={() => setTimeout(() => setActiveBelumRowIndex(null), 150)}
                          onChange={(e) => {
                            const typedName = e.target.value;
                            const newItems = [...belumKDItems];
                            newItems[idx].palletName = typedName;
                            const match = palletTypes.find(pt => pt.nama.toLowerCase().trim() === typedName.toLowerCase().trim());
                            if (match) {
                              newItems[idx].ukuran = match.ukuran;
                            }
                            setBelumKDItems(newItems);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-500"
                        />
                        {activeBelumRowIndex === idx && (() => {
                          const filtered = palletTypes.filter(pt =>
                            pt.nama.toLowerCase().includes(item.palletName.toLowerCase())
                          );
                          return filtered.length > 0 ? (
                            <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {filtered.map((pt) => (
                                <li
                                  key={pt.id}
                                  onMouseDown={() => {
                                    const newItems = [...belumKDItems];
                                    newItems[idx].palletName = pt.nama;
                                    newItems[idx].ukuran = pt.ukuran;
                                    setBelumKDItems(newItems);
                                    setActiveBelumRowIndex(null);
                                  }}
                                  className="px-4 py-2 hover:bg-indigo-50 text-slate-700 text-xs font-semibold cursor-pointer border-b border-slate-50 last:border-b-0"
                                >
                                  {pt.nama} ({pt.ukuran})
                                </li>
                              ))}
                            </ul>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Ukuran (Auto)</label>
                          <input
                            type="text"
                            value={item.ukuran}
                            readOnly
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">QTY (Pcs)</label>
                          <input
                            type="number"
                            value={item.qty || ''}
                            onChange={(e) => {
                              const newItems = [...belumKDItems];
                              newItems[idx].qty = Number(e.target.value) || 0;
                              setBelumKDItems(newItems);
                            }}
                            placeholder="0"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Lokasi Proses KD</label>
                <select
                  value={formBelum.status}
                  onChange={(e) => setFormBelum({ ...formBelum, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                >
                  <option value="Chamber 1">Chamber 1</option>
                  <option value="Chamber 2">Chamber 2</option>
                  <option value="Container">Container</option>
                </select>
              </div>

              {/* Monitoring Logs Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Log Waktu KD (Jam-jaman)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newLog = { jamMulai: '08:00', jamSelesai: '12:00', id: Date.now() };
                      setFormBelum({ ...formBelum, monitoringLogs: [...(formBelum.monitoringLogs || []), newLog] });
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Sesi
                  </button>
                </div>
                
                {(!formBelum.monitoringLogs || formBelum.monitoringLogs.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Belum ada sesi waktu.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formBelum.monitoringLogs.map((log, idx) => (
                      <div key={log.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-400 font-bold ml-1 mb-0.5 block">Jam Mulai</label>
                          <input
                            type="time"
                            value={log.jamMulai}
                            onChange={(e) => {
                              const newLogs = [...formBelum.monitoringLogs];
                              newLogs[idx].jamMulai = e.target.value;
                              setFormBelum({ ...formBelum, monitoringLogs: newLogs });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <span className="text-slate-400 font-bold mt-4">-</span>
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-400 font-bold ml-1 mb-0.5 block">Jam Selesai</label>
                          <input
                            type="time"
                            value={log.jamSelesai}
                            onChange={(e) => {
                              const newLogs = [...formBelum.monitoringLogs];
                              newLogs[idx].jamSelesai = e.target.value;
                              setFormBelum({ ...formBelum, monitoringLogs: newLogs });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newLogs = formBelum.monitoringLogs.filter((_, i) => i !== idx);
                            setFormBelum({ ...formBelum, monitoringLogs: newLogs });
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 mt-4 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeBelumModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Setelah KD */}
      {isSetelahModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-extrabold text-slate-800">{editingItem ? 'Edit Riwayat KD' : 'Tambah Riwayat KD Manual'}</h3>
              <button onClick={closeSetelahModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSetelahSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tgl Mulai</label>
                  <input
                    type="date"
                    value={formSetelah.tanggalMulai}
                    onChange={(e) => setFormSetelah({ ...formSetelah, tanggalMulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tgl Selesai</label>
                  <input
                    type="date"
                    value={formSetelah.tanggalSelesai}
                    onChange={(e) => setFormSetelah({ ...formSetelah, tanggalSelesai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>
               {/* Dynamic Pallet Items List for Setelah KD */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Daftar Pallet Riwayat KD</label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPT = palletTypes.length > 0 ? palletTypes[0] : { nama: '', ukuran: '1000x1200 mm' };
                      setSetelahKDItems([...setelahKDItems, { palletName: defaultPT.nama, ukuran: defaultPT.ukuran, qty: 0 }]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-650 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Jenis Pallet
                  </button>
                </div>

                <div className="space-y-3">
                  {setelahKDItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 relative space-y-3">
                      {setelahKDItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSetelahKDItems(setelahKDItems.filter((_, i) => i !== idx));
                          }}
                          className="absolute right-2 top-2 p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="relative">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Jenis Pallet</label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Ketik nama pallet..."
                          value={item.palletName}
                          onFocus={() => setActiveSetelahRowIndex(idx)}
                          onBlur={() => setTimeout(() => setActiveSetelahRowIndex(null), 150)}
                          onChange={(e) => {
                            const typedName = e.target.value;
                            const newItems = [...setelahKDItems];
                            newItems[idx].palletName = typedName;
                            const match = palletTypes.find(pt => pt.nama.toLowerCase().trim() === typedName.toLowerCase().trim());
                            if (match) {
                              newItems[idx].ukuran = match.ukuran;
                            }
                            setSetelahKDItems(newItems);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-500"
                        />
                        {activeSetelahRowIndex === idx && (() => {
                          const filtered = palletTypes.filter(pt =>
                            pt.nama.toLowerCase().includes(item.palletName.toLowerCase())
                          );
                          return filtered.length > 0 ? (
                            <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {filtered.map((pt) => (
                                <li
                                  key={pt.id}
                                  onMouseDown={() => {
                                    const newItems = [...setelahKDItems];
                                    newItems[idx].palletName = pt.nama;
                                    newItems[idx].ukuran = pt.ukuran;
                                    setSetelahKDItems(newItems);
                                    setActiveSetelahRowIndex(null);
                                  }}
                                  className="px-4 py-2 hover:bg-indigo-50 text-slate-700 text-xs font-semibold cursor-pointer border-b border-slate-50 last:border-b-0"
                                >
                                  {pt.nama} ({pt.ukuran})
                                </li>
                              ))}
                            </ul>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Ukuran (Auto)</label>
                          <input
                            type="text"
                            value={item.ukuran}
                            readOnly
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">QTY (Pcs)</label>
                          <input
                            type="number"
                            value={item.qty || ''}
                            onChange={(e) => {
                              const newItems = [...setelahKDItems];
                              newItems[idx].qty = Number(e.target.value) || 0;
                              setSetelahKDItems(newItems);
                            }}
                            placeholder="0"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">KD Unit</label>
                <select
                  value={formSetelah.kd}
                  onChange={(e) => setFormSetelah({ ...formSetelah, kd: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-semibold cursor-pointer"
                >
                  <option value="KD 01">KD 01</option>
                  <option value="KD 02">KD 02</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Catatan</label>
                <textarea
                  value={formSetelah.catatan}
                  onChange={(e) => setFormSetelah({ ...formSetelah, catatan: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  rows="2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeSetelahModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Listrik KD */}
      {isListrikModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-extrabold text-slate-800">{editingItem ? 'Edit Log Listrik KD' : 'Tambah Log Listrik KD'}</h3>
              <button onClick={closeListrikModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
             <form onSubmit={handleListrikSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jenis Pallet</label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Ketik nama pallet..."
                    value={formListrik.namaPt}
                    onFocus={() => setShowListrikDrop(true)}
                    onBlur={() => setTimeout(() => setShowListrikDrop(false), 150)}
                    onChange={(e) => {
                      setFormListrik({ ...formListrik, namaPt: e.target.value });
                      setShowListrikDrop(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                  {showListrikDrop && (() => {
                    const filtered = palletTypes.filter(pt =>
                      pt.nama.toLowerCase().includes(formListrik.namaPt.toLowerCase())
                    );
                    return filtered.length > 0 ? (
                      <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {filtered.map((pt) => (
                          <li
                            key={pt.id}
                            onMouseDown={() => {
                              setFormListrik({ ...formListrik, namaPt: pt.nama });
                              setShowListrikDrop(false);
                            }}
                            className="px-4 py-2 hover:bg-indigo-50 text-slate-700 text-xs font-semibold cursor-pointer border-b border-slate-50 last:border-b-0"
                          >
                            {pt.nama} ({pt.ukuran})
                          </li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">KD Unit</label>
                  <select
                    value={formListrik.kd}
                    onChange={(e) => setFormListrik({ ...formListrik, kd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold cursor-pointer"
                  >
                    <option value="KD 01">KD 01</option>
                    <option value="KD 02">KD 02</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">QTY</label>
                  <input
                    type="number"
                    value={formListrik.qty}
                    onChange={(e) => setFormListrik({ ...formListrik, qty: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Weekly Day Checkboxes */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2.5">Aktivitas Hari Operasional (Centang Hari Aktif)</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => handleHariChange(d)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formListrik.hari[d]
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      {d.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Times */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Durasi Detail Operasional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tgl Mulai</label>
                      <input
                        type="date"
                        value={formListrik.tanggalMulai}
                        onChange={(e) => setFormListrik({ ...formListrik, tanggalMulai: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Jam Mulai</label>
                      <input
                        type="time"
                        value={formListrik.jamMulai}
                        onChange={(e) => setFormListrik({ ...formListrik, jamMulai: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tgl Selesai</label>
                      <input
                        type="date"
                        value={formListrik.tanggalSelesai}
                        onChange={(e) => setFormListrik({ ...formListrik, tanggalSelesai: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Jam Selesai</label>
                      <input
                        type="time"
                        value={formListrik.jamSelesai}
                        onChange={(e) => setFormListrik({ ...formListrik, jamSelesai: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={closeListrikModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
