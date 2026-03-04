
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import UsersPage from './components/UsersPage';
import ResourcePage from './components/admin/ResourcePage';
import ModelPayrollPage from './components/ModelPayrollPage';
import StudioLiquidationPage from './components/StudioLiquidationPage';
import Users2Page from './components/Users2Page';
import UserPermissions2Page from './components/UserPermissions2Page';
import RecoveryPasswordPage from './components/RecoveryPasswordPage';
import ChangePasswordPage from './components/ChangePasswordPage';
import AuthCallbackPage from './components/AuthCallbackPage';
import MyProfilePage from './components/MyProfilePage';
import StudiosPage from './components/StudiosPage';
import Onboarding from './components/Onboarding';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';
import ChatPolicyAdmin from './components/ChatPolicyAdmin';
import ChatWidget from './components/ChatWidget';
import RoomControlPage from './components/RoomControlPage';
import StorefrontPage from './components/StorefrontPage';
import InventoryPage from './components/InventoryPage';
import PhotographyPage from './components/PhotographyPage';
import CategoriesPage from './components/CategoriesPage';
import TransactionTypesPage from './components/TransactionTypesPage';
import ExchangeRatesPage from './components/ExchangeRatesPage';
import UtilityDashboard from './components/UtilityDashboard'; // NUEVO
import MembershipPage from './components/MembershipPage';
import WalletPage from './components/WalletPage';
import MasterSettingsPage from './components/MasterSettingsPage';
import BirthdaysPage from './components/BirthdaysPage';
import AttendancePage from './components/AttendancePage';
import MonetizationPage from './components/MonetizationPage'; // NUEVO
import ContentSalesPage from './components/ContentSalesPage'; // NUEVO
import RemoteDesktopPage from './components/RemoteDesktopPage'; // NUEVO
import ShiftAssignmentPage from './components/ShiftAssignmentPage'; // NUEVO
import SubscriptionManagementPage from './components/SubscriptionManagementPage'; // NUEVO
import RequestsPage from './components/RequestsPage'; // UNIFICADO
import LocationsPage from './components/LocationsPage'; // UNIFICADO
import AdminDataPage from './components/AdminDataPage'; // UNIFICADO
import SubscriptionLockScreen from './components/SubscriptionLockScreen';
import LogoutConfirmDialog from './components/LogoutConfirmDialog';
import AuthService from './AuthService';
import { Lock, AlertTriangle, X, Crown } from 'lucide-react';
import { getStoredUser } from './session';
import BillingService from './BillingService';

const PAGE_TO_PATH: Record<string, string> = {
  inicio: '/dashboard',
  myprofile: '/myprofile',
  change_password: '/change-password',
  recovery_password: '/recovery-password',
  auth_callback: '/auth/callback',
  monetizacion: '/monetizacion',
  venta_contenido: '/venta_contenido',
  asistencia: '/asistencia',
  cumpleanos: '/cumpleanos',
  membresia: '/membresia',
  billetera: '/billetera',
  usuarios: '/users',
  solicitudes: '/petitions',
  localizaciones: '/locations',
  admin_datos: '/admin_datos',
  chat: '/chat',
  chat_admin: '/chat_admin',
  control_cuartos: '/control_cuartos',
  tienda: '/tienda',
  inventario: '/inventario',
  fotografia: '/fotografia',
  utilidades: '/utilidades',
  liquidacion_modelos: '/liquidacion_modelos',
  studios_liquidation: '/studios_liquidation',
  estudios: '/studios',
  config_global: '/config_global',
  control_licencias: '/control_licencias',
  escritorio_remoto: '/escritorio_remoto',
  asignacion_turnos: '/asignacion_turnos',
  categories: '/categories',
  transactions_types: '/transactions_types',
  exchanges_rates: '/exchanges_rates',
  accounts: '/accounts',
  banks_accounts: '/banks_accounts',
  products: '/products',
  transactions: '/transactions',
  payments: '/payments',
  payments_files: '/payments_files',
  periods: '/periods',
  notifications: '/notifications',
  logs: '/logs',
  login_history: '/login_history',
  studios_rooms: '/studios_rooms',
  studios_shifts: '/studios_shifts',
  studios_accounts: '/studios_accounts',
  studios_models: '/studios_models',
  models_accounts: '/models_accounts',
  models_goals: '/models_goals',
  models_streams: '/models_streams',
  models_streams_customers: '/models_streams_customers',
  models_streams_files: '/models_streams_files',
  models_transactions: '/models_transactions',
  monitors: '/monitors',
  commissions: '/commissions',
  setup_commissions: '/setup_commissions',
  api_modules: '/api_modules',
  api_permissions: '/api_permissions',
  api_user_overrides: '/api_user_overrides',
  users2: '/users2',
  users_permissions2: '/users_permissions2',
  paysheet: '/paysheet',
  massive_liquidation: '/massive_liquidation',
};

