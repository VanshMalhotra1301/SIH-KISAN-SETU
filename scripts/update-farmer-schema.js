import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function updateFarmerSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Updating public.farmers schema and register_user_account RPC...");

  await client.query(`
    -- 1. Ensure all columns in public.farmers
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS land_area_acres NUMERIC DEFAULT 5.0;
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'State Bank of India';
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS bank_account_masked TEXT DEFAULT '••••4417';
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS ifsc_code TEXT DEFAULT 'SBIN0001234';
    ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS aadhaar_number_masked TEXT DEFAULT '•••• •••• 8821';

    -- 2. Update register_user_account stored procedure to accept bank & land details
    CREATE OR REPLACE FUNCTION public.register_user_account(
      p_email TEXT,
      p_password TEXT,
      p_role TEXT,
      p_full_name TEXT,
      p_phone TEXT,
      p_district TEXT DEFAULT 'Karnal',
      p_village TEXT DEFAULT 'Bahadurgarh',
      p_crop TEXT DEFAULT 'Wheat',
      p_quantity NUMERIC DEFAULT 120,
      p_centre_id UUID DEFAULT NULL,
      p_department TEXT DEFAULT 'Department of Agriculture',
      p_bank_name TEXT DEFAULT 'State Bank of India',
      p_bank_account TEXT DEFAULT NULL,
      p_ifsc_code TEXT DEFAULT 'SBIN0001234',
      p_land_area NUMERIC DEFAULT 5.0,
      p_aadhaar_number TEXT DEFAULT NULL
    )
    RETURNS JSONB AS $$
    DECLARE
      v_user_id UUID;
      v_encrypted_pw TEXT;
      v_clean_email TEXT;
      v_existing_id UUID;
      v_masked_acc TEXT;
      v_masked_aadhaar TEXT;
      v_farmer_code TEXT;
    BEGIN
      v_clean_email := lower(trim(p_email));
      
      -- Check if user already exists
      SELECT id INTO v_existing_id FROM auth.users WHERE email = v_clean_email;
      IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'An account with email % already exists. Please sign in.', v_clean_email;
      END IF;

      v_user_id := gen_random_uuid();
      v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

      -- Mask bank account and aadhaar
      IF p_bank_account IS NOT NULL AND length(trim(p_bank_account)) >= 4 THEN
        v_masked_acc := coalesce(p_bank_name, 'Bank') || ' ••••' || right(trim(p_bank_account), 4);
      ELSE
        v_masked_acc := coalesce(p_bank_name, 'Bank') || ' ••••4417';
      END IF;

      IF p_aadhaar_number IS NOT NULL AND length(trim(p_aadhaar_number)) >= 4 THEN
        v_masked_aadhaar := '•••• •••• ' || right(trim(p_aadhaar_number), 4);
      ELSE
        v_masked_aadhaar := '•••• •••• ' || to_char(floor(1000 + random() * 8999)::int, 'FM9999');
      END IF;

      v_farmer_code := 'HR-' || upper(coalesce(substring(p_district from 1 for 3), 'KRN')) || '-2026-' || upper(substring(v_user_id::text from 1 for 5));

      -- 1. Insert into auth.users (instantly confirmed)
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_clean_email, v_encrypted_pw, now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'role', p_role,
          'full_name', p_full_name,
          'phone', p_phone,
          'district', p_district,
          'village', p_village,
          'crop', p_crop,
          'quantity_quintals', p_quantity,
          'centre_id', p_centre_id,
          'department', p_department,
          'bank_name', p_bank_name,
          'bank_account_masked', v_masked_acc,
          'ifsc_code', p_ifsc_code,
          'land_area_acres', p_land_area,
          'farmer_id_code', v_farmer_code
        ),
        false, now(), now(), '', '', '', ''
      );

      -- 2. Insert into auth.identities
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', v_clean_email),
        'email', v_user_id::text, now(), now(), now()
      );

      -- 3. Insert into public.profiles
      INSERT INTO public.profiles (
        id, role, full_name, full_name_hi, phone, district, village, village_hi, language, centre_id
      ) VALUES (
        v_user_id, p_role, p_full_name, p_full_name, p_phone, p_district, p_village, p_village, 'hi', p_centre_id
      )
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        district = EXCLUDED.district,
        village = EXCLUDED.village,
        centre_id = EXCLUDED.centre_id;

      -- 4. If role is farmer, insert into public.farmers
      IF p_role = 'farmer' THEN
        INSERT INTO public.farmers (
          id, farmer_id_code, crop, crop_hi, quantity_quintals, land_area_acres,
          bank_name, bank_account_masked, bank_account_number, ifsc_code, aadhaar_number_masked
        ) VALUES (
          v_user_id,
          v_farmer_code,
          p_crop,
          CASE WHEN p_crop = 'Wheat' THEN 'गेहूँ' WHEN p_crop = 'Paddy' THEN 'धान' WHEN p_crop = 'Mustard' THEN 'सरसों' ELSE 'चना' END,
          p_quantity,
          coalesce(p_land_area, 5.0),
          coalesce(p_bank_name, 'State Bank of India'),
          v_masked_acc,
          p_bank_account,
          coalesce(p_ifsc_code, 'SBIN0001234'),
          v_masked_aadhaar
        )
        ON CONFLICT (id) DO UPDATE SET
          crop = EXCLUDED.crop,
          crop_hi = EXCLUDED.crop_hi,
          quantity_quintals = EXCLUDED.quantity_quintals,
          land_area_acres = EXCLUDED.land_area_acres,
          bank_name = EXCLUDED.bank_name,
          bank_account_masked = EXCLUDED.bank_account_masked,
          ifsc_code = EXCLUDED.ifsc_code;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', v_clean_email,
        'role', p_role,
        'farmer_id_code', v_farmer_code
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  console.log("✅ Schema and RPC updated successfully!");
  await client.end();
}

updateFarmerSchema().catch(console.error);
