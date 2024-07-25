import { z } from "zod";

import { BadRequestError } from "~libraries/errors.ts";
import { Method } from "~libraries/method.ts";

export default new Method({
  method: "account:users:create",
  description: "Create a new user.",
  params: z.object({
    name: z.string().describe("Full name of the user."),
  }),
  output: z.string(),
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
