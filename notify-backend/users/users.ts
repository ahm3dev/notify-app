import { api, APIError } from "encore.dev/api";
import { IsEmail, MinLen } from "encore.dev/validate";
import { usersDB } from "./db";

// A user that can receive notifications.
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserParams {
  name: string & MinLen<1>;
  email: string & IsEmail;
}

// Registers a new user.
export const create = api(
  { expose: true, method: "POST", path: "/users" },
  async (params: CreateUserParams): Promise<User> => {
    const { name, email } = params;

    // Friendly 409; the UNIQUE constraint on email is the real guard.
    const existing = await usersDB.queryRow`
      SELECT 1 FROM users WHERE email = ${email}
    `;
    if (existing) {
      throw APIError.alreadyExists(`a user with email ${email} already exists`);
    }

    const user = await usersDB.queryRow<User>`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING id, name, email, created_at AS "createdAt"
    `;
    if (!user) {
      throw APIError.internal("failed to create user");
    }
    return user;
  },
);

interface ListUsersResponse {
  users: User[];
}

// Returns all users, newest first.
export const list = api(
  { expose: true, method: "GET", path: "/users" },
  async (): Promise<ListUsersResponse> => {
    const users = await usersDB.queryAll<User>`
      SELECT id, name, email, created_at AS "createdAt"
      FROM users
      ORDER BY created_at DESC
    `;
    return { users };
  },
);

interface GetUserParams {
  id: string;
}

// Returns a single user by id. Internal-only.
export const get = api(
  { expose: false, method: "GET", path: "/users/:id" },
  async ({ id }: GetUserParams): Promise<User> => {
    const user = await usersDB.queryRow<User>`
      SELECT id, name, email, created_at AS "createdAt"
      FROM users WHERE id = ${id}
    `;
    if (!user) {
      throw APIError.notFound(`user ${id} not found`);
    }
    return user;
  },
);
