// core
export {
  Client,
  ClientError,
  type PromptParams,
  type PromptPrimitiveType,
  type PromptTypeMap,
} from "src/core/client";
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
} from "src/core/command";
export {
  Context,
  type ContextParams,
  SubcommandRequiredError,
} from "src/core/context";
export {
  CliError,
  type CliErrorOptions,
  CommandRequiredError,
  NotFoundError,
  UsageError,
} from "src/core/errors";
export type {
  GetHelpOptions,
  getHelp,
  Help,
  HelpRows,
} from "src/core/help";
export {
  type HookHandler,
  type HookHandlers,
  type HookName,
  type HookPayload,
  HookRegistry,
  type LifecycleHooks,
} from "src/core/hooks";
export {
  type OptionPromptParams,
  type OptionPromptType,
  type OptionPromptTypeMap,
  optionPrompt,
} from "src/core/options/option-prompt";
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
} from "src/core/options/options";
export {
  type CreateOptionsGetterOptions,
  createOptionsGetter,
  type OptionGetter,
  type OptionsGetter,
} from "src/core/options/options-getter";
export { removeOptionTokens } from "src/core/options/remove-option-tokens";
export {
  OptionsConfigError,
  validateOptionsConfig,
} from "src/core/options/validate-option-config";
export {
  OptionConflictsError,
  OptionRequiredError,
  OptionRequiresError,
  OptionsError,
  type ValidateOptionsParams,
  validateOptions,
  validateOptionType,
} from "src/core/options/validate-options";
// plugins
export {
  type ParseCommandFn,
  type ParsedCommand,
  parseCommand,
  removeLeadingOptions,
  type Tokens,
} from "src/core/parse";
export type {
  Plugin,
  PluginError,
  PluginInfo,
  plugin,
} from "src/core/plugin";
export {
  MissingDefaultExportError,
  prepareResolvedCommand,
  type ResolveCommandFn,
  type ResolveCommandParams,
  type ResolvedCommand,
  type RouteParams,
  resolveCommand,
  resolveDefaultCommandsDir,
} from "src/core/resolve";
export {
  type RunParams,
  run,
} from "src/core/run";
export {
  type NextState,
  State,
} from "src/core/state";
export {
  type HelpPluginOptions,
  help,
} from "src/plugins/help";
export {
  disableLogger,
  enableLogger,
  type LoggerMeta,
  logger,
  toggleLogger,
} from "src/plugins/logger";

// utils
export {
  getBin,
  hideBin,
} from "src/utils/argv";
export { getCallerPath } from "src/utils/caller-path";
export {
  type CamelCase,
  camelCase,
} from "src/utils/camel-case";
export {
  formatFileName,
  parseFileName,
  removeFileExtension,
} from "src/utils/filename";
export {
  isDirectory,
  isFile,
} from "src/utils/fs";
export {
  type JoinableTokens,
  type JoinTokenOptions,
  joinTokens,
  splitTokens,
} from "src/utils/tokens";
