<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Auth

Authentication and Access Control solution for full stack TypeScript applications.

## Quick Start

```ts
import { readFileSync } from "node:fs/promises";
import { join } from "node:path";

import { Auth, Guard } from "@valkyr/auth";
import { z } from "zod";

import { RolesProvider } from "./roles-provider.ts";

const auth = new Auth({
  settings: {
    algorithm: "RS256",
    privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
    publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
    issuer: "https://valkyrjs.com",
    audience: "https://valkyrjs.com",
  },
  session: z.object({
    accountId: z.string(),
  }),
  permissions: {
    account: ["create", "read", "update", "delete"],
  } as const,
  guards: [
    new Guard("account:own", {
      input: z.object({ accountId: z.string() }),
      check: async ({ accountId }) => {
        return accountId === req.session.accountId;
      },
    }),
  ],
}, {
  roles: new RolesProvider(),
});
```

### Generate a Session

```ts
import { auth } from "./auth.ts";

const token = await auth.generate({ accountId: "xyz" });
```

### Resolve a Session

Following example shows how to resolve a session, then use the sessions access control `.has` method, then execute a guard `.check`.

```ts
import { auth } from "./auth.ts";

const session = await auth.resolve("token");

if (session.valid === false) {
  throw new Error(session.message);
}

if (session.has("account", "update") === false) {
  throw new Error("Not allowed to update accounts");
}

if ((await auth.guard("account:own", { accountId: session.accountId })) === false) {
  throw new Error("Not allowed to edit this account");
}
```
