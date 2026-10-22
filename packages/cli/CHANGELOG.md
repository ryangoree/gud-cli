# @gud/cli

## 1.0.0-beta.8

### Patch Changes

- a7d101e: Added `setData()` to the command state to set the data without continuing to the next command, and an optional result type parameter to `fork()`. Fixed `beforeCommand` hooks' `setData()` not reaching the command handler, and `afterCommand` hooks receiving the command's input instead of its output; `afterCommand` hooks' `setData()` now also overrides the data when the command calls `next()` or `end()`. Documented that passing `undefined` to `next()` or `end()` keeps the current data and `null` clears it.
- e5b36fe: Fixed option values of commands with `isMiddleware: false` being resolved as subcommands, e.g., `hello --name Bob` failing with `Command "Bob" not found`. Leading options are now removed using the command's options config regardless of `isMiddleware`.
- f0e7af4: Fixed the help usage line showing a partial path to the executed script instead of the CLI name. The name defaults to the matching `bin` entry in the CLI's package.json, so it's correct when package managers install a shim instead of a symlink (pnpm, and npm or yarn on Windows), and falls back to the script's file name. It can also be set with the new `name` option on `run()` and `Context`, and the lookup is exported as `getBinName`. Also made `getHelp`, `plugin`, and `PluginError` runtime exports; they were previously exported as types only.
- 7a13c3f: Fixed arguments containing spaces being split apart when `run()` is given a command array (including the default `process.argv`), e.g., `--name "Bob Smith"` failing with `Command "Smith" not found`. `joinTokens()` now quotes tokens with spaces whenever there's more than one token, not only when it's given more than one argument.
- 1658940: Fixed subcommands being resolved from the wrong position when a leading option or option value matched the subcommand's name, e.g., `deploy --target run run` resolving `run` twice. `removeLeadingOptions()` now stops at the first argument that isn't an option or an option's value instead of searching for the next command.
- b860d92: Fixed quotes, escapes, and repeated spaces in arguments being lost (e.g., `--msg 'say "hi"'` becoming `say`) by passing arguments through resolution and parsing as an array instead of a command string. `Context` has a new `argv` property and accepts `argv` instead of `commandString`, resolved commands have `remainingArgv`, the `beforeResolve`, `beforeResolveNext`, and `beforeParse` hooks receive `argv`, and `resolveCommand()`, `context.resolveCommand()`, `context.parseCommand()`, and `removeLeadingOptions()` accept arrays. `ParseCommandFn` now receives `string | string[]`, and the CLI passes it arrays, so custom parse functions need to handle arrays; support for command strings will be removed in the next major version. `splitTokens()` now ignores repeated delimiters.

## 1.0.0-beta.7

### Patch Changes

- ff2ce10: Fixed the doc comment for `options.type`.
- dbb1db9: Patched package.json types and corrected license field.

## 1.0.0-beta.6

### Patch Changes

- fb0ee0e: Bumped deps.

## 1.0.0-beta.5

### Patch Changes

- 60b73fa: Added missing README.

## 1.0.0-beta.4

### Patch Changes

- 613b97d: Patched bug in `removeFileExtension`
- 13bd423: Bump deps

## 1.0.0-beta.3

### Patch Changes

- a8b5196: Patched the help menu to display falsey default values.

## 1.0.0-beta.2

### Patch Changes

- 0c41eee: Updated the options getter to avoid prompting when a default value is provided for required options unless a prompt is explicitly passed.

## 1.0.0-beta.1

### Minor Changes

- 2cb1f23: Added support for select prompts when the option type is "number" and added type inference to the choice values based on the option type.

## 1.0.0-beta.0

### Major Changes

- 0175765: Initial release of updated packages.
