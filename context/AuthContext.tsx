'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuth, onIdTokenChanged, signOut, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

// List of route prefixes that require user authentication
export const RESTRICTED_PATH_PREFIXES = ['/account'];

export function isRestrictedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return RESTRICTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOutAndRedirect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOutAndRedirect: async () => {},
});

/**
 * Handles automatic immediate redirect back to / when a user is on any restricted
 * page and their session expires, token is invalidated, or they log out.
 */
function AuthRedirectGuard({ user, loading }: { user: User | null; loading: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Immediately redirect if auth state is resolved, user is not authenticated, and current page is restricted
  useEffect(() => {
    if (!loading && !user && isRestrictedPath(pathname)) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  // 2. Listen for explicit session expired events (e.g. from API 401 responses or manual sign-out)
  useEffect(() => {
    const handleSessionExpired = async () => {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
      if (isRestrictedPath(pathname)) {
        router.replace('/');
      }
    };

    window.addEventListener('sellora_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('sellora_session_expired', handleSessionExpired);
    };
  }, [pathname, router]);

  // 3. Proactively verify session token when user refocuses the browser window or tab
  useEffect(() => {
    const verifySession = async () => {
      if (user && isRestrictedPath(pathname)) {
        try {
          // Check if token can still be retrieved or refreshed; throws if session expired/revoked
          await user.getIdToken();
        } catch (err) {
          console.warn('User session expired or invalidated:', err);
          try {
            await signOut(auth);
          } catch {}
          router.replace('/');
        }
      }
    };

    const handleFocus = () => {
      void verifySession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifySession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, pathname, router]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const signOutAndRedirect = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sellora_store_status_changed'));
      }
      setUser(null);
      if (isRestrictedPath(pathname)) {
        router.replace('/');
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    // onIdTokenChanged notifies on login, logout, and token refresh/expiration events across tabs
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sellora_store_status_changed'));
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOutAndRedirect }}>
      <AuthRedirectGuard user={user} loading={loading} />
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);