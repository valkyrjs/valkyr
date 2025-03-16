import { z } from "zod";

import { AccessGuard } from "~libraries/guard.ts";
import type { Permissions } from "~libraries/types.ts";

export const permissions = {
  users: {
    create: new AccessGuard({
      input: z.object({ tenantId: z.string() }),
      flag: z.union([z.literal("pass"), z.literal("fail")]),
      check: async ({ tenantId }, flag) => {
        if (flag === "fail") {
          throw new Error(`Session does not have permission to add user for tenant '${tenantId}'.`);
        }
      },
    }),
    read: true,
    update: true,
    delete: true,
  },
} as const satisfies Permissions;

export type AppPermissions = typeof permissions;
