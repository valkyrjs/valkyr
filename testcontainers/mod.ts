import { Docker } from "./docker/libraries/docker.ts";

export type { Container } from "./docker/libraries/container.ts";
export type { Docker } from "./docker/libraries/docker.ts";
export type { Exec } from "./docker/libraries/exec.ts";
export type { Image } from "./docker/libraries/image.ts";
export { modem } from "./docker/libraries/modem.ts";

export const docker: Docker = new Docker();
