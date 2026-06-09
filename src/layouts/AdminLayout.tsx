import { Outlet, Link } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* 🟢 Sidebar ด้านซ้าย */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-black text-primaryTeal">Give & Take <span className="text-gray-400 font-medium text-sm ml-1">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl bg-teal-50 text-primaryTeal">
            📊 Dashboard
          </Link>
          <Link to="/users" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            👥 จัดการผู้ใช้
          </Link>
          <Link to="/reports" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            ⚠️ จัดการข้อพิพาท
          </Link>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            🚪 ล็อกเอาต์
          </button>
        </div>
      </aside>

      {/* 🟢 พื้นที่หลักด้านขวา */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Admin_Nus</span>
            <div className="w-9 h-9 bg-primaryTeal rounded-full flex items-center justify-center text-white font-bold shadow-sm">
              N
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
          {/* <Outlet /> คือจุดที่เนื้อหาของแต่ละหน้าจะมาโผล่ตรงนี้ */}
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}