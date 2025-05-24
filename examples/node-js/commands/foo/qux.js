const { command } = require('@gud/cli');

module.exports = command({
  description: 'Praesent malesuada ante nec feugiat pulvinar.',
  options: {
    name: {
      type: 'string',
      description: 'Name to say hello to',
      alias: ['n'],
      default: 'World',
    },
  },
  async handler({ context, options, next }) {
    const name = options.values.name;
    context.client.log(`Hello ${name}!`);
    next();
  },
});
