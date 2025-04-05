'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

function getErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed';
    case 'auth/popup-closed-by-user':
      return 'Sign in was cancelled';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser';
    default:
      return error.message;
  }
}

// Add a mock user to immediately bypass authentication in development
const MOCK_USER = {
  uid: 'dev-user-123',
  email: 'dev@example.com',
  displayName: 'Developer',
  // Add basic Firebase User methods needed
  getIdToken: () => Promise.resolve('mock-token'),
  getIdTokenResult: () => Promise.resolve({ token: 'mock-token' } as any),
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  phoneNumber: null,
  photoURL: null,
  providerData: [],
  providerId: 'mock',
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: () => Promise.resolve(),
  reload: () => Promise.resolve(),
  toJSON: () => ({}),
} as unknown as User;

// Set this to true to bypass Firebase authentication (for development)
const USE_MOCK_AUTH = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Immediately use mock user if in dev mode
    if (USE_MOCK_AUTH) {
      console.log('AuthProvider: Using mock user for development');
      setUser(MOCK_USER);
      setLoading(false);
      return () => {}; // No cleanup needed
    }
    
    // Force loading to false after 3 seconds no matter what
    const timer = setTimeout(() => {
      console.log('AuthProvider: Safety timeout reached, forcing loading to false');
      setLoading(false);
    }, 3000);
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('AuthProvider: Auth state changed', user);
        setUser(user);
        setLoading(false);
        clearTimeout(timer); // Clear timeout if auth resolves normally
      }, (error) => {
        console.error('AuthProvider: Auth state error', error);
        setLoading(false);
        clearTimeout(timer); // Clear timeout if auth errors
      });
      
      return () => {
        console.log('AuthProvider: Cleaning up auth state listener');
        unsubscribe();
        clearTimeout(timer);
      };
    } catch (error) {
      console.error('AuthProvider: Failed to set up auth listener', error);
      setLoading(false);
      clearTimeout(timer);
      return () => clearTimeout(timer);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Signing in with email and password');
    
    if (USE_MOCK_AUTH) {
      console.log('AuthProvider: Using mock sign in');
      setUser(MOCK_USER);
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('AuthProvider: Sign in error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: Signing up with email and password');
    
    if (USE_MOCK_AUTH) {
      console.log('AuthProvider: Using mock sign up');
      setUser(MOCK_USER);
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('AuthProvider: Sign up error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  const signInWithGoogle = async () => {
    console.log('AuthProvider: Signing in with Google');
    
    if (USE_MOCK_AUTH) {
      console.log('AuthProvider: Using mock Google sign in');
      setUser(MOCK_USER);
      return;
    }
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('AuthProvider: Google sign in error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  const signOut = async () => {
    console.log('AuthProvider: Signing out');
    
    if (USE_MOCK_AUTH) {
      console.log('AuthProvider: Using mock sign out');
      setUser(null);
      return;
    }
    
    try {
      await auth.signOut();
    } catch (error) {
      console.error('AuthProvider: Sign out error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 