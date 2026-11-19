import { AppProvider } from './context/AppContext.jsx';
import { MonitorProvider } from './context/MonitorContext.jsx';
import { RouterProvider, useRouter } from './lib/router.jsx';
import AppShell from './components/layout/AppShell.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MonitorPage from './pages/MonitorPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import BreakAssistantPage from './pages/BreakAssistantPage.jsx';
import AchievementsPage from './pages/AchievementsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const ROUTES = {
  '/': LandingPage,
  '/onboarding': OnboardingPage,
  '/dashboard': DashboardPage,
  '/monitor': MonitorPage,
  '/analytics': AnalyticsPage,
  '/breaks': BreakAssistantPage,
  '/achievements': AchievementsPage,
  '/settings': SettingsPage,
  '/privacy': PrivacyPage,
};

function RoutedApplication() {
  const { path } = useRouter();
  const Page = ROUTES[path] ?? NotFoundPage;
  return (
    <AppShell currentPath={path}>
      <Page />
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MonitorProvider>
        <RouterProvider>
          <RoutedApplication />
        </RouterProvider>
      </MonitorProvider>
    </AppProvider>
  );
}
