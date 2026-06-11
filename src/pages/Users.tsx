import { useState, useEffect } from 'react';
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
          rating_scores: data.rating_scores || 0,
          rating_count: data.rating_count || 0,
          created_at_string: formattedDate,
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

  const handleFetchUserItems = async (userId: string) => {
    setModalView('items');
    setIsFetchingExtra(true);
    setItemFilter('all'); 
    try {
      const q = query(collection(db, 'listings'), where('owner_id', '==', userId));
      const querySnapshot = await getDocs(q);
      const items: ListingData[] = [];
      querySnapshot.forEach(doc => {
        items.push({ id: doc.id, title: doc.data().title, status: doc.data().status, estimated_coins: doc.data().estimated_coins || 0 });
      });
      setUserItems(items);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsFetchingExtra(false);
    }
  };

  // 🟢 ปรับปรุงฟังก์ชันให้ดึงชื่อสิ่งของจาก Array listings ในตาราง transactions
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
          let reviewerItemTitle = 'จ่ายด้วยเหรียญ Coins'; // เผื่อกรณีอีกฝั่งไม่มีสิ่งของ
          let reviewerItemId = '';

          // ดึงชื่อคนรีวิว
          if (reviewerId) {
            const userSnap = await getDoc(doc(db, 'users', reviewerId));
            if (userSnap.exists()) reviewerName = userSnap.data().name || 'ไม่มีชื่อ';
          }

          // ดึงข้อมูลการแลกเปลี่ยน
          if (transactionId) {
            const txSnap = await getDoc(doc(db, 'transactions', transactionId));
            if (txSnap.exists()) {
              const txData = txSnap.data();
              const listingIds: string[] = txData.listings || [];
              
              // ลูปเอา ID ไปค้นหาชื่อสิ่งของจากตาราง listings
              for (const listingId of listingIds) {
                const listingSnap = await getDoc(doc(db, 'listings', listingId));
                if (listingSnap.exists()) {
                  const listingData = listingSnap.data();
                  
                  // เช็กว่าของชิ้นนี้เป็นของใคร
                  if (listingData.owner_id === userId) {
                    targetItemTitle = listingData.title;
                    targetItemId = listingId;
                  } else {
                    reviewerItemTitle = listingData.title;
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

  const handleJumpToUser = async (userId: string) => {
    setIsFetchingExtra(true);
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
          bio: data.bio || '',
          profile_img_url: data.profile_img_url || '',
          rating_scores: data.rating_scores || 0,
          rating_count: data.rating_count || 0,
          created_at_string: formattedDate,
          location_name: data.location?.display_name || '-',
        });
        setModalView('profile');
      } else {
        alert('ไม่พบข้อมูลผู้ใช้นี้ในระบบ');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingExtra(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalView('profile'); 
  };

  const filteredItems = itemFilter === 'all' 
    ? userItems 
    : userItems.filter(item => item.status === itemFilter);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-500/10 backdrop-blur-md px-4 transition-all">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
            
            <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {modalView !== 'profile' && (
                  <button onClick={() => setModalView('profile')} className="mr-2 text-teal-600 hover:text-teal-800">
                    ⬅️
                  </button>
                )}
                {modalView === 'profile' && '🔎 ข้อมูลเชิงลึกของผู้ใช้'}
                {modalView === 'items' && '📦 รายการสิ่งของ'}
                {modalView === 'reviews' && '⭐ ประวัติรีวิว'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* === มุมมอง: หน้าโปรไฟล์ (Profile View) === */}
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

              {/* === มุมมอง: รายการสิ่งของ (Items View) === */}
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
                          <button 
                            onClick={() => alert(`คุณกำลังตรวจสอบสิ่งของ: ${item.title}\nID: ${item.id}`)}
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

              {/* === มุมมอง: ประวัติรีวิว (Reviews View) === */}
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
                                <button 
                                  onClick={() => handleJumpToUser(review.reviewer_id)}
                                  className="text-xs text-teal-600 hover:text-teal-800 underline font-semibold"
                                >
                                  (ดูโปรไฟล์)
                                </button>
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
                                {review.target_item_id && (
                                  <button onClick={() => alert(`คุณกำลังตรวจสอบสิ่งของ: ${review.target_item_title}\nID: ${review.target_item_id}`)} className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">รายละเอียด</button>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600"><span className="font-semibold">{review.reviewer_name}</span> ให้: <span className="text-gray-800 font-medium">{review.reviewer_item_title}</span></span>
                                {review.reviewer_item_id && (
                                  <button onClick={() => alert(`คุณกำลังตรวจสอบสิ่งของ: ${review.reviewer_item_title}\nID: ${review.reviewer_item_id}`)} className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">รายละเอียด</button>
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
    </div>
  );
}