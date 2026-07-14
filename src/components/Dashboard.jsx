import React, { useState, useEffect, useMemo } from 'react';
import { storageAPI } from '../utils/storage';
import * as XLSX from 'xlsx';
import { 
  LineChart,
  Line,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  Layers, 
  Thermometer, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  Zap,
  RefreshCw,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export default function Dashboard() {
  const [stockPallets, setStockPallets] = useState([]);
  const [kdBelum, setKdBelum] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [chartFilter, setChartFilter] = useState('keduanya'); // keduanya, masuk, keluar

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

  const loadDashboardData = async () => {
    setIsManualRefreshing(true);
    const stock = await storageAPI.getStockPallets();
    const kd = await storageAPI.getKDBelum();
    const mats = await storageAPI.getMaterials();
    const reps = await storageAPI.getRepairs();
    const pos = await storageAPI.getOutstandingPOs();
    
    setStockPallets(stock);
    setKdBelum(kd);
    setMaterials(mats);
    setRepairs(reps);
    setOutstandingPOs(pos);
    
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // --- MEMOIZATION: Group and calculate latest stocks ---
  const latestStocks = useMemo(() => {
    const customerUkuranGroups = {};
    stockPallets.forEach(sp => {
      const key = `${sp.customer}||${sp.ukuran}`;
      if (!customerUkuranGroups[key]) customerUkuranGroups[key] = [];
      customerUkuranGroups[key].push(sp);
    });

    const list = [];
    for (const key in customerUkuranGroups) {
      const group = customerUkuranGroups[key].sort((a, b) => {
        const dateA = new Date(a.tanggal);
        const dateB = new Date(b.tanggal);
        if (dateA - dateB !== 0) return dateA - dateB;
        const timeA = a.createdAt || a.id || '';
        const timeB = b.createdAt || b.id || '';
        return timeA.localeCompare(timeB);
      });
      const lastTx = group[group.length - 1];
      const totalStock = (lastTx.stockAwal || 0) + 
                         (lastTx.produksi || 0) + 
                         (lastTx.dariLumajang || 0) + 
                         (lastTx.dariSubcont || 0) + 
                         (lastTx.returCustomer || 0) - 
                         (lastTx.palletKeluar || 0) - 
                         (lastTx.returLumajang || 0);
      list.push({
        customer: lastTx.customer,
        ukuran: lastTx.ukuran,
        stock: totalStock
      });
    }
    return list;
  }, [stockPallets]);

  const totalStockLatest = useMemo(() => {
    return latestStocks.reduce((acc, curr) => acc + curr.stock, 0);
  }, [latestStocks]);

  // --- MEMOIZATION: In Process KD count ---
  const kdActiveCount = useMemo(() => {
    return kdBelum.filter(k => k.status === 'Proses').reduce((acc, curr) => acc + curr.qty, 0);
  }, [kdBelum]);

  // --- MEMOIZATION: Critical items ---
  const criticalItems = useMemo(() => {
    return materials.filter(m => {
      const stockAkhir = m.stokAwal + m.masuk - m.keluar;
      return stockAkhir <= m.minStok;
    });
  }, [materials]);

  // --- MEMOIZATION: Repair stats ---
  const repairStats = useMemo(() => {
    const totalRepaired = repairs.reduce((acc, curr) => acc + curr.qtySelesai, 0);
    const totalScrap = repairs.reduce((acc, curr) => acc + curr.qtyScrap, 0);
    const repairRate = repairs.length > 0 
      ? Math.round((totalRepaired / (totalRepaired + totalScrap || 1)) * 100) 
      : 0;
    return { totalRepaired, totalScrap, repairRate };
  }, [repairs]);

  // --- MEMOIZATION: Daily flow data for Line Chart ---
  const dailyFlowData = useMemo(() => {
    const dailyFlowMap = {};
    stockPallets.forEach(sp => {
      const tgl = sp.tanggal;
      if (!dailyFlowMap[tgl]) {
        dailyFlowMap[tgl] = {
          tanggal: tgl,
          masuk: 0,
          keluar: 0,
        };
      }
      const masukVal = (sp.produksi || 0) + (sp.dariLumajang || 0) + (sp.dariSubcont || 0) + (sp.returCustomer || 0);
      const keluarVal = (sp.palletKeluar || 0) + (sp.returLumajang || 0);
      dailyFlowMap[tgl].masuk += masukVal;
      dailyFlowMap[tgl].keluar += keluarVal;
    });

    return Object.values(dailyFlowMap)
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
      .map(item => ({
        tanggal: item.tanggal,
        label: new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        'Pallet Masuk': item.masuk,
        'Pallet Keluar': item.keluar,
        'Net Aliran': item.masuk - item.keluar
      }));
  }, [stockPallets]);

  // --- MEMOIZATION: Combined Bar Chart Data (Stok Aktif vs Sisa PO per Customer) ---
  const customerBarData = useMemo(() => {
    const customerSummaryMap = {};
    
    // Set default Stok Aktif from latestStocks
    latestStocks.forEach(item => {
      const cust = item.customer;
      if (!customerSummaryMap[cust]) {
        customerSummaryMap[cust] = { customer: cust, stokAktif: 0, sisaPO: 0 };
      }
      customerSummaryMap[cust].stokAktif += item.stock;
    });

    // Merge Sisa PO from outstandingPOs
    outstandingPOs.forEach(po => {
      const cust = po.customer;
      if (!customerSummaryMap[cust]) {
        customerSummaryMap[cust] = { customer: cust, stokAktif: 0, sisaPO: 0 };
      }
      customerSummaryMap[cust].sisaPO += Number(po.sisaPo || 0);
    });

    return Object.values(customerSummaryMap).map(item => ({
      name: item.customer.replace('PT ', '').substring(0, 15),
      fullName: item.customer,
      'Stok Aktif': item.stokAktif,
      'Sisa PO (Outstanding)': item.sisaPO
    }));
  }, [latestStocks, outstandingPOs]);

  // --- MEMOIZATION: Stock Pallet per Customer for Pie Chart ---
  const customerStockData = useMemo(() => {
    const customerStockMap = {};
    latestStocks.forEach(item => {
      if (!customerStockMap[item.customer]) {
        customerStockMap[item.customer] = 0;
      }
      customerStockMap[item.customer] += item.stock;
    });
    return Object.keys(customerStockMap).map(cust => ({
      name: cust.replace('PT ', '').substring(0, 12),
      'Stok Pallet': customerStockMap[cust]
    }));
  }, [latestStocks]);

  // --- EXPORT & DOWNLOAD HANDLERS ---
  const handleDownloadExcel = () => {
    if (dailyFlowData.length === 0) {
      alert('Tidak ada data aliran pallet untuk diekspor.');
      return;
    }
    const exportData = dailyFlowData.map(item => ({
      'Tanggal': item.tanggal,
      'Pallet Masuk': item['Pallet Masuk'],
      'Pallet Keluar': item['Pallet Keluar'],
      'Net Aliran (Masuk - Keluar)': item['Net Aliran']
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aliran Harian Pallet");
    
    // Auto-fit column widths
    const max_len = [18, 18, 18, 28];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));
    
    XLSX.writeFile(workbook, `Laporan_Aliran_Pallet_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadSVG = () => {
    const chartElement = document.querySelector('.flow-line-chart-container svg');
    if (!chartElement) {
      alert('Grafik tidak ditemukan, silakan coba lagi.');
      return;
    }
    try {
      const svgString = new XMLSerializer().serializeToString(chartElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `Grafik_Aliran_Pallet_${new Date().toISOString().split('T')[0]}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to download SVG:', err);
      alert('Gagal mendownload gambar grafik: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 p-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Ringkasan Warehouse & Kiln Dry</h2>
          <p className="text-slate-500 mt-1 font-medium">Status dan aktivitas terkini CV Mitra Dunia Palletindo</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-650 font-bold py-2.5 px-4.5 rounded-xl border border-slate-200 shadow-sm transition-all text-xs cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="glass-card bg-white rounded-2xl p-6 relative overflow-hidden border border-slate-100 hover:border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Stok Pallet</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Layers className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{totalStockLatest.toLocaleString('id-ID')}</span>
            <span className="text-slate-400 text-xs font-bold">Unit</span>
          </div>
          <div className="mt-2 text-xs flex items-center text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            <span>Aktif & Siap Kirim</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card bg-white rounded-2xl p-6 relative overflow-hidden border border-slate-100 hover:border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pallet Sedang KD</span>
            <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100">
              <Thermometer className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{kdActiveCount}</span>
            <span className="text-slate-400 text-xs font-bold">Pcs</span>
          </div>
          <div className="mt-2 text-xs flex items-center text-cyan-600 font-semibold">
            <Zap className="w-3.5 h-3.5 mr-1 animate-pulse" />
            <span>Proses Oven Pengeringan</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card bg-white rounded-2xl p-6 relative overflow-hidden border border-slate-100 hover:border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Alat & Bahan Kritis</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Wrench className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{criticalItems.length}</span>
            <span className="text-slate-400 text-xs font-bold">Item</span>
          </div>
          <div className="mt-2 text-xs flex items-center text-rose-600 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            <span>Stok di bawah batas minimum</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card bg-white rounded-2xl p-6 relative overflow-hidden border border-slate-100 hover:border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pallet Diperbaiki</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{repairStats.totalRepaired}</span>
            <span className="text-slate-400 text-xs font-bold">Selesai</span>
          </div>
          <div className="mt-2 text-xs flex items-center text-emerald-600 font-semibold">
            <span className="font-bold">{repairStats.repairRate}%</span>
            <span className="text-slate-400 ml-1 font-normal">Success Rate (Scrap: {repairStats.totalScrap})</span>
          </div>
        </div>
      </div>

      {/* Row 2: Line Chart & Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="glass-card bg-white rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Tren Aktivitas Aliran Pallet</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Grafik pergerakan Pallet Masuk (Inbound) dan Keluar (Outbound) harian</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Filter */}
              <select
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="keduanya">Keduanya (Masuk & Keluar)</option>
                <option value="masuk">Pallet Masuk saja</option>
                <option value="keluar">Pallet Keluar saja</option>
              </select>

              {/* Download Dropdown or Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownloadExcel}
                  title="Ekspor ke Excel (.xlsx)"
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-250 hover:text-emerald-600 text-slate-600 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadSVG}
                  title="Unduh Gambar Grafik (.svg)"
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-250 hover:text-indigo-650 text-slate-600 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full flow-line-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                
                {(chartFilter === 'keduanya' || chartFilter === 'masuk') && (
                  <Line 
                    type="monotone" 
                    dataKey="Pallet Masuk" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                )}
                
                {(chartFilter === 'keduanya' || chartFilter === 'keluar') && (
                  <Line 
                    type="monotone" 
                    dataKey="Pallet Keluar" 
                    stroke="#f43f5e" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical tools warning panel */}
        <div className="glass-card bg-white rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-800">Stok Kritis</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4 font-medium">Segera order ulang bahan penolong / alat kerja berikut</p>
            
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {criticalItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium border border-dashed border-slate-200 rounded-xl">
                  ✓ Semua stok aman.
                </div>
              ) : (
                criticalItems.map((item) => {
                  const stockAkhir = item.stokAwal + item.masuk - item.keluar;
                  return (
                    <div key={item.id} className="p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between transition-colors duration-300">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">{item.nama}</h4>
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 mt-1 inline-block font-bold">
                          {item.kode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-rose-600 block">{stockAkhir} {item.satuan}</span>
                        <span className="text-[10px] text-slate-400 font-bold">Min: {item.minStok}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Sistem Pemantauan Aset:</span>
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase text-[10px] flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: New Customer Bar Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NEW Bar Chart: Stok Aktif vs Sisa PO per Customer */}
        <div className="glass-card bg-white rounded-2xl p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Kapasitas Stok & Sisa PO per Customer</h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">Perbandingan stok palet aktif di lokasi vs sisa pesanan PO yang harus dikirim</p>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStok" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="Stok Aktif" fill="url(#colorStok)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Sisa PO (Outstanding)" fill="url(#colorPO)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Distribusi Stok Pallet per Customer */}
        <div className="glass-card bg-white rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Distribusi Stok</h3>
            <p className="text-slate-500 text-xs mb-4 font-medium">Persentase kepemilikan pallet aktif per customer saat ini</p>
            
            <div className="h-60 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerStockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="Stok Pallet"
                    stroke="none"
                  >
                    {customerStockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Label for Total */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pallet</span>
                <span className="text-lg font-black text-slate-800">{totalStockLatest.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Simple Scrollable Legend */}
          <div className="mt-4 pt-4 border-t border-slate-100 max-h-36 overflow-y-auto space-y-2 pr-1">
            {customerStockData.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600 truncate max-w-[130px]">{entry.name}</span>
                </div>
                <span className="text-slate-800 font-bold">{entry['Stok Pallet']} unit</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
