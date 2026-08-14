import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCog, X, Plus, KeyRound, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast } from '../utils/themeNotifications';

const API = API_URL;

const ASSIGNABLE_ROLES = ['admin', 'produccion1', 'produccion2', 'inventario1', 'plancha'];

const roleLabel = (role, isEn) => {
  const labels = {
    admin: isEn ? 'Admin' : 'Admin',
    produccion1: isEn ? 'Production 1' : 'Producción 1',
    produccion2: isEn ? 'Production 2' : 'Producción 2',
    inventario1: isEn ? 'Inventory' : 'Inventario',
    plancha: isEn ? 'Pressing' : 'Plancha'
  };
  return labels[role] || role;
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const { settings } = useSettings();
  const isEn = settings?.language === 'en';

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('produccion1');
  const [creating, setCreating] = useState(false);

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/users`);
      setUsuarios(res.data);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error loading users' : 'Error al cargar los usuarios', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleUpdateUser = async (u, changes) => {
    try {
      await axios.put(`${API}/api/users/${u.id}`, {
        role: changes.role ?? u.role,
        activo: changes.activo ?? u.activo
      });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ...changes } : x));
      toast.success(isEn ? 'User updated' : 'Usuario actualizado', { theme: 'dark' });
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error updating user' : 'Error al actualizar el usuario'), { theme: 'dark' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 6 || creating) return;
    setCreating(true);
    try {
      await axios.post(`${API}/api/users`, { username: newUsername.trim(), password: newPassword, role: newRole });
      toast.success(isEn ? 'User created' : 'Usuario creado', { theme: 'dark' });
      setShowNewModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('produccion1');
      fetchUsuarios();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error creating user' : 'Error al crear el usuario'), { theme: 'dark' });
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordModalUser || resetPassword.length < 6 || resettingPassword) return;
    setResettingPassword(true);
    try {
      await axios.put(`${API}/api/users/${passwordModalUser.id}/password`, { password: resetPassword });
      toast.success(isEn ? 'Password updated' : 'Contraseña actualizada', { theme: 'dark' });
      setPasswordModalUser(null);
      setResetPassword('');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error resetting password' : 'Error al resetear la contraseña'), { theme: 'dark' });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCog size={32} /> {isEn ? 'User Management' : 'Gestión de Usuarios'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {isEn ? 'Create, edit roles, reset passwords and deactivate system accounts.' : 'Crea, edita roles, resetea contraseñas y desactiva cuentas del sistema.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={18} /> {isEn ? 'New User' : 'Nuevo Usuario'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {isEn ? 'Loading...' : 'Cargando...'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {usuarios.map(u => {
            const isSelf = currentUser && u.id === currentUser.id;
            return (
              <div key={u.id} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {u.username}
                    {isSelf && (
                      <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
                        {isEn ? 'You' : 'Tú'}
                      </span>
                    )}
                    <span className={`badge ${u.activo ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
                      {u.activo ? (isEn ? 'Active' : 'Activo') : (isEn ? 'Inactive' : 'Inactivo')}
                    </span>
                  </div>
                </div>

                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
                  value={u.role}
                  disabled={isSelf}
                  title={isSelf ? (isEn ? "You can't change your own role" : 'No puedes cambiar tu propio rol') : ''}
                  onChange={(e) => handleUpdateUser(u, { role: e.target.value })}
                >
                  {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r, isEn)}</option>)}
                </select>

                <button
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                  onClick={() => { setPasswordModalUser(u); setResetPassword(''); }}
                >
                  <KeyRound size={14} /> {isEn ? 'Reset Password' : 'Resetear Contraseña'}
                </button>

                <button
                  className={`btn ${u.activo ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                  disabled={isSelf}
                  title={isSelf ? (isEn ? "You can't deactivate yourself" : 'No puedes desactivarte a ti mismo') : ''}
                  onClick={() => handleUpdateUser(u, { activo: u.activo ? 0 : 1 })}
                >
                  <Power size={14} /> {u.activo ? (isEn ? 'Deactivate' : 'Desactivar') : (isEn ? 'Activate' : 'Activar')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{isEn ? 'New User' : 'Nuevo Usuario'}</h2>
              <button className="btn-icon" onClick={() => setShowNewModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isEn ? 'Username' : 'Usuario'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isEn ? 'Password (min. 6 characters)' : 'Contraseña (mín. 6 caracteres)'}
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isEn ? 'Role' : 'Rol'}
                </label>
                <select className="form-input" style={{ width: '100%' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r, isEn)}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating || !newUsername.trim() || newPassword.length < 6} style={{ marginTop: '0.5rem' }}>
                {creating ? (isEn ? 'Creating...' : 'Creando...') : (isEn ? 'Create User' : 'Crear Usuario')}
              </button>
            </form>
          </div>
        </div>
      )}

      {passwordModalUser && (
        <div className="modal-overlay" onClick={() => setPasswordModalUser(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                {isEn ? 'Reset Password' : 'Resetear Contraseña'} — {passwordModalUser.username}
              </h2>
              <button className="btn-icon" onClick={() => setPasswordModalUser(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isEn ? 'New password (min. 6 characters)' : 'Nueva contraseña (mín. 6 caracteres)'}
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  minLength={6}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={resettingPassword || resetPassword.length < 6} style={{ marginTop: '0.5rem' }}>
                {resettingPassword ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Save' : 'Guardar')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
