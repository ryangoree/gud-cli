import type { Plugin, PluginInfo } from 'src/core/plugin';
import type { Eval, Replace, Writable } from 'src/utils/types';

export function createStubPluginInfo<const T extends Partial<PluginInfo> = {}>(
  overrides = {} as T,
): Eval<Replace<PluginInfo, Writable<T>>> {
  return {
    name: 'mock-plugin',
    version: '0.0.0',
    ...overrides,
  };
}

export function createStubPlugin<const T extends Partial<Plugin> = {}>(
  overrides = {} as T,
): Eval<Replace<Plugin, Writable<T>>> {
  return {
    name: 'mock-plugin',
    version: '0.0.0',
    init: () => {},
    ...overrides,
  };
}
