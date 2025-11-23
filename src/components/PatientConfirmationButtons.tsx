import React, { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Emergency, confirmEmergencyArrival, confirmEmergencyCompletion } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface PatientConfirmationButtonsProps {
  emergency: Emergency;
  accessToken: string;
  onConfirmation: () => void;
}

export const PatientConfirmationButtons: React.FC<PatientConfirmationButtonsProps> = ({
  emergency,
  accessToken,
  onConfirmation,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirmArrival = async () => {
    setLoading(true);
    try {
      await confirmEmergencyArrival(emergency.id, accessToken);
      toast.success('✅ Arrival Confirmed!', {
        description: 'Ambulance will now transport you to the hospital'
      });
      onConfirmation();
    } catch (err: any) {
      toast.error('Failed to confirm arrival', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    setLoading(true);
    try {
      await confirmEmergencyCompletion(emergency.id, accessToken);
      toast.success('✅ Emergency Completed!', {
        description: 'Thank you for confirming safe delivery'
      });
      onConfirmation();
    } catch (err: any) {
      toast.error('Failed to confirm completion', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Show confirmation button when ambulance arrives at patient location
  if (emergency.status === 'arrived_at_scene' && emergency.awaitingPatientConfirmation) {
    return (
      <Alert className="border-2 border-green-400 bg-green-50 animate-pulse">
        <AlertCircle className="h-5 w-5 text-green-700" />
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-green-900 font-medium">
            🚑 Ambulance has arrived! Please confirm that help has arrived at your location.
          </p>
          <Button
            onClick={handleConfirmArrival}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg h-12"
            size="lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {loading ? 'Confirming...' : '✅ YES, Help Has Arrived'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show completion confirmation button when ambulance arrives at hospital
  if (emergency.status === 'arrived_at_hospital' && emergency.awaitingPatientConfirmation) {
    return (
      <Alert className="border-2 border-blue-400 bg-blue-50 animate-pulse">
        <AlertCircle className="h-5 w-5 text-blue-700" />
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-blue-900 font-medium">
            🏥 You've arrived at the hospital! Please confirm safe delivery to complete the emergency.
          </p>
          <Button
            onClick={handleConfirmCompletion}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg h-12"
            size="lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {loading ? 'Confirming...' : '✅ Confirm Safe Delivery'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
