import { describe as desc } from "@std/testing/bdd";

import { SQLiteAuth } from "../../stores/sqlite/auth.ts";
import { AppPermissions } from "./permissions.ts";

export function describe(
  name: string,
  runner: (container: AuthContainer) => void,
): (container: AuthContainer) => void {
  return (container: AuthContainer) => desc(name, () => runner(container));
}

export type AuthContainer = {
  auth: SQLiteAuth<AppPermissions>;
};
