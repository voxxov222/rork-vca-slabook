import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
interface AuthState { session: Session | null; ready: boolean; isAdmin: boolean; recovery: boolean; finishRecovery: () => void }
const AuthContext = createContext<AuthState>({ session: null, ready: false, isAdmin: false, recovery: false, finishRecovery: () => undefined });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [recovery, setRecovery] = useState<boolean>(window.location.hash.includes('type=recovery'));
  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true; let eventReceived = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      eventReceived = true;
      if (!active) return;
      setSession(next); setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    void supabase.auth.getSession().then(({ data: state }) => { if (active && !eventReceived) { setSession(state.session); setReady(true); } }).catch(() => { if (active) setReady(true); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const role = useQuery({ queryKey: ['admin-role', session?.user.id], queryFn: async () => { const result = await supabase!.rpc('vca_is_admin'); if (result.error) throw result.error; return result.data === true; }, enabled: Boolean(session), staleTime: 60000 });
  return <AuthContext.Provider value={{ session, ready, isAdmin: Boolean(session && role.data), recovery, finishRecovery: () => setRecovery(false) }}>{children}</AuthContext.Provider>;
}
export const useAuth = (): AuthState => useContext(AuthContext);
