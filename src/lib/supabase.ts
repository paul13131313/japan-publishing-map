import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください');
}

// サーバーサイド専用クライアント（service_role key 使用）
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
