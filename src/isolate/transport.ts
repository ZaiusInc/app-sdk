/**
 * Project Mallorn — the contract between the isolate runtime (owned here, in
 * app-sdk) and the host (anduin). The host implements this and passes it to
 * {@link installIsolateRuntime}. app-sdk stays transport-agnostic: it knows
 * nothing about isolated-vm; the host adapts its primitives to this interface.
 */
export interface HostTransport {
  /**
   * Async host capability dispatch. `channel` selects the handler
   * ('fetch' | 'store' | 'jobs' | 'notify' | 'functions' | 'sources' | 'sleep');
   * `payload` is the JSON-encoded operation; resolves to the JSON-encoded result.
   */
  invoke(channel: string, payload: string): Promise<string>;
  /** Sync, fire-and-forget logging. */
  log(level: string, message: string): void;
  /**
   * Synchronous host crypto. Node's `crypto` API is sync (createHash/createHmac/
   * randomBytes/randomUUID), so it cannot use the async {@link invoke} bridge —
   * it goes through a sync host call. `payload` is the JSON-encoded operation;
   * returns the JSON-encoded result.
   */
  crypto(payload: string): string;
}
