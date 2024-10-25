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

import { type PostgresConnection, PostgresDatabase } from "@valkyr/drizzle";
import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";

import { Access } from "~libraries/access.ts";
import { Auth } from "~libraries/auth.ts";
import { Repository } from "~libraries/repository.ts";
import { Role } from "~libraries/role.ts";
import type { EntityConditions, EntityFilters, Operation, Permissions, RoleData, RoleEntityAssignments, RolePayload, RolePermissions } from "~libraries/types.ts";

import { type AuthDatabase, type AuthSchema, schema } from "./database.ts";
import { EntityProvider } from "./entities/provider.ts";
import { RoleProvider } from "./roles/provider.ts";

/**
 * Provides a solution to manage user authentication and access control rights within an
 * application.
 */
export class PostgresAuth<TPermissions extends Permissions> implements Repository<TPermissions> {
  readonly #database: PostgresDatabase<AuthSchema>;
  readonly #permissions: TPermissions;
  readonly #auth: Config<TPermissions>["auth"];

  readonly entities: EntityProvider<TPermissions>;
  readonly roles: RoleProvider<TPermissions>;

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  constructor(config: Config<TPermissions>) {
    this.#database = new PostgresDatabase<AuthSchema>(config.database, schema);
    this.#permissions = config.permissions;
    this.#auth = config.auth;

    this.entities = new EntityProvider(this.#database);
    this.roles = new RoleProvider(this.#database, this.entities);
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Access the drizzle wrapped database client.
   */
  get db(): AuthDatabase {
    return this.#database.drizzle;
  }

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
   * @param tenantId   - Tenant id to assign to the token.
   * @param entityId   - Entity id to assign to the token.
   * @param expiration - Expiration date of the token. Default: 4 weeks
   */
  async generate(tenantId: string, entityId: string, expiration: string | number | Date = "4w"): Promise<string> {
    return new SignJWT({ tenantId, entityId })
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
   * @param token - Token to resolve auth instance with.
   */
  async resolve(token: string): Promise<Auth<TPermissions>> {
    const { payload: { tenantId, entityId } } = await jwtVerify<{ tenantId: string; entityId: string }>(
      token,
      await this.pubkey,
      {
        issuer: this.#auth.issuer,
        audience: this.#auth.audience,
      },
    );
    return new Auth(
      tenantId,
      entityId,
      new Access<TPermissions>(this.#permissions, await this.getRoles(tenantId, entityId)),
    );
  }

  /*
   |--------------------------------------------------------------------------------
   | Repository
   |--------------------------------------------------------------------------------
   */

  async addRole(payload: RolePayload<TPermissions>): Promise<Role<TPermissions>> {
    const id = await this.roles.addRole(payload);
    return new Role({ id, ...payload }, this);
  }

  async getRole(roleId: string): Promise<Role<TPermissions> | undefined> {
    const role = await this.roles.getRoleById(roleId);
    if (role === undefined) {
      return undefined;
    }
    return new Role({ ...role, permissions: JSON.parse(role.permissions as any) }, this);
  }

  async getRoles(tenantId: string, entityId: string): Promise<Role<TPermissions>[]> {
    return this.roles.getRoles(tenantId, entityId).then((roles) => roles.map((role) => new Role(role, this)));
  }

  async getRolesByTenantId(tenantId: string): Promise<Role<TPermissions>[]> {
    return this.roles.getRolesByTenantId(tenantId).then((data) =>
      data.map((role) =>
        new Role({
          ...role,
          permissions: JSON.parse(role.permissions),
        }, this)
      )
    );
  }

  async getRolesByEntityId(entityId: string): Promise<Role<TPermissions>[]> {
    return this.roles.getRolesByEntityId(entityId).then((roles) => roles.map((role) => new Role(role, this)));
  }

  async addEntity(roleId: string, entityId: string, assignments?: RoleEntityAssignments<TPermissions>): Promise<void> {
    await this.entities.addEntity(roleId, entityId, assignments);
  }

  async setConditions(roleId: string, entityId: string, conditions: EntityConditions<TPermissions>): Promise<void> {
    await this.entities.setConditions(roleId, entityId, conditions);
  }

  async setFilters(roleId: string, entityId: string, filters: EntityFilters<TPermissions>): Promise<void> {
    await this.entities.setFilters(roleId, entityId, filters);
  }

  async delEntity(roleId: string, entityId: string): Promise<void> {
    await this.entities.delEntity(roleId, entityId);
  }

  async setPermissions(roleId: string, operations: Operation[]): Promise<RolePermissions<TPermissions>> {
    const role = await this.getRole(roleId);
    if (role === undefined) {
      throw new Error(`Permission Violation: Cannot set permissions, role '${roleId}' does not exist.`);
    }
    const permissions: any = role.permissions;
    for (const operation of operations) {
      switch (operation.type) {
        case "set": {
          assign(permissions, operation.resource, operation.action, operation.data);
          break;
        }
        case "unset": {
          remove(permissions, operation.resource, operation.action);
          break;
        }
      }
    }
    await this.roles.setPermissions(roleId, permissions);
    return permissions;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function assign(permissions: RoleData<any>["permissions"], resource: string, action: string, conditions: any): void {
  if (permissions[resource] === undefined) {
    permissions[resource] = {};
  }
  permissions[resource]![action] = conditions ?? true;
}

function remove(permissions: RoleData<any>["permissions"], resource: string, action?: string): void {
  if (action) {
    delete permissions[resource]?.[action];
  } else {
    delete permissions[resource];
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config<TPermissions extends Permissions> = {
  database: PostgresConnection;
  permissions: TPermissions;
  auth: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
};
