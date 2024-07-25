export type ContainerConfig = {
  /**
   * The hostname to use for the container, as a valid RFC 1123 hostname.
   */
  Hostname: string;

  /**
   * The domain name to use for the container.
   */
  Domainname: string;

  /**
   * The user that commands are run as inside the container.
   */
  User: string;

  /**
   * Whether to attach to `stdin`.
   */
  AttachStdin: boolean;

  /**
   * Whether to attach to `stdout`.
   */
  AttachStdout: boolean;

  /**
   * Whether to attach to `stderr`.
   */
  AttachStderr: boolean;

  /**
   * An object mapping ports to an empty object in the form:
   * `{"<port>/<tcp|udp>": {}}`.
   * ```ts
   * {
   *   ExposedPorts: {
   *     "22/tcp": {},
   *   }
   * }
   * ```
   */
  ExposedPorts: Record<string, unknown>;

  /**
   * Attach standard streams to a TTY, including `stdin` if it is not closed.
   */
  Tty: boolean;

  /**
   * Open `stdin`.
   */
  OpenStdin: boolean;

  /**
   * Close `stdin` after one attached client disconnects.
   */
  StdinOnce: boolean;

  /**
   * A list of environment variables to set inside the container in the form:
   * `["VAR=value", ...]`. A variable without `=` is removed from the environment,
   * rather than to have an empty value.
   */
  Env: string[];

  /**
   * Command to run specified as a string or an array of strings.
   */
  Cmd: string[];

  /**
   * A test to perform to check that the container is healthy.
   */
  Healthcheck: HealthConfig;

  /**
   * The name (or reference) of the image to use when creating the container, or
   * which was used when the container was created.
   */
  Image: string;

  /**
   * An object mapping mount point paths inside the container to empty objects.
   * ```ts
   * {
   *   Volumes: {
   *     "/volumes/data": {}
   *   }
   * }
   * ```
   */
  Volumes: Record<string, unknown>;

  /**
   * The working directory for commands to run in.
   */
  WorkingDir: string;

  /**
   * The entry point for the container as a string or an array of strings.
   *
   * If the array consists of exactly one empty string (`[""]`) then the entry
   * point is reset to system default (i.e., the entry point used by docker
   * when there is no `ENTRYPOINT` instruction in the `Dockerfile`).
   */
  Entrypoint: string[];

  /**
   * Disable networking for the container.
   */
  NetworkDisabled: boolean | null;

  /**
   * `ONBUILD` metadata that were defined in the image's `Dockerfile`.
   */
  OnBuild: string[] | null;

  /**
   * User-defined key/value metadata.
   * ```ts
   * {
   *   Labels: {
   *     "com.example.vendor": "Acme",
   *     "com.example.license": "GPL",
   *     "com.example.version": "1.0"
   *   }
   * }
   * ```
   */
  Labels: Record<string, string>;

  /**
   * Signal to stop a container as a string or unsigned integer.
   */
  StopSignal: string;

  /**
   * Timeout to stop a container in seconds.
   * Default: `10`
   */
  StopTimeout: number;

  /**
   * Shell for when `RUN`, `CMD`, and `ENTRYPOINT` uses a shell.
   */
  Shell: string[];

  /**
   * Container configuration that depends on the host we are running on
   */
  HostConfig: Partial<HostConfig>;

  /**
   * NetworkingConfig represents the container's networking configuration for
   * each of its interfaces. It is used for the networking configs specified
   * in the docker create and docker network connect commands.
   */
  NetworkingConfig: Partial<NetworkingConfig>;
};

type HealthConfig = {
  /**
   * The test to perform. Possible values are:
   * - `[]` inherit healthcheck from image or parent image
   * - `["NONE"]` disable healthcheck
   * - `["CMD", args...]` exec arguments directly
   * - `["CMD-SHELL", command]` run command with system's default shell
   */
  Test: string[];

  /**
   * The time to wait between checks in nanoseconds. It should be 0 or at least
   * 1_000_000 (1 ms). 0 means inherit
   */
  Interval: number;

  /**
   * The time to wait before considering the check to have hung. It should be 0
   * or at least 1_000_000 (1 ms). 0 means inherit.
   */
  Timeout: number;

  /**
   * The number of consecutive failures needed to consider a container as
   * unhealthy. 0 means inherit.
   */
  Retries: number;

  /**
   * Start period for the container to initialize before starting health-retries
   * countdown in nanoseconds. It should be 0 or at least 1_000_000 (1 ms). 0
   * means inherit.
   */
  StartPeriod: number;

  /**
   * The time to wait between checks in nanoseconds during the start period.
   * It should be 0 or at least 1_000_000 (1 ms). 0 means inherit.
   */
  StartInterval: number;
};

