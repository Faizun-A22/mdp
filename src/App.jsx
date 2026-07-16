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
import { Menu } from 'lucide-react';
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
    </div>
  );
}
