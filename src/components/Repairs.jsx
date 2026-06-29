import React, { useState, useEffect } from 'react';
import { storageAPI } from '../utils/storage';
import { Plus, Search, CheckCircle, AlertOctagon, RefreshCw, Trash2, Edit3, X, User } from 'lucide-react';

export default function Repairs({ user }) {
  const [repairs, setRepairs] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [palletTypeSearch, setPalletTypeSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    ukuran: '1000x1200 mm',
    qtySelesai: 0,
    catatan: ''
  });

  useEffect(() => {
    const loadRepairs = async () => {
      const reps = await storageAPI.getRepairs();
      const types = await storageAPI.getPalletTypes();
      setRepairs(reps);
      setPalletTypes(types);

      if (types.length > 0) {
        setFormData(prev => ({ ...prev, ukuran: types[0].ukuran }));
        setPalletTypeSearch(types[0].nama);
      }
    };
    loadRepairs();
  }, []);

  const isAdmin = user?.role === 'admin';

  const uniqueSizes = [
    '1000x1200 mm',
    '800x1200 mm',
    '1100x1100 mm',
    ...new Set(repairs.map(i => i.ukuran).filter(Boolean))
  ];

  // Stats calculations
  const totalRepaired = repairs.reduce((acc, curr) => acc + (curr.qtySelesai || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let updated;
    if (editingItem) {
      updated = repairs.map(item => item.id === editingItem.id ? { ...formData, id: item.id } : item);
    } else {
      updated = [{ ...formData, id: 'rep_' + Date.now() }, ...repairs];
    }

    setRepairs(updated);
    await storageAPI.saveRepairs(updated);
    closeModal();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    const match = palletTypes.find(pt => pt.ukuran === item.ukuran);
    setPalletTypeSearch(match ? match.nama : '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus log perbaikan warehouse ini?')) {
      const updated = repairs.filter(item => item.id !== id);
      setRepairs(updated);
      await storageAPI.saveRepairs(updated);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPalletTypeSearch(palletTypes[0]?.nama || '');
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      ukuran: palletTypes[0]?.ukuran || '1000x1200 mm',
      qtySelesai: 0,
      catatan: ''
    });
  };

  const filteredRepairs = repairs.filter(item => {
    return item.ukuran.toLowerCase().includes(search.toLowerCase()) || 
           (item.catatan && item.catatan.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Repair Warehouse</h2>
          <p className="text-slate-500 mt-1 font-medium">Pantau dan kelola pemulihan pallet rusak menjadi pallet layak kirim</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all border border-emerald-500/20 text-sm cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Input Log Perbaikan
          </button>
        )}
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card bg-white rounded-2xl p-4 flex items-center justify-between border-slate-100">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Selesai Diperbaiki</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{totalRepaired} Pcs</span>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass-card bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
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

      {/* Table */}
      <div className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-4 px-4">Tanggal</th>
                <th className="py-4 px-4">Ukuran Pallet</th>
                <th className="py-4 px-4 text-center text-emerald-600">QTY Selesai</th>
                <th className="py-4 px-4">Catatan</th>
                {isAdmin && <th className="py-4 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-400 font-medium">
                    Belum ada data aktivitas perbaikan warehouse.
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-all text-slate-600 font-medium whitespace-nowrap">
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-600 font-bold">{item.ukuran}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-extrabold text-emerald-600 bg-emerald-50/20">{item.qtySelesai} pcs</td>
                      <td className="py-4 px-4 text-slate-500 text-xs max-w-xs truncate">{item.catatan || '-'}</td>
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">{editingItem ? 'Edit Log Perbaikan' : 'Input Aktivitas Perbaikan Baru'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Jenis Pallet (Master)</label>
                <input
                  type="text"
                  placeholder="🔍 Ketik untuk cari Jenis Pallet..."
                  value={palletTypeSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPalletTypeSearch(val);
                    setShowDropdown(true);
                    const match = palletTypes.find(pt => pt.nama.toLowerCase() === val.toLowerCase());
                    if (match) {
                      setFormData(prev => ({ ...prev, ukuran: match.ukuran }));
                    }
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-855 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {palletTypes
                      .filter(pt => {
                        const matchType = palletTypes.find(p => p.ukuran === formData.ukuran);
                        const matchName = matchType ? matchType.nama : '';
                        if (!palletTypeSearch || palletTypeSearch === matchName) return true;
                        return pt.nama.toLowerCase().includes(palletTypeSearch.toLowerCase()) ||
                               pt.ukuran.toLowerCase().includes(palletTypeSearch.toLowerCase());
                      })
                      .map(pt => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              ukuran: pt.ukuran
                            }));
                            setPalletTypeSearch(pt.nama);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 text-slate-700 hover:text-slate-900 font-semibold transition-all border-b border-slate-100 last:border-none cursor-pointer flex justify-between items-center"
                        >
                          <span>{pt.nama}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-bold">{pt.ukuran}</span>
                        </button>
                      ))
                    }
                    {palletTypes.filter(pt => {
                      const matchType = palletTypes.find(p => p.ukuran === formData.ukuran);
                      const matchName = matchType ? matchType.nama : '';
                      if (!palletTypeSearch || palletTypeSearch === matchName) return true;
                      return pt.nama.toLowerCase().includes(palletTypeSearch.toLowerCase()) ||
                             pt.ukuran.toLowerCase().includes(palletTypeSearch.toLowerCase());
                    }).length === 0 && (
                      <div className="px-4 py-3 text-slate-400 text-xs text-center font-medium">
                        Jenis pallet tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ukuran Pallet (Otomatis)</label>
                  <input
                    type="text"
                    value={formData.ukuran}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">QTY Selesai Direpair</label>
                <input
                  type="number"
                  min="0"
                  value={formData.qtySelesai}
                  onChange={(e) => setFormData({ ...formData, qtySelesai: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Keterangan / Catatan</label>
                <textarea
                  placeholder="Kerusakan, detail penggantian kayu..."
                  rows="2"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