type HostConfig = {
  CpuShares: number;
  Memory: number;
  CgroupParent: string;
  BlkioWeight: number;
  BlkioWeightDevice: {
    Path: string;
    Integer: number;
  }[];
  BlkioDeviceReadBps: {
    Path: string;
    Rate: number;
  }[];
  BlkioDeviceWriteBps: {
    Path: string;
    Rate: number;
  }[];
  BlkioDeviceReadIOps: {
    Path: string;
    Rate: number;
  }[];
  BlkioDeviceWriteIOps: {
    Path: string;
    Rate: number;
  }[];
  CpuPeriod: number;
  CpuQuota: number;
  CpuRealtimePeriod: number;
  CpuRealtimeRuntime: number;
  CpusetCpus: string;
  CpusetMems: string;
  Devices: {
    PathOnHost: string;
    PathInContainer: string;
    CgroupPermissions: string;
  }[];
  DeviceCgroupRules: string[];
  DeviceRequests: {
    Driver: string;
    Count: number;
    DeviceIDs: string[];
    Capabilities: string[];
    Options: {
      Name: string;
      Value: string;
    }[];
  }[];
  KernelMemoryTCP: number;
  MemoryReservation: number;
  MemorySwap: number;
  MemorySwappiness: number;
  NanoCPUs: number;
  OomKillDisable: boolean;
  Init: boolean | null;
  PidsLimit: number;
  Ulimits: {
    Name: string;
    Soft: number;
    Hard: number;
  }[];
  CpuCount: number;
  CpuPercent: number;
  IOMaximumIOps: number;
  IOMaximumBandwidth: number;
  Binds: string[];
  ContainerIDFile: string;
  LogConfig: {
    Type: "json-file" | "syslog" | "journald" | "gelf" | "fluentd" | "awslogs" | "splunk" | "etwlogs" | "none";
    Config: Record<string, string>;
  };
  NetworkMode: string;
  PortBindings: Record<string, unknown>;
  RestartPolicy: {
    Name: "" | "no" | "always" | "unless-stopped" | "on-failure";
    MaximumRetryCount: number;
  };
  AutoRemove: boolean;
  VolumeDriver: string;
  VolumesFrom: string[];
  Mounts: {
    Target: string;
    Source: string;
    Type: "bind" | "volume" | "tmpfs" | "npipe" | "cluster";
    ReadOnly: boolean;
    Consistency: "default" | "consistent" | "cached" | "delegated";
    BindOptions: {
      Propagation: "private" | "rprivate" | "shared" | "rshared" | "slave" | "rslave";
      NonRecursive: boolean;
      CreateMountPoint: boolean;
      ReadOnlyNonRecursive: boolean;
      ReadOnlyForcedRecursive: boolean;
    };
    VolumeOptions: {
      NoCopy: boolean;
      Labels: Record<string, string>;
      DriverConfig: {
        Name: string;
        Options: Record<string, string>;
      };
      Subpath: string;
    };
    TmpfsOptions: {
      SizeBytes: number;
      Mode: number;
    };
  }[];
  ConsoleSize: number[];
  Annotations: Record<string, string>;
  CapAdd: string[];
  CapDrop: string[];
  CgroupnsMode: "host" | "private";
  Dns: string[];
  DnsOptions: string[];
  DnsSearch: string[];
  ExtraHosts: string[];
  GroupAdd: string[];
  IpcMode: "none" | "private" | "shareable" | "container:<name_or_id>" | "host";
  Cgroup: string;
  Links: string[];
  OomScoreAdj: number;
  PidMode: "host" | "container:<name_or_id>";
  Privileged: boolean;
  PublishAllPorts: boolean;
  ReadonlyRootfs: boolean;
  SecurityOpt: string[];
  StorageOpt: Record<string, string>;
  Tmpfs: Record<string, string>;
  UTSMode: string;
  UsernsMode: string;
  ShmSize: number;
  Sysctls: Record<string, string>;
  Runtime: string;
  MaskedPaths: string[];
  ReadonlyPaths: string[];
};

type NetworkingConfig = {
  EndpointsConfig: Record<string, EndpointSettings>;
};

type EndpointSettings = {
  IPAMConfig: {
    IPv4Address: string;
    IPv6Address: string;
    LinkLocalIPs: string[];
  };
  Links: string[];
  Aliases: string[];
  NetworkID: string;
  EndpointID: string;
  Gateway: string;
  IPAddress: string;
  IPPrefixLen: number;
  IPv6Gateway: string;
  GlobalIPv6Address: string;
  GlobalIPv6PrefixLen: number;
  MacAddress: string;
};
