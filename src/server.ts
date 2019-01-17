import * as fs from 'fs';
import * as http from 'http';
import * as WebSocket from 'ws';
import { ServerEndpoint } from '@synesthesia-project/core/protocols/control';
import { PlayStateData } from '@synesthesia-project/core/protocols/control/messages';

import * as composer from '@synesthesia-project/composer';

const COMPOSER_URL = '/composer';

export class Server {

    private readonly port: number;
    private readonly server: http.Server;
    private readonly wss: WebSocket.Server;

    public constructor(
        port: number,
    ) {
        this.port = port;

        this.server = http.createServer((request, response) => {

            if (request.url) {
                if (request.url === COMPOSER_URL) {
                    response.writeHead(302, {Location: COMPOSER_URL + '/' });
                    response.end('', 'utf-8');
                    return;
                }
                if (request.url.startsWith(COMPOSER_URL + '/')) {
                    const composerPath = request.url.substr(COMPOSER_URL.length);
                    if (composerPath === '/') {
                        response.writeHead(200, { 'Content-Type': 'text/html' });
                        response.end(composer.getIndexHtml(), 'utf-8');
                        return;
                    }
                    for (const file of composer.STATIC_FILES) {
                        if (file.url === composerPath) {
                            response.writeHead(200, { 'Content-Type': file.contentType });
                            this.sendStaticFile(file.path, response, file.contentType);
                            return;
                        }
                    }
                }
            }

            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.end('not found', 'utf-8');
        });

        this.wss = new WebSocket.Server({
            server: this.server
        });

        this.wss.on('connection', this.handleConnection.bind(this));
    }

    public start() {
        this.server.listen(this.port, () => {
            console.log('Synesthesia Server Started on port: ' + this.port);
        });
    }

    private sendStaticFile(file: string, response: http.ServerResponse, contentType: string) {
        fs.readFile(file, function (error, content) {
            if (error) {
                if (error.code === 'ENOENT') {
                    response.writeHead(404, { 'Content-Type': 'text/plain' });
                    response.end('file not found', 'utf-8');
                } else {
                    response.writeHead(500, { 'Content-Type': 'text/plain' });
                    response.end('Error', 'utf-8');
                    console.error(error);
                }
            } else {
                response.writeHead(200, { 'Content-Type': contentType });
                response.end(content, 'utf-8');
            }
        });
    }

    private newPlayState(state: PlayStateData) {
        console.log('new play state:', state);
    }

    private handleConnection(ws: WebSocket) {
        console.log('new connection');
        const endpoint = new ServerEndpoint(
            msg => ws.send(JSON.stringify(msg)),
            state => this.newPlayState(state)
            );
        ws.on('message', msg => endpoint.recvMessage(JSON.parse(msg)));
        ws.on('close', () => endpoint.closed());
    }

}
