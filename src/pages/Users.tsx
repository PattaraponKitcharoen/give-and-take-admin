import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
  updated_at_string?: string;
  updated_at_ms?: number;
}

interface ListingData {
  id: string;
  title: string;
  status: string;
  estimated_coins: number;
}

interface ReviewData {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  transaction_id: string;
  target_item_title?: string;
  target_item_id?: string;
  reviewer_item_title?: string;
  reviewer_item_id?: string;
}

// 🟢 1. สร้าง Interface สำหรับเก็บข้อมูลสิ่งของแบบเต็ม
interface FullListingData {
  id: string;
  title: string;
  category: string;
  description: string;
  estimated_coins: number;
  condition: string;
  owner_id: string;
  owner_name: string;
  status: string;
  thumbnail_url: string;
  province: string;
  updated_at_string: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [modalView, setModalView] = useState<'profile' | 'items' | 'reviews'>('profile');
  const [userItems, setUserItems] = useState<ListingData[]>([]);
  const [userReviews, setUserReviews] = useState<ReviewData[]>([]);
  const [isFetchingExtra, setIsFetchingExtra] = useState(false);

  const [itemFilter, setItemFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'coins' | 'updated_at' | null, direction: 'asc' | 'desc' }>({
    key: 'updated_at',
    direction: 'desc'
  });

