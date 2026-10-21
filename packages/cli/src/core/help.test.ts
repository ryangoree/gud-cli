// Must be imported first so `node:fs` is mocked before other modules load it
import "#/utils/testing/command-modules";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Context } from "#/core/context";
import { getHelp, type Help } from "#/core/help";
import { mockCommandModule, unmockAllCommandModules } from "#/utils/testing/command-modules";

describe("help", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    unmockAllCommandModules();
  });

  it("generates help for a command", async () => {
    // A bare-bones command module
    mockCommandModule("commands/foo", {
      handler: () => {},
    });

    let context = new Context({
      commandString: "foo",
      commandsDir: "commands",
    });
    await context.prepare();

    // Expect a bare-bones help object
    expect(await getHelp({ context })).toMatchObject({
      helpText: expect.any(String),
      usage: expect.any(String),
    } as Help);

    unmockAllCommandModules();

    // A full command module
    mockCommandModule("commands/foo", {
      description: "hello from foo",
      isMiddleware: true,
      requiresSubcommand: false,
      options: {
        foo: {
          type: "string",
        },
        bar: {
          type: "string",
        },
      },
      handler: () => {},
    });

    context = new Context({
      commandString: "foo",
      commandsDir: "commands",
    });
    await context.prepare();

    // Expect a full help object
    expect(await getHelp({ context })).toMatchObject({
      usage: expect.any(String),
      description: expect.any(String),
      optionsTitle: expect.any(String),
      options: [expect.any(Array), expect.any(Array)],
      helpText: expect.any(String),
    } as Help);
  });
});
