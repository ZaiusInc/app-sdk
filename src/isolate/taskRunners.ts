/**
 * In-isolate task runners (`globalThis.__runFunction`, `__runJob`), mirroring the
 * fork Function/Job execution. Kept as real TS (not host-built strings) so the
 * logic is type-checked + lintable; anduin's IsolateRuntime just injects inputs
 * and calls these. Globals they read (__App/__makeRequest/__serializeResponse/
 * __appSdk) are all present by the time they're invoked.
 */

type Glob = Record<string, unknown>;

interface FunctionInstance {
  perform(): Promise<unknown>;
}

interface JobInstance {
  prepare(params: unknown, status?: unknown, resuming?: boolean): Promise<JobStatusLike>;
  perform(status: JobStatusLike): Promise<JobStatusLike>;
}

interface JobStatusLike {
  complete?: boolean;
  [key: string]: unknown;
}

interface KvStore {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown, options?: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

/** Install `globalThis.__runFunction` and `globalThis.__runJob`. */
export function installTaskRunners(g: Glob): void {
  g.__runFunction = async (task: string, reqData: unknown): Promise<unknown> => {
    const app = g.__App as Record<string, new (req: unknown) => FunctionInstance> | undefined;
    const FnClass = app && app[task];
    if (typeof FnClass !== 'function') {
      throw new Error(`function not found in bundle: ${task}`);
    }
    const makeRequest = g.__makeRequest as (d: unknown) => unknown;
    const serialize = g.__serializeResponse as (r: unknown) => unknown;
    const fn = new FnClass(makeRequest(reqData));
    return serialize(await fn.perform());
  };

  // Mirrors the fork SarnGebir.runJob: resume from the persisted status, run
  // prepare -> perform loop, persist status (via the bridged kvStore) after each
  // change so a crashed/timed-out job resumes, and clean up on completion.
  g.__runJob = async (
    task: string,
    invocation: {jobId?: string; [key: string]: unknown},
    params: unknown,
    wallClockMs: number
  ): Promise<unknown> => {
    const app = g.__App as Record<string, new (inv: unknown) => JobInstance> | undefined;
    const JobClass = app && app[task];
    if (typeof JobClass !== 'function') {
      throw new Error(`job not found in bundle: ${task}`);
    }
    const kv = (g.__appSdk as {storage: {kvStore: KvStore}}).storage.kvStore;
    const job = new JobClass(invocation);
    const key = `_/jobs/${invocation.jobId}`;
    const rowOptions = {ttl: 7 * 24 * 60 * 60}; // 7 days

    const existing = (await kv.get(key)) as JobStatusLike | null;
    const resuming = existing != null && Object.keys(existing).length > 0;
    let status = await job.prepare(params, resuming ? existing : undefined, resuming);
    await kv.put(key, status, rowOptions);
    let lastSerialized = JSON.stringify(status);

    const start = Date.now();
    while (status && status.complete !== true) {
      status = await job.perform(status);
      const serialized = JSON.stringify(status);
      if (serialized !== lastSerialized) {
        await kv.put(key, status, rowOptions);
        lastSerialized = serialized;
      }
      if (wallClockMs > 0 && Date.now() - start > wallClockMs) {
        throw new Error(`job exceeded wall-clock limit of ${wallClockMs}ms`);
      }
    }
    if (status && status.complete) {
      await kv.delete(key);
    }
    return status == null ? null : status;
  };
}
