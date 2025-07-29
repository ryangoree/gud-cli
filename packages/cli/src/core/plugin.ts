import { CliError, type CliErrorOptions } from 'src/core/errors';
import type { AnyObject, MaybePromise } from 'src/utils/types';
import type { Context } from './context';

/**
 * A plugin for @gud/cli
 *
 * @group Plugin
 */
export type Plugin<TMeta extends AnyObject = AnyObject> = PluginInfo<TMeta> & {
  /**
   * Initialize the plugin.
   *
   * @param context - The context the plugin is being initialized in.
   */
  init?: (context: Context) => MaybePromise<void>;
};

/**
 * Information about a plugin.
 *
 * @group Plugin
 */
export type PluginInfo<TMeta extends AnyObject = AnyObject> = {
  /**
   * The name of the plugin.
   */
  name: string;
  /**
   * The version of the plugin, which can be helpful for debugging or
   * compatibility checks by other plugins or the CLI itself.
   *
   * @default '0.0.0'
   */
  version?: string;
  /**
   * A short description of the plugin to provide context about what the
   * plugin does.
   */
  description?: string;
} & ({} extends TMeta
  ? PluginMetaOption<TMeta>
  : Required<PluginMetaOption<TMeta>>);

/**
 * Factory function to create a {@linkcode Plugin} with strong typing.
 *
 * @group Plugin
 */
export function plugin<TMeta extends AnyObject = AnyObject>(
  plugin: Plugin<TMeta>,
): Plugin<TMeta> {
  return plugin;
}

/**
 * An error that can be thrown by a plugin.
 *
 * @group Errors
 */
export class PluginError extends CliError {
  constructor(error: unknown, options?: CliErrorOptions) {
    super(error, {
      name: 'PluginError',
      ...options,
    });
  }
}

// Internal //

interface PluginMetaOption<TMeta extends AnyObject = AnyObject> {
  /**
   * Additional metadata about the plugin that doesn't fit in the standard
   * fields.
   *
   * Note: Plugin info on the {@linkcode Context} object will be frozen after
   * the plugin is initialized. However, the freeze is shallow, so the fields of
   * this object will be mutable by default.
   */
  meta?: TMeta;
}
