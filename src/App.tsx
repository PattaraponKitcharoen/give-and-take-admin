import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// 🟢 Component ยามเฝ้าประตู: เช็กว่าล็อกอินหรือยัง ถ้ายังให้เตะกลับไปหน้า Login
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // TODO: เดี๋ยวเรามาแก้ให้ดึงค่าสถานะจาก Firebase จริงๆ
  const isAuthenticated = false; // สมมติว่ายังไม่ได้ล็อกอิน

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* หน้าเปิดสาธารณะ */}
        <Route path="/login" element={<Login />} />

        {/* หน้าที่ต้องล็อกอิน (ถูกห่อด้วย ProtectedRoute) */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;