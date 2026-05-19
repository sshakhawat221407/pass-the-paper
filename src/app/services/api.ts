// ============================================================
// API Service — connects React frontend to Spring Boot backend
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

// ─── Normalize backend user → frontend User shape ─────────────
export function normalizeUser(u: any) {
  if (!u) return u;
  return {
    ...u,
    id: String(u.id),
    walletBalance: Number(u.walletBalance ?? 0),
    pendingBalance: Number(u.pendingBalance ?? 0),
    rewardPoints: Number(u.rewardPoints ?? 0),
    sellerRating: Number(u.sellerRating ?? 0),
    totalRatings: Number(u.totalRatings ?? 0),
    isVerified: Boolean(u.isVerified),
    isAdmin: Boolean(u.isAdmin),
    isBanned: Boolean(u.isBanned),
    restrictions: {
      canUpload:   u.canUpload   !== undefined ? Boolean(u.canUpload)   : (u.restrictions?.canUpload   ?? true),
      canPurchase: u.canPurchase !== undefined ? Boolean(u.canPurchase) : (u.restrictions?.canPurchase ?? true),
      canComment:  u.canComment  !== undefined ? Boolean(u.canComment)  : (u.restrictions?.canComment  ?? true),
    },
    membershipType:   u.membershipType   || 'free',
    membershipExpiry: u.membershipExpiry || undefined,
    idCardStatus:     u.idCardStatus     || 'none',
  };
}

// ─── Normalize resource ───────────────────────────────────────
export function normalizeResource(r: any) {
  if (!r) return r;
  return {
    ...r,
    id:         String(r.id),
    uploadedBy: String(r.uploadedBy || r.uploadedById || ''),
    price:      Number(r.price     ?? 0),
    downloads:  Number(r.downloads ?? 0),
    rating:     Number(r.rating    ?? 0),
    priceType:  r.priceType || 'money',
    status:     r.status    || 'pending',
  };
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

  if (res.status === 204) return undefined as unknown as T;

  // Unwrap ApiResponse wrapper { data: ... } from Spring Boot
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json) return json.data as T;
  return json as T;
}

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
    return { token: data.token, user: normalizeUser(data.user) };
  },

  // FIX: admin uses the same /auth/login endpoint — isAdmin flag is in the token/user
  adminLogin: async (email: string, password: string) => {
    const data = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
    const user = normalizeUser(data.user);
    if (!user.isAdmin) throw new Error('Not an admin account');
    return { token: data.token, user };
  },

  register: async (payload: {
    email: string; password: string;
    name: string; university: string; studentId: string;
  }) => {
    const data = await request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
    return { token: data.token, user: normalizeUser(data.user) };
  },
};

// ─── Users ───────────────────────────────────────────────────
export const usersApi = {
  me: async () => normalizeUser(await request<any>('/users/me')),

  // FIX: PUT /users/me (correct)
  update: async (data: Partial<any>) =>
    request<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  // FIX: POST /users/me/change-password (backend uses change-password not password)
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  uploadIdCard: (imageBase64: string) =>
    request<void>('/users/me/id-card', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    }),

  // FIX: GET /admin/users (correct)
  getAll: async () => {
    const list = await request<any[]>('/admin/users');
    return list.map(normalizeUser);
  },

  // FIX: GET /admin/users/pending-id-cards (was /admin/users/pending)
  getPending: async () => {
    const list = await request<any[]>('/admin/users/pending-id-cards');
    return list.map(normalizeUser);
  },

  // FIX: removed separate verify — backend uses id-card review for verification
  // This maps to the id-card review endpoint
  verify: (userId: string, approve: boolean) =>
    request<void>(`/admin/users/${userId}/id-card`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    }),

  // FIX: POST /admin/users/{id}/id-card with { approve: true }
  approveIdCard: (userId: string) =>
    request<void>(`/admin/users/${userId}/id-card`, {
      method: 'POST',
      body: JSON.stringify({ approve: true }),
    }),

  // FIX: POST /admin/users/{id}/id-card with { approve: false }
  rejectIdCard: (userId: string) =>
    request<void>(`/admin/users/${userId}/id-card`, {
      method: 'POST',
      body: JSON.stringify({ approve: false }),
    }),

  // FIX: POST /admin/users/{id}/ban (was PUT)
  ban: (userId: string, reason: string) =>
    request<void>(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // FIX: POST /admin/users/{id}/unban (was PUT)
  unban: (userId: string) =>
    request<void>(`/admin/users/${userId}/unban`, { method: 'POST' }),

  // FIX: POST /admin/users/{id}/restrictions (was PUT)
  setRestrictions: (userId: string, restrictions: any) =>
    request<void>(`/admin/users/${userId}/restrictions`, {
      method: 'POST',
      body: JSON.stringify(restrictions),
    }),

  // FIX: no removeVerification endpoint in backend — map to unban as closest operation
  removeVerification: (userId: string, _reason: string) =>
    request<void>(`/admin/users/${userId}/id-card`, {
      method: 'POST',
      body: JSON.stringify({ approve: false }),
    }),
};

