import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { requestsApi, projectsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePendingRequestsCount } from '../hooks/usePendingRequestsCount';
import { GamingLayout, GamingHeader, GamingCard, Button } from '../components/ui';
import {
  Inbox,
  Plus,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
  ArrowRight,
  FileText,
  FolderPlus,
  ListTodo,
  Edit,
} from 'lucide-react';
import { formatDate, formatDateTime, getRequestStatusColors } from '../utils/helpers';

const InboxPage = () => {
  const { colors, gradients } = useTheme();
  const { user } = useAuth();
  const { incrementCount, decrementCount } = usePendingRequestsCount();
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showConvertTaskModal, setShowConvertTaskModal] = useState(false);
  const [showConvertProjectModal, setShowConvertProjectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states
  const [newRequestData, setNewRequestData] = useState({
    title: '',
    description: '',
    type: 'question',
    source: 'internal',
    source_contact: '',
    priority: 'normal',
    project_id: '',
    assigned_to: '',
    due_date: '',
  });

  const [editRequestData, setEditRequestData] = useState({
    title: '',
    description: '',
    type: 'question',
    source: 'internal',
    source_contact: '',
    priority: 'normal',
    project_id: '',
    assigned_to: '',
    due_date: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, typeFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;
      if (searchQuery) params.search = searchQuery;

      const [requestsRes, projectsRes, usersRes, statsRes] = await Promise.all([
        requestsApi.getAll(params),
        projectsApi.getAll(),
        usersApi.getAll({ active: true }),
        requestsApi.getStats(),
      ]);

      setRequests(requestsRes.data.data || requestsRes.data);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      // Convert empty strings to null for foreign key fields
      const requestData = {
        ...newRequestData,
        project_id: newRequestData.project_id || null,
        assigned_to: newRequestData.assigned_to || null,
        source_contact: newRequestData.source_contact || null,
        due_date: newRequestData.due_date || null,
      };

      const response = await requestsApi.create(requestData);
      // Increment badge for newly created request with 'new' status
      const createdRequest = response.data.data || response.data;
      if (createdRequest?.status === 'new') {
        incrementCount();
      }
      alert('Richiesta creata con successo!');
      setShowNewRequestModal(false);
      setNewRequestData({
        title: '',
        description: '',
        type: 'question',
        source: 'internal',
        source_contact: '',
        priority: 'normal',
        project_id: '',
        assigned_to: '',
        due_date: '',
      });
      loadData();
    } catch (error) {
      alert('Errore nella creazione: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReview = async (request, status) => {
    try {
      await requestsApi.review(request.id, { status });
      // If request was in 'new' status, decrement badge
      if (request.status === 'new') {
        decrementCount();
      }
      alert(`Richiesta ${status === 'approved' ? 'approvata' : 'rifiutata'}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConvertToTask = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const taskData = {
        title: selectedRequest.title,
        description: selectedRequest.description,
        project_id: selectedRequest.project_id || e.target.project_id.value || null,
        assigned_to: parseInt(e.target.assigned_to.value) || null,
        priority: selectedRequest.priority,
        deadline: e.target.deadline.value || null,
      };
      await requestsApi.convertToTask(selectedRequest.id, taskData);
      // If request was in 'new' status, decrement badge
      if (selectedRequest.status === 'new') {
        decrementCount();
      }
      alert('Richiesta convertita in task!');
      setShowConvertTaskModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConvertToProject = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const projectData = {
        name: e.target.name.value,
        description: e.target.description.value,
      };
      await requestsApi.convertToProject(selectedRequest.id, projectData);
      // If request was in 'new' status, decrement badge
      if (selectedRequest.status === 'new') {
        decrementCount();
      }
      alert('Richiesta convertita in progetto!');
      setShowConvertProjectModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa richiesta?')) return;
    try {
      await requestsApi.delete(id);
      alert('Richiesta eliminata');
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleArchive = async (request) => {
    try {
      await requestsApi.archive(request.id);
      alert('Richiesta archiviata');
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUnarchive = async (request) => {
    try {
      await requestsApi.unarchive(request.id);
      alert("Richiesta estratta dall'archivio");
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setEditRequestData({
      title: request.title || '',
      description: request.description || '',
      type: request.type || 'question',
      source: request.source || 'internal',
      source_contact: request.source_contact || '',
      priority: request.priority || 'normal',
      project_id: request.project_id || '',
      assigned_to: request.assigned_to || '',
      due_date: request.due_date || '',
    });
    setShowEditRequestModal(true);
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      // Convert empty strings to null for foreign key fields
      const requestData = {
        ...editRequestData,
        project_id: editRequestData.project_id || null,
        assigned_to: editRequestData.assigned_to || null,
        source_contact: editRequestData.source_contact || null,
        due_date: editRequestData.due_date || null,
      };

      await requestsApi.update(selectedRequest.id, requestData);
      alert('Richiesta aggiornata con successo!');
      setShowEditRequestModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      alert("Errore nell'aggiornamento: " + (error.response?.data?.error || error.message));
    }
  };

  const getTypeName = (type) => {
    const types = {
      bug: 'Bug',
      feature: 'Feature',
      question: 'Domanda',
      technical_issue: 'Problema Tecnico',
      customer_complaint: 'Reclamo Cliente',
      internal_request: 'Richiesta Interna',
      other: 'Altro',
    };
    return types[type] || type;
  };

  const getSourceName = (source) => {
    const sources = {
      customer: 'Cliente',
      internal: 'Interno',
      support: 'Supporto',
      management: 'Direzione',
      sales: 'Commerciale',
      production: 'Produzione',
    };
    return sources[source] || source;
  };

  if (loading) {
    return (
      <GamingLayout>
        <GamingHeader title="Inbox" subtitle="Richieste Ufficio Tecnico" icon={Inbox} />
        <GamingCard className="py-12 text-center">
          <div className={`text-lg ${colors.text.tertiary}`}>Caricamento...</div>
        </GamingCard>
      </GamingLayout>
    );
  }

  return (
    <GamingLayout>
      <GamingHeader
        title="Inbox"
        subtitle="Richieste Ufficio Tecnico"
        icon={Inbox}
        actions={
          <Button
            onClick={() => setShowNewRequestModal(true)}
            className={`${gradients.primary} font-bold text-white shadow-xl shadow-primary-600/50 transition-all hover:from-primary-700 hover:to-primary-800`}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova</span>
          </Button>
        }
      />

      {/* Stats */}
      {stats && stats.byStatus && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.byStatus.map((stat) => {
            const emojis = {
              pending: '⏳',
              in_progress: '🚀',
              resolved: '✅',
              rejected: '❌',
              new: '📬',
            };
            const color = getRequestStatusColors(stat.status);
            return (
              <GamingCard key={stat.status} className={`${color.bg} border ${color.border}`}>
                <div className="mb-2 text-2xl">{emojis[stat.status] || '📋'}</div>
                <div className={`text-2xl font-bold ${color.text}`}>{stat.count}</div>
                {stat.avg_resolution_hours && (
                  <div className={`text-xs ${color.label} mt-1 font-semibold`}>
                    ⏱️ {Math.round(stat.avg_resolution_hours)}h media
                  </div>
                )}
              </GamingCard>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <GamingCard className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <Filter className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-cyan-300">Filtri</span>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="text-label mb-1">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Tutti</option>
              <option value="new">Nuove</option>
              <option value="reviewing">In Valutazione</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Rifiutate</option>
              <option value="converted_to_task">Convertite in Task</option>
              <option value="converted_to_project">Convertite in Progetto</option>
            </select>
          </div>
          <div>
            <label className="text-label mb-1">Priorità</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Tutte</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="normal">Normale</option>
              <option value="low">Bassa</option>
            </select>
          </div>
          <div>
            <label className="text-label mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Tutti</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="question">Domanda</option>
              <option value="technical_issue">Problema Tecnico</option>
              <option value="customer_complaint">Reclamo Cliente</option>
              <option value="internal_request">Richiesta Interna</option>
              <option value="other">Altro</option>
            </select>
          </div>
          <div>
            <label className="text-label mb-1">Ricerca</label>
            <div className="relative">
              <Search className={`absolute left-2 top-2.5 h-5 w-5 ${colors.text.tertiary}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca..."
                className="input-dark w-full pl-9"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showArchived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className={`rounded border-2 border-cyan-500/30 ${colors.bg.tertiary} ${colors.text.accent} focus:ring-cyan-500`}
          />
          <label
            htmlFor="showArchived"
            className={`cursor-pointer text-sm font-medium ${colors.text.secondary}`}
          >
            Mostra richieste archiviate
          </label>
        </div>
      </GamingCard>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <GamingCard className="py-12 text-center">
            <div className="mb-4 text-6xl">📭</div>
            <h3 className="mb-2 text-xl font-bold text-cyan-300">Nessuna richiesta trovata</h3>
            <p className={colors.text.tertiary}>Tutte le richieste sono state elaborate</p>
          </GamingCard>
        ) : (
          requests
            .filter((request) => showArchived || request.status !== 'archived')
            .map((request) => {
              const statusColors = {
                new: {
                  bg: colors.bg.secondary,
                  border: 'border-cyan-500/30',
                  badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                },
                reviewing: {
                  bg: colors.bg.secondary,
                  border: 'border-amber-500/30',
                  badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                },
                approved: {
                  bg: colors.bg.secondary,
                  border: 'border-emerald-500/30',
                  badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                },
                rejected: {
                  bg: colors.bg.secondary,
                  border: 'border-red-500/30',
                  badge: 'bg-red-500/20 text-red-300 border border-red-500/30',
                },
                archived: {
                  bg: colors.bg.secondary,
                  border: colors.border,
                  badge: `${colors.bg.tertiary} ${colors.text.tertiary} border ${colors.border}`,
                },
              };
              const priorityColors = {
                urgent: 'bg-red-500/20 text-red-300 border border-red-500/40',
                high: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
                normal: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
                low: 'bg-slate-800/40 text-slate-400 border border-slate-700/40',
              };
              const color = statusColors[request.status] || statusColors.new;
              return (
                <GamingCard
                  key={request.id}
                  className={`${color.bg} border-2 ${color.border} transition-all hover:shadow-lg`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{request.title}</h3>
                        <span className={`rounded px-2 py-1 text-xs font-bold ${color.badge}`}>
                          {request.status.toUpperCase()}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${priorityColors[request.priority]}`}
                        >
                          {request.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="mb-4 font-medium text-slate-200">{request.description}</p>
                      <div className="mb-2 flex flex-wrap gap-4 text-sm text-slate-300">
                        <span className="font-semibold">
                          <strong>Tipo:</strong> {getTypeName(request.type)}
                        </span>
                        <span className="font-semibold">
                          <strong>Provenienza:</strong> {getSourceName(request.source)}
                        </span>
                        {request.source_contact && (
                          <span className="font-semibold">
                            <strong>Contatto:</strong> {request.source_contact}
                          </span>
                        )}
                        {request.assigned_to_name && (
                          <span className="font-semibold">
                            <strong>Assegnato a:</strong> {request.assigned_to_name}
                          </span>
                        )}
                        {request.project_name && (
                          <span className="font-semibold">
                            <strong>Progetto:</strong> {request.project_name}
                          </span>
                        )}
                        {request.due_date && (
                          <span className="font-semibold">
                            <strong>Scadenza:</strong> {formatDate(request.due_date)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-400">
                        Ricevuto: {formatDateTime(request.received_at)} | Creato da:{' '}
                        {request.created_by_name}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      {(request.status === 'new' || request.status === 'reviewing') && (
                        <>
                          <button
                            onClick={() => handleReview(request, 'approved')}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approva
                          </button>
                          <button
                            onClick={() => handleReview(request, 'rejected')}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md"
                          >
                            <X className="h-4 w-4" />
                            Rifiuta
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowConvertTaskModal(true);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
                          >
                            <ListTodo className="h-4 w-4" />→ Task
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowConvertProjectModal(true);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
                          >
                            <FolderPlus className="h-4 w-4" />→ Progetto
                          </button>
                        </>
                      )}
                      {!['converted_to_task', 'converted_to_project'].includes(request.status) && (
                        <button
                          onClick={() => handleEdit(request)}
                          className="flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-cyan-700 hover:shadow-md"
                        >
                          <Edit className="h-4 w-4" />
                          Modifica
                        </button>
                      )}
                      {request.status !== 'new' && request.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(request)}
                          className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md"
                        >
                          Archivia
                        </button>
                      )}
                      {request.status === 'archived' && (
                        <button
                          onClick={() => handleUnarchive(request)}
                          className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md"
                        >
                          Estrai
                        </button>
                      )}
                      {user?.role === 'amministratore' && (
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md"
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </div>
                </GamingCard>
              );
            })
        )}
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <GamingCard className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b-2 border-cyan-500/20 pb-4">
              <h2 className="text-2xl font-bold text-cyan-300">Nuova Richiesta</h2>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-2">Titolo *</label>
                  <input
                    type="text"
                    value={newRequestData.title}
                    onChange={(e) =>
                      setNewRequestData({ ...newRequestData, title: e.target.value })
                    }
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-label mb-2">Descrizione *</label>
                  <textarea
                    value={newRequestData.description}
                    onChange={(e) =>
                      setNewRequestData({ ...newRequestData, description: e.target.value })
                    }
                    className="textarea-dark w-full"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Tipo *</label>
                    <select
                      value={newRequestData.type}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, type: e.target.value })
                      }
                      className="input-dark w-full"
                      required
                    >
                      <option value="question">Domanda</option>
                      <option value="bug">Bug</option>
                      <option value="feature">Feature</option>
                      <option value="technical_issue">Problema Tecnico</option>
                      <option value="customer_complaint">Reclamo Cliente</option>
                      <option value="internal_request">Richiesta Interna</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Provenienza *</label>
                    <select
                      value={newRequestData.source}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, source: e.target.value })
                      }
                      className="input-dark w-full"
                      required
                    >
                      <option value="internal">Interno</option>
                      <option value="customer">Cliente</option>
                      <option value="support">Supporto</option>
                      <option value="management">Direzione</option>
                      <option value="sales">Commerciale</option>
                      <option value="production">Produzione</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Priorità</label>
                    <select
                      value={newRequestData.priority}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, priority: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="low">Bassa</option>
                      <option value="normal">Normale</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Contatto Fonte</label>
                    <input
                      type="text"
                      value={newRequestData.source_contact}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, source_contact: e.target.value })
                      }
                      className="input-dark w-full"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Progetto Collegato</label>
                    <select
                      value={newRequestData.project_id}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, project_id: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="">Nessuno</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Assegnato a</label>
                    <select
                      value={newRequestData.assigned_to}
                      onChange={(e) =>
                        setNewRequestData({ ...newRequestData, assigned_to: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="">Nessuno</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-label mb-1">Scadenza</label>
                  <input
                    type="date"
                    value={newRequestData.due_date}
                    onChange={(e) =>
                      setNewRequestData({ ...newRequestData, due_date: e.target.value })
                    }
                    className="input-dark w-full"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 border-t-2 border-cyan-500/20 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="flex-1 rounded-lg border-2 border-cyan-500/20 bg-slate-700 px-4 py-2 font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-600 hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white shadow-lg shadow-cyan-600/50 transition-all hover:bg-cyan-700 hover:shadow-xl"
                >
                  Crea Richiesta
                </button>
              </div>
            </form>
          </GamingCard>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditRequestModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <GamingCard className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b-2 border-cyan-500/20 pb-4">
              <h2 className="text-2xl font-bold text-cyan-300">Modifica Richiesta</h2>
              <button
                onClick={() => {
                  setShowEditRequestModal(false);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={editRequestData.title}
                    onChange={(e) =>
                      setEditRequestData({ ...editRequestData, title: e.target.value })
                    }
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-label mb-1">Descrizione *</label>
                  <textarea
                    value={editRequestData.description}
                    onChange={(e) =>
                      setEditRequestData({ ...editRequestData, description: e.target.value })
                    }
                    className="textarea-dark w-full"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Tipo *</label>
                    <select
                      value={editRequestData.type}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, type: e.target.value })
                      }
                      className="input-dark w-full"
                      required
                    >
                      <option value="question">Domanda</option>
                      <option value="bug">Bug</option>
                      <option value="feature">Feature</option>
                      <option value="technical_issue">Problema Tecnico</option>
                      <option value="customer_complaint">Reclamo Cliente</option>
                      <option value="internal_request">Richiesta Interna</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Provenienza *</label>
                    <select
                      value={editRequestData.source}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, source: e.target.value })
                      }
                      className="input-dark w-full"
                      required
                    >
                      <option value="internal">Interno</option>
                      <option value="customer">Cliente</option>
                      <option value="support">Supporto</option>
                      <option value="management">Direzione</option>
                      <option value="sales">Commerciale</option>
                      <option value="production">Produzione</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Priorità</label>
                    <select
                      value={editRequestData.priority}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, priority: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="low">Bassa</option>
                      <option value="normal">Normale</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Contatto Fonte</label>
                    <input
                      type="text"
                      value={editRequestData.source_contact}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, source_contact: e.target.value })
                      }
                      className="input-dark w-full"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1">Progetto Collegato</label>
                    <select
                      value={editRequestData.project_id}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, project_id: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="">Nessuno</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label mb-1">Assegnato a</label>
                    <select
                      value={editRequestData.assigned_to}
                      onChange={(e) =>
                        setEditRequestData({ ...editRequestData, assigned_to: e.target.value })
                      }
                      className="input-dark w-full"
                    >
                      <option value="">Nessuno</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-label mb-1">Scadenza</label>
                  <input
                    type="date"
                    value={editRequestData.due_date}
                    onChange={(e) =>
                      setEditRequestData({ ...editRequestData, due_date: e.target.value })
                    }
                    className="input-dark w-full"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 border-t-2 border-cyan-500/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRequestModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 rounded-lg border-2 border-cyan-500/20 bg-slate-700 px-4 py-2 font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-600 hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white shadow-lg shadow-cyan-600/50 transition-all hover:bg-cyan-700 hover:shadow-xl"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </GamingCard>
        </div>
      )}

      {/* Convert to Task Modal */}
      {showConvertTaskModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <GamingCard className="w-full max-w-md p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b-2 border-cyan-500/20 pb-4">
              <h2 className="text-2xl font-bold text-cyan-300">Converti in Task</h2>
              <button
                onClick={() => {
                  setShowConvertTaskModal(false);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleConvertToTask}>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1">Progetto</label>
                  <select
                    name="project_id"
                    className="input-dark w-full"
                    defaultValue={selectedRequest?.project_id || ''}
                  >
                    <option value="">Nessuno</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1">Assegna a *</label>
                  <select
                    name="assigned_to"
                    className="input-dark w-full"
                    defaultValue={selectedRequest?.assigned_to || user?.id || ''}
                    required
                  >
                    <option value="" disabled>
                      Seleziona un utente...
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1">Deadline</label>
                  <input
                    type="date"
                    name="deadline"
                    className="input-dark w-full"
                    defaultValue={selectedRequest?.due_date || ''}
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 border-t-2 border-cyan-500/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertTaskModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 rounded-lg border-2 border-cyan-500/20 bg-slate-700 px-4 py-2 font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-600 hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white shadow-lg shadow-cyan-600/50 transition-all hover:bg-cyan-700 hover:shadow-xl"
                >
                  Converti in Task
                </button>
              </div>
            </form>
          </GamingCard>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertProjectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <GamingCard className="w-full max-w-md p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b-2 border-cyan-500/20 pb-4">
              <h2 className="text-2xl font-bold text-cyan-300">Converti in Progetto</h2>
              <button
                onClick={() => {
                  setShowConvertProjectModal(false);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleConvertToProject}>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1">Nome Progetto *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedRequest?.title || ''}
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-label mb-1">Descrizione *</label>
                  <textarea
                    name="description"
                    defaultValue={selectedRequest?.description || ''}
                    className="textarea-dark w-full"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 border-t-2 border-cyan-500/20 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertProjectModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 rounded-lg border-2 border-cyan-500/20 bg-slate-700 px-4 py-2 font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-600 hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 font-bold text-white shadow-lg shadow-cyan-600/50 transition-all hover:bg-cyan-700 hover:shadow-xl"
                >
                  Converti in Progetto
                </button>
              </div>
            </form>
          </GamingCard>
        </div>
      )}
    </GamingLayout>
  );
};

export default InboxPage;
