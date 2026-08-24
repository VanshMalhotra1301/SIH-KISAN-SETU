import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables. Please check your .env file.");
  process.exit(1);
}

// Create a Supabase client with the Service Role key
// This is REQUIRED to bypass RLS and create tables/functions
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration() {
  console.log("Starting RLS Policy Migration...");

  const sql = `
  -- 1. PROFILES TABLE POLICIES
  DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
  
  -- Users can read their own profile
  CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
    
  -- Super Admins can read all profiles
  CREATE POLICY "Super Admins can read all profiles" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
      )
    );
    
  -- District Admins can read profiles in their district
  CREATE POLICY "District Admins can read profiles in district" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'district_admin' AND district = profiles.district
      )
    );

  -- Users can update their own profile
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Super Admins can update any profile
  CREATE POLICY "Super Admins can update all profiles" ON profiles
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
      )
    );


  -- 2. PROCUREMENT CENTRES POLICIES
  DROP POLICY IF EXISTS "Enable read access for all users" ON procurement_centres;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON procurement_centres;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON procurement_centres;

  -- Everyone can read active centres (for booking)
  CREATE POLICY "Anyone can read centres" ON procurement_centres
    FOR SELECT USING (true);

  -- Super Admins can insert/update centres
  CREATE POLICY "Super Admins can insert centres" ON procurement_centres
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
  CREATE POLICY "Super Admins can update centres" ON procurement_centres
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
    
  -- Operators can update their assigned centre (e.g. counters)
  CREATE POLICY "Operators can update assigned centre" ON procurement_centres
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'centre_operator' AND centre_id = procurement_centres.id)
    );


  -- 3. QUEUE TICKETS POLICIES
  DROP POLICY IF EXISTS "Enable read access for all users" ON queue_tickets;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON queue_tickets;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON queue_tickets;

  -- Farmers read own tickets
  CREATE POLICY "Farmers can read own tickets" ON queue_tickets
    FOR SELECT USING (farmer_id = auth.uid());

  -- Operators read tickets for their centre
  CREATE POLICY "Operators can read centre tickets" ON queue_tickets
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'centre_operator' AND centre_id = queue_tickets.centre_id)
    );
    
  -- Super/District admins read all tickets
  CREATE POLICY "Admins can read all tickets" ON queue_tickets
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'district_admin'))
    );

  -- Farmers can insert own tickets
  CREATE POLICY "Farmers can insert own tickets" ON queue_tickets
    FOR INSERT WITH CHECK (farmer_id = auth.uid());

  -- Operators can update tickets in their centre
  CREATE POLICY "Operators can update centre tickets" ON queue_tickets
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'centre_operator' AND centre_id = queue_tickets.centre_id)
    );
    

  -- 4. PAYMENTS POLICIES
  DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payments;

  CREATE POLICY "Farmers can read own payments" ON payments
    FOR SELECT USING (farmer_id = auth.uid());

  CREATE POLICY "Admins can read all payments" ON payments
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'district_admin', 'centre_operator'))
    );


  -- 5. AUDIT LOGS POLICIES
  DROP POLICY IF EXISTS "Enable read access for all users" ON audit_logs;

  -- Only admins can read audit logs
  CREATE POLICY "Admins can read audit logs" ON audit_logs
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'district_admin'))
    );
    
  -- Anyone can insert audit logs via RPC, but let's lock table inserts to true for the service layer
  -- Alternatively, rely entirely on RPC with SECURITY DEFINER
  CREATE POLICY "Anyone can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  `;

  // Use a generic RPC or just warn user to run in SQL Editor
  console.log("---------------------------------------------------------");
  console.log("SQL to execute in Supabase SQL Editor:");
  console.log(sql);
  console.log("---------------------------------------------------------");
  console.log("NOTE: This script cannot run DDL directly unless an exec_sql RPC exists.");
  console.log("Please copy the SQL above and execute it in your Supabase SQL Editor.");
}

runMigration().catch(console.error);
