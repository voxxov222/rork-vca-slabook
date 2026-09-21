import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api, persistToken, clearToken, loadToken, setAuthToken } from '@/src/lib/api';

WebBrowser.maybeCompleteAuthSession();

export type VcaUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  role: 'user' | 'admin';
  bio?: string;
  profile_type?: string;
  cover_image?: string | null;
};

type AuthContextType = {
  user: VcaUser | null;
  loading: boolean;
  signingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: VcaUser) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function extractSessionId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<VcaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const handled = useRef<Set<string>>(new Set());

  const exchange = useCallback(async (sessionId: string) => {
    if (!sessionId || handled.current.has(sessionId)) return;
    handled.current.add(sessionId);
    setSigningIn(true);
    try {
      const res = await api.post<{ session_token: string; user: VcaUser }>('/auth/session', {
        session_id: sessionId,
      });
      await persistToken(res.session_token);
      setUserState(res.user);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<VcaUser>('/auth/me');
      setUserState(me);
    } catch {
      await clearToken();
      setAuthToken(null);
      setUserState(null);
    }
  }, []);

  // Bootstrap: process any inbound session_id first, then existing token.
  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const sid = extractSessionId(window.location.hash) || extractSessionId(window.location.search);
          if (sid) {
            await exchange(sid);
            // Clean only session_id from URL after success.
            const clean = window.location.origin + window.location.pathname;
            window.history.replaceState(window.history.state, '', clean);
          }
        } else {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) await exchange(sid);
          sub = Linking.addEventListener('url', (e) => {
            const s = extractSessionId(e.url);
            if (s) exchange(s);
          });
        }
        const token = await loadToken();
        if (token && !user) {
          await refresh();
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async () => {
    setSigningIn(true);
    try {
      const redirectUrl =
        Platform.OS === 'web' ? window.location.origin + '/' : Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
        return;
      }

      let captured: string | null = null;
      const sub = Linking.addEventListener('url', (e) => {
        if (!captured) captured = e.url;
      });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      sub.remove();

      let sid: string | null = null;
      if (result.type === 'success' && (result as any).url) {
        sid = extractSessionId((result as any).url);
      }
      if (!sid) sid = extractSessionId(captured);
      if (!sid) sid = extractSessionId(await Linking.getInitialURL());
      if (sid) await exchange(sid);
    } finally {
      setSigningIn(false);
    }
  }, [exchange]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    await clearToken();
    setAuthToken(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signingIn, login, logout, refresh, setUser: setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
