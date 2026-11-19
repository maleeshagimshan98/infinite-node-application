/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type INotificationStatus = 'pending' | 'sent' | 'failed';

export type INotificationChannel = 'email' | 'sms' | 'push notification' | 'webhook';

/**
 * A notification record, as the notification log stores it.
 */
export interface INotification {
  id: string;
  /** The name of the service that triggered the notification. */
  triggered_by: string;
  triggered_on: Date;
  topic: string;
  /** Sending the same notification on several channels creates one record per channel. */
  channel: INotificationChannel;
  /** The notification driver that delivers it. */
  service_provider: string;
  data: Record<string, unknown>;
  status: INotificationStatus;
}

/**
 * A notification to queue. The notification manager assigns its id, status and service provider.
 */
export type INewNotification = Omit<INotification, 'id' | 'status' | 'service_provider'>;
