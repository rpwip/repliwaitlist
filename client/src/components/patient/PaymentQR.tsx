import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface PaymentQRProps {
  queueEntry: {
    id: number;
    queueNumber: number;
  };
  onPaymentComplete: () => void;
}

export function PaymentQR({ queueEntry, onPaymentComplete }: PaymentQRProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulated payment verification
  const verifyPayment = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/confirm-payment/${queueEntry.id}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Payment verification failed');
      }
      
      onPaymentComplete();
      toast({
        title: "Payment Successful",
        description: "Your queue number has been confirmed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Please try again or contact support.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Simulate progress for demo
  useEffect(() => {
    if (isVerifying) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(timer);
    } else {
      setProgress(0);
    }
  }, [isVerifying]);

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Payment Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-2xl font-semibold">Queue #{queueEntry.queueNumber}</p>
            <p className="text-muted-foreground">Please complete the payment to confirm your spot</p>
          </div>

          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Scan QR Code to pay</p>
            {/* Replace with actual QR code */}
            <div className="w-48 h-48 mx-auto bg-primary/10 rounded flex items-center justify-center">
              <p className="text-sm text-muted-foreground">QR Code Placeholder</p>
            </div>
          </div>

          {isVerifying && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Verifying payment...
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={verifyPayment}
            disabled={isVerifying}
          >
            {isVerifying ? "Verifying..." : "Verify Payment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
