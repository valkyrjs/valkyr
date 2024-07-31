/**
 * Create a child process and pipes its output to the terminal before returning
 *
 * @param command - Shell command to execute in the spawned process.
 * @param args    - Additional arguments to pass to the shell command.
 *
 * @example Spawn a subprocess
 *
 * ```ts
 * const output = await command(Deno.execPath(), "eval", "console.log('Hello World')");
 * console.log(output); // => Hello World
 * ```
 *
 * @tags allow-run
 */
export async function command(command: string, ...args: string[]): Promise<string> {
  const process = new Deno.Command(command, { args, stdout: "piped", stderr: "piped" }).spawn();

  const stdout = process.stdout.getReader();
  const stderr = process.stderr.getReader();

  const [output, error] = await Promise.all([
    readStream(stdout),
    readStream(stderr),
  ]);

  await process.status;

  if (error !== "") {
    throw new Error(error.replace(/\n$/, ""));
  }
  return output.replace(/\n$/, "");
}

/**
 * Create a child process and pipes its output to the terminal.
 *
 * @param command - Shell command to execute in the spawned process.
 * @param args    - Additional arguments to pass to the shell command.
 *
 * @example Spawn a subprocess
 *
 * ```ts
 * await execute(Deno.execPath(), "eval", "console.log('Hello World')");
 * ```
 *
 * @tags allow-run
 */
export async function execute(command: string, ...args: string[]): Promise<void> {
  const process = new Deno.Command(command, { args, stdout: "piped", stderr: "piped" }).spawn();

  const stdout = process.stdout.getReader();
  const stderr = process.stderr.getReader();

  await Promise.all([
    printStream(stdout),
    printStream(stderr),
  ]);

  await process.status;
}

async function printStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  while (true) {
    const { value, done } = await reader.read();
    if (done === true) {
      break;
    }
    await Deno.stdout.write(value);
  }
}

async function readStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done === true) {
      break;
    }
    result += decoder.decode(value);
  }
  return result;
}
