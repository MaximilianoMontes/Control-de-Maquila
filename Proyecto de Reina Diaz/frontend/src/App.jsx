// Trigger build
import { useState } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import PlanchaSidebar from './components/PlanchaSidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Launcher from './pages/Launcher';
import Dashboard from './pages/Dashboard';
import Maquileros from './pages/Maquileros';
import Inventario from './pages/Inventario';
import Cortes from './pages/Cortes';
import Produccion from './pages/Produccion';
import Extras from './pages/Extras';
import Pagos from './pages/Pagos';
import Plancha from './pages/Plancha';
import Reportes from './pages/Reportes';
import Historial from './pages/Historial';
import Ayuda from './pages/Ayuda';
import Camion from './pages/Camion';
import KillFeed from './components/KillFeed';

function MainLayout({ children }) {
  const [searchParams] = useSearchParams();
  const fromPlancha = searchParams.get('from') === 'plancha';

  return (
    <div className="app-layout">
      {fromPlancha ? (
        <PlanchaSidebar activeTab="ayuda" setActiveTab={() => {}} />
      ) : (
        <Sidebar />
      )}
      <KillFeed />
      <div className="main-container">
        <Header />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  // Leer el rol desde cualquier campo posible
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />;

  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Launcher /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/maquileros" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Maquileros /></MainLayout></ProtectedRoute>} />
      <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Inventario /></MainLayout></ProtectedRoute>} />
      <Route path="/cortes" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Cortes /></MainLayout></ProtectedRoute>} />
      <Route path="/produccion" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Produccion /></MainLayout></ProtectedRoute>} />
      <Route path="/extras" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Extras /></MainLayout></ProtectedRoute>} />
      <Route path="/camion" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion']}><MainLayout><Camion /></MainLayout></ProtectedRoute>} />
      <Route path="/pagos" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion']}><MainLayout><Pagos /></MainLayout></ProtectedRoute>} />
      <Route path="/plancha" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'plancha', 'inventario1']}><Plancha /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Reportes /></MainLayout></ProtectedRoute>} />
      <Route path="/historial" element={<ProtectedRoute allowedRoles={['admin', 'produccion1', 'produccion2', 'produccion', 'inventario1']}><MainLayout><Historial /></MainLayout></ProtectedRoute>} />
      <Route path="/ayuda" element={<ProtectedRoute><MainLayout><Ayuda /></MainLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
