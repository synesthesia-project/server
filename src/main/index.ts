import { DEFAULT_SYNESTHESIA_PORT } from '@synesthesia-project/core/constants';

import { Server } from './server';

const server = new Server(DEFAULT_SYNESTHESIA_PORT);
server.start();

