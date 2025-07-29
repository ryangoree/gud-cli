export type AnyObject<TValue = any> = Record<PropertyKey, TValue>;

export type AnyFunction = (...args: any) => any;

export type MaybePromise<T> = T | Promise<T>;

export type MaybeReadonly<T> = T | Readonly<T>;

/**
 * An absent or uninitialized value that can represent `null` even with
 * [`strictNullChecks`](https://www.typescriptlang.org/tsconfig/#strictNullChecks)
 * on.
 */
export type Nothing = undefined | null;

/**
 * Convert an intersection of objects to a single object, making the type easier
 * to read.
 *
 * @example
 * ```ts
 * type Intersection = { a: number } & { b: string };
 * type Prettified = Eval<Intersection>;
 * // { a: number; b: string }
 * ```
 */
export type Eval<T> = { [K in keyof T]: T[K] } & unknown;

/**
 * Replace properties in `T` with properties in `U`.
 */
export type Replace<T, U extends Partial<T> | {}> = Omit<T, keyof U> & U;

/**
 * The opposite of {@linkcode Readonly<T>}. Make all properties in `T` mutable.
 *
 * @typeParam T - The type to make writable.
 * @typeParam TDeep - If `true`, recursively make all properties writable.
 */
export type Writable<T, TDeep extends boolean = false> = {
  -readonly [P in keyof T]: TDeep extends true
    ? NonNullable<T[P]> extends AnyObject | any[]
      ? Eval<Writable<T[P], TDeep>>
      : T[P]
    : T[P];
};

/**
 * Get a union of all property keys on `T` that are functions
 */
export type FunctionKey<T> = keyof {
  [K in keyof T as T[K] extends AnyFunction ? K : never]: K;
};

/**
 * Get a union of all keys from all members of `T`.
 *
 * @example
 * ```ts
 * type Foo = { a: string; b: number };
 * type Bar = { a: boolean; b: bigint; c: string };
 *
 * type FoobarKey = keyof (Foo | Bar);
 * // => "a" | "b" ❌ missing "c"
 *
 * type FoobarKey = keyof (Foo & Bar);
 * // => string | number | symbol ❌ intersecting incompatible types returns never
 *
 * type FoobarKey = UnionKey<Foo | Bar>;
 * // => "a" | "b" | "c" ✅
 * ```
 */
export type UnionKey<T> = T extends T ? keyof T : never;

/**
 * Get a union of all keys that are optional or missing in at least one member
 * of `T`.
 *
 * @example
 * ```ts
 * type Foo = { a: string; b?: number };
 * type Bar = { a: boolean; b: bigint; c: string };
 *
 * type OptionalFoobarKey = OptionalUnionKey<Foo | Bar>;
 * // => "b" | "c"
 * // "c" is included because it doesn't exist in Foo, therefore it's not guaranteed in the union
 * ```
 */
export type OptionalUnionKey<T> = keyof {
  [K in UnionKey<T> as T extends {
    [_ in K]: any;
  }
    ? never
    : K]: never;
};

/**
 * Get a union of all keys that are required in all members of `T`.
 *
 * @example
 * ```ts
 * type Foo = { a: string; b?: number };
 * type Bar = { a: boolean; b: bigint; c: string };
 *
 * type RequiredFoobarKey = RequiredUnionKey<Foo | Bar>;
 * // => "a"
 * ```
 */
export type RequiredUnionKey<T> = Exclude<UnionKey<T>, OptionalUnionKey<T>>;

/**
 * Get a union of all values for `K` from all members of `T`.
 *
 * @example
 * ```ts
 * type Foo = { a: string; b?: number };
 * type Bar = { a: boolean; b: bigint; c: string };
 *
 * type FooBar_A = UnionValue<Foo | Bar, "a">;
 * // => string | boolean
 *
 * type FooBar_B = UnionValue<Foo | Bar, "b">;
 * // => number | bigint | undefined
 *
 * type FooBar_C = UnionValue<Foo | Bar, "c">;
 * // => string | undefined
 * ```
 */
