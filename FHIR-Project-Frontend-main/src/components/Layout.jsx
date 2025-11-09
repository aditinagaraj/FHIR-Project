import { Globe, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto font-sans">
        <header className="flex justify-between items-center py-4 px-0 mb-6 border-b border-gray-200">
          <h1 className="text-3xl font-extrabold text-blue-600 flex items-center">
            <Globe className="w-7 h-7 mr-2" />
            Interpreter Hub
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">
              Logged in as: {user?.username} ({user?.user_type})
            </span>
            <button onClick={handleLogout} className="btn-danger">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}