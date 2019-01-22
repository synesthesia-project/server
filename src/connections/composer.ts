import * as WebSocket from 'ws';

import { Endpoint } from '@synesthesia-project/core/protocols/util/endpoint';

import { Notification, PlayStateData } from '@synesthesia-project/composer/dist/integration/shared';

/**
 * Server side of the connection to the composer
 */
export class ComposerConnection extends Endpoint<never, never, Notification> {

  public constructor(ws: WebSocket) {
      super(msg => ws.send(JSON.stringify(msg)));

      ws.on('message', msg => this.recvMessage(JSON.parse(msg)));
      ws.on('close', () => this.closed());

      this.sendNotification({
        type: 'state',
        data: {
          durationMillis: 10000,
          meta: {
            id: '1',
            info: {
              title: 'foo',
              artist: 'bar'
            }
          },
          state: {
            state: 'paused',
            timeMillis: 10
          }
        }
      });
  }

  protected handleRequest(request: never): Promise<never> {
      return new Promise((resolve, reject) => {
          reject(new Error('unknown request type'));
      });
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
    console.log('sendPlayState', data);
    this.sendNotification({
      type: 'state',
      data
    });
  }

}
