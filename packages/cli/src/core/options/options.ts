import { type CamelCase, camelCase } from "src/utils/camel-case";
import type {
  Eval,
  KeyWithMatchingValue,
  MaybeReadonly,
  Merge,
  Replace,
} from "src/utils/types";

// Types //

type OptionBaseTypeMap = {
	string: string;
	secret: string;
	number: number;
	boolean: boolean;
	array: string[];
};

/**
 * The primitive types to use for
 * {@linkcode OptionConfig.customType custom option} types.
 *
 * This is used to map each custom option type to its corresponding primitive
 * type. Use [`declaration
 * merging`](https://www.typescriptlang.org/docs/handbook/declaration-merging.html),
 * to extend this interface with your custom types.
 *
 * @example
 * ```ts
 * declare module '@gud/cli' {
 *   interface CustomOptionTypes {
 *     hex: `0x${string}`;
 *     hexArray: `0x${string}`[];
 *   }
 * }
 * ```
 *
 * @group Options
 */
export interface CustomOptionTypes {}

export interface OptionPrimitiveTypeMap
	extends OptionBaseTypeMap,
		CustomOptionTypes {}

/**
 * The possible types for an option.
 *
 * @group Options
 */
export type OptionType = keyof OptionPrimitiveTypeMap;

/**
 * Get the primitive type for an option type.
 *
 * @group Options
 */
export type OptionPrimitiveType<T extends OptionType = OptionType> =
	OptionPrimitiveTypeMap[T];

/**
 * Get a union of base option types with the same primitive type as the given
 * option type.
 *
 * @group Options
 */
export type OptionBaseType<T extends OptionType = OptionType> =
	T extends keyof OptionBaseTypeMap
		? T
		: KeyWithMatchingValue<OptionPrimitiveTypeMap, T, OptionBaseTypeMap>;

/**
 * A custom option type that extends the base option types.
 *
 * @group Options
 */
export type OptionCustomType<T extends OptionType> =
	| T
	| KeyWithMatchingValue<OptionPrimitiveTypeMap, T>;

/**
 * Get the argument type for an option considering the number of arguments it
 * accepts.
 */
export type OptionArgumentType<
	T extends OptionType = OptionType,
	TNargs extends number | undefined = undefined,
> = TNargs extends number
	? TNargs extends 0 | 1
		? OptionPrimitiveType<T>
		: OptionPrimitiveType<T> extends infer T extends OptionPrimitiveType
			? T extends readonly any[]
				? T
				: T[]
			: never
	: OptionPrimitiveType<T>;

/**
 * The configuration interface for an option used to define how an option will
 * be parsed and validated.
 *
 * @group Options
 */
export type OptionConfig<
	T extends OptionType = OptionType,
	TAlias extends string = string,
> = T extends T
	? {
			/**
			 * The type of the option.
			 */
			type: OptionBaseType<T>;

			/**
			 * custom type registered with {@linkcode OptionPrimitiveTypeMap}.
			 */
			customType?: OptionCustomType<T>;

			/**
			 * The valid choices for the option (optional). If provided, the getter
			 * will validate the value against the choices and, unless otherwise
			 * specified, will use the choices when prompting.
			 */
			choices?: OptionPrimitiveType<T>[];

			/**
			 * Whether the option is a string (optional, inferred from `type`). Useful
			 * for array options to specify the type of the array values.
			 */
			string?: boolean;

			/**
			 * One or more aliases for the option (optional).
			 */
			alias?: MaybeReadonly<TAlias[]>;

			/**
			 * The description of the option (optional, has default based on `name`).
			 */
			description?: string;

			/**
			 * Whether the option is required. If `true`, the getter will throw an
			 * error if no value is provided (optional).
			 */
			required?: boolean;

			/**
			 * Other options that are required for this option to be used (optional).
			 */
			requires?: MaybeReadonly<string[]>;

			/**
			 * Other options that are mutually exclusive with this option (optional).
			 */
			conflicts?: MaybeReadonly<string[]>;

			/**
			 * The autocomplete function (optional).
			 */
			// TODO: Not implemented yet
			// autoComplete?: (input: string) => MaybePromise<string[]>;
			// autoComplete?: [
			//   // potential values, engine will manage matching
			// ]
		} & (
			| {
					/**
					 * The number of arguments the option accepts (optional).
					 */
					nargs?: undefined;

					/**
					 * The default value to use. This will be the initial value that the
					 * getter prompt will show (optional).
					 */
					default?: OptionPrimitiveType<T> | string;
			  }
			| {
					/**
					 * The number of arguments the option accepts (optional).
					 */
					nargs: number;

					/**
					 * The default value to use. This will be the initial value that the
					 * getter prompt will show (optional).
					 */
					default?:
						| (OptionPrimitiveType<T> extends (infer T)[]
								? T[]
								: OptionPrimitiveType<T>[])
						| string;
			  }
		)
	: never;

export type OptionConfigType<T extends OptionConfig> =
	T["customType"] extends OptionType ? T["customType"] : T["type"];

/**
 * Get the primitive type for an option considering it's config.
 */
export type OptionConfigPrimitiveType<T extends OptionConfig = OptionConfig> =
	T extends OptionConfig
		? T["required"] extends true
			? OptionArgumentType<
					OptionConfigType<T>,
					"nargs" extends keyof T ? T["nargs"] : undefined
				>
			: T["default"] extends MaybeReadonly<
						OptionArgumentType<OptionConfigType<T>>
					>
				? OptionArgumentType<
						OptionConfigType<T>,
						"nargs" extends keyof T ? T["nargs"] : undefined
					>
				:
						| OptionArgumentType<
								OptionConfigType<T>,
								"nargs" extends keyof T ? T["nargs"] : undefined
						  >
						| undefined
		: undefined;

