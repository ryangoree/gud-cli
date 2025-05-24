import type { Context } from 'src/core/context';
import type { Plugin, PluginInfo } from 'src/core/plugin';
import { vi } from 'vitest';

export const mockPluginInfo = {
  name: 'mock-plugin',
  version: '0.0.0',
} as const satisfies PluginInfo;

export const mockPlugin = {
  ...mockPluginInfo,
  init: vi.fn(() => true),
} as const satisfies Plugin;

export const notReadyMockPlugin = {
  ...mockPluginInfo,
  isReady: false,
} as const satisfies Context['plugins'][string];

export const readyMockPlugin = {
  ...mockPluginInfo,
  isReady: true,
} as const satisfies Context['plugins'][string];
