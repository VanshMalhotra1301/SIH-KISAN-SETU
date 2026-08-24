import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const signupRpcSql = `
-- Create a secure function in public schema to register users without getting blocked by GoTrue SMTP rate limits
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
  p_department TEXT DEFAULT 'Department of Agriculture'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_clean_email TEXT;
  v_existing_id UUID;
BEGIN
  v_clean_email := lower(trim(p_email));
  
  -- Check if user already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = v_clean_email;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'An account with email % already exists. Please sign in.', v_clean_email;
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

  -- 1. Insert into auth.users (instantly confirmed, active)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_clean_email,
    v_encrypted_pw,
    now(),
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
      'department', p_department
    ),
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', v_clean_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 3. Profile & Farmer tables are handled by trigger handle_new_user(), but ensure values are inserted
  INSERT INTO public.profiles (
    id, role, full_name, full_name_hi, phone, district, village, village_hi, language, centre_id
  ) VALUES (
    v_user_id,
    p_role,
    p_full_name,
    p_full_name,
    p_phone,
    p_district,
    p_village,
    p_village,
    'en',
    p_centre_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    district = EXCLUDED.district,
    village = EXCLUDED.village,
    centre_id = EXCLUDED.centre_id;

  IF p_role = 'farmer' THEN
    INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals)
    VALUES (
      v_user_id,
      'HR-KRN-2026-' || upper(substring(v_user_id::text from 1 for 5)),
      p_crop,
      CASE WHEN p_crop = 'Wheat' THEN 'गेहूँ' WHEN p_crop = 'Paddy' THEN 'धान' WHEN p_crop = 'Mustard' THEN 'सरसों' ELSE 'चना' END,
      p_quantity
    )
    ON CONFLICT (id) DO UPDATE SET
      crop = EXCLUDED.crop,
      quantity_quintals = EXCLUDED.quantity_quintals;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_clean_email,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.register_user_account TO anon, authenticated, service_role;
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Installing register_user_account RPC function...');
    await client.query(signupRpcSql);
    console.log('✅ RPC register_user_account installed successfully!');
    await client.end();
  } catch (err) {
    console.error('Failed to install RPC:', err);
    process.exit(1);
  }
}

run();