export type UnionValue<T, K extends UnionKey<T> = UnionKey<T>> = T extends T
  ? K extends keyof T
    ? T[K]
    : undefined
  : never;

/**
 * Merge a union or intersection of objects into a single type.
 *
 * @example
 * ```ts
 * type A = { a: number; common: string };
 * type B = { b: string; common: number };
 *
 * type Merged = MergeKeys<A | B>;
 * // {
 * //   a: number;
 * //   b: string;
 * //   common: string | number;
 * // }
 * ```
 */
export type Merge<T> = Eval<
  {
    [K in RequiredUnionKey<T>]: UnionValue<T, K>;
  } & {
    [K in OptionalUnionKey<T>]?: UnionValue<T, K>;
  }
>;

/**
 * Construct a type in which only a single member of `T` is valid at a time.
 *
 * @example
 * ```ts
 * type U = OneOf<{ a: string } | { b: number }>;
 * // {
 * //   a: string;
 * //   b?: undefined;
 * // } | {
 * //   a?: undefined;
 * //   b: number;
 * // }
 * ```
 */
export type OneOf<T extends AnyObject> = UnionKey<T> extends infer K extends
  PropertyKey
  ? T extends T
    ? Eval<
        T & {
          [_ in Exclude<K, keyof T>]?: never;
        }
      >
    : never
  : never;

/**
 * Get {@linkcode T}, ensuring that all keys from {@linkcode K} are present. If
 * any keys are missing, a type error will be thrown.
 *
 * @typeParam K - The keys to ensure are present.
 * @typeParam T - An object that should contain all keys from {@linkcode K}.
 * @typeParam TDefault - The default value to use for missing keys.
 *
 * @example
 * ```ts
 * type Name = 'bob' | 'alice' | 'charlie';
 *
 * type IncompleteNameIdMap = KeyMap<
 *   Name,
 *   {
 *     bob: 1;
 *     alice: 2;
 *   }
 *   // ^ ❌ Error: Property 'charlie' is missing in type ...
 * >;
 *
 * type NameIdMap = KeyMap<
 *   Name,
 *   {
 *     bob: 1;
 *     alice: 2;
 *     charlie: 3;
 *   }
 * >; // => No error ✅
 * ```
 *
 * You can also provide a default value for missing keys:
 * ```ts
 * type NameIdMap = KeyMap<
 *   Name,
 *   {
 *     bob: 1;
 *     alice: 2;
 *   },
 *   number
 * >; // => { bob: 1; alice: 2; charlie: number }
 * ```
 */
export type KeyMap<
  K extends string | number,
  T extends [TDefault] extends [never]
    ? Record<K, unknown>
    : Partial<Record<K, unknown>>,
  TDefault = never,
> = {
  [TKey in K]: TKey extends keyof T
    ? undefined extends T[TKey]
      ? Required<T>[TKey] | TDefault
      : T[TKey]
    : TDefault;
};

/**
 * Get a union of all keys from {@linkcode TTargetMap} that have a value that
 * matches the value of the key {@linkcode TSourceKey} in
 * {@linkcode TSourceMap}.
 *
 * @example
 * ```ts
 * type matchingKey = KeyWithMatchingValue<
 *   { a: string; b: string; c: number },
 *   'a'
 * >;
 * // => "a" | "b"
 *
 * type matchingKey = KeyWithMatchingValue<
 *   { a: string; b: string; c: number },
 *   'a',
 *   { foo: string; bar: number; baz: string }
 * >;
 * // => "foo" | "baz"
 * ```
 */
export type KeyWithMatchingValue<
  TSourceMap extends AnyObject,
  TSourceKey extends keyof TSourceMap,
  TTargetMap extends AnyObject = TSourceMap,
> = {
  [K in keyof TTargetMap]: TTargetMap[K] extends TSourceMap[TSourceKey]
    ? K
    : never;
}[keyof TTargetMap];