/**
 * Get a union of all aliases for an option.
 *
 * @group Options
 */
export type OptionAlias<T extends OptionConfig> = T extends {
	alias: string[];
}
	? T["alias"][number]
	: never;

/**
 * The options config for a command.
 *
 * @group Options
 */
export type OptionsConfig<
	TKey extends string = string,
	TType extends OptionType = OptionType,
> = Record<TKey, OptionConfig<TType, TKey>>;

/**
 * A key for an option, including the option key, aliases, and camelCased
 * versions of each.
 */
export type OptionKey<
	TKey extends PropertyKey = string,
	TAlias extends string = string,
> = TKey | TAlias | CamelCase<TKey | TAlias>;

/**
 * An expanded {@linkcode OptionsConfig} that keys each option config by all of
 * it's keys and aliases.
 *
 * @group Options
 */
export type ExpandedOptionsConfig<T extends OptionsConfig> = T extends T
	? {
			[K in keyof T as OptionKey<K, OptionAlias<T[K]>>]: T[K] extends {
				alias: string[];
			}
				? Eval<
						Replace<
							T[K],
							{
								alias: [...T[K]["alias"], `${K & string}`];
							}
						>
					>
				: T[K];
		}
	: Record<string, OptionConfig>;

/**
 * The values for each option.
 *
 * @group Options
 */
export type OptionValues<TOptions extends OptionsConfig = OptionsConfig> =
	Merge<TOptions> extends infer TMerged extends OptionsConfig
		? Eval<{
				[K in keyof TMerged as OptionKey<
					K,
					OptionAlias<TMerged[K]>
				>]?: OptionConfigPrimitiveType<TMerged[K]>;
			}>
		: Record<string, OptionPrimitiveType | undefined>;

// Functions //

/**
 * Factory function to create an {@linkcode OptionConfig} with strong typing.
 *
 * @param config - The config for the option.
 * @group Options
 */
export function option<const T extends OptionConfig = OptionConfig>(config: T) {
	return config;
}

/**
 * Factory function to create an {@linkcode OptionsConfig} object with strong
 * typing.
 *
 * @param config - The config for the options.
 * @group Options
 */
export function options<const T extends OptionsConfig = OptionsConfig>(
	config: T,
) {
	return config;
}

/**
 * Infer the option type from a value, defaulting to 'string'.
 *
 * @param value - The value to infer the type from.
 * @returns - An option type for the value.
 * @group Options
 */
export function getOptionTypeFromValue<T>(value: T): OptionType {
	switch (typeof value) {
		case "boolean":
			return "boolean";
		case "number":
			return "number";
		case "string":
			return "string";
		case "object":
			return "array";
		default:
			return "string";
	}
}

/**
 * Get all keys for an option, including the option key, aliases, and camelCased
 * versions of each.
 *
 * @param configKey - The option's key in the command's options config.
 * @param config - The option's config entry.
 * @group Options
 */
export function getOptionKeys(configKey: PropertyKey, config: OptionConfig) {
	const allKeysForOption = [String(configKey), ...(config.alias || [])];
	return [
		...allKeysForOption,
		...allKeysForOption.map((key) => camelCase(key)),
	];
}

/**
 * Get a display name for an option by checking it's key and aliases for a name
 * longer than one character, falling back to the key.
 *
 * @param configKey - The option's key in the command's options config.
 * @param config - The option's config entry.
 * @group Options
 */
export function getOptionDisplayName(
	configKey: string,
	config: OptionConfig | undefined,
) {
	if (configKey.length > 1) return configKey;
	return config?.alias?.find((alias) => alias.length > 1) || configKey;
}

/**
 * Normalizes a value for an option based on the option's configuration:
 * - Coerce empty strings to `undefined`.
 * - Split string values into arrays for array options and trim whitespace.
 * - Parse numbers and booleans.
 *
 * @param value - The value to prepare.
 * @param config - The option configuration for the value.
 * @returns - The prepared value.
 * @group Options
 */
export function normalizeOptionValue<T extends OptionConfig>(
	value: unknown,
	config?: T,
): OptionConfigPrimitiveType<T> | undefined {
	// Treat empty strings as undefined
	if (isEmpty(value)) value = config?.default;
	if (isEmpty(value)) return undefined;

	const nargs = config?.nargs ?? 1;
	if (config?.type === "array" || nargs > 1) {
		// Split string values into normalized arrays for array options
		if (typeof value === "string") {
			value = value
				.split(",")
				.map((v) => normalizeScalar(v, config?.type)) as OptionArgumentType;
		}

		// Map array values to their normalized values
		if (Array.isArray(value)) {
			return value.map((v) =>
				normalizeScalar(v, config?.type),
			) as OptionConfigPrimitiveType<T>;
		}
	}

	return normalizeScalar(value, config?.type) as OptionConfigPrimitiveType<T>;
}

// Internal //

type OptionScalarType<T extends OptionType> =
	OptionPrimitiveType<T> extends infer U
		? U extends any[]
			? U[number]
			: U
		: never;

function normalizeScalar<T extends OptionType>(
	value: unknown,
	type?: T,
): OptionScalarType<T> | undefined {
	if (isEmpty(value)) return undefined;
	switch (type) {
		case "number":
			return Number(value) as OptionScalarType<T>;
		case "boolean":
			return (value === "true" || value === true) as OptionScalarType<T>;
		default:
			return String(value).trim() as OptionScalarType<T>;
	}
}

function isEmpty(value: unknown) {
	return value === undefined || value === "";
}
