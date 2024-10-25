import { z } from "zod";

import { Method } from "~libraries/method.ts";

export default new Method({
  description: "Signs in with account credentials.",
  params: z.object({
    email: z.string().describe("Account email."),
    password: z.string().describe("Account password."),
  }),
  output: z.string(),
  handler: async ({ params: { email, password } }) => {
    return `${email} | ${password}`;
  },
  examples: [
    `
      import { api } from "my-project-api";

      const post = await api.auth.signin({
        email: "john@doe.com",
        password: "123456789",
      }); // => john@doe.com | 123456789
    `,
  ],
});
