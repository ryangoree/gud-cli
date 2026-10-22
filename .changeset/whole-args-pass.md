---
"@gud/cli": patch
---

Fixed quotes, escapes, and repeated spaces in arguments being lost (e.g., `--msg 'say "hi"'` becoming `say`) by passing arguments through resolution and parsing as an array instead of a command string. `Context` has a new `argv` property and accepts `argv` instead of `commandString`, resolved commands have `remainingArgv`, the `beforeResolve`, `beforeResolveNext`, and `beforeParse` hooks receive `argv`, and `resolveCommand()`, `context.resolveCommand()`, `context.parseCommand()`, and `removeLeadingOptions()` accept arrays. `ParseCommandFn` now receives `string | string[]`, and the CLI passes it arrays, so custom parse functions need to handle arrays; support for command strings will be removed in the next major version. `splitTokens()` now ignores repeated delimiters.
