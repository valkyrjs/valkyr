/**
 * @module
 *
 * This module contains authorization and access control tooling.
 *
 * @example
 * ```ts
 * import { readFile } from "node:fs/promises";
 * import { join } from "node:path";
 * import { Database } from "@db/sqlite";
 *
 * import { SQLiteAuth } from "@valkyr/auth/sqlite";
 * import { ActionFilter, type Permissions } from "@valkyr/auth";
 *
 * export const auth = new Auth({
 *   auth: {
 *     algorithm: "RS256",
 *     privateKey: await readFile(join(__dirname, ".keys", "private"), "utf-8"),
 *     publicKey: await readFile(join(__dirname, ".keys", "public"), "utf-8"),
 *     issuer: "https://valkyrjs.com",
 *     audience: "https://valkyrjs.com",
 *   },
 *   session: z.object({
 *     accountId: z.string(),
 *   }),
 *   permissions: {
 *     account: {
 *       create: true,
 *       read: true,
 *       update: true,
 *       delete: true,
 *     },
 *   },
 * });
 * ```
 */

import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";
import z, { ZodTypeAny } from "zod";

import { Access } from "./access.ts";
import type { Permissions, Role } from "./types.ts";

/**
 * Provides a solution to manage user authentication and access control rights within an
 * application.
 */
export class Auth<TPermissions extends Permissions, TSession extends ZodTypeAny> {
  readonly #settings: Config<TPermissions, TSession>["settings"];
  readonly #session: TSession;
  readonly #permissions: TPermissions;

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  declare readonly $inferPermissions: TPermissions;
  declare readonly $inferSession: z.infer<TSession>;

  constructor(config: Config<TPermissions, TSession>) {
    this.#settings = config.settings;
    this.#session = config.session;
    this.#permissions = config.permissions;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Session zod object.
   */
  get session(): TSession {
    return this.#session;
  }

  /**
   * Secret key used to sign new tokens.
   */
  get secret(): Promise<KeyLike> {
    return new Promise((resolve) => {
      if (this.#secret === undefined) {
        importPKCS8(this.#settings.privateKey, this.#settings.algorithm).then((key) => {
          this.#secret = key;
          resolve(key);
        });
      } else {
        resolve(this.#secret);
      }
    });
  }

  /**
   * Public key used to verify tokens.
   */
  get pubkey(): Promise<KeyLike> {
    return new Promise<KeyLike>((resolve) => {
      if (this.#pubkey === undefined) {
        importSPKI(this.#settings.publicKey, this.#settings.algorithm).then((key) => {
          this.#pubkey = key;
          resolve(key);
        });
      } else {
        resolve(this.#pubkey);
      }
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Generates a new access token from the given tenant and entity ids.
   *
   * - If **expiration** is a `number` is passed as an argument it is used as the
   *   claim directly.
   * - If **expiration** is a `Date` instance is passed as an argument it is
   *   converted to unix timestamp and used as the claim.
   * - If **expiration** is a `string` is passed as an argument it is resolved to a
   *   time span, and then added to the current unix timestamp and used as the
   *   claim.
   *
   * Format used for time span should be a number followed by a unit, such as
   * "5 minutes" or "1 day".
   *
   * Valid units are: "sec", "secs", "second", "seconds", "s", "minute", "minutes",
   * "min", "mins", "m", "hour", "hours", "hr", "hrs", "h", "day", "days", "d",
   * "week", "weeks", "w", "year", "years", "yr", "yrs", and "y". It is not
   * possible to specify months. 365.25 days is used as an alias for a year.
   *
   * If the string is suffixed with "ago", or prefixed with a "-", the resulting
   * time span gets subtracted from the current unix timestamp. A "from now" suffix
   * can also be used for readability when adding to the current unix timestamp.
   *
   * @param session    - Session to sign.
   * @param expiration - Expiration date of the token. Default: 1 hour
   */
  async generate(session: z.infer<TSession>, expiration: string | number | Date = "1 hour"): Promise<string> {
    return new SignJWT(session)
      .setProtectedHeader({ alg: this.#settings.algorithm })
      .setIssuedAt()
      .setIssuer(this.#settings.issuer)
      .setAudience(this.#settings.audience)
      .setExpirationTime(expiration)
      .sign(await this.secret);
  }

  /**
   * Resolves a new auth instance from the given token.
   *
   * @param token - Token to resolve auth session from.
   */
  async resolve(token: string): Promise<z.infer<TSession>> {
    const resolved = await jwtVerify<unknown>(
      token,
      await this.pubkey,
      {
        issuer: this.#settings.issuer,
        audience: this.#settings.audience,
      },
    );
    return this.session.parseAsync(resolved.payload);
  }

  /**
   * Returns a new access instance with the configured permissions and given
   * assigned roles.
   *
   * @param assignments - Assigned roles to add to the access instance.
   */
  access(assignments: Role<TPermissions>[]): Access<TPermissions> {
    return new Access<TPermissions>(this.#permissions, assignments);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config<TPermissions extends Permissions, TSession extends ZodTypeAny> = {
  settings: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
  session: TSession;
  permissions: TPermissions;
};
