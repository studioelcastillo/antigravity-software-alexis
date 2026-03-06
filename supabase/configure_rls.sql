-- ==========================================================
-- EL CASTILLO GROUP SAS — Configuración de RLS
-- Ejecutar en: Dashboard Supabase > SQL Editor
-- Proyecto: wukvaemawvjavwqocxyb (El_Castillo_BaseDatos)
-- ==========================================================
-- ESTRATEGIA: Acceso total solo para super admins.
-- El resto de usuarios depende de políticas específicas por tabla.
-- ==========================================================

-- ════════════════════════════════════════════════════════════
-- PASO 0: CREAR TABLAS FALTANTES (Módulo Nómina/Payroll)
-- ════════════════════════════════════════════════════════════

-- Períodos de nómina (payroll_periods)
CREATE TABLE IF NOT EXISTS payroll_periods (
  payroll_period_id SERIAL PRIMARY KEY,
  std_id INT REFERENCES studios(std_id) ON DELETE CASCADE,
  payroll_period_start_date DATE NOT NULL,
  payroll_period_end_date DATE NOT NULL,
  payroll_period_state VARCHAR(20) NOT NULL DEFAULT 'ABIERTO', -- ABIERTO, CERRADO, LIQUIDADO
  payroll_period_interval VARCHAR(20) NOT NULL DEFAULT 'MENSUAL', -- SEMANAL, QUINCENAL, MENSUAL
  payroll_period_smmlv NUMERIC(14,2) DEFAULT 1300000,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conceptos de nómina (horas extras, deducciones adicionales)
CREATE TABLE IF NOT EXISTS payroll_concepts (
  payroll_concept_id SERIAL PRIMARY KEY,
  payroll_period_id INT REFERENCES payroll_periods(payroll_period_id) ON DELETE CASCADE,
  stdmod_id INT REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  concept_type VARCHAR(50) NOT NULL, -- EXTRA_HOUR_DIURNA, EXTRA_HOUR_NOCTURNA, etc.
  concept_description TEXT,
  concept_hours NUMERIC(8,2) DEFAULT 0,
  concept_hourly_rate NUMERIC(14,2) DEFAULT 0,
  concept_surcharge_percentage NUMERIC(8,2) DEFAULT 0,
  concept_total NUMERIC(14,2) DEFAULT 0,
  commission_periods JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacciones de nómina (resultado de liquidación)
CREATE TABLE IF NOT EXISTS payroll_transactions (
  payroll_trans_id SERIAL PRIMARY KEY,
  payroll_period_id INT REFERENCES payroll_periods(payroll_period_id) ON DELETE CASCADE,
  stdmod_id INT REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  employee_id INT REFERENCES users(user_id),
  employee_name VARCHAR(500),
  total_salary NUMERIC(14,2) DEFAULT 0,
  commissions NUMERIC(14,2) DEFAULT 0,
  total_deducciones NUMERIC(14,2) DEFAULT 0,
  total_neto NUMERIC(14,2) DEFAULT 0,
  prestaciones JSONB DEFAULT '{}'::jsonb,
  social_security JSONB DEFAULT '{}'::jsonb,
  parafiscales JSONB DEFAULT '{}'::jsonb,
  salary_composition JSONB DEFAULT '[]'::jsonb,
  commission_details JSONB DEFAULT '[]'::jsonb,
  commission_periods JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- PASO 1: DEFINIR HELPERS Y LIMPIAR POLÍTICAS DEMASIADO ABIERTAS
-- ════════════════════════════════════════════════════════════

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
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'authenticated_full_access'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PASO 2: HABILITAR RLS EN TODAS LAS TABLAS PÚBLICAS
-- ════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users_permissions2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS studios_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_streams_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS models_streams_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS paysheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_transactions ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- PASO 3: ACCESO TOTAL SOLO PARA SUPER ADMINS
-- Las políticas específicas por tabla deben coexistir con esta.
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles',
    'users',
    'users_permissions2',
    'accounts',
    'settings',
    'locations',
    'categories',
    'transactions_types',
    'exchange_rates',
    'periods',
    'products',
    'terceros',
    'studios',
    'studios_accounts',
    'studios_rooms',
    'studios_shifts',
    'studios_models',
    'models_accounts',
    'models_goals',
    'models_transactions',
    'models_streams_files',
    'models_streams',
    'models_streams_customers',
    'commissions',
    'bank_accounts',
    'payments',
    'payment_files',
    'paysheets',
    'transactions',
    'notifications',
    'petitions',
    'logs',
    'login_history',
    'payroll_periods',
    'payroll_concepts',
    'payroll_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
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

-- ════════════════════════════════════════════════════════════
-- PASO 4: CONFIGURAR STORAGE BUCKET
-- ════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('el-castillo', 'el-castillo', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_upload ON storage.objects;
DROP POLICY IF EXISTS authenticated_update ON storage.objects;
DROP POLICY IF EXISTS authenticated_delete ON storage.objects;
DROP POLICY IF EXISTS public_read ON storage.objects;

-- Permitir a usuarios autenticados subir archivos
CREATE POLICY "authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- Permitir a usuarios autenticados actualizar sus archivos
CREATE POLICY "authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- Permitir lectura pública de archivos del bucket
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'el-castillo');

-- Permitir a autenticados eliminar archivos
CREATE POLICY "authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN: Consultar que todas las tablas tienen RLS
-- ════════════════════════════════════════════════════════════

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
