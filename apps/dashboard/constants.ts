
import {
  Home, Users, FileText, MapPin, DollarSign, CreditCard,
  ArrowLeftRight, ShoppingBag, LayoutGrid, Monitor, Video,
  Settings, PieChart, Calendar, Award, Activity, Bell, List, UserPlus,
  FileBarChart, Briefcase, MessageSquare, ShieldCheck, Megaphone,
  FileJson, Zap, BookOpen, Key, ShoppingCart, Archive, Package, Camera, Image,
  CreditCard as PaymentIcon, Wallet, Cake, Clock, Share2, Banknote,
  History, UploadCloud, Database
} from 'lucide-react';
import { SidebarSection, PricingTier, User, Room } from './types';

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "General",
    items: [
      { id: 'inicio', icon: Home, label: "Inicio" },
      { id: 'monetizacion', icon: Banknote, label: "Monetización" },
      { id: 'venta_contenido', icon: Share2, label: "Venta de Contenido" },
      { id: 'asistencia', icon: Clock, label: "Asistencia (ZK)" },
      { id: 'cumpleanos', icon: Cake, label: "Cumpleaños" },
      { id: 'membresia', icon: PaymentIcon, label: "Pagos / Membresía" },
      { id: 'billetera', icon: Wallet, label: "Billetera" },
      { id: 'usuarios', icon: Users, label: "Usuarios" },
      { id: 'solicitudes', icon: FileText, label: "Solicitudes" },
      { id: 'localizaciones', icon: MapPin, label: "Localizaciones" },
    ]
  },
  {
    title: "Operativo",
    items: [
      { id: 'fotografia', icon: Camera, label: "Fotografía" },
      { id: 'control_cuartos', icon: Key, label: "Control de Cuartos" },
      { id: 'escritorio_remoto', icon: Monitor, label: "Acceso Remoto" },
      { id: 'asignacion_turnos', icon: Calendar, label: "Asignación de Modelos y Turnos" },
      { id: 'tienda', icon: ShoppingCart, label: "Tienda" },
      { id: 'inventario', icon: Archive, label: "Inventario y Compras" },
      { id: 'chat', icon: MessageSquare, label: "Chat Interno" },
    ]
  },
  {
    title: "Administración",
    items: [
      { id: 'utilidades', icon: PieChart, label: "Control de Utilidades" },
      { id: 'estudios', icon: Monitor, label: "Estudios" },
      { id: 'chat_admin', icon: ShieldCheck, label: "Políticas de Chat" },
      { id: 'config_global', icon: Settings, label: "Configuración Global" },
      { id: 'control_licencias', icon: Award, label: "Control de Licencias" },
      { id: 'admin_datos', icon: Database, label: "Admin Datos" }
    ]
  },
  {
    title: "Finanzas",
    items: [
      { id: 'accounts', icon: Briefcase, label: "Cuentas Contables" },
      { id: 'banks_accounts', icon: CreditCard, label: "Cuentas Bancarias" },
      { id: 'products', icon: ShoppingBag, label: "Productos" },
      { id: 'transactions', icon: ArrowLeftRight, label: "Transacciones" },
      { id: 'payments', icon: PaymentIcon, label: "Pagos" },
      { id: 'payments_files', icon: Archive, label: "Archivos de Pago" },
      { id: 'periods', icon: Calendar, label: "Periodos" },
      { id: 'paysheet', icon: FileBarChart, label: "Nomina" },
      { id: 'categories', icon: List, label: "Categorias" },
      { id: 'transactions_types', icon: ArrowLeftRight, label: "Tipos de Transferencia" },
      { id: 'exchanges_rates', icon: ArrowLeftRight, label: "Tasas de Cambio" },
    ]
  },
  {
    title: "Estudios",
    items: [
      { id: 'studios_rooms', icon: Key, label: "Cuartos" },
      { id: 'studios_shifts', icon: Clock, label: "Turnos" },
      { id: 'studios_accounts', icon: CreditCard, label: "Cuentas Estudio" },
      { id: 'studios_models', icon: Users, label: "Contratos" },
    ]
  },
  {
    title: "Modelos",
    items: [
      { id: 'models_accounts', icon: UserPlus, label: "Cuentas Modelos" },
      { id: 'models_goals', icon: Award, label: "Metas" },
      { id: 'models_streams', icon: Video, label: "Streams" },
      { id: 'models_streams_customers', icon: Users, label: "Clientes Stream" },
      { id: 'models_streams_files', icon: FileText, label: "Archivos Stream" },
      { id: 'models_transactions', icon: DollarSign, label: "Transacciones" },
    ]
  },
  {
    title: "Sistema",
    items: [
      { id: 'notifications', icon: Bell, label: "Notificaciones" },
      { id: 'logs', icon: FileText, label: "Logs" },
      { id: 'login_history', icon: History, label: "Historial Sesiones" },
      { id: 'api_modules', icon: FileJson, label: "Modulos API" },
      { id: 'api_permissions', icon: ShieldCheck, label: "Permisos API" },
      { id: 'api_user_overrides', icon: ShieldCheck, label: "Overrides API" },
      { id: 'setup_commissions', icon: Settings, label: "Config Comisiones" },
      { id: 'commissions', icon: DollarSign, label: "Comisiones" },
      { id: 'monitors', icon: Users, label: "Monitores" },
      { id: 'massive_liquidation', icon: UploadCloud, label: "Liquidacion Masiva" },
      { id: 'users2', icon: Users, label: "Usuarios (Legacy)" },
      { id: 'users_permissions2', icon: ShieldCheck, label: "Permisos Usuarios" },
    ]
  },
  {
    title: "Reportes",
    items: [
      { id: 'liquidacion_modelos', icon: FileBarChart, label: "Liquidación Modelos" },
      { id: 'studios_liquidation', icon: FileBarChart, label: "Liquidación Estudios" },
    ]
  }
];

