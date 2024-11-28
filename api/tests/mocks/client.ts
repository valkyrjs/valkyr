import { Api } from "~scripts/generated/api.ts";

import { server } from "./server.ts";

export const api = new Api({
  send: async (payload) => {
    return server.handle(payload);
  },
});
