import React from 'react';
import { Button } from './ui/button';
import { Ambulance, LogOut, Activity, Heart, Wifi, WifiOff, Moon, Sun, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Toaster } from './ui/sonner';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'patient':
        return 'bg-blue-100 text-blue-800';
      case 'hospital':
        return 'bg-green-100 text-green-800';
      case 'ambulance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-pink-100 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-red-600">ResQLink</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Emergency Response System</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="hidden sm:flex"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Settings Button */}
              {onNavigate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('settings')}
                  className="hidden sm:flex"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}

              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-900 dark:text-gray-100">{profile?.name}</p>
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                      profile?.role
                    )}`}
                  >
                    {profile?.role?.toUpperCase()}
                  </span>
                  {profile?.status && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Activity className="w-3 h-3" />
                      {profile.status}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="border-pink-200 hover:bg-pink-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-pink-100 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              ResQLink Emergency Response System • For prototype/demo purposes only
            </p>
            <p className="mt-1">
              In case of real emergency, call your local emergency number (911)
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
};