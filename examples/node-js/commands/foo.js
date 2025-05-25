const { command, CliError } = require('@gud/cli');

module.exports = command({
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  handler: () => {
    throw new CliError(
      new Error('This is an error message', {
        cause: new Error('This is the cause of the error'),
      }),
    );
  },
});
