import { MailService } from '@sendgrid/mail';
import { WebClient } from '@slack/web-api';
import { db } from "@db";
import { notificationPreferences, queueEntries, users, patients } from "@db/schema";
import { eq } from "drizzle-orm";

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Slack for internal notifications
if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable must be set");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface NotificationParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: NotificationParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: 'notifications@cloudcares.com', // Update with your verified sender
      subject: params.subject,
      text: params.text,
      html: params.html || params.text,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  // TODO: Implement SMS service integration
  console.log(`Would send SMS to ${phoneNumber}: ${message}`);
  return true;
}

export async function sendQueueNotification(queueEntryId: number): Promise<void> {
  try {
    const queueEntry = await db.query.queueEntries.findFirst({
      where: eq(queueEntries.id, queueEntryId),
      with: {
        patient: true,
      },
    });

    if (!queueEntry || !queueEntry.patient) return;

    const userPrefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, queueEntry.patient.userId!),
    });

    if (!userPrefs) return;

    const message = `Your queue number ${queueEntry.queueNumber} is ${queueEntry.status}. 
                    Estimated wait time: ${queueEntry.estimatedTime} minutes.`;

    if (userPrefs.sms && queueEntry.patient.mobile) {
      await sendSMS(queueEntry.patient.mobile, message);
    }

    if (userPrefs.email && queueEntry.patient.email) {
      await sendEmail({
        to: queueEntry.patient.email,
        subject: 'Queue Status Update - Cloud Cares',
        text: message,
      });
    }

    // Mark notification as sent
    await db.update(queueEntries)
      .set({ notificationSent: true })
      .where(eq(queueEntries.id, queueEntryId));

  } catch (error) {
    console.error('Error sending queue notification:', error);
    throw error;
  }
}

export async function sendInternalAlert(message: string): Promise<void> {
  try {
    if (process.env.SLACK_CHANNEL_ID) {
      await slack.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text: message,
      });
    }
  } catch (error) {
    console.error('Error sending internal alert:', error);
  }
}
