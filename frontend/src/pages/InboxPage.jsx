import { useState, useEffect } from 'react';
import { requestsApi, projectsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Card, Button, StatusBadge, PriorityBadge, Modal
} from '../components/ui';
import {
  Inbox, Plus, Filter, Search, AlertCircle, CheckCircle, X,
  Clock, ArrowRight, FileText, FolderPlus, ListTodo, Edit
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

      await requestsApi.create(requestData);
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
    if (!selectedRequest) return;

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
    if (!selectedRequest) return;

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
      <>
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Caricamento...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
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
          <Button onClick={() => setShowNewRequestModal(true)}>
            <Plus className="w-5 h-5" />
            Nuova Richiesta
          </Button>
        </div>

        {/* Stats */}
        {stats && stats.byStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.byStatus.map(stat => (
              <Card key={stat.status} padding="md" shadow="sm">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={stat.status} size="sm" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                {stat.avg_resolution_hours && (
                  <div className="text-xs text-gray-500 mt-1">
                    Media: {Math.round(stat.avg_resolution_hours)}h
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
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
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="text-center text-gray-500" padding="lg">
            Nessuna richiesta trovata
          </Card>
        ) : (
          requests.map(request => (
            <Card key={request.id} hover padding="lg">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    <StatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                  </div>
                  <p className="text-gray-700 mb-3">{request.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span><strong>Tipo:</strong> {getTypeName(request.type)}</span>
                    <span><strong>Provenienza:</strong> {getSourceName(request.source)}</span>
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
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleReview(request, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approva
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReview(request, 'rejected')}
                      >
                        <X className="w-4 h-4" />
                        Rifiuta
                      </Button>
                    </>
                  )}
                  {request.status === 'approved' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowConvertTaskModal(true);
                        }}
                      >
                        <ListTodo className="w-4 h-4" />
                        → Task
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowConvertProjectModal(true);
                        }}
                      >
                        <FolderPlus className="w-4 h-4" />
                        → Progetto
                      </Button>
                    </>
                  )}
                  {/* Edit button - available for all non-converted requests */}
                  {!['converted_to_task', 'converted_to_project'].includes(request.status) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEdit(request)}
                    >
                      <Edit className="w-4 h-4" />
                      Modifica
                    </Button>
                  )}
                  {user?.role === 'amministratore' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDelete(request.id)}
                    >
                      Elimina
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New Request Modal */}
      <Modal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="Nuova Richiesta"
        size="lg"
      >
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
              <div className="flex gap-3 mt-6">
                <Button type="submit" fullWidth>
                  Crea Richiesta
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewRequestModal(false)}
                >
                  Annulla
                </Button>
              </div>
            </form>
      </Modal>

      {/* Edit Request Modal */}
      <Modal
        isOpen={showEditRequestModal && selectedRequest}
        onClose={() => {
          setShowEditRequestModal(false);
          setSelectedRequest(null);
        }}
        title="Modifica Richiesta"
        size="lg"
      >
        <form onSubmit={handleUpdateRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={editRequestData.title}
                    onChange={(e) => setEditRequestData({ ...editRequestData, title: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Descrizione *</label>
                  <textarea
                    value={editRequestData.description}
                    onChange={(e) => setEditRequestData({ ...editRequestData, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Tipo *</label>
                    <select
                      value={editRequestData.type}
                      onChange={(e) => setEditRequestData({ ...editRequestData, type: e.target.value })}
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
                      value={editRequestData.source}
                      onChange={(e) => setEditRequestData({ ...editRequestData, source: e.target.value })}
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
                      value={editRequestData.priority}
                      onChange={(e) => setEditRequestData({ ...editRequestData, priority: e.target.value })}
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
                      value={editRequestData.source_contact}
                      onChange={(e) => setEditRequestData({ ...editRequestData, source_contact: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="Nome/Email/Telefono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Progetto Collegato</label>
                    <select
                      value={editRequestData.project_id}
                      onChange={(e) => setEditRequestData({ ...editRequestData, project_id: e.target.value })}
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
                      value={editRequestData.assigned_to}
                      onChange={(e) => setEditRequestData({ ...editRequestData, assigned_to: e.target.value })}
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
                    value={editRequestData.due_date}
                    onChange={(e) => setEditRequestData({ ...editRequestData, due_date: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" fullWidth>
                  Salva Modifiche
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditRequestModal(false);
                    setSelectedRequest(null);
                  }}
                >
                  Annulla
                </Button>
              </div>
            </form>
      </Modal>

      {/* Convert to Task Modal */}
      <Modal
        isOpen={showConvertTaskModal && selectedRequest}
        onClose={() => {
          setShowConvertTaskModal(false);
          setSelectedRequest(null);
        }}
        title="Converti in Task"
        size="md"
      >
        <form onSubmit={handleConvertToTask}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Progetto</label>
                  <select name="project_id" className="w-full p-2 border rounded" defaultValue={selectedRequest?.project_id || ''}>
                    <option value="">Nessuno</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Assegna a</label>
                  <select name="assigned_to" className="w-full p-2 border rounded" defaultValue={selectedRequest?.assigned_to || ''} required>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Deadline</label>
                  <input type="date" name="deadline" className="w-full p-2 border rounded" defaultValue={selectedRequest?.due_date || ''} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" fullWidth>
                  Converti in Task
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowConvertTaskModal(false);
                    setSelectedRequest(null);
                  }}
                >
                  Annulla
                </Button>
              </div>
            </form>
      </Modal>

      {/* Convert to Project Modal */}
      <Modal
        isOpen={showConvertProjectModal && selectedRequest}
        onClose={() => {
          setShowConvertProjectModal(false);
          setSelectedRequest(null);
        }}
        title="Converti in Progetto"
        size="md"
      >
        <form onSubmit={handleConvertToProject}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Nome Progetto *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedRequest?.title || ''}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Descrizione *</label>
                  <textarea
                    name="description"
                    defaultValue={selectedRequest?.description || ''}
                    className="w-full p-2 border rounded"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" fullWidth>
                  Converti in Progetto
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowConvertProjectModal(false);
                    setSelectedRequest(null);
                  }}
                >
                  Annulla
                </Button>
              </div>
            </form>
      </Modal>
      </div>
    </>
  );
};

export default InboxPage;
