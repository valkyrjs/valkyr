import { z } from "zod";

import { ActionFilter, ActionValidator, type Permissions } from "~libraries/types.ts";

export const permissions = {
  users: {
    create: {
      validator: new ActionValidator({
        data: z.object({ tenantId: z.string() }),
        conditions: z.object({ tenantId: z.string() }),
        validate: (data, conditions) => {
          return data.tenantId === conditions.tenantId;
        },
        error: "You do not have required permissions to add new users to this tenant.",
      }),
    },
    read: {
      filter: new ActionFilter(["name", "email"] as const),
    },
    update: true,
    delete: true,
  },
} as const satisfies Permissions;

export type AppPermissions = typeof permissions;
