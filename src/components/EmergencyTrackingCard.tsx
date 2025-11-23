// =====================================================
// Emergency Tracking Card - FOR HOSPITAL DASHBOARD
// Shows real-time progress of ambulance through 7-stage workflow
// =====================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import {
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  User,
  Phone,
  Hospital,
  Ambulance,
  Timer,
  AlertCircle,
} from 'lucide-react';
import { Emergency } from '../utils/api';
import { motion } from 'motion/react';

interface EmergencyTrackingCardProps {
  emergency: Emergency;
  ambulanceInfo?: {
    vehicleNumber: string;
    driverName: string;
    phone?: string;
  };
}

// Define the complete workflow stages
const WORKFLOW_STAGES = [
  { status: 'pending', label: 'Pending Assignment', icon: AlertCircle, color: 'yellow' },
  { status: 'assigned', label: 'Assigned', icon: CheckCircle, color: 'blue' },
  { status: 'enroute', label: 'En Route to Patient', icon: Navigation, color: 'orange' },
  { status: 'arrived_at_scene', label: 'Arrived at Scene', icon: MapPin, color: 'purple' },
  { status: 'patient_loaded', label: 'Patient Loaded', icon: Ambulance, color: 'indigo' },
  { status: 'enroute_to_hospital', label: 'En Route to Hospital', icon: Hospital, color: 'teal' },
  { status: 'arrived_at_hospital', label: 'Arrived at Hospital', icon: Hospital, color: 'green' },
  { status: 'completed', label: 'Completed', icon: CheckCircle, color: 'green' },
] as const;

export const EmergencyTrackingCard: React.FC<EmergencyTrackingCardProps> = ({
  emergency,
  ambulanceInfo,
}) => {
  // Get current stage index
  const getCurrentStageIndex = () => {
    const index = WORKFLOW_STAGES.findIndex(stage => stage.status === emergency.status);
    return index === -1 ? 0 : index;
  };

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = WORKFLOW_STAGES[currentStageIndex];

  // Calculate progress percentage
  const progressPercentage = ((currentStageIndex + 1) / WORKFLOW_STAGES.length) * 100;

  // Get elapsed time
  const getElapsedTime = () => {
    const start = new Date(emergency.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

  // Get status color for badge
  const getStatusColor = () => {
    switch (currentStage.color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'indigo': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'teal': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority color
  const getPriorityColor = () => {
    switch (emergency.priority) {
      case 'critical': return 'bg-red-500 text-white animate-pulse';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'standard': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="border-2 hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Ambulance className="w-5 h-5 text-blue-600" />
              Emergency #{emergency.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>
              Created: {new Date(emergency.createdAt).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getPriorityColor()}>
              {emergency.priority?.toUpperCase() || 'STANDARD'}
            </Badge>
            <Badge className={getStatusColor()}>
              {currentStage.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">
              {currentStageIndex + 1} of {WORKFLOW_STAGES.length} stages
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-right text-sm font-medium text-blue-600">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>

        <Separator />

        {/* Patient Information */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Patient Details
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <p className="font-medium">{emergency.patientName}</p>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>
              <p className="font-medium">
                <a href={`tel:${emergency.patientPhone}`} className="text-blue-600 hover:underline">
                  {emergency.patientPhone}
                </a>
              </p>
            </div>
          </div>
          
          {emergency.description && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
              <span className="text-gray-600">Description:</span>
              <p className="mt-1">{emergency.description}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
            <span className="text-gray-600">Location:</span>
            <p className="font-mono mt-1">
              {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              asChild
            >
              <a
                href={`https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="w-4 h-4 mr-2" />
                View on Map
              </a>
            </Button>
          </div>
        </div>

        {/* Ambulance Information */}
        {ambulanceInfo && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Ambulance className="w-4 h-4" />
                Assigned Ambulance
              </h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{ambulanceInfo.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{ambulanceInfo.driverName}</span>
                </div>
                {ambulanceInfo.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact:</span>
                    <a
                      href={`tel:${ambulanceInfo.phone}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {ambulanceInfo.phone}
                    </a>
                  </div>
                )}
                {emergency.estimatedTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ETA:</span>
                    <span className="font-medium">{emergency.estimatedTime} minutes</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Journey Timeline
          </h4>
          
          <div className="space-y-2">
            {WORKFLOW_STAGES.map((stage, index) => {
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const Icon = stage.icon;

              return (
                <motion.div
                  key={stage.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={`
                        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                        transition-all duration-300 text-sm
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? `bg-${stage.color}-500 text-white ring-2 ring-${stage.color}-300` : ''}
                        ${!isComplete && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}
                      `}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isCurrent ? 'text-blue-600' : isComplete ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                        }`}
                      >
                        {stage.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-gray-500">In Progress...</p>
                      )}
                      {isComplete && (
                        <p className="text-xs text-green-600">✓ Completed</p>
                      )}
                    </div>

                    {/* Status Indicator */}
                    {isCurrent && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <div
                      className={`
                        ml-4 h-6 w-0.5 my-0.5
                        ${isComplete ? 'bg-green-500' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Elapsed Time
            </span>
            <span className="font-mono font-medium">{getElapsedTime()}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={`tel:${emergency.patientPhone}`}>
              <Phone className="w-4 h-4 mr-2" />
              Call Patient
            </a>
          </Button>
          {ambulanceInfo?.phone && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`tel:${ambulanceInfo.phone}`}>
                <Phone className="w-4 h-4 mr-2" />
                Call Ambulance
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
