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
 * const permissions = {
 *   account: {
 *     read: {
 *       filter: new ActionFilter(["entityId", "email"]),
 *     },
 *     update: true,
 *   },
 * } as const satisfies Permissions;
 *
 * export const auth = new SQLiteAuth({
 *   database: "postgres://{user}:{password}@{url}:{port}/{database}",
 *   permissions,
 *   auth: {
 *     algorithm: "RS256",
 *     privateKey: await readFile(join(__dirname, ".keys", "private"), "utf-8"),
 *     publicKey: await readFile(join(__dirname, ".keys", "public"), "utf-8"),
 *     issuer: "https://valkyrjs.com",
 *     audience: "https://valkyrjs.com",
 *   },
 * });
 * ```
 */

import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";

import { Access } from "~libraries/access.ts";

import type { Permissions, Role, Session } from "./types.ts";

/**
 * Provides a solution to manage user authentication and access control rights within an
 * application.
 */
export class Auth<TPermissions extends Permissions, TSession extends Session> {
  readonly #permissions: TPermissions;
  readonly #auth: Config<TPermissions>["auth"];

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  constructor(config: Config<TPermissions>) {
    this.#permissions = config.permissions;
    this.#auth = config.auth;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Secret key used to sign new tokens.
   */
  get secret(): Promise<KeyLike> {
    return new Promise((resolve) => {
      if (this.#secret === undefined) {
        importPKCS8(this.#auth.privateKey, this.#auth.algorithm).then((key) => {
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
        importSPKI(this.#auth.publicKey, this.#auth.algorithm).then((key) => {
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
  async generate(session: TSession, expiration: string | number | Date = "1 hour"): Promise<string> {
    return new SignJWT(session)
      .setProtectedHeader({ alg: this.#auth.algorithm })
      .setIssuedAt()
      .setIssuer(this.#auth.issuer)
      .setAudience(this.#auth.audience)
      .setExpirationTime(expiration)
      .sign(await this.secret);
  }

  /**
   * Resolves a new auth instance from the given token.
   *
   * @param token - Token to resolve auth session from.
   */
  async resolve(token: string): Promise<TSession> {
    return (await jwtVerify<TSession>(
      token,
      await this.pubkey,
      {
        issuer: this.#auth.issuer,
        audience: this.#auth.audience,
      },
    )).payload;
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

type Config<TPermissions extends Permissions> = {
  permissions: TPermissions;
  auth: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
};
