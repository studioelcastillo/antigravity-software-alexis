-- ==========================================================
-- EL CASTILLO GROUP SAS — Sistema de Módulos y Permisos API
-- Ejecutar en: Dashboard Supabase > SQL Editor
-- Proyecto: wukvaemawvjavwqocxyb (El_Castillo_BaseDatos)
-- ==========================================================

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

-- ════════════════════════════════════════════════════════════
-- PASO 1: CREAR TABLAS
-- ════════════════════════════════════════════════════════════

-- Registro de módulos del sistema
CREATE TABLE IF NOT EXISTS api_modules (
  module_id SERIAL PRIMARY KEY,
  module_key VARCHAR(100) NOT NULL UNIQUE,
  module_name VARCHAR(200) NOT NULL,
  module_group VARCHAR(100) DEFAULT 'GENERAL',
  module_icon VARCHAR(50) DEFAULT 'widgets',
  module_description TEXT,
  module_actions JSONB DEFAULT '["menu","show","add","edit","delete"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permisos por perfil (rol) y módulo
CREATE TABLE IF NOT EXISTS api_permissions (
  perm_id SERIAL PRIMARY KEY,
  prof_id INT NOT NULL,
  module_id INT NOT NULL REFERENCES api_modules(module_id) ON DELETE CASCADE,
  can_menu BOOLEAN DEFAULT false,
  can_show BOOLEAN DEFAULT false,
  can_add BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  custom_actions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prof_id, module_id)
);

