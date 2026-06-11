import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  startAfter, 
  getDoc, 
  doc, 
  getCountFromServer,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface ListingData {
  id: string;
  title: string;
  category: string;
  estimated_coins: number;
  status: string;
  owner_name: string;
  created_at_string: string;
}

interface TransactionData {
  id: string;
  status: string;
  created_at_string: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    trades: 0,
    bannedListings: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 🟢 State สำหรับรายการสิ่งของล่าสุด
  const [listings, setListings] = useState<ListingData[]>([]);
  const [lastListingDoc, setLastListingDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // 🟢 State สำหรับรายการธุรกรรมล่าสุด
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [lastTxDoc, setLastTxDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreTxs, setHasMoreTxs] = useState(true);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchInitialListings();
    fetchInitialTransactions();
  }, []);

  // 1. ดึงข้อมูลตัวเลขสถิติภาพรวม
  const fetchStats = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
      const listingsQuery = query(collection(db, 'listings'), where('status', '==', 'active'));
      const tradesQuery = query(collection(db, 'transactions'), where('status', '==', 'completed'));
      const bannedQuery = query(collection(db, 'listings'), where('status', '==', 'banned')); 

      const [usersSnap, listingsSnap, tradesSnap, bannedSnap] = await Promise.all([
        getCountFromServer(usersQuery),
        getCountFromServer(listingsQuery),
        getCountFromServer(tradesQuery),
        getCountFromServer(bannedQuery)
      ]);

      setStats({
        users: usersSnap.data().count,
        listings: listingsSnap.data().count,
        trades: tradesSnap.data().count,
        bannedListings: bannedSnap.data().count,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 2. ดึงข้อมูลสิ่งของ 10 ชิ้นแรก
  const fetchInitialListings = async () => {
    setIsLoadingListings(true);
    try {
      const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setLastListingDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 10) setHasMoreListings(false);
        
        const fetchedListings = await processListingsData(querySnapshot.docs);
        setListings(fetchedListings);
      } else {
        setHasMoreListings(false);
      }
    } catch (error) {
      console.error("Error fetching initial listings:", error);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // 3. ฟังก์ชันโหลดสิ่งของเพิ่มอีก 10 ชิ้น
  const handleLoadMoreListings = async () => {
    if (!lastListingDoc || !hasMoreListings) return;
    try {
      const q = query(
        collection(db, 'listings'), 
        orderBy('created_at', 'desc'), 
        startAfter(lastListingDoc), 
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setLastListingDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 10) setHasMoreListings(false);
        
        const nextListings = await processListingsData(querySnapshot.docs);
        setListings([...listings, ...nextListings]);
      } else {
        setHasMoreListings(false);
      }
    } catch (error) {
      console.error("Error loading more listings:", error);
    }
  };

  // ฟังก์ชันส่วนกลางสำหรับดึงชื่อเจ้าของโพสต์และฟอร์แมตข้อมูลสิ่งของ
  const processListingsData = async (docs: QueryDocumentSnapshot[]) => {
    return await Promise.all(
      docs.map(async (docSnap) => {
        const data = docSnap.data();
        let ownerName = 'ไม่ทราบชื่อ';
        
        if (data.owner_id) {
          const userSnap = await getDoc(doc(db, 'users', data.owner_id));
          if (userSnap.exists()) ownerName = userSnap.data().name || 'ไม่มีชื่อ';
        }

        const dateStr = data.created_at 
          ? data.created_at.toDate().toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
          : 'ไม่ระบุเวลา';

        return {
          id: docSnap.id,
          title: data.title || 'ไม่มีชื่อสิ่งของ',
          category: data.category || 'ทั่วไป',
          estimated_coins: data.estimated_coins || 0,
          status: data.status || 'active',
          owner_name: ownerName,
          created_at_string: dateStr
        };
      })
    );
  };

  // 4. ดึงข้อมูลธุรกรรม 10 รายการแรก
  const fetchInitialTransactions = async () => {
    setIsLoadingTxs(true);
    try {
      const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setLastTxDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 10) setHasMoreTxs(false);

        const fetchedTxs = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const dateStr = data.created_at 
            ? data.created_at.toDate().toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'ไม่ระบุเวลา';
          return {
            id: docSnap.id,
            status: data.status || 'pending',
            created_at_string: dateStr
          };
        });
        setTransactions(fetchedTxs);
      } else {
        setHasMoreTxs(false);
      }
    } catch (error) {
      console.error("Error fetching initial txs:", error);
    } finally {
      setIsLoadingTxs(false);
    }
  };

  // 5. ฟังก์ชันโหลดธุรกรรมเพิ่มอีก 10 รายการ
  const handleLoadMoreTransactions = async () => {
    if (!lastTxDoc || !hasMoreTxs) return;
    try {
      const q = query(
        collection(db, 'transactions'), 
        orderBy('created_at', 'desc'), 
        startAfter(lastTxDoc), 
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setLastTxDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 10) setHasMoreTxs(false);

        const nextTxs = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const dateStr = data.created_at 
            ? data.created_at.toDate().toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'ไม่ระบุเวลา';
          return {
            id: docSnap.id,
            status: data.status || 'pending',
            created_at_string: dateStr
          };
        });
        setTransactions([...transactions, ...nextTxs]);
      } else {
        setHasMoreTxs(false);
      }
    } catch (error) {
      console.error("Error loading more txs:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ (Overview)</h2>
      </div>
      
      {/* การ์ดสถิติภาพรวม */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">ผู้ใช้งานทั้งหมด</h3>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><span className="text-xl">👥</span></div>
          </div>
          {isLoadingStats ? <div className="h-10 w-20 bg-gray-100 animate-pulse rounded mt-4"></div> : <p className="text-4xl font-black text-gray-800 mt-4">{stats.users}</p>}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">สิ่งของที่พร้อมแลก</h3>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><span className="text-xl">📦</span></div>
          </div>
          {isLoadingStats ? <div className="h-10 w-20 bg-gray-100 animate-pulse rounded mt-4"></div> : <p className="text-4xl font-black text-teal-600 mt-4">{stats.listings}</p>}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">การแลกเปลี่ยนสำเร็จ</h3>
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><span className="text-xl">🤝</span></div>
          </div>
          {isLoadingStats ? <div className="h-10 w-20 bg-gray-100 animate-pulse rounded mt-4"></div> : <p className="text-4xl font-black text-green-600 mt-4">{stats.trades}</p>}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-semibold tracking-wide">สิ่งของที่ถูกระงับ</h3>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><span className="text-xl">🚫</span></div>
          </div>
          {isLoadingStats ? <div className="h-10 w-20 bg-gray-100 animate-pulse rounded mt-4"></div> : <p className="text-4xl font-black text-red-600 mt-4">{stats.bannedListings}</p>}
        </div>
      </div>

      {/* ตารางแสดงผลฝั่งซ้ายและฝั่งขวา */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 📦 ฝั่งซ้าย: สิ่งของลงประกาศล่าสุด */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🆕</span> สิ่งของลงประกาศล่าสุด (Top 10)</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            {isLoadingListings ? (
              <p className="text-center text-gray-400 py-10">กำลังโหลดข้อมูลสิ่งของ...</p>
            ) : listings.length === 0 ? (
              <p className="text-center text-gray-400 py-10">ยังไม่มีการลงประกาศสิ่งของ</p>
            ) : (
              <div className="space-y-3">
                {listings.map((item) => (
                  <div key={item.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">โดย: {item.owner_name} • {item.created_at_string}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-yellow-600 block">{item.estimated_coins} 🪙</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
                
                {/* ปุ่มโหลดเพิ่มของสิ่งของ */}
                {hasMoreListings && (
                  <button 
                    onClick={handleLoadMoreListings}
                    className="w-full py-2.5 text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors mt-2"
                  >
                    ➕ โหลดสิ่งของเพิ่มเติม
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🤝 ฝั่งขวา: การแลกเปลี่ยนล่าสุด */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-blue-50/30 rounded-t-2xl">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span>🤝</span> การแลกเปลี่ยนล่าสุด (Top 10)</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            {isLoadingTxs ? (
              <p className="text-center text-gray-400 py-10">กำลังโหลดข้อมูลธุรกรรม...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติการแลกเปลี่ยน</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 border border-gray-100 rounded-xl bg-white shadow-sm flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-800 font-mono text-xs">ID: {tx.id}</p>
                      <p className="text-xs text-gray-400 mt-1">เวลาทำรายการ: {tx.created_at_string}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      tx.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                ))}

                {/* ปุ่มโหลดเพิ่มของธุรกรรม */}
                {hasMoreTxs && (
                  <button 
                    onClick={handleLoadMoreTransactions}
                    className="w-full py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors mt-2"
                  >
                    ➕ โหลดธุรกรรมเพิ่มเติม
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}