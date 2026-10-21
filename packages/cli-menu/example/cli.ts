import { help, run } from "@gud/cli";
import { menu } from "#/menu.js";

run({
  plugins: [
    help(),
    menu({
      title: "Command Menu",
      enabled: (options) => !options.help,
    }),
  ],
});
