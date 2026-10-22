---
"@gud/cli": patch
---

Fixed arguments containing spaces being split apart when `run()` is given a command array (including the default `process.argv`), e.g., `--name "Bob Smith"` failing with `Command "Smith" not found`. `joinTokens()` now quotes tokens with spaces whenever there's more than one token, not only when it's given more than one argument.
