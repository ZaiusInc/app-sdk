/**
 * Project Mallorn — in-isolate `crypto` shim. Node's crypto is synchronous, so it
 * goes over the SYNC host bridge ({@link HostTransport.crypto}); bytes are
 * base64-encoded in the JSON payload. Stateful builders (createHash/createHmac)
 * accumulate chunks in-isolate and make one host call on digest(). Covers the
 * common app needs: hashing, HMAC signature verification, random, digest.
 */
import {Buffer} from 'buffer';

import {HostTransport} from './transport';

/** Build the Node `crypto` module + Web Crypto global, transport-backed. */
export function createCrypto(transport: HostTransport) {
  const cryptoCall = (op: string, a: Record<string, unknown>): Record<string, unknown> =>
    JSON.parse(transport.crypto(JSON.stringify({op, ...a})));
  const toU8 = (data: unknown, enc?: string): Uint8Array => {
    if (data instanceof Uint8Array) {
      return data;
    }
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }
    return new Uint8Array(Buffer.from(String(data), (enc as BufferEncoding) || 'utf8'));
  };
  const b64 = (u8: Uint8Array): string => Buffer.from(u8).toString('base64');

  const makeHasher = (op: 'hash' | 'hmac', algorithm: string, key?: unknown) => {
    const chunks: Uint8Array[] = [];
    const keyB64 = key !== undefined ? b64(toU8(key)) : undefined;
    return {
      update(data: unknown, enc?: string) {
        chunks.push(toU8(data, enc));
        return this;
      },
      digest(enc?: string) {
        const data = b64(Buffer.concat(chunks.map((c) => Buffer.from(c))));
        const out = Buffer.from(String(cryptoCall(op, {algorithm, key: keyB64, data}).b64), 'base64');
        return enc ? out.toString(enc as BufferEncoding) : out;
      }
    };
  };

  const randomUUID = (): string => String(cryptoCall('randomUUID', {}).uuid);
  const randomBytes = (n: number): Uint8Array => Buffer.from(String(cryptoCall('randomBytes', {n}).b64), 'base64');
  const getRandomValues = <T extends ArrayBufferView>(arr: T): T => {
    const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    u8.set(randomBytes(u8.length));
    return arr;
  };
  const timingSafeEqual = (x: unknown, y: unknown): boolean =>
    Boolean(cryptoCall('timingSafeEqual', {a: b64(toU8(x)), b: b64(toU8(y))}).equal);
  const subtle = {
    digest(algorithm: string | {name: string}, data: unknown): Promise<ArrayBuffer> {
      const alg = typeof algorithm === 'string' ? algorithm : algorithm.name;
      const out = Buffer.from(
        String(cryptoCall('subtleDigest', {algorithm: alg, data: b64(toU8(data))}).b64),
        'base64'
      );
      return Promise.resolve(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
    }
  };

  const webCrypto = {randomUUID, getRandomValues, subtle};
  const nodeCrypto = {
    randomUUID,
    randomBytes,
    getRandomValues,
    timingSafeEqual,
    createHash: (algorithm: string) => makeHasher('hash', algorithm),
    createHmac: (algorithm: string, key: unknown) => makeHasher('hmac', algorithm, key),
    webcrypto: webCrypto
  };
  return {nodeCrypto, webCrypto};
}