  // 🟢 2. State สำหรับหน้าต่างโชว์รายละเอียดสิ่งของ
  const [selectedItemDetail, setSelectedItemDetail] = useState<FullListingData | null>(null);
  const [isFetchingItem, setIsFetchingItem] = useState(false);

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
          formattedDate = data.created_at.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        let updatedDate = 'ไม่ระบุ';
        let updatedMs = 0;
        if (data.updated_at) {
          const dateObj = data.updated_at.toDate();
          updatedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          updatedMs = dateObj.getTime();
        } else if (data.created_at) {
          const dateObj = data.created_at.toDate();
          updatedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
          updatedMs = dateObj.getTime();
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
          rating_scores: data.rating_scores || 0,
          rating_count: data.rating_count || 0,
          created_at_string: formattedDate,
          location_name: data.location?.display_name || 'ไม่ระบุตำแหน่ง',
          updated_at_string: updatedDate,
          updated_at_ms: updatedMs,
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
      await updateDoc(userRef, { [field]: value, updated_at: new Date() });
      
      const now = new Date();
      const updatedStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      setUsers(users.map(u => u.id === userId ? { ...u, [field]: value, updated_at_string: updatedStr, updated_at_ms: now.getTime() } : u));
      if (selectedUser) setSelectedUser({ ...selectedUser, [field]: value, updated_at_string: updatedStr });
      alert('อัปเดตสถานะสำเร็จ!');
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFetchUserItems = async (userId: string) => {
    setModalView('items');
    setIsFetchingExtra(true);
    setItemFilter('all'); 
    try {
      const q = query(collection(db, 'listings'), where('owner_id', '==', userId));
      const querySnapshot = await getDocs(q);
      const items: ListingData[] = [];
      querySnapshot.forEach(doc => {
        items.push({ id: doc.id, title: doc.data().title || doc.data().metadata?.title || 'ไม่มีชื่อ', status: doc.data().status || 'active', estimated_coins: doc.data().estimated_coins || 0 });
      });
      setUserItems(items);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsFetchingExtra(false);
    }
  };

  const handleFetchUserReviews = async (userId: string) => {
    setModalView('reviews');
    setIsFetchingExtra(true);
    try {
      const q = query(collection(db, 'reviews'), where('target_id', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const reviewsData: ReviewData[] = await Promise.all(
        querySnapshot.docs.map(async (reviewDoc) => {
          const revData = reviewDoc.data();
          const reviewerId = revData.reviewer_id || '';
          const transactionId = revData.transaction_id || '';
          
          let reviewerName = 'ผู้ใช้ไม่ทราบชื่อ';
          let targetItemTitle = 'สิ่งของถูกลบไปแล้ว';
          let targetItemId = '';
          let reviewerItemTitle = 'จ่ายด้วยเหรียญ Coins'; 
          let reviewerItemId = '';

          if (reviewerId) {
            const userSnap = await getDoc(doc(db, 'users', reviewerId));
            if (userSnap.exists()) reviewerName = userSnap.data().name || 'ไม่มีชื่อ';
          }

          if (transactionId) {
            const txSnap = await getDoc(doc(db, 'transactions', transactionId));
            if (txSnap.exists()) {
              const txData = txSnap.data();
              const listingIds: string[] = txData.listings || [];
              
              for (const listingId of listingIds) {
                const listingSnap = await getDoc(doc(db, 'listings', listingId));
                if (listingSnap.exists()) {
                  const listingData = listingSnap.data();
                  const listingTitle = listingData.title || listingData.metadata?.title || 'ไม่มีชื่อสิ่งของ';
                  
                  if (listingData.owner_id === userId) {
                    targetItemTitle = listingTitle;
                    targetItemId = listingId;
                  } else {
                    reviewerItemTitle = listingTitle;
                    reviewerItemId = listingId;
                  }
                }
              }
            }
          }

          return {
            id: reviewDoc.id,
            reviewer_id: reviewerId,
            reviewer_name: reviewerName,
            rating: revData.rating || 0,
            comment: revData.comment || '',
            transaction_id: transactionId,
            target_item_title: targetItemTitle,
            target_item_id: targetItemId,
            reviewer_item_title: reviewerItemTitle,
            reviewer_item_id: reviewerItemId,
          };
        })
      );
      
      setUserReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsFetchingExtra(false);
    }
  };

  // 🟢 ฟังก์ชันสำหรับดึงและแสดงข้อมูลสิ่งของแบบเจาะลึก
  const handleViewItemDetail = async (itemId: string) => {
    setIsFetchingItem(true);
    try {
      const itemSnap = await getDoc(doc(db, 'listings', itemId));
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        const meta = data.metadata || {}; // เตรียมไว้ดึงแค่ condition
        
        // จัดการวันที่ (ดึงจากด้านนอก)
        let updatedDate = 'ไม่ระบุ';
        if (data.updated_at) {
          updatedDate = data.updated_at.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else if (data.created_at) {
          updatedDate = data.created_at.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // ดึง owner_id จากด้านนอกสุด
        const ownerId = data.owner_id || '';
        let fetchedOwnerName = 'ไม่ทราบชื่อ';

        // วิ่งไปหาชื่อเจ้าของจากตาราง users
        if (ownerId) {
          const userSnap = await getDoc(doc(db, 'users', ownerId));
          if (userSnap.exists()) {
            fetchedOwnerName = userSnap.data().name || 'ไม่มีชื่อ';
          }
        }

        setSelectedItemDetail({
          id: itemSnap.id,
          title: data.title || 'ไม่มีชื่อ', // ดึงจากด้านนอก
          category: data.category || 'ไม่ระบุหมวดหมู่', // ดึงจากด้านนอก
          description: data.description || 'ไม่มีคำอธิบาย', // ดึงจากด้านนอก
          estimated_coins: data.estimated_coins || 0, // ดึงจากด้านนอก
          condition: meta.condition || data.condition || 'ไม่ระบุสภาพ', // 🟢 ตัวเดียวที่ดึงจาก metadata
          owner_id: ownerId, // ดึงจากด้านนอก
          owner_name: fetchedOwnerName, // ชื่อที่เพิ่ง Fetch มาได้
          status: data.status || 'active', // ดึงจากด้านนอก
          thumbnail_url: data.thumbnail_url || '', // ดึงจากด้านนอก
          province: data.location?.province || 'ไม่ระบุพิกัด',
          updated_at_string: updatedDate,
        });
      } else {
        alert('ไม่พบข้อมูลสิ่งของนี้ในระบบ');
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลสิ่งของ:", error);
    } finally {
      setIsFetchingItem(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalView('profile'); 
  };

  const handleSort = (key: 'coins' | 'updated_at') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedUsers = useMemo(() => {
    let result = users.filter(user => {
      const term = searchTerm.toLowerCase();
      return (
        user.name.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'coins') {
          return sortConfig.direction === 'asc' ? a.coins_balance - b.coins_balance : b.coins_balance - a.coins_balance;
        } else if (sortConfig.key === 'updated_at') {
          const timeA = a.updated_at_ms || 0;
          const timeB = b.updated_at_ms || 0;
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return 0;
      });
    }

    return result;
  }, [users, searchTerm, sortConfig]);

  const filteredItems = itemFilter === 'all' ? userItems : userItems.filter(item => item.status === itemFilter);

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้ (Users)</h2>
        <span className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
          ผลลัพธ์การค้นหา: {processedUsers.length} คน
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-center">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="🔍 ค้นหาผู้ใช้ด้วย ชื่อบัญชี, ID บัญชี หรือ อีเมลติดต่อ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ข้อมูลผู้ใช้ / ID</th>
                <th className="px-6 py-4">สถานะบัญชี</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                  onClick={() => handleSort('coins')}
                >
                  เหรียญสะสม {sortConfig.key === 'coins' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="text-gray-300 group-hover:text-gray-400">↕</span>}
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                  onClick={() => handleSort('updated_at')}
                >
                  อัปเดตล่าสุด {sortConfig.key === 'updated_at' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="text-gray-300 group-hover:text-gray-400">↕</span>}
                </th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
              ) : processedUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">ไม่พบข้อมูลผู้ใช้งานที่ตรงตามเงื่อนไข</td></tr>
              ) : (
                processedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.is_verified && <span title="Verified Trader">✅</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">ID: {user.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.status === 'banned' ? 'ถูกระงับ' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-yellow-600 font-bold">{user.coins_balance} 🪙</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{user.updated_at_string}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setSelectedUser(user); setModalView('profile'); }}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-500/10 backdrop-blur-md px-4 transition-all">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {modalView !== 'profile' && (
                  <button onClick={() => setModalView('profile')} className="mr-2 text-teal-600 hover:text-teal-800">⬅️</button>
                )}
                {modalView === 'profile' && '🔎 ข้อมูลเชิงลึกของผู้ใช้'}
                {modalView === 'items' && '📦 รายการสิ่งของ'}
                {modalView === 'reviews' && '⭐ ประวัติรีวิว'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {modalView === 'profile' && (
                <>
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
                        ⭐ {(selectedUser.rating_scores ?? 0) > 0 ? (selectedUser.rating_scores ?? 0).toFixed(1) : 'New'}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {(selectedUser.rating_count ?? 0) > 0 ? `จาก ${selectedUser.rating_count} รีวิว` : 'ยังไม่มีรีวิว'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-y border-gray-100 py-4">
                    <button 
                      onClick={() => handleFetchUserItems(selectedUser.id)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-200 transition-colors"
                    >
                      <span className="text-xl mb-1">📦</span>
                      <span className="text-sm font-semibold text-gray-700">ดูสิ่งของทั้งหมด</span>
                    </button>
                    <button 
                      onClick={() => handleFetchUserReviews(selectedUser.id)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 bg-white hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
                    >
                      <span className="text-xl mb-1">⭐</span>
                      <span className="text-sm font-semibold text-gray-700">ประวัติรีวิว</span>
                    </button>
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
                    <div className="p-3 bg-teal-50/40 rounded-xl border border-teal-100 col-span-2">
                      <span className="text-xs text-teal-600/80 block mb-0.5">แก้ไขข้อมูลโปรไฟล์ล่าสุดเมื่อ</span>
                      <span className="text-sm font-semibold text-teal-800">{selectedUser.updated_at_string}</span>
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
                </>
              )}

              {modalView === 'items' && (
                <div>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setItemFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${itemFilter === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>ทั้งหมด</button>
                    <button onClick={() => setItemFilter('active')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${itemFilter === 'active' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>กำลังแลก (Active)</button>
                    <button onClick={() => setItemFilter('completed')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${itemFilter === 'completed' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>เสร็จสิ้น (Completed)</button>
                  </div>

                  {isFetchingExtra ? (
                    <p className="text-center text-gray-400 py-10">กำลังค้นหาสิ่งของ...</p>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-center text-gray-400 py-10">ไม่พบสิ่งของในหมวดหมู่นี้</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredItems.map(item => (
                        <div key={item.id} className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-gray-50">
                          <div>
                            <p className="font-bold text-gray-800">{item.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-md mt-1 inline-block font-medium ${item.status === 'active' ? 'bg-blue-100 text-blue-800' : item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>สถานะ: {item.status}</span>
                          </div>
                          {/* 🟢 4. แก้ไขปุ่มเป็นให้กดเปิดหน้าต่างข้อมูลสิ่งของได้ */}
                          <button 
                            onClick={() => handleViewItemDetail(item.id)}
                            className="px-3 py-1.5 bg-white border border-teal-200 text-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-50"
                          >
                            ดูรายละเอียด
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalView === 'reviews' && (
                <div>
                  {isFetchingExtra ? (
                    <p className="text-center text-gray-400 py-10">กำลังโหลดรีวิว...</p>
                  ) : userReviews.length === 0 ? (
                    <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติรีวิว</p>
                  ) : (
                    <div className="space-y-4">
                      {userReviews.map(review => (
                        <div key={review.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800">{review.reviewer_name}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">ID: {review.reviewer_id}</p>
                            </div>
                            <span className="text-amber-500 font-bold text-sm bg-amber-50 px-2 py-1 rounded-md">⭐ {review.rating}</span>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm mb-3">
                            <p className="font-semibold text-gray-500 text-xs mb-2">📦 รายการที่แลกเปลี่ยน:</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600"><span className="font-semibold">{selectedUser?.name}</span> ให้: <span className="text-gray-800 font-medium">{review.target_item_title}</span></span>
                                {/* 🟢 5. เพิ่มปุ่มกดให้ตรวจสอบสิ่งของในรีวิวได้ */}
                                {review.target_item_id && (
                                  <button onClick={() => handleViewItemDetail(review.target_item_id!)} className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">รายละเอียด</button>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600"><span className="font-semibold">{review.reviewer_name}</span> ให้: <span className="text-gray-800 font-medium">{review.reviewer_item_title}</span></span>
                                {review.reviewer_item_id && (
                                  <button onClick={() => handleViewItemDetail(review.reviewer_item_id!)} className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">รายละเอียด</button>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 italic border-l-4 border-teal-200 pl-3">"{review.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 🟢 6. เพิ่ม Modal สำหรับดูรายละเอียดสิ่งของ (ซ้อนทับ Modal หลัก) */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-800/40 backdrop-blur-sm px-4 transition-all">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                🔎 ตรวจสอบสิ่งของ (Item Inspection)
              </h3>
              <button onClick={() => setSelectedItemDetail(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isFetchingItem ? (
                <div className="py-10 text-center text-gray-400">กำลังโหลดข้อมูลสิ่งของ...</div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-6 mb-6">
                    <div className="w-full md:w-1/3">
                      {selectedItemDetail.thumbnail_url ? (
                        <img src={selectedItemDetail.thumbnail_url} alt="Thumbnail" className="w-full aspect-square rounded-xl object-cover border border-gray-200 shadow-sm" />
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border border-gray-200">
                          <span className="text-3xl mb-2">📦</span>
                          <span className="text-sm">ไม่มีรูปภาพ</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedItemDetail.title}</h4>
                        <span className="font-black text-xl text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">{selectedItemDetail.estimated_coins} 🪙</span>
                      </div>
                      
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 mb-4">
                        {selectedItemDetail.category}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">สภาพสินค้า:</span><span className="font-semibold text-gray-800">{selectedItemDetail.condition}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">พิกัดที่ตั้ง:</span><span className="font-semibold text-gray-800">{selectedItemDetail.province}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">อัปเดตล่าสุด:</span><span className="font-medium text-gray-800">{selectedItemDetail.updated_at_string}</span>
                        </div>
                        <div className="flex justify-between pb-2">
                          <span className="text-gray-500">เจ้าของโพสต์:</span><span className="font-bold text-teal-600">{selectedItemDetail.owner_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">รายละเอียด (Description)</h5>
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100 min-h-[100px] whitespace-pre-wrap">
                      {selectedItemDetail.description}
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}