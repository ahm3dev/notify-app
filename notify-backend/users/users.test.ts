import { beforeEach, describe, expect, it } from "vitest";
import { create, get, list } from "./users";
import { usersDB } from "./db";

beforeEach(async () => {
  await usersDB.exec`DELETE FROM users`;
});

describe("users", () => {
  it("creates a user", async () => {
    const user = await create({ name: "Alice", email: "alice@example.com" });
    expect(user.id).toBeTruthy();
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
  });

  it("rejects a duplicate email", async () => {
    await create({ name: "Alice", email: "alice@example.com" });
    await expect(
      create({ name: "Alice II", email: "alice@example.com" }),
    ).rejects.toMatchObject({ code: "already_exists" });
  });

  it("lists users newest first", async () => {
    await create({ name: "Alice", email: "alice@example.com" });
    await create({ name: "Bob", email: "bob@example.com" });

    const { users } = await list();
    expect(users.map((u) => u.name)).toEqual(["Bob", "Alice"]);
  });

  it("gets a user by id", async () => {
    const created = await create({ name: "Alice", email: "alice@example.com" });
    const user = await get({ id: created.id });
    expect(user.id).toBe(created.id);
  });

  it("returns not_found for an unknown user", async () => {
    await expect(
      get({ id: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
