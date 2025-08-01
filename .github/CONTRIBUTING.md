# Contributing to Gud CLI

Thank you for your interest in contributing! 🥹

If you're unsure where to start, or if a feature would be welcomed, open an
issue and start a conversation.

- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Installing Dependencies](#installing-dependencies)
  - [Working in a Monorepo](#working-in-a-monorepo)
- [Source Code Overview](#source-code-overview)
  - [Repo Organization](#repo-organization)
  - [`@gud/cli` Source Code](#gudcli-source-code)
    - [Folder Organization](#folder-organization)
- [Testing](#testing)
- [Before Opening a PR](#before-opening-a-pr)


## Setup

### Prerequisites

- [Node.js](https://nodejs.org) 24.x
- [Yarn](https://yarnpkg.com)

You can install Node.js using [nvm](https://github.com/nvm-sh/nvm). After
following the [installation
instructions](https://github.com/nvm-sh/nvm#installing-and-updating), run the
following commands to install and use Node.js 24.x:

```sh
 # run from the root of the project
nvm install
nvm use
```

If Yarn is not already installed, you can install it using npm:

```sh
npm install --global yarn
```

### Installing Dependencies

After the prerequisites are installed, install all package and development
dependencies using Yarn:

```sh
yarn  # run from the root of the project
```

### Working in a Monorepo

This repo is a [Yarn
Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/) monorepo using
[Turborepo](https://turbo.build/repo/docs). The root
[`package.json`](../package.json) file contains a list of workspaces, each of
which is it's own package with it's own `package.json` file, and `turbo` scripts
which are configured in [turbo.json](../turbo.json).

You can work with the root `package.json` mostly like you would with any other:

```sh
yarn <script-name>

# use the -W flag when installing root dependencies
yarn -W add <package-name>
```

To target a specific package, use the `workspace` command:

```sh
yarn workspace <package-name> <script-name>
yarn workspace <package-name> add <package-name>
```

## Source Code Overview

A brief overview of the gud-cli repo.

### Repo Organization

```sh
.changeset/ # changesets and config
.github/ # files for GitHub, including actions and workflows
.vscode/ # VSCode project settings
assets/ # assets for the README.md
examples/ # example CLIs using @gud/cli
notes/ # misc notes
packages/ # package directories
├── cli/ # core package
├── cli-menu/ # a plugin to prompt users for missing subcommands
└── extras/ # utilities from CLIs I've written in the past that might get used later.
```

The 2 published packages are [@gud/cli](https://www.npmjs.com/package/@gud/cli)
and [@gud/cli-menu](https://www.npmjs.com/package/@gud/cli-menu)

### `@gud/cli` Source Code

The [cli](../packages/cli) package contains the core code for the `@gud/cli`
framework.

#### Folder Organization

```sh
packages/cli/
├── src/
│   ├── core/ # the main code for @gud/cli
│   ├── exports/ # the public API of the @gud/cli package
│   ├── plugins/ # built-in plugins that enable optional features like help
│   ├── sandbox/ # used as a sandbox to test features
│   └── utils/ # utilities used throughout, should not reference any code outside utils
├── .gitignore
├── CHANGELOG.md # auto-generated changelog from changesets
├── README.md
├── package.json
├── tsconfig.json # typescript config
├── tsup.config.ts # build config
├── typedoc.json # docs generator config
└── vitest.config.ts # testing config
```

Everything revolves around the [context](../packages/cli/src/core/context.ts)
module which acts as the orchestrator for the entire command lifecycle,
preparing the command for execution, and providing a central method for throwing
errors and exiting the process.

It makes use of the other modules in core for most of it's functionality:

- [hooks](../packages/cli/src/core/hooks.ts): Contains the `HookRegistry` which
  is used by `Context` and `State` to call hooks from plugins during lifecycle
  events.
- [client](../packages/cli/src/core/client.ts): Contains a `Client` class for
  logging and prompting. I would like to build this out more to work with
  different `stdin`, `stdout`, and `stderr` settings.
- [resolve](../packages/cli/src/core/resolve.ts): Contains functions to locate
  and import command modules based on a command string.
- [state](../packages/cli/src/core/state.ts): Contains the `State` class which
  manages the state of command execution with mechanisms to progress through the
  steps, handle state transition, and manage the lifecycle of shared command
  data.

The [state](../packages/cli/src/core/state.ts) module uses
[options-getter](../packages/cli/src/core/options/options-getter.ts) to create
an `OptionsGetter` for use in command handlers during execution. The
`OptionsGetter` is an object with methods on it for every option with type safe
keys for the option key and it's aliases. These methods are used to dyanamically
fetch option values with optional prompt fallbacks.

The [help](../packages/cli/src/core/help.ts) module generates help text for a
command context and is used by the built-in [help
plugin](../packages/cli/src/plugins/help.ts).

The [run](../packages/cli/src/core/run.ts) module contains the `run` function
which is the primary entry to framework, used in the bin file of CLIs. It
provides a simple unified API for running a CLI with the framework. It manages
registering hooks, creating a `Context` instance, adding options, preparing and
executing the context, and catching errors.

Lastly in core, the [command](../packages/cli/src/core/command.ts) module
contains a factory function for creating type safe command modules. These are
used in the command files of CLIs and should be their default export.

## Testing

To run all tests, use the `test` script in the root `package.json`:

```sh
yarn test
```

To run tests for a specific package, use the `workspace` command:

```
yarn workspace <package-name> test
```

## Before Opening a PR

This repo uses [changesets](https://github.com/changesets/changesets) to manage
versioning and changelogs.

Before opening a PR, run:

```sh
yarn changeset
```

Follow the prompts to describe the changes you've made using the
[semver](https://semver.org/) versioning scheme and commit the generated
changeset file.
