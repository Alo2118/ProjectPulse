import { useState, useEffect } from 'react';
import { requestsApi, projectsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Inbox, Plus, Filter, Search, AlertCircle, CheckCircle, X,
  Clock, ArrowRight, FileText, FolderPlus, ListTodo
} from 'lucide-react';

const InboxPage = () => {
  const { user } = useAuth();
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

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
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
      await requestsApi.create(newRequestData);
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
      alert(`Richiesta ${status === 'approved' ? 'approvata' : 'rifiutata'}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConvertToTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: selectedRequest.title,
        description: selectedRequest.description,
        project_id: selectedRequest.project_id || e.target.project_id.value || null,
        assigned_to: selectedRequest.assigned_to || e.target.assigned_to.value,
        priority: selectedRequest.priority,
        deadline: e.target.deadline.value || null
      };
      await requestsApi.convertToTask(selectedRequest.id, taskData);
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
    try {
      const projectData = {
        name: e.target.name.value,
        description: e.target.description.value
      };
      await requestsApi.convertToProject(selectedRequest.id, projectData);
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

  const getStatusBadge = (status) => {
    const badges = {
      new: { label: 'Nuova', className: 'bg-blue-100 text-blue-800' },
      reviewing: { label: 'In Valutazione', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approvata', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rifiutata', className: 'bg-red-100 text-red-800' },
      converted_to_task: { label: 'Convertita in Task', className: 'bg-purple-100 text-purple-800' },
      converted_to_project: { label: 'Convertita in Progetto', className: 'bg-indigo-100 text-indigo-800' },
      archived: { label: 'Archiviata', className: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[status] || badges.new;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: { label: 'Urgente', className: 'bg-red-100 text-red-800' },
      high: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
      normal: { label: 'Normale', className: 'bg-blue-100 text-blue-800' },
      low: { label: 'Bassa', className: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[priority] || badges.normal;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>;
  };

  const getTypeBadge = (type) => {
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

  const getSourceBadge = (source) => {
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Inbox className="w-8 h-8" />
              Inbox - Richieste Ufficio Tecnico
            </h1>
            <p className="text-gray-600 mt-1">
              Gestisci tutte le richieste e input ricevuti quotidianamente
            </p>
          </div>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Richiesta
          </button>
        </div>

        {/* Stats */}
        {stats && stats.byStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.byStatus.map(stat => (
              <div key={stat.status} className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold">{stat.count}</div>
                <div className="text-sm text-gray-600">{getStatusBadge(stat.status)}</div>
                {stat.avg_resolution_hours && (
                  <div className="text-xs text-gray-500 mt-1">
                    Media: {Math.round(stat.avg_resolution_hours)}h
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5" />
            <span className="font-semibold">Filtri</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium mb-1">Priorità</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Tutte</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normale</option>
                <option value="low">Bassa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium mb-1">Ricerca</label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-2 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca..."
                  className="w-full p-2 pl-9 border rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            Nessuna richiesta trovata
          </div>
        ) : (
          requests.map(request => (
            <div key={request.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                  <p className="text-gray-700 mb-3">{request.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span><strong>Tipo:</strong> {getTypeBadge(request.type)}</span>
                    <span><strong>Provenienza:</strong> {getSourceBadge(request.source)}</span>
                    {request.source_contact && <span><strong>Contatto:</strong> {request.source_contact}</span>}
                    {request.assigned_to_name && <span><strong>Assegnato a:</strong> {request.assigned_to_name}</span>}
                    {request.project_name && <span><strong>Progetto:</strong> {request.project_name}</span>}
                    {request.due_date && <span><strong>Scadenza:</strong> {new Date(request.due_date).toLocaleDateString('it-IT')}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Ricevuto: {new Date(request.received_at).toLocaleString('it-IT')} |
                    Creato da: {request.created_by_name}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {(request.status === 'new' || request.status === 'reviewing') && (
                    <>
                      <button
                        onClick={() => handleReview(request, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approva
                      </button>
                      <button
                        onClick={() => handleReview(request, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
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
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                      >
                        <ListTodo className="w-4 h-4" />
                        → Task
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowConvertProjectModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <FolderPlus className="w-4 h-4" />
                        → Progetto
                      </button>
                    </>
                  )}
                  {user?.role === 'amministratore' && (
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Nuova Richiesta</h2>
            <form onSubmit={handleCreateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={newRequestData.title}
                    onChange={(e) => setNewRequestData({ ...newRequestData, title: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Descrizione *</label>
                  <textarea
                    value={newRequestData.description}
                    onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Tipo *</label>
                    <select
                      value={newRequestData.type}
                      onChange={(e) => setNewRequestData({ ...newRequestData, type: e.target.value })}
                      className="w-full p-2 border rounded"
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
                    <label className="block font-medium mb-1">Provenienza *</label>
                    <select
                      value={newRequestData.source}
                      onChange={(e) => setNewRequestData({ ...newRequestData, source: e.target.value })}
                      className="w-full p-2 border rounded"
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
                    <label className="block font-medium mb-1">Priorità</label>
                    <select
                      value={newRequestData.priority}
                      onChange={(e) => setNewRequestData({ ...newRequestData, priority: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="low">Bassa</option>
                      <option value="normal">Normale</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Contatto Fonte</label>
                    <input
                      type="text"
                      value={newRequestData.source_contact}
                      onChange={(e) => setNewRequestData({ ...newRequestData, source_contact: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Progetto Collegato</label>
                    <select
                      value={newRequestData.project_id}
                      onChange={(e) => setNewRequestData({ ...newRequestData, project_id: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Nessuno</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Assegnato a</label>
                    <select
                      value={newRequestData.assigned_to}
                      onChange={(e) => setNewRequestData({ ...newRequestData, assigned_to: e.target.value })}
                      className="w-full p-2 border rounded"
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
                  <label className="block font-medium mb-1">Scadenza</label>
                  <input
                    type="date"
                    value={newRequestData.due_date}
                    onChange={(e) => setNewRequestData({ ...newRequestData, due_date: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Crea Richiesta
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Task Modal */}
      {showConvertTaskModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Converti in Task</h2>
            <form onSubmit={handleConvertToTask}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Progetto</label>
                  <select name="project_id" className="w-full p-2 border rounded" defaultValue={selectedRequest.project_id || ''}>
                    <option value="">Nessuno</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Assegna a</label>
                  <select name="assigned_to" className="w-full p-2 border rounded" defaultValue={selectedRequest.assigned_to || ''} required>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Deadline</label>
                  <input type="date" name="deadline" className="w-full p-2 border rounded" defaultValue={selectedRequest.due_date || ''} />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                  Converti in Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertTaskModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertProjectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Converti in Progetto</h2>
            <form onSubmit={handleConvertToProject}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Nome Progetto *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedRequest.title}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Descrizione *</label>
                  <textarea
                    name="description"
                    defaultValue={selectedRequest.description}
                    className="w-full p-2 border rounded"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Converti in Progetto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertProjectModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
