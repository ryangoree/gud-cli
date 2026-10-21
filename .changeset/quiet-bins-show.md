---
"@gud/cli": patch
---

Fixed the help usage line showing a partial path to the executed script instead of the CLI name. The name defaults to the script's file name and can be set with the new `name` option on `run()` and `Context`. Also made `getHelp`, `plugin`, and `PluginError` runtime exports; they were previously exported as types only.
