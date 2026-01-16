import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, User as UserIcon, X, Crown, UserCheck, UserX } from 'lucide-react';
import { usersApi } from '../services/api';
import { isValidEmail, formatDate } from '../utils/helpers';
import { GamingLayout, GamingHeader, GamingCard, GamingLoader, GamingKPICard, GamingKPIGrid, Button } from '../components/ui';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'pending'
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'dipendente',
    password: '',
    active: true
  });
  const [errors, setErrors] = useState({});

  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role: 'dipendente',
      password: '',
      active: true
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      password: '', // Don't pre-fill password
      active: user.active
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) {
      alert('Non puoi eliminare il tuo account!');
      return;
    }

    const userName = `${user.first_name} ${user.last_name}`;
    if (!confirm(`Disattivare l'utente "${userName}"?\n\nL'utente non potrà più accedere ma i suoi dati saranno preservati.`)) {
      return;
    }

    try {
      await usersApi.delete(user.id);
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante la disattivazione');
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id && user.active) {
      alert('Non puoi disattivare il tuo account!');
      return;
    }

    const userName = `${user.first_name} ${user.last_name}`;
    const action = user.active ? 'disattivare' : 'riattivare';
    if (!confirm(`Confermi di voler ${action} l'utente "${userName}"?`)) {
      return;
    }

    try {
      if (user.active) {
        await usersApi.delete(user.id);
      } else {
        await usersApi.reactivate(user.id);
      }
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || `Errore durante la ${action}zione`);
    }
  };

  const handleApprove = async (user) => {
    const userName = `${user.first_name} ${user.last_name}`;
    if (!confirm(`Approvi la registrazione di "${userName}" e gli concedi l'accesso?`)) {
      return;
    }

    try {
      // Activate the user (approve registration)
      await usersApi.reactivate(user.id);
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante l\'approvazione');
    }
  };

  // Memoize filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filterStatus === 'active') return user.active;
      if (filterStatus === 'pending') return !user.active;
      return true; // 'all'
    });
  }, [users, filterStatus]);

  // Memoize counts
  const activeCount = useMemo(() => users.filter(u => u.active).length, [users]);
  const pendingCount = useMemo(() => users.filter(u => !u.active).length, [users]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Nome richiesto';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Cognome richiesto';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email non valida';
    }

    // Password is required only when creating new user
    if (!selectedUser && !formData.password) {
      newErrors.password = 'Password richiesta';
    }

    // If password is provided, validate it
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'La password deve contenere almeno 6 caratteri';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const dataToSend = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        active: formData.active
      };

      // Only include password if it's provided
      if (formData.password) {
        dataToSend.password = formData.password;
      }

      if (selectedUser) {
        await usersApi.update(selectedUser.id, dataToSend);
      } else {
        await usersApi.create(dataToSend);
      }

      setShowModal(false);
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante il salvataggio');
    }
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'amministratore') return 'bg-slate-200 text-slate-900';
    if (role === 'direzione') return 'bg-primary-100 text-primary-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getRoleIcon = (role) => {
    if (role === 'amministratore') return Crown;
    if (role === 'direzione') return Shield;
    return UserIcon;
  };

  const getRoleLabel = (role) => {
    if (role === 'amministratore') return 'Amministratore';
    if (role === 'direzione') return 'Direzione';
    return 'Dipendente';
  };

  if (loading) {
    return <GamingLoader message="Caricamento utenti..." />;
  }

  return (
    <GamingLayout>
      <GamingHeader
        title="Gestione Utenti"
        subtitle="Permessi e accessi"
        icon={Users}
        actions={
          <Button 
            onClick={handleCreate}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo</span>
          </Button>
        }
      />

      {/* Stats Cards */}
      <GamingKPIGrid columns={3}>
        <GamingKPICard
          title="Tutti gli Utenti"
          value={users.length}
          icon={Users}
          gradient="from-purple-600 to-pink-700"
          shadowColor="purple"
          onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all' ? 'ring-2 ring-cyan-500' : ''}
        />
        <GamingKPICard
          title="Utenti Attivi"
          value={activeCount}
          icon={UserCheck}
          gradient="from-emerald-600 to-green-700"
          shadowColor="emerald"
          onClick={() => setFilterStatus('active')}
          className={filterStatus === 'active' ? 'ring-2 ring-cyan-500' : ''}
        />
        <GamingKPICard
          title="In Attesa Approvazione"
          value={pendingCount}
          icon={UserX}
          gradient="from-yellow-600 to-orange-700"
          shadowColor="yellow"
          onClick={() => setFilterStatus('pending')}
          className={filterStatus === 'pending' ? 'ring-2 ring-cyan-500' : ''}
        />
      </GamingKPIGrid>

      {/* Users List */}
      <GamingCard>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Lista Utenti</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Registrato
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const isPending = !user.active;
                return (
                  <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors ${isPending ? 'bg-slate-800/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.first_name} {user.last_name}
                            {user.id === currentUser.id && (
                              <span className="ml-2 text-xs text-cyan-400">(Tu)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'amministratore' 
                          ? 'bg-slate-700/50 text-slate-200 border border-slate-600' 
                          : user.role === 'direzione'
                          ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                          : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      }`}>
                        <RoleIcon className="w-3 h-3" />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.active
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                          : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                      }`}>
                        {user.active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {user.active ? 'Attivo' : 'In attesa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isPending ? (
                        <>
                          <Button
                            onClick={() => handleApprove(user)}
                            className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-xs px-3 py-1 mr-2"
                            title="Approva registrazione"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span className="ml-1">Approva</span>
                          </Button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Modifica utente e approva"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors mr-3"
                            title="Modifica utente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="text-orange-400 hover:text-orange-300 transition-colors"
                            title="Disattiva utente"
                            disabled={user.id === currentUser.id}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {filterStatus === 'pending'
                ? 'Nessun utente in attesa'
                : filterStatus === 'active'
                ? 'Nessun utente attivo'
                : 'Nessun utente'}
            </h3>
            <p className="text-slate-400">
              {filterStatus === 'pending'
                ? 'Non ci sono utenti in attesa di approvazione'
                : filterStatus === 'active'
                ? 'Non ci sono utenti attivi'
                : 'Crea il primo utente per iniziare'}
            </p>
          </div>
        )}
      </GamingCard>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 max-w-md w-full">
            {/* Header */}
            <div className="bg-slate-900/70 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-7 h-7 text-cyan-400" />
                {selectedUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-slate-800/50 border ${errors.first_name ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Es: Mario"
                    />
                    {errors.first_name && (
                      <p className="text-red-400 text-xs mt-1">{errors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cognome
                    </label>
                    <input
                      type="text"
                      className={`w-full bg-slate-800/50 border ${errors.last_name ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Es: Rossi"
                    />
                    {errors.last_name && (
                      <p className="text-red-400 text-xs mt-1">{errors.last_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className={`w-full bg-slate-800/50 border ${errors.email ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Es: mario.rossi@orthotech.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ruolo
                  </label>
                  <select
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="dipendente">Dipendente</option>
                    <option value="direzione">Direzione</option>
                    <option value="amministratore">Amministratore</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-2">
                    {formData.role === 'amministratore'
                      ? 'Accesso completo a tutte le funzionalità e gestione utenti'
                      : formData.role === 'direzione'
                      ? 'Può consultare progetti e inserire richieste/commenti'
                      : 'Accesso ai propri task e progetti assegnati'}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                    />
                    Utente attivo
                  </label>
                  <p className="text-xs text-slate-400 mt-2 ml-6">
                    Gli utenti disattivati non possono accedere e non vengono proposti per assegnazioni
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password {selectedUser && '(lascia vuoto per non modificare)'}
                  </label>
                  <input
                    type="password"
                    className={`w-full bg-slate-800/50 border ${errors.password ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={selectedUser ? 'Nuova password (opzionale)' : 'Password'}
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50"
                >
                  {selectedUser ? 'Salva Modifiche' : 'Crea Utente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GamingLayout>
  );
}
