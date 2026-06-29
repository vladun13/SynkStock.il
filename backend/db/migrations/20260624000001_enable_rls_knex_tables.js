// Supabase exposes every public-schema table through PostgREST under the anon
// key. knex's bookkeeping tables ship without RLS, so the security linter flags
// them as publicly readable/writable (rls_disabled_in_public).
// Enabling RLS with NO policies denies all anon/authenticated access; the
// backend's service-role key bypasses RLS, so migrations keep working.
exports.up = async (knex) => {
  await knex.raw('ALTER TABLE public.knex_migrations ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE public.knex_migrations_lock ENABLE ROW LEVEL SECURITY');
};

exports.down = async (knex) => {
  await knex.raw('ALTER TABLE public.knex_migrations DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE public.knex_migrations_lock DISABLE ROW LEVEL SECURITY');
};
