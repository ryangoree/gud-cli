import type { AnyObject, MaybePromise } from 'src/utils/types';
import type { Context } from './context';

/**
 * A plugin for @gud/cli
 * @group Plugin
 */
export type Plugin<TMeta extends AnyObject = AnyObject> = PluginInfo<TMeta> &
  PluginInitOption;

/**
 * Information about a plugin.
 * @catgory Core
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
 */
export function plugin<TMeta extends AnyObject = AnyObject>(
  plugin: PluginInfo<TMeta> & Partial<PluginInitOption>,
): Plugin<TMeta> {
  return {
    ...plugin,
    init: plugin.init ?? (async () => true),
  };
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

interface PluginInitOption {
  /**
   * Initialize the plugin.
   * @param context - The context the plugin is being initialized in.
   * @returns A boolean or promise that resolves to a boolean indicating
   * whether the plugin was successfully initialized.
   */
  init: (context: Context) => MaybePromise<boolean>;
}
