import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { fetchProfile, ProfileData } from '../lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
});

function currentMemberSince(): string {
  return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const data = await fetchProfile(userId);
      if (data?.isBanned) {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        alert('Tu cuenta ha sido bloqueada. No puedes acceder al sistema.');
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  /**
   * Si el perfil no existe en DB lo crea con los metadatos del usuario.
   * Siempre termina llamando a loadProfile para poner el estado.
   */
  const ensureProfile = async (u: User) => {
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('id, member_since')
        .eq('id', u.id)
        .maybeSingle();

      // Si hubo error de permisos u otro, simplemente cargamos el perfil directamente
      if (error) {
        console.warn('ensureProfile select error (ignorado):', error.message);
        await loadProfile(u.id);
        return;
      }

      if (!existing) {
        const name =
          u.user_metadata?.name ||
          u.user_metadata?.full_name ||
          u.email?.split('@')[0] ||
          'Usuario';
        const avatarUrl = u.user_metadata?.avatar_url || '';
        await supabase.from('profiles').upsert({
          id: u.id,
          name,
          avatar_url: avatarUrl,
          member_since: currentMemberSince(),
        }, { onConflict: 'id' });
      } else if (!existing.member_since) {
        await supabase
          .from('profiles')
          .update({ member_since: currentMemberSince() })
          .eq('id', u.id);
      }
    } catch (err) {
      console.warn('ensureProfile error (ignorado):', err);
    }

    // Siempre cargar el perfil al final
    await loadProfile(u.id);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Obtener sesión actual al montar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureProfile(session.user);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de sesión
    // IMPORTANTE: onAuthStateChange NO admite callbacks async — usamos .then() para no bloquear
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fire-and-forget: no hacemos await aquí para no bloquear el callback de Supabase
        ensureProfile(session.user).catch(console.error);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
