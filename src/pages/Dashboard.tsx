import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    trades: 0,
    disputes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        // 🟢 1. สร้างคำสั่ง Query ทั้ง 4 แบบเตรียมไว้
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
        const listingsQuery = query(collection(db, 'listings'), where('status', '==', 'active'));
        const tradesQuery = query(collection(db, 'offers'), where('status', '==', 'completed'));
        // สมมติว่าเรามีคอลเลกชัน reports สำหรับเก็บเรื่องร้องเรียน
        const disputesQuery = query(collection(db, 'reports'), where('status', '==', 'pending')); 

        // 🟢 2. ยิง Request ไปนับจำนวนพร้อมๆ กันทั้ง 4 ตัว (เพื่อความไว)
        const [usersSnap, listingsSnap, tradesSnap, disputesSnap] = await Promise.all([
          getCountFromServer(usersQuery),
          getCountFromServer(listingsQuery),
          getCountFromServer(tradesQuery),
          getCountFromServer(disputesQuery)
        ]);

        // 🟢 3. อัปเดตตัวเลขลง State
        setStats({
          users: usersSnap.data().count,
          listings: listingsSnap.data().count,
          trades: tradesSnap.data().count,
          disputes: disputesSnap.data().count,
        });

      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ภาพรวมระบบ (Overview)</h2>
      
      {/* 🟢 แผงการ์ดสถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* การ์ดที่ 1: ผู้ใช้งาน */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">ผู้ใช้งานทั้งหมด</h3>
            <div className="p-2 bg-blue-50 rounded-lg"><span className="text-xl">👥</span></div>
          </div>
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-gray-800 mt-2">{stats.users}</p>
          )}
        </div>

        {/* การ์ดที่ 2: สิ่งของในระบบ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">สิ่งของที่พร้อมแลก</h3>
            <div className="p-2 bg-teal-50 rounded-lg"><span className="text-xl">📦</span></div>
          </div>
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-primaryTeal mt-2">{stats.listings}</p>
          )}
        </div>
        
        {/* การ์ดที่ 3: แลกเปลี่ยนสำเร็จ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">การแลกเปลี่ยนสำเร็จ</h3>
            <div className="p-2 bg-green-50 rounded-lg"><span className="text-xl">🤝</span></div>
          </div>
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-green-500 mt-2">{stats.trades}</p>
          )}
        </div>
        
        {/* การ์ดที่ 4: ข้อพิพาท */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">รอตรวจสอบ (ข้อพิพาท)</h3>
            <div className="p-2 bg-red-50 rounded-lg"><span className="text-xl">⚠️</span></div>
          </div>
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-red-500 mt-2">{stats.disputes}</p>
          )}
        </div>

      </div>

      {/* 🟢 พื้นที่สำหรับใส่ตารางในอนาคต (เดี๋ยวค่อยมาเติม) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">รอใส่ตารางข้อมูลรายการล่าสุด...</p>
      </div>
    </div>
  );
}