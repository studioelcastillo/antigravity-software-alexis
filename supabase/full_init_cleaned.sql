-- ==========================================================
-- EL CASTILLO GROUP SAS — Supabase Database Schema
-- Generado automáticamente desde los servicios del proyecto
-- URL: https://wukvaemawvjavwqocxyb.supabase.co
-- ==========================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- TABLAS DE CONFIGURACIÓN Y CATÁLOGOS
-- ==========================================================

-- Perfiles de usuario (roles)
CREATE TABLE IF NOT EXISTS profiles (
  prof_id SERIAL PRIMARY KEY,
  prof_name VARCHAR(100) NOT NULL UNIQUE,
  prof_description TEXT,
  prof_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO profiles (prof_id, prof_name, prof_description) VALUES
  (1, 'SUPER_ADMIN', 'Super Administrador'),
  (2, 'STUDIO_OWNER', 'Dueño de Estudio'),
  (3, 'ADMIN', 'Administrador'),
  (4, 'MODEL', 'Modelo'),
  (5, 'MODEL_SATELITE', 'Modelo Satélite'),
  (6, 'RRHH', 'Recursos Humanos'),
  (7, 'MONITOR', 'Monitor'),
  (8, 'COORDINATOR', 'Coordinador'),
  (11, 'ACCOUNTANT', 'Contador')
ON CONFLICT (prof_id) DO NOTHING;

-- Usuarios extendidos (complementa auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_identification VARCHAR(255),
  user_name VARCHAR(255) NOT NULL,
  user_surname VARCHAR(255),
  user_email VARCHAR(255),
  user_password VARCHAR(255),
  user_token_recovery_password TEXT,
  prof_id INT REFERENCES profiles(prof_id),
  user_sex VARCHAR(255),
  user_telephone VARCHAR(255),
  user_address VARCHAR(255),
  user_image VARCHAR(255),
  user_photo_url TEXT,
  user_active BOOLEAN DEFAULT true,
  user_last_login TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  remember_token VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  user_birthdate DATE,
  user_bank_entity VARCHAR(255),
  user_bank_account VARCHAR(255),
  user_bank_account_type VARCHAR(255),
  user_document_type VARCHAR(255),
  user_beneficiary_name VARCHAR(255),
  user_beneficiary_document VARCHAR(255),
  user_beneficiary_document_type VARCHAR(255),
  user_identification_type VARCHAR(255),
  user_name2 VARCHAR(255),
  user_surname2 VARCHAR(255),
  city_id INT,
  user_rh VARCHAR(20),
  user_model_category VARCHAR(40),
  user_personal_email VARCHAR(255),
  user_issued_in VARCHAR(255),
  std_id INT
);

-- Permisos adicionales por usuario (users_permissions2)
CREATE TABLE IF NOT EXISTS users_permissions2 (
  userperm_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  userperm_feature VARCHAR(255) NOT NULL,
  userperm_state VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas contables (accounts)
CREATE TABLE IF NOT EXISTS accounts (
  accacc_id SERIAL PRIMARY KEY,
  accacc_name VARCHAR(255) NOT NULL,
  accacc_number VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint circular después de crear la tabla studios
-- ALTER TABLE users ADD CONSTRAINT fk_user_std FOREIGN KEY (std_id) REFERENCES studios(std_id);

-- Configuración global
CREATE TABLE IF NOT EXISTS settings (
  set_id SERIAL PRIMARY KEY,
  set_key VARCHAR(100) NOT NULL UNIQUE,
  set_value TEXT,
  set_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ubicaciones (países, departamentos, ciudades)
CREATE TABLE IF NOT EXISTS locations (
  loc_id SERIAL PRIMARY KEY,
  loc_country VARCHAR(100),
  loc_department VARCHAR(100),
  loc_city VARCHAR(100),
  loc_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías
CREATE TABLE IF NOT EXISTS categories (
  cate_id SERIAL PRIMARY KEY,
  cate_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tipos de transacción
CREATE TABLE IF NOT EXISTS transactions_types (
  transtype_id SERIAL PRIMARY KEY,
  transtype_group VARCHAR(255),
  transtype_name VARCHAR(255) NOT NULL,
  transtype_behavior VARCHAR(255),
  transtype_rtefte BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  transtype_value DOUBLE PRECISION DEFAULT 0
);

-- Tasas de cambio
CREATE TABLE IF NOT EXISTS exchange_rates (
  exrate_id SERIAL PRIMARY KEY,
  exrate_date DATE NOT NULL,
  exrate_usd NUMERIC(14,4),
  exrate_eur NUMERIC(14,4),
  exrate_cop NUMERIC(14,4) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Periodos de liquidación
CREATE TABLE IF NOT EXISTS periods (
  period_id SERIAL PRIMARY KEY,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_closed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  period_state VARCHAR(20) NOT NULL,
  user_id INT,
  period_observation TEXT,
  liquidated_at TIMESTAMPTZ
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
  prod_id SERIAL PRIMARY KEY,
  cate_id INT NOT NULL REFERENCES categories(cate_id),
  prod_code VARCHAR(255) NOT NULL,
  prod_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  prod_purchase_price DOUBLE PRECISION,
  prod_wholesaler_price DOUBLE PRECISION,
  prod_sale_price DOUBLE PRECISION,
  prod_stock DOUBLE PRECISION,
  transtype_id INT REFERENCES transactions_types(transtype_id)
);

-- Terceros (Otros entes: proveedores, clientes externos, etc.)
CREATE TABLE IF NOT EXISTS terceros (
  ter_id SERIAL PRIMARY KEY,
  ter_name VARCHAR(255) NOT NULL,
  ter_identification VARCHAR(50),
  ter_type VARCHAR(50), -- PERSONA, EMPRESA
  ter_email VARCHAR(200),
  ter_phone VARCHAR(50),
  ter_address TEXT,
  ter_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ESTUDIOS (STUDIOS)
-- ==========================================================

CREATE TABLE IF NOT EXISTS studios (
  std_id SERIAL PRIMARY KEY,
  std_nit VARCHAR(255) NOT NULL,
  std_name VARCHAR(255) NOT NULL,
  std_shifts VARCHAR(255) NOT NULL,
  std_percent DOUBLE PRECISION,
  std_liquidation_interval VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  std_image VARCHAR(255),
  std_photo_url TEXT,
  std_bank_entity VARCHAR(255),
  std_bank_account VARCHAR(255),
  std_bank_account_type VARCHAR(255),
  std_ally BOOLEAN DEFAULT true NOT NULL,
  std_ally_master_pays BOOLEAN DEFAULT false NOT NULL,
  std_active BOOLEAN DEFAULT true NOT NULL,
  std_discountstudio_eur DOUBLE PRECISION DEFAULT 0 NOT NULL,
  std_discountstudio_usd DOUBLE PRECISION DEFAULT 0 NOT NULL,
  std_discountmodel_eur DOUBLE PRECISION DEFAULT 0 NOT NULL,
  std_discountmodel_usd DOUBLE PRECISION DEFAULT 0 NOT NULL,
  user_id_owner INT REFERENCES users(user_id) ON DELETE SET NULL,
  std_rtefte BOOLEAN DEFAULT false NOT NULL,
  city_id INT,
  std_stdacc BOOLEAN DEFAULT false NOT NULL,
  std_verification_digit CHAR(1),
  std_manager_name VARCHAR(255),
  std_manager_id VARCHAR(50),
  std_manager_phone VARCHAR(20),
  std_company_name VARCHAR(255),
  std_principal BOOLEAN DEFAULT false NOT NULL,
  payroll_liquidation_interval VARCHAR(255) DEFAULT 'MENSUAL' NOT NULL,
  payroll_auto_generate BOOLEAN DEFAULT true NOT NULL,
  std_address VARCHAR(255),
  std_dispenser BOOLEAN DEFAULT false NOT NULL,
  parent_std_id INT REFERENCES studios(std_id)
);

-- Ahora sí podemos agregar el FK a users
ALTER TABLE users ADD CONSTRAINT fk_user_std FOREIGN KEY (std_id) REFERENCES studios(std_id) ON DELETE SET NULL;

-- Cuentas del estudio (para pagos y liquidaciones)
CREATE TABLE IF NOT EXISTS studios_accounts (
  stdacc_id SERIAL PRIMARY KEY,
  std_id INT NOT NULL REFERENCES studios(std_id) ON DELETE CASCADE,
  stdacc_app VARCHAR(255) NOT NULL,
  stdacc_username VARCHAR(255) NOT NULL,
  stdacc_password VARCHAR(255),
  stdacc_apikey VARCHAR(255),
  stdacc_active BOOLEAN NOT NULL,
  stdacc_last_search_at TIMESTAMPTZ,
  stdacc_last_result_at TIMESTAMPTZ,
  stdacc_fail_message TEXT,
  stdacc_fail_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Cuartos del estudio
CREATE TABLE IF NOT EXISTS studios_rooms (
  stdroom_id SERIAL PRIMARY KEY,
  std_id INT NOT NULL REFERENCES studios(std_id) ON DELETE CASCADE,
  stdroom_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  stdroom_consecutive INT,
  stdroom_active BOOLEAN DEFAULT true NOT NULL,
  stdroom_occupied BOOLEAN DEFAULT false NOT NULL
);

-- Turnos del estudio
CREATE TABLE IF NOT EXISTS studios_shifts (
  stdshift_id SERIAL PRIMARY KEY,
  std_id INT NOT NULL REFERENCES studios(std_id) ON DELETE CASCADE,
  stdshift_name VARCHAR(255) NOT NULL,
  stdshift_begin_time TIME NOT NULL,
  stdshift_finish_time TIME NOT NULL,
  stdshift_capacity INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- MODELOS
-- ==========================================================

-- Relación modelo ↔ estudio
CREATE TABLE IF NOT EXISTS studios_models (
  stdmod_id SERIAL PRIMARY KEY,
  std_id INT NOT NULL REFERENCES studios(std_id) ON DELETE CASCADE,
  stdroom_id INT REFERENCES studios_rooms(stdroom_id),
  user_id_model INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  stdmod_start_at DATE NOT NULL,
  stdmod_finish_at DATE,
  stdmod_active BOOLEAN NOT NULL,
  stdmod_percent DOUBLE PRECISION,
  stdmod_rtefte BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  stdshift_id INT REFERENCES studios_shifts(stdshift_id),
  stdmod_commission_type VARCHAR(255),
  stdmod_goal DOUBLE PRECISION,
  modgoal_reach_goal BOOLEAN,
  stdmod_contract_type VARCHAR(255),
  stdmod_contract_number INT,
  city_id INT,
  stdmod_monthly_salary NUMERIC(12,2),
  stdmod_biweekly_salary NUMERIC(12,2),
  stdmod_daily_salary NUMERIC(12,2),
  stdmod_dotacion_amount NUMERIC(12,2) DEFAULT 100000 NOT NULL,
  stdmod_has_sena BOOLEAN DEFAULT false NOT NULL,
  stdmod_has_caja_compensacion BOOLEAN DEFAULT false NOT NULL,
  stdmod_has_icbf BOOLEAN DEFAULT false NOT NULL,
  stdmod_arl_risk_level VARCHAR(255) DEFAULT 'I' NOT NULL,
  stdmod_position VARCHAR(255),
  stdmod_area VARCHAR(255)
);

-- Cuentas de la modelo
CREATE TABLE IF NOT EXISTS models_accounts (
  modacc_id SERIAL PRIMARY KEY,
  stdmod_id INT NOT NULL REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  modacc_app VARCHAR(255) NOT NULL,
  modacc_username VARCHAR(255) NOT NULL,
  modacc_password VARCHAR(255) NOT NULL,
  modacc_state VARCHAR(255) NOT NULL,
  modacc_active BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  modacc_last_search_at TIMESTAMPTZ,
  modacc_last_result_at TIMESTAMPTZ,
  modacc_fail_message TEXT,
  modacc_fail_count INT DEFAULT 0,
  modacc_payment_username VARCHAR(255),
  modacc_mail VARCHAR(150),
  modacc_linkacc VARCHAR(255),
  last_activation_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  modacc_screen_name VARCHAR(255),
  modacc_earnings_rtefte NUMERIC(5,2) DEFAULT 4
);

-- Metas de la modelo
CREATE TABLE IF NOT EXISTS models_goals (
  modgoal_id SERIAL PRIMARY KEY,
  stdmod_id INT NOT NULL REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  modgoal_type VARCHAR(255),
  modgoal_amount DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  modgoal_percent DOUBLE PRECISION,
  modgoal_auto BOOLEAN,
  modgoal_date DATE,
  modgoal_reach_goal BOOLEAN DEFAULT false NOT NULL
);

-- Transacciones de la modelo
CREATE TABLE IF NOT EXISTS models_transactions (
  modtrans_id SERIAL PRIMARY KEY,
  stdmod_id INT NOT NULL REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  transtype_id INT NOT NULL REFERENCES transactions_types(transtype_id),
  modtrans_date DATE NOT NULL,
  modtrans_description VARCHAR(255),
  modtrans_amount DOUBLE PRECISION NOT NULL,
  prod_id INT REFERENCES products(prod_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  modtrans_quantity DOUBLE PRECISION,
  modtrans_rtefte BOOLEAN DEFAULT false NOT NULL
);

-- ==========================================================
-- STREAMS (SESIONES DE TRANSMISIÓN)
-- ==========================================================

-- Archivos de streams (comprobantes, reportes)
CREATE TABLE IF NOT EXISTS models_streams_files (
  modstrfile_id SERIAL PRIMARY KEY,
  modstrfile_description VARCHAR(255) NOT NULL,
  modstrfile_filename VARCHAR(255) NOT NULL,
  modstrfile_template VARCHAR(255) NOT NULL,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS models_streams (
  modstr_id SERIAL PRIMARY KEY,
  modacc_id INT NOT NULL REFERENCES models_accounts(modacc_id) ON DELETE CASCADE,
  user_id INT REFERENCES users(user_id),
  modstr_date DATE NOT NULL,
  modstr_period VARCHAR(255) NOT NULL,
  modstr_start_at TIMESTAMPTZ,
  modstr_finish_at TIMESTAMPTZ,
  modstr_price DOUBLE PRECISION,
  modstr_earnings_value DOUBLE PRECISION NOT NULL,
  modstr_earnings_trm DOUBLE PRECISION,
  modstr_earnings_percent DOUBLE PRECISION,
  modstr_earnings_tokens DOUBLE PRECISION,
  modstr_earnings_tokens_rate DOUBLE PRECISION,
  modstr_earnings_usd DOUBLE PRECISION,
  modstr_earnings_eur DOUBLE PRECISION,
  modstr_earnings_cop DOUBLE PRECISION,
  modstr_time DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  modstrfile_id INT REFERENCES models_streams_files(modstrfile_id),
  modstr_earnings_trm_studio DOUBLE PRECISION,
  modstr_earnings_percent_studio DOUBLE PRECISION,
  modstr_earnings_cop_studio DOUBLE PRECISION,
  modstr_source VARCHAR(255),
  period_id INT REFERENCES periods(period_id),
  stdmod_id INT REFERENCES studios_models(stdmod_id),
  std_id INT REFERENCES studios(std_id),
  stdacc_id INT REFERENCES studios_accounts(stdacc_id),
  modstr_addon VARCHAR(255),
  modstr_rtefte_model DOUBLE PRECISION,
  modstr_rtefte_studio DOUBLE PRECISION
);

-- Clientes del stream (fanáticos, miembros)
CREATE TABLE IF NOT EXISTS models_streams_customers (
  modstrcus_id SERIAL PRIMARY KEY,
  modstr_id INT NOT NULL REFERENCES models_streams(modstr_id) ON DELETE CASCADE,
  modstrcus_name VARCHAR(255) NOT NULL,
  modstrcus_account VARCHAR(255),
  modstrcus_website VARCHAR(255),
  modstrcus_product VARCHAR(255),
  modstrcus_price DOUBLE PRECISION,
  modstrcus_earnings DOUBLE PRECISION NOT NULL,
  modstrcus_received_at TIMESTAMPTZ NOT NULL,
  modstrcus_chat_duration DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- COMISIONES Y PAGOS
-- ==========================================================

-- Configuración de comisiones
CREATE TABLE IF NOT EXISTS commissions (
  com_id SERIAL PRIMARY KEY,
  std_id INT REFERENCES studios(std_id),
  user_id INT REFERENCES users(user_id),
  com_type VARCHAR(50),  -- STUDIO, MODEL, MONITOR
  com_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  com_fixed_amount NUMERIC(14,2) DEFAULT 0,
  com_currency VARCHAR(10) DEFAULT 'USD',
  com_active BOOLEAN DEFAULT true,
  period_id INT REFERENCES periods(period_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas bancarias (para recibir pagos)
CREATE TABLE IF NOT EXISTS bank_accounts (
  bacc_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  std_id INT REFERENCES studios(std_id),
  bacc_bank VARCHAR(200) NOT NULL,
  bacc_type VARCHAR(50),   -- AHORROS, CORRIENTE
  bacc_number VARCHAR(100) NOT NULL,
  bacc_owner_name VARCHAR(200),
  bacc_owner_id VARCHAR(50),
  bacc_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos (liquidaciones)
CREATE TABLE IF NOT EXISTS payments (
  pay_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  std_id INT REFERENCES studios(std_id),
  period_id INT REFERENCES periods(period_id),
  payfile_id INT,
  pay_amount NUMERIC(14,4) NOT NULL,
  pay_currency VARCHAR(10) DEFAULT 'COP',
  pay_status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, PAID, CANCELLED
  pay_date DATE,
  pay_notes TEXT,
  pay_exchange_rate NUMERIC(14,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos adjuntos a pagos (comprobantes)
CREATE TABLE IF NOT EXISTS payment_files (
  payf_id SERIAL PRIMARY KEY,
  pay_id INT NOT NULL REFERENCES payments(pay_id) ON DELETE CASCADE,
  payf_name VARCHAR(300),
  payf_url TEXT,
  payf_type VARCHAR(50),
  payf_total NUMERIC(14,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_payfile;

-- Planillas de pago (paysheets)
CREATE TABLE IF NOT EXISTS paysheets (
  paysh_id SERIAL PRIMARY KEY,
  std_id INT NOT NULL REFERENCES studios(std_id),
  period_id INT NOT NULL REFERENCES periods(period_id),
  paysh_total_usd NUMERIC(14,4) DEFAULT 0,
  paysh_total_eur NUMERIC(14,4) DEFAULT 0,
  paysh_total_cop NUMERIC(14,2) DEFAULT 0,
  paysh_status VARCHAR(50) DEFAULT 'DRAFT',
  paysh_notes TEXT,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- TRANSACCIONES CONTABLES
-- ==========================================================

CREATE TABLE IF NOT EXISTS transactions (
  trans_id SERIAL PRIMARY KEY,
  transtype_id INT NOT NULL REFERENCES transactions_types(transtype_id),
  user_id INT NOT NULL REFERENCES users(user_id),
  prod_id INT REFERENCES products(prod_id),
  trans_date DATE NOT NULL,
  trans_description VARCHAR(255),
  trans_amount DOUBLE PRECISION NOT NULL,
  trans_quantity DOUBLE PRECISION,
  trans_rtefte BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  stdmod_id INT REFERENCES studios_models(stdmod_id),
  trans_pendingbalance BOOLEAN DEFAULT false NOT NULL,
  trans_pendingbalance_unchanged_times SMALLINT,
  period_id INT REFERENCES periods(period_id),
  payroll_period_id BIGINT
);

-- ==========================================================
-- NOTIFICACIONES Y PETICIONES
-- ==========================================================

CREATE TABLE IF NOT EXISTS notifications (
  noti_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  user_id_to_notify INT REFERENCES users(user_id),
  noti_type VARCHAR(255),
  noti_title VARCHAR(255) NOT NULL,
  noti_data VARCHAR(255) NOT NULL,
  noti_menu VARCHAR(255) NOT NULL,
  noti_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS petitions (
  ptn_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  ptn_consecutive INT,
  ptn_type VARCHAR(255),
  ptn_nick VARCHAR(255),
  ptn_password VARCHAR(255),
  ptn_page VARCHAR(255),
  ptn_nick_final VARCHAR(255),
  ptn_password_final VARCHAR(255),
  ptn_payment_pseudonym VARCHAR(255),
  ptn_mail VARCHAR(255),
  ptn_state VARCHAR(255) DEFAULT 'PENDING',
  ptn_observation TEXT,
  ptn_linkacc VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- LOGS Y AUDITORÍA
-- ==========================================================

CREATE TABLE IF NOT EXISTS logs (
  log_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  log_action VARCHAR(200),
  log_entity VARCHAR(100),
  log_entity_id VARCHAR(100),
  log_old_data JSONB,
  log_new_data JSONB,
  log_ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
  lhist_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  lhist_ip VARCHAR(50),
  lhist_device TEXT,
  lhist_success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================

-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE models_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terceros ENABLE ROW LEVEL SECURITY; -- RLS para terceros
ALTER TABLE models_streams ENABLE ROW LEVEL SECURITY;

-- 1. Usuarios de perfil Alto (1, 11) ven TODO
CREATE POLICY "super_access" ON users FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND prof_id IN (1, 11))
);

-- 2. Dueños de Estudio (2) ven su estudio y sedes
CREATE POLICY "studio_owner_access" ON studios FOR ALL TO authenticated USING (
  user_id_owner IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
  OR parent_std_id IN (SELECT std_id FROM studios WHERE user_id_owner IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()))
);

-- 3. Admins (3) y personal de Staff ven data de su propio Estudio
CREATE POLICY "staff_studio_access" ON users FOR ALL TO authenticated USING (
  std_id IN (SELECT std_id FROM users WHERE auth_user_id = auth.uid())
);

-- 4. Usuarios individuales ven su propia fila siempre
CREATE POLICY "self_access" ON users FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid()
);

-- 5. Pagos protegidos por jerarquía
CREATE POLICY "hierarchical_payments" ON payments FOR ALL TO authenticated USING (
  user_id IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()) -- Propio
  OR std_id IN (SELECT std_id FROM users WHERE auth_user_id = auth.uid()) -- Misma sede
  OR std_id IN ( -- Sede descendiente si soy owner
      SELECT std_id FROM studios
      WHERE user_id_owner IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
      OR parent_std_id IN (SELECT std_id FROM studios WHERE user_id_owner IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()))
  )
);

-- Política: notificaciones propias
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (user_id_to_notify IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()));

-- ==========================================================
-- FUNCIONES DE BASE DE DATOS
-- ==========================================================

-- Función: calcular indicadores del Dashboard (SOPORTA JERARQUÍA DE SEDES)
CREATE OR REPLACE FUNCTION get_dashboard_indicators(
  p_per_id INT DEFAULT NULL,
  p_std_id INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_std_ids INT[];
BEGIN
  -- Si se pasa un p_std_id, incluimos sus sedes (hijos directos)
  IF p_std_id IS NOT NULL THEN
    SELECT ARRAY_AGG(std_id) INTO v_std_ids
    FROM studios
    WHERE std_id = p_std_id OR parent_std_id = p_std_id;
  END IF;

  SELECT jsonb_build_object(
    'sum_earnings_usd', COALESCE(SUM(ms.modstr_earnings_usd), 0),
    'sum_earnings_eur', COALESCE(SUM(ms.modstr_earnings_eur), 0),
    'sum_earnings_cop', COALESCE(SUM(ms.modstr_earnings_cop), 0),
    'sum_studios', (
        SELECT COUNT(*) FROM studios
        WHERE std_active = true
        AND (v_std_ids IS NULL OR std_id = ANY(v_std_ids))
    ),
    'sum_studio_models', (
        SELECT COUNT(*) FROM studios_models
        WHERE stdmod_active = true
        AND (v_std_ids IS NULL OR std_id = ANY(v_std_ids))
    ),
    'n_room', (
        SELECT COUNT(*) FROM studios_rooms
        WHERE stdroom_active = true
        AND (v_std_ids IS NULL OR std_id = ANY(v_std_ids))
    ),
    'room_busy', (
        SELECT COUNT(*) FROM studios_rooms
        WHERE stdroom_active = true AND stdroom_occupied = true
        AND (v_std_ids IS NULL OR std_id = ANY(v_std_ids))
    ),
    'top_models', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT u.user_name, u.user_surname, COALESCE(SUM(ms2.modstr_earnings_usd),0) AS total
        FROM users u
        JOIN studios_models sm ON sm.user_id_model = u.user_id
        JOIN models_accounts ma ON ma.stdmod_id = sm.stdmod_id
        JOIN models_streams ms2 ON ms2.modacc_id = ma.modacc_id
        WHERE (v_std_ids IS NULL OR ms2.std_id = ANY(v_std_ids))
        GROUP BY u.user_id, u.user_name, u.user_surname
        ORDER BY total DESC LIMIT 5
      ) t
    ),
    'next_happy_birthdays', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT u.user_name, u.user_surname, u.user_birthdate
        FROM users u
        WHERE u.user_birthdate IS NOT NULL
        -- Solo cumpleaños de gente en los estudios seleccionados
        AND (v_std_ids IS NULL OR u.std_id = ANY(v_std_ids))
        ORDER BY
          CASE WHEN TO_CHAR(u.user_birthdate, 'MMDD') >= TO_CHAR(NOW(), 'MMDD')
            THEN TO_CHAR(u.user_birthdate, 'MMDD')
            ELSE (TO_CHAR(u.user_birthdate, 'MMDD')::INT + 1366)::TEXT
          END
        LIMIT 5
      ) t
    ),
    'trm', (
      SELECT row_to_json(t) FROM (
        SELECT exrate_usd AS usd, exrate_eur AS eur, exrate_date::TEXT AS date
        FROM exchange_rates ORDER BY exrate_date DESC LIMIT 1
      ) t
    )
  ) INTO result
  FROM models_streams ms
  WHERE (p_per_id IS NULL OR ms.period_id = p_per_id)
  AND (v_std_ids IS NULL OR ms.std_id = ANY(v_std_ids));

  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: obtener tareas pendientes del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_tasks(p_user_id INT)
RETURNS JSONB AS $$
DECLARE
    v_prof_id INT;
    v_std_id INT;
    v_tasks JSONB := '[]'::JSONB;
BEGIN
    -- Obtenemos perfil y estudio del usuario que consulta (si aplica)
    SELECT prof_id, std_id INTO v_prof_id, v_std_id FROM users WHERE user_id = p_user_id;

    -- 1. Cuartos disponibles sin modelo (Para RRHH, Admin, Estudio, Coordinador)
    IF v_prof_id IN (1, 2, 3, 6, 8, 11) THEN
        v_tasks := v_tasks || COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'task_id', stdroom_id,
                'task_type', 'AVAILABLE_ROOM',
                'task_title', 'Cuarto disponible: ' || stdroom_name,
                'task_description', 'Este cuarto no tiene modelo asignada',
                'task_icon', 'meeting_room',
                'task_icon_color', 'warning',
                'task_key_id', std_id
            ))
            FROM studios_rooms
            WHERE stdroom_active = true AND stdroom_occupied = false
            AND (v_std_id IS NULL OR std_id = v_std_id)
        ), '[]'::JSONB);
    END IF;

    -- 2. Peticiones pendientes (Para Perfiles Administrativos)
    IF v_prof_id IN (1, 2, 3, 11) THEN
        v_tasks := v_tasks || COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'task_id', ptn_id,
                'task_type', 'PETITIONS',
                'task_title', 'Petición: ' || ptn_type,
                'task_description', ptn_observation,
                'task_icon', 'pending_actions',
                'task_icon_color', 'info',
                'task_key_id', ptn_id
            ))
            FROM petitions
            WHERE ptn_state = 'PENDING'
        ), '[]'::JSONB);
    END IF;

    -- 3. Cumpleaños de hoy (Para RRHH, Admin, Estudio)
    IF v_prof_id IN (1, 2, 3, 6, 11) THEN
        v_tasks := v_tasks || COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'task_id', user_id,
                'task_type', 'BIRTHDAYS',
                'task_title', 'Cumpleaños hoy: ' || user_name || ' ' || user_surname,
                'task_description', '¡Felicítalo en su día!',
                'task_icon', 'cake',
                'task_icon_color', 'pink',
                'task_key_id', user_id
            ))
            FROM users
            WHERE TO_CHAR(user_birthdate, 'MMDD') = TO_CHAR(NOW(), 'MMDD')
            AND user_active = true
            AND (v_std_id IS NULL OR std_id = v_std_id)
        ), '[]'::JSONB);
    END IF;

    -- 4. Datos bancarios faltantes (Para Admin, Estudio, RRHH)
    IF v_prof_id IN (1, 2, 3, 6, 11) THEN
        v_tasks := v_tasks || COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'task_id', user_id,
                'task_type', 'MISSING_BANK_INFO',
                'task_title', 'Datos bancarios faltantes: ' || user_name || ' ' || user_surname,
                'task_description', 'El usuario no tiene información bancaria registrada.',
                'task_icon', 'account_balance',
                'task_icon_color', 'negative',
                'task_key_id', user_id
            ))
            FROM users
            WHERE (user_bank_entity IS NULL OR user_bank_account IS NULL)
            AND user_active = true
            AND prof_id IN (4, 5) -- Solo para modelos
            AND (v_std_id IS NULL OR std_id = v_std_id)
        ), '[]'::JSONB);
    END IF;

    -- 5. Modelos activas sin contrato activo (Para RRHH, Admin, Estudio)
    IF v_prof_id IN (1, 2, 3, 6, 11) THEN
        v_tasks := v_tasks || COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'task_id', u.user_id,
                'task_type', 'CONTRACTS',
                'task_title', 'Contrato faltante/vencido: ' || u.user_name || ' ' || u.user_surname,
                'task_description', 'El modelo no tiene un contrato activo vinculado.',
                'task_icon', 'description',
                'task_icon_color', 'orange',
                'task_key_id', u.user_id
            ))
            FROM users u
            LEFT JOIN studios_models sm ON sm.user_id_model = u.user_id AND sm.stdmod_active = true
            WHERE u.prof_id IN (4, 5)
            AND u.user_active = true
            AND sm.stdmod_id IS NULL
            AND (v_std_id IS NULL OR u.std_id = v_std_id)
        ), '[]'::JSONB);
    END IF;

    RETURN v_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','settings','locations','categories','transactions_types',
    'periods','products','studios','studios_accounts','studios_rooms',
    'studios_shifts','studios_models','models_accounts','models_goals',
    'models_transactions','models_streams','models_streams_files','models_streams_customers',
    'commissions','bank_accounts','payments','paysheets','transactions',
    'petitions','notifications','logs'
  ]) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_%s_updated_at ON %I;
      CREATE TRIGGER set_%s_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;


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



