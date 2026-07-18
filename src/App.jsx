import React, { useState, useEffect, useMemo } from 'react';
import { storageAPI } from './utils/storage';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import StockPallet from './components/StockPallet';
import Outstanding from './components/Outstanding';
import KilnDry from './components/KilnDry';
import Materials from './components/Materials';
import Repairs from './components/Repairs';
import UserManagement from './components/UserManagement';
import SpreadsheetView from './components/SpreadsheetView';
import { Menu, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import useStickyState from './utils/useStickyState';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'stock-pallet', 'outstanding', 'spreadsheet', 'kiln-dry', 'materials', 'repairs', 'users'];
    if (hash && validTabs.includes(hash)) {
      return hash;
    }
    const sticky = window.sessionStorage.getItem('mdp_active_tab');
    if (sticky) {
      try {
        const parsed = JSON.parse(sticky);
        if (validTabs.includes(parsed)) return parsed;
      } catch (e) {}
    }
    return 'dashboard';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [syncState, setSyncState] = useState(null);

  // Listen for Google Sheets sync status updates
  useEffect(() => {
    let successTimeout;
    const handleSyncStatus = (e) => {
      const { status, message, month, year } = e.detail;
      setSyncState({ status, message, month, year });
      
      if (status === 'success') {
        if (successTimeout) clearTimeout(successTimeout);
        successTimeout = setTimeout(() => {
          setSyncState(null);
        }, 3000);
      }
    };
    
    window.addEventListener('mdp_sheets_sync_status', handleSyncStatus);
    return () => {
      window.removeEventListener('mdp_sheets_sync_status', handleSyncStatus);
      if (successTimeout) clearTimeout(successTimeout);
    };
  }, []);

  // Sync activeTab with hash and sessionStorage
  useEffect(() => {
    window.sessionStorage.setItem('mdp_active_tab', JSON.stringify(activeTab));
    if (window.location.hash !== `#${activeTab}`) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Listen to browser/mobile back and forward button navigation (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['dashboard', 'stock-pallet', 'outstanding', 'spreadsheet', 'kiln-dry', 'materials', 'repairs', 'users'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
      
      // Saat tombol back ditekan di HP, buka sidebar navigasi agar lebih mudah
      setIsSidebarOpen(true);
    };
    
    // Trik agar saat di halaman awal, menekan back tidak langsung keluar web
    if (window.history.length === 1 || window.history.state === null) {
      window.history.pushState({ page: 'init' }, '', window.location.href);
    }
    
    const handlePopState = (e) => {
      // Jika user mencoba back tapi tidak ada history (bisa keluar web), tahan dan buka navigasi
      if (e.state === null) {
        setIsSidebarOpen(true);
        // Push state lagi agar back selanjutnya tetap tidak keluar web
        window.history.pushState({ page: 'init' }, '', window.location.href);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const initApp = async () => {
      // Initialize LocalStorage with mock data on first load
      await storageAPI.init();
      
      // Check if user is already logged in
      const user = storageAPI.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Auto-sync Google Sheets on app startup/login for current month/year
  useEffect(() => {
    if (currentUser) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      const timer = setTimeout(() => {
        import('./utils/googleSheetsSync').then(({ syncMonthToGoogleSheets }) => {
          syncMonthToGoogleSheets(month, year).catch(console.error);
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard'); // Default to dashboard on login
  };

  const handleLogout = () => {
    storageAPI.setCurrentUser(null);
    setCurrentUser(null);
  };

  // Memoize active component to prevent laggy sidebar toggles
  const memoizedContent = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'stock-pallet':
        return <StockPallet user={currentUser} />;
      case 'outstanding':
        return <Outstanding user={currentUser} />;
      case 'kiln-dry':
        return <KilnDry user={currentUser} />;
      case 'materials':
        return <Materials user={currentUser} />;
      case 'repairs':
        return <Repairs user={currentUser} />;
      case 'users':
        return currentUser && currentUser.role === 'admin' ? <UserManagement /> : <Dashboard />;
      case 'spreadsheet':
        return <SpreadsheetView user={currentUser} />;
      default:
        return <Dashboard />;
    }
  }, [activeTab, currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin"></div>
          <span className="text-slate-500 font-semibold text-sm">Memuat aplikasi...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex bg-[#f8fafc] min-h-screen text-slate-700 antialiased overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={currentUser} 
        onLogout={handleLogout} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-y-auto w-full">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 md:p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 md:hidden cursor-pointer transition-all shadow-sm"
            >
              <Menu className="w-6 h-6 md:w-5 md:h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest hidden xs:block">Aplikasi Warehouse</span>
              <span className="text-slate-300 font-medium hidden xs:block">/</span>
              <span className="text-indigo-650 text-xs font-bold uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/80">
                {activeTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Cabang</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sidoarjo, Jawa Timur</span>
            </div>
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard/Tab Page Content Wrapper */}
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-16">
          <ErrorBoundary>
            {memoizedContent}
          </ErrorBoundary>
        </div>
      </main>

      {/* FLOATING SYNC TOAST */}
      {syncState && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {syncState.status === 'syncing' ? (
            <>
              <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl border border-indigo-100 flex items-center justify-center animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-slate-800 text-xs">Sinkronisasi Google Sheets</h5>
                <p className="text-slate-400 text-[10px] font-semibold">Mengunggah mutasi bulan ke-{syncState.month}...</p>
              </div>
            </>
          ) : syncState.status === 'success' ? (
            <>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-slate-800 text-xs">Sinkronisasi Sukses</h5>
                <p className="text-slate-400 text-[10px] font-semibold">Google Sheets mutasi berhasil diperbarui!</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-slate-800 text-xs">Sinkronisasi Gagal</h5>
                <p className="text-slate-500 text-[10px] font-semibold truncate" title={syncState.message}>
                  {syncState.message || 'Koneksi error.'}
                </p>
              </div>
              <button 
                onClick={() => setSyncState(null)} 
                className="text-[10px] text-slate-400 hover:text-slate-655 font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white shadow-xs cursor-pointer whitespace-nowrap"
              >
                Tutup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
