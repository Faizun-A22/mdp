import React, { useState, useEffect } from 'react';
import { storageAPI } from '../utils/storage';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Layers, 
  Thermometer, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const [stockPallets, setStockPallets] = useState([]);
  const [kdBelum, setKdBelum] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const stock = await storageAPI.getStockPallets();
      const kd = await storageAPI.getKDBelum();
      const mats = await storageAPI.getMaterials();
      const reps = await storageAPI.getRepairs();
      
      setStockPallets(stock);
      setKdBelum(kd);
      setMaterials(mats);
      setRepairs(reps);
    };
    loadDashboardData();
  }, []);

  // Calculations
  const totalStockLatest = stockPallets.reduce((acc, curr) => {
    const total = curr.stockAwal + curr.produksi + curr.dariLumajang + curr.dariSubcont + curr.returCustomer - curr.palletKeluar - curr.returLumajang;
    return acc + total;
  }, 0);

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

  // Chart 1: Pallet Inbound vs Outbound over time
  const palletFlowData = stockPallets.map(sp => {
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
  stockPallets.forEach(sp => {
    const net = sp.stockAwal + sp.produksi + sp.dariLumajang + sp.dariSubcont + sp.returCustomer - sp.palletKeluar - sp.returLumajang;
    if (!customerStockMap[sp.customer]) {
      customerStockMap[sp.customer] = 0;
    }
    customerStockMap[sp.customer] += net;
  });
  const customerStockData = Object.keys(customerStockMap).map(cust => ({
    name: cust.replace('PT ', '').substring(0, 12),
    'Stok Pallet': customerStockMap[cust]
  }));

  // Chart 3: Materials Stock Levels
  const materialStockData = materials.map(m => {
    const stock = m.stokAwal + m.masuk - m.keluar;
    return {
      name: m.nama.length > 12 ? m.nama.substring(0, 12) + '...' : m.nama,
      'Stok': stock
    };
  });

  return (
    <div className="space-y-8 p-1">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Ringkasan Warehouse & Kiln Dry</h2>
        <p className="text-slate-500 mt-1 font-medium">Status dan aktivitas terkini CV Mitra Dunia Palletindo</p>
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
              <AreaChart data={palletFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Inbound" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInbound)" />
                <Area type="monotone" dataKey="Outbound" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutbound)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Materials stock level chart */}
        <div className="glass-card bg-white rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Stok Bahan & Alat Kerja</h3>
            <p className="text-slate-500 text-xs font-medium">Visualisasi jumlah persediaan aktual barang</p>
          </div>
          
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialStockData} layout="vertical" margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                />
                <Bar dataKey="Stok" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] text-slate-400 text-center mt-2 border-t border-slate-100 pt-2 font-medium">
            Menampilkan tingkat stok bahan penolong & alat
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistik Stok Pallet per Customer */}
        <div className="glass-card bg-white rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Statistik Stok Pallet per Customer</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Total persediaan pallet aktif di warehouse yang siap untuk dikirim</p>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                />
                <Bar dataKey="Stok Pallet" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
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
            
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {criticalItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  ✓ Semua stok aman. Tidak ada stok kritis.
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
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase text-[10px]">
                Aktif & Ringan
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
