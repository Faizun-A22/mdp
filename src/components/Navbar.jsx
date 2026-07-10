import { 
  LayoutDashboard, 
  Layers, 
  Thermometer, 
  Wrench, 
  Activity, 
  Users, 
  LogOut, 
  Warehouse,
  FileSpreadsheet,
  X,
  Brain,
  MessageSquare
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, isSidebarOpen, setIsSidebarOpen }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock-pallet', name: 'Stock Pallet', icon: Layers },
    { id: 'outstanding', name: 'Outstanding PO (OS)', icon: FileSpreadsheet },
    { id: 'kiln-dry', name: 'Kiln Dry (KD)', icon: Thermometer },
    { id: 'materials', name: 'Bahan & Alat Kerja', icon: Wrench },
    { id: 'repairs', name: 'Repair Warehouse', icon: Activity },
    { id: 'ai-advisor', name: 'AI Advisor & Security', icon: Brain },
    { id: 'ai-chat', name: 'AIBOS Consultant', icon: MessageSquare },
  ];

  // Admin-only menu items
  if (user && user.role === 'admin') {
    menuItems.push({ id: 'users', name: 'Manajemen User', icon: Users });
  }

  return (
    <aside className={`fixed inset-y-0 left-0 w-80 md:w-72 bg-white border-r border-slate-200 flex flex-col h-screen shadow-2xl md:shadow-none z-50 md:sticky md:top-0 transition-transform duration-300 ease-in-out ${
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      {/* Brand Logo & Close Button */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 tracking-wide text-base md:text-sm leading-tight">CV MITRA DUNIA</h1>
            <p className="text-slate-500 font-bold text-[11px] md:text-[10px] tracking-widest uppercase">PALLETINDO</p>
          </div>
        </div>
        
        {/* Close Button on Mobile */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 md:hidden cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (setIsSidebarOpen) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-5 py-4 md:px-4 md:py-3 rounded-xl transition-all duration-200 font-semibold text-base md:text-sm text-left cursor-pointer border ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-100/70 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
              }`}
            >
              <Icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3 mb-4 px-2">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
            alt={user?.name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-100"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-base md:text-sm font-bold text-slate-700 truncate">{user?.name}</h4>
            <span className={`inline-flex px-2 py-0.5 mt-0.5 rounded-full text-[11px] md:text-[10px] font-bold uppercase tracking-wider ${
              user?.role === 'admin' 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {user?.role === 'admin' ? '🛡️ Admin' : '👁️ Viewer'}
            </span>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-250 hover:border-rose-200 text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50/50 transition-all duration-200 text-xs font-semibold cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Keluar Aplikasi
        </button>
      </div>
    </aside>
  );
}
