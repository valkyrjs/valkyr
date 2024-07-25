/**
 * JSON-RPC 2.0 compliant id type.
 */
export type Id = string | number | null;

/**
 * JSON-RPC 2.0 compliant parameters type.
 */
export type Params = unknown[] | Record<string, any>;
