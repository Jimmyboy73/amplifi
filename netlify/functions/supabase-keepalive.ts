import type { Config } from "@netlify/functions";

export default async (): Promise<Response> => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    return new Response("Missing environment variables", { status: 500 });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseKey },
    });

    if (!response.ok) {
      console.error(`Supabase keepalive failed: ${response.status} ${response.statusText}`);
      return new Response("Keepalive request failed", { status: 500 });
    }

    console.log(`Supabase keepalive succeeded: ${response.status}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Supabase keepalive error:", err);
    return new Response("Keepalive request error", { status: 500 });
  }
};

export const config: Config = {
  schedule: "0 9 */4 * *",
};
