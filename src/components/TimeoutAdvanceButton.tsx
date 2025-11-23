import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Clock, AlertCircle } from 'lucide-react';
import { Emergency, timeoutAdvance } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface TimeoutAdvanceButtonProps {
  emergency: Emergency;
  accessToken: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline';
}

export const TimeoutAdvanceButton: React.FC<TimeoutAdvanceButtonProps> = ({
  emergency,
  accessToken,
  onSuccess,
  variant = 'default'
}) => {
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    // Calculate time remaining until 30 minutes have passed
    const calculateTimeLeft = () => {
      if (!emergency.awaitingPatientConfirmation) {
        setTimeLeft(null);
        setCanAdvance(false);
        return;
      }

      let timestamp: string | undefined;
      
      if (emergency.status === 'arrived_at_scene' && emergency.arrivedAtSceneAt) {
        timestamp = emergency.arrivedAtSceneAt;
      } else if (emergency.status === 'arrived_at_hospital' && emergency.arrivedAtHospitalAt) {
        timestamp = emergency.arrivedAtHospitalAt;
      }

      if (!timestamp) {
        setTimeLeft(null);
        setCanAdvance(false);
        return;
      }

      const arrivedTime = new Date(timestamp).getTime();
      const now = Date.now();
      const minutesPassed = (now - arrivedTime) / (1000 * 60);
      const minutesRemaining = 30 - minutesPassed;

      setTimeLeft(Math.max(0, minutesRemaining));
      setCanAdvance(minutesPassed >= 30);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [emergency]);

  const handleTimeoutAdvance = async () => {
    if (!canAdvance) {
      toast.error('Cannot advance yet - 30-minute timeout not reached');
      return;
    }

    setLoading(true);
    try {
      const result = await timeoutAdvance(emergency.id, accessToken);
      
      if (result.autoAdvanced) {
        const statusMessage = emergency.status === 'arrived_at_scene'
          ? '✓ Patient pickup confirmed automatically (timeout)'
          : '✓ Emergency completed automatically (timeout)';
        
        toast.success(statusMessage);
        onSuccess?.();
      } else {
        toast.error('Timeout period has not passed yet');
      }
    } catch (err: any) {
      console.error('Error advancing emergency:', err);
      toast.error('Failed to advance: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if emergency is not awaiting confirmation
  if (!emergency.awaitingPatientConfirmation) {
    return null;
  }

  // Don't show for states that don't require patient confirmation
  if (emergency.status !== 'arrived_at_scene' && emergency.status !== 'arrived_at_hospital') {
    return null;
  }

  const getStatusText = () => {
    if (emergency.status === 'arrived_at_scene') {
      return 'Waiting for patient arrival confirmation';
    }
    return 'Waiting for emergency completion confirmation';
  };

  const getActionText = () => {
    if (emergency.status === 'arrived_at_scene') {
      return 'Auto-Confirm Pickup (Timeout)';
    }
    return 'Auto-Complete (Timeout)';
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-amber-900">
            <span className="font-medium">{getStatusText()}</span>
          </p>
          
          {timeLeft !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              {canAdvance ? (
                <span className="text-amber-700 font-medium">
                  ✓ 30-minute timeout reached - can auto-advance
                </span>
              ) : (
                <span className="text-amber-700">
                  Time until auto-advance available: {Math.floor(timeLeft)} minutes
                </span>
              )}
            </div>
          )}

          <Button
            onClick={handleTimeoutAdvance}
            disabled={loading || !canAdvance}
            variant={variant}
            size="sm"
            className={
              canAdvance
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'opacity-50 cursor-not-allowed'
            }
          >
            <Clock className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : getActionText()}
          </Button>

          {!canAdvance && (
            <p className="text-xs text-amber-700">
              This button becomes available 30 minutes after ambulance arrival if patient hasn't confirmed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
