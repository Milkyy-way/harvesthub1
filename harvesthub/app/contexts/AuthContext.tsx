import React, { createContext, useContext, useEffect, useState } from 'react';
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
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  farmerProfile: null,
  farmerVerification: null,
  customerProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [farmerVerification, setFarmerVerification] = useState<FarmerVerification | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileGeo | null>(null);
  const [loading, setLoading] = useState(true);

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
    setProfile(loadedProfile);

    // Farmers get two extra rows the signup trigger creates alongside
    // profiles — the root layout needs `farmerVerification.submitted_at` to
    // decide whether a pending farmer belongs in the onboarding wizard or
    // the "under review" screen.
    if (loadedProfile.role === 'farmer') {
      const [farmerProfileResult, farmerVerificationResult] = await Promise.all([
        supabase.from('farmer_profiles').select('*').eq('id', userId).single(),
        supabase.from('farmer_verification').select('*').eq('id', userId).single(),
      ]);
      if (!farmerProfileResult.error) setFarmerProfile(farmerProfileResult.data as FarmerProfile);
      if (!farmerVerificationResult.error) setFarmerVerification(farmerVerificationResult.data as FarmerVerification);
      setCustomerProfile(null);
    } else if (loadedProfile.role === 'customer') {
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
      if (session?.user) 
        {console.log("Access Token:", session.access_token);
          await loadProfile(session.user.id);
        }
      
          setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        console.log("Updated Access Token:", session.access_token);
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setFarmerProfile(null);
        setFarmerVerification(null);
        setCustomerProfile(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, farmerProfile, farmerVerification, customerProfile, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
