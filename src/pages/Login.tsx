import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'; // 🟢 ดึง signOut มาใช้ด้วย
import { doc, getDoc } from 'firebase/firestore'; // 🟢 ดึงคำสั่งอ่าน Firestore
import { auth, db } from '../firebase/config'; // 🟢 ดึง db มาใช้

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. ล็อกอินผ่าน Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. 🟢 วิ่งไปเช็กสิทธิ์ใน Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.role === 'admin') {
          // ถ้าเป็น Admin ให้เข้าหน้า Dashboard ได้
          navigate('/');
        } else {
          // ถ้าเป็น User ทั่วไป ให้เตะออกและโชว์ Error
          await signOut(auth);
          setErrorMsg('คุณไม่มีสิทธิ์เข้าถึงระบบหลังบ้านครับ');
        }
      } else {
         // กรณีไม่มีข้อมูลใน Firestore เลย
         await signOut(auth);
         setErrorMsg('ไม่พบข้อมูลผู้ใช้งานในระบบ');
      }

    } catch (error: any) {
      setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-black text-primaryTeal mb-2">Give & Take</h1>
        <h2 className="text-xl font-bold text-gray-900">Admin Control Panel</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* 🟢 โชว์ Error ถ้าล็อกอินไม่ผ่าน */}
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primaryTeal focus:border-primaryTeal sm:text-sm" placeholder="admin@giveandtake.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primaryTeal focus:border-primaryTeal sm:text-sm" placeholder="••••••••" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primaryTeal hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryTeal disabled:opacity-50 transition-colors">
                {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}