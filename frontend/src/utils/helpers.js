/**
 * Utility Functions - ProjectPulse
 * Centralized helper functions to avoid code duplication
 */

import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ==================== TIME FORMATTING ====================

/**
 * Format seconds to human-readable time string
 * @param {number} seconds - Time in seconds
 * @param {boolean} showSeconds - Whether to show seconds (default: false)
 * @returns {string} Formatted time string (e.g., "2h 30m" or "45m")
 */
export const formatTime = (seconds, showSeconds = false) => {
  if (!seconds || seconds === 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (showSeconds && secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0m';
};

/**
 * Format seconds to hours with decimal
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted hours (e.g., "2.5h")
 */
export const formatTimeToHours = (seconds) => {
  if (!seconds || seconds === 0) return '0h';
  const hours = (seconds / 3600).toFixed(1);
  return `${hours}h`;
};

// ==================== DATE FORMATTING ====================

/**
 * Format date to Italian locale
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'dd MMM yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = 'dd MMM yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: it });
};

/**
 * Format datetime to Italian locale with time
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'dd MMM yyyy HH:mm');
};

/**
 * Get relative time (e.g., "2 giorni fa")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ora';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return formatDate(dateObj);
};

/**
 * Check if date is overdue
 * @param {Date|string} deadline - Deadline to check
 * @returns {boolean} True if overdue
 */
export const isOverdue = (deadline) => {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  deadlineDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
};

/**
 * Check if date is approaching (within days)
 * @param {Date|string} deadline - Deadline to check
 * @param {number} days - Number of days threshold (default: 3)
 * @returns {boolean} True if approaching
 */
export const isApproaching = (deadline, days = 3) => {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  deadlineDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
};

/**
 * Get days until deadline
 * @param {Date|string} deadline - Deadline to check
 * @returns {number} Days until deadline (negative if overdue)
 */
export const getDaysUntil = (deadline) => {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  deadlineDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==================== TASK STATUS & PRIORITY ====================

/**
 * Get status label in Italian
 * @param {string} status - Task status
 * @returns {string} Italian label
 */
export const getStatusLabel = (status) => {
  const labels = {
    todo: 'Da fare',
    in_progress: 'In corso',
    blocked: 'Bloccato',
    waiting_clarification: 'In attesa',
    completed: 'Completato'
  };
  return labels[status] || status;
};

/**
 * Get status color classes
 * @param {string} status - Task status
 * @returns {object} Object with bg and text color classes
 */
export const getStatusColors = (status) => {
  const colors = {
    todo: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    blocked: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    waiting_clarification: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' }
  };
  return colors[status] || colors.todo;
};

/**
 * Get priority label in Italian
 * @param {string} priority - Task priority
 * @returns {string} Italian label
 */
export const getPriorityLabel = (priority) => {
  const labels = {
    bassa: 'Bassa',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
  };
  return labels[priority] || priority;
};

/**
 * Get priority color classes
 * @param {string} priority - Task priority
 * @returns {object} Object with text color class
 */
export const getPriorityColors = (priority) => {
  const colors = {
    bassa: { text: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-300' },
    media: { text: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-300' },
    alta: { text: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-300' },
    critica: { text: 'text-red-500', bg: 'bg-red-100', border: 'border-red-300' }
  };
  return colors[priority] || colors.media;
};

// ==================== STATISTICS CALCULATIONS ====================

/**
 * Calculate task statistics
 * @param {Array} tasks - Array of tasks
 * @returns {object} Statistics object
 */
export const calculateTaskStats = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return {
      total: 0,
      todo: 0,
      in_progress: 0,
      blocked: 0,
      waiting_clarification: 0,
      completed: 0,
      totalTime: 0,
      completionRate: 0
    };
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    waiting_clarification: tasks.filter(t => t.status === 'waiting_clarification').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    totalTime: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  };

  stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return stats;
};

/**
 * Group tasks by status
 * @param {Array} tasks - Array of tasks
 * @returns {object} Object with tasks grouped by status
 */
export const groupTasksByStatus = (tasks) => {
  return {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    waiting_clarification: tasks.filter(t => t.status === 'waiting_clarification'),
    completed: tasks.filter(t => t.status === 'completed')
  };
};

/**
 * Calculate average completion time
 * @param {Array} tasks - Array of tasks
 * @returns {number} Average time in seconds
 */
export const calculateAvgCompletionTime = (tasks) => {
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.time_spent > 0);
  if (completedTasks.length === 0) return 0;
  const totalTime = completedTasks.reduce((sum, t) => sum + t.time_spent, 0);
  return totalTime / completedTasks.length;
};

/**
 * Get overdue tasks
 * @param {Array} tasks - Array of tasks
 * @returns {Array} Overdue tasks
 */
export const getOverdueTasks = (tasks) => {
  return tasks.filter(task => {
    if (!task.deadline || task.status === 'completed') return false;
    return isOverdue(task.deadline);
  });
};

/**
 * Get approaching deadline tasks
 * @param {Array} tasks - Array of tasks
 * @param {number} days - Days threshold (default: 3)
 * @returns {Array} Tasks with approaching deadlines
 */
export const getApproachingTasks = (tasks, days = 3) => {
  return tasks.filter(task => {
    if (!task.deadline || task.status === 'completed') return false;
    return isApproaching(task.deadline, days);
  });
};

// ==================== VALIDATION ====================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { isValid: false, message: 'La password deve contenere almeno 6 caratteri' };
  }
  if (password.length < 8) {
    return { isValid: true, message: 'Password debole: usa almeno 8 caratteri' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { isValid: true, message: 'Password media: aggiungi maiuscole, minuscole e numeri' };
  }
  return { isValid: true, message: 'Password forte' };
};

/**
 * Sanitize HTML input (basic)
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// ==================== ARRAY UTILITIES ====================

/**
 * Sort array by property
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortBy = (array, property, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];

    if (aVal === bVal) return 0;
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50) => {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};
