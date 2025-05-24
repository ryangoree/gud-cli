import { command } from 'src/core/command';

export default command({
  handler: ({ data, client }) => {
    client.log(`Received data: ${JSON.stringify(data)}`);
  },
});
