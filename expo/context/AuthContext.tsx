import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    console.log('[Auth] Checking initial session...');
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('[Auth] Initial session:', currentSession ? 'found' : 'none');
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
      setInitialCheckDone(true);
    }).catch((err) => {
      console.log('[Auth] Error getting session:', err);
      setIsLoading(false);
      setInitialCheckDone(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[Auth] Auth state changed:', _event, newSession ? 'session exists' : 'no session');
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('[Auth] Sign in error:', error.message);
      throw error;
    }
    console.log('[Auth] Sign in success:', data.user?.id);
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing up:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.log('[Auth] Sign up error:', error.message);
      throw error;
    }
    console.log('[Auth] Sign up success:', data.user?.id);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[Auth] Sign out error:', error.message);
      throw error;
    }
    console.log('[Auth] Signed out');
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[Auth] Sending password reset to:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.log('[Auth] Reset password error:', error.message);
      throw error;
    }
    console.log('[Auth] Password reset email sent');
  }, []);

  const isAuthenticated = !!session && !!user;

  return useMemo(() => ({
    session,
    user,
    isLoading,
    initialCheckDone,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [session, user, isLoading, initialCheckDone, isAuthenticated, signIn, signUp, signOut, resetPassword]);
});
