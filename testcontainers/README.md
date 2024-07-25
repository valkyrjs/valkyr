<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Test Containers

Test container solution for running third party solutions through docker.

## Quick Start

```ts
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

const container = await PostgresTestContainer.start("postgres:16");

await container.create("db");
await container.client("db")`SELECT 1`;

console.log(container.url("db")); // => postgres://postgres:postgres@127.0.0.1:5432/db

await container.stop();
```
