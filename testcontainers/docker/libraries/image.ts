import { modem } from "./modem.ts";

export class Image {
  /**
   * Pull or import an image.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Image/operation/ImageCreate
   *
   * @param query - The configuration for the image.
   */
  async create(query: Partial<CreateImageOptions>) {
    if (query.fromImage !== undefined) {
      const hasImage = await this.inspect(query.fromImage);
      if (hasImage !== undefined) {
        return; // we already have this image
      }
    }
    const res = await modem.request({
      method: "POST",
      path: "/images/create",
      headers: {
        "Content-Type": "text/plain",
      },
      query,
    });
    res.close();
    if (res.status !== 200) {
      throw new Error("Docker Image > Failed to create new image");
    }
  }

  async inspect(image: string): Promise<InspectImageResponse | undefined> {
    try {
      return await modem.get<InspectImageResponse>({ path: `/images/${image}/json` });
    } catch (_) {
      return undefined;
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type CreateImageOptions = {
  /**
   * Name of the image to pull. The name may include a tag or digest. This
   * parameter may only be used when pulling an image. The pull is cancelled if
   * the HTTP connection is closed.
   */
  fromImage: string;
};

type InspectImageResponse = {
  Id: string;
  RepoTags: string[];
  RepoDigests: string[];
  Parent: string;
  Comment: string;
  Created: string;
  Container: string;
  ContainerConfig: {
    Hostname: string;
    Domainname: string;
    User: string;
    AttachStdin: boolean;
    AttachStdout: boolean;
    AttachStderr: boolean;
    ExposedPorts: Record<string, any>;
    Tty: boolean;
    OpenStdin: boolean;
    StdinOnce: boolean;
    Env: string[];
    Cmd: string[];
    Healthcheck: {
      Test: string[];
      Interval: number;
      Timeout: number;
      Retries: number;
      StartPeriod: number;
      StartInterval: number;
    };
    ArgsEscaped: boolean;
    Image: string;
    Volumes: Record<string, any>;
    WorkingDir: string;
    Entrypoint: string[];
    NetworkDisabled: boolean;
    MacAddress: string;
    OnBuild: string[];
    Labels: Record<string, string>;
    StopSignal: string;
    StopTimeout: number;
    Shell: string[];
  };
  DockerVersion: string;
  Author: string;
  Config: {
    Hostname: string;
    Domainname: string;
    User: string;
    AttachStdin: boolean;
    AttachStdout: boolean;
    AttachStderr: boolean;
    ExposedPorts: Record<string, any>;
    Tty: boolean;
    OpenStdin: boolean;
    StdinOnce: boolean;
    Env: string[];
    Cmd: string[];
    Healthcheck: {
      Test: string[];
      Interval: number;
      Timeout: number;
      Retries: number;
      StartPeriod: number;
      StartInterval: number;
    };
    ArgsEscaped: boolean;
    Image: string;
    Volumes: Record<string, any>;
    WorkingDir: string;
    Entrypoint: string[];
    NetworkDisabled: boolean;
    MacAddress: string;
    OnBuild: string[];
    Labels: Record<string, string>;
    StopSignal: string;
    StopTimeout: number;
    Shell: string[];
  };
  Architecture: string;
  Variant: string;
  Os: string;
  OsVersion: string;
  Size: number;
  VirtualSize: number;
  GraphDriver: {
    Name: string;
    Data: {
      MergedDir: string;
      UpperDir: string;
      WorkDir: string;
    };
  };
  RootFS: {
    Type: string;
    Layers: string[];
  };
  Metadata: {
    LastTagTime: string;
  };
};
