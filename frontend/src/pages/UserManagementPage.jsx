import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  User as UserIcon,
  X,
  Crown,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../services/api';
import { isValidEmail, formatDate } from '../utils/helpers';
import { designTokens } from '../config/designTokens';
import {
  GamingLayout,
  GamingHeader,
  GamingCard,
  GamingLoader,
  GamingKPICard,
  GamingKPIGrid,
  Button,
  Input,
} from '../components/ui';

export default function UserManagementPage() {
  const { colors, spacing } = useTheme();
  const { error: showError, warning } = useToast();
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
    active: true,
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
      showError('Errore nel caricamento degli utenti');
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
      active: true,
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
      active: user.active,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) {
      warning('Non puoi eliminare il tuo account!');
      return;
    }

    const userName = `${user.first_name} ${user.last_name}`;
    if (
      !confirm(
        `Disattivare l'utente "${userName}"?\n\nL'utente non potrà più accedere ma i suoi dati saranno preservati.`
      )
    ) {
      return;
    }

    try {
      await usersApi.delete(user.id);
      loadUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Errore durante la disattivazione');
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id && user.active) {
      warning('Non puoi disattivare il tuo account!');
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
      showError(error.response?.data?.error || `Errore durante la ${action}zione`);
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
      showError(error.response?.data?.error || "Errore durante l'approvazione");
    }
  };

  // Memoize filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filterStatus === 'active') return user.active;
      if (filterStatus === 'pending') return !user.active;
      return true; // 'all'
    });
  }, [users, filterStatus]);

  // Memoize counts
  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);
  const pendingCount = useMemo(() => users.filter((u) => !u.active).length, [users]);

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
        active: formData.active,
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
      showError(error.response?.data?.error || 'Errore durante il salvataggio');
    }
  };

  const getRoleBadgeColor = (role) => {
    const { colors: tokenColors } = designTokens;
    if (role === 'amministratore') return `${colors.bg.tertiary} ${colors.text.primary}`;
    if (role === 'direzione') return `${tokenColors.info.bg} ${tokenColors.info.text}`;
    return `${tokenColors.cyan.bg} ${tokenColors.cyan.text}`;
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
            className={`${gradients.primary} text-white shadow-lg shadow-cyan-500/50 transition-all hover:from-cyan-700 hover:to-blue-700`}
          >
            <Plus className="h-4 w-4" />
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
        <div className="mb-6 flex items-center gap-3">
          <Users className={`h-6 w-6 ${colors.text.accent}`} />
          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Lista Utenti</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${colors.border} ${colors.bg.tertiary}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Utente
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Email
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Ruolo
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Stato
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Registrato
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${colors.text.secondary}`}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${colors.border}`}>
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const isPending = !user.active;
                return (
                  <tr
                    key={user.id}
                    className={`transition-colors ${colors.bg.hover} ${isPending ? colors.bg.tertiary : ''}`}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-blue-700">
                          <span className="text-sm font-semibold text-white">
                            {user.first_name[0]}
                            {user.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${colors.text.primary}`}>
                            {user.first_name} {user.last_name}
                            {user.id === currentUser.id && (
                              <span className={`ml-2 text-xs ${colors.text.accent}`}>(Tu)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className={`text-sm ${colors.text.secondary}`}>{user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`${
                          user.role === 'amministratore'
                            ? 'badge-role-admin'
                            : user.role === 'direzione'
                              ? 'badge-role-direzione'
                              : 'badge-role-dipendente'
                        }`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`${
                          user.active ? 'badge-status-active' : 'badge-status-inactive'
                        }`}
                      >
                        {user.active ? (
                          <UserCheck className="h-3 w-3" />
                        ) : (
                          <UserX className="h-3 w-3" />
                        )}
                        {user.active ? 'Attivo' : 'In attesa'}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm ${colors.text.tertiary}`}>
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {isPending ? (
                        <>
                          <Button
                            onClick={() => handleApprove(user)}
                            className={`mr-2 ${gradients.success} px-3 py-1 text-xs text-white hover:from-emerald-700 hover:to-green-800`}
                            title="Approva registrazione"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="ml-1">Approva</span>
                          </Button>
                          <button
                            onClick={() => handleEdit(user)}
                            className={`${colors.text.accent} transition-colors hover:opacity-80`}
                            title="Modifica utente e approva"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className={`mr-3 ${colors.text.accent} transition-colors hover:opacity-80`}
                            title="Modifica utente"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="text-orange-400 transition-colors hover:text-orange-300"
                            title="Disattiva utente"
                            disabled={user.id === currentUser.id}
                          >
                            <UserX className="h-4 w-4" />
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
          <div className="py-16 text-center">
            <Users className={`mx-auto mb-4 h-16 w-16 ${colors.text.secondary}`} />
            <h3 className="mb-2 text-lg font-medium text-white">
              {filterStatus === 'pending'
                ? 'Nessun utente in attesa'
                : filterStatus === 'active'
                  ? 'Nessun utente attivo'
                  : 'Nessun utente'}
            </h3>
            <p className={colors.text.tertiary}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border ${colors.border} ${colors.bg.secondary} shadow-2xl backdrop-blur-xl`}>
            {/* Header */}
            <div className={`flex items-center justify-between rounded-t-2xl border-b ${colors.border} ${colors.bg.secondary} px-6 py-4 backdrop-blur-xl`}>
              <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                <Users className={`h-7 w-7 ${designTokens.colors.cyan.text}`} />
                {selectedUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className={`${colors.text.tertiary} transition-colors hover:${colors.text.primary}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nome"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Es: Mario"
                    error={errors.first_name}
                  />
                  <Input
                    label="Cognome"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Es: Rossi"
                    error={errors.last_name}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Es: mario.rossi@orthotech.com"
                  error={errors.email}
                />

                <div>
                  <label className={`mb-2 block text-sm font-medium ${colors.text.secondary}`}>Ruolo</label>
                  <select
                    className={`w-full rounded-lg border ${colors.border} ${colors.bg.tertiary} px-3 py-2 ${colors.text.primary} transition-all focus:${designTokens.colors.cyan.borderLight} focus:ring-2 focus:ring-cyan-500/50`}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="dipendente">Dipendente</option>
                    <option value="direzione">Direzione</option>
                    <option value="amministratore">Amministratore</option>
                  </select>
                  <p className={`mt-2 text-xs ${colors.text.tertiary}`}>
                    {formData.role === 'amministratore'
                      ? 'Accesso completo a tutte le funzionalità e gestione utenti'
                      : formData.role === 'direzione'
                        ? 'Può consultare progetti e inserire richieste/commenti'
                        : 'Accesso ai propri task e progetti assegnati'}
                  </p>
                </div>

                <div>
                  <label className={`flex cursor-pointer items-center gap-2 text-sm font-medium ${colors.text.secondary}`}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className={`rounded ${colors.border} ${colors.bg.tertiary} ${colors.text.accent} focus:ring-cyan-500 focus:ring-offset-slate-900`}
                    />
                    Utente attivo
                  </label>
                  <p className={`ml-6 mt-2 text-xs ${colors.text.tertiary}`}>
                    Gli utenti disattivati non possono accedere e non vengono proposti per
                    assegnazioni
                  </p>
                </div>

                <Input
                  label={`Password ${selectedUser ? '(lascia vuoto per non modificare)' : ''}`}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={selectedUser ? 'Nuova password (opzionale)' : 'Password'}
                  error={errors.password}
                />
              </div>

              {/* Footer */}
              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 ${colors.bg.tertiary} text-white ${colors.bg.hover}`}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${gradients.primary} text-white shadow-lg shadow-cyan-500/50 hover:from-cyan-700 hover:to-blue-700`}
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
