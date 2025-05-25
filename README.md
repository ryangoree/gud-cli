# Gud CLI

**Build delightful command-line tools that your users will actually enjoy
using.**

Gud CLI is a modern TypeScript framework that makes creating interactive CLI
applications effortless. Instead of forcing users to memorize complex commands,
your CLI can guide them through an intuitive, conversational experience.

```sh
npm install @gud/cli
```

## Why Gud CLI?

- **🎯 User-first design** – Missing a required option? Gud CLI automatically
  prompts for it instead of showing cryptic error messages.
- **📁 Intuitive organization** – Commands are just files in folders. Want
  nested commands? Create nested folders. It's that simple.
- **🔧 TypeScript-powered** – Full type safety with intelligent autocompletion
  for options and parameters.
- **🔌 Extensible** – Plugin system and lifecycle hooks let you customize
  everything without touching core logic.

## Quick Start

### 1. Create your CLI entry point

```ts
// src/cli.ts
import { run } from '@gud/cli';

// Uses ./commands by default
run();
```

### 2. Add your first command

```ts
// src/commands/hello.ts
import { command } from '@gud/cli';

export default command({
  description: 'Say hello to someone',
  options: {
    name: {
      description: 'Who to greet',
      type: 'string',
      default: 'World',
    },
  },
  handler: async ({ options, client }) => {
    // Prompts if you pass the prompt option
    const name = await options.name({
      prompt: "What's your name?",
    });
    
    client.log(`Hello, ${name}! 👋`);
  },
});
```

### 3. Run it

```bash
$ tsx src/cli.ts hello
? What's your name? › Alice
Hello, Alice! 👋
```

## What makes it different?

### Interactive by default

Traditional CLIs fail hard when options are missing:

```sh
$ mycli deploy
Error: Missing required option --environment
```

Gud CLI can guide users through required options:

```bash
$ mycli deploy
? Enter environment › 
❯ dev
  staging  
  prod
```

*Add the [command menu
plugin](https://github.com/ryangoree/gud-cli/tree/main/packages/cli-menu) to
prompt for missing subcommands too.*

### File-based routing

Organize commands like you organize code:

```
commands/
├── hello.ts           # mycli hello
├── users/
│   ├── list.ts        # mycli users list
│   ├── create.ts      # mycli users create
│   └── [id]/
│       ├── show.ts    # mycli users 123 show
│       └── delete.ts  # mycli users 123 delete
└── deploy/
    └── [env].ts       # mycli deploy prod
```

### TypeScript-first

Get full intellisense and type checking:

```ts
export default command({
  options: {
    port: { type: 'number', default: 3000 },
    watch: { type: 'boolean' }
  },
  handler: async ({ options }) => {
    const port = await options.port(); // TypeScript knows this is number
    const watch = await options.watch(); // TypeScript knows this is boolean | undefined
  }
});
```

## Examples

### Interactive deployment

```ts
// commands/deploy.ts
export default command({
  options: {
    environment: {
      type: 'string',
      choices: ['dev', 'staging', 'prod'],
      required: true
    },
    confirm: { type: 'boolean', default: false }
  },
  handler: async ({ options, client }) => {
    // Prompts "Enter environment" because required: true
    const env = await options.environment();
    
    const confirmed = await options.confirm({
      prompt: `Deploy to ${env}?`,
    });
    
    if (!confirmed) {
      client.log('Deployment cancelled');
      return;
    }
    
    client.log(`🚀 Deploying to ${env}...`);
  }
});
```

### Parameterized commands

```ts
// commands/users/[id]/delete.ts
export default command({
  description: 'Delete a user by ID',
  options: {
    force: { type: 'boolean', description: 'Skip confirmation' }
  },
  handler: async ({ params, options, client }) => {
    const userId = params.id; // From the command: users/123/delete
    const force = await options.force();
    
    if (!force) {
      const confirmed = await client.confirm(
        `Really delete user ${userId}?`
      );
      if (!confirmed) return;
    }
    
    // Delete user logic here
    client.log(`✅ User ${userId} deleted`);
  }
});
```

## Advanced Features

### Plugins

Extend functionality with plugins:

```ts
import { run, help, logger } from '@gud/cli';

run({
  plugins: [
    help(), // Adds --help support
    logger(), // Logs command execution
    yourCustomPlugin()
  ]
});
```

### Lifecycle Hooks

Hook into command execution:

```ts
import { run } from '@gud/cli';

run({
  hooks: {
    beforeCommand: ({ command, data }) => {
      console.log(`Executing: ${command.commandName}`);
    },
    afterCommand: ({ command, data }) => {
      console.log(`Finished: ${command.commandName}`);
    }
  }
});
```

### Flexible Option Handling

```ts
export default command({
  options: {
    username: {
      type: 'string',
      conflicts: ['email'],
    },
    email: {
      type: 'string', 
      conflicts: ['username'],
    }
  },
  handler: async ({ options, client }) => {
    let account = await options.username();

    if (!account) {
      account = await options.email({
        prompt: 'Enter your email',
        validate: (value) => {
          if (!value?.includes('@')) {
            return 'Must be a valid email';
          }
          return true;
        },
      });
    }

    client.log(`Querying account: ${account}`);
  }
});
```

## Built for Scale

Gud CLI grows with your project:

- **Simple scripts**: Just `run()` and a single command file
- **Complex tools**: Nested commands, plugins, custom validation
- **Team CLIs**: Shared plugins, consistent patterns, full TypeScript support

Whether you're building a quick utility or the next great developer tool, Gud
CLI gives you the structure and flexibility you need.

## Migration Guide

### From Commander.js

```ts
// Before (Commander)
program
  .command('hello')
  .option('-n, --name <name>', 'name to greet')
  .action((options) => {
    console.log(`Hello ${options.name || 'World'}`);
  });

// After (Gud CLI)
export default command({
  options: {
    name: {
      alias: ['n'],
      type: 'string',
      description: 'Name to greet',
      default: 'World',
    },
  },
  handler: async ({ options }) => {
    const name = await options.name();
    console.log(`Hello ${name}`);
  },
});
```

### From yargs

```ts
// Before (yargs)
yargs(hideBin(process.argv))
  .command(
    'deploy <env>',
    'Deploy to environment',
    {
      env: { describe: 'Environment name', type: 'string' },
    },
    (argv) => {
      console.log(`Deploying to ${argv.env}`);
    },
  );

// After (Gud CLI) - file: commands/deploy/[env].ts
export default command({
  description: 'Deploy to environment',
  handler: async ({ params }) => {
    console.log(`Deploying to ${params.env}`);
  }
});
```

## Community

- **Examples**: Check out [real-world examples](examples/) 
- **Contributing**: See our [Contributing Guide](.github/CONTRIBUTING.md)
- **Issues**: Found a bug? [Let us
  know](https://github.com/ryangoree/gud-cli/issues)

## Reference

- [API Documentation](https://ryangoree.github.io/gud-cli/)
- [Examples Repository](examples/)
- [Plugin Development Guide](docs/plugins.md)

---

**Ready to build better CLIs?** `npm install @gud/cli`