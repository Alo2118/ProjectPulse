import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DipendenteDashboard from './pages/DipendenteDashboard';
import DirezioneDashboard from './pages/DirezioneDashboard';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'direzione') {
    return <DirezioneDashboard />;
  }

  return <DipendenteDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardRouter />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
