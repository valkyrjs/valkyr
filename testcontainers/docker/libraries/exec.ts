import { delay } from "@std/async/delay";

import { modem } from "./modem.ts";

export class Exec {
  constructor(readonly id: string) {}

  /**
   * Starts the current exec instance. If detach is true, this endpoint
   * returns immediately after starting the command. Otherwise, it sets up an
   * interactive session with the command.
   *
   * @param body - Request body schema.
   */
  async start(body: Partial<StartSchema> = {}): Promise<void> {
    await modem.post({ path: `/exec/${this.id}/start`, body });
    await this.#endSignal();
  }

  /**
   * Return low-level information about the exec instance.
   */
  async inspect(): Promise<InspectResponse> {
    return modem.get<InspectResponse>({ path: `/exec/${this.id}/json` });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Wait for the current exec instance to finish its execution by observing
   * its running state.
   *
   * [TODO] Introduce a timeout signal in case we want to add a treshold to the
   * running time.
   */
  async #endSignal(): Promise<void> {
    while (true) {
      const info = await this.inspect();
      if (info.Running === false) {
        break;
      }
      await delay(250);
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type CreateExecOptions = {
  AttachStdin: boolean;
  AttachStdout: boolean;
  AttachStderr: boolean;
  ConsoleSize: [number, number];
  Tty: boolean;
  Env: string[];
  Cmd: string[];
  Privileged: boolean;
  User: string;
  WorkingDir: string;
};

type StartSchema = {
  /**
   * Detach from the command.
   */
  Detach: boolean;

  /**
   * Allocate a pseudo-TTY.
   */
  Tty: boolean;

  /**
   * Initial console size, as an `[height, width]` array.
   */
  ConsoleSize?: [number, number];
};

type InspectResponse = {
  CanRemove: boolean;
  ContainerID: string;
  DetachKeys: string;
  ExitCode: number;
  ID: string;
  OpenStderr: boolean;
  OpenStdin: boolean;
  OpenStdout: boolean;
  ProcessConfig: ProcessConfig;
  Running: boolean;
  Pid: number;
};

type ProcessConfig = {
  arguments: string[];
  entrypoint: string;
  privileged: boolean;
  tty: boolean;
  user: string;
};
