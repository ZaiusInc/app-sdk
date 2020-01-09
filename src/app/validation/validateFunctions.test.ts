import * as deepFreeze from 'deep-freeze';
import 'jest';
import {Function} from '../Function';
import {Request, Response} from '../lib';
import {Runtime} from '../Runtime';
import {AppManifest} from '../types';
import {validateFunctions} from './validateFunctions';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform']
  },
  runtime: 'node12',
  functions: {
    foo: {
      entry_point: 'Foo',
      description: 'gets foo'
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  }
} as AppManifest);

/* tslint:disable */
class NonExtendedFoo {
  // Nothing
}

abstract class PartialFoo extends Function {
  protected constructor(request: Request) {
    super(request);
  }
}

class ProperFoo extends Function {
  public constructor(request: Request) {
    super(request);
  }

  public async perform(): Promise<Response> {
    return new Response();
  }
}
/* tslint:disable */

describe('validateFunctions', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass').mockResolvedValue(ProperFoo);

    const errors = await validateFunctions(runtime);

    expect(getFunctionClass).toHaveBeenCalledWith('foo');
    expect(errors).toEqual([]);

    getFunctionClass.mockRestore();
  });

  it('detects missing function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass')
      .mockRejectedValue(new Error('not found'));

    expect(await validateFunctions(runtime)).toEqual(['Entry point not found for function: foo']);

    getFunctionClass.mockRestore();
  });

  it('detects non-extended function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass')
      .mockResolvedValue(NonExtendedFoo as any);

    expect(await validateFunctions(runtime)).toEqual(['Function entry point does not extend App.Function: Foo']);

    getFunctionClass.mockRestore();
  });

  it('detects partial function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass').mockResolvedValue(PartialFoo as any);

    expect(await validateFunctions(runtime)).toEqual(['Function entry point is missing the perform method: Foo']);

    getFunctionClass.mockRestore();
  });
});
