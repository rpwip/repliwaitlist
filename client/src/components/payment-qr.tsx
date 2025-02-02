import { useEffect, useState } from "react";
import { useQueue } from "@/hooks/use-queue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface PaymentQRProps {
  queueId: number;
  patientName: string;
  clinicDetails: {
    id: number;
    name: string;
    address: string;
  };
  queueNumber: number;
}

export default function PaymentQR({
  queueId,
  patientName,
  clinicDetails,
  queueNumber
}: PaymentQRProps) {
  const { confirmPayment, verifyPayment } = useQueue();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [qrUrl, setQrUrl] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const consultationFee = 500;

  useEffect(() => {
    const txnRef = `CC-${queueId}-${Date.now()}`;
    setTransactionRef(txnRef);

    const paymentDetails = {
      patientName,
      clinicName: clinicDetails.name,
      queueNumber: String(queueNumber).padStart(3, '0'),
      date: format(new Date(), 'PP'),
      amount: consultationFee,
      reference: txnRef
    };

    const dummyUpiUrl = `upi://pay?pa=cloudcares@upi&pn=Cloud%20Cares&am=${consultationFee}.00&cu=INR&tr=${txnRef}&tn=Consultation at ${clinicDetails.name}`;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dummyUpiUrl)}`);
  }, [queueId, patientName, clinicDetails, queueNumber]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (!isPaid && transactionRef) {
      interval = setInterval(async () => {
        try {
          const status = await verifyPayment({ queueId, transactionRef });
          if (status.verified) {
            setIsPaid(true);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Payment verification failed:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [queueId, transactionRef, isPaid, verifyPayment]);

  const handlePaymentConfirmation = async () => {
    try {
      setIsConfirming(true);
      await confirmPayment(queueId);
      setIsPaid(true);
      setLocation(`/display?clinicId=${clinicDetails.id}`);
    } catch (error) {
      console.error('Payment confirmation failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isPaid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{getTranslation('paymentSuccessTitle', language)}</CardTitle>
          <CardDescription>
            {getTranslation('paymentSuccessDescription', language)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-t pt-4">
              <p className="font-medium">Queue Number: {String(queueNumber).padStart(3, '0')}</p>
              <p className="text-sm text-muted-foreground">Clinic: {clinicDetails.name}</p>
              <p className="text-sm text-muted-foreground">Date: {format(new Date(), 'PP')}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {getTranslation('paymentSuccessInstructions', language)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTranslation('completePayment', language)}</CardTitle>
        <CardDescription>
          {getTranslation('scanQRDescription', language)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <img src={qrUrl} alt="Payment QR Code" className="w-48 h-48" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">₹{consultationFee}.00</p>
            <div className="text-sm space-y-1">
              <p className="font-medium">Patient: {patientName}</p>
              <p>Clinic: {clinicDetails.name}</p>
              <p>Queue Number: {String(queueNumber).padStart(3, '0')}</p>
              <p>Date: {format(new Date(), 'PP')}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {getTranslation('upiInstructions', language)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getTranslation('transactionReference', language)}: {transactionRef}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handlePaymentConfirmation}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {getTranslation('confirmingPayment', language)}
            </>
          ) : (
            "Payment verification done"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}