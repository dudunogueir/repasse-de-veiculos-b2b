// src/App.jsx
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { motion, AnimatePresence } from 'framer-motion'; // Adicionado para animações nativas
import NotificationsPage from './pages/Notifications';
import DashboardPage from './pages/Dashboard';
import ProposalsPage from './pages/Proposals';
import AlertPreferencesPage from './pages/AlertPreferences';
import PlansPage from './pages/Plans';
import AdvertisePage from './pages/Advertise';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Componente para criar o efeito de "Slide" nativo do iOS
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }} // Começa levemente deslocado à direita
    animate={{ opacity: 1, x: 0 }}  // Desliza para o centro
    exit={{ opacity: 0, x: -10 }}   // Sai para a esquerda
    transition={{ duration: 0.2, ease: "easeInOut" }} // Transição rápida e fluida
  >
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation(); // Necessário para rastrear a troca de páginas

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence mode="wait"> {/* Gerencia a entrada e saída das telas */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <PageTransition><MainPage /></PageTransition>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <PageTransition><Page /></PageTransition>
              </LayoutWrapper>
            }
          />
        ))}

        <Route 
          path="/Advertise/:id" 
          element={
            <LayoutWrapper currentPageName="Advertise">
              <PageTransition><Pages.Advertise /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/Notifications" 
          element={
            <LayoutWrapper currentPageName="Notifications">
              <PageTransition><NotificationsPage /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/Dashboard" 
          element={
            <LayoutWrapper currentPageName="Dashboard">
              <PageTransition><DashboardPage /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/Proposals" 
          element={
            <LayoutWrapper currentPageName="Proposals">
              <PageTransition><ProposalsPage /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/AlertPreferences" 
          element={
            <LayoutWrapper currentPageName="AlertPreferences">
              <PageTransition><AlertPreferencesPage /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/Plans" 
          element={
            <LayoutWrapper currentPageName="Plans">
              <PageTransition><PlansPage /></PageTransition>
            </LayoutWrapper>
          } 
        />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;