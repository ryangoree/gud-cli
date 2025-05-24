import type { AnyObject, Eval, MaybePromise } from 'src/utils/types';
import type { Context } from './context';

/**
 * A plugin for @gud/cli
 * @group Plugin
 */
export type Plugin<TMeta extends AnyObject = AnyObject> = Eval<
  PluginInfo<TMeta> & {
    /**
     * Initialize the plugin.
     * @param context - The context the plugin is being initialized in.
     * @returns A boolean or promise that resolves to a boolean indicating
     * whether the plugin was successfully initialized.
     */
    init: (context: Context) => MaybePromise<boolean>;
  }
>;

/**
 * Information about a plugin.
 * @catgory Core
 * @group Plugin
 */
export type PluginInfo<TMeta extends AnyObject = AnyObject> = Eval<
  {
    name: string;
    version?: string;
    description?: string;
  } & ({} extends TMeta
    ? PluginMetaOption<TMeta>
    : Required<PluginMetaOption<TMeta>>)
>;

type PluginMetaOption<TMeta extends AnyObject = AnyObject> = {
  /**
   * Additional metadata about the plugin that doesn't fit in the standard
   * fields.
   *
   * Note: Plugin info on the {@linkcode Context} object will be frozen after
   * the plugin is initialized. However, the freeze is shallow, so the fields of
   * this object will be mutable by default.
   */
  meta?: TMeta;
};
