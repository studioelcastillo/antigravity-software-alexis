-- Add missing RLS policies for modules

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND prof_id IN (1, 11)
  );
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'accounts',
    'bank_accounts',
    'categories',
    'exchange_rates',
    'models_accounts',
    'models_goals',
    'models_streams',
    'models_streams_customers',
    'models_streams_files',
    'models_transactions',
    'payment_files',
    'paysheets',
    'periods',
    'products',
    'payroll_periods',
    'payroll_concepts',
    'payroll_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON %I;', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = 'admin_full_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY admin_full_access ON %I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
        t
      );
    END IF;
  END LOOP;
END $$;
