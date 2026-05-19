#!/usr/bin/env bun
import { Command, Option } from "commander";
import { ApiClient } from "./api";
import { resolveApiUrl } from "./config";

const program = new Command();

program
  .name("notify")
  .description("CLI client for the notify backend")
  .option(
    "--api-url <url>",
    "backend base URL (defaults to $NOTIFY_API_URL or http://localhost:4000)",
  );

function client(): ApiClient {
  const { apiUrl } = program.opts<{ apiUrl?: string }>();
  return new ApiClient(resolveApiUrl(apiUrl));
}

function print(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

program
  .command("users:create")
  .requiredOption("--name <name>", "user's name")
  .requiredOption("--email <email>", "user's email")
  .action(async (opts: { name: string; email: string }) => {
    print(await client().createUser(opts.name, opts.email));
  });

program
  .command("users:list")
  .action(async () => {
    const { users } = await client().listUsers();
    print(users);
  });

program
  .command("send")
  .requiredOption("--user-id <id>", "recipient user id")
  .addOption(
    new Option("--channel <channel>", "delivery channel")
      .choices(["in_app", "email"])
      .makeOptionMandatory(),
  )
  .requiredOption("--title <title>", "notification title")
  .requiredOption("--body <body>", "notification body")
  .action(
    async (opts: {
      userId: string;
      channel: "in_app" | "email";
      title: string;
      body: string;
    }) => {
      print(
        await client().send({
          userId: opts.userId,
          channel: opts.channel,
          title: opts.title,
          body: opts.body,
        }),
      );
    },
  );

program
  .command("list")
  .requiredOption("--user-id <id>", "user id")
  .action(async (opts: { userId: string }) => {
    const { notifications } = await client().listNotifications(opts.userId);
    print(notifications);
  });

program
  .command("unread")
  .requiredOption("--user-id <id>", "user id")
  .action(async (opts: { userId: string }) => {
    const { notifications } = await client().listUnread(opts.userId);
    print(notifications);
  });

program
  .command("read")
  .requiredOption("--id <id>", "notification id")
  .action(async (opts: { id: string }) => {
    print(await client().markRead(opts.id));
  });

program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
