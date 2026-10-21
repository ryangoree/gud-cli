// core
export {
  Client,
  ClientError,
  type PromptParams,
  type PromptPrimitiveType,
  type PromptTypeMap,
} from "#/core/client";
export {
  type CommandFactoryConfig,
  type CommandFactoryReturn,
  type CommandHandler,
  type CommandModule,
  type CommandState,
  command,
  passThroughCommand,
  passThroughHandler,
  validateCommandString,
} from "#/core/command";
export {
  Context,
  type ContextParams,
  SubcommandRequiredError,
} from "#/core/context";
export {
  CliError,
  type CliErrorOptions,
  CommandRequiredError,
  NotFoundError,
  UsageError,
} from "#/core/errors";
export {
  type GetHelpOptions,
  getHelp,
  type Help,
  type HelpRows,
} from "#/core/help";
export {
  type HookHandler,
  type HookHandlers,
  type HookName,
  type HookPayload,
  HookRegistry,
  type LifecycleHooks,
} from "#/core/hooks";
export {
  type OptionPromptParams,
  type OptionPromptType,
  type OptionPromptTypeMap,
  optionPrompt,
} from "#/core/options/option-prompt";
// options
export {
  type CustomOptionTypes,
  type ExpandedOptionsConfig,
  getOptionDisplayName,
  getOptionKeys,
  getOptionTypeFromValue,
  normalizeOptionValue,
  type OptionAlias,
  type OptionArgumentType,
  type OptionBaseType,
  type OptionConfig,
  type OptionConfigPrimitiveType,
  type OptionConfigType,
  type OptionCustomType,
  type OptionKey,
  type OptionPrimitiveType,
  type OptionPrimitiveTypeMap,
  type OptionsConfig,
  type OptionType,
  type OptionValues,
  option,
  options,
} from "#/core/options/options";
export {
  type CreateOptionsGetterOptions,
  createOptionsGetter,
  type OptionGetter,
  type OptionsGetter,
} from "#/core/options/options-getter";
export { removeOptionTokens } from "#/core/options/remove-option-tokens";
export {
  OptionsConfigError,
  validateOptionsConfig,
} from "#/core/options/validate-option-config";
export {
  OptionConflictsError,
  OptionRequiredError,
  OptionRequiresError,
  OptionsError,
  type ValidateOptionsParams,
  validateOptions,
  validateOptionType,
} from "#/core/options/validate-options";
// plugins
export {
  type ParseCommandFn,
  type ParsedCommand,
  parseCommand,
  removeLeadingOptions,
  type Tokens,
} from "#/core/parse";
export {
  type Plugin,
  PluginError,
  type PluginInfo,
  plugin,
} from "#/core/plugin";
export {
  MissingDefaultExportError,
  prepareResolvedCommand,
  type ResolveCommandFn,
  type ResolveCommandParams,
  type ResolvedCommand,
  type RouteParams,
  resolveCommand,
  resolveDefaultCommandsDir,
} from "#/core/resolve";
export {
  type RunParams,
  run,
} from "#/core/run";
export {
  type NextState,
  State,
} from "#/core/state";
export {
  type HelpPluginOptions,
  help,
} from "#/plugins/help";
export {
  disableLogger,
  enableLogger,
  type LoggerMeta,
  logger,
  toggleLogger,
} from "#/plugins/logger";

// utils
export {
  getBin,
  hideBin,
} from "#/utils/argv";
export { getCallerPath } from "#/utils/caller-path";
export {
  type CamelCase,
  camelCase,
} from "#/utils/camel-case";
export {
  formatFileName,
  parseFileName,
  removeFileExtension,
} from "#/utils/filename";
export {
  isDirectory,
  isFile,
} from "#/utils/fs";
export {
  type JoinableTokens,
  type JoinTokenOptions,
  joinTokens,
  splitTokens,
} from "#/utils/tokens";
