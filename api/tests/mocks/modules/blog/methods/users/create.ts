import { z } from "zod";

import { Actions } from "~libraries/action.ts";
import { BadRequestError } from "~libraries/errors.ts";
import { Method } from "~libraries/method.ts";

import { getName } from "../../../../actions/get-name.ts";

export default new Method({
  description: "Create a new user.",
  params: z.object({
    name: z.string().describe("Full name of the user."),
  }),
  actions: new Actions([getName("test")]),
  result: z.string(),
  handler: async ({ params, name }) => {
    if (params.name === name) {
      throw new BadRequestError("Invalid name given");
    }
    return params.name;
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
