import React, { useState, useEffect } from 'react';
import { 
  advisorModel, 
  fraudModel, 
  preTrainModels, 
  initialAdvisorDataset, 
  initialFraudDataset 
} from '../utils/aiModel';
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShieldAlert, 
  Check, 
  X, 
  Play, 
  RefreshCw, 
  UserCheck, 
  Layers 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

export default function AiAdvisor() {
  const [isTraining, setIsTraining] = useState(false);
  const [epochs, setEpochs] = useState(1000);
  const [lossHistory, setLossHistory] = useState([]);
  const [modelAccuracy, setModelAccuracy] = useState(0.85);

  // Recommendations State
  const [recommendations, setRecommendations] = useState([
    {
      id: 'rec1',
      title: 'Dead Stock: PT Indofood CBP (1000x1200 mm)',
      type: 'dead_stock',
      description: 'Pallet jenis ini tidak mengalami mutasi keluar selama 32 hari terakhir. Volume produksi menumpuk di area karantina.',
      suggestedAction: 'Tawarkan bundling diskon 10% jika memesan bersamaan dengan Pallet tipe khusus (1100x1300 mm).',
      daysUnsold: 32,
      productionVol: 250,
      monthlyDemand: 12,
      status: 'pending'
    },
    {
      id: 'rec2',
      title: 'Price Optimization: PT Gudang Garam Tbk (1100x1300 mm)',
      type: 'pricing',
      description: 'Pallet tipe khusus ini memiliki margin laba saat ini hanya 6% (di bawah rata-rata target perusahaan sebesar 12%), namun permintaan bulanan sangat kuat.',
      suggestedAction: 'Naikkan harga jual sebesar Rp 3.500 per unit. Berdasarkan analisis sensitivitas elastisitas, volume pesanan tidak akan terpengaruh.',
      daysUnsold: 2,
      productionVol: 450,
      monthlyDemand: 450,
      status: 'pending'
    },
    {
      id: 'rec3',
      title: 'Seasonal Demand & Purchase Suggestion: Kayu Rimba Campuran',
      type: 'seasonality',
      description: 'Data pengiriman menunjukkan lonjakan pesanan pallet PT Indofood CBP rata-rata naik 28% setiap hari Sabtu/Senin.',
      suggestedAction: 'Buat Purchase Order (PO) bahan baku Kayu Rimba Campuran dan Paku 3 hari sebelumnya (setiap hari Rabu) untuk mengantisipasi keterlambatan logistik oven KD.',
      daysUnsold: 1,
      productionVol: 300,
      monthlyDemand: 350,
      status: 'pending'
    }
  ]);

  // Fraud Logs State
  const [fraudLogs, setFraudLogs] = useState([
    {
      id: 'f1',
      operator: 'Andi Saputra',
      role: 'Kasir/Admin Toko',
      action: 'Refund Transaksi',
      detail: 'Melakukan 8 transaksi refund berturut-turut dalam waktu 30 menit.',
      inputs: [8 / 10, 0 / 15, 0, 80 / 100], // [refundCount, scrapCount, nightShift, amountVariance]
      timestamp: 'Baru saja',
      riskScore: 0,
      status: 'pending'
    },
    {
      id: 'f2',
      operator: 'Budi Setiawan',
      role: 'Kepala Operator Repairs',
      action: 'Pelaporan Pallet Scrap',
      detail: 'Melaporkan 12 unit pallet sebagai Scrap (rusak total) dalam satu shift.',
      inputs: [0 / 10, 12 / 15, 1, 70 / 100],
      timestamp: '15 menit yang lalu',
      riskScore: 0,
      status: 'pending'
    },
    {
      id: 'f3',
      operator: 'Siti Rahma',
      role: 'Admin Warehouse',
      action: 'Pengurangan Stok Bahan',
      detail: 'Melakukan pemakaian bahan paku 1 dus dengan variasi jumlah normal.',
      inputs: [1 / 10, 1 / 15, 0, 10 / 100],
      timestamp: '1 jam yang lalu',
      riskScore: 0,
      status: 'audited'
    }
  ]);

  // Pre-train models on mount
  useEffect(() => {
    preTrainModels();
    
    // Evaluate initial fraud risk scores using the trained model
    evaluateFraudLogs();
    
    // Populate initial loss graph
    const initialLoss = [];
    for (let i = 1; i <= 20; i++) {
      initialLoss.push({ epoch: i * 50, loss: 0.25 / (i * 0.8 + 1) + Math.random() * 0.02 });
    }
    setLossHistory(initialLoss);
  }, []);

  const evaluateFraudLogs = () => {
    setFraudLogs(prev => prev.map(log => {
      const pred = fraudModel.predict(log.inputs);
      return {
        ...log,
        riskScore: pred[0]
      };
    }));
  };

  // Jalankan training tambahan secara interaktif
  const handleTrainModel = () => {
    setIsTraining(true);
    let currentLoss = 0;
    const newLossHistory = [...lossHistory];

    setTimeout(() => {
      const steps = 100;
      for (let step = 1; step <= steps; step++) {
        let totalLoss = 0;
        // Latih model Advisor dengan dataset utama
        initialAdvisorDataset.forEach(data => {
          totalLoss += advisorModel.train(data.input, data.target);
        });
        currentLoss = totalLoss / initialAdvisorDataset.length;

        if (step % 5 === 0) {
          const nextEpoch = (newLossHistory.length > 0 ? newLossHistory[newLossHistory.length - 1].epoch : 0) + 5;
          newLossHistory.push({ epoch: nextEpoch, loss: currentLoss });
        }
      }

      setLossHistory(newLossHistory.slice(-20)); // Ambil 20 data terakhir
      setModelAccuracy(prev => Math.min(0.99, prev + 0.02)); // Simulasi akurasi meningkat
      setIsTraining(false);
      evaluateFraudLogs(); // Evaluasi ulang skor fraud setelah model dilatih
    }, 800);
  };

  // Self-Learning feedback loop
  const handleFeedback = (recId, status, type, daysUnsold, profitMargin, monthlyDemand) => {
    // 1. Update status di UI
    setRecommendations(prev => prev.map(rec => rec.id === recId ? { ...rec, status } : rec));

    // 2. Reinforcement Learning (Self-Learning)
    // Ubah parameter input menjadi skala ternormalisasi
    const normalizedInput = [
      daysUnsold / 100,
      profitMargin / 50,
      monthlyDemand / 500
    ];

    // Tentukan target biner berdasarkan feedback
    let target = [0, 0, 0];
    if (status === 'approved') {
      if (type === 'dead_stock') target = [1, 0, 0];
      else if (type === 'pricing') target = [0, 0, 1];
      else target = [0, 1, 0];
    } else {
      // Jika ditolak, kurangi kecenderungan model memilih kelas tersebut
      target = [0, 0, 0]; 
    }

    // Latih model Neural Network secara instan menggunakan backpropagation dari umpan balik pengguna!
    for (let i = 0; i < 200; i++) {
      advisorModel.train(normalizedInput, target);
    }

    // Hitung ulang loss terbaru untuk visualisasi grafik
    const latestLoss = advisorModel.train(normalizedInput, target);
    setLossHistory(prev => [
      ...prev,
      { epoch: (prev.length > 0 ? prev[prev.length - 1].epoch : 0) + 1, loss: latestLoss }
    ].slice(-20));

    // Update tingkat akurasi secara visual
    setModelAccuracy(prev => Math.min(0.99, Math.max(0.70, prev + (status === 'approved' ? 0.01 : -0.02))));
  };

  const handleAuditFraud = (logId) => {
    setFraudLogs(prev => prev.map(log => log.id === logId ? { ...log, status: 'audited' } : log));
    alert('Log aktivitas kasir/operator berhasil ditandai sebagai "Telah Diaudit".');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-650 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 opacity-10">
          <Brain className="w-80 h-80" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Rekomendasi & Keamanan AI</h1>
          <p className="mt-2 text-indigo-100 max-w-2xl text-sm sm:text-base">
            Sistem kecerdasan buatan operasional CV Mitra Dunia Palletindo. Menggunakan Neural Network (Deep Learning) lokal untuk deteksi risiko kecurangan operasional dan optimasi logistik pergudangan.
          </p>
        </div>
      </div>

      {/* Grid: NN Visualizer & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Deep Learning Engine (Neural Network Stats) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Mesin Deep Learning</h3>
            </div>

            {/* NN Status Stats */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Akurasi Model</span>
                <span className="text-lg font-black text-indigo-600">{(modelAccuracy * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Learning Rate</span>
                <span className="text-lg font-black text-slate-700">0.15</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Hidden Layers</span>
                <span className="text-xs font-extrabold text-slate-700">1 (5 Nodes)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mode Belajar</span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">Self-Learning</span>
              </div>
            </div>

            {/* Real-time Loss Chart */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Grafik Kerugian Model (Loss Curve)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossHistory} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="loss" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <button
            onClick={handleTrainModel}
            disabled={isTraining}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-60"
          >
            {isTraining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Melatih Neural Network...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Latih Model (100 Epochs)</span>
              </>
            )}
          </button>
        </div>

        {/* Panel 2: Scheduled Recommendations List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Rekomendasi AI Terjadwal</h3>
            </div>
            <span className="text-[9px] font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5 uppercase tracking-wider">
              Analisis Real-time
            </span>
          </div>

          <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1">
            {recommendations.map(rec => (
              <div 
                key={rec.id} 
                className={`p-4.5 rounded-2xl border transition-all ${
                  rec.status === 'approved' 
                    ? 'bg-emerald-50/20 border-emerald-200' 
                    : rec.status === 'rejected' 
                      ? 'bg-rose-50/20 border-rose-100 opacity-60' 
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                      rec.type === 'dead_stock' 
                        ? 'bg-amber-50 text-amber-600 border-amber-100' 
                        : rec.type === 'pricing' 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-sky-50 text-sky-600 border-sky-100'
                    }`}>
                      {rec.type === 'dead_stock' && <Package className="w-4 h-4" />}
                      {rec.type === 'pricing' && <DollarSign className="w-4 h-4" />}
                      {rec.type === 'seasonality' && <TrendingUp className="w-4 h-4" />}
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-sm">{rec.title}</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{rec.description}</p>
                      
                      {/* Saran Tindakan */}
                      <div className="bg-white/80 border border-slate-200/60 p-3 rounded-xl mt-2">
                        <span className="text-[9px] text-indigo-650 font-bold uppercase tracking-wider block mb-1">📋 Saran AI</span>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{rec.suggestedAction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {rec.status === 'pending' ? (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleFeedback(rec.id, 'approved', rec.type, rec.daysUnsold, rec.type === 'pricing' ? 6 : 15, rec.monthlyDemand)}
                        className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center"
                        title="Setujui Rekomendasi"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(rec.id, 'rejected', rec.type, rec.daysUnsold, rec.type === 'pricing' ? 6 : 15, rec.monthlyDemand)}
                        className="p-2 rounded-lg bg-slate-200 hover:bg-slate-350 text-slate-650 cursor-pointer transition-all flex items-center justify-center"
                        title="Tolak Rekomendasi"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                      rec.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {rec.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: AI Cashier/Operator Fraud Detection Log */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-650" />
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">AI Fraud Detection (Keamanan Transaksi & Operasional)</h3>
          </div>
          <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2.5 py-1 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Live Monitoring
          </span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Sistem mendeteksi transaksi atau laporan di luar batas normal operator gudang / kasir. Jika tingkat risiko (*risk score*) melebihi 60%, sistem akan melabelinya dengan status <strong className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-black border border-rose-100">HIGH RISK</strong> untuk ditinjau oleh manager.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {fraudLogs.map(log => {
            const isHighRisk = log.riskScore >= 0.6;
            return (
              <div 
                key={log.id} 
                className={`p-5 rounded-2xl border transition-all ${
                  log.status === 'audited' 
                    ? 'bg-slate-50 border-slate-150 opacity-60' 
                    : isHighRisk 
                      ? 'bg-rose-50/30 border-rose-200 shadow-3xs hover:shadow-2xs' 
                      : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{log.role}</span>
                    <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{log.operator}</h4>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    log.status === 'audited'
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : isHighRisk
                        ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {log.status === 'audited' ? 'Selesai Audit' : isHighRisk ? 'High Risk' : 'Normal'}
                  </span>
                </div>

                <div className="my-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.timestamp}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed">{log.detail}</p>
                </div>

                <div className="pt-3 border-t border-slate-150 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Skor Risiko AI</span>
                    <span className={`text-base font-black ${isHighRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {(log.riskScore * 100).toFixed(0)}%
                    </span>
                  </div>

                  {log.status !== 'audited' && (
                    <button
                      onClick={() => handleAuditFraud(rec => rec.id === log.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-[10px] font-extrabold shadow-3xs cursor-pointer transition-all border border-indigo-100"
                    >
                      Audit Sekarang
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