-- Excepciones por usuario individual
CREATE TABLE IF NOT EXISTS api_user_overrides (
  override_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  module_id INT NOT NULL REFERENCES api_modules(module_id) ON DELETE CASCADE,
  can_menu BOOLEAN,
  can_show BOOLEAN,
  can_add BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  custom_actions JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- ════════════════════════════════════════════════════════════
-- PASO 2: RLS
-- ════════════════════════════════════════════════════════════

ALTER TABLE api_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_user_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_full_access ON api_modules;
DROP POLICY IF EXISTS authenticated_full_access ON api_permissions;
DROP POLICY IF EXISTS authenticated_full_access ON api_user_overrides;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_modules' AND policyname = 'admin_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY admin_full_access ON api_modules FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_permissions' AND policyname = 'admin_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY admin_full_access ON api_permissions FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_user_overrides' AND policyname = 'admin_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY admin_full_access ON api_user_overrides FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- PASO 3: POBLAR MÓDULOS
-- Basado en router/routes.js y sGate.js
-- ════════════════════════════════════════════════════════════

INSERT INTO api_modules (module_key, module_name, module_group, module_icon, module_description, module_actions, sort_order) VALUES
  ('dashboard',                'Dashboard',               'GENERAL',       'dashboard',         'Panel principal con indicadores y gráficas',  '["indicators","charts","tasks","show_as_user"]', 1),
  ('users',                    'Usuarios',                'ADMIN',         'people',            'Gestión de usuarios del sistema',              '["menu","show","add","edit","delete","activate","export","change_password","coincidence"]', 2),
  ('petitions',                'Solicitudes',             'ADMIN',         'assignment',        'Solicitudes y peticiones de modelos',           '["menu","show","add","edit"]', 3),
  ('users_permissions2',       'Permisos Usuarios',       'ADMIN',         'security',          'Permisos individuales por usuario',             '["menu","show","add","edit","delete"]', 4),
  ('logs',                     'Auditoría',               'ADMIN',         'history',           'Registro de cambios en el sistema',             '["menu","show"]', 5),
  ('login_history',            'Historial Sesiones',      'ADMIN',         'login',             'Historial de inicios de sesión',                '["menu","show"]', 6),
  ('api_modules',              'Módulos API',             'ADMIN',         'api',               'Administración de módulos y permisos del API',  '["menu","show","edit"]', 7),
  ('studios',                  'Estudios',                'OPERACIONES',   'business',          'Gestión de estudios/sedes',                     '["menu","show","add","edit","delete"]', 10),
  ('studios_rooms',            'Cuartos',                 'OPERACIONES',   'meeting_room',      'Salas de los estudios',                         '["menu","show","add","edit","delete"]', 11),
  ('studios_shifts',           'Turnos',                  'OPERACIONES',   'schedule',          'Turnos de trabajo',                             '["menu","show","add","edit","delete"]', 12),
  ('studios_accounts',         'Cuentas Estudio',         'OPERACIONES',   'account_balance',   'Cuentas financieras de estudios',               '["menu","show","add","edit","delete"]', 13),
  ('studios_models',           'Contratos',               'OPERACIONES',   'description',       'Contratos de modelos con estudios',             '["menu","show","add","edit","delete","activate"]', 14),
  ('models_accounts',          'Cuentas de Modelo',       'OPERACIONES',   'manage_accounts',   'Cuentas de plataformas de modelos',             '["menu","show","add","edit","delete","activate","transfer","modify_payment"]', 15),
  ('models_goals',             'Metas',                   'OPERACIONES',   'flag',              'Metas de rendimiento por modelo',               '["menu","show","add","edit","delete"]', 16),
  ('models_streams',           'Transmisiones',           'OPERACIONES',   'videocam',          'Registro de jornadas/transmisiones',            '["menu","show","add","edit","delete"]', 17),
  ('models_streams_customers', 'Clientes',                'OPERACIONES',   'groups',            'Clientes registrados en transmisiones',         '["menu","show","add","edit","delete"]', 18),
  ('models_streams_files',     'Cargues de Streams',      'OPERACIONES',   'upload_file',       'Archivos adjuntos de transmisiones',            '["menu","show","add","edit","delete"]', 19),
  ('monitors',                 'Monitores',               'OPERACIONES',   'supervisor_account','Vista de monitores y jerarquía',                '["menu","show","add_hierarchy","delete_hierarchy"]', 20),
  ('models_transactions',      'Transacciones Modelo',    'FINANCIERO',    'swap_horiz',        'Movimientos financieros por modelo',            '["menu","show","add_income","add_expenses","edit","delete"]', 30),
  ('transactions',             'Transacciones',           'FINANCIERO',    'receipt_long',      'Transacciones financieras generales',           '["menu","show","add_income","add_expenses","edit","delete"]', 31),
  ('transactions_types',       'Tipos Transacción',       'FINANCIERO',    'category',          'Clasificación de transacciones',                '["menu","show","add","edit","delete"]', 32),
  ('payments',                 'Pagos',                   'FINANCIERO',    'payments',          'Registro de pagos a modelos',                   '["menu","show","add","edit","delete"]', 33),
  ('payments_files',           'Cargues de Pagos',        'FINANCIERO',    'attach_file',       'Archivos de soporte de pagos',                  '["menu","show","add","edit","delete"]', 34),
  ('banks_accounts',           'Cuentas Bancarias',       'FINANCIERO',    'account_balance_wallet', 'Cuentas bancarias de usuarios',            '["menu","show","add","edit","delete"]', 35),
  ('exchanges_rates',          'Tasas de Cambio',         'FINANCIERO',    'currency_exchange',  'Tasas de cambio USD/COP',                      '["menu","show","add","edit","delete"]', 36),
  ('categories',               'Categorías',              'CONFIGURACIÓN', 'label',             'Categorías de clasificación',                   '["menu","show","add","edit","delete"]', 40),
  ('products',                 'Productos',               'CONFIGURACIÓN', 'inventory_2',       'Catálogo de productos/servicios',               '["menu","show","add","edit","delete"]', 41),
  ('periods',                  'Períodos',                'CONFIGURACIÓN', 'date_range',        'Períodos contables/operativos',                 '["menu","show","close"]', 42),
  ('locations',                'Ubicaciones',             'CONFIGURACIÓN', 'place',             'Países, departamentos, ciudades',               '["menu","show","add","edit","delete"]', 43),
  ('accounts',                 'Cuentas Contables',       'CONFIGURACIÓN', 'account_tree',      'Plan de cuentas contable',                      '["menu","show","add","edit"]', 44),
  ('settings',                 'Configuraciones',         'CONFIGURACIÓN', 'settings',          'Configuraciones generales del sistema',          '["menu","show","add","edit","delete"]', 45),
  ('setup_commissions',        'Config. Comisiones',      'COMISIONES',    'tune',              'Escalas y configuración de comisiones',          '["menu","show","add","edit","delete"]', 50),
  ('commissions',              'Árbol Comisiones',        'COMISIONES',    'account_tree',      'Jerarquía de comisiones',                        '["menu","show","add","edit","delete"]', 51),
  ('models_liquidation',       'Liquidación Modelos',     'REPORTES',      'assessment',        'Reporte de liquidación por modelo',              '["menu","show","generate_file"]', 60),
  ('studios_liquidation',      'Liquidación Estudios',    'REPORTES',      'summarize',         'Reporte de liquidación por estudio',             '["menu","show","generate_file"]', 61),
  ('massive_liquidation',      'Cargue Masivo',           'REPORTES',      'cloud_upload',      'Importación masiva de streams',                  '["menu","show"]', 62),
  ('paysheet',                 'Nómina',                  'NÓMINA',        'request_quote',     'Módulo de nómina y liquidación laboral',         '["menu","show","add","edit","delete","process"]', 70),
  ('notifications',            'Notificaciones',          'GENERAL',       'notifications',     'Centro de notificaciones',                       '["menu","show"]', 80),
  ('multimedia',               'Multimedia',              'GENERAL',       'perm_media',        'Gestión de archivos multimedia',                 '["add","delete"]', 81),
  ('myprofile',                'Mi Perfil',               'GENERAL',       'person',            'Edición del perfil propio',                      '["show","edit"]', 82)
ON CONFLICT (module_key) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- PASO 4: POBLAR PERMISOS POR PERFIL
-- Basado en sGate.js getGates()
-- Roles: 1=ROOT, 2=STUDIO, 3=GESTOR, 4=MODEL, 5=MODEL_SAT,
--        6=CREADOR_CUENTAS, 7=JEFE_MONITOR, 8=MONITOR,
--        9=JEFE_FOTOGRAFO, 10=FOTOGRAFO, 11=CONTABILIDAD,
--        12=AUDIOVISUALES, 13=ENTREVISTAS
-- ════════════════════════════════════════════════════════════

-- Función auxiliar para insertar permisos
DO $$
DECLARE
  m RECORD;
  -- Role IDs
  rt  INT := 1;
  ad  INT := 2;
  ag  INT := 3;
  cl  INT := 4;
  mdst INT := 5;
  cacc INT := 6;
  jmon INT := 7;
  mon  INT := 8;
  jfot INT := 9;
  fot  INT := 10;
  cont INT := 11;
  aud  INT := 12;
  entr INT := 13;
  roles INT[];
  r INT;
BEGIN
  -- ROOT (1) - Acceso completo a todo
  FOR m IN SELECT module_id FROM api_modules LOOP
    INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
    VALUES (rt, m.module_id, true, true, true, true, true)
    ON CONFLICT (prof_id, module_id) DO NOTHING;
  END LOOP;

  -- STUDIO (2) - ad
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'users'),
    (SELECT module_id FROM api_modules WHERE module_key = 'petitions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_rooms'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_shifts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_goals'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams_customers'),
    (SELECT module_id FROM api_modules WHERE module_key = 'monitors'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'payments'),
    (SELECT module_id FROM api_modules WHERE module_key = 'payments_files'),
    (SELECT module_id FROM api_modules WHERE module_key = 'banks_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'products'),
    (SELECT module_id FROM api_modules WHERE module_key = 'setup_commissions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'commissions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'multimedia')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (ad, r, true, true, true, true, true)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- CONTABILIDAD (11) - cont
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'users'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_goals'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams'),
    (SELECT module_id FROM api_modules WHERE module_key = 'monitors'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'transactions_types'),
    (SELECT module_id FROM api_modules WHERE module_key = 'payments_files'),
    (SELECT module_id FROM api_modules WHERE module_key = 'banks_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'exchanges_rates'),
    (SELECT module_id FROM api_modules WHERE module_key = 'categories'),
    (SELECT module_id FROM api_modules WHERE module_key = 'products'),
    (SELECT module_id FROM api_modules WHERE module_key = 'periods'),
    (SELECT module_id FROM api_modules WHERE module_key = 'locations'),
    (SELECT module_id FROM api_modules WHERE module_key = 'accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'setup_commissions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'commissions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'massive_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'login_history'),
    (SELECT module_id FROM api_modules WHERE module_key = 'multimedia')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (cont, r, true, true, true, true, true)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- MODEL (4) - cl (acceso limitado)
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'petitions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams_customers'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_liquidation')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (cl, r, true, true, false, false, false)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- MODEL SATELLITE (5) - mdst
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'petitions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams_customers'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_liquidation'),
    (SELECT module_id FROM api_modules WHERE module_key = 'myprofile')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (mdst, r, true, true, false, false, false)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- CREADOR CUENTAS (6) - cacc
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'users'),
    (SELECT module_id FROM api_modules WHERE module_key = 'petitions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'multimedia')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (cacc, r, true, true, true, true, true)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- JEFE MONITOR (7) - jmon
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'dashboard'),
    (SELECT module_id FROM api_modules WHERE module_key = 'users'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_accounts'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_goals'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_streams'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'transactions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'models_liquidation')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (jmon, r, true, true, true, false, false)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- MONITOR (8) - mon (mismos que jmon)
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (mon, r, true, true, true, false, false)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- ENTREVISTAS (13) - entr
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'users'),
    (SELECT module_id FROM api_modules WHERE module_key = 'petitions'),
    (SELECT module_id FROM api_modules WHERE module_key = 'studios_models')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (entr, r, true, true, true, true, true)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- GESTOR (3) - ag
  roles := ARRAY[
    (SELECT module_id FROM api_modules WHERE module_key = 'monitors')
  ];
  FOREACH r IN ARRAY roles LOOP
    IF r IS NOT NULL THEN
      INSERT INTO api_permissions (prof_id, module_id, can_menu, can_show, can_add, can_edit, can_delete)
      VALUES (ag, r, true, true, true, false, true)
      ON CONFLICT (prof_id, module_id) DO NOTHING;
    END IF;
  END LOOP;

END;
$$;

-- ════════════════════════════════════════════════════════════
-- PASO 5: VERIFICACIÓN
-- ════════════════════════════════════════════════════════════

SELECT
  am.module_key,
  am.module_name,
  am.module_group,
  COUNT(ap.perm_id) as roles_con_acceso
FROM api_modules am
LEFT JOIN api_permissions ap ON am.module_id = ap.module_id
GROUP BY am.module_id, am.module_key, am.module_name, am.module_group
ORDER BY am.sort_order;
