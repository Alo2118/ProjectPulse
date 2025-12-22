import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">ProjectPulse</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.name}</div>
                <div className="text-gray-500 capitalize">{user?.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
