import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env as Record<string, string | undefined>)["VITE_SUPABASE_URL"] || "https://yylgukviahqpuznlcddp.supabase.co";
const supabaseAnonKey = (import.meta.env as Record<string, string | undefined>)["VITE_SUPABASE_ANON_KEY"] || "sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
