---
"@gud/cli": patch
---

Fixed subcommands being resolved from the wrong position when a leading option or option value matched the subcommand's name, e.g., `deploy --target run run` resolving `run` twice. `removeLeadingOptions()` now stops at the first argument that isn't an option or an option's value instead of searching for the next command.
