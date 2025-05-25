# Gud CLI

A Command Line Interface (CLI) framework for node designed to
build powerful and flexible command-line applications with ease. It leverages a
modular approach, allowing developers to create commands, use hooks for
lifecycle management, and extend functionality with plugins.

- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Ideal Use Cases](#ideal-use-cases)
- [Running](#running)
- [Creating Commands](#creating-commands)
- [Creating Plugins](#creating-plugins)
  - [Examples](#examples)
- [Routing and Command Resolution](#routing-and-command-resolution)
  - [Default Commands Directory](#default-commands-directory)
  - [Command File/Module Resolution Steps](#command-filemodule-resolution-steps)
    - [Key Points](#key-points)
  - [Examples](#examples-1)
  - [Key Points](#key-points-1)
- [Dynamic Option Handling](#dynamic-option-handling)
  - [Benefits](#benefits)
  - [Usage in Commands](#usage-in-commands)
- [CLI Examples](#cli-examples)
- [Reference](#reference)
- [Contributing](#contributing)

## Key Features

- **Easy-to-use API:** Develop commands with a simple and intuitive interface.
- **Command Resolution:** Dynamically resolves commands from a specified
  directory, supporting nested and parameterized commands.
- **Flexible Lifecycle:** Control command execution flow with pre-defined hooks.
- **Extensible & Customizable:** Adapt the framework to your specific needs
  through plugins and configuration.
- **TypeScript Support:** Develop robust and predictable CLI applications with
  type safety.

## Installation

```bash
npm install @gud/cli
# or
yarn add @gud/cli
```

## Quick Start

**1. Import and call the `run` function**

```ts
// src/cli.ts
import { run } from '@gud/cli';

// Use argv (minus the binary name) and the default commands directory.
run();

// Or pass in your own + some options
run({
  command: 'deploy dev --watch',
  commandsDir: path.join(__dirname, 'modules'),
  initialData: { ... }
  plugins: [help()]
})
```

**2. Use the `command` function to define your commands in separate files:**

```ts
// src/commands/hello.ts
import { command } from '@gud/cli';

export default command({
  description: 'Say hello!',
  options: {
    name: {
      description: 'The name to greet',
      type: 'string',
      alias: ['n'],
      default: 'World',
    },
  },
  handler: async ({ context, end, next, options }) => {
    // Use the options getter to dynamically retrieve option values.
    const name = options.name({
      prompt: 'Enter your name',
    });

    const message = `Hello, ${name}!`;

    // Use the client to log messages or show arbitrary prompts
    context.client.log(message);

    // Send some data to the next command
    next(message);

    // Or end the command and return some data
    end(message);
  },
});
```

**3. (Optional) Create plugins to extend the framework:**

```ts
import { Plugin } from '@gud/cli';

export function logger(): Plugin {
  return {
    name: 'logger',
    version: '1.0.0',
    description: 'Logs the result of each execution step.',
    init: ({ client, commandString, hooks }) => {
      client.log('🪵 CLI started with command:', commandString);

      hooks.on('beforeCommand', ({ command, data, params }) => {
        client.log('🪵 Executing command:', {
          commandName: command.commandName,
          commandTokens: command.commandTokens,
          commandPath: command.commandPath,
          params,
          data,
        });
      });

      hooks.on('afterCommand', ({ command, data, params }) => {
        client.log('🪵 Finished command:', {
          commandName: command.commandName,
          commandTokens: command.commandTokens,
          commandPath: command.commandPath,
          params,
          data,
        });
      });

      // return true to indicate successful initialization
      return true;
    },
  };
}
```

## Ideal Use Cases

@gud/cli is ideal for developers looking to create efficient, maintainable CLI
applications with minimal fuss. It offers the right balance of functionality and
ease-of-use, making it a practical choice for both simple scripts and more
elaborate command-line tools.

- Build complex CLI applications with nested commands and subcommands.
- Develop interactive and dynamic CLI experiences.
- Integrate with other tools and services through plugins.
- Create reusable and modular command components.

## Running
@gud/cli is designed to be straightforward to run. The primary entry point is
the [`run`](https://ryangoree.github.io/gud-cli/functions/run.html) function,
which orchestrates the command execution flow. It parses and executes commands
based on your configuration, handles plugins, and utilizes hooks for lifecycle
management.

The [`run`](https://ryangoree.github.io/gud-cli/functions/run.html) function
takes an optional [configuration
object](https://ryangoree.github.io/gud-cli/interfaces/RunOptions.html)
allowing you to specify commands, plugins, and hooks. This level of
customization makes it adaptable to various CLI application requirements.

For detailed API information on the
[`run`](https://ryangoree.github.io/gud-cli/functions/run.html) function,
please refer to the [Typedoc
reference](https://ryangoree.github.io/gud-cli/functions/run.html).

## Creating Commands

Commands are the building blocks of your CLI application. Each
command can have its description, options, and a handler function where the
command's logic resides. @gud/cli allows for dynamic command resolution, meaning
your commands can be organized hierarchically, with support for nested and
parameterized commands.

To create a command, use the
[`command`](https://ryangoree.github.io/gud-cli/functions/command.html) factory
function. This function takes an object with your command's metadata, options,
and the handler function. The handler function, which is where the main logic of
your command lives, receives a
[`State`](https://ryangoree.github.io/gud-cli/classes/State.html) object. This
object provides access to parsed options, command parameters, and the ability to
control the command execution flow.

For a comprehensive guide on creating commands, including handling options and
parameters, see the [Typedoc
reference](https://ryangoree.github.io/gud-cli/functions/command.html).

## Creating Plugins

Plugins offer a way to extend and customize the framework's
functionality. A plugin is an object that includes metadata (name, version,
description) and an
[`init`](https://ryangoree.github.io/@gud/cli/interfaces/Plugin.html#init)
function. This function is called during the CLI application's initialization
phase and receives the application's
[`Context`](https://ryangoree.github.io/@gud/cli/classes/Context.html). The
[`Context`](https://ryangoree.github.io/@gud/cli/classes/Context.html) provides
access to hooks, commands, and other critical framework components.

You can create plugins to add new features, integrate with external services,
modify existing behavior, or inject middleware for advanced use cases. The
[`init`](https://ryangoree.github.io/@gud/cli/interfaces/Plugin.html#init)
function should return a boolean indicating whether the initialization was
successful.

For more information on developing plugins, including accessing and modifying
the application context, refer to the [Typedoc
reference](/packages/@gud/cli/docs/interfaces/Plugin.md).

### Examples

- [help](https://ryangoree.github.io/@gud/cli/functions/help-1.html): Adds the
  `--help`/`-h` option and manages printing help messages when the option is
  present or a
  [`UsageError`](https://ryangoree.github.io/@gud/cli/classes/UsageError.html)
  occurs. _Included in the core package._
- [logger](https://ryangoree.github.io/@gud/cli/functions/logger.html): A simple
  logger that logs the result of each execution step. _Included in the core
  package._
- [command-menu](https://github.com/ryangoree/@gud/cli/tree/main/packages/clide-plugin-command-menu):
  Prompts the user to select a subcommand when required.

## Routing and Command Resolution

### Default Commands Directory

If you don't explicitly provide a commands directory when calling the
[`run`](https://ryangoree.github.io/@gud/cli/functions/run.html) function, the
framework automatically attempts to locate the commands directory in two ways:

1. **Current Working Directory:** It first checks for a directory named
   "commands" directly in your current working directory. This is useful if you
   want to keep your "commands" directory at the root of your project.
2. **Caller Directory:** If no "commands" directory is found in the current
   working directory, the framework looks for a "commands" folder adjacent to
   the file that called the
   [`run`](https://ryangoree.github.io/@gud/cli/functions/run.html) function.
   This is helpful for scenarios where your CLI script lives in a specific
   directory within your project (e.g., "cli/bin.js") and the commands are kept
   in a sibling directory called "cli/commands".

### Command File/Module Resolution Steps

**1. Parse Command String:**

- The command string is split into tokens separated by spaces.
- The first token is assumed to be the command name.

**2. Find Command File:**

- @gud/cli attempts to locate a file with the same name as the command in the
  specified commands directory.
- If the file exists, it imports the module and checks for a default export,
  which should be the
  [`CommandModule`](https://ryangoree.github.io/@gud/cli/types/CommandModule.html)
  object.

**3. Handle Non-existent Files:**

- If the command file isn't found directly:
  - The provided path is checked to ensure it's a directory. If so, it treats it
    as a pass-through command for further resolution.
  - If not, It attempts to resolve a parameterized command file (e.g.,
    `[param].ts`).

**4. Handle Parameterized Commands:**

- Parameterized commands use filenames like `[param].ts` or `[...param].ts` to
  capture arguments.
- The filename is parsed to identify the parameter name and spread operator (if
  present).
- It attempts to import the corresponding file and checks for a default export.
- For spread operator commands, all remaining tokens are passed as the parameter
  value.

**5. Prepare Resolved Command:**

Once a command file is found:

- All options up to the next command token are parsed and removed from the
  remaining command string.
- A `resolveNext` function is added if the command isn't the last one in the
  string for further resolution of subcommands.
- If the command won't be executed (e.g., `isMiddleware` is `false`), its
  handler is replaced with a pass-through function.

#### Key Points

- The resolution process is flexible, handling various command formats and
  directory structures.
- Detailed error messages guide users in case of resolution issues.

### Examples

**1. Basic Command:**

```sh
mycli list
```

The framework searches for `list.js` in the commands directory. If found, it
imports the module and executes its handler.

![Basic Command
Files](https://raw.githubusercontent.com/ryangoree/gud-cli/main/assets/basic-command-resolution.png)

**2. Pass-through Command:**

```sh
mycli settings ...
```

The framework identifies `settings` as a directory, treats it as a pass-through
command, and expects further command resolution within the `settings` directory.

![Directory
Files](https://raw.githubusercontent.com/ryangoree/gud-cli/main/assets/directory-resolution.png)

**4. Subcommand:**

```sh
mycli users create
```

- Either `users.js` or a `users` directory is first resolved, then `create` is
  identified as a subcommand.
- The framework looks for `create.js` in the `users` directory.

![Subcommand Resolution
Files](https://raw.githubusercontent.com/ryangoree/gud-cli/main/assets/subcommand-resolution.png)

**3. Parameterized Command:**

```sh
mycli deploy prod
```

- After resolving `deploy`, The framework searches for `prod.ts` in the `deploy`
  directory.
- If not found, the framework will look for a parameterized file name and finds
  `[environment].ts`.
- The module is imported and the `environment` is set to `prod` in the
  [`State.params`](https://ryangoree.github.io/gud-cli/classes/State.html#params).

![Parameterized Command
Files](https://raw.githubusercontent.com/ryangoree/gud-cli/main/assets/parameterized-command.png)

### Key Points

- @gud/cli prioritizes direct file name matching for each token, followed by
  parameterized file names.
- Plugin and initial command options are removed before further processing.
- Resolution continues within a directory matching the name of the previously
  resolved command.

This flexible approach allows for intuitive command structures and efficient
execution, making it ideal for building versatile CLI applications.

## Dynamic Option Handling

@gud/cli introduces a dynamic and user-centric approach to handling command
options, distinguishing it from many other CLI frameworks. Instead of validating
options before execution, the
[`OptionsGetter`](https://ryangoree.github.io/@gud/cli/types/OptionsGetter.html)
allows command handlers to address missing or invalid options dynamically,
enhancing the user experience and offering more flexibility:

- **Lazy Evaluation:** Options are not immediately validated upon command
  execution. Instead, they are evaluated dynamically when accessed by the
  command handler.
- **User Prompts:** If an option is required but not provided, command handlers
  can prompt the user for input, allowing for interactive CLI experiences. This
  eliminates the need for remembering all options beforehand and provides a more
  guided experience.
- **Option Getters:** Each option is represented by a `getter` function that
  dynamically retrieves its value. Getters can prompt users for missing values,
  validate input, and provide default values if needed.

### Benefits

- **Enhanced Flexibility:** Allows command handlers to deal with options in a
  context-sensitive manner, enhancing the adaptability of commands.
- **Improved User Experience:** By deferring validation and potentially
  prompting for input, Clide-JS makes CLI tools more user-friendly and
  interactive.
- **Robust Error Handling:** Dynamic validation allows for more informative and
  contextual error messages, improving debugging and user guidance.

### Usage in Commands

When creating commands, the
[`OptionsGetter`](https://ryangoree.github.io/clide-js/types/OptionsGetter.html)
provides a straightforward and intuitive interface for accessing and handling
options.

```ts
// Example usage in a command
  options: {
    n: {
      type: 'string',
      alias: ['name'],
    },
    a: {
      type: 'string',
      alias: ['alt-name'],
    }
  },
  handler: async ({ options, next }) => {

    // Getter functions
    const name = await options.n();
    const altName = await options.a();

    // Alias getter functions
    const name = await options.name();
    const altName = await options.altName();

    // Get function
    const { name, altName } = options.get('name', 'alt-name');

    // Direct values access
    const { name, altName } = options.values;
  },
```

## CLI Examples

- [GH Scripts](https://github.com/ryangoree/gh-scripts) - A collection of misc GH scripts.
- [@delvtech/council-cli](https://github.com/delvtech/council-kit/tree/main/packages/council-cli) - A CLI for building on the [Council](https://github.com/delvtech/council) governance protocol.

*Visit the [examples](https://github.com/ryangoree/clide-js/tree/main/examples) directory for some basic setups.*

## Reference

Clide-JS uses Typedoc to autogenerate detailed references for each major
component of the framework. See the [Typedoc
reference](https://ryangoree.github.io/clide-js/modules.html) for a full
breakdown of Clide-JS's APIs.

## Contributing

Clide-JS is a new framework still under development. Contributions are welcome!
Check the [Contributing Guide](./.github/CONTRIBUTING.md) to get started.
