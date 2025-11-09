import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import StaffDashboard from './pages/StaffDashboard';
import InterpreterDashboard from './pages/InterpreterDashboard';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

function DashboardRouter() {
  const { user } = useAuth();
  
  console.log('Current user:', user); // Debug log
  
  // Check for interpreter user types (could be 'interpreter' or username contains 'interpreter')
  if (user?.user_type === 'interpreter' || 
      user?.username?.toLowerCase().includes('interpreter')) {
    return <InterpreterDashboard />;
  } else {
    // Default to staff dashboard for staff, admin, or any other user type
    return <StaffDashboard />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <DashboardRouter />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;