// --- MOCK DATA ---

export const MOCK_USERS: User[] = [
    {
        user_id: 3990,
        user_name: 'Jennifer',
        user_surname: 'Zuluaga',
        user_email: 'jennifer@example.com',
        user_identification: '12345678',
        user_active: 1,
        user_age: 25,
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        profile: { prof_id: 3, prof_name: 'MODELO' }
    },
    {
        user_id: 3988,
        user_name: 'Sofia',
        user_surname: 'Mosquera',
        user_email: 'sofia@example.com',
        user_identification: '87654321',
        user_active: 1,
        profile: { prof_id: 2, prof_name: 'MONITOR' }
    },
    {
        user_id: 3989,
        user_name: 'Ana',
        user_surname: 'Acero',
        user_email: 'ana@example.com',
        user_identification: '11223344',
        user_active: 1,
        profile: { prof_id: 3, prof_name: 'MODELO' }
    },
    {
        user_id: 1,
        user_name: 'Admin',
        user_surname: 'Castillo',
        user_email: 'admin@elcastillo.app',
        user_identification: '1144184353',
        user_active: 1,
        profile: { prof_id: 1, prof_name: 'ADMINISTRADOR' }
    }
];

// MOCK_REQUESTS removed - using PetitionService and PhotoService

export const MOCK_LOCATIONS = [
    { id: 'col', name: 'COLOMBIA', states: [
        { id: 'ant', name: 'ANTIOQUIA', cities: [{ id: 'med', name: 'MEDELLÍN' }] },
        { id: 'vac', name: 'VALLE DEL CAUCA', cities: [{ id: 'cal', name: 'CALI' }] }
    ]}
];

export const MOCK_PAYROLL = [
    { id: '1', modelName: 'Jennifer Zuluaga', studio: 'Red Dreams', usd: 1200, eur: 0, copConversion: 4800000, discounts: 200000, netTotal: 4600000, retefuente: 0, totalPayable: 4600000, status: 'PENDIENTE' },
    { id: '2', modelName: 'Ana Acero', studio: 'Red Dreams', usd: 800, eur: 0, copConversion: 3200000, discounts: 50000, netTotal: 3150000, retefuente: 0, totalPayable: 3150000, status: 'PAGADO' }
];

export const MOCK_ROOMS: Room[] = [
    { id: 'r1', code: 'H-101', type: 'Standard', status: 'ACTIVE', inventory: [], incidents_count: 0 },
    { id: 'r2', code: 'H-102', type: 'Premium', status: 'ACTIVE', inventory: [], incidents_count: 0 }
];

export const MOCK_CHAT_ROLES = [
    { id: 1, name: 'ADMINISTRADOR' },
    { id: 2, name: 'MONITOR' },
    { id: 3, name: 'MODELO' },
    { id: 5, name: 'SOPORTE' }
];

export const SUBSCRIPTION_TIERS: PricingTier[] = [
    { id: 't1', name: '1 a 15 Licencias', min: 1, max: 15, monthly_price: 45, annual_price: 490 },
    { id: 't2', name: '16 a 30 Licencias', min: 16, max: 30, monthly_price: 80, annual_price: 900 },
    { id: 't3', name: '31 a 50 Licencias', min: 31, max: 50, monthly_price: 100, annual_price: 1100 },
    { id: 't4', name: '51 a 100 Licencias', min: 51, max: 100, monthly_price: 120, annual_price: 1390 },
    { id: 't5', name: '101 a 150 Licencias', min: 101, max: 150, monthly_price: 150, annual_price: 1700 },
    { id: 't6', name: '151 a 200 Licencias', min: 151, max: 200, monthly_price: 200, annual_price: 2200 },
    { id: 't7', name: '201 a 250 Licencias', min: 201, max: 250, monthly_price: 250, annual_price: 2800 },
    { id: 't8', name: '251 a 300 Licencias', min: 251, max: 300, monthly_price: 290, annual_price: 3300 },
    { id: 't9', name: 'Más de 300 Licencias', min: 301, max: 9999, monthly_price: 0, annual_price: 0 } // Custom pricing
];
