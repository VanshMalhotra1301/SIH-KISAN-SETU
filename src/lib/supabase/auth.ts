/**
 * KISAN SETU — Real Supabase Auth & Role Management
 * Pure Supabase Authentication with database role verification.
 */
import { supabase } from "./client";

export type UserRole = "farmer" | "centre_operator" | "district_admin" | "super_admin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  fullNameHi?: string | undefined;
  phone?: string | undefined;
  district?: string | undefined;
  village?: string | undefined;
  villageHi?: string | undefined;
  farmerIdCode?: string | undefined;
  centreId?: string | undefined;
  avatarUrl?: string | undefined;
  crop?: string | undefined;
  quantityQuintals?: number | undefined;
  department?: string | undefined;
}

export interface SignUpFarmerPayload {
  role: "farmer";
  email: string;
  password: string;
  fullName: string;
  fullNameHi?: string | undefined;
  phone: string;
  district: string;
  village: string;
  villageHi?: string | undefined;
  crop: string;
  cropHi?: string | undefined;
  quantityQuintals: number;
}

export interface SignUpOperatorPayload {
  role: "centre_operator";
  email: string;
  password: string;
  fullName: string;
  fullNameHi?: string | undefined;
  phone: string;
  district: string;
  centreId: string;
}

export interface SignUpAdminPayload {
  role: "district_admin";
  email: string;
  password: string;
  fullName: string;
  fullNameHi?: string | undefined;
  phone: string;
  district: string;
  department?: string | undefined;
}

export interface SignUpSuperAdminPayload {
  role: "super_admin";
  email: string;
  password: string;
  fullName: string;
  fullNameHi?: string | undefined;
  phone: string;
  district?: string | undefined;
  department?: string | undefined;
}

export type SignUpPayload =
  | SignUpFarmerPayload
  | SignUpOperatorPayload
  | SignUpAdminPayload
  | SignUpSuperAdminPayload;

/** Role → default portal route mapping */
export const ROLE_PORTALS: Record<UserRole, string> = {
  farmer: "/farmer",
  centre_operator: "/centre",
  district_admin: "/control-tower",
  super_admin: "/control-tower",
};

/** Role display names */
export const ROLE_LABELS: Record<UserRole, { en: string; hi: string; icon: string }> = {
  farmer: { en: "Farmer", hi: "किसान", icon: "🌾" },
  centre_operator: { en: "Centre Operator", hi: "केंद्र प्रभारी", icon: "🏢" },
  district_admin: { en: "District Admin", hi: "जिला प्रशासक", icon: "🛰️" },
  super_admin: { en: "Super Admin", hi: "सुपर एडमिन", icon: "🏛️" },
};

/**
 * Fetch a user's verified profile and role from the Supabase `profiles` table.
 * Never trust client-provided roles.
 */
export async function fetchProfileById(userId: string): Promise<AppUser | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, farmers(*)")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const farmerInfo = Array.isArray(data.farmers) ? data.farmers[0] : data.farmers;

    return {
      id: data.id,
      email: data.email || "",
      role: data.role as UserRole,
      fullName: data.full_name,
      fullNameHi: data.full_name_hi,
      phone: data.phone,
      district: data.district,
      village: data.village,
      villageHi: data.village_hi,
      farmerIdCode: farmerInfo?.farmer_id_code,
      centreId: data.centre_id,
      crop: farmerInfo?.crop,
      quantityQuintals: farmerInfo ? Number(farmerInfo.quantity_quintals) : undefined,
    };
  } catch (err) {
    console.warn("Error fetching user profile:", err);
    return null;
  }
}