-- Permitir a usuarios autenticados subir archivos
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- Permitir a usuarios autenticados actualizar sus archivos
  FOR UPDATE TO authenticated
  USING (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- Permitir lectura pública de archivos del bucket
  FOR SELECT TO public
  USING (bucket_id = 'el-castillo');

-- Permitir a autenticados eliminar archivos
  FOR DELETE TO authenticated
  USING (bucket_id = 'el-castillo' AND (owner = auth.uid() OR public.is_super_admin()));

-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN: Consultar que todas las tablas tienen RLS
-- ════════════════════════════════════════════════════════════

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


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


-- Payroll tables (Nomina)

CREATE TABLE IF NOT EXISTS payroll_periods (
  payroll_period_id SERIAL PRIMARY KEY,
  std_id INT REFERENCES studios(std_id) ON DELETE CASCADE,
  payroll_period_start_date DATE NOT NULL,
  payroll_period_end_date DATE NOT NULL,
  payroll_period_state VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
  payroll_period_interval VARCHAR(20) NOT NULL DEFAULT 'MENSUAL',
  payroll_period_smmlv NUMERIC(14,2) DEFAULT 1300000,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_concepts (
  payroll_concept_id SERIAL PRIMARY KEY,
  payroll_period_id INT REFERENCES payroll_periods(payroll_period_id) ON DELETE CASCADE,
  stdmod_id INT REFERENCES studios_models(stdmod_id) ON DELETE CASCADE,
  concept_type VARCHAR(50) NOT NULL,
  concept_description TEXT,
  concept_hours NUMERIC(8,2) DEFAULT 0,
  concept_hourly_rate NUMERIC(14,2) DEFAULT 0,
  concept_surcharge_percentage NUMERIC(8,2) DEFAULT 0,
  concept_total NUMERIC(14,2) DEFAULT 0,
  commission_periods JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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


WITH target(table_name) AS (
  VALUES
    ('users'),
    ('profiles'),
    ('studios'),
    ('studios_models'),
    ('studios_rooms'),
    ('petitions'),
    ('petition_states'),
    ('attendance_devices'),
    ('attendance_employees'),
    ('attendance_transactions'),
    ('attendance_daily'),
    ('settings'),
    ('transactions'),
    ('transactions_types'),
    ('content_platforms'),
    ('content_assets'),
    ('content_tasks'),
    ('chat_profiles'),
    ('chat_policies'),
    ('chat_conversations'),
    ('chat_conversation_members'),
    ('chat_messages'),
    ('chat_templates'),
    ('chat_broadcast_jobs'),
    ('chat_broadcast_lists'),
    ('chat_automations'),
    ('chat_automation_jobs')
),
table_info AS (
  SELECT t.table_name,
         c.oid IS NOT NULL AS exists,
         COALESCE(c.relrowsecurity, false) AS rls_enabled,
         COALESCE(p.policy_count, 0) AS policies
  FROM target t
  LEFT JOIN pg_class c ON c.relname = t.table_name
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS policy_count
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t.table_name
  ) p ON true
)
SELECT 'tables' AS section,
       jsonb_agg(to_jsonb(table_info)) AS data
FROM table_info

UNION ALL
SELECT 'settings_keys' AS section,
       jsonb_agg(jsonb_build_object('key', set_key, 'has_value', set_value IS NOT NULL)) AS data
FROM settings
WHERE set_key IN ('attendance_integration', 'attendance_valuation')

UNION ALL
SELECT 'buckets' AS section,
       jsonb_agg(jsonb_build_object('name', name, 'public', public)) AS data
FROM storage.buckets

UNION ALL
SELECT 'functions' AS section,
       jsonb_build_object(
         'get_dashboard_tasks', EXISTS(
           SELECT 1 FROM pg_proc pr
           JOIN pg_namespace ns ON ns.oid = pr.pronamespace
           WHERE pr.proname = 'get_dashboard_tasks' AND ns.nspname = 'public'
         ),
         'update_updated_at_column', EXISTS(
           SELECT 1 FROM pg_proc pr
           JOIN pg_namespace ns ON ns.oid = pr.pronamespace
           WHERE pr.proname = 'update_updated_at_column' AND ns.nspname = 'public'
         )
       ) AS data

UNION ALL
SELECT 'indexes' AS section,
       jsonb_agg(jsonb_build_object('index', indexname, 'table', tablename)) AS data
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'attendance_devices_sn_key',
    'attendance_employees_emp_code_key',
    'attendance_transactions_unique_key'
  )

UNION ALL
SELECT 'petitions_columns' AS section,
       jsonb_agg(jsonb_build_object('column', column_name, 'default', column_default)) AS data
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'petitions'
  AND column_name IN ('ptn_state', 'stdmod_id', 'ptn_observation')

UNION ALL
SELECT 'attendance_columns' AS section,
       jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name)) AS data
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('attendance_devices', 'attendance_employees', 'attendance_transactions', 'attendance_daily')
  AND column_name IN ('device_sn', 'emp_code', 'linked_user_id', 'punch_time', 'punch_state')

