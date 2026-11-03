/**
 * endpoints.js — thin, named wrappers around `api` grouped by domain.
 * Screens import from here instead of hand-writing paths, so a route change
 * is a one-line edit and every call site reads like English.
 */

import { api, download } from './api'

/* ------------------------------------------------------------------ auth */
export const AuthAPI = {
  login: (identifier, password) => api.login(identifier, password),
  me: () => api.get('/auth/me'),
  users: () => api.get('/auth/users'),

  updateUser: (id, body) => api.patch(`/auth/users/${id}`, body),
  deleteUser: (id) => api.del(`/auth/users/${id}`),
  /** Does this phone belong to an account that still needs a password? */
  signupCheck: (phone) => api.post('/auth/signup/check', { phone }),
  /** Set the password of a phone-registered account. Returns a Token. */
  signup: (body) => api.post('/auth/signup', body),
  /** Bulk-create accounts from a sheet: phone | class_name | name | role. */

}

/* --------------------------------------------------------------- classes */
export const ClassAPI = {
  list: () => api.get('/classes'),
  get: (id) => api.get(`/classes/${id}`),
  create: (body) => api.post('/classes', body),
  update: (id, body) => api.patch(`/classes/${id}`, body),
  remove: (id) => api.del(`/classes/${id}`),
}

/* ------------------------------------------------------------------ boys */
export const BoyAPI = {
  list: (params) => api.get('/boys', params),
  get: (id) => api.get(`/boys/${id}`),
  create: (body) => api.post('/boys', body),
  update: (id, body) => api.patch(`/boys/${id}`, body),
  remove: (id) => api.del(`/boys/${id}`),
  /** Boys whose names look alike: { threshold, scope, class_id }. */
  duplicates: (params) => api.get('/boys/duplicate-names', params),
  import: (file) => api.upload('/boys/import', file),
  template: () => download('/boys/template', null, 'boys-template.xlsx'),
  export: (classId) => download('/boys/export', { class_id: classId }, 'boys.xlsx'),
}

/* -------------------------------------------------------------- teachers */
export const TeacherAPI = {
  list: (params) => api.get('/teachers', params),
  get: (id) => api.get(`/teachers/${id}`),
  /** The logged-in servant's own record. */
  me: () => api.get('/teachers/me'),
  /** A servant editing himself — the phone and the class stay locked. */
  updateMe: (body) => api.patch('/teachers/me', body),
  create: (body) => api.post('/teachers', body),
  update: (id, body) => api.patch(`/teachers/${id}`, body),
  remove: (id) => api.del(`/teachers/${id}`),
  import: (file) => api.upload('/teachers/import', file),
  template: () => download('/teachers/template', null, 'teachers-template.xlsx'),
  export: (classId) => download('/teachers/export', { class_id: classId }, 'teachers.xlsx'),
}

/* ------------------------------------------------------------ attendance */
export const AttendAPI = {
  list: (params) => api.get('/attendance', params),
  saveBulk: (body) => api.post('/attendance/bulk', body),
  update: (id, body) => api.patch(`/attendance/${id}`, body),
  remove: (id) => api.del(`/attendance/${id}`),
}

/* ------------------------------------------------------------- follow-up */
export const FollowUpAPI = {
  list: (params) => api.get('/follow-ups', params),
  create: (body) => api.post('/follow-ups', body),
  update: (id, body) => api.patch(`/follow-ups/${id}`, body),
  remove: (id) => api.del(`/follow-ups/${id}`),
}

/* ------------------------------------------------------------------ trips */
export const TripAPI = {
  list: (params) => api.get('/trips', params),
  get: (id) => api.get(`/trips/${id}`),
  create: (body) => api.post('/trips', body),
  update: (id, body) => api.patch(`/trips/${id}`, body),
  remove: (id) => api.del(`/trips/${id}`),
}


/* -------------------------------------------------------- subscriptions */
export const SubscriptionAPI = {
  list: (params) => api.get('/subscriptions', params),
  getForTrip: (tripId) => api.get(`/subscriptions/trip/${tripId}`),
  getBoys: (tripId) => api.get(`/subscriptions/trip/${tripId}/boys`),
  getTripSummary: (tripId) => api.get(`/subscriptions/trip/${tripId}/summary`),
  getBoyTripSummary: (tripId, boyId) =>
    api.get(`/subscriptions/trip/${tripId}/boy/${boyId}/summary`),
  create: (body) => api.post('/subscriptions', body),
  update: (id, body) => api.patch(`/subscriptions/${id}`, body),
  remove: (id) => api.del(`/subscriptions/${id}`),
};

/* -------------------------------------------------------------- tasks */
export const TaskAPI = {
  list: (params) => api.get('/tasks', params),
  get: (id) => api.get(`/tasks/${id}`),
  create: (body) => api.post('/tasks', body),
  update: (id, body) => api.patch(`/tasks/${id}`, body),
  remove: (id) => api.del(`/tasks/${id}`),
}

/* --------------------------------------------------------- task values */
export const TaskValueAPI = {
  list: (params) => api.get('/task-values', params),
  get: (id) => api.get(`/task-values/${id}`),
  create: (body) => api.post('/task-values', body),
  /** The dues sheet: tick every طايو handed over, then save once. */
  saveBulk: (items) => api.patch('/task-values/bulk', { items }),
  update: (id, body) => api.patch(`/task-values/${id}`, body),
  remove: (id) => api.del(`/task-values/${id}`),
}

/* ------------------------- myTrip (رحلتي) ------------------------- */
/* -------------------------------------------------------- servant checks */
export const CheckAPI = {
  list: (params) => api.get('/teacher-checks', params),
  saveBulk: (body) => api.post('/teacher-checks/bulk', body),
  update: (id, body) => api.patch(`/teacher-checks/${id}`, body),
  remove: (id) => api.del(`/teacher-checks/${id}`),
}

/* ---------------------------------------------------------------- groups */
export const GroupAPI = {
  list: (params) => api.get('/groups', params),
  assign: (teacherId, boyIds) => api.post('/groups/assign', { teacher_id: teacherId, boy_ids: boyIds }),
  unassign: (boyIds) => api.post('/groups/unassign', { boy_ids: boyIds }),
  template: (classId) =>
    download('/groups/template', { class_id: classId }, 'follow-up-groups-template.xlsx'),
  import: (file) => api.upload('/groups/import', file),
  export: (classId) => download('/groups/export', { class_id: classId }, 'follow-up-groups.xlsx'),
}

/* ------------------------------------------------------------- dashboard */
export const DashboardAPI = {
  summary: (params) => api.get('/dashboard/summary', params),
  /** "تفاصيل الخدام" as a plain .xlsx, in the order the screen shows it. */
  exportTeachers: (params) =>
    download('/dashboard/teachers/export', params, 'servants-details.xlsx'),
  boyProfile: (boyId) => api.get(`/dashboard/boys/${boyId}`),
  birthdays: (params) => api.get('/dashboard/birthdays', params),
  followUpPerformance: (params) => api.get('/dashboard/follow-up', params),
  /** The home screen's own numbers: last week and the season, already scoped
   *  to the login (a servant gets his group, an amin his class). */
  myPerformance: () => api.get('/dashboard/my-performance'),
  /** «فحص اليوم»: today's liturgy boys, then today's reciters per competition. */
  todayCheck: (params) => api.get('/dashboard/today-check', params),
  /** Every list of «فحص اليوم» as one block-per-list sheet. */
  exportTodayCheck: (params) =>
    download('/dashboard/today-check/export', params, 'today-check.xlsx'),
}
