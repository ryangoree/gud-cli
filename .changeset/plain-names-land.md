---
"@gud/cli": patch
---

Fixed option values of commands with `isMiddleware: false` being resolved as subcommands, e.g., `hello --name Bob` failing with `Command "Bob" not found`. Leading options are now removed using the command's options config regardless of `isMiddleware`.