UNION ALL
SELECT 'storage_policies' AS section,
       jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname, 'cmd', cmd)) AS data
FROM pg_policies
WHERE schemaname = 'storage';


WITH target(table_name) AS (
  VALUES
    -- Nomina / Payroll
    ('payroll_periods'),
    ('payroll_concepts'),
    ('payroll_transactions'),
    ('paysheets'),

    -- Tienda / Inventario
    ('categories'),
    ('products'),
    ('product_variants'),
    ('product_images'),
    ('inventory_lots'),
    ('inventory_movements'),
    ('cost_centers'),
    ('store_orders'),
    ('store_order_items'),
    ('loan_requests'),
    ('installment_plans'),
    ('requisitions'),
    ('financial_rules'),

    -- Pagos / Finanzas
    ('payments'),
    ('payment_files'),
    ('bank_accounts'),
    ('accounts'),
    ('transactions'),
    ('transactions_types'),
    ('exchange_rates'),

    -- Monetizacion
    ('monetization_platforms'),
    ('monetization_beneficiaries'),
    ('monetization_liquidations'),
    ('monetization_liquidation_items'),
    ('monetization_liquidation_discounts'),
    ('monetization_liquidation_retentions'),

    -- Streams / Modelos
    ('models_streams'),
    ('models_accounts'),
    ('models_goals'),
    ('models_transactions'),
    ('models_streams_files'),
    ('models_streams_customers'),
    ('periods'),

    -- Room control / Inventario interno
    ('room_types'),
    ('room_assignments'),
    ('room_inventory'),
    ('room_tickets'),
    ('room_ticket_items'),
    ('warehouse_items'),
    ('warehouse_movements'),
    ('system_alerts'),

    -- Foto / Multimedia
    ('photo_requests'),
    ('photo_assets'),
    ('photo_calendar_events'),
    ('photo_ratings'),

    -- Contenido
    ('content_platforms'),
    ('content_assets'),
    ('content_tasks')
),
table_info AS (
  SELECT t.table_name,
         c.oid IS NOT NULL AS exists,
         COALESCE(c.relrowsecurity, false) AS rls_enabled,
         COALESCE(p.policy_count, 0) AS policies
  FROM target t
  LEFT JOIN pg_class c ON c.relname = t.table_name
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS policy_count
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t.table_name
  ) p ON true
)
SELECT table_name, exists, rls_enabled, policies
FROM table_info
ORDER BY table_name;


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



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_upload'
  ) THEN
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_update'
  ) THEN
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_read'
  ) THEN
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_delete'
  ) THEN
  END IF;
