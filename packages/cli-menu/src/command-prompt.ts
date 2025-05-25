import fs from 'node:fs';
import path from 'node:path';
import {
  Client,
  type CommandModule,
  type ResolveCommandFn,
  type ResolvedCommand,
  command,
  parseFileName,
  removeFileExtension,
  resolveCommand,
} from '@gud/cli';
import cfonts from 'cfonts';
import colors from 'colors';
import type { Choice } from 'prompts';
import type { MenuOptions } from './menu.js';

export interface CommandPromptOptions extends MenuOptions {
  /**
   * The path to the directory to scan for command modules. The names of the
   * files will be used to populate the choices for the user.
   */
  commandsDir: string;

  /**
   * The function to use to resolve the command.
   */
  resolveFn?: ResolveCommandFn;

  /**
   * The client to use to prompt the user.
   */
  client?: Client;

  /**
   * The commands that have been selected so far.
   */
  selectionHistory?: ResolvedCommand[];

  /**
   * A function to call when the user cancels the command menu. By default, the
   * process will exit.
   */
  onCancel?: () => void;
}

export async function commandPrompt(
  options: CommandPromptOptions,
): Promise<ResolvedCommand[]> {
  const {
    client = new Client(),
    title,
    titleColors = ['#2EFFAF', '#0FC2C2'],
    message = 'Choose a command',
    showDescriptions = true,
    maxDescriptionLength = Number.POSITIVE_INFINITY,
    commandsDir,
    resolveFn = resolveCommand,
    selectionHistory = [],
    onCancel: onExit = process.exit,
  } = options;

  if (title) {
    cfonts.say(title, {
      font: 'tiny',
      gradient: titleColors as [string, string],
      transitionGradient: true,
    });
  }

  const commandDirItems = fs.readdirSync(commandsDir);
  const choicesByName = new Map<string, Choice>();

  for (const filename of commandDirItems) {
    const commandName = removeFileExtension(filename);
    let description: string | undefined;

    if (showDescriptions) {
      const filepath = path.join(commandsDir, filename);
      const { default: command }: { default: CommandModule } = await import(
        filepath
      ).catch(() => {
        return {
          ...passThroughCommand,
          default: passThroughCommand,
        };
      });
      description = command.description;

      if (description && description.length > maxDescriptionLength) {
        description = `${description.slice(0, maxDescriptionLength)}...`;
      }
    }

    // Only add the choice if it hasn't been added yet or if the command has a
    // description, which would indicate that the previous entry was a
    // directory.
    if (!choicesByName.has(commandName) || description) {
      choicesByName.set(commandName, {
        title: `${commandName}${
          description ? colors.dim(` - ${description}`) : ''
        }`,
        value: filename,
      });
    }
  }

  const choices = [...choicesByName.values()];

  const backChoice = {
    title: colors.italic('↩ back'),
    value: 'command-menu-back',
  };
  if (selectionHistory.length) {
    choices.unshift(backChoice);
  }

  const filename = await client.prompt({
    type: 'select',
    message,
    choices,
  });

  if (!filename) {
    onExit?.();
    return selectionHistory;
  }

  if (filename === backChoice.value) {
    const lastCommand = selectionHistory.pop()!;
    return await commandPrompt({
      ...options,
      title: undefined,
      commandsDir: path.dirname(lastCommand.commandPath),
      selectionHistory,
    });
  }

  // Get param values for the command if it has any
  const { paramName, spreadOperator } = parseFileName(filename);
  let commandString = removeFileExtension(filename);

  if (paramName) {
    let commandStringWithValues = await client.prompt({
      type: spreadOperator ? 'list' : 'text',
      message: spreadOperator
        ? `Enter values for ${paramName}`
        : `Enter a value for ${paramName}`,
      initial: commandString,
    });

    if (!commandStringWithValues) {
      onExit();
      return selectionHistory;
    }

    if (Array.isArray(commandStringWithValues)) {
      commandStringWithValues = commandStringWithValues.join(' ');
    }

    commandString = commandStringWithValues;
  }

  const resolved = await resolveFn({
    commandsDir,
    commandString,
  });

  selectionHistory.push(resolved);

  if (resolved.command.requiresSubcommand) {
    return await commandPrompt({
      ...options,
      title: undefined,
      commandsDir: resolved.subcommandsDir,
      selectionHistory,
    });
  }

  return selectionHistory;
}

const passThroughCommand = command();
