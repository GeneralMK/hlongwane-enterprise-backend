import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const getRequiredEnv = (
  name: string,
): string => {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured`,
    );
  }

  return value;
};

const supabaseUrl =
  getRequiredEnv("SUPABASE_URL");

const supabaseAnonKey =
  getRequiredEnv(
    "SUPABASE_ANON_KEY",
  );

const supabaseServiceRoleKey =
  getRequiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

export const supabaseClient:
  SupabaseClient =
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

export const supabaseAdmin:
  SupabaseClient =
  createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );