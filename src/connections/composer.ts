import * as WebSocket from 'ws';

import { RequestHandlerEndpoint } from '@synesthesia-project/core/protocols/util/endpoint';

import { Request, Response, Notification, PlayStateData } from '@synesthesia-project/composer/dist/integration/shared';

type RequestHandler = (request: Request) => Promise<Response>;

/**
 * Server side of the connection to the composer
 */
export class ComposerConnection extends RequestHandlerEndpoint<Request, Response, Notification> {

  public constructor(ws: WebSocket) {
      super(msg => ws.send(JSON.stringify(msg)));

      ws.on('message', msg => this.recvMessage(JSON.parse(msg)));
      ws.on('close', () => this.closed());
  }

  protected handleNotification(notification: Notification) {
    console.error('got notification:', notification);
    switch (notification.type) {
    }
    console.error('unknown notification:', notification);
  }

  protected handleClosed() {
    console.log('connection closed');
  }

  public sendPlayState(data: PlayStateData) {
    this.sendNotification({
      type: 'state', data
    });
  }

}
