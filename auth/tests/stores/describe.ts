import { describe as desc } from "@std/testing/bdd";

import { PostgresAuth } from "~stores/postgres/auth.ts";

import { AppPermissions } from "./permissions.ts";

export function describe(
  name: string,
  runner: (getAuth: AuthContainer) => void,
): (getAuth: AuthContainer) => void {
  return (getAuth: AuthContainer) => desc(name, () => runner(getAuth));
}

export type AuthContainer = () => Promise<PostgresAuth<AppPermissions>>;
