import {runValidation} from './index';

void runValidation().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
