import React, { useState, useEffect } from 'react';
import useStickyState from '../utils/useStickyState';
import { storageAPI } from '../utils/storage';
import { Plus, Trash2, Edit3, X, Shield, Eye, EyeOff, User } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useStickyState(false, 'um_isModalOpen');
  const [showPassword, setShowPassword] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [formData, setFormData] = useStickyState({
    name: '',
    username: '',
    password: '',
    role: 'user',
    avatar: ''
  }, 'um_formData');

  useEffect(() => {
    const loadUsers = async () => {
      const u = await storageAPI.getUsers();
      setUsers(u);
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert('Nama, Username, dan Password wajib diisi!');
      return;
    }

    const avatarUrl = formData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100`;

    const userWithAvatar = {
      ...formData,
      avatar: avatarUrl
    };

    let updated;
    if (editingItem) {
      updated = users.map(u => u.id === editingItem.id ? { ...userWithAvatar, id: u.id } : u);
    } else {
      if (users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
        alert('Username sudah terpakai!');
        return;
      }
      updated = [...users, { ...userWithAvatar, id: 'u_' + Date.now() }];
    }

    setUsers(updated);
    await storageAPI.saveUsers(updated);
    closeModal();
  };

  const handleEdit = (userItem) => {
    setEditingItem(userItem);
    setFormData({ ...userItem });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const currentUser = storageAPI.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif!');
      return;
    }

    if (window.confirm('Apakah Anda yakin ingin menghapus akun user ini?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      await storageAPI.deleteUser(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'user',
      avatar: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-wide">Manajemen User</h2>
          <p className="text-slate-500 mt-1 font-medium">Registrasikan operator baru dan atur izin akses (Hanya Admin)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-50 hover:to-indigo-50 text-white font-bold transition-all border border-indigo-500/20 text-sm cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" /> Daftarkan User Baru
        </button>
      </div>

      <div className="glass-card bg-white rounded-2xl overflow-hidden border border-slate-150">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Password (Mock)</th>
                <th className="py-4 px-6 text-center">Hak Akses / Peran</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-650 font-semibold">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-all text-slate-600 whitespace-nowrap">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-50"
                      />
                      <span className="font-bold text-slate-800 text-base">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-500">@{u.username}</td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-400">{u.password}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      u.role === 'admin' 
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {u.role === 'admin' ? (
                        <>
                          <Shield className="w-3.5 h-3.5" /> Admin Full
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5" /> Operator Viewer
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">{editingItem ? 'Edit Akun Operator' : 'Registrasi Akun Operator Baru'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  placeholder="contoh: budi_s"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  disabled={editingItem !== null}
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 4 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Hak Akses / Peran</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold cursor-pointer"
                >
                  <option value="user">Operator (Viewer / Read-Only)</option>
                  <option value="admin">Admin (Akses Penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">URL Foto Profil (Opsional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer">Simpan User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
