import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check, CreditCard, Crown, Users, Zap, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner@2.0.3';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  recommended?: boolean;
  icon: React.ReactNode;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    icon: <Zap className="w-6 h-6" />,
    features: [
      '1 emergency per month',
      'Standard priority only',
      'Basic tracking',
      '1 emergency contact',
      'Email support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    interval: 'month',
    icon: <Crown className="w-6 h-6" />,
    recommended: true,
    features: [
      'Unlimited emergencies',
      'All priority levels',
      'Medical profile',
      '5 emergency contacts',
      'Live ambulance tracking',
      'Ad-free experience',
      'Priority support',
      'Email & SMS notifications',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: 19.99,
    interval: 'month',
    icon: <Users className="w-6 h-6" />,
    features: [
      'Up to 5 family members',
      'All Premium features',
      'Shared emergency contacts',
      'Family location tracking',
      'Group emergency alerts',
      'Dedicated support',
      'Priority dispatch',
    ],
  },
];

interface PaymentSystemProps {
  onNavigate?: (view: string) => void;
}

export const PaymentSystem: React.FC<PaymentSystemProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  const currentPlan = 'free'; // Would come from backend

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (plan.id === 'free') {
      toast.info('You are already on the free plan');
      return;
    }
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handlePayment = async () => {
    // Validate card details
    if (!cardNumber || !expiry || !cvc) {
      toast.error('Please fill in all card details');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Invalid card number');
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      toast.success(`Successfully subscribed to ${selectedPlan?.name} plan! 🎉`);
      setShowCheckout(false);
      setProcessing(false);
      setCardNumber('');
      setExpiry('');
      setCvc('');
    }, 2000);

    // In production, integrate with Stripe:
    // const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);
    // const { error } = await stripe.confirmCardPayment(clientSecret, {
    //   payment_method: {
    //     card: elements.getElement(CardElement),
    //   },
    // });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
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
      <Card className="bg-gradient-to-r from-pink-600 to-red-600 text-white border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CreditCard className="w-6 h-6" />
            Subscription Plans
          </CardTitle>
          <CardDescription className="text-pink-100">
            Choose the plan that works best for you
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Plan */}
      <Card className="border-2 border-pink-200 dark:border-pink-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Plan</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">
                {PLANS.find((p) => p.id === currentPlan)?.name}
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-pink-600 to-red-600">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.recommended
                ? 'border-2 border-pink-600 dark:border-pink-400 shadow-xl'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-pink-600 to-red-600">
                  Recommended
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-lg ${
                    plan.recommended
                      ? 'bg-gradient-to-br from-pink-600 to-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {plan.icon}
                </div>
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    ${plan.price}
                    {plan.price > 0 && `/${plan.interval}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Features List */}
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Subscribe Button */}
              <Button
                onClick={() => handleSubscribe(plan)}
                className={`w-full ${
                  plan.id === currentPlan
                    ? 'bg-gray-400 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700'
                    : ''
                }`}
                disabled={plan.id === currentPlan}
              >
                {plan.id === currentPlan ? 'Current Plan' : `Subscribe to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Enter your payment details to complete subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Plan Summary */}
            <Card className="bg-gradient-to-r from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 border-pink-200 dark:border-pink-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl text-gray-900 dark:text-white">
                    ${selectedPlan?.price}/{selectedPlan?.interval}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    maxLength={3}
                  />
                </div>
              </div>
            </div>

            {/* Demo Note */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Demo Mode:</strong> This is a demonstration. Use any card number (e.g.,
                4242 4242 4242 4242) to test.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCheckout(false)}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
              >
                {processing ? 'Processing...' : `Pay $${selectedPlan?.price}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};