END $$;


-- Seed data for Attendance / ZKTeco (only if empty)

INSERT INTO attendance_devices (std_id, device_sn, device_alias, device_ip, device_area_name, device_status, last_sync_at)
SELECT * FROM (
  VALUES
    (NULL::INT, 'CIK7210001', 'Sede Principal Entrada', '192.168.1.101', 'Entrada', 'ONLINE', NOW() - INTERVAL '5 minutes'),
    (NULL::INT, 'CIK7210002', 'Sede Principal Salida', '192.168.1.102', 'Salida', 'OFFLINE', NOW() - INTERVAL '30 minutes')
) AS devices(std_id, device_sn, device_alias, device_ip, device_area_name, device_status, last_sync_at)
WHERE NOT EXISTS (SELECT 1 FROM attendance_devices LIMIT 1);

INSERT INTO attendance_employees (std_id, emp_code, first_name, last_name, department, linked_user_id, is_active)
SELECT * FROM (
  VALUES
    (NULL::INT, '2001', 'Maria', 'Lopez', 'Operaciones', NULL::INT, true),
    (NULL::INT, '2002', 'Andrea', 'Perez', 'Operaciones', NULL::INT, true),
    (NULL::INT, '2003', 'Luisa', 'Rojas', 'Administracion', NULL::INT, true),
    (NULL::INT, '2004', 'Camila', 'Diaz', 'Produccion', NULL::INT, true),
    (NULL::INT, '2005', 'Sofia', 'Torres', 'Produccion', NULL::INT, true)
) AS employees(std_id, emp_code, first_name, last_name, department, linked_user_id, is_active)
WHERE NOT EXISTS (SELECT 1 FROM attendance_employees LIMIT 1);

