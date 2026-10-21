---
"@gud/cli": patch
---

Fixed the help usage line showing a partial path to the executed script instead of the CLI name. The name defaults to the matching `bin` entry in the CLI's package.json, so it's correct when package managers install a shim instead of a symlink (pnpm, and npm or yarn on Windows), and falls back to the script's file name. It can also be set with the new `name` option on `run()` and `Context`, and the lookup is exported as `getBinName`. Also made `getHelp`, `plugin`, and `PluginError` runtime exports; they were previously exported as types only.
