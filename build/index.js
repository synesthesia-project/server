"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@synesthesia-project/core/constants");
const server_1 = require("./server");
const server = new server_1.Server(constants_1.DEFAULT_SYNESTHESIA_PORT);
server.start();
