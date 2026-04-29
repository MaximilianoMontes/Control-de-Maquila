import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Maquileros from './pages/Maquileros';
import Inventario from './pages/Inventario';
import Produccion from './pages/Produccion';
import Pagos from './pages/Pagos';
import Reportes from './pages/Reportes';
import Historial from './pages/Historial';
import KillFeed from './components/KillFeed';

function MainLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <KillFeed />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  
  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/maquileros" element={<ProtectedRoute allowedRoles={['admin', 'produccion_pagos']}><MainLayout><Maquileros /></MainLayout></ProtectedRoute>} />
      <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin', 'inventario', 'produccion_pagos']}><MainLayout><Inventario /></MainLayout></ProtectedRoute>} />
      <Route path="/produccion" element={<ProtectedRoute allowedRoles={['admin', 'produccion_pagos']}><MainLayout><Produccion /></MainLayout></ProtectedRoute>} />
      <Route path="/pagos" element={<ProtectedRoute allowedRoles={['admin', 'produccion_pagos']}><MainLayout><Pagos /></MainLayout></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute allowedRoles={['admin', 'produccion_pagos', 'inventario']}><MainLayout><Reportes /></MainLayout></ProtectedRoute>} />
      <Route path="/historial" element={<ProtectedRoute><MainLayout><Historial /></MainLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
