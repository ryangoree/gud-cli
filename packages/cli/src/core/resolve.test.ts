// Must be imported first so `node:fs` is mocked before other modules load it
import "#/utils/testing/command-modules";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandModule } from "#/core/command";
import { type ResolvedCommand, resolveCommand } from "#/core/resolve";
import { mockCommandModules, unmockAllCommandModules } from "#/utils/testing/command-modules";

describe("resolve", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    unmockAllCommandModules();
  });

  it("resolves commands using the file system", async () => {
    const commandModules = {
      "commands/foo.js": {
        handler: () => {},
      },
      "commands/foo/bar.js": {
        handler: () => {},
      },
      "commands/foo/bar/baz.js": {
        handler: () => {},
      },
    };
    mockCommandModules(commandModules);

    const commandString = "foo bar baz";
    const commandsDir = "commands";
    let resolved = await resolveCommand({
      commandString,
      commandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules["commands/foo.js"],
      commandPath: "commands/foo.js",
      commandName: "foo",
      commandTokens: ["foo"],
      remainingCommandString: "bar baz",
      remainingArgv: ["bar", "baz"],
      subcommandsDir: "commands/foo",
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules["commands/foo/bar.js"],
      commandPath: "commands/foo/bar.js",
      commandName: "bar",
      commandTokens: ["bar"],
      remainingCommandString: "baz",
      remainingArgv: ["baz"],
      subcommandsDir: "commands/foo/bar",
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules["commands/foo/bar/baz.js"],
      commandPath: "commands/foo/bar/baz.js",
      commandName: "baz",
      commandTokens: ["baz"],
      remainingCommandString: "",
      remainingArgv: [],
      subcommandsDir: "commands/foo/bar/baz",
    } as ResolvedCommand);
  });

  it("resolves param commands", async () => {
    const commandModules = {
      "commands/[qux].js": {
        handler: () => {},
      },
      "commands/[qux]/[...quux].js": {
        handler: () => {},
      },
    };
    mockCommandModules(commandModules);

    const commandString = "do re mi";
    const commandsDir = "commands";
    let resolved = await resolveCommand({
      commandString,
      commandsDir,
    });

    expect(resolved).toEqual({
      command: commandModules["commands/[qux].js"],
      commandName: "[qux]",
      commandPath: "commands/[qux].js",
      commandTokens: ["do"],
      remainingCommandString: "re mi",
      remainingArgv: ["re", "mi"],
      params: {
        qux: "do",
      },
      subcommandsDir: "commands/[qux]",
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toEqual({
      command: commandModules["commands/[qux]/[...quux].js"],
      commandName: "[...quux]",
      commandPath: "commands/[qux]/[...quux].js",
      commandTokens: ["re", "mi"],
      remainingCommandString: "",
      remainingArgv: [],
      params: {
        quux: ["re", "mi"],
      },
      subcommandsDir: "commands/[qux]/[...quux]",
    } as ResolvedCommand);
  });

  it("resolves arguments containing spaces", async () => {
    const commandModules = {
      "commands/foo.js": {
        options: { name: { type: "string" } },
        handler: () => {},
      },
    } satisfies Record<string, CommandModule>;
    mockCommandModules(commandModules);

    const resolved = await resolveCommand({
      commandString: 'foo --name "Bob Smith" bar',
      argv: ["foo", "--name", "Bob Smith", "bar"],
      commandsDir: "commands",
    });

    expect(resolved).toMatchObject({
      commandName: "foo",
      remainingCommandString: "bar",
      remainingArgv: ["bar"],
    } as ResolvedCommand);
  });
});
