import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, User as UserIcon, X, Crown, UserCheck, UserX } from 'lucide-react';
import { usersApi } from '../services/api';
import Navbar from '../components/Navbar';

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

  const filteredUsers = users.filter(user => {
    if (filterStatus === 'active') return user.active;
    if (filterStatus === 'pending') return !user.active;
    return true; // 'all'
  });

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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
    if (role === 'amministratore') return 'bg-red-100 text-red-800';
    if (role === 'direzione') return 'bg-purple-100 text-purple-800';
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
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestione Utenti</h1>
            <p className="text-gray-600 mt-1">
              Gestisci gli utenti e i loro permessi di accesso
            </p>
          </div>
          <button onClick={handleCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nuovo Utente
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tutti ({users.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Attivi ({users.filter(u => u.active).length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            In attesa di approvazione ({users.filter(u => !u.active).length})
          </button>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const isPending = !user.active;
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isPending ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {user.first_name[0]}{user.last_name[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                              {user.id === currentUser.id && (
                                <span className="ml-2 text-xs text-gray-500">(Tu)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          <RoleIcon className="w-3 h-3" />
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {user.active ? 'Attivo' : 'In attesa di approvazione'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApprove(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium mr-3"
                              title="Approva registrazione"
                            >
                              <UserCheck className="w-4 h-4" />
                              Approva
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-primary-600 hover:text-primary-900 mr-3"
                              title="Modifica utente e approva"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-primary-600 hover:text-primary-900 mr-3"
                              title="Modifica utente"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="text-orange-600 hover:text-orange-900 mr-3"
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
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filterStatus === 'pending'
                  ? 'Nessun utente in attesa'
                  : filterStatus === 'active'
                  ? 'Nessun utente attivo'
                  : 'Nessun utente'}
              </h3>
              <p className="text-gray-500">
                {filterStatus === 'pending'
                  ? 'Non ci sono utenti in attesa di approvazione'
                  : filterStatus === 'active'
                  ? 'Non ci sono utenti attivi'
                  : 'Crea il primo utente per iniziare'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      className={`input ${errors.first_name ? 'border-red-500' : ''}`}
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Es: Mario"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cognome
                    </label>
                    <input
                      type="text"
                      className={`input ${errors.last_name ? 'border-red-500' : ''}`}
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Es: Rossi"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className={`input ${errors.email ? 'border-red-500' : ''}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Es: mario.rossi@orthotech.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruolo
                  </label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="dipendente">Dipendente</option>
                    <option value="direzione">Direzione</option>
                    <option value="amministratore">Amministratore</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'amministratore'
                      ? 'Accesso completo a tutte le funzionalità e gestione utenti'
                      : formData.role === 'direzione'
                      ? 'Può consultare progetti e inserire richieste/commenti'
                      : 'Accesso ai propri task e progetti assegnati'}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Utente attivo
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Gli utenti disattivati non possono accedere e non vengono proposti per assegnazioni
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {selectedUser && '(lascia vuoto per non modificare)'}
                  </label>
                  <input
                    type="password"
                    className={`input ${errors.password ? 'border-red-500' : ''}`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={selectedUser ? 'Nuova password (opzionale)' : 'Password'}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {selectedUser ? 'Salva Modifiche' : 'Crea Utente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
