import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// กำหนดโครงสร้างข้อมูล User ที่จะดึงมาโชว์
interface UserData {
  id: string;
  name: string;
  email: string;
  coins_balance: number;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // 🟢 ดึงเฉพาะคนที่มี role เป็น 'user'
        const q = query(collection(db, 'users'), where('role', '==', 'user'));
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: UserData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({
            id: doc.id,
            name: doc.data().name || 'ไม่มีชื่อ',
            email: doc.data().email || 'ไม่มีอีเมล',
            coins_balance: doc.data().coins_balance || 0,
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
        <span className="bg-primaryTeal text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
          ผู้ใช้งานทั้งหมด: {users.length} คน
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ชื่อผู้ใช้</th>
                <th className="px-6 py-4">อีเมล</th>
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
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4 text-yellow-600 font-bold">{user.coins_balance} 🪙</td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-primaryTeal hover:text-teal-700 font-medium text-sm transition-colors">
                        ดูรายละเอียด
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