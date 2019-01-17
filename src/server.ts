import * as http from 'http';
import * as WebSocket from 'ws';
import { ServerEndpoint } from '@synesthesia-project/core/protocols/control';
import { PlayStateData } from '@synesthesia-project/core/protocols/control/messages';

export class Server {

    private readonly port: number;
    private readonly server: http.Server;
    private readonly wss: WebSocket.Server;

    public constructor(
        port: number,
    ) {
        this.port = port;

        this.server = http.createServer((request, response) => {
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
