// ============================================================
// API Service — connects React frontend to Spring Boot backend
// Base URL comes from .env: VITE_API_URL
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ─── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('ptp_token');
}
export function setToken(token: string) {
  localStorage.setItem('ptp_token', token);
}
export function clearToken() {
  localStorage.removeItem('ptp_token');
}

// ─── Core fetch wrapper ──────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),

  adminLogin: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),

  register: (data: {
    email: string; password: string;
    name: string; university: string; studentId: string;
  }) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),
};

// ─── Users ───────────────────────────────────────────────────
export const usersApi = {
  me: () => request<any>('/users/me'),
  update: (data: Partial<any>) =>
    request<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  uploadIdCard: (imageBase64: string) =>
    request<void>('/users/me/id-card', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    }),
  // Admin
  getAll: () => request<any[]>('/admin/users'),
  getPending: () => request<any[]>('/admin/users/pending'),
  verify: (userId: string, approve: boolean) =>
    request<void>(`/admin/users/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ approve }),
    }),
  approveIdCard: (userId: string) =>
    request<void>(`/admin/users/${userId}/id-card/approve`, { method: 'PUT' }),
  rejectIdCard: (userId: string) =>
    request<void>(`/admin/users/${userId}/id-card/reject`, { method: 'PUT' }),
  ban: (userId: string, reason: string) =>
    request<void>(`/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
  unban: (userId: string) =>
    request<void>(`/admin/users/${userId}/unban`, { method: 'PUT' }),
  setRestrictions: (userId: string, restrictions: any) =>
    request<void>(`/admin/users/${userId}/restrictions`, {
      method: 'PUT',
      body: JSON.stringify(restrictions),
    }),
  removeVerification: (userId: string, reason: string) =>
    request<void>(`/admin/users/${userId}/verify/remove`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Resources ───────────────────────────────────────────────
export const resourcesApi = {
  getAll: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request<any[]>(`/resources${qs ? '?' + qs : ''}`);
  },
  getFeatured: () => request<any[]>('/resources/featured'),
  getById: (id: string) => request<any>(`/resources/${id}`),
  create: (data: any) =>
    request<any>('/resources', { method: 'POST', body: JSON.stringify(data) }),
  getMyUploads: () => request<any[]>('/resources/my-uploads'),
  // Admin
  getPending: () => request<any[]>('/admin/resources/pending'),
  approve: (id: string, approve: boolean) =>
    request<void>(`/admin/resources/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approve }),
    }),
  delete: (id: string) =>
    request<void>(`/resources/${id}`, { method: 'DELETE' }),
};

// ─── Cart ────────────────────────────────────────────────────
export const cartApi = {
  get: () => request<any[]>('/cart'),
  add: (resourceId: string) =>
    request<void>('/cart', { method: 'POST', body: JSON.stringify({ resourceId }) }),
  remove: (resourceId: string) =>
    request<void>(`/cart/${resourceId}`, { method: 'DELETE' }),
  checkout: (paymentMethod: string, useRewardPoints: boolean) =>
    request<void>('/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, useRewardPoints }),
    }),
};

// ─── Purchases ───────────────────────────────────────────────
export const purchasesApi = {
  getMine: () => request<any[]>('/purchases'),
  rate: (purchaseId: string, rating: number, feedback: string) =>
    request<void>(`/purchases/${purchaseId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    }),
};

// ─── Transactions ────────────────────────────────────────────
export const transactionsApi = {
  getMine: () => request<any[]>('/transactions'),
  addTopup: (data: any) =>
    request<any>('/transactions/topup', { method: 'POST', body: JSON.stringify(data) }),
  topupPoints: (points: number, bdtCost: number) =>
    request<void>('/transactions/topup-points', {
      method: 'POST',
      body: JSON.stringify({ points, bdtCost }),
    }),
  // Admin
  getAll: () => request<any[]>('/admin/transactions'),
  approve: (id: string) =>
    request<void>(`/admin/transactions/${id}/approve`, { method: 'PUT' }),
  reject: (id: string) =>
    request<void>(`/admin/transactions/${id}/reject`, { method: 'PUT' }),
};

// ─── Withdrawals ─────────────────────────────────────────────
export const withdrawalsApi = {
  getMine: () => request<any[]>('/withdrawals'),
  create: (data: any) =>
    request<any>('/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) =>
    request<void>(`/withdrawals/${id}/cancel`, { method: 'PUT' }),
  // Admin
  approve: (id: string) =>
    request<void>(`/admin/withdrawals/${id}/approve`, { method: 'PUT' }),
  reject: (id: string) =>
    request<void>(`/admin/withdrawals/${id}/reject`, { method: 'PUT' }),
};

// ─── Notifications ───────────────────────────────────────────
export const notificationsApi = {
  getMine: () => request<any[]>('/notifications'),
  markRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () =>
    request<void>('/notifications/read-all', { method: 'PUT' }),
  delete: (id: string) =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),
  deleteAll: () =>
    request<void>('/notifications', { method: 'DELETE' }),
};

// ─── Feedback ────────────────────────────────────────────────
export const feedbackApi = {
  getMine: () => request<any[]>('/feedbacks'),
  create: (data: any) =>
    request<any>('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Appeals ─────────────────────────────────────────────────
export const appealsApi = {
  getMine: () => request<any[]>('/appeals'),
  create: (data: any) =>
    request<any>('/appeals', { method: 'POST', body: JSON.stringify(data) }),
  // Admin
  getAll: () => request<any[]>('/admin/appeals'),
  review: (id: string, approve: boolean, adminResponse?: string) =>
    request<void>(`/admin/appeals/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ approve, adminResponse }),
    }),
};

// ─── Logs (Admin) ────────────────────────────────────────────
export const logsApi = {
  getAll: () => request<any[]>('/admin/logs'),
};
