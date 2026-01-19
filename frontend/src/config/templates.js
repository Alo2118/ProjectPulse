// Template Configuration for ProjectPulse
//
// IMPORTANT: As of the latest update, all templates (Project, Task, Milestone) are now
// managed via the database and editable through the UI at /templates.
//
// To populate initial templates, run: npm run seed-templates (in backend directory)
//
// This file now contains only SMART_DEFAULTS for auto-calculation and default behaviors.

// Smart defaults configuration
export const SMART_DEFAULTS = {
  task: {
    // Default priority based on project type
    priorityByContext: {
      fissatore: 'high',
      protesi: 'high',
      strumentario: 'medium',
      ricerca: 'medium',
      default: 'medium',
    },
    // Default deadline offset in days
    deadlineOffset: 7,
    // Auto-assign to last used user (stored in localStorage)
    rememberLastAssignee: true,
    // Auto-calculate start_date based on deadline and estimated hours
    // Logic: deadline - (estimated_hours / hoursPerWorkingDay)
    // Falls back to today if no deadline or no estimated hours
    autoCalculateStartDate: true,
    // Hours per working day for start date calculation
    hoursPerWorkingDay: 8,
  },
  project: {
    // Default status for new projects
    status: 'active',
    // Auto-create first milestone
    createDefaultMilestone: true,
  },
  milestone: {
    // Default duration in days
    defaultDuration: 30,
    // Auto-calculate due date based on project start + duration
    autoCalculateDueDate: true,
  },
};

export default {
  SMART_DEFAULTS,
};
