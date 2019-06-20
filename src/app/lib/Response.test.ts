import 'jest';
import {Response} from './Response';

describe('Response', () => {
  let response!: Response;

  beforeEach(() => {
    response = new Response();
  });

  describe('body', () => {
    it('converts a string to a Uint8Array', () => {
      response.body = 'foo';
      expect(response.bodyAsU8Array).toEqual(new Uint8Array([102, 111, 111]));
    });

    it('clears an existing body', () => {
      response.body = 'foo';
      response.body = null;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });

  describe('bodyAsU8Array', () => {
    it('sets the body to a provided Uint8Array without copying', () => {
      const body = new Uint8Array([102, 111, 111]);
      response.bodyAsU8Array = body;
      expect(response.bodyAsU8Array).toBe(body);
    });

    it('clears the body when set to undefined', () => {
      expect(response.bodyAsU8Array).toBeUndefined();
      response.bodyAsU8Array = new Uint8Array([102, 111, 111]);
      expect(response.bodyAsU8Array).not.toBeUndefined();
      response.bodyAsU8Array = undefined;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });

  describe('bodyJSON', () => {
    it('stringifies a json object', () => {
      const body = {foo: 'bar'};
      response.bodyJSON = body;
      expect(Buffer.from(response.bodyAsU8Array as Uint8Array).toString()).toEqual('{"foo":"bar"}');
    });

    it('clears the body when set to undefined', () => {
      response.bodyAsU8Array = new Uint8Array([102, 111, 111]);
      expect(response.bodyAsU8Array).not.toBeUndefined();
      response.bodyJSON = undefined;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });
});
