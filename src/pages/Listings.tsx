import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ListingData {
  id: string;
  title: string;
  category: string;
  description: string;
  estimated_coins: number;
  condition: string;
  owner_id: string;
  owner_name?: string;
  status: string;
  thumbnail_url: string;
  is_deleted: boolean;
  province: string;
  created_at_string: string;
  updated_at_string: string;
  updated_at_ms: number;
}

// 🟢 1. เพิ่ม Interface สำหรับเก็บข้อมูล User
interface UserData {
  id: string;
  name: string;
  email: string;
  coins_balance: number;
  is_verified?: boolean;
  status?: string;
  tel?: string;
  bio?: string;
  profile_img_url?: string;
  rating_scores?: number;
  rating_count?: number;
  created_at_string?: string;
  location_name?: string;
}

export default function Listings() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<ListingData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🟢 2. State สำหรับแสดงหน้าต่าง User Modal
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'banned'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [sortConfig, setSortConfig] = useState<{ key: 'coins' | 'date' | null, direction: 'asc' | 'desc' }>({ 
    key: 'date', 
    direction: 'desc' 
  });

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'listings'), limit(100));
      const querySnapshot = await getDocs(q);
      
      const fetchedData: ListingData[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          let formattedDate = 'ไม่ระบุ';
          if (data.created_at) {
            formattedDate = data.created_at.toDate().toLocaleDateString('th-TH', { 
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
          }

          let updatedDate = 'ไม่ระบุ';
          let updatedMs = 0;
          if (data.updated_at) {
            const dateObj = data.updated_at.toDate();
            updatedDate = dateObj.toLocaleDateString('th-TH', { 
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            updatedMs = dateObj.getTime();
          }

          let ownerName = 'ไม่ทราบชื่อ';
          if (data.owner_id) {
            const userSnap = await getDoc(doc(db, 'users', data.owner_id));
            if (userSnap.exists()) {
              ownerName = userSnap.data().name || 'ไม่มีชื่อ';
            }
          }

          return {
            id: docSnap.id,
            title: data.title || 'ไม่มีชื่อสิ่งของ',
            category: data.category || 'ไม่ระบุหมวดหมู่',
            description: data.description || 'ไม่มีคำอธิบาย',
            estimated_coins: data.estimated_coins || 0,
            condition: data.metadata?.condition || data.condition || 'ไม่ระบุสภาพ',
            owner_id: data.owner_id || '',
            owner_name: ownerName,
            status: data.status || 'active',
            thumbnail_url: data.thumbnail_url || '',
            is_deleted: data.is_deleted || false,
            province: data.location?.province || 'ไม่ระบุพิกัด',
            created_at_string: formattedDate,
            updated_at_string: updatedDate,
            updated_at_ms: updatedMs,
          };
        })
      );
      
      setListings(fetchedData);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลสิ่งของ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateListingStatus = async (listingId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const listingRef = doc(db, 'listings', listingId);
      await updateDoc(listingRef, { status: newStatus }); 
      
      setListings(listings.map(item => item.id === listingId ? { ...item, status: newStatus } : item));
      if (selectedItem) setSelectedItem({ ...selectedItem, status: newStatus });
      alert(`อัปเดตสถานะเป็น ${newStatus} สำเร็จ!`);
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setIsUpdating(false);
    }
  };

  // 🟢 3. ฟังก์ชันดึงข้อมูล User เมื่อถูกกดคลิก
  const handleViewUser = async (userId: string) => {
    setIsFetchingUser(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const data = userSnap.data();
        let formattedDate = 'ไม่ระบุ';
        if (data.created_at) {
          formattedDate = data.created_at.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        setSelectedUser({
          id: userSnap.id,
          name: data.name || 'ไม่มีชื่อ',
          email: data.email || 'ไม่มีอีเมล',
          coins_balance: data.coins_balance || 0,
          is_verified: data.is_verified || false,
          status: data.status || 'active',
          tel: data.tel || '-',
          bio: data.bio || 'ไม่มีคำอธิบายโปรไฟล์',
          profile_img_url: data.profile_img_url || '',
          rating_scores: data.rating_scores || 0,
          rating_count: data.rating_count || 0,
          created_at_string: formattedDate,
          location_name: data.location?.display_name || '-',
        });
      } else {
        alert('ไม่พบข้อมูลผู้ใช้นี้ในระบบ');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingUser(false);
    }
  };

  const handleSort = (key: 'coins' | 'date') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedListings = useMemo(() => {
    let result = listings.filter(item => {
      const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchSearch && matchStatus && matchCategory;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'coins') {
          return sortConfig.direction === 'asc' 
            ? a.estimated_coins - b.estimated_coins 
            : b.estimated_coins - a.estimated_coins;
        } else if (sortConfig.key === 'date') {
          return sortConfig.direction === 'asc' 
            ? a.updated_at_ms - b.updated_at_ms 
            : b.updated_at_ms - a.updated_at_ms;
        }
        return 0;
      });
    }

    return result;
  }, [listings, searchTerm, filterStatus, filterCategory, sortConfig]);

  const stats = {
    total: listings.length,
    active: listings.filter(i => i.status === 'active').length,
    banned: listings.filter(i => i.status === 'banned').length,
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการสิ่งของ (Listings Moderation)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-sm text-gray-500 font-semibold">สิ่งของทั้งหมด</p><p className="text-2xl font-black text-gray-800">{stats.total}</p></div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-xl">📦</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-sm text-gray-500 font-semibold">กำลังเปิดแลก (Active)</p><p className="text-2xl font-black text-green-600">{stats.active}</p></div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg text-xl">✨</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-sm text-gray-500 font-semibold">ถูกระงับ (Banned)</p><p className="text-2xl font-black text-red-600">{stats.banned}</p></div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xl">🚫</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="🔍 ค้นหาชื่อสิ่งของ หรือ ชื่อเจ้าของ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">เปิดแลก (Active)</option>
          <option value="completed">แลกสำเร็จ (Completed)</option>
          <option value="banned">ถูกระงับ (Banned)</option>
        </select>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">ทุกหมวดหมู่</option>
          <option value="อุปกรณ์ไอที & แก็ดเจ็ต">อุปกรณ์ไอที & แก็ดเจ็ต</option>
          <option value="แฟชั่น & เครื่องแต่งกาย">แฟชั่น & เครื่องแต่งกาย</option>
          <option value="อื่นๆ (Miscellaneous)">อื่นๆ (Miscellaneous)</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ข้อมูลสิ่งของ</th>
                <th className="px-6 py-4">หมวดหมู่ & สภาพ</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort('coins')}
                >
                  ราคาประเมิน {sortConfig.key === 'coins' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="text-gray-300 group-hover:text-gray-500">↕</span>}
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleSort('date')}
                >
                  อัปเดตล่าสุด {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="text-gray-300 group-hover:text-gray-500">↕</span>}
                </th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">กำลังโหลดข้อมูลสิ่งของ...</td></tr>
              ) : processedListings.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">ไม่พบสิ่งของที่ตรงกับเงื่อนไข</td></tr>
              ) : (
                processedListings.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="Item" className="h-12 w-12 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No img</div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 max-w-[200px] truncate">{item.title}</p>
                          {/* 🟢 4. เพิ่มปุ่มกดให้ที่ชื่อคนลงประกาศ */}
                          <p className="text-xs text-gray-500 mt-0.5">
                            โดย: <span 
                                  onClick={() => handleViewUser(item.owner_id)} 
                                  className="font-medium text-teal-600 hover:text-teal-800 hover:underline cursor-pointer transition-colors"
                                 >
                                   {item.owner_name}
                                 </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{item.category}</p>
                      <p className="text-xs text-gray-500 mt-0.5">สภาพ: {item.condition}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-yellow-600">{item.estimated_coins} 🪙</td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800">{item.updated_at_string}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'banned' ? 'bg-red-100 text-red-800' : 
                        item.status === 'completed' ? 'bg-gray-200 text-gray-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedItem(item)}
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

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-500/10 backdrop-blur-md px-4 transition-all">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                🔎 ตรวจสอบสิ่งของ (Item Inspection)
              </h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                <div className="w-full md:w-1/3">
                  {selectedItem.thumbnail_url ? (
                    <img src={selectedItem.thumbnail_url} alt="Thumbnail" className="w-full aspect-square rounded-xl object-cover border border-gray-200 shadow-sm" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border border-gray-200">
                      <span className="text-3xl mb-2">📦</span>
                      <span className="text-sm">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedItem.title}</h4>
                    <span className="font-black text-xl text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">{selectedItem.estimated_coins} 🪙</span>
                  </div>
                  
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 mb-4">
                    {selectedItem.category}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">สภาพสินค้า:</span><span className="font-semibold text-gray-800">{selectedItem.condition}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">พิกัดที่ตั้ง:</span><span className="font-semibold text-gray-800">{selectedItem.province}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">อัปเดตล่าสุด:</span><span className="font-medium text-gray-800">{selectedItem.updated_at_string}</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-gray-500">เจ้าของโพสต์:</span>
                      {/* 🟢 5. เพิ่มปุ่มกดให้ที่ชื่อคนลงประกาศในหน้าต่าง Modal ด้วย */}
                      <span 
                        onClick={() => handleViewUser(selectedItem.owner_id)}
                        className="font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                      >
                        {selectedItem.owner_name} <span className="text-xs text-gray-400 font-normal">(ID: {selectedItem.owner_id})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">รายละเอียด (Description)</h5>
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100 min-h-[100px] whitespace-pre-wrap">
                  {selectedItem.description}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">อำนาจจัดการโพสต์</h5>
              <div className="flex gap-3">
                {selectedItem.status !== 'banned' ? (
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateListingStatus(selectedItem.id, 'banned')}
                    className="flex-1 py-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm"
                  >
                    🚫 ระงับโพสต์นี้ (Ban Item)
                  </button>
                ) : (
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateListingStatus(selectedItem.id, 'active')}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm shadow-green-200"
                  >
                    ✅ ยกเลิกการระงับ (Unban)
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🟢 6. เพิ่ม User Modal (ซ้อนทับ Modal ด้านบนได้) */}
      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-800/40 backdrop-blur-sm px-4 transition-all">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                👤 ข้อมูลผู้ใช้
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6">
              {isFetchingUser ? (
                <div className="py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-gray-100">
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
                        ⭐ {(selectedUser.rating_scores ?? 0) > 0 ? (selectedUser.rating_scores ?? 0).toFixed(1) : 'New'}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {(selectedUser.rating_count ?? 0) > 0 ? `จาก ${selectedUser.rating_count} รีวิว` : 'ยังไม่มีรีวิว'}
                      </p>
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
                    <div className="p-3 bg-yellow-50/40 rounded-xl border border-yellow-100">
                      <span className="text-xs text-yellow-600/80 block mb-0.5">กระเป๋าเงินเหรียญ</span>
                      <span className="text-base font-black text-yellow-600">{selectedUser.coins_balance} 🪙</span>
                    </div>
                    <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                      <span className="text-xs text-blue-600/80 block mb-0.5">สถานะบัญชี</span>
                      <span className={`text-sm font-bold ${selectedUser.status === 'banned' ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedUser.status === 'banned' ? 'ถูกระงับ (Banned)' : 'ปกติ (Active)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}