INSERT INTO attendance_transactions (std_id, emp_code, punch_time, punch_state, terminal_sn, verify_type)
SELECT * FROM (
  VALUES
    (NULL::INT, '2001', CURRENT_DATE + TIME '08:02', 'IN', 'CIK7210001', 1::INT),
    (NULL::INT, '2001', CURRENT_DATE + TIME '17:10', 'OUT', 'CIK7210001', 1::INT),
    (NULL::INT, '2002', CURRENT_DATE + TIME '08:20', 'IN', 'CIK7210001', 1::INT),
    (NULL::INT, '2002', CURRENT_DATE + TIME '16:55', 'OUT', 'CIK7210001', 1::INT),
    (NULL::INT, '2004', CURRENT_DATE + TIME '07:50', 'IN', 'CIK7210001', 1::INT),
    (NULL::INT, '2004', CURRENT_DATE + TIME '17:30', 'OUT', 'CIK7210001', 1::INT),
    (NULL::INT, '2005', CURRENT_DATE + TIME '08:00', 'IN', 'CIK7210001', 1::INT),
    (NULL::INT, '2005', CURRENT_DATE + TIME '16:30', 'OUT', 'CIK7210001', 1::INT)
) AS transactions(std_id, emp_code, punch_time, punch_state, terminal_sn, verify_type)
WHERE NOT EXISTS (SELECT 1 FROM attendance_transactions LIMIT 1);