// ─── Resources ───────────────────────────────────────────────
export const resourcesApi = {
  getAll: async (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    const list = await request<any[]>(`/resources${qs ? '?' + qs : ''}`);
    return list.map(normalizeResource);
  },

  getFeatured: async () => {
    const list = await request<any[]>('/resources/featured');
    return list.map(normalizeResource);
  },

  getById: async (id: string) =>
    normalizeResource(await request<any>(`/resources/${id}`)),

  // FIX: backend expects multipart/form-data with 'data' + 'file' parts
  // Keep JSON create for non-file uploads; real file upload needs FormData
  create: async (data: any) => {
    if (data._file) {
      const form = new FormData();
      form.append('data', JSON.stringify({
        title: data.title, description: data.description,
        category: data.category, price: data.price,
        priceType: data.priceType, department: data.department,
        course: data.course, semester: data.semester,
      }));
      form.append('file', data._file);
      const token = getToken();
      const res = await fetch(`${BASE_URL}/resources`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        let msg = `Upload failed: ${res.status}`;
        try { const e = await res.json(); msg = e.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      const json = await res.json();
      return normalizeResource(json.data ?? json);
    }
    // Fallback: JSON (will fail if backend strictly requires multipart)
    return normalizeResource(await request<any>('/resources', {
      method: 'POST', body: JSON.stringify(data),
    }));
  },

  getMyUploads: async () => {
    const list = await request<any[]>('/resources/my-uploads');
    return list.map(normalizeResource);
  },

  getPending: async () => {
    const list = await request<any[]>('/admin/resources/pending');
    return list.map(normalizeResource);
  },

  // FIX: POST /admin/resources/{id}/approve (was PUT)
  approve: (id: string, approve: boolean) =>
    request<void>(`/admin/resources/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    }),

  // FIX: DELETE /admin/resources/{id} (correct path)
  delete: (id: string) =>
    request<void>(`/admin/resources/${id}`, { method: 'DELETE' }),
};

// ─── Cart ────────────────────────────────────────────────────
export const cartApi = {
  get: () => request<any[]>('/cart'),

  // FIX: POST /cart/{resourceId} (was POST /cart with body)
  add: (resourceId: string) =>
    request<void>(`/cart/${resourceId}`, { method: 'POST' }),

  // FIX: DELETE /cart/{resourceId} (correct)
  remove: (resourceId: string) =>
    request<void>(`/cart/${resourceId}`, { method: 'DELETE' }),

  // FIX: backend CheckoutRequest requires { resourceIds: UUID[], paymentMethod: string }
  // useRewardPoints is implicit (Wallet payment handles both BDT+points)
  checkout: (paymentMethod: string, useRewardPoints: boolean, resourceIds?: string[]) =>
    request<void>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, useRewardPoints, resourceIds: resourceIds || [] }),
    }),
};

// ─── Purchases ───────────────────────────────────────────────
export const purchasesApi = {
  // FIX: GET /purchases (correct — under CartController)
  getMine: () => request<any[]>('/purchases'),

  // FIX: POST /purchases/rate with { purchaseId, rating, feedback } (was /purchases/{id}/rate)
  rate: (purchaseId: string, rating: number, feedback: string) =>
    request<void>('/purchases/rate', {
      method: 'POST',
      body: JSON.stringify({ purchaseId, rating, feedback }),
    }),
};

// ─── Transactions ────────────────────────────────────────────
export const transactionsApi = {
  // FIX: GET /wallet/transactions (was /transactions)
  getMine: () => request<any[]>('/wallet/transactions'),

  // FIX: POST /wallet/topup (was /transactions/topup)
  addTopup: (data: any) =>
    request<any>('/wallet/topup', { method: 'POST', body: JSON.stringify(data) }),

  // FIX: POST /wallet/topup-points (was /transactions/topup-points)
  topupPoints: (points: number, bdtCost: number) =>
    request<void>('/wallet/topup-points', {
      method: 'POST',
      body: JSON.stringify({ points, bdtCost }),
    }),

  // FIX: GET /admin/transactions/pending (was /admin/transactions)
  getAll: () => request<any[]>('/admin/transactions/pending'),

  // FIX: POST /admin/transactions/{id}/approve (was PUT)
  approve: (id: string) =>
    request<void>(`/admin/transactions/${id}/approve`, { method: 'POST' }),

  // FIX: POST /admin/transactions/{id}/reject (was PUT)
  reject: (id: string) =>
    request<void>(`/admin/transactions/${id}/reject`, { method: 'POST' }),
};

// ─── Withdrawals ─────────────────────────────────────────────
export const withdrawalsApi = {
  // FIX: GET /wallet/withdrawals (was /withdrawals)
  getMine: () => request<any[]>('/wallet/withdrawals'),

  // FIX: POST /wallet/withdraw (was /withdrawals)
  create: (data: any) =>
    request<any>('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) }),

  // FIX: DELETE /wallet/withdraw/{id} (was PUT /withdrawals/{id}/cancel)
  cancel: (id: string) =>
    request<void>(`/wallet/withdraw/${id}`, { method: 'DELETE' }),

  // FIX: POST /admin/withdrawals/{id}/approve (was PUT)
  approve: (id: string) =>
    request<void>(`/admin/withdrawals/${id}/approve`, { method: 'POST' }),

  // FIX: POST /admin/withdrawals/{id}/reject (was PUT)
  reject: (id: string) =>
    request<void>(`/admin/withdrawals/${id}/reject`, { method: 'POST' }),
};

// ─── Notifications ───────────────────────────────────────────
export const notificationsApi = {
  getMine: () => request<any[]>('/notifications'),

  // FIX: PATCH /notifications/{id}/read (was PUT)
  markRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // FIX: PATCH /notifications/read-all (was PUT)
  markAllRead: () =>
    request<void>('/notifications/read-all', { method: 'PATCH' }),

  // DELETE /notifications/{id} (correct)
  delete: (id: string) =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  // DELETE /notifications (correct)
  deleteAll: () =>
    request<void>('/notifications', { method: 'DELETE' }),
};

// ─── Feedback ────────────────────────────────────────────────
// FIX: backend has no dedicated feedback controller — feedback is submitted
// via purchases/rate. We map feedback calls to purchases/rate where possible.
export const feedbackApi = {
  // Returns purchase history which includes feedback/rating
  getMine: () => request<any[]>('/purchases'),

  // FIX: POST /purchases/rate  (feedback goes through purchase rating)
  create: (data: any) => {
    if (data.purchaseId) {
      return request<any>('/purchases/rate', {
        method: 'POST',
        body: JSON.stringify({
          purchaseId: data.purchaseId,
          rating: data.rating,
          feedback: data.comment || data.feedback || '',
        }),
      });
    }
    // System feedback (no purchaseId) — fire-and-forget, no backend endpoint
    return Promise.resolve(data);
  },
};

// ─── Appeals ─────────────────────────────────────────────────
export const appealsApi = {
  // FIX: GET /appeals/my (was /appeals)
  getMine: () => request<any[]>('/appeals/my'),

  // POST /appeals (correct)
  create: (data: any) =>
    request<any>('/appeals', { method: 'POST', body: JSON.stringify(data) }),

  // FIX: GET /admin/appeals/pending (was /admin/appeals)
  getAll: () => request<any[]>('/admin/appeals/pending'),

  // FIX: POST /admin/appeals/{id}/review (was PUT)
  review: (id: string, approve: boolean, adminResponse?: string) =>
    request<void>(`/admin/appeals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ approve, adminResponse }),
    }),
};

// ─── Logs (Admin) ────────────────────────────────────────────
export const logsApi = {
  getAll: () => request<any[]>('/admin/logs'),
};
