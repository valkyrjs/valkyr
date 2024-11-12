import { z } from "zod";

import { Method } from "~libraries/method.ts";

export default new Method({
  description: "Create a new post.",
  params: z.object({
    title: z.string().describe("Title of the post."),
    body: z.string().describe("Text body of the post."),
    author: z.string().describe("Author of the post in the form of a user id."),
  }),
  result: z.string(),
  handler: async ({ params: { title, body, author } }) => {
    return `${title} | ${body} | ${author}`;
  },
  examples: [
    `
      import { api } from "my-project-api";

      const userId = "some-user-id";

      const post = await api.posts.create({
        title: "My First Post",
        body: "This is my first post, isn't it something...",
        author: userId,
      }); // => My First post | This is my first post, isn't it something... | some-user-id
    `,
  ],
});
