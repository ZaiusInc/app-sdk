import * as path from 'path';
import {Runtime} from '../Runtime';
import {validateApp} from './validateApp';

Runtime.initialize(path.resolve(process.cwd(), 'dist'), true).then(async (runtime) => {
  console.log(JSON.stringify({errors: await validateApp(runtime)}));
}).catch((e) => {
  console.error(`Validation process failed: ${e.message}`);
});