const PATH_ALIASES: Record<string, string> = {
  '/': '/dashboard',
  '/home': '/dashboard',
  '/models_liquidation': '/liquidacion_modelos',
};

const LEGACY_ROUTE_LABELS: Record<string, string> = {};

const normalizePath = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  const aliasEntry = Object.entries(PATH_ALIASES).find(([prefix]) => {
    return trimmed === prefix || trimmed.startsWith(`${prefix}/`);
  });

  if (!aliasEntry) return trimmed;

  const [prefix, target] = aliasEntry;
  return trimmed.replace(prefix, target);
};

const getPageFromPath = (pathname: string) => {
  const normalized = normalizePath(pathname);
  const match = Object.entries(PAGE_TO_PATH).find(([, path]) => {
    return normalized === path || normalized.startsWith(`${path}/`);
  });
  return match ? match[0] : 'inicio';
};

const getLegacyLabel = (pathname: string) => {
  const normalized = normalizePath(pathname);
  const match = Object.entries(LEGACY_ROUTE_LABELS).find(([prefix]) => {
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
  return match ? match[1] : null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!getStoredUser();
  });

  const [isOnboarded, setIsOnboarded] = useState(() => {
     return !!getStoredUser();
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ACTIVE' | 'EXPIRED'>('ACTIVE');

  const [daysUntilDue, setDaysUntilDue] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // State for navigating to specific user profile from header/alerts
  const [targetUserIdForProfile, setTargetUserIdForProfile] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = getPageFromPath(location.pathname);
  const legacyLabel = getLegacyLabel(location.pathname);
  const isPublicRoute = ['/login', '/recovery-password', '/auth/callback'].some((path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const redirectToLogin = () => {
    try {
      const target = window.top ?? window;
      target.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const loadSubscription = async () => {
      const sub = await BillingService.getSubscription();
      setSubscriptionStatus(sub.status || 'ACTIVE');
      setDaysUntilDue(sub.days_until_due || 0);
      setShowWarningModal((sub.days_until_due || 0) <= 5 && (sub.days_until_due || 0) > 0);
    };
    loadSubscription();
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !isPublicRoute) {
      navigate('/login', { replace: true });
    }
    if (isAuthenticated && location.pathname.startsWith('/login')) {
      navigate(PAGE_TO_PATH.inicio, { replace: true });
    }
    const aliasTarget = PATH_ALIASES[location.pathname as keyof typeof PATH_ALIASES];
    if (aliasTarget && location.pathname !== aliasTarget) {
      navigate(aliasTarget, { replace: true });
    }
  }, [isAuthenticated, isPublicRoute, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname.startsWith('/logout') && !isLoggingOut) {
      handleLogoutConfirm();
    }
  }, [isLoggingOut, location.pathname]);

  const handleNavigate = (id: string) => {
    const target = PAGE_TO_PATH[id] || PAGE_TO_PATH.inicio;
    navigate(target);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleLogin = () => {
      setIsAuthenticated(true);
      setIsOnboarded(true);
      navigate(PAGE_TO_PATH.inicio, { replace: true });
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Error during API logout:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('dashboard_user');
      localStorage.removeItem('token');
      localStorage.removeItem('dashboardMode');
      redirectToLogin();
    }
  };

  const handleCompleteOnboarding = (data: any) => {
    setIsOnboarded(true);
  };

  // Handler for clicking a user in the birthday dropdown
  const handleUserSelect = (userId: number) => {
    setTargetUserIdForProfile(userId);
    handleNavigate('usuarios');
  };

  const renderLegacyPlaceholder = (title: string) => (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-slate-900">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
            !
          </div>
          <div>
            <p className="text-lg font-black">{title}</p>
            <p className="text-sm font-medium text-slate-500">
              Esta seccion esta en proceso de migracion a React. Estamos unificando toda la
              funcionalidad en un solo proyecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (subscriptionStatus === 'EXPIRED') {
       if (currentPage === 'membresia') {
           return <MembershipPage />;
       }
       return <SubscriptionLockScreen onNavigateToPayment={() => handleNavigate('membresia')} isExpired={true} />;
    }

    if (legacyLabel) {
      return renderLegacyPlaceholder(legacyLabel);
    }

    switch(currentPage) {
      case 'inicio': return <Dashboard />;
      case 'monetizacion': return <MonetizationPage />;
      case 'venta_contenido': return <ContentSalesPage />;
      case 'escritorio_remoto': return <RemoteDesktopPage />; // NUEVO
      case 'asignacion_turnos': return <ShiftAssignmentPage />; // NUEVO
      case 'asistencia': return <AttendancePage />;
      case 'cumpleanos': return <BirthdaysPage />;
      case 'membresia': return <MembershipPage />;
      case 'billetera': return <WalletPage />;
      case 'usuarios': return (
        <UsersPage
          targetUserId={targetUserIdForProfile}
          onClearTarget={() => setTargetUserIdForProfile(null)}
        />
      );
      case 'solicitudes': return <RequestsPage onNavigate={handleNavigate} />;
      case 'localizaciones': return <LocationsPage />;
      case 'admin_datos': return <AdminDataPage />;
      case 'chat': return <ChatPage />;
      case 'chat_admin': return <ChatPolicyAdmin />;
      case 'control_cuartos': return <RoomControlPage />;
      case 'tienda': return <StorefrontPage />;
      case 'inventario': return <InventoryPage />;
      case 'fotografia': return <PhotographyPage />;
      case 'utilidades': return <UtilityDashboard />; // NUEVO
      case 'liquidacion_modelos': return <ModelPayrollPage />;
      case 'studios_liquidation': return <StudioLiquidationPage />;
      case 'estudios': return <StudiosPage />;
      case 'config_global': return <MasterSettingsPage />;
      case 'control_licencias': return <SubscriptionManagementPage />;
      case 'myprofile': return <MyProfilePage />;
      case 'change_password': return <ChangePasswordPage />;
      case 'categories': return <CategoriesPage />;
      case 'transactions_types': return <TransactionTypesPage />;
      case 'exchanges_rates': return <ExchangeRatesPage />;
      case 'accounts': return <ResourcePage resourceKey="accounts" />;
      case 'banks_accounts': return <ResourcePage resourceKey="banks_accounts" />;
      case 'products': return <ResourcePage resourceKey="products" />;
      case 'transactions': return <ResourcePage resourceKey="transactions" />;
      case 'payments': return <ResourcePage resourceKey="payments" />;
      case 'payments_files': return <ResourcePage resourceKey="payments_files" />;
      case 'periods': return <ResourcePage resourceKey="periods" />;
      case 'notifications': return <ResourcePage resourceKey="notifications" />;
      case 'logs': return <ResourcePage resourceKey="logs" />;
      case 'login_history': return <ResourcePage resourceKey="login_history" />;
      case 'studios_rooms': return <ResourcePage resourceKey="studios_rooms" />;
      case 'studios_shifts': return <ResourcePage resourceKey="studios_shifts" />;
      case 'studios_accounts': return <ResourcePage resourceKey="studios_accounts" />;
      case 'studios_models': return <ResourcePage resourceKey="studios_models" />;
      case 'models_accounts': return <ResourcePage resourceKey="models_accounts" />;
      case 'models_goals': return <ResourcePage resourceKey="models_goals" />;
      case 'models_streams': return <ResourcePage resourceKey="models_streams" />;
      case 'models_streams_customers': return <ResourcePage resourceKey="models_streams_customers" />;
      case 'models_streams_files': return <ResourcePage resourceKey="models_streams_files" />;
      case 'models_transactions': return <ResourcePage resourceKey="models_transactions" />;
      case 'monitors': return <ResourcePage resourceKey="monitors" />;
      case 'commissions': return <ResourcePage resourceKey="commissions" />;
      case 'setup_commissions': return <ResourcePage resourceKey="setup_commissions" />;
      case 'api_modules': return <ResourcePage resourceKey="api_modules" />;
      case 'api_permissions': return <ResourcePage resourceKey="api_permissions" />;
      case 'api_user_overrides': return <ResourcePage resourceKey="api_user_overrides" />;
      case 'users2': return <Users2Page />;
      case 'users_permissions2': return <UserPermissions2Page />;
      case 'paysheet': return <ResourcePage resourceKey="paysheet" />;
      case 'massive_liquidation': return <ResourcePage resourceKey="massive_liquidation" />;
      default: return <Dashboard />;
    }
  };

  if (location.pathname.startsWith('/auth/callback')) {
    return <AuthCallbackPage />;
  }

  if (location.pathname.startsWith('/recovery-password')) {
    return <RecoveryPasswordPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!isOnboarded) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {subscriptionStatus === 'ACTIVE' && (
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          toggleCollapse={toggleCollapse}
          onNavigate={handleNavigate}
          activePage={currentPage}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {subscriptionStatus === 'ACTIVE' ? (
          <Header
            toggleSidebar={toggleSidebar}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
            onLogoutClick={() => setIsLogoutDialogOpen(true)}
            onUserSelect={handleUserSelect}
            onNavigate={handleNavigate}
          />
        ) : (
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Crown size={16} className="text-amber-400" />
                 </div>
                 <span className="font-black text-slate-900 tracking-tight">El Castillo</span>
             </div>
             <button onClick={() => setIsLogoutDialogOpen(true)} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                 Cerrar Sesión
             </button>
          </div>
        )}

        {/* Subscription Warning Modal */}
        {subscriptionStatus === 'ACTIVE' && daysUntilDue <= 5 && daysUntilDue > 0 && showWarningModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-amber-500 p-6 text-center relative">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="absolute top-4 right-4 text-amber-900/50 hover:text-amber-900 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <AlertTriangle size={32} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">¡Atención!</h2>
                <p className="text-amber-900 font-medium mt-2">Tu licencia está por vencer.</p>
              </div>
              <div className="p-8 text-center space-y-6">
                <p className="text-slate-600">
                  Te quedan <strong className="text-slate-900 font-black text-lg">{daysUntilDue} días</strong> de acceso a la plataforma.
                  Para evitar interrupciones en tu servicio y el de tus sedes aliadas, por favor renueva tu membresía.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWarningModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                  >
                    Recordarme luego
                  </button>
                  <button
                    onClick={() => {
                      setShowWarningModal(false);
                      handleNavigate('membresia');
                    }}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl transition-colors shadow-lg shadow-amber-500/20 text-sm"
                  >
                    Renovar Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
            {renderContent()}

            {subscriptionStatus === 'ACTIVE' && (
              <footer className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <p>&copy; 2025 El Castillo Group SAS. Todos los derechos reservados.</p>
                  <button
                    onClick={() => setIsLogoutDialogOpen(true)}
                    className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                  >
                    Cerrar Sesión Segura
                  </button>
              </footer>
            )}
        </div>
      </div>

      {subscriptionStatus === 'ACTIVE' && <ChatWidget />}

      <LogoutConfirmDialog
        open={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />
    </div>
  );
}

export default App;
