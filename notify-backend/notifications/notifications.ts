import { api, APIError, Query } from "encore.dev/api";
import { MinLen } from "encore.dev/validate";
import log from "encore.dev/log";
import { users } from "~encore/clients";
import { notificationsDB } from "./db";

export type Channel = "in_app" | "email";

export interface Notification {
  id: string;
  userId: string;
  channel: Channel;
  title: string;
  body: string;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

interface SendParams {
  userId: string;
  channel: Channel;
  title: string & MinLen<1>;
  body: string & MinLen<1>;
}

// Creates and delivers a notification to a user.
export const send = api(
  { expose: true, method: "POST", path: "/notifications" },
  async (p: SendParams): Promise<Notification> => {
    // 404s if the user doesn't exist (service-to-service call).
    const user = await users.get({ id: p.userId });

    const notification = await notificationsDB.queryRow<Notification>`
      INSERT INTO notifications (user_id, channel, title, body)
      VALUES (${p.userId}, ${p.channel}, ${p.title}, ${p.body})
      RETURNING id, user_id AS "userId", channel, title, body,
                (read_at IS NOT NULL) AS read, read_at AS "readAt",
                created_at AS "createdAt"
    `;
    if (!notification) {
      throw APIError.internal("failed to create notification");
    }

    // The email channel is simulated: delivery is the stored row + a log line.
    if (p.channel === "email") {
      log.info("email notification sent (simulated)", {
        notificationId: notification.id,
        to: user.email,
        title: p.title,
      });
    }

    return notification;
  },
);

interface ListParams {
  userId: Query<string>;
}

interface ListResponse {
  notifications: Notification[];
}

// Returns all notifications for a user, newest first.
export const list = api(
  { expose: true, method: "GET", path: "/notifications" },
  async ({ userId }: ListParams): Promise<ListResponse> => {
    const notifications = await notificationsDB.queryAll<Notification>`
      SELECT id, user_id AS "userId", channel, title, body,
             (read_at IS NOT NULL) AS read, read_at AS "readAt",
             created_at AS "createdAt"
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return { notifications };
  },
);

// Returns the unread notifications for a user, newest first.
export const listUnread = api(
  { expose: true, method: "GET", path: "/notifications/unread" },
  async ({ userId }: ListParams): Promise<ListResponse> => {
    const notifications = await notificationsDB.queryAll<Notification>`
      SELECT id, user_id AS "userId", channel, title, body,
             (read_at IS NOT NULL) AS read, read_at AS "readAt",
             created_at AS "createdAt"
      FROM notifications
      WHERE user_id = ${userId} AND read_at IS NULL
      ORDER BY created_at DESC
    `;
    return { notifications };
  },
);

interface MarkReadParams {
  id: string;
}

// Marks a notification as read. Idempotent: the first read time wins.
export const markRead = api(
  { expose: true, method: "POST", path: "/notifications/:id/read" },
  async ({ id }: MarkReadParams): Promise<Notification> => {
    const notification = await notificationsDB.queryRow<Notification>`
      UPDATE notifications
      SET read_at = COALESCE(read_at, now())
      WHERE id = ${id}
      RETURNING id, user_id AS "userId", channel, title, body,
                (read_at IS NOT NULL) AS read, read_at AS "readAt",
                created_at AS "createdAt"
    `;
    if (!notification) {
      throw APIError.notFound(`notification ${id} not found`);
    }
    return notification;
  },
);
