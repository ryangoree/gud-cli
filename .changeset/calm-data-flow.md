---
"@gud/cli": patch
---

Added `setData()` to the command state to set the data without continuing to the next command, and an optional result type parameter to `fork()`. Fixed `beforeCommand` hooks' `setData()` not reaching the command handler, and `afterCommand` hooks receiving the command's input instead of its output; `afterCommand` hooks' `setData()` now also overrides the data when the command calls `next()` or `end()`. Documented that passing `undefined` to `next()` or `end()` keeps the current data and `null` clears it.
