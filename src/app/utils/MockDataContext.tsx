import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  authApi, usersApi, resourcesApi, cartApi, purchasesApi,
  transactionsApi, withdrawalsApi, notificationsApi, feedbackApi,
  appealsApi, logsApi, setToken, clearToken, getToken,
} from '../services/api';

// ─── Types (identical to original so no other file changes) ──

export type MembershipPlan = 'free' | 'premium_monthly' | 'premium_yearly';

export type User = {
  id: string; email: string; name: string; university: string;
  isVerified: boolean; isAdmin: boolean; studentId?: string;
  walletBalance: number; pendingBalance?: number; password?: string;
  profilePicture?: string; rewardPoints: number;
  membershipType?: MembershipPlan; membershipExpiry?: string;
  isBanned?: boolean; banReason?: string; idCardImage?: string;
  idCardStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  sellerRating?: number; totalRatings?: number;
  restrictions?: { canUpload?: boolean; canPurchase?: boolean; canComment?: boolean };
};

export type Resource = {
  id: string; title: string; description: string; category: string;
  price: number; priceType: 'money' | 'points'; uploadedBy: string;
  uploaderName: string; downloads: number; rating: number;
  status: 'pending' | 'approved' | 'rejected'; fileUrl: string;
  createdAt: string; department?: string; course?: string; semester?: string;
};

export type Transaction = {
  id: string; userId: string;
  type: 'add' | 'purchase' | 'upload_reward' | 'withdrawal' | 'topup_points' | 'membership';
  amount: number; currency: 'BDT' | 'Points'; description: string;
  paymentMethod?: 'Bkash' | 'Nagad' | 'Card' | 'Bank Transfer' | 'Wallet';
  status?: 'pending' | 'approved' | 'rejected'; pointsTopupRate?: number;
  paymentPhone?: string; transactionNumber?: string;
  membershipPlan?: Exclude<MembershipPlan, 'free'>; relatedId?: string; createdAt: string;
};

export type CartItem = { resourceId: string; userId: string; addedAt: string };

export type Purchase = {
  id: string; userId: string; resourceId: string; price: number;
  priceType: 'money' | 'points'; purchasedAt: string;
  paymentMethod?: 'Bkash' | 'Nagad' | 'Card' | 'Wallet';
  feedback?: string; rating?: number;
};

export type Notification = {
  id: string; userId: string; type: 'purchase' | 'sale' | 'system' | 'feedback';
  title: string; message: string; isRead: boolean; createdAt: string; relatedId?: string;
};

export type Feedback = {
  id: string; userId: string; type: 'system' | 'item'; rating: number; comment: string;
  itemId?: string; itemTitle?: string; createdAt: string; updatedAt?: string;
};

export type Withdrawal = {
  id: string; userId: string; amount: number;
  method: 'Bkash' | 'Nagad' | 'Bank Transfer'; accountNumber: string;
  status: 'pending' | 'completed' | 'rejected'; createdAt: string; completedAt?: string;
};

export type Appeal = {
  id: string; userId: string; userName: string; userEmail: string; reason: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
  reviewedAt?: string; adminResponse?: string;
};

export type Log = {
  id: string; type: 'user_action' | 'admin_action' | 'transaction' | 'verification' | 'system';
  action: string; description: string; userId?: string; userName?: string;
  targetUserId?: string; targetUserName?: string; metadata?: Record<string, any>; createdAt: string;
};

// ─── Context type ─────────────────────────────────────────────

