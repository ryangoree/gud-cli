const { command } = require('@gud/cli');

module.exports = command({
  description: 'Say hello',
  options: {
    name: {
      type: 'string',
      description: 'Name to say hello to',
      alias: ['n'],
      default: 'World',
    },
  },
  isMiddleware: false,
  async handler({ context, options, next }) {
    const name = options.values.name;
    context.client.log(`Hello ${name}!`);
    next();
  },
});
