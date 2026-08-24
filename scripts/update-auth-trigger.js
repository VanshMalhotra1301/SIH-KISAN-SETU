import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const updateTriggerSql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_centre_id UUID;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'farmer');

  -- Security rule: self-signup cannot create district_admin or super_admin
  IF v_role NOT IN ('farmer', 'centre_operator', 'district_admin', 'super_admin') THEN
    v_role := 'farmer';
  END IF;

  -- Parse centre_id if provided
  BEGIN
    IF new.raw_user_meta_data->>'centre_id' IS NOT NULL AND new.raw_user_meta_data->>'centre_id' != '' THEN
      v_centre_id := (new.raw_user_meta_data->>'centre_id')::uuid;
    ELSE
      v_centre_id := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_centre_id := NULL;
  END;

  INSERT INTO public.profiles (id, role, full_name, full_name_hi, phone, district, village, village_hi, language, centre_id)
  VALUES (
    new.id,
    v_role,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name_hi', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'phone', '+91 98000 00000'),
    COALESCE(new.raw_user_meta_data->>'district', 'Karnal'),
    COALESCE(new.raw_user_meta_data->>'village', 'Bahadurgarh'),
    COALESCE(new.raw_user_meta_data->>'village_hi', 'बहादुरगढ़'),
    COALESCE(new.raw_user_meta_data->>'language', 'en'),
    v_centre_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    district = EXCLUDED.district,
    village = EXCLUDED.village,
    centre_id = COALESCE(EXCLUDED.centre_id, public.profiles.centre_id);

  -- If farmer, create or update farmers table entry
  IF v_role = 'farmer' THEN
    INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'farmer_id_code', 'HR-KRN-2026-' || SUBSTRING(new.id::text, 1, 5)),
      COALESCE(new.raw_user_meta_data->>'crop', 'Wheat'),
      COALESCE(new.raw_user_meta_data->>'crop_hi', 'गेहूँ'),
      COALESCE((new.raw_user_meta_data->>'quantity_quintals')::numeric, 120)
    )
    ON CONFLICT (id) DO UPDATE SET
      crop = EXCLUDED.crop,
      quantity_quintals = EXCLUDED.quantity_quintals;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Updating handle_new_user trigger in Postgres...');
    await client.query(updateTriggerSql);
    console.log('✅ Trigger updated successfully!');
    await client.end();
  } catch (err) {
    console.error('Trigger update failed:', err);
    process.exit(1);
  }
}

run();
