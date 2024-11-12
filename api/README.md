<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# API

A robust application programming interface for managing and handling JSON-RPC 2.0 compliant requests.

## Dependencies

Make sure to install [@valkyr/json-rpc](https://jsr.io/@valkyr/json-rpc) if using the api client generator.

## Quick Start Guide

This guide provides a concise introduction to get you up and running quickly.

### Server-Side Setup

Create an API file and export a new API instance:

```typescript
import { Api } from "@valkyr/api";

export const api = new Api();
```

Register methods with the API. There are multiple approaches to achieve this:

#### Method Registration

Create a new method file and export it, or register it directly with the API instance:

```typescript
import { BadRequestError, Method, z } from "@valkyr/api";

export default new Method({
  method: "users:create",
  description: "Create a new user.",
  params: z.object({
    name: z.string().describe("Full name of the user."),
  }),
  result: z.string(),
  handler: async ({ params: { name } }) => {
    if (name === "test") {
      throw new BadRequestError("Invalid name given");
    }
    return name;
  },
  examples: [
    `
    import { api } from "my-project-api";
    const name = await api.users.create({
      name: "John Doe",
    }); // => "John Doe"
    `,
  ],
});
```

Register the new method with the API:

```typescript
import api from "./api";
import method from "./my-method";
api.register(method);
```

#### File System-Based Method Resolution

We provide a method resolver that utilizes the file system to register methods and generate a client. This approach requires a specific module structure:

```
modules      # Root API modules folder
  my-module  # Module folder (sets the root name for the module in the client)
    methods  # Methods folder (consumed by the resolver)
```

Update your main API file:

```typescript
import { Api, resolveMethods } from "@valkyr/api";

export const api = new Api();

for (const method of await resolveMethods("/path/to/modules")) {
  api.register(method);
}
```

Use the API instance to handle incoming events. This library is designed to be HTTP-layer agnostic. Here's an example using Deno:

```typescript
Deno.serve({
  hostname: "localhost",
  port: 8370,
  onListen({ hostname, port }) {
    logger.info(`Server > Listening at http://${hostname}:${port}`);
  },
}, async (request) => {
  return api.handle(await request.json(), { ...context });
});
```

### Client-Side Setup

If you're using the file system modules approach for your methods, you can utilize the built-in client printer. This will traverse the file system and create a ready-to-use API client for your application to communicate with the server.

```typescript
import { printApi, resolveMethods } from "@valkyr/api";

await printApi(
  [
    "/path/to/application/api.ts"
  ], 
  await resolveMethods("/path/to/modules")
);
```

This will generate an API instance for the client-side, facilitating seamless communication with your server.
