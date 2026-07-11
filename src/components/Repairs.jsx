import React, { useState, useEffect } from 'react';
import useStickyState from '../utils/useStickyState';
import { storageAPI } from '../utils/storage';
import { Plus, Search, CheckCircle, Trash2, Edit3, X, Download, ChevronDown, ArrowUpDown, Calendar, Activity, Check } from 'lucide-react';

// Safe parser for perbaikan logs stored in catatan column
const parseRepairCatatan = (catatanStr, defaultUkuran = '1000x1200 mm', defaultQtySelesai = 0, defaultQtyScrap = 0) => {
  try {
    const parsed = JSON.parse(catatanStr);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) {
        return {
          items: parsed.items,
          keterangan: parsed.keterangan || ''
        };
      }
    }
  } catch (e) {
    // ignore
  }
  return {
    items: [{ palletName: 'Pallet Umum', ukuran: defaultUkuran, qtySelesai: defaultQtySelesai, qtyScrap: defaultQtyScrap }],
    keterangan: catatanStr || ''
  };
};

export default function Repairs({ user }) {
  const [repairs, setRepairs] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [subTab, setSubTab] = useStickyState('aktivitas', 'rep_subTab'); // 'aktivitas' or 'laporan'
  
  // Search & Filters for Aktivitas
  const [search, setSearch] = useState('');
  
  // States for multiple pallet items inside a single perbaikan session
  const [repairItems, setRepairItems] = useStickyState([{ palletName: '', ukuran: '1000x1200 mm', qtySelesai: 0, qtyScrap: 0 }], 'rep_repairItems');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useStickyState(false, 'rep_isModalOpen');
  const [editingItem, setEditingItem] = useState(null);

  // States for searchable input dropdown
  const [activeRepairRowIndex, setActiveRepairRowIndex] = useState(null);

  // Form state
  const [formData, setFormData] = useStickyState({
    tanggal: new Date().toISOString().split('T')[0],
    petugas: 'Supriadi',
    keterangan: ''
  }, 'rep_formData');

  // Report filters state
  const [reportType, setReportType] = useState('bulanan'); // 'harian', 'mingguan', 'bulanan'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadRepairs = async () => {
      const reps = await storageAPI.getRepairs();
      const types = await storageAPI.getPalletTypes();
      setRepairs(reps);
      setPalletTypes(types);

      if (types.length > 0) {
        setFormData(prev => prev.petugas ? prev : { 
          ...prev, 
          petugas: user?.name || 'Supriadi',
          keterangan: ''
        });
        setRepairItems(prev => prev[0]?.palletName ? prev : [{ palletName: types[0].nama, ukuran: types[0].ukuran, qtySelesai: 0, qtyScrap: 0 }]);
      }
    };
    loadRepairs();
  }, [user]);

  const isAdmin = user?.role === 'admin';

  // Stats calculation for the entire repairs list
  const totalRepairedAll = repairs.reduce((acc, curr) => acc + (curr.qtySelesai || 0), 0);
  const totalScrapAll = repairs.reduce((acc, curr) => acc + (curr.qtyScrap || 0), 0);

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (repairItems.length === 0 || repairItems.some(i => !i.palletName)) {
      alert('Pilih Jenis Pallet terlebih dahulu!');
      return;
    }

    const totalSelesai = repairItems.reduce((acc, curr) => acc + (Number(curr.qtySelesai) || 0), 0);
    const totalScrap = repairItems.reduce((acc, curr) => acc + (Number(curr.qtyScrap) || 0), 0);
    const totalMasuk = totalSelesai + totalScrap;
    const combinedUkuran = Array.from(new Set(repairItems.map(item => item.ukuran))).join(', ');

    // Serialize details to catatan
    const serializedCatatan = JSON.stringify({
      items: repairItems.map(item => ({
        palletName: item.palletName,
        ukuran: item.ukuran,
        qtySelesai: Number(item.qtySelesai) || 0,
        qtyScrap: Number(item.qtyScrap) || 0
      })),
      keterangan: formData.keterangan || ''
    });

    const finalRecord = {
      tanggal: formData.tanggal,
      petugas: formData.petugas,
      ukuran: combinedUkuran,
      qtyMasuk: totalMasuk,
      qtySelesai: totalSelesai,
      qtyScrap: totalScrap,
      catatan: serializedCatatan
    };

    let updated;
    if (editingItem) {
      updated = repairs.map(item => item.id === editingItem.id ? { ...finalRecord, id: item.id } : item);
    } else {
      updated = [{ ...finalRecord, id: 'rep_' + Date.now() }, ...repairs];
    }

    setRepairs(updated);
    await storageAPI.saveRepairs(updated);
    closeModal();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const parsed = parseRepairCatatan(item.catatan, item.ukuran, item.qtySelesai, item.qtyScrap);
    setFormData({
      tanggal: item.tanggal,
      petugas: item.petugas || 'Supriadi',
      keterangan: parsed.keterangan
    });
    setRepairItems(parsed.items);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus log perbaikan warehouse ini?')) {
      const updated = repairs.filter(item => item.id !== id);
      setRepairs(updated);
      await storageAPI.deleteRepair(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      petugas: user?.name || 'Supriadi',
      keterangan: ''
    });
    if (palletTypes.length > 0) {
      setRepairItems([{ palletName: palletTypes[0].nama, ukuran: palletTypes[0].ukuran, qtySelesai: 0, qtyScrap: 0 }]);
    }
  };

  // Search filter for Aktivitas
  const filteredRepairs = repairs.filter(item => {
    const parsed = parseRepairCatatan(item.catatan, item.ukuran, item.qtySelesai, item.qtyScrap);
    const itemString = `${item.ukuran} ${item.petugas} ${item.catatan} ${parsed.keterangan} ${parsed.items.map(i => i.palletName).join(' ')}`.toLowerCase();
    return itemString.includes(search.toLowerCase());
  });

  // Report calculations
  const getFilteredRepairsForReport = () => {
    return repairs.filter(item => {
      const itemDate = new Date(item.tanggal);
      if (reportType === 'harian') {
        return item.tanggal === reportDate;
      } else if (reportType === 'mingguan') {
        return item.tanggal >= reportStartDate && item.tanggal <= reportEndDate;
      } else { // bulanan
        return (itemDate.getMonth() + 1) === reportMonth && itemDate.getFullYear() === reportYear;
      }
    });
  };

  const getRepairsReportData = () => {
    const filtered = getFilteredRepairsForReport();
    const summary = {};

    filtered.forEach(record => {
      const parsed = parseRepairCatatan(record.catatan, record.ukuran, record.qtySelesai, record.qtyScrap);
      parsed.items.forEach(item => {
        const key = `${item.palletName}||${item.ukuran}`;
        if (!summary[key]) {
          summary[key] = {
            palletName: item.palletName,
            ukuran: item.ukuran,
            qtySelesai: 0,
            qtyScrap: 0,
            qtyMasuk: 0
          };
        }
        summary[key].qtySelesai += Number(item.qtySelesai) || 0;
        summary[key].qtyScrap += Number(item.qtyScrap) || 0;
        summary[key].qtyMasuk += (Number(item.qtySelesai) || 0) + (Number(item.qtyScrap) || 0);
      });
    });

    return Object.values(summary).sort((a, b) => b.qtySelesai - a.qtySelesai);
  };

  const downloadLaporanPerbaikanGambar = () => {
    const items = getRepairsReportData();
    const filtered = getFilteredRepairsForReport();
    
    const totalSelesai = items.reduce((acc, curr) => acc + curr.qtySelesai, 0);
    const totalScrap = items.reduce((acc, curr) => acc + curr.qtyScrap, 0);
    const totalMasuk = totalSelesai + totalScrap;
    const successRate = totalMasuk > 0 ? Math.round((totalSelesai / totalMasuk) * 100) : 0;

    let periodStr = '';
    if (reportType === 'harian') {
      periodStr = `Harian - Tanggal ${new Date(reportDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    } else if (reportType === 'mingguan') {
      const d1 = new Date(reportStartDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const d2 = new Date(reportEndDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      periodStr = `Mingguan - Periode ${d1} s/d ${d2}`;
    } else {
      const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                          'Juli','Agustus','September','Oktober','November','Desember'];
      periodStr = `Bulanan - Periode ${bulanNames[reportMonth - 1]} ${reportYear}`;
    }

    const W = 1122; // A4 landscape width
    const ROW_H = 40;
    const requiredHeight = 180 + (items.length * ROW_H) + 120;
    const H = Math.max(794, requiredHeight);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Accent line
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#10b981'); // emerald-500
    grad.addColorStop(1, '#14b8a6'); // teal-500
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    const PAD = 50;
    let y = 45;

    // Header Title
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('Laporan Aktivitas Perbaikan Pallet', PAD, y);
    
    y += 24;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4B5563';
    ctx.fillText(periodStr, PAD, y);

    y += 25;
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    
    // Stats Summary Boxes
    y += 20;
    const boxW = (W - PAD * 2 - 40) / 4;
    const drawStatBox = (x, title, val, color) => {
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(x, y, boxW, 60);
      ctx.strokeStyle = '#E5E7EB';
      ctx.strokeRect(x, y, boxW, 60);
      
      ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(title.toUpperCase(), x + 15, y + 20);
      
      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(val, x + 15, y + 45);
    };

    drawStatBox(PAD, 'Total Pallet Masuk', `${totalMasuk} Pcs`, '#374151');
    drawStatBox(PAD + boxW + 13, 'Selesai Perbaikan', `${totalSelesai} Pcs`, '#10b981');
    drawStatBox(PAD + (boxW + 13) * 2, 'Afkir (Scrap)', `${totalScrap} Pcs`, '#EF4444');
    drawStatBox(PAD + (boxW + 13) * 3, 'Success Rate', `${successRate}%`, '#6366F1');

    y += 85;

    // Table Headers
    const cols = [
      { w: 80, label: 'No.', align: 'center' },
      { w: 320, label: 'Nama Jenis Pallet', align: 'left' },
      { w: 220, label: 'Ukuran Pallet', align: 'center' },
      { w: 120, label: 'Qty Selesai', align: 'center' },
      { w: 120, label: 'Qty Scrap', align: 'center' },
      { w: 140, label: 'Total Masuk', align: 'center' }
    ];

    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(PAD, y - 20, W - PAD * 2, 30);
    ctx.strokeStyle = '#E5E7EB';
    ctx.strokeRect(PAD, y - 20, W - PAD * 2, 30);

    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4B5563';
    let currentX = PAD;
    cols.forEach(col => {
      let tx = currentX;
      if (col.align === 'center') tx = currentX + col.w / 2 - ctx.measureText(col.label).width / 2;
      ctx.fillText(col.label, tx, y);
      currentX += col.w;
    });

    y += 18;

    // Table Rows
    ctx.font = '13px "Segoe UI", Arial, sans-serif';
    if (items.length === 0) {
      y += 30;
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('Tidak ada aktivitas perbaikan pada periode ini.', W / 2 - ctx.measureText('Tidak ada aktivitas perbaikan pada periode ini.').width / 2, y);
    } else {
      items.forEach((item, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        ctx.fillRect(PAD, y - 13, W - PAD * 2, ROW_H);
        
        ctx.strokeStyle = '#F3F4F6';
        ctx.beginPath(); ctx.moveTo(PAD, y + ROW_H - 14); ctx.lineTo(W - PAD, y + ROW_H - 14); ctx.stroke();

        let cx = PAD;
        const drawCell = (text, w, color = '#1F2937', weight = 'normal', align = 'center') => {
          ctx.fillStyle = color;
          ctx.font = `${weight} 13px "Segoe UI", Arial, sans-serif`;
          let tx = cx;
          if (align === 'center') tx = cx + w / 2 - ctx.measureText(text).width / 2;
          ctx.fillText(text, tx, y + 10);
          cx += w;
        };

        drawCell((idx + 1).toString(), cols[0].w, '#6B7280', 'normal', 'center');
        drawCell(item.palletName, cols[1].w, '#1F2937', 'bold', 'left');
        drawCell(item.ukuran, cols[2].w, '#4B5563');
        drawCell(`+${item.qtySelesai} pcs`, cols[3].w, '#10b981', 'bold');
        drawCell(`${item.qtyScrap > 0 ? `+${item.qtyScrap} pcs` : '-'}`, cols[4].w, item.qtyScrap > 0 ? '#EF4444' : '#9CA3AF');
        drawCell(`${item.qtyMasuk} pcs`, cols[5].w, '#111827', 'bold');

        y += ROW_H;
      });
    }

    // Outer border around table
    ctx.strokeStyle = '#E5E7EB';
    ctx.strokeRect(PAD, 175, W - PAD * 2, y - 175);

    // Footer divider
    y += 20;
    ctx.strokeStyle = '#E5E7EB';
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

    // Footer
    y += 18;
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(`Dicetak pada: ${new Date().toLocaleString('id-ID')} · CV Mitra Dunia Palletindo · Total ${filtered.length} transaksi perbaikan`, PAD, y);

    // Download Link trigger
    const link = document.createElement('a');
    link.download = `Laporan_Perbaikan_Pallet_${reportType}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Repair Warehouse</h2>
          <p className="text-slate-500 mt-1 font-medium">Pantau dan kelola pemulihan pallet rusak menjadi pallet layak kirim</p>
        </div>
        {subTab === 'aktivitas' && isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all border border-emerald-500/20 text-sm cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Input Log Perbaikan
          </button>
        )}
      </div>

      {/* Subtabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('aktivitas')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 cursor-pointer ${
            subTab === 'aktivitas'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Aktivitas Perbaikan
        </button>
        <button
          onClick={() => setSubTab('laporan')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 cursor-pointer ${
            subTab === 'laporan'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Laporan Perbaikan
        </button>
      </div>

      {subTab === 'aktivitas' && (
        <div className="space-y-6">
          {/* Stats Summary Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100 shadow-sm">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Selesai Diperbaiki</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">{totalRepairedAll.toLocaleString('id-ID')} Pcs</span>
              </div>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle className="w-5 h-5" />
              </span>
            </div>

            <div className="glass-card bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-100 shadow-sm">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Afkir (Scrap)</span>
                <span className="text-xl font-black text-rose-600 mt-1 block">{totalScrapAll.toLocaleString('id-ID')} Pcs</span>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Control Panel */}
          <div className="glass-card bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100 shadow-sm">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari ukuran, petugas, catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-semibold"
              />
            </div>
          </div>

          {/* Table / Cards */}
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block glass-card bg-white rounded-2xl overflow-hidden border border-slate-150 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <th className="py-4 px-4 w-28">Tanggal</th>
                      <th className="py-4 px-4 w-28">Petugas</th>
                      <th className="py-4 px-4 w-32">Ukuran</th>
                      <th className="py-4 px-4">Rincian Pallet (Selesai / Scrap)</th>
                      <th className="py-4 px-4 text-center w-24">Selesai</th>
                      <th className="py-4 px-4 text-center w-24">Scrap</th>
                      <th className="py-4 px-4 w-40">Catatan</th>
                      {isAdmin && <th className="py-4 px-4 text-center w-24">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRepairs.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400 font-medium">
                          Belum ada data aktivitas perbaikan warehouse.
                        </td>
                      </tr>
                    ) : (
                      filteredRepairs.map((item) => {
                        const parsed = parseRepairCatatan(item.catatan, item.ukuran, item.qtySelesai, item.qtyScrap);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-all text-slate-655 font-medium">
                            <td className="py-4 px-4 text-slate-500 text-xs">
                              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800 truncate" title={item.petugas}>{item.petugas}</td>
                            <td className="py-4 px-4">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-bold block w-fit truncate" title={item.ukuran}>
                                {item.ukuran}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-1 font-semibold text-xs text-slate-700">
                                {parsed.items.map((row, idx) => (
                                  <div key={idx} className="flex justify-between max-w-[280px]">
                                    <span className="font-bold text-slate-800">{row.palletName}</span>
                                    <span>
                                      Selesai: <span className="text-emerald-600 font-bold">+{row.qtySelesai}</span> / Scrap: <span className="text-rose-500 font-bold">{row.qtyScrap}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center font-extrabold text-emerald-600 bg-emerald-50/10">+{item.qtySelesai} pcs</td>
                            <td className="py-4 px-4 text-center font-bold text-rose-500">{item.qtyScrap > 0 ? `${item.qtyScrap} pcs` : '-'}</td>
                            <td className="py-4 px-4 text-slate-500 text-xs truncate max-w-[160px]" title={parsed.keterangan}>{parsed.keterangan || '-'}</td>
                            {isAdmin && (
                              <td className="py-4 px-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {filteredRepairs.length === 0 ? (
                <div className="glass-card bg-white rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-100 shadow-sm">
                  Belum ada data aktivitas perbaikan warehouse.
                </div>
              ) : (
                filteredRepairs.map((item) => {
                  const parsed = parseRepairCatatan(item.catatan, item.ukuran, item.qtySelesai, item.qtyScrap);
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs font-semibold">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                          👤 {item.petugas}
                        </span>
                      </div>

                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider">Pallet Detail</span>
                        {parsed.items.map((row, idx) => (
                          <div key={idx} className="flex justify-between font-bold text-slate-700">
                            <span>{row.palletName} ({row.ukuran})</span>
                            <span>
                              Selesai: <span className="text-emerald-600">+{row.qtySelesai}</span> / Scrap: <span className="text-rose-500">{row.qtyScrap}</span>
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-indigo-50/30 p-2 rounded-xl text-center text-xs font-bold border border-indigo-100/30">
                        <div>
                          <span className="text-indigo-600 block text-[9px] uppercase font-bold tracking-wider">Total Selesai</span>
                          <span className="text-emerald-700 text-sm font-black">{item.qtySelesai} pcs</span>
                        </div>
                        <div>
                          <span className="text-indigo-600 block text-[9px] uppercase font-bold tracking-wider">Total Scrap</span>
                          <span className="text-rose-600 text-sm font-black">{item.qtyScrap} pcs</span>
                        </div>
                      </div>

                      {parsed.keterangan && (
                        <p className="text-xs text-slate-550 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="font-semibold block text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Catatan</span>
                          {parsed.keterangan}
                        </p>
                      )}

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
        </div>
      )}

      {subTab === 'laporan' && (
        <div className="space-y-6">
          {/* Report Date Filter Panel */}
          <div className="glass-card bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-md font-bold text-slate-800">Filter Periode Laporan</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Pilih periode laporan harian, mingguan, atau bulanan</p>
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1 w-fit self-start">
                <button
                  onClick={() => setReportType('harian')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportType === 'harian' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Harian
                </button>
                <button
                  onClick={() => setReportType('mingguan')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportType === 'mingguan' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => setReportType('bulanan')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportType === 'bulanan' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Bulanan
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {reportType === 'harian' && (
                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Tanggal</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              )}

              {reportType === 'mingguan' && (
                <>
                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mulai Tanggal</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <span className="text-slate-300 font-bold self-end mb-2">s/d</span>
                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {reportType === 'bulanan' && (
                <>
                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Bulan</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                  </div>
                  <div className="flex flex-col gap-1 w-full max-w-[120px]">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Tahun</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={downloadLaporanPerbaikanGambar}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md ml-auto self-end cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Laporan (PNG)
              </button>
            </div>
          </div>

          {/* Aggregated Statistics Summary */}
          {(() => {
            const reportData = getRepairsReportData();
            const totalSelesai = reportData.reduce((acc, curr) => acc + curr.qtySelesai, 0);
            const totalScrap = reportData.reduce((acc, curr) => acc + curr.qtyScrap, 0);
            const totalMasuk = totalSelesai + totalScrap;
            const successRate = totalMasuk > 0 ? Math.round((totalSelesai / totalMasuk) * 100) : 0;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Pallet Masuk</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">{totalMasuk.toLocaleString('id-ID')} Pcs</span>
                  </div>
                  <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Selesai Repair</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">{totalSelesai.toLocaleString('id-ID')} Pcs</span>
                  </div>
                  <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Afkir (Scrap)</span>
                    <span className="text-2xl font-black text-rose-600 mt-1 block">{totalScrap.toLocaleString('id-ID')} Pcs</span>
                  </div>
                  <div className="glass-card bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Success Rate</span>
                    <span className="text-2xl font-black text-indigo-600 mt-1 block">{successRate}%</span>
                  </div>
                </div>

                {/* Report Details Table */}
                <div className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150 shadow-sm mt-4">
                  <div className="overflow-x-auto">
                    {/* Desktop Report Table */}
                    <div className="hidden sm:block">
                      <table className="w-full text-left table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                            <th className="py-4 px-6 w-16 text-center">No.</th>
                            <th className="py-4 px-6 w-48">Nama Jenis Pallet</th>
                            <th className="py-4 px-6 w-36 text-center">Ukuran</th>
                            <th className="py-4 px-6 text-center w-32">Qty Selesai</th>
                            <th className="py-4 px-6 text-center w-32">Qty Scrap</th>
                            <th className="py-4 px-6 text-center w-32">Total Masuk</th>
                            <th className="py-4 px-6 text-center w-36">Success Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-650 font-semibold">
                          {reportData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                                Tidak ada aktivitas perbaikan pallet pada periode ini.
                              </td>
                            </tr>
                          ) : (
                            reportData.map((item, idx) => {
                              const rate = item.qtyMasuk > 0 ? Math.round((item.qtySelesai / item.qtyMasuk) * 100) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-all text-slate-600">
                                  <td className="py-4 px-6 text-center text-slate-400 font-normal">{idx + 1}</td>
                                  <td className="py-4 px-6 font-bold text-slate-800 truncate" title={item.palletName}>{item.palletName}</td>
                                  <td className="py-4 px-6 text-center">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-600 font-bold">
                                      {item.ukuran}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-center text-emerald-600 font-bold">+{item.qtySelesai} Pcs</td>
                                  <td className="py-4 px-6 text-center text-rose-500 font-bold">{item.qtyScrap > 0 ? `${item.qtyScrap} Pcs` : '-'}</td>
                                  <td className="py-4 px-6 text-center text-slate-700 font-bold">{item.qtyMasuk} Pcs</td>
                                  <td className="py-4 px-6 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-black border ${rate > 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                      {rate}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Report Cards */}
                    <div className="sm:hidden space-y-4 p-4">
                      {reportData.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-medium text-sm">
                          Tidak ada aktivitas perbaikan pallet pada periode ini.
                        </div>
                      ) : (
                        reportData.map((item, idx) => {
                          const rate = item.qtyMasuk > 0 ? Math.round((item.qtySelesai / item.qtyMasuk) * 100) : 0;
                          return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-sm">{item.palletName}</h4>
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] border border-slate-200 text-slate-600 font-bold">
                                    {item.ukuran}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-black border ${rate > 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                  {rate}% SR
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-[10px] border border-slate-100 font-bold">
                                <div>
                                  <span className="text-emerald-600 block text-[9px] uppercase font-bold mb-0.5">Selesai</span>
                                  <span className="text-emerald-700">+{item.qtySelesai}</span>
                                </div>
                                <div>
                                  <span className="text-rose-500 block text-[9px] uppercase font-bold mb-0.5">Scrap</span>
                                  <span className="text-rose-600">{item.qtyScrap}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Masuk</span>
                                  <span className="text-slate-700">{item.qtyMasuk}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL: INPUT/EDIT TRANSACTION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="text-md font-bold text-slate-800">{editingItem ? 'Edit Log Perbaikan' : 'Input Aktivitas Perbaikan Baru'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Nama Petugas</label>
                  <input
                    type="text"
                    required
                    value={formData.petugas}
                    onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                    placeholder="Contoh: Supriadi"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Multi pallet repair row editor */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Pallet Diperbaiki</h4>
                  <button
                    type="button"
                    onClick={() => setRepairItems(prev => [...prev, { palletName: palletTypes[0]?.nama || '', ukuran: palletTypes[0]?.ukuran || '1000x1200 mm', qtySelesai: 0, qtyScrap: 0 }])}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {repairItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150 relative">
                        <div className="flex-1 min-w-0 relative">
                          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Jenis Pallet</label>
                          <input
                            type="text"
                            autoComplete="off"
                            placeholder="Ketik nama pallet..."
                            value={item.palletName}
                            onFocus={() => setActiveRepairRowIndex(idx)}
                            onBlur={() => setTimeout(() => setActiveRepairRowIndex(null), 150)}
                            onChange={(e) => {
                              const typedName = e.target.value;
                              const match = palletTypes.find(pt => pt.nama.toLowerCase().trim() === typedName.toLowerCase().trim());
                              setRepairItems(prev => prev.map((ri, riIdx) => riIdx === idx ? {
                                ...ri,
                                palletName: typedName,
                                ukuran: match ? match.ukuran : ri.ukuran
                              } : ri));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                          {activeRepairRowIndex === idx && (() => {
                            const filtered = palletTypes.filter(pt =>
                              pt.nama.toLowerCase().includes(item.palletName.toLowerCase())
                            );
                            return filtered.length > 0 ? (
                              <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {filtered.map((pt) => (
                                  <li
                                    key={pt.id}
                                    onMouseDown={() => {
                                      setRepairItems(prev => prev.map((ri, riIdx) => riIdx === idx ? {
                                        ...ri,
                                        palletName: pt.nama,
                                        ukuran: pt.ukuran
                                      } : ri));
                                      setActiveRepairRowIndex(null);
                                    }}
                                    className="px-4 py-2 hover:bg-indigo-50 text-slate-700 text-xs font-semibold cursor-pointer border-b border-slate-50 last:border-b-0 text-left"
                                  >
                                    {pt.nama} ({pt.ukuran})
                                  </li>
                                ))}
                              </ul>
                            ) : null;
                          })()}
                        </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-20">
                          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 text-center">Selesai</label>
                          <input
                            type="number"
                            min="0"
                            value={item.qtySelesai}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRepairItems(prev => prev.map((ri, riIdx) => riIdx === idx ? { ...ri, qtySelesai: val } : ri));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 text-center"
                          />
                        </div>
                        
                        <div className="flex-1 sm:w-20">
                          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 text-center">Scrap</label>
                          <input
                            type="number"
                            min="0"
                            value={item.qtyScrap}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRepairItems(prev => prev.map((ri, riIdx) => riIdx === idx ? { ...ri, qtyScrap: val } : ri));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 text-center"
                          />
                        </div>
                      </div>

                      {repairItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRepairItems(prev => prev.filter((_, riIdx) => riIdx !== idx))}
                          className="self-end sm:self-center p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Keterangan / Catatan</label>
                <textarea
                  placeholder="Keterangan kerusakan, detail bagian papan yang diganti..."
                  rows="2"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-650 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
