import * as WebSocket from 'ws';

import { UpstreamEndpoint } from '@synesthesia-project/core/protocols/broadcast';

interface DownstreamConnectionListener {
  closed(): void;
}

/**
 * A connection to a downstream endpoint (from the POV of the upstream server).
 */
export class DownstreamConnection extends UpstreamEndpoint {

  private readonly listeners = new Set<DownstreamConnectionListener>();

  public constructor(ws: WebSocket) {
    super(
      msg => ws.send(JSON.stringify(msg)),
      pingData => {
        console.log('Got Ping Data:', pingData);
      }
    );

    ws.on('message', msg => this.recvMessage(JSON.parse(msg)));
    ws.on('close', () => this.closed());
  }

  protected handleClosed() {
    this.listeners.forEach(l => l.closed());
  }

  public addListener(listener: DownstreamConnectionListener) {
    this.listeners.add(listener);
  }

  public removeListener(listener: DownstreamConnectionListener) {
    this.listeners.delete(listener);
  }

}
