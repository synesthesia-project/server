import { DEFAULT_SYNESTHESIA_PORT } from '@synesthesia-project/core/constants';

import { Server } from './server';
import * as s2 from './server';
import * as s3 from './server';

const dataDir = process.argv[2];

if (!dataDir) {
  console.log('No data dir specified');
  process.exit(1);
}

console.log('Data Dir:', dataDir);

const server = new Server(DEFAULT_SYNESTHESIA_PORT, dataDir);
server.start();

