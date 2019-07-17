// silence expected console.error(); comment out when debugging tests, but incompatible with mock-fs
jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
