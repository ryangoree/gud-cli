import { command } from '@gud/cli';

export default command({
  description: 'Get a greeting',
  options: {
    name: {
      description: 'Your name',
      alias: ['n'],
      type: 'string',
      default: 'World',
    },
  },
  handler: async ({ options, end }) => {
    const name = await options.name({
      prompt: "What's your name?",
    });

    end(`Hello, ${name}!`);
  },
});
