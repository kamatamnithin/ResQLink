import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Ambulance, 
  Heart, 
  Activity, 
  Clock, 
  Shield, 
  Zap, 
  MapPin, 
  Phone,
  Settings,
  ChevronRight,
  CheckCircle,
  Users,
  BarChart3,
  Home
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  const [showSettings, setShowSettings] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-pink-100 bg-white/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-xl text-gray-900">ResQLink</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('hero')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                FAQ
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onSignIn} className="text-gray-700 hover:text-pink-600">
                Sign In
              </Button>
              <Button 
                onClick={onGetStarted}
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white shadow-lg"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center animate-float">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl ring-8 ring-pink-100">
              <Heart className="w-14 h-14 text-white fill-white" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 tracking-tight">
            ResQLink
          </h1>

          {/* Badge */}
          <div className="flex justify-center">
            <Badge className="bg-pink-100 text-pink-700 border-pink-200 px-4 py-2 text-sm hover:bg-pink-200 transition-colors">
              <Zap className="w-4 h-4 mr-2" />
              Real-time Emergency Response System
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-red-600 to-pink-600">
              Emergency Help
            </h2>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-pink-600 to-red-600">
              When You Need It Most
            </h2>
          </div>

          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            ResQLink connects patients, ambulance drivers, and hospitals in real-time during medical emergencies. 
            Fast, reliable, and accessible emergency response at your fingertips.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white shadow-xl text-lg px-8 py-6 group"
            >
              Get Started
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-pink-300 text-pink-700 hover:bg-pink-50 text-lg px-8 py-6"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-pink-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-gray-900">Real-time Response</h3>
                <p className="text-gray-600">
                  Instant emergency alerts and live tracking ensure the fastest possible response time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-gray-900">GPS Tracking</h3>
                <p className="text-gray-600">
                  Accurate location tracking connects you with the nearest available emergency services.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-gray-900">Secure & Reliable</h3>
                <p className="text-gray-600">
                  HIPAA-compliant platform with end-to-end encryption for your safety and privacy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-pink-600 to-red-600 border-none text-white shadow-2xl">
            <CardContent className="py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 mx-auto" />
                  <p className="text-3xl">24/7</p>
                  <p className="text-sm text-pink-100">Availability</p>
                </div>
                <div className="space-y-2">
                  <Users className="w-8 h-8 mx-auto" />
                  <p className="text-3xl">10k+</p>
                  <p className="text-sm text-pink-100">Users Connected</p>
                </div>
                <div className="space-y-2">
                  <Activity className="w-8 h-8 mx-auto" />
                  <p className="text-3xl">&lt;5min</p>
                  <p className="text-sm text-pink-100">Avg Response</p>
                </div>
                <div className="space-y-2">
                  <BarChart3 className="w-8 h-8 mx-auto" />
                  <p className="text-3xl">99.9%</p>
                  <p className="text-sm text-pink-100">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Simple, fast, and effective emergency response in 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-pink-100 hover:shadow-xl transition-all">
              <CardContent className="pt-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
                  1
                </div>
                <h3 className="text-xl text-center text-gray-900">Report Emergency</h3>
                <p className="text-gray-600 text-center">
                  Press the SOS button and your GPS location is instantly sent to nearby hospitals and ambulances.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100 hover:shadow-xl transition-all">
              <CardContent className="pt-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
                  2
                </div>
                <h3 className="text-xl text-center text-gray-900">Ambulance Dispatched</h3>
                <p className="text-gray-600 text-center">
                  The nearest available ambulance accepts your request and heads to your location with real-time tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100 hover:shadow-xl transition-all">
              <CardContent className="pt-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
                  3
                </div>
                <h3 className="text-xl text-center text-gray-900">Help Arrives</h3>
                <p className="text-gray-600 text-center">
                  You're transported safely to the hospital. Track the entire journey from start to finish.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know about ResQLink</p>
          </div>

          <div className="space-y-4">
            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-lg">Is ResQLink available 24/7?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! ResQLink operates round-the-clock, 365 days a year. Emergency services are always available when you need them.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-lg">How accurate is the GPS tracking?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our system uses high-accuracy GPS with real-time updates. Location accuracy is typically within 5-10 meters, ensuring ambulances can find you quickly.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-lg">What if I accidentally trigger an emergency?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You can cancel a pending emergency request before an ambulance is assigned. Once assigned, please contact the ambulance driver directly to cancel.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-lg">Is my medical information secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely. ResQLink is HIPAA-compliant with end-to-end encryption. Your data is protected with bank-level security protocols.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-lg">How do hospitals and ambulances use ResQLink?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Hospitals monitor incoming emergencies and assign ambulances. Ambulance drivers receive instant notifications with patient location and can accept requests with one tap.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-3">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-gray-200"
        >
          <Settings className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-16 h-16 bg-gradient-to-br from-pink-600 to-red-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform animate-pulse-slow">
          <Phone className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-pink-100 bg-white/80 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            ResQLink Emergency Response System • For prototype/demo purposes only
          </p>
          <p className="text-sm text-gray-500 mt-2">
            In case of real emergency, call your local emergency number (911)
          </p>
        </div>
      </footer>
    </div>
  );
};