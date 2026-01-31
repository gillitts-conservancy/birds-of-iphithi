import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ensure WebBrowser is ready
WebBrowser.maybeCompleteAuthSession();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get stored session token
  const getStoredToken = async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem('session_token');
      }
      return await SecureStore.getItemAsync('session_token');
    } catch {
      return null;
    }
  };

  // Store session token
  const storeToken = async (token: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('session_token', token);
      } else {
        await SecureStore.setItemAsync('session_token', token);
      }
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  };

  // Remove session token
  const removeToken = async (): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  };

  // Exchange session_id for session_token
  const exchangeSessionId = async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        console.error('Failed to exchange session:', response.status);
        return false;
      }

      const data = await response.json();
      await storeToken(data.session_token);
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Exchange session error:', error);
      return false;
    }
  };

  // Check existing session
  const checkSession = async (): Promise<void> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        await removeToken();
      }
    } catch (error) {
      console.error('Check session error:', error);
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  // Parse session_id from URL
  const parseSessionId = (url: string): string | null => {
    try {
      // Check hash fragment first
      const hashMatch = url.match(/[#?]session_id=([^&]+)/);
      if (hashMatch) return hashMatch[1];
      
      // Check query params
      const urlObj = new URL(url);
      return urlObj.searchParams.get('session_id');
    } catch {
      return null;
    }
  };

  // Handle URL for cold start
  const handleInitialUrl = useCallback(async () => {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        const sessionId = parseSessionId(url);
        if (sessionId) {
          setIsLoading(true);
          await exchangeSessionId(sessionId);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Handle initial URL error:', error);
    }
  }, []);

  // Web: Check for session_id in URL on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      const search = window.location.search;
      const sessionIdMatch = (hash + search).match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        setIsLoading(true);
        exchangeSessionId(sessionId).then(() => {
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsLoading(false);
        });
      } else {
        checkSession();
      }
    } else {
      // Mobile: Check initial URL and existing session
      handleInitialUrl().then(() => {
        if (!user) {
          checkSession();
        }
      });
    }
  }, []);

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Create redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        // Web: Direct redirect
        window.location.href = authUrl;
      } else {
        // Mobile: Use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionId = parseSessionId(result.url);
          if (sessionId) {
            await exchangeSessionId(sessionId);
          }
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      const token = await getStoredToken();
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await removeToken();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      await removeToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
