/* EMPIRE — Supabase client configuration
 * Publishable key only. Never put a Supabase secret/service_role key here.
 */
(function () {
  const SUPABASE_URL = 'https://pbaojidktzjnpavtdcga.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XVsmd-U_ZF5eD-UcxMw31g_Yv9rUdVk';

  window.EMPIRE_SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY
  };

  // The Supabase browser client is loaded only once per page.
  if (!window.supabase || !window.supabase.createClient) return;
  window.EMPIRE_SUPABASE = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
})();
