import { resolve } from "node:path";

import { printApi } from "../printer/api.ts";
import { resolveMethods } from "../utilities/methods.ts";

const EXAMPLES_PATH = resolve(import.meta.dirname!, "..", "tests", "mocks", "modules");

await printApi([`${import.meta.dirname!}/generated/api.ts`], await resolveMethods(EXAMPLES_PATH));
