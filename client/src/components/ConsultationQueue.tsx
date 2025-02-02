import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QueueNumber from "@/components/queue-number";
import { Clock, UserRound } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PatientHistoryModal } from "@/components/PatientHistoryModal";
import { NewVisitRecordModal } from "@/components/NewVisitRecordModal";

type PatientVitals = {
  bp?: string;
  temperature?: string;
  pulse?: string;
  spo2?: string;
};

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  patient: {
    id: number;
    fullName: string;
  };
  estimatedWaitTime: number;
  clinicId: number;
  vitals?: PatientVitals;
  visitReason?: string;
};

type ConsultationQueueProps = {
  clinicsData: any[];
  selectedClinicId: number | null;
  onClinicChange: (clinicId: number) => void;
  queueData: QueueEntry[];
  currentPatient: QueueEntry | null;
  onStartConsultation: (entry: QueueEntry) => void;
  onSkipPatient: (queueId: number) => void;
  onCompleteConsultation: (queueId: number) => void;
};

export default function ConsultationQueue({
  clinicsData,
  selectedClinicId,
  onClinicChange,
  queueData,
  currentPatient,
  onStartConsultation,
  onSkipPatient,
  onCompleteConsultation,
}: ConsultationQueueProps) {
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const currentDate = new Date();
  const formattedDate = format(currentDate, "EEEE, dd MMMM yyyy");

  const handleCareNow = () => {
    if (currentPatient?.patient?.id) {
      setShowNewVisitModal(true);
    }
  };

  const handleViewHistory = () => {
    if (currentPatient?.patient?.id) {
      setShowPatientHistory(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clinic Selector and Date */}
      <div className="flex items-center justify-between">
        <Select
          value={selectedClinicId?.toString()}
          onValueChange={(value) => onClinicChange(parseInt(value))}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select clinic" />
          </SelectTrigger>
          <SelectContent>
            {clinicsData?.map((clinic) => (
              <SelectItem
                key={clinic.clinic.id}
                value={clinic.clinic.id.toString()}
              >
                {clinic.clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg font-medium">{formattedDate}</span>
      </div>

      {/* Queue and Patient Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Side - Queue List */}
        <Card className="p-8">
          <CardHeader>
            <CardTitle>Current Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!queueData ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : queueData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No patients in queue</p>
            ) : (
              queueData.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        #{entry.queueNumber} - {entry.patient?.fullName || 'Unknown Patient'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Waiting time: {entry.estimatedWaitTime}min</span>
                      </div>
                      {entry.visitReason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {entry.visitReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onStartConsultation(entry)}
                    >
                      See Next
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onSkipPatient(entry.id)}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side - Patient Details */}
        <Card className="p-8">
          <CardHeader>
            <CardTitle>Current Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {currentPatient.patient?.fullName || 'Unknown Patient'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Queue #{currentPatient.queueNumber}
                    </p>
                  </div>
                </div>

                {/* Basic Patient Data */}
                <div className="space-y-2">
                  <h4 className="font-medium">Reason for Visit</h4>
                  <p className="text-muted-foreground">
                    {currentPatient.visitReason || 'Not specified'}
                  </p>
                </div>

                {currentPatient.vitals && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Vital Signs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Pressure</p>
                        <p>{currentPatient.vitals.bp || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Temperature</p>
                        <p>{currentPatient.vitals.temperature || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pulse</p>
                        <p>{currentPatient.vitals.pulse || 'N/A'} bpm</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SpO2</p>
                        <p>{currentPatient.vitals.spo2 || 'N/A'}%</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 mt-4">
                  <Button 
                    className="flex-1"
                    onClick={handleCareNow}
                  >
                    Care Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => onCompleteConsultation(currentPatient.id)}
                  >
                    Complete
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={handleViewHistory}
                >
                  View Patient History
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No patient currently in consultation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showPatientHistory && currentPatient?.patient?.id && (
        <PatientHistoryModal
          patientId={currentPatient.patient.id}
          isOpen={showPatientHistory}
          onClose={() => setShowPatientHistory(false)}
        />
      )}

      {showNewVisitModal && currentPatient?.patient?.id && (
        <NewVisitRecordModal
          patientId={currentPatient.patient.id}
          isOpen={showNewVisitModal}
          onClose={() => setShowNewVisitModal(false)}
          onComplete={() => {
            setShowNewVisitModal(false);
            onCompleteConsultation(currentPatient.id);
          }}
        />
      )}
    </div>
  );
}
