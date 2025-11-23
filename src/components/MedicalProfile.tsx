import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Heart, User, Phone, AlertTriangle, Pill, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner@2.0.3';

interface MedicalProfile {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  notes?: string;
}

export const MedicalProfile: React.FC = () => {
  const { profile } = useAuth();
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile>({
    allergies: [],
    conditions: [],
    medications: [],
    emergencyContacts: [],
  });
  const [loading, setLoading] = useState(false);

  // Form state
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const saved = localStorage.getItem(`medical_profile_${profile?.id}`);
    if (saved) {
      setMedicalProfile(JSON.parse(saved));
    }
  };

  const saveProfile = () => {
    setLoading(true);
    try {
      localStorage.setItem(`medical_profile_${profile?.id}`, JSON.stringify(medicalProfile));
      toast.success('Medical profile saved successfully');
    } catch (error) {
      toast.error('Failed to save medical profile');
    } finally {
      setLoading(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setMedicalProfile({
        ...medicalProfile,
        allergies: [...medicalProfile.allergies, newAllergy.trim()],
      });
      setNewAllergy('');
      toast.success('Allergy added');
    }
  };

  const removeAllergy = (index: number) => {
    setMedicalProfile({
      ...medicalProfile,
      allergies: medicalProfile.allergies.filter((_, i) => i !== index),
    });
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setMedicalProfile({
        ...medicalProfile,
        conditions: [...medicalProfile.conditions, newCondition.trim()],
      });
      setNewCondition('');
      toast.success('Condition added');
    }
  };

  const removeCondition = (index: number) => {
    setMedicalProfile({
      ...medicalProfile,
      conditions: medicalProfile.conditions.filter((_, i) => i !== index),
    });
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setMedicalProfile({
        ...medicalProfile,
        medications: [...medicalProfile.medications, newMedication.trim()],
      });
      setNewMedication('');
      toast.success('Medication added');
    }
  };

  const removeMedication = (index: number) => {
    setMedicalProfile({
      ...medicalProfile,
      medications: medicalProfile.medications.filter((_, i) => i !== index),
    });
  };

  const addEmergencyContact = () => {
    if (newContact.name && newContact.phone && newContact.relationship) {
      if (medicalProfile.emergencyContacts.length >= 5) {
        toast.error('Maximum 5 emergency contacts allowed');
        return;
      }
      setMedicalProfile({
        ...medicalProfile,
        emergencyContacts: [...medicalProfile.emergencyContacts, newContact],
      });
      setNewContact({ name: '', phone: '', relationship: '' });
      toast.success('Emergency contact added');
    } else {
      toast.error('Please fill all contact fields');
    }
  };

  const removeEmergencyContact = (index: number) => {
    setMedicalProfile({
      ...medicalProfile,
      emergencyContacts: medicalProfile.emergencyContacts.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-pink-600 to-red-600 text-white border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Heart className="w-6 h-6" />
            Medical Profile
          </CardTitle>
          <CardDescription className="text-pink-100">
            Keep your medical information up to date for emergency situations
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Blood Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Blood Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={medicalProfile.bloodType}
            onValueChange={(value) => setMedicalProfile({ ...medicalProfile, bloodType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blood type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add allergy (e.g., Penicillin)"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
            />
            <Button onClick={addAllergy}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {medicalProfile.allergies.map((allergy, index) => (
              <Badge key={index} variant="destructive" className="gap-1">
                {allergy}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeAllergy(index)}
                />
              </Badge>
            ))}
            {medicalProfile.allergies.length === 0 && (
              <p className="text-sm text-gray-500">No allergies added</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medical Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            Medical Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add condition (e.g., Diabetes, Asthma)"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCondition()}
            />
            <Button onClick={addCondition}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {medicalProfile.conditions.map((condition, index) => (
              <Badge key={index} className="gap-1 bg-blue-600">
                {condition}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeCondition(index)}
                />
              </Badge>
            ))}
            {medicalProfile.conditions.length === 0 && (
              <p className="text-sm text-gray-500">No conditions added</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-green-600" />
            Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add medication (e.g., Aspirin 100mg daily)"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMedication()}
            />
            <Button onClick={addMedication}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {medicalProfile.medications.map((medication, index) => (
              <Badge key={index} className="gap-1 bg-green-600">
                {medication}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeMedication(index)}
                />
              </Badge>
            ))}
            {medicalProfile.medications.length === 0 && (
              <p className="text-sm text-gray-500">No medications added</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-600" />
            Emergency Contacts ({medicalProfile.emergencyContacts.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Name"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            />
            <Input
              placeholder="Relationship"
              value={newContact.relationship}
              onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
            />
            <Button onClick={addEmergencyContact} className="w-full">
              Add Contact
            </Button>
          </div>

          <div className="space-y-2">
            {medicalProfile.emergencyContacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {contact.relationship} • {contact.phone}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEmergencyContact(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {medicalProfile.emergencyContacts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No emergency contacts added</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Medical Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any other important medical information..."
            value={medicalProfile.notes || ''}
            onChange={(e) => setMedicalProfile({ ...medicalProfile, notes: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveProfile}
          disabled={loading}
          className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
          size="lg"
        >
          {loading ? 'Saving...' : 'Save Medical Profile'}
        </Button>
      </div>
    </div>
  );
};
