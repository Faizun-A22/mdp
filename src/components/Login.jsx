import React, { useState } from 'react';
import { storageAPI } from '../utils/storage';
import { Shield, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan Password harus diisi!');
      return;
    }

    const users = await storageAPI.getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      storageAPI.setCurrentUser(user);
      onLoginSuccess(user);
      setError('');
    } else {
      setError('Username atau Password salah!');
    }
  };

  const handleQuickLogin = async (role) => {
    const usernameMap = { admin: 'admin', user: 'user' };
    const passwordMap = { admin: 'admin', user: 'user' };
    
    const users = await storageAPI.getUsers();
    const user = users.find(u => u.username === usernameMap[role] && u.password === passwordMap[role]);
    
    if (user) {
      storageAPI.setCurrentUser(user);
      onLoginSuccess(user);
    }
  };

  return (
    <div className="flex items-center justify-center bg-slate-50 px-4 py-12 min-h-screen relative overflow-hidden">
      {/* Light gradient decoration */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] rounded-full bg-indigo-100/50 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200/60 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-wide">CV MITRA DUNIA PALLETINDO</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Sistem Administrasi Warehouse & Kiln Dry</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-2 animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-600 text-sm font-semibold mb-2" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all duration-300 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            Masuk ke Aplikasi
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4">Masuk Cepat (Demo Peran)</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100/70 text-indigo-600 text-xs font-bold border border-indigo-100 transition-all duration-300 cursor-pointer"
            >
              🛡️ Role Admin
            </button>
            <button
              onClick={() => handleQuickLogin('user')}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-600 text-xs font-bold border border-slate-200 transition-all duration-300 cursor-pointer"
            >
              👁️ Role User (Viewer)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
