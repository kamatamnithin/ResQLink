import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { PatientDashboard } from './components/PatientDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AmbulanceDashboard } from './components/AmbulanceDashboard';
import { ProfileSettings } from './components/ProfileSettings';
import { PaymentSystem } from './components/PaymentSystem';
import { Layout } from './components/Layout';
import { sessionManager } from './utils/sessionManager';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

const AppContent: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');
  const [currentView, setCurrentView] = React.useState<'dashboard' | 'settings' | 'payments'>('dashboard');
  const [showTimeoutWarning, setShowTimeoutWarning] = React.useState(false);

  // Setup session timeout
  React.useEffect(() => {
    if (user) {
      sessionManager.setCallbacks(
        () => {
          toast.error('Session expired due to inactivity');
          signOut();
        },
        () => {
          setShowTimeoutWarning(true);
        }
      );
      sessionManager.start();
    }

    return () => {
      sessionManager.stop();
    };
  }, [user, signOut]);

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    sessionManager.start(); // Reset timer
    toast.success('Session extended');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ResQLink...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    if (showAuth) {
      return <AuthPage />;
    }
    return (
      <LandingPage
        onGetStarted={() => setShowAuth(true)}
        onSignIn={() => setShowAuth(true)}
      />
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'patient':
        return <PatientDashboard />;
      case 'hospital':
        return <HospitalDashboard />;
      case 'ambulance':
        return <AmbulanceDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-600">Unknown role. Please contact support.</p>
          </div>
        );
    }
  };

  return (
    <>
      <Layout onNavigate={setCurrentView}>
        {currentView === 'dashboard'
          ? renderDashboard()
          : currentView === 'settings'
          ? <ProfileSettings onNavigate={setCurrentView} />
          : <PaymentSystem onNavigate={setCurrentView} />}
      </Layout>

      {/* Session Timeout Warning Dialog */}
      <Dialog open={showTimeoutWarning} onOpenChange={setShowTimeoutWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session About to Expire</DialogTitle>
            <DialogDescription>
              Your session will expire in 2 minutes due to inactivity. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
            <Button onClick={handleExtendSession} className="bg-gradient-to-r from-pink-600 to-red-600">
              Continue Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}