import { type ParsedCommand, parseCommand } from 'src/core/parse';
import { unmockAllCommandModules } from 'src/utils/testing/command-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('parse', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    unmockAllCommandModules();
  });

  it('parses basic command tokens and options', async () => {
    const commandString =
      'foo bar -a -b=bval -c="cval1 cval2" -d dval -e "eval1 eval2" --f-word --g-word=gval --h-word="hval1 hval2" --i-word ival --j-word "jval1 jval2"';

    expect(
      await parseCommand(commandString, {
        a: { type: 'boolean' },
        b: { type: 'string' },
        c: { type: 'string' },
        d: { type: 'string' },
        e: { type: 'string' },
        'f-word': { type: 'boolean' },
        'g-word': { type: 'string' },
        'h-word': { type: 'string' },
        'i-word': { type: 'string' },
        'j-word': { type: 'string' },
      }),
    ).toMatchObject({
      tokens: ['foo', 'bar'],
      options: {
        a: true,
        b: 'bval',
        c: 'cval1 cval2',
        d: 'dval',
        e: 'eval1 eval2',
        'f-word': true,
        'g-word': 'gval',
        'h-word': 'hval1 hval2',
        'i-word': 'ival',
        'j-word': 'jval1 jval2',
      },
    } as ParsedCommand);
  });

  // Types
  it('parses number options', async () => {
    const commandString =
      'foo -a 1 -b 1.2 -c .3 -d 1e3 -e 1.2e3 -f 1.2e-3 -g -1 -h 1.0';

    expect(
      await parseCommand(commandString, {
        a: { type: 'number' },
        b: { type: 'number' },
        c: { type: 'number' },
        d: { type: 'number' },
        e: { type: 'number' },
        f: { type: 'number' },
        g: { type: 'number' },
        h: { type: 'number' },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: 1,
        b: 1.2,
        c: 0.3,
        d: 1000,
        e: 1200,
        f: 0.0012,
        g: -1,
        h: 1,
      },
    } as ParsedCommand);
  });

  it('parses array options', async () => {
    const commandString = 'foo -a=one two three -b do re mi';

    expect(
      await parseCommand(commandString, {
        a: { type: 'array' },
        b: { type: 'array' },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: ['one', 'two', 'three'],
        b: ['do', 're', 'mi'],
      },
    } as ParsedCommand);
  });

  it('parses secret options', async () => {
    const command = 'foo -a secret';

    expect(
      await parseCommand(command, {
        a: { type: 'secret' },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: 'secret',
      },
    } as ParsedCommand);
  });

  it('parses unknown options as booleans', async () => {
    const commandString = 'foo -a -b -c';

    expect(
      await parseCommand(commandString, {
        a: { type: 'boolean' },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: true,
        b: true,
        c: true,
      },
    } as ParsedCommand);
  });

  // Options
  it('parses options with aliases', async () => {
    const commandString = 'foo --alpha aval --beta bval';

    expect(
      await parseCommand(commandString, {
        a: { type: 'string', alias: ['alpha'] },
        b: { type: 'string', alias: ['beta'] },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: 'aval',
        b: 'bval',
      },
    } as ParsedCommand);
  });

  it('parses array options with string values', async () => {
    const commandString = 'foo -a 1 2';

    expect(
      await parseCommand(commandString, {
        a: { type: 'array', string: true },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: ['1', '2'],
      },
    } as ParsedCommand);
  });

  it('parses options with nargs', async () => {
    const commandString = 'foo -a bar baz qux';

    expect(
      await parseCommand(commandString, {
        a: { type: 'string', nargs: 2 },
      }),
    ).toMatchObject({
      tokens: ['foo', 'qux'],
      options: {
        a: ['bar', 'baz'],
      },
    } as ParsedCommand);
  });

  it('parses quoted strings with spaces', async () => {
    const commandString = 'foo -a="hello world"';

    expect(
      await parseCommand(commandString, {
        a: { type: 'string' },
      }),
    ).toMatchObject({
      tokens: ['foo'],
      options: {
        a: 'hello world',
      },
    } as ParsedCommand);
  });
});
