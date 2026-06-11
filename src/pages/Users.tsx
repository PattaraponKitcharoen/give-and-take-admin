import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// 🟢 1. อัปเดต Interface ให้ตรงกับฐานข้อมูลจริง
interface UserData {
  id: string;
  name: string;
  email: string;
  coins_balance: number;
  is_verified?: boolean; // ไม่มีใน DB จะถูกตั้งค่าเริ่มต้นเป็น false
  status?: string;       // ไม่มีใน DB จะถูกตั้งค่าเริ่มต้นเป็น active
  tel?: string;
  bio?: string;
  profile_img_url?: string;
  rating_scores?: number;
  rating_count?: number; // 🟢 เพิ่มจำนวนรีวิว
  created_at_string?: string;
  location_name?: string; // 🟢 เพิ่มตำแหน่งที่ตั้ง
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'), limit(100));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let formattedDate = 'ไม่ระบุ';
        if (data.created_at) {
          formattedDate = data.created_at.toDate().toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
          });
        }

        fetchedUsers.push({
          id: doc.id,
          name: data.name || 'ไม่มีชื่อ',
          email: data.email || 'ไม่มีอีเมล',
          coins_balance: data.coins_balance || 0,
          is_verified: data.is_verified || false,
          status: data.status || 'active',
          tel: data.tel || 'ยังไม่ได้ลงทะเบียน',
          bio: data.bio || 'ไม่มีคำอธิบายโปรไฟล์',
          profile_img_url: data.profile_img_url || '',
          // 🟢 2. ดึงค่าดาวและจำนวนรีวิวจาก DB จริง
          rating_scores: data.rating_scores || 0,
          rating_count: data.rating_count || 0,
          created_at_string: formattedDate,
          // 🟢 3. ดึงค่าชื่อสถานที่จาก Object location (ใส่ ? เผื่อกรณีคนที่ยังไม่เคยกดอัปเดตโลเคชั่น)
          location_name: data.location?.display_name || 'ไม่ระบุตำแหน่ง',
        });
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, field: string, value: any) => {
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { [field]: value });
      
      setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
      if (selectedUser) setSelectedUser({ ...selectedUser, [field]: value });
      
      alert('อัปเดตสถานะสำเร็จ!');
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้ (Users)</h2>
        <span className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
          ผู้ใช้งานทั้งหมด: {users.length} คน
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
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">ยังไม่มีข้อมูลผู้ใช้งานในระบบ</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.is_verified && <span title="Verified Trader">✅</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.status === 'banned' ? 'ถูกระงับ' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-yellow-600 font-bold">{user.coins_balance} 🪙</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="text-teal-600 hover:text-teal-800 font-bold text-sm bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
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

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-500/10 backdrop-blur-md px-4 transition-all">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                🔎 ตรวจสอบข้อมูลเชิงลึกของผู้ใช้
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                {selectedUser.profile_img_url ? (
                  <img src={selectedUser.profile_img_url} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-teal-500 shadow-sm" />
                ) : (
                  <div className="h-16 w-16 bg-teal-600 text-white rounded-full flex items-center justify-center text-2xl font-black">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-gray-900 truncate flex items-center gap-1.5">
                    {selectedUser.name}
                    {selectedUser.is_verified && <span className="text-sm">✅</span>}
                  </h4>
                  <p className="text-xs text-gray-400 truncate mt-0.5">UID: {selectedUser.id}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-amber-500 font-bold text-sm">
                    {/* 🟢 4. แสดงดาว และจำนวนรีวิวที่ถูกต้อง */}
                    ⭐ {(selectedUser.rating_scores ?? 0) > 0 ? (selectedUser.rating_scores ?? 0).toFixed(1) : 'New'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedUser.rating_count ?? 0) > 0 ? `จาก ${selectedUser.rating_count} รีวิว` : 'ยังไม่มีรีวิว'}
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">คำแนะนำตัวเอง / Bio</h5>
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 italic border border-gray-100">
                  "{selectedUser.bio}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-0.5">อีเมลติดต่อ</span>
                  <span className="text-sm font-semibold text-gray-800 break-all">{selectedUser.email}</span>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 block mb-0.5">เบอร์โทรศัพท์</span>
                  <span className="text-sm font-semibold text-gray-800">{selectedUser.tel}</span>
                </div>
                {/* 🟢 5. นำ Location มาแสดงผลแบบเต็มความกว้าง 2 คอลัมน์ */}
                <div className="p-3 bg-slate-50/50 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-xs text-gray-400 block mb-0.5">ตำแหน่งที่ตั้ง (Location)</span>
                  <span className="text-sm font-semibold text-gray-800">{selectedUser.location_name}</span>
                </div>
                <div className="p-3 bg-yellow-50/40 rounded-xl border border-yellow-100">
                  <span className="text-xs text-yellow-600/80 block mb-0.5">กระเป๋าเงินเหรียญ</span>
                  <span className="text-base font-black text-yellow-600">{selectedUser.coins_balance} 🪙</span>
                </div>
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-600/80 block mb-0.5">วันที่เข้าร่วมระบบ</span>
                  <span className="text-sm font-semibold text-blue-800">{selectedUser.created_at_string}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">แผงควบคุมสิทธิ์การใช้งาน</h5>
                
                <div className="flex gap-3">
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateUserStatus(selectedUser.id, 'is_verified', !selectedUser.is_verified)}
                    className={`flex-1 py-2.5 font-semibold rounded-xl text-sm transition-all border ${
                      selectedUser.is_verified 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                        : 'bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-sm shadow-blue-200'
                    }`}
                  >
                    {selectedUser.is_verified ? '🔓 ยกเลิกสถานะ Verified' : '🎖️ อนุมัติสิทธิ์ Verified'}
                  </button>

                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateUserStatus(selectedUser.id, 'status', selectedUser.status === 'banned' ? 'active' : 'banned')}
                    className={`flex-1 py-2.5 font-semibold rounded-xl text-sm transition-all border ${
                      selectedUser.status === 'banned' 
                        ? 'bg-green-600 text-white border-transparent hover:bg-green-700 shadow-sm shadow-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {selectedUser.status === 'banned' ? '✅ ปลดแบนคืนสิทธิ์' : '🚫 ระงับบัญชี (BAN)'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}