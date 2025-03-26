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
 *     account: ["create", "read", "update", "delete"],
 *   } as const,
 *   guards: {
 *     "account:manager": new AccessGuard({
 *       input: z.object({ accountId: z.string() }),
 *       check: async ({ accountId }, session) => {
 *         return db
 *           .getManagedAccounts(session.accountId)
 *           .then((accountIds) => accountIds.includes(accountId))
 *       },
 *     }),
 *   }
 * });
 * ```
 */

import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";
import z, { ZodTypeAny } from "zod";

import { Access } from "./access.ts";
import { Guard } from "./guard.ts";
import type { PartialPermissions, Permissions } from "./permissions.ts";
import { Role } from "./role.ts";

/**
 * Provides a solution to manage user authentication and access control rights within an
 * application.
 */
export class Auth<TPermissions extends Permissions, TSession extends ZodTypeAny, TGuard extends Guard<any, any>> {
  readonly #settings: Config<TPermissions, TSession, TGuard>["settings"];
  readonly #session: TSession;
  readonly #permissions: TPermissions;
  readonly #guards: Map<TGuard["name"], TGuard>;

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  declare readonly $inferPermissions: TPermissions;
  declare readonly $inferSession: z.infer<TSession>;

  constructor(config: Config<TPermissions, TSession, TGuard>) {
    this.#settings = config.settings;
    this.#session = config.session;
    this.#permissions = config.permissions;
    this.#guards = config.guards.reduce((guards, guard) => guards.set(guard.name, guard), new Map<TGuard["name"], TGuard>());
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
   * Verifies the given JWT token using the public key, then parses and validates
   * the session payload. Throws an error if verification fails.
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
   * Takes raw role data and returns a role instance which provides some
   * quality of life tooling for editing permissions.
   *
   * @param id          - Role id.
   * @param name        - Role name.
   * @param permissions - Permissions assigned to the role.
   */
  role(id: string, name: string, permissions: PartialPermissions<TPermissions>): Role<TPermissions> {
    return new Role(id, name, permissions);
  }

  /**
   * Returns a new access instance with the configured permissions and roles.
   *
   * @param session - Session the access instance is working with.
   * @param roles   - List of roles to add to the access instance.
   */
  access(roles: Role<TPermissions>[]): Access<TPermissions> {
    return new Access<TPermissions>(this.#permissions, roles);
  }

  /**
   * Guard given input against internal states is valid.
   *
   * The idea with guards is that we can take untrusted external input and
   * verify that internal states and logic matches expectations.
   *
   * @param name  - Guard name to validate.
   * @param input - Input to validate.
   *
   * @example
   *
   * Lets say your account is assigned a list of users to manage. We would
   * assign you a list of user ids that you can manage. The untrusted
   * external input would be a userId we want to modify, we now check that
   * against our accounts internal user list to verify that the request
   * can indeed manage the given user.
   *
   * ```ts
   * await auth.check("user:manage", { userId }); // => true | false
   * ```
   */
  async check<TName extends TGuard["name"], TInput extends TGuard["input"]>(
    name: TName,
    input: z.infer<TInput>,
  ): Promise<boolean> {
    const guard = this.#guards.get(name);
    if (guard === undefined) {
      return false;
    }
    return guard.check(input);
  }
}

/*
TType extends TEventRecord["type"],
TRecord extends TEventRecord = Extract<TEventRecord, { type: TType }>,
*/

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config<TPermissions extends Permissions, TSession extends ZodTypeAny, TGuard extends Guard<any, any>> = {
  settings: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
  session: TSession;
  permissions: TPermissions;
  guards: TGuard[];
};
