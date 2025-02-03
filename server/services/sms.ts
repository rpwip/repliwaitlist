import { sendSMSNotification } from "./notifications";

export async function sendTestSMS(phoneNumber: string): Promise<boolean> {
  return sendSMSNotification({
    to: phoneNumber,
    patientName: "Test User",
    queueNumber: 123,
    estimatedTime: 20
  });
}
