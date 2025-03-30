import z from "zod";

import { Guard } from "../../mod.ts";

const accountTenants = {
  "account-a": ["tenant-a", "tenant-b"],
  "account-b": ["tenant-a", "tenant-c"],
} as any;

const req = {
  session: {
    accountId: "account-a",
  },
};

export const guards = [
  new Guard("tenant:related", {
    input: z.object({ tenantId: z.string() }),
    check: async ({ tenantId }) => {
      return accountTenants[req.session.accountId]?.includes(tenantId);
    },
  }),
  new Guard("account:own", {
    input: z.object({ accountId: z.string() }),
    check: async ({ accountId }) => {
      return accountId === req.session.accountId;
    },
  }),
];
