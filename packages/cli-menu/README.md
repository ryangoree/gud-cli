# Gud CLI Command Menu Plugin# Gud CLI

[![GitHub](https://img.shields.io/badge/ryangoree%2Fgud--cli--menu-151b23?logo=github)](https://github.com/ryangoree/gud-cli/tree/main/packages/cli-menu)
[![NPM
Version](https://img.shields.io/badge/%40gud%2Fcli--menu-cb3837?logo=npm)](https://npmjs.com/package/@gud/cli-menu)
[![License:
Apache-2.0](https://img.shields.io/badge/Apache%202.0-23454d?logo=apache)](./LICENSE)

A [Gud CLI](https://github.com/ryangoree/gud-cli/tree/main) plugin that
prompts the user to select a subcommand when required.

```sh
npm install @gud/cli-menu
```

```ts
import { run } from '@gud/cli';
import { menu } from '@gud/cli-menu';

run({
  plugins: [
    menu({
      title: 'Foo CLI',
      titleColors: ['#D89DFF', '#519BFF'],
    })
  ],
});
```

![Title menu](./assets/opening-menu.png)

After the user selects a subcommand, the command will be resolved and if it also
requires a subcommand, the user will be prompted again, but this time can also
select `↩ back` to go back to the previous menu. This will continue until the
user has selected all required subcommands.

![Submenu](./assets/submenu.png)
