import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("缺少 Supabase 环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  if (serviceKey.startsWith("sb_publishable") || serviceKey.startsWith("sb_anon")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 不能使用 publishable/anon key，请在 Supabase API Keys 中复制 service_role 或 secret key");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
