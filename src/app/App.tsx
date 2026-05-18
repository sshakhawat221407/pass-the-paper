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
import { HistoryScreen } from './components/screens/HistoryScreen';
import { PurchaseHistoryScreen } from './components/screens/PurchaseHistoryScreen';
import { MyUploadsScreen } from './components/screens/MyUploadsScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';
import { EditProfileScreen } from './components/screens/EditProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { BannedUserScreen } from './components/screens/BannedUserScreen';
import { Toaster } from './components/ui/sonner';

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

import { MockDataProvider } from './utils/MockDataContext';

function App() {
  return (
    <MockDataProvider>
      <AppContent />
      <Toaster />
    </MockDataProvider>
  );
}

  return null;
}

export default App;
