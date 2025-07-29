// core
export {
  Client,
  ClientError,
  type PromptParams,
  type PromptPrimitiveType,
  type PromptTypeMap,
} from 'src/core/client';
export {
  command,
  type CommandFactoryConfig,
  type CommandFactoryReturn,
  type CommandHandler,
  type CommandModule,
  type CommandState,
} from 'src/core/command';
export {
  Context,
  SubcommandRequiredError,
  type ContextParams,
} from 'src/core/context';
export {
  CliError,
  CommandRequiredError,
  NotFoundError,
  UsageError,
  type CliErrorOptions,
} from 'src/core/errors';
export type {
  GetHelpOptions,
  Help,
  HelpRows,
  getHelp,
} from 'src/core/help';
export {
  HookRegistry,
  type HookName,
  type LifecycleHooks,
  type HookPayload,
} from 'src/core/hooks';
export {
  MissingDefaultExportError,
  prepareResolvedCommand,
  resolveCommand,
  type RouteParams,
  type ResolveCommandFn,
  type ResolveCommandParams,
  type ResolvedCommand,
} from 'src/core/resolve';
export {
  run,
  type RunParams,
} from 'src/core/run';
export {
  State,
  type NextState,
} from 'src/core/state';

// options
export {
  getOptionDisplayName,
  getOptionKeys,
  getOptionTypeFromValue,
  normalizeOptionValue,
  option,
  options,
  type CustomOptionTypes,
  type ExpandedOptionsConfig,
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
} from 'src/core/options/options';
export {
  optionPrompt,
  type OptionPromptParams,
  type OptionPromptType,
  type OptionPromptTypeMap,
} from 'src/core/options/option-prompt';
export {
  createOptionsGetter,
  type CreateOptionsGetterOptions,
  type OptionGetter,
  type OptionsGetter,
} from 'src/core/options/options-getter';
export { removeOptionTokens } from 'src/core/options/remove-option-tokens';
export {
  OptionsConfigError,
  validateOptionsConfig,
} from 'src/core/options/validate-option-config';
export {
  OptionConflictsError,
  OptionRequiredError,
  OptionRequiresError,
  OptionsError,
  validateOptionType,
  validateOptions,
} from 'src/core/options/validate-options';

// plugins
export {
  parseCommand,
  removeLeadingOptions,
  type ParseCommandFn,
  type ParsedCommand,
  type Tokens,
} from 'src/core/parse';
export type {
  Plugin,
  PluginInfo,
} from 'src/core/plugin';
export {
  help,
  type HelpPluginOptions,
} from 'src/plugins/help';
export {
  disableLogger,
  enableLogger,
  logger,
  toggleLogger,
  type LoggerMeta,
} from 'src/plugins/logger';

// utils
export {
  getBin,
  hideBin,
} from 'src/utils/argv';
export { getCallerPath } from 'src/utils/caller-path';
export {
  camelCase,
  type CamelCase,
} from 'src/utils/camel-case';
export {
  formatFileName,
  parseFileName,
  removeFileExtension,
} from 'src/utils/filename';
export {
  isDirectory,
  isFile,
} from 'src/utils/fs';
export {
  joinTokens,
  splitTokens,
  type JoinableTokens,
  type JoinTokenOptions,
} from 'src/utils/tokens';
