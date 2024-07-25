<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Auth

Authentication and Access Control solution for full stack TypeScript applications.

## Quick Start

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Database } from "bun:sqlite";

import { SQLiteAuth } from "@valkyr/auth/sqlite";
import { ActionFilter, type Permissions } from "@valkyr/auth";

const permissions = {
  account: {
    read: {
      filter: new ActionFilter(["entityId", "email"]),
    },
    update: true,
  },
} as const satisfies Permissions;

export const auth = new SQLiteAuth({
  database: new Database(":memory:"),
  permissions,
  auth: {
    algorithm: "RS256",
    privateKey: await readFile(join(__dirname, ".keys", "private"), "utf-8"),
    publicKey: await readFile(join(__dirname, ".keys", "public"), "utf-8"),
    issuer: "https://valkyrjs.com",
    audience: "https://valkyrjs.com",
  },
});
```
