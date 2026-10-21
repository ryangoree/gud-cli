import { command } from "@gud/cli";

export default command({
  description: "Drive a taxi",
  handler: ({ context, data }) => {
    context.client.log(`🚕 Vroom vroom! (speed: ${data || 60}mph)`);
  },
});
