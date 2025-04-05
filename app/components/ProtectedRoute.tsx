'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// DEVELOPMENT MODE - Set this to true to bypass authentication completely
const BYPASS_AUTH = false;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // In development mode, immediately render children without auth
  if (BYPASS_AUTH) {
    console.log('ProtectedRoute: DEV MODE - Bypassing authentication check');
    return <>{children}</>;
  }

  console.log('ProtectedRoute state:', { user, loading });

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      console.log('No user after loading, redirecting to auth page');
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // No user after loading completed
  if (!user) {
    return null;
  }

  // User is authenticated
  return <>{children}</>;
} 