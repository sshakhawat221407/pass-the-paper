import React, { useState, useEffect } from 'react';
import { authApi, usersApi, setToken, clearToken, getToken } from './services/api';
import { Home } from './components/Home';
import { Browse } from './components/Browse';
import { Upload } from './components/Upload';
import { Wallet } from './components/Wallet';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AdminDashboardEnhanced } from './components/AdminDashboardEnhanced';
import { SplashScreen } from './components/SplashScreen';
import { StudentLayout } from './components/StudentLayout';
import { CartPageScreen } from './components/screens/CartPageScreen';
import { CheckoutPageScreen } from './components/screens/CheckoutPageScreen';
import { NotificationsPageScreen } from './components/screens/NotificationsPageScreen';
import { MembershipPageScreen } from './components/screens/MembershipPageScreen';
import { PurchaseHistoryScreen } from './components/screens/PurchaseHistoryScreen';
import { MyUploadsScreen } from './components/screens/MyUploadsScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';
import { EditProfileScreen } from './components/screens/EditProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { BannedUserScreen } from './components/screens/BannedUserScreen';
import { Toaster } from './components/ui/sonner';
import { MockDataProvider } from './utils/MockDataContext';

export type User = {
  id: string;
  email: string;
  name: string;
  university: string;
  isVerified: boolean;
  isAdmin: boolean;
  studentId?: string;
  walletBalance: number;
  pendingBalance?: number;
  rewardPoints?: number;
  profilePicture?: string;
  membershipType?: 'free' | 'premium_monthly' | 'premium_yearly';
  membershipExpiry?: string;
  isBanned?: boolean;
  banReason?: string;
  idCardImage?: string;
  idCardStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  sellerRating?: number;
  totalRatings?: number;
  restrictions?: {
    canUpload: boolean;
    canPurchase: boolean;
    canComment: boolean;
  };
};

export type NavigationTab = 'home' | 'browse' | 'upload' | 'wallet' | 'profile';
export type StudentPage =
  | 'home' | 'browse' | 'upload' | 'wallet' | 'profile'
  | 'cart' | 'notifications' | 'checkout' | 'membership'
  | 'history' | 'my-uploads' | 'feedback' | 'edit-profile' | 'settings';
export type Screen = StudentPage;

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<'login' | 'register' | 'app' | 'admin'>('login');
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [currentPage, setCurrentPage] = useState<StudentPage>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      if (!token) {
        setLoadingSession(false);
        return;
      }
      try {
        const user = await usersApi.me();
        setCurrentUser(user);
        setView(user.isAdmin ? 'admin' : 'app');
        setShowSplash(false);
      } catch {
        clearToken();
      } finally {
        setLoadingSession(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    setToken(token);
    setCurrentUser(user);
    setView('app');
  };

  const handleAdminLogin = async (email: string, password: string) => {
    const { token, user } = await authApi.adminLogin(email, password);
    setToken(token);
    setCurrentUser(user);
    setView('admin');
  };

  const handleRegister = async (
    email: string,
    password: string,
    name: string,
    university: string,
    studentId: string
  ) => {
    const { token, user } = await authApi.register({
      email, password, name, university, studentId,
    });
    setToken(token);
    setCurrentUser(user);
    setView('app');
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
    setView('login');
    setActiveTab('home');
    setCurrentPage('home');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Loading state while restoring session
  if (loadingSession) return null;

  // Splash screen
  if (showSplash) {
    return <SplashScreen onGetStarted={() => setShowSplash(false)} />;
  }

  // Login
  if (view === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onAdminLogin={handleAdminLogin}
        onNavigateToRegister={() => setView('register')}
        onNavigateBack={() => setShowSplash(true)}
      />
    );
  }

  // Register
  if (view === 'register') {
    return (
      <Register
        onRegister={handleRegister}
        onNavigateToLogin={() => setView('login')}
      />
    );
  }

  // Admin dashboard
  if (view === 'admin' && currentUser?.isAdmin) {
    return (
      <AdminDashboardEnhanced
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Student app
  if (view === 'app' && currentUser) {
    if (currentUser.isBanned) {
      return (
        <BannedUserScreen
          user={currentUser}
          onLogout={handleLogout}
        />
      );
    }

    const dashboardPages: StudentPage[] = [
      'profile', 'edit-profile', 'history',
      'my-uploads', 'feedback', 'membership', 'settings',
    ];

    return (
      <StudentLayout
        onCartClick={() => setCurrentPage('cart')}
        onNotificationsClick={() => setCurrentPage('notifications')}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(tab);
        }}
        onNavigate={(screen) => {
          setCurrentPage(screen);
          if (dashboardPages.includes(screen)) setActiveTab('profile');
        }}
        onLogout={handleLogout}
        currentPage={currentPage}
      >
        {currentPage === 'home'    && <Home user={currentUser} />}
        {currentPage === 'browse'  && <Browse user={currentUser} />}
        {currentPage === 'upload'  && <Upload user={currentUser} />}
        {currentPage === 'wallet'  && <Wallet user={currentUser} />}

        {currentPage === 'profile' && (
          <Profile
            user={currentUser}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onNavigateToHistory={() => { setCurrentPage('history');    setActiveTab('profile'); }}
            onNavigateToUploads={() => { setCurrentPage('my-uploads'); setActiveTab('profile'); }}
            onNavigateToFeedback={() => { setCurrentPage('feedback');  setActiveTab('profile'); }}
            onNavigateToMembership={() => { setCurrentPage('membership'); setActiveTab('profile'); }}
          />
        )}

        {currentPage === 'cart' && (
          <CartPageScreen
            user={currentUser}
            onBack={() => setCurrentPage(activeTab === 'browse' ? 'browse' : 'home')}
            onCheckout={() => setCurrentPage('checkout')}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPageScreen
            user={currentUser}
            onBack={() => setCurrentPage('cart')}
            onSuccess={() => { setCurrentPage('home'); setActiveTab('home'); }}
          />
        )}

        {currentPage === 'notifications' && (
          <NotificationsPageScreen
            user={currentUser}
            onBack={() => setCurrentPage(activeTab === 'browse' ? 'browse' : 'home')}
          />
        )}

        {currentPage === 'membership' && (
          <MembershipPageScreen
            user={currentUser}
            onBack={() => setCurrentPage('profile')}
          />
        )}

        {currentPage === 'history' && (
          <PurchaseHistoryScreen
            onNavigate={(screen) => setCurrentPage(screen)}
            onBack={() => setCurrentPage('profile')}
          />
        )}

        {currentPage === 'my-uploads' && (
          <MyUploadsScreen
            onNavigate={(screen) => setCurrentPage(screen)}
            onBack={() => setCurrentPage('profile')}
          />
        )}

        {currentPage === 'feedback' && (
          <FeedbackScreen
            onNavigate={(screen) => setCurrentPage(screen)}
            onBack={() => setCurrentPage('profile')}
          />
        )}

        {currentPage === 'edit-profile' && (
          <EditProfileScreen
            onNavigate={(screen) => setCurrentPage(screen)}
            onBack={() => setCurrentPage('profile')}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsScreen
            onNavigate={(screen) => setCurrentPage(screen)}
            onBack={() => setCurrentPage('profile')}
          />
        )}
      </StudentLayout>
    );
  }

  return null;
}

function App() {
  return (
    <MockDataProvider>
      <AppContent />
      <Toaster />
    </MockDataProvider>
  );
}

export default App;
