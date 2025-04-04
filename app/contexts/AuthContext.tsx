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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AuthProvider: Auth state changed', user);
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('AuthProvider: Auth state error', error);
      setLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Signing in with email and password');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('AuthProvider: Sign in error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: Signing up with email and password');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('AuthProvider: Sign up error', error);
      throw new Error(getErrorMessage(error as AuthError));
    }
  };

  const signInWithGoogle = async () => {
    console.log('AuthProvider: Signing in with Google');
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