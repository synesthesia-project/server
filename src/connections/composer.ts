import * as WebSocket from 'ws';

import { RequestHandlerEndpoint } from '@synesthesia-project/core/protocols/util/endpoint';

import { Request, Response, Notification, PlayStateData } from '@synesthesia-project/composer/dist/integration/shared';

/**
 * Server side of the connection to the composer
 */
export class ComposerConnection extends RequestHandlerEndpoint<Request, Response, Notification> {

  private closeListeners = new Set<() => void>();

  public constructor(ws: WebSocket) {
      super(msg => ws.send(JSON.stringify(msg)));

      ws.on('message', msg => this.recvMessage(JSON.parse(msg)));
      ws.on('close', () => this.closed());
  }

  protected handleNotification(notification: Notification) {
    switch (notification.type) {
    }
    console.error('unknown notification:', notification);
  }

  protected handleClosed() {
    this.closeListeners.forEach(l => l());
  }

  public sendPlayState(data: PlayStateData) {
    this.sendNotification({
      type: 'state', data
    });
  }

  public addListener(event: 'close', listener: () => void) {
    this.closeListeners.add(listener);
  }

  public removeListener(event: 'close', listener: () => void) {
    this.closeListeners.delete(listener);
  }

}
