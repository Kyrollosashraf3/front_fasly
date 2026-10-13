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
  import: (file) => api.upload('/boys/import', file),
  template: () => download('/boys/template', null, 'boys-template.xlsx'),
  export: (classId) => download('/boys/export', { class_id: classId }, 'boys.xlsx'),
}

/* -------------------------------------------------------------- teachers */
export const TeacherAPI = {
  list: (params) => api.get('/teachers', params),
  get: (id) => api.get(`/teachers/${id}`),
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
  import: (file) => api.upload('/groups/import', file),
  export: (classId) => download('/groups/export', { class_id: classId }, 'follow-up-groups.xlsx'),
}

/* ------------------------------------------------------------- dashboard */
export const DashboardAPI = {
  summary: (params) => api.get('/dashboard/summary', params),
  boyProfile: (boyId) => api.get(`/dashboard/boys/${boyId}`),
  birthdays: (params) => api.get('/dashboard/birthdays', params),
}