type MockDataContextType = {
  currentUser: User | null; users: User[]; resources: Resource[];
  transactions: Transaction[]; withdrawals: Withdrawal[]; cartItems: CartItem[];
  purchases: Purchase[]; notifications: Notification[]; feedbacks: Feedback[];
  login: (email: string, password: string) => Promise<User>;
  adminLogin: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, university: string, studentId: string) => Promise<void>;
  logout: () => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  verifyUser: (userId: string, approve: boolean) => void;
  removeUserVerification: (userId: string, reason: string) => void;
  banUser: (userId: string, reason: string) => void;
  unbanUser: (userId: string) => void;
  setUserRestrictions: (userId: string, restrictions: Partial<User['restrictions']>) => void;
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'downloads' | 'rating'>) => void;
  approveFile: (fileId: string, approve: boolean) => void;
  deleteResource: (resourceId: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  getResourcesByCategory: (category?: string) => Resource[];
  getPendingUsers: () => User[];
  getPendingFiles: () => Resource[];
  getAllUsers: () => User[];
  getFeaturedResources: () => Resource[];
  addToCart: (resourceId: string) => void;
  removeFromCart: (resourceId: string) => void;
  getCartItems: () => Resource[];
  purchaseFromCart: (paymentMethod: 'wallet' | 'points' | 'Wallet' | 'Bkash' | 'Nagad' | 'Card', useRewardPoints: boolean) => Promise<void>;
  getUserPurchases: () => Purchase[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  getNotifications: () => Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  deleteAllNotifications: () => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt'>) => void;
  getFeedbacks: () => Feedback[];
  addWithdrawal: (withdrawal: Omit<Withdrawal, 'id' | 'createdAt'>) => Withdrawal;
  getWithdrawals: () => Withdrawal[];
  topupPoints: (userId: string, points: number, bdtCost: number) => void;
  approveTransaction: (txnId: string) => void;
  rejectTransaction: (txnId: string) => void;
  getAllTransactions: () => Transaction[];
  uploadIdCard: (userId: string, imageBase64: string) => void;
  approveIdCard: (userId: string) => void;
  rejectIdCard: (userId: string) => void;
  approveWithdrawal: (withdrawalId: string) => void;
  rejectWithdrawal: (withdrawalId: string) => void;
  getSellerRating: () => number;
  getSellerRatingDetails: (userId?: string) => { rating: number; total: number };
  addAppeal: (appeal: Omit<Appeal, 'id' | 'createdAt' | 'status'>) => void;
  getAppeals: () => Appeal[];
  getAllAppeals: () => Appeal[];
  reviewAppeal: (appealId: string, approve: boolean, adminResponse?: string) => void;
  cancelWithdrawal: (withdrawalId: string) => void;
  logs: Log[];
  addLog: (log: Omit<Log, 'id' | 'createdAt'>) => void;
  getAllLogs: () => Log[];
  refreshUser: () => Promise<void>;
};

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// ─── Helper: load all user-specific data ──────────────────────

async function loadUserData(userId: string) {
  const [notifs, cart, purcs, txns, wds, fbs, aps] = await Promise.allSettled([
    notificationsApi.getMine(),
    cartApi.get(),
    purchasesApi.getMine(),
    transactionsApi.getMine(),
    withdrawalsApi.getMine(),
    feedbackApi.getMine(),
    appealsApi.getMine(),
  ]);
  return { notifs, cart, purcs, txns, wds, fbs, aps, userId };
}

// ─── Provider ─────────────────────────────────────────────────

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const applyUserData = (data: Awaited<ReturnType<typeof loadUserData>>) => {
    const { notifs, cart, purcs, txns, wds, fbs, aps, userId } = data;
    if (notifs.status === 'fulfilled') setNotifications(notifs.value);
    if (cart.status === 'fulfilled') {
      setCartItems((cart.value as any[]).map((ci: any) => ({
        resourceId: ci.resourceId || ci.resource?.id || ci.id,
        userId,
        addedAt: ci.addedAt || new Date().toISOString(),
      })));
    }
    if (purcs.status === 'fulfilled') setPurchases(purcs.value);
    if (txns.status === 'fulfilled') setTransactions(txns.value);
    if (wds.status === 'fulfilled') setWithdrawals(wds.value);
    if (fbs.status === 'fulfilled') setFeedbacks(fbs.value);
    if (aps.status === 'fulfilled') setAppeals(aps.value);
  };

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    try {
      const user = await usersApi.me();
      setCurrentUser(user);
      const data = await loadUserData(user.id);
      applyUserData(data);
      if (user.isAdmin) {
        const [allUsers, allTxns, allLogs] = await Promise.allSettled([
          usersApi.getAll(), transactionsApi.getAll(), logsApi.getAll(),
        ]);
        if (allUsers.status === 'fulfilled') setUsers(allUsers.value);
        if (allTxns.status === 'fulfilled') setTransactions(allTxns.value);
        if (allLogs.status === 'fulfilled') setLogs(allLogs.value);
      }
    } catch {
      clearToken();
      setCurrentUser(null);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    refreshUser();
    resourcesApi.getAll().then(setResources).catch(() => {});
  }, []); // eslint-disable-line

  // ── Auth ───────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<User> => {
    const { token, user } = await authApi.login(email, password);
    setToken(token);
    setCurrentUser(user);
    const data = await loadUserData(user.id);
    applyUserData(data);
    return user;
  };

  const adminLogin = async (email: string, password: string): Promise<User> => {
    const { token, user } = await authApi.adminLogin(email, password);
    setToken(token);
    setCurrentUser(user);
    const [allUsers, allTxns, allLogs] = await Promise.allSettled([
      usersApi.getAll(), transactionsApi.getAll(), logsApi.getAll(),
    ]);
    if (allUsers.status === 'fulfilled') setUsers(allUsers.value);
    if (allTxns.status === 'fulfilled') setTransactions(allTxns.value);
    if (allLogs.status === 'fulfilled') setLogs(allLogs.value);
    return user;
  };

  const register = async (
    email: string, password: string, name: string, university: string, studentId: string
  ): Promise<void> => {
    const { token, user } = await authApi.register({ email, password, name, university, studentId });
    setToken(token);
    setCurrentUser(user);
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    setCartItems([]); setPurchases([]); setNotifications([]);
    setFeedbacks([]); setWithdrawals([]); setAppeals([]);
    setTransactions([]); setUsers([]); setLogs([]);
  };

  // ── Users ──────────────────────────────────────────────────

  const updateUser = (userId: string, updates: Partial<User>) => {
    if (currentUser?.id === userId) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser?.id === userId) usersApi.update(updates).catch(() => {});
  };

  const verifyUser = (userId: string, approve: boolean) => {
    usersApi.verify(userId, approve)
      .then(() => setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: approve } : u)))
      .catch(() => {});
  };

  const removeUserVerification = (userId: string, reason: string) => {
    usersApi.removeVerification(userId, reason)
      .then(() => setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isVerified: false, idCardStatus: 'none' as const, idCardImage: undefined } : u
      ))).catch(() => {});
  };

  const banUser = (userId: string, reason: string) => {
    usersApi.ban(userId, reason)
      .then(() => setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true, banReason: reason } : u)))
      .catch(() => {});
  };

  const unbanUser = (userId: string) => {
    usersApi.unban(userId)
      .then(() => setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false, banReason: undefined } : u)))
      .catch(() => {});
  };

  const setUserRestrictions = (userId: string, restrictions: Partial<User['restrictions']>) => {
    usersApi.setRestrictions(userId, restrictions)
      .then(() => setUsers(prev => prev.map(u => u.id === userId ? { ...u, restrictions } : u)))
      .catch(() => {});
  };

  const uploadIdCard = (userId: string, imageBase64: string) => {
    usersApi.uploadIdCard(imageBase64)
      .then(() => updateUser(userId, { idCardImage: imageBase64, idCardStatus: 'pending' }))
      .catch(() => {});
  };

  const approveIdCard = (userId: string) => {
    usersApi.approveIdCard(userId)
      .then(() => setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, idCardStatus: 'approved' as const, isVerified: true } : u
      ))).catch(() => {});
  };

  const rejectIdCard = (userId: string) => {
    usersApi.rejectIdCard(userId)
      .then(() => setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, idCardStatus: 'rejected' as const, isVerified: false } : u
      ))).catch(() => {});
  };

  // ── Resources ──────────────────────────────────────────────

  const addResource = (resource: Omit<Resource, 'id' | 'createdAt' | 'downloads' | 'rating'>) => {
    resourcesApi.create(resource)
      .then(r => setResources(prev => [...prev, r]))
      .catch(() => {});
  };

  const approveFile = (fileId: string, approve: boolean) => {
    resourcesApi.approve(fileId, approve)
      .then(() => setResources(prev => prev.map(r =>
        r.id === fileId ? { ...r, status: approve ? 'approved' : 'rejected' } : r
      ))).catch(() => {});
  };

  const deleteResource = (resourceId: string) => {
    resourcesApi.delete(resourceId)
      .then(() => setResources(prev => prev.filter(r => r.id !== resourceId)))
      .catch(() => {});
  };

  const getResourcesByCategory = (category?: string): Resource[] => {
    const approved = resources.filter(r => r.status === 'approved');
    return (!category || category === 'All') ? approved : approved.filter(r => r.category === category);
  };

  const getPendingUsers = (): User[] => users.filter(u => !u.isVerified && !u.isAdmin);
  const getPendingFiles = (): Resource[] => resources.filter(r => r.status === 'pending');
  const getAllUsers = (): User[] => users;
  const getFeaturedResources = (): Resource[] =>
    resources.filter(r => r.status === 'approved').sort((a, b) => b.downloads - a.downloads).slice(0, 6);

  // ── Cart ───────────────────────────────────────────────────

  const addToCart = (resourceId: string) => {
    if (!currentUser) throw new Error('User not logged in');
    if (cartItems.find(i => i.resourceId === resourceId && i.userId === currentUser.id)) return;
    const item: CartItem = { resourceId, userId: currentUser.id, addedAt: new Date().toISOString() };
    setCartItems(prev => [...prev, item]);
    cartApi.add(resourceId).catch(() =>
      setCartItems(prev => prev.filter(i => !(i.resourceId === resourceId && i.userId === currentUser.id)))
    );
  };

  const removeFromCart = (resourceId: string) => {
    setCartItems(prev => prev.filter(i => !(i.resourceId === resourceId && i.userId === currentUser?.id)));
    cartApi.remove(resourceId).catch(() => {});
  };

  const getCartItems = (): Resource[] => {
    if (!currentUser) return [];
    return cartItems
      .filter(i => i.userId === currentUser.id)
      .map(i => resources.find(r => r.id === i.resourceId))
      .filter(Boolean) as Resource[];
  };

  const purchaseFromCart = async (
    paymentMethod: 'wallet' | 'points' | 'Wallet' | 'Bkash' | 'Nagad' | 'Card',
    useRewardPoints: boolean
  ) => {
    if (!currentUser) throw new Error('User not logged in');
    const normalized = (paymentMethod === 'wallet' || paymentMethod === 'points') ? 'Wallet' : paymentMethod;
    await cartApi.checkout(normalized, useRewardPoints);
    const [user, purcs, txns] = await Promise.allSettled([
      usersApi.me(), purchasesApi.getMine(), transactionsApi.getMine(),
    ]);
    if (user.status === 'fulfilled') setCurrentUser(user.value);
    if (purcs.status === 'fulfilled') setPurchases(purcs.value);
    if (txns.status === 'fulfilled') setTransactions(txns.value);
    setCartItems(prev => prev.filter(i => i.userId !== currentUser.id));
  };

  const getUserPurchases = (): Purchase[] =>
    currentUser ? purchases.filter(p => p.userId === currentUser.id) : [];

  // ── Notifications ──────────────────────────────────────────

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    setNotifications(prev => [...prev, { ...notification, id: `not-${Date.now()}`, createdAt: new Date().toISOString() }]);
  };

  const getNotifications = (): Notification[] =>
    currentUser ? notifications.filter(n => n.userId === currentUser.id) : [];

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    notificationsApi.markRead(id).catch(() => {});
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, isRead: true } : n));
    notificationsApi.markAllRead().catch(() => {});
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    notificationsApi.delete(id).catch(() => {});
  };

  const deleteAllNotifications = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.filter(n => n.userId !== currentUser.id));
    notificationsApi.deleteAll().catch(() => {});
  };

  // ── Feedback ───────────────────────────────────────────────

  const addFeedback = (feedback: Omit<Feedback, 'id' | 'createdAt'>) => {
    feedbackApi.create(feedback)
      .then(f => setFeedbacks(prev => [...prev, f]))
      .catch(() => {});
  };

  const getFeedbacks = (): Feedback[] =>
    currentUser ? feedbacks.filter(f => f.userId === currentUser.id) : [];

  // ── Transactions ───────────────────────────────────────────

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (transaction.type === 'add') {
      transactionsApi.addTopup(transaction)
        .then(t => setTransactions(prev => [...prev, t]))
        .catch(() => {});
    }
  };

  const topupPoints = (_userId: string, points: number, bdtCost: number) => {
    transactionsApi.topupPoints(points, bdtCost)
      .then(() => usersApi.me().then(setCurrentUser).catch(() => {}))
      .catch(() => {});
  };

  const approveTransaction = (txnId: string) => {
    transactionsApi.approve(txnId)
      .then(() => {
        setTransactions(prev => prev.map(t => t.id === txnId ? { ...t, status: 'approved' as const } : t));
        usersApi.getAll().then(setUsers).catch(() => {});
      }).catch(() => {});
  };

  const rejectTransaction = (txnId: string) => {
    transactionsApi.reject(txnId)
      .then(() => setTransactions(prev => prev.map(t => t.id === txnId ? { ...t, status: 'rejected' as const } : t)))
      .catch(() => {});
  };

  const getAllTransactions = (): Transaction[] => transactions;

  // ── Withdrawals ────────────────────────────────────────────

  const addWithdrawal = (withdrawal: Omit<Withdrawal, 'id' | 'createdAt'>): Withdrawal => {
    const optimistic: Withdrawal = { ...withdrawal, id: `wd-${Date.now()}`, createdAt: new Date().toISOString() };
    setWithdrawals(prev => [...prev, optimistic]);
    withdrawalsApi.create(withdrawal)
      .then(real => {
        setWithdrawals(prev => prev.map(w => w.id === optimistic.id ? real : w));
        usersApi.me().then(setCurrentUser).catch(() => {});
      })
      .catch(() => setWithdrawals(prev => prev.filter(w => w.id !== optimistic.id)));
    return optimistic;
  };

  const getWithdrawals = (): Withdrawal[] =>
    currentUser ? withdrawals.filter(w => w.userId === currentUser.id) : [];

  const cancelWithdrawal = (withdrawalId: string) => {
    withdrawalsApi.cancel(withdrawalId)
      .then(() => {
        setWithdrawals(prev => prev.map(w => w.id === withdrawalId ? { ...w, status: 'rejected' as const } : w));
        usersApi.me().then(setCurrentUser).catch(() => {});
      }).catch(() => {});
  };

  const approveWithdrawal = (withdrawalId: string) => {
    withdrawalsApi.approve(withdrawalId)
      .then(() => {
        setWithdrawals(prev => prev.map(w =>
          w.id === withdrawalId ? { ...w, status: 'completed' as const, completedAt: new Date().toISOString() } : w
        ));
        usersApi.getAll().then(setUsers).catch(() => {});
      }).catch(() => {});
  };

  const rejectWithdrawal = (withdrawalId: string) => {
    withdrawalsApi.reject(withdrawalId)
      .then(() => {
        setWithdrawals(prev => prev.map(w => w.id === withdrawalId ? { ...w, status: 'rejected' as const } : w));
        usersApi.getAll().then(setUsers).catch(() => {});
      }).catch(() => {});
  };

  // ── Ratings ────────────────────────────────────────────────

  const getSellerRatingDetails = (userId?: string): { rating: number; total: number } => {
    const id = userId || currentUser?.id;
    if (!id) return { rating: 0, total: 0 };
    const uploadIds = resources.filter(r => r.uploadedBy === id).map(r => r.id);
    const ratings = [
      ...feedbacks.filter(f => f.type === 'item' && f.itemId && uploadIds.includes(f.itemId) && f.rating > 0).map(f => f.rating),
      ...purchases.filter(p => uploadIds.includes(p.resourceId) && p.rating !== undefined).map(p => p.rating || 0),
    ].filter(r => r > 0);
    if (!ratings.length) return { rating: 0, total: 0 };
    return { rating: Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)), total: ratings.length };
  };

  const getSellerRating = (): number => getSellerRatingDetails().rating;

  // ── Appeals ────────────────────────────────────────────────

  const addAppeal = (appeal: Omit<Appeal, 'id' | 'createdAt' | 'status'>) => {
    appealsApi.create(appeal)
      .then(a => setAppeals(prev => [...prev, a]))
      .catch(() => {});
  };

  const getAppeals = (): Appeal[] =>
    currentUser ? appeals.filter(a => a.userId === currentUser.id) : [];

  const getAllAppeals = (): Appeal[] => appeals;

  const reviewAppeal = (appealId: string, approve: boolean, adminResponse?: string) => {
    appealsApi.review(appealId, approve, adminResponse)
      .then(() => {
        setAppeals(prev => prev.map(a =>
          a.id === appealId
            ? { ...a, status: approve ? 'approved' : 'rejected', reviewedAt: new Date().toISOString(), adminResponse }
            : a
        ));
        if (approve) {
          const appeal = appeals.find(a => a.id === appealId);
          if (appeal) setUsers(prev => prev.map(u => u.id === appeal.userId ? { ...u, isBanned: false, banReason: undefined } : u));
        }
      }).catch(() => {});
  };

  // ── Logs ───────────────────────────────────────────────────

  const addLog = (_log: Omit<Log, 'id' | 'createdAt'>) => { /* written server-side */ };
  const getAllLogs = (): Log[] => logs;

  // ─── Render ───────────────────────────────────────────────

  return (
    <MockDataContext.Provider value={{
      currentUser, users, resources, transactions, withdrawals,
      cartItems, purchases, notifications, feedbacks,
      login, adminLogin, register, logout,
      updateUser, verifyUser, removeUserVerification, banUser, unbanUser, setUserRestrictions,
      addResource, approveFile, deleteResource, addTransaction,
      getResourcesByCategory, getPendingUsers, getPendingFiles, getAllUsers, getFeaturedResources,
      addToCart, removeFromCart, getCartItems, purchaseFromCart, getUserPurchases,
      addNotification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead,
      deleteNotification, deleteAllNotifications,
      addFeedback, getFeedbacks,
      addWithdrawal, getWithdrawals, topupPoints,
      approveTransaction, rejectTransaction, getAllTransactions,
      uploadIdCard, approveIdCard, rejectIdCard,
      approveWithdrawal, rejectWithdrawal,
      getSellerRating, getSellerRatingDetails,
      addAppeal, getAppeals, getAllAppeals, reviewAppeal,
      cancelWithdrawal,
      logs, addLog, getAllLogs,
      refreshUser,
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) throw new Error('useMockData must be used within a MockDataProvider');
  return context;
}
