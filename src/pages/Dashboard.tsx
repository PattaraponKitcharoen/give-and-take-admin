export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมระบบ (Overview)</h2>
      
      {/* 🟢 แผงการ์ดสถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold tracking-wide">ผู้ใช้งานทั้งหมด</h3>
          <p className="text-4xl font-black text-gray-800 mt-2">1,204</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold tracking-wide">การแลกเปลี่ยนสำเร็จ</h3>
          <p className="text-4xl font-black text-green-500 mt-2">856</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold tracking-wide">รอตรวจสอบ (ข้อพิพาท)</h3>
          <p className="text-4xl font-black text-red-500 mt-2">12</p>
        </div>
      </div>

      {/* 🟢 พื้นที่สำหรับใส่ตารางในอนาคต */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">เดี๋ยวเรามาต่อตารางข้อมูลล่าสุดตรงนี้กันครับ</p>
      </div>
    </div>
  );
}