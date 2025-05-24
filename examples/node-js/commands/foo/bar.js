const { command } = require('@gud/cli');

module.exports = command({
  description: 'Donec arcu turpis, interdum at porta in, posuere in sapien.',
  options: {
    name: {
      type: 'string',
      description: 'Name to say hello to',
      alias: ['n'],
      default: 'World',
    },
  },
  async handler({ context, options, next }) {
    throw new Error('This is an error');
    // const name = options.values.name;
    // context.client.log(`Hello ${name}!`);
    // next();
  },
});
