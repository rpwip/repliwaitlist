import { queueEntries, patients } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';

// SMS configuration
const SMS_API_KEY = process.env.SMS_API_KEY;
if (!SMS_API_KEY) {
  throw new Error("SMS_API_KEY environment variable must be set");
}

interface NotificationParams {
  to: string;
  patientName: string;
  queueNumber: number;
  estimatedTime: number;
}

async function formatPhoneNumber(phone: string): Promise<string> {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Add +91 prefix if not present
  if (!cleaned.startsWith('91')) {
    return `91${cleaned}`;
  }
  return cleaned;
}

export async function sendSMSNotification(params: NotificationParams): Promise<boolean> {
  try {
    const formattedPhone = await formatPhoneNumber(params.to);
    console.log('Sending SMS notification to:', formattedPhone);

    // Construct the API URL with query parameters
    const apiUrl = new URL('https://api.msg91.com/api/v5/flow/');
    const searchParams = new URLSearchParams();
    searchParams.append('template_id', 'queue_reminder');
    searchParams.append('mobile', formattedPhone);
    searchParams.append('authkey', SMS_API_KEY);

    // Add variables for template
    const variables = {
      name: params.patientName,
      queue_number: params.queueNumber.toString().padStart(3, '0'),
      wait_time: params.estimatedTime.toString()
    };

    // Make the API request
    const response = await fetch(`${apiUrl}?${searchParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        flow_id: "queue_reminder",
        sender: "CLDCRS",
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`SMS API responded with status: ${response.status}`);
    }

    console.log('SMS sent successfully to:', params.patientName);

    // Update the notification status in the database
    await db.update(queueEntries)
      .set({ notificationSent: true })
      .where(eq(queueEntries.queueNumber, params.queueNumber));

    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

export async function checkAndSendNotifications(avgWaitTime: number) {
  try {
    console.log('Checking for notifications to send...');
    // Get queue entries that haven't been notified and are within notification threshold
    const entries = await db.select()
      .from(queueEntries)
      .where(eq(queueEntries.notificationSent, false))
      .orderBy(queueEntries.queueNumber);

    console.log(`Found ${entries.length} entries to check for notifications`);

    for (const entry of entries) {
      const estimatedWaitTime = Math.ceil(avgWaitTime * (entries.indexOf(entry) + 1));

      // If estimated wait time is around 20 minutes, send notification
      if (estimatedWaitTime >= 20 && estimatedWaitTime <= 25) {
        console.log(`Preparing to send notification for queue number: ${entry.queueNumber}`);
        const [patient] = await db.select()
          .from(patients)
          .where(eq(patients.id, entry.patientId as number));

        if (patient) {
          await sendSMSNotification({
            to: patient.mobile,
            patientName: patient.fullName,
            queueNumber: entry.queueNumber,
            estimatedTime: estimatedWaitTime
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}