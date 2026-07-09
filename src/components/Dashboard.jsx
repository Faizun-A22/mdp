import React, { useState, useEffect } from 'react';
import { storageAPI } from '../utils/storage';
import { 
  ComposedChart,
  Line,
  PieChart, 
  Pie, 
  Cell,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { 
  Layers, 
  Thermometer, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  Zap,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [stockPallets, setStockPallets] = useState([]);
  const [kdBelum, setKdBelum] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

  const loadDashboardData = async () => {
    setIsManualRefreshing(true);
    const stock = await storageAPI.getStockPallets();
    const kd = await storageAPI.getKDBelum();
    const mats = await storageAPI.getMaterials();
    const reps = await storageAPI.getRepairs();
    
    setStockPallets(stock);
    setKdBelum(kd);
    setMaterials(mats);
    setRepairs(reps);
    
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Group by customer and ukuran, sort ascending, find latest transaction for each group
  const customerUkuranGroups = {};
  stockPallets.forEach(sp => {
    const key = `${sp.customer}||${sp.ukuran}`;
    if (!customerUkuranGroups[key]) customerUkuranGroups[key] = [];
    customerUkuranGroups[key].push(sp);
  });

  const latestStocks = [];
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
    latestStocks.push({
      customer: lastTx.customer,
      ukuran: lastTx.ukuran,
      stock: totalStock
    });
  }

  const totalStockLatest = latestStocks.reduce((acc, curr) => acc + curr.stock, 0);

  // In Process KD
  const kdActiveCount = kdBelum.filter(k => k.status === 'Proses').reduce((acc, curr) => acc + curr.qty, 0);

  // Critical items (under min stock)
  const criticalItems = materials.filter(m => {
    const stockAkhir = m.stokAwal + m.masuk - m.keluar;
    return stockAkhir <= m.minStok;
  });

  // Repair warehouse stats
  const totalRepaired = repairs.reduce((acc, curr) => acc + curr.qtySelesai, 0);
  const totalScrap = repairs.reduce((acc, curr) => acc + curr.qtyScrap, 0);
  const repairRate = repairs.length > 0 
    ? Math.round((totalRepaired / (totalRepaired + totalScrap || 1)) * 100) 
    : 0;

  // Chart 1: Pallet Inbound vs Outbound over time (sorted chronologically ascending)
  const sortedStockPallets = [...stockPallets].sort((a, b) => {
    const dateA = new Date(a.tanggal);
    const dateB = new Date(b.tanggal);
    if (dateA - dateB !== 0) return dateA - dateB;
    const timeA = a.createdAt || a.id || '';
    const timeB = b.createdAt || b.id || '';
    return timeA.localeCompare(timeB);
  });

  const palletFlowData = sortedStockPallets.map(sp => {
    const inbound = sp.produksi + sp.dariLumajang + sp.dariSubcont + sp.returCustomer;
    const outbound = sp.palletKeluar + sp.returLumajang;
    return {
      name: new Date(sp.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      Inbound: inbound,
      Outbound: outbound,
      Stok: sp.stockAwal + sp.produksi + sp.dariLumajang + sp.dariSubcont + sp.returCustomer - sp.palletKeluar - sp.returLumajang
    };
  });

  // Chart 2: Stock Pallet per Customer
  const customerStockMap = {};
  latestStocks.forEach(item => {
    if (!customerStockMap[item.customer]) {
      customerStockMap[item.customer] = 0;
    }
    customerStockMap[item.customer] += item.stock;
  });
  const customerStockData = Object.keys(customerStockMap).map(cust => ({
    name: cust.replace('PT ', '').substring(0, 12),
    'Stok Pallet': customerStockMap[cust]
  }));



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
            <span className="text-3xl font-black text-slate-800">{totalRepaired}</span>
            <span className="text-slate-400 text-xs font-bold">Selesai</span>
          </div>
          <div className="mt-2 text-xs flex items-center text-emerald-600 font-semibold">
            <span className="font-bold">{repairRate}%</span>
            <span className="text-slate-400 ml-1 font-normal">Success Rate (Scrap: {totalScrap})</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pallet Flow In/Out */}
        <div className="glass-card bg-white rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Aliran Masuk/Keluar Pallet</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Produksi, Lumajang & Subcont vs Pallet Keluar</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span className="text-slate-600">Inbound</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500"></span>
                <span className="text-slate-600">Outbound</span>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={palletFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="Inbound" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outbound" barSize={20} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Stok" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical tools warning panel moved here */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistik Stok Pallet per Customer - Now using PieChart */}
        <div className="glass-card bg-white rounded-2xl p-6 lg:col-span-2 flex flex-col md:flex-row items-center gap-6">
          <div className="md:w-1/3 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-slate-800">Distribusi Stok Pallet per Customer</h3>
            <p className="text-slate-500 text-sm mt-2 font-medium">Persentase kepemilikan pallet aktif yang siap kirim.</p>
            <div className="mt-6 flex flex-col gap-3">
              {customerStockData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-sm font-bold text-slate-600 flex-1">{entry.name}</span>
                  <span className="text-sm font-black text-slate-800">{entry['Stok Pallet']}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-80 w-full md:w-2/3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerStockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
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
          </div>
        </div>


      </div>
    </div>
  );
}