INSERT INTO attendance_daily (
  user_id,
  full_name,
  role_name,
  att_date,
  shift_name,
  check_in,
  check_out,
  worked_minutes,
  expected_minutes,
  late_minutes,
  early_leave_minutes,
  overtime_minutes,
  debt_minutes,
  status
)
SELECT * FROM (
  VALUES
    (NULL::INT, 'Maria Lopez', 'MODELO', CURRENT_DATE, 'Turno Dia', CURRENT_DATE + TIME '08:02', CURRENT_DATE + TIME '17:10', 488::INT, 480::INT, 2::INT, 0::INT, 10::INT, 0::INT, 'PRESENT'),
    (NULL::INT, 'Andrea Perez', 'MODELO', CURRENT_DATE, 'Turno Dia', CURRENT_DATE + TIME '08:20', CURRENT_DATE + TIME '16:55', 455::INT, 480::INT, 20::INT, 5::INT, 0::INT, 25::INT, 'LATE'),
    (NULL::INT, 'Luisa Rojas', 'ADMIN', CURRENT_DATE, 'Turno Dia', NULL, NULL, 0::INT, 480::INT, 0::INT, 0::INT, 0::INT, 480::INT, 'ABSENT'),
    (NULL::INT, 'Camila Diaz', 'MODELO', CURRENT_DATE, 'Turno Dia', CURRENT_DATE + TIME '07:50', CURRENT_DATE + TIME '17:30', 520::INT, 480::INT, 0::INT, 0::INT, 40::INT, 0::INT, 'PRESENT'),
    (NULL::INT, 'Sofia Torres', 'MODELO', CURRENT_DATE, 'Turno Dia', CURRENT_DATE + TIME '08:00', CURRENT_DATE + TIME '16:30', 450::INT, 480::INT, 0::INT, 30::INT, 0::INT, 30::INT, 'PRESENT')
) AS daily(
  user_id,
  full_name,
  role_name,
  att_date,
  shift_name,
  check_in,
  check_out,
  worked_minutes,
  expected_minutes,
  late_minutes,
  early_leave_minutes,
  overtime_minutes,
  debt_minutes,
  status
)
WHERE NOT EXISTS (SELECT 1 FROM attendance_daily LIMIT 1);

INSERT INTO settings (set_key, set_value, set_description)
VALUES (
  'attendance_valuation',
  '{"minute_debt_price":200,"hour_debt_price":12000,"overtime_hour_price":15000,"currency":"COP"}',
  'Valores para valorizacion de asistencia'
)
ON CONFLICT (set_key) DO NOTHING;

INSERT INTO settings (set_key, set_value, set_description)
VALUES (
  'attendance_integration',
  '{"mode":"PUSH_ADMS","server_host":"livstre.com","server_port":4370,"comm_key":"0","device_id":"1","push_interval_seconds":120,"flush_interval_seconds":120,"max_batch_size":200,"dhcp_enabled":true,"ip_address":"192.60.5.120","subnet_mask":"255.255.255.0","gateway":"192.60.5.3","dns":"1.1.1.1","baud_rate":115200,"serial_port_mode":"IMPRIMIR"}',
  'Configuracion de integracion de asistencia (ADMS / BioTime)'
)
ON CONFLICT (set_key) DO NOTHING;


