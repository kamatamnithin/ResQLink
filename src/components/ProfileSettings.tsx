import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { User, Lock, Bell, Moon, Sun, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MedicalProfile } from './MedicalProfile';
import { toast } from 'sonner@2.0.3';

interface ProfileSettingsProps {
  onNavigate?: (view: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState({
    emergencyAlerts: true,
    statusUpdates: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    toast.success('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onNavigate && (
        <Button
          variant="ghost"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 hover:bg-pink-50 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-red-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl mb-2">Account Settings</h2>
        <p className="text-pink-100">Manage your account preferences and security</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="medical">Medical Info</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={profile?.role?.toUpperCase() || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>

              {profile?.role === 'hospital' && (
                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital Name</Label>
                  <Input
                    id="hospital"
                    value={profile?.hospitalName || ''}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              )}

              {profile?.role === 'ambulance' && (
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle Number</Label>
                  <Input
                    id="vehicle"
                    value={profile?.vehicleNumber || ''}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              )}

              <Button onClick={handleSaveProfile} className="w-full">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                Appearance
              </CardTitle>
              <CardDescription>Customize how ResQLink looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-gray-500">
                    Use dark theme throughout the app
                  </p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button onClick={handleChangePassword} className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-gray-500">
                    Auto-logout after 30 minutes of inactivity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when your account is accessed
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emergency Alerts</Label>
                  <p className="text-sm text-gray-500">
                    Critical notifications about emergencies
                  </p>
                </div>
                <Switch
                  checked={notifications.emergencyAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emergencyAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status Updates</Label>
                  <p className="text-sm text-gray-500">
                    Updates about your emergency status
                  </p>
                </div>
                <Switch
                  checked={notifications.statusUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, statusUpdates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive updates via text message
                  </p>
                </div>
                <Switch
                  checked={notifications.smsNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, smsNotifications: checked })
                  }
                />
              </div>

              <Button
                onClick={() => toast.success('Notification preferences saved')}
                className="w-full"
              >
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Info Tab */}
        <TabsContent value="medical">
          {profile?.role === 'patient' ? (
            <MedicalProfile />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Medical information is only available for patients
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};