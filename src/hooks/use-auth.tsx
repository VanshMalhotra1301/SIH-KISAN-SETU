/**
 * KISAN SETU — Real Supabase Auth Hook & Context
 * Strictly authenticates via Supabase Auth and loads verified roles from DB.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  fetchProfileById,
  ROLE_PORTALS,
  type AppUser,
  type SignUpPayload,
  type UserRole,
} from "@/lib/supabase/auth";
import { auditService } from "@/lib/kisan/services";

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  notice: string | null;
  login: (email: string, password: string) => Promise<AppUser>;
  signUp: (payload: SignUpPayload) => Promise<{ user: AppUser | null; requiresEmailConfirmation: boolean }>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  getDefaultPath: () => string;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Initialize session and sync with Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn("Session check warning:", sessionError.message);
        }

        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            const profile = await fetchProfileById(initialSession.user.id);
            if (mounted) {
              setUser(profile);
            }
          }
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to real Supabase auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (newSession?.user) {
          const profile = await fetchProfileById(newSession.user.id);
          if (mounted) setUser(profile);
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Real Supabase Sign In with Password.
   * Fetches database role after successful authentication.
   */
  const login = async (email: string, password: string): Promise<AppUser> => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        throw new Error(authError.message || "Invalid email or password.");
      }

      if (!data.user) {
        throw new Error("No user returned from authentication server.");
      }

      // Fetch the verified user profile & role from the database
      const profile = await fetchProfileById(data.user.id);
      if (!profile) {
        throw new Error("User account found, but no profile is configured in the database.");
      }

      setUser(profile);
      setSession(data.session);

      // Log successful login
      await auditService.log({
        actorId: profile.id,
        actorRole: profile.role,
        action: "user_login",
        metadata: { email: cleanEmail },
      });

      return profile;
    } catch (err: any) {
      const message = err?.message || "Failed to sign in.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Real Supabase Sign Up.
   * Uses RPC registration to bypass GoTrue SMTP rate limit and immediately activates account.
   */
  const signUp = async (payload: SignUpPayload): Promise<{ user: AppUser | null; requiresEmailConfirmation: boolean }> => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const cleanEmail = payload.email.trim().toLowerCase();

      let village = "";
      let crop = "Wheat";
      let quantity = 120;
      let centreId: string | null = null;
      let department = "Department of Agriculture";
      let bankName = "State Bank of India";
      let bankAccount: string | null = null;
      let ifscCode = "SBIN0001234";
      let landArea = 5.0;
      let aadhaarNumber: string | null = null;

      if (payload.role === "farmer") {
        village = payload.village || "";
        crop = payload.crop || "Wheat";
        quantity = payload.quantityQuintals || 120;
        bankName = payload.bankName || "State Bank of India";
        bankAccount = payload.bankAccount || null;
        ifscCode = payload.ifscCode || "SBIN0001234";
        landArea = payload.landAreaAcres || 5.0;
        aadhaarNumber = payload.aadhaarNumber || null;
      } else if (payload.role === "centre_operator") {
        centreId = payload.centreId;
      } else if (payload.role === "district_admin") {
        department = payload.department || "District Agriculture Office";
      } else if (payload.role === "super_admin") {
        department = payload.department || "State Directorate of Agriculture";
      }

      // 1. Call secure register_user_account RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("register_user_account", {
        p_email: cleanEmail,
        p_password: payload.password,
        p_role: payload.role,
        p_full_name: payload.fullName,
        p_phone: payload.phone,
        p_district: payload.district || "",
        p_village: village,
        p_crop: crop,
        p_quantity: quantity,
        p_centre_id: centreId,
        p_department: department,
        p_bank_name: bankName,
        p_bank_account: bankAccount,
        p_ifsc_code: ifscCode,
        p_land_area: landArea,
        p_aadhaar_number: aadhaarNumber,
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Failed to register account.");
      }

      // 2. Immediately sign in to establish real authenticated JWT session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: payload.password,
      });

      if (signInError) {
        throw new Error(`Account created, but initial login failed: ${signInError.message}`);
      }

      let createdProfile: AppUser | null = null;
      if (signInData.user) {
        createdProfile = await fetchProfileById(signInData.user.id);
        if (createdProfile) {
          setUser(createdProfile);
          setSession(signInData.session);
        }
      }

      // Audit new account creation
      if (createdProfile) {
        await auditService.log({
          actorId: createdProfile.id,
          actorRole: createdProfile.role,
          action: "user_signup",
          metadata: { email: cleanEmail, role: payload.role },
        });
      }

      return { user: createdProfile, requiresEmailConfirmation: false };
    } catch (err: any) {
      const message = err?.message || "Sign up failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send Password Reset Email.
   */
  const forgotPassword = async (email: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message || "Failed to send password reset email.");
      }

      setNotice(`Password reset instructions have been sent to ${cleanEmail}.`);
    } catch (err: any) {
      const message = err?.message || "Failed to send password reset.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Real Supabase Sign Out.
   */
  const logout = async (): Promise<void> => {
    if (user) {
      await auditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: "user_logout",
      });
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out warning:", err);
    }

    setUser(null);
    setSession(null);
    setError(null);
    setNotice(null);
  };

  const getDefaultPath = (): string => {
    if (!user) return "/login";
    return ROLE_PORTALS[user.role] || "/farmer";
  };

  const clearError = () => setError(null);

  /**
   * Change password for authenticated user.
   * Re-authenticates with current password first, then updates.
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (!user?.email) {
        throw new Error("No authenticated user session found.");
      }

      // Re-authenticate with current password to verify identity
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reAuthError) {
        throw new Error("Current password is incorrect.");
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || "Failed to update password.");
      }

      await auditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: "change_password",
      });

      setNotice("Password updated successfully.");
    } catch (err: any) {
      const message = err?.message || "Failed to change password.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset password using recovery token (from email link).
   */
  const resetPassword = async (newPassword: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || "Failed to reset password.");
      }

      setNotice("Password has been reset successfully. You can now sign in.");
    } catch (err: any) {
      const message = err?.message || "Failed to reset password.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        session,
        isAuthenticated: !!user,
        loading,
        error,
        notice,
        login,
        signUp,
        forgotPassword,
        changePassword,
        resetPassword,
        logout,
        getDefaultPath,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
