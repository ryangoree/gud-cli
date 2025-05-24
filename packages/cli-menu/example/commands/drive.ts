import { command } from '@gud/cli';

export default command({
  description: 'Drive a car',
  requiresSubcommand: true,
  options: {
    speed: {
      description: 'How fast to drive',
      alias: ['s'],
      type: 'number',
    },
  },
  handler: async ({ options, next }) => {
    const speed = await options.speed({
      prompt: 'How fast do you want to drive?',
    });

    next(speed);
  },
});
