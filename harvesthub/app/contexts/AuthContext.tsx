import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/apiClient';
import type { CustomerProfileGeo, FarmerProfile, FarmerVerification, Profile } from '../types/database';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  farmerProfile: FarmerProfile | null;
  farmerVerification: FarmerVerification | null;
  customerProfile: CustomerProfileGeo | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  // True while a password reset is in progress: from just before the emailed
  // code is verified (which signs the user in) until the new password is
  // saved or they sign out. The route guard keeps them on the reset screen
  // meanwhile instead of treating the code's sign-in as a normal login.
  passwordRecovery: boolean;
  startPasswordRecovery: () => void;
  finishPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  farmerProfile: null,
  farmerVerification: null,
  customerProfile: null,
  loading: true,
  refreshProfile: async () => {},
  passwordRecovery: false,
  startPasswordRecovery: () => {},
  finishPasswordRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [farmerVerification, setFarmerVerification] = useState<FarmerVerification | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileGeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Called by the reset screen BEFORE verifyOtp(): verifying the code signs
  // the user in, and the flag must already be set when that session lands so
  // the route guard never treats it as an ordinary login.
  const startPasswordRecovery = () => setPasswordRecovery(true);
  const finishPasswordRecovery = () => setPasswordRecovery(false);

  // Read by the AppState listener below, which is registered once and would
  // otherwise only ever see the first render's values.
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    sessionRef.current = session;
    profileRef.current = profile;
  }, [session, profile]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // The profile row is created automatically by a database trigger on
      // sign-up (see supabase/migrations). If this fails, it usually means
      // the migration hasn't been run yet against this Supabase project.
      console.warn('Could not load profile:', error.message);
      return;
    }
    const loadedProfile = data as Profile;

    // Farmers get two extra rows the signup trigger creates alongside
    // profiles — the root layout needs `farmerVerification.submitted_at` to
    // decide between the application and the farmer app. Fetched BEFORE
    // setProfile so all three land in the same render: setting the profile
    // first would briefly show a farmer with no verification row, and the
    // route guard would bounce an already-submitted farmer to the
    // application for a frame.
    if (loadedProfile.role === 'farmer') {
      const [farmerProfileResult, farmerVerificationResult] = await Promise.all([
        supabase.from('farmer_profiles').select('*').eq('id', userId).single(),
        supabase.from('farmer_verification').select('*').eq('id', userId).single(),
      ]);
      setFarmerProfile(farmerProfileResult.error ? null : (farmerProfileResult.data as FarmerProfile));
      setFarmerVerification(farmerVerificationResult.error ? null : (farmerVerificationResult.data as FarmerVerification));
      setCustomerProfile(null);
      setProfile(loadedProfile);
      return;
    }

    setProfile(loadedProfile);
    if (loadedProfile.role === 'customer') {
      // Unlike farmerProfile above, this goes through apiClient/FastAPI
      // rather than a direct Supabase table read — /customers/me is the
      // only path that returns a geocoded lat/lng and triggers geocoding
      // as a side effect on first read (see app/customers/service.py).
      try {
        const { data } = await apiClient.get<CustomerProfileGeo>('/customers/me');
        setCustomerProfile(data);
      } catch (error) {
        console.warn('Could not load customer profile:', error);
        setCustomerProfile(null);
      }
      setFarmerProfile(null);
      setFarmerVerification(null);
    } else {
      setFarmerProfile(null);
      setFarmerVerification(null);
      setCustomerProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setFarmerProfile(null);
        setFarmerVerification(null);
        setCustomerProfile(null);
        setPasswordRecovery(false);
      }
    });

    // A farmer gets approved or rejected in Studio while the app is in the
    // background — re-read their status whenever the app comes back to the
    // foreground, so the farmer app unlocks without logging out and back in.
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      const userId = sessionRef.current?.user.id;
      if (state === 'active' && userId && profileRef.current?.role === 'farmer') loadProfile(userId);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        farmerProfile,
        farmerVerification,
        customerProfile,
        loading,
        refreshProfile,
        passwordRecovery,
        startPasswordRecovery,
        finishPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
