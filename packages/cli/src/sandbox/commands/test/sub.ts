import { command } from 'src/core/command';

export default command({
  handler: async ({ client, data }) => {
    client.log(`Sub data: ${JSON.stringify(data)}`);
  },
});
