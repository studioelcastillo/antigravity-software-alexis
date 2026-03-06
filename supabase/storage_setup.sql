-- Run in Supabase SQL Editor as postgres

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

INSERT INTO storage.buckets (id, name, public)
VALUES ('el-castillo', 'el-castillo', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_upload ON storage.objects;
DROP POLICY IF EXISTS authenticated_update ON storage.objects;
DROP POLICY IF EXISTS authenticated_delete ON storage.objects;
DROP POLICY IF EXISTS public_read ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_upload'
  ) THEN
    EXECUTE 'CREATE POLICY authenticated_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''el-castillo'' AND (owner = auth.uid() OR public.is_super_admin()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_update'
  ) THEN
    EXECUTE 'CREATE POLICY authenticated_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''el-castillo'' AND (owner = auth.uid() OR public.is_super_admin()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_read'
  ) THEN
    EXECUTE 'CREATE POLICY public_read ON storage.objects FOR SELECT TO public USING (bucket_id = ''el-castillo'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_delete'
  ) THEN
    EXECUTE 'CREATE POLICY authenticated_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''el-castillo'' AND (owner = auth.uid() OR public.is_super_admin()))';
  END IF;
END $$;
