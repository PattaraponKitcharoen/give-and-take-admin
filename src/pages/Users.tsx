import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore'; // 🟢 1. Import limit
import { db } from '../firebase/config';

// 🟢 2. อัปเดตโครงสร้างข้อมูลให้รองรับสถานะแอดมิน
interface UserData {
  id: string;
  name: string;
  email: string;
  coins_balance: number;
  is_verified?: boolean; // ยืนยันตัวตนด้วยบัตร ปชช. หรือยัง
  status?: string;       // active, suspended, banned
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // 🟢 3. ใส่ limit(100) เพื่อป้องกันการดึงข้อมูลมหาศาลรวดเดียว
        const q = query(
          collection(db, 'users'), 
          where('role', '==', 'user'),
          limit(100) 
        );
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: UserData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({
            id: doc.id,
            name: doc.data().name || 'ไม่มีชื่อ',
            email: doc.data().email || 'ไม่มีอีเมล',
            coins_balance: doc.data().coins_balance || 0,
            is_verified: doc.data().is_verified || false,
            status: doc.data().status || 'active',
          });
        });
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้ (Users)</h2>
        <span className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
          แสดง 100 รายการล่าสุด
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ชื่อผู้ใช้</th>
                <th className="px-6 py-4">สถานะบัญชี</th>
                <th className="px-6 py-4">เหรียญสะสม</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    ยังไม่มีข้อมูลผู้ใช้งานในระบบ
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {user.name}
                        {/* 🟢 โชว์ติ๊กถูกสีฟ้าถ้า Verified แล้ว */}
                        {user.is_verified && (
                          <span title="Verified Trader">✅</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {/* 🟢 Badge แสดงสถานะบัญชี */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'banned' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.status === 'banned' ? 'ถูกระงับ' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-yellow-600 font-bold">{user.coins_balance} 🪙</td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-teal-600 hover:text-teal-800 font-bold text-sm bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">
                        ตรวจสอบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}