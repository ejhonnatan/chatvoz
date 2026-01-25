import { useBlinkAuth } from '@blinkdotnew/react';
import { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { blink } from './lib/blink';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { SurveysPage } from './pages/SurveysPage';
import { ContactsPage } from './pages/ContactsPage';
import { SimulationPage } from './pages/SimulationPage';
import { SettingsPage } from './pages/SettingsPage';
import { Button } from './components/ui/button';
import { Phone, CheckCircle2, ListFilter, PlayCircle } from 'lucide-react';

function App() {
  const { isAuthenticated, isLoading, user } = useBlinkAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
              <Phone className="h-12 w-12" />
            </div>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">{t('landing.title')}</h1>
          <p className="mb-8 text-muted-foreground">
            {t('landing.subtitle')}
          </p>
          <Button 
            size="lg" 
            className="w-full text-lg" 
            onClick={() => blink.auth.login()}
          >
            {t('landing.signInButton')}
          </Button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'surveys':
        return <SurveysPage />;
      case 'contacts':
        return <ContactsPage />;
      case 'simulation':
        return <SimulationPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">{t('common.loading')}</div>}>
      <DashboardLayout 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        user={user}
      >
        {renderPage()}
      </DashboardLayout>
    </Suspense>
  );
}

export default App;