import { beforeEach, describe, expect, it } from "vitest";
import { create as createUser } from "../users/users";
import { usersDB } from "../users/db";
import { list, listUnread, markRead, send } from "./notifications";
import { notificationsDB } from "./db";

beforeEach(async () => {
  await notificationsDB.exec`DELETE FROM notifications`;
  await usersDB.exec`DELETE FROM users`;
});

function newUser() {
  return createUser({ name: "Alice", email: "alice@example.com" });
}

describe("notifications", () => {
  it("sends an in_app notification", async () => {
    const user = await newUser();
    const n = await send({
      userId: user.id,
      channel: "in_app",
      title: "Hi",
      body: "Welcome",
    });

    expect(n.userId).toBe(user.id);
    expect(n.channel).toBe("in_app");
    expect(n.read).toBe(false);
    expect(n.readAt).toBeNull();
  });

  it("sends an email notification", async () => {
    const user = await newUser();
    const n = await send({
      userId: user.id,
      channel: "email",
      title: "Hi",
      body: "Welcome",
    });
    expect(n.channel).toBe("email");
  });

  it("rejects sending to an unknown user", async () => {
    await expect(
      send({
        userId: "00000000-0000-0000-0000-000000000000",
        channel: "in_app",
        title: "Hi",
        body: "Welcome",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("lists a user's notifications newest first", async () => {
    const user = await newUser();
    await send({ userId: user.id, channel: "in_app", title: "first", body: "x" });
    await send({ userId: user.id, channel: "in_app", title: "second", body: "x" });

    const { notifications } = await list({ userId: user.id });
    expect(notifications.map((n) => n.title)).toEqual(["second", "first"]);
  });

  it("lists only unread notifications", async () => {
    const user = await newUser();
    const read = await send({ userId: user.id, channel: "in_app", title: "a", body: "x" });
    await send({ userId: user.id, channel: "in_app", title: "b", body: "x" });
    await markRead({ id: read.id });

    const { notifications } = await listUnread({ userId: user.id });
    expect(notifications.map((n) => n.title)).toEqual(["b"]);
  });

  it("marks a notification read, idempotently", async () => {
    const user = await newUser();
    const n = await send({ userId: user.id, channel: "in_app", title: "a", body: "x" });

    const first = await markRead({ id: n.id });
    expect(first.read).toBe(true);
    expect(first.readAt).not.toBeNull();

    const second = await markRead({ id: n.id });
    expect(second.readAt).toEqual(first.readAt);
  });

  it("returns not_found when marking an unknown notification", async () => {
    await expect(
      markRead({ id: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
