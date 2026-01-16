import { useState, useEffect, useMemo } from 'react';
import { requestsApi, projectsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePendingRequestsCount } from '../hooks/usePendingRequestsCount';
import {
  GamingLayout, GamingHeader, GamingCard, Button
} from '../components/ui';
import {
  Inbox, Plus, Filter, Search, AlertCircle, CheckCircle, X,
  Clock, ArrowRight, FileText, FolderPlus, ListTodo, Edit
} from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/helpers';

const InboxPage = () => {
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
    due_date: ''
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
    due_date: ''
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
        requestsApi.getStats()
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
        due_date: newRequestData.due_date || null
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
        due_date: ''
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
        deadline: e.target.deadline.value || null
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
        description: e.target.description.value
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
      alert('Richiesta estratta dall\'archivio');
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
      due_date: request.due_date || ''
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
        due_date: editRequestData.due_date || null
      };

      await requestsApi.update(selectedRequest.id, requestData);
      alert('Richiesta aggiornata con successo!');
      setShowEditRequestModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      alert('Errore nell\'aggiornamento: ' + (error.response?.data?.error || error.message));
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
      other: 'Altro'
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
      production: 'Produzione'
    };
    return sources[source] || source;
  };

  if (loading) {
    return (
      <GamingLayout>
        <GamingHeader
          title="Inbox"
          subtitle="Richieste Ufficio Tecnico"
          icon={Inbox}
        />
        <GamingCard className="text-center py-12">
          <div className="text-lg text-slate-600">Caricamento...</div>
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
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xl shadow-primary-600/50 transition-all font-bold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuova</span>
          </Button>
        }
      />

      {/* Stats */}
      {stats && stats.byStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.byStatus.map((stat) => {
            const emojis = {pending: '⏳', in_progress: '🚀', resolved: '✅', rejected: '❌', new: '📬'};
            const colors = {
              pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', label: 'text-yellow-700' },
              in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', label: 'text-blue-700' },
              resolved: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', label: 'text-emerald-700' },
              rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', label: 'text-red-700' },
              new: { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-900', label: 'text-primary-700' }
            };
            const color = colors[stat.status] || colors.pending;
            return (
              <GamingCard key={stat.status} className={`${color.bg} border-2 ${color.border}`}>
                <div className="text-2xl mb-2">{emojis[stat.status] || '📋'}</div>
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
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-600" />
          <span className="font-bold text-slate-900">Filtri</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
            <label className="block text-sm font-bold text-slate-900 mb-1">Priorità</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
            >
              <option value="">Tutte</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="normal">Normale</option>
              <option value="low">Bassa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
            <label className="block text-sm font-bold text-slate-900 mb-1">Ricerca</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-2 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca..."
                className="w-full bg-white border-2 border-slate-200 rounded-lg pl-9 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
            className="rounded border-2 border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="showArchived" className="text-sm font-medium text-slate-900 cursor-pointer">
            Mostra richieste archiviate
          </label>
        </div>
      </GamingCard>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <GamingCard className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nessuna richiesta trovata</h3>
            <p className="text-slate-600">Tutte le richieste sono state elaborate</p>
          </GamingCard>
        ) : (
          requests
            .filter(request => showArchived || request.status !== 'archived')
            .map(request => {
              const statusColors = {
                new: { bg: 'bg-primary-50', border: 'border-primary-200', badge: 'bg-primary-100 text-primary-700' },
                reviewing: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
                approved: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
                rejected: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
                archived: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' }
              };
              const priorityColors = {
                urgent: 'bg-red-100 text-red-700',
                high: 'bg-orange-100 text-orange-700',
                normal: 'bg-blue-100 text-blue-700',
                low: 'bg-slate-100 text-slate-700'
              };
              const color = statusColors[request.status] || statusColors.new;
              return (
                <GamingCard
                  key={request.id}
                  className={`${color.bg} border-2 ${color.border} hover:shadow-lg transition-all`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{request.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${color.badge}`}>
                          {request.status.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${priorityColors[request.priority]}`}>
                          {request.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-700 mb-4 font-medium">{request.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-700 mb-2">
                        <span className="font-semibold"><strong>Tipo:</strong> {getTypeName(request.type)}</span>
                        <span className="font-semibold"><strong>Provenienza:</strong> {getSourceName(request.source)}</span>
                        {request.source_contact && <span className="font-semibold"><strong>Contatto:</strong> {request.source_contact}</span>}
                        {request.assigned_to_name && <span className="font-semibold"><strong>Assegnato a:</strong> {request.assigned_to_name}</span>}
                        {request.project_name && <span className="font-semibold"><strong>Progetto:</strong> {request.project_name}</span>}
                        {request.due_date && <span className="font-semibold"><strong>Scadenza:</strong> {formatDate(request.due_date)}</span>}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        Ricevuto: {formatDateTime(request.received_at)} | Creato da: {request.created_by_name}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {(request.status === 'new' || request.status === 'reviewing') && (
                        <>
                          <button
                            onClick={() => handleReview(request, 'approved')}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approva
                          </button>
                          <button
                            onClick={() => handleReview(request, 'rejected')}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
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
                            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-1"
                          >
                            <ListTodo className="w-4 h-4" />
                            → Task
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowConvertProjectModal(true);
                            }}
                            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-1"
                          >
                            <FolderPlus className="w-4 h-4" />
                            → Progetto
                          </button>
                        </>
                      )}
                      {!['converted_to_task', 'converted_to_project'].includes(request.status) && (
                        <button
                          onClick={() => handleEdit(request)}
                          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Modifica
                        </button>
                      )}
                      {request.status !== 'new' && request.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(request)}
                          className="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
                        >
                          Archivia
                        </button>
                      )}
                      {request.status === 'archived' && (
                        <button
                          onClick={() => handleUnarchive(request)}
                          className="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
                        >
                          Estrai
                        </button>
                      )}
                      {user?.role === 'amministratore' && (
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GamingCard className="shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Nuova Richiesta</h2>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-600 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Titolo *</label>
                  <input
                    type="text"
                    value={newRequestData.title}
                    onChange={(e) => setNewRequestData({ ...newRequestData, title: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Descrizione *</label>
                  <textarea
                    value={newRequestData.description}
                    onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Tipo *</label>
                    <select
                      value={newRequestData.type}
                      onChange={(e) => setNewRequestData({ ...newRequestData, type: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
                    <label className="block text-sm font-bold text-slate-900 mb-2">Provenienza *</label>
                    <select
                      value={newRequestData.source}
                      onChange={(e) => setNewRequestData({ ...newRequestData, source: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
                    <label className="block text-sm font-bold text-slate-900 mb-2">Priorità</label>
                    <select
                      value={newRequestData.priority}
                      onChange={(e) => setNewRequestData({ ...newRequestData, priority: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="low">Bassa</option>
                      <option value="normal">Normale</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Contatto Fonte</label>
                    <input
                      type="text"
                      value={newRequestData.source_contact}
                      onChange={(e) => setNewRequestData({ ...newRequestData, source_contact: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Progetto Collegato</label>
                    <select
                      value={newRequestData.project_id}
                      onChange={(e) => setNewRequestData({ ...newRequestData, project_id: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="">Nessuno</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Assegnato a</label>
                    <select
                      value={newRequestData.assigned_to}
                      onChange={(e) => setNewRequestData({ ...newRequestData, assigned_to: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="">Nessuno</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Scadenza</label>
                  <input
                    type="date"
                    value={newRequestData.due_date}
                    onChange={(e) => setNewRequestData({ ...newRequestData, due_date: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-600/50 hover:shadow-xl"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GamingCard className="shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Modifica Richiesta</h2>
              <button onClick={() => { setShowEditRequestModal(false); setSelectedRequest(null); }} className="text-slate-600 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Titolo *</label>
                  <input
                    type="text"
                    value={editRequestData.title}
                    onChange={(e) => setEditRequestData({ ...editRequestData, title: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Descrizione *</label>
                  <textarea
                    value={editRequestData.description}
                    onChange={(e) => setEditRequestData({ ...editRequestData, description: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Tipo *</label>
                    <select
                      value={editRequestData.type}
                      onChange={(e) => setEditRequestData({ ...editRequestData, type: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
                    <label className="block text-sm font-bold text-slate-900 mb-2">Provenienza *</label>
                    <select
                      value={editRequestData.source}
                      onChange={(e) => setEditRequestData({ ...editRequestData, source: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
                    <label className="block text-sm font-bold text-slate-900 mb-2">Priorità</label>
                    <select
                      value={editRequestData.priority}
                      onChange={(e) => setEditRequestData({ ...editRequestData, priority: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="low">Bassa</option>
                      <option value="normal">Normale</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Contatto Fonte</label>
                    <input
                      type="text"
                      value={editRequestData.source_contact}
                      onChange={(e) => setEditRequestData({ ...editRequestData, source_contact: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Progetto Collegato</label>
                    <select
                      value={editRequestData.project_id}
                      onChange={(e) => setEditRequestData({ ...editRequestData, project_id: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="">Nessuno</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Assegnato a</label>
                    <select
                      value={editRequestData.assigned_to}
                      onChange={(e) => setEditRequestData({ ...editRequestData, assigned_to: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="">Nessuno</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Scadenza</label>
                  <input
                    type="date"
                    value={editRequestData.due_date}
                    onChange={(e) => setEditRequestData({ ...editRequestData, due_date: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRequestModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-600/50 hover:shadow-xl"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GamingCard className="shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Converti in Task</h2>
              <button onClick={() => { setShowConvertTaskModal(false); setSelectedRequest(null); }} className="text-slate-600 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleConvertToTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Progetto</label>
                  <select 
                    name="project_id" 
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    defaultValue={selectedRequest?.project_id || ''}
                  >
                    <option value="">Nessuno</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Assegna a *</label>
                  <select 
                    name="assigned_to" 
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    defaultValue={selectedRequest?.assigned_to || user?.id || ''} 
                    required
                  >
                    <option value="" disabled>Seleziona un utente...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Deadline</label>
                  <input 
                    type="date" 
                    name="deadline" 
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    defaultValue={selectedRequest?.due_date || ''} 
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertTaskModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-600/50 hover:shadow-xl"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GamingCard className="shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Converti in Progetto</h2>
              <button onClick={() => { setShowConvertProjectModal(false); setSelectedRequest(null); }} className="text-slate-600 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleConvertToProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Nome Progetto *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedRequest?.title || ''}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Descrizione *</label>
                  <textarea
                    name="description"
                    defaultValue={selectedRequest?.description || ''}
                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertProjectModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-600/50 hover:shadow-xl"
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
