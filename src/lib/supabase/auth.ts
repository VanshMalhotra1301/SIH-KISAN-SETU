/**
 * KISAN SETU — Real Supabase Auth & Role Management
 * Pure Supabase Authentication with database role verification.
 * No hardcoded fallback values for sensitive data (bank details, IDs).
 */
import { supabase } from "./client";

export type UserRole = "farmer" | "centre_operator" | "district_admin" | "super_admin" | "buyer";

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
  cropHi?: string | undefined;
  quantityQuintals?: number | undefined;
  department?: string | undefined;
  bankName?: string | undefined;
  bankAccountMasked?: string | undefined;
  bankAccountNumber?: string | undefined;
  ifscCode?: string | undefined;
  landAreaAcres?: number | undefined;
  aadhaarNumberMasked?: string | undefined;
  /** Buyer-specific fields */
  businessName?: string | undefined;
  businessType?: string | undefined;
  licenseNumber?: string | undefined;
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
  bankName?: string | undefined;
  bankAccount?: string | undefined;
  ifscCode?: string | undefined;
  landAreaAcres?: number | undefined;
  aadhaarNumber?: string | undefined;
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

export interface SignUpBuyerPayload {
  role: "buyer";
  email: string;
  password: string;
  fullName: string;
  fullNameHi?: string | undefined;
  phone: string;
  district: string;
  centreId: string;
  businessName: string;
  businessType?: string | undefined;
  licenseNumber?: string | undefined;
}

export type SignUpPayload =
  | SignUpFarmerPayload
  | SignUpOperatorPayload
  | SignUpAdminPayload
  | SignUpSuperAdminPayload
  | SignUpBuyerPayload;

/** Role → default portal route mapping */
export const ROLE_PORTALS: Record<UserRole, string> = {
  farmer: "/farmer",
  centre_operator: "/centre",
  district_admin: "/control-tower",
  super_admin: "/admin",
  buyer: "/buyer",
};

/** Role display names */
export const ROLE_LABELS: Record<UserRole, { en: string; hi: string; icon: string }> = {
  farmer: { en: "Farmer", hi: "किसान", icon: "🌾" },
  centre_operator: { en: "Centre Operator", hi: "केंद्र प्रभारी", icon: "🏢" },
  district_admin: { en: "District Admin", hi: "जिला प्रशासक", icon: "🛰️" },
  super_admin: { en: "Super Admin", hi: "सुपर एडमिन", icon: "🏛️" },
  buyer: { en: "Buyer", hi: "क्रेता", icon: "🏪" },
};

/**
 * Fetch a user's verified profile and role from the Supabase `profiles` table.
 * Never trust client-provided roles.
 * Only joins farmer data for farmer-role users to avoid unnecessary queries.
 */
export async function fetchProfileById(userId: string): Promise<AppUser | null> {
  try {
    // First fetch the profile to determine role
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profileData) return null;

    const baseUser: AppUser = {
      id: profileData.id,
      email: profileData.email || "",
      role: profileData.role as UserRole,
      fullName: profileData.full_name,
      fullNameHi: profileData.full_name_hi,
      phone: profileData.phone,
      district: profileData.district,
      village: profileData.village,
      villageHi: profileData.village_hi,
      centreId: profileData.centre_id,
    };

    // Only fetch farmer-specific data for farmer-role profiles
    if (profileData.role === "farmer") {
      const { data: farmerData } = await supabase
        .from("farmers")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (farmerData) {
        baseUser.farmerIdCode = farmerData.farmer_id_code;
        baseUser.crop = farmerData.crop;
        baseUser.cropHi = farmerData.crop_hi;
        baseUser.quantityQuintals = farmerData.quantity_quintals ? Number(farmerData.quantity_quintals) : undefined;
        // Only set bank details if they actually exist in the database — never fabricate
        baseUser.bankName = farmerData.bank_name || undefined;
        baseUser.bankAccountMasked = farmerData.bank_account_masked || (farmerData.bank_account_number ? `••••${farmerData.bank_account_number.slice(-4)}` : undefined);
        baseUser.bankAccountNumber = farmerData.bank_account_number || undefined;
        baseUser.ifscCode = farmerData.ifsc_code || undefined;
        baseUser.landAreaAcres = farmerData.land_area_acres ? Number(farmerData.land_area_acres) : undefined;
        baseUser.aadhaarNumberMasked = farmerData.aadhaar_number_masked || undefined;
      }
    } else if (profileData.role === "buyer") {
      const { data: buyerData } = await supabase
        .from("buyers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (buyerData) {
        baseUser.centreId = buyerData.centre_id;
        baseUser.businessName = buyerData.business_name;
        baseUser.businessType = buyerData.business_type;
        baseUser.licenseNumber = buyerData.licence_number || buyerData.license_number;
      }
    } else if (profileData.role === "district_admin" || profileData.role === "super_admin") {
      baseUser.department = profileData.department;
    }

    return baseUser;
  } catch (err) {
    console.warn("Error fetching user profile:", err);
    return null;
  }
}
