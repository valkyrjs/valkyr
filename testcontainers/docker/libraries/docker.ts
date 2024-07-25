import type { ContainerConfig } from "../types/container.ts";
import { Container } from "./container.ts";
import { Image } from "./image.ts";
import { modem } from "./modem.ts";

export class Docker {
  /**
   * Create a new docker container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerCreate
   *
   * @params config - The configuration for the container.
   * @params query  - Query parameters.
   */
  async createContainer(
    config: Partial<ContainerConfig>,
    query: Partial<{ name: string; platform: string }> = {},
  ): Promise<Container> {
    const { Id, Warnings } = await modem.post<{ Id: string; Warnings: string[] }>({
      path: "/containers/create",
      query,
      body: config,
    });
    return new Container(Id, Warnings);
  }

  /**
   * Pull an image from the docker registry.
   *
   * @param image - The image to pull.
   */
  async pullImage(image: string): Promise<void> {
    await new Image().create({ fromImage: image });
  }
}
