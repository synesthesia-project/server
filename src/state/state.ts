
import { PlayStateData as ControllerPlayStateData } from '@synesthesia-project/core/protocols/control/messages';
import * as composerProtocol from '@synesthesia-project/composer/dist/integration/shared';

import { ComposerConnection } from '../connections/composer';
import { ControllerConnection } from '../connections/controller';

interface ControllerState {
  controller: ControllerConnection;
  state: ControllerPlayStateData | null;
  lastUpdated: number;
}

/**
 * Manage play state
 */
export class ServerState {

  private readonly composers = new Set<ComposerConnection>();
  private readonly controllers = new Set<ControllerState>();

  public constructor() {
    this.handleComposerRequest = this.handleComposerRequest.bind(this);
  }

  public addComposer(composer: ComposerConnection) {
    this.composers.add(composer);
    const playState = this.calculateComposerState();
    if (playState)
      composer.sendPlayState(playState.state);
    composer.setRequestHandler(this.handleComposerRequest);
    composer.addListener('close', () => this.composers.delete(composer));
  }

  public addController(controller: ControllerConnection) {
    const controllerState: ControllerState = {
      controller,
      state: null,
      lastUpdated: new Date().getTime()
    };
    this.controllers.add(controllerState);
    // TODO: add listeners (handle when closed especially)
    controller.addListener({
      closed: () => this.controllers.delete(controllerState),
      playStateUpdated: state => {
        controllerState.state = state;
        controllerState.lastUpdated = new Date().getTime();
        this.sendStateToComposers();
      }
    });
  }

  private handleComposerRequest(request: composerProtocol.Request): Promise<composerProtocol.Response> {
    const playState = this.calculateComposerState();
    if (!playState) {
      console.log ('no active controllers');
      return Promise.resolve({success: false});
    }
    switch (request.request) {
      case 'toggle':
      case 'pause':
      case 'go-to-time':
        return playState.controller.controller.sendRequest(request);
    }
  }

  private sendStateToComposers() {
    const playState = this.calculateComposerState();
    console.log(`play State Updated`);
    if (playState) {
      console.log(`sending state to ${this.composers.size} composers`, playState);
      this.composers.forEach(composer => composer.sendPlayState(playState.state));
    }
    // TODO: handle no play state (i.e. no controller or no layers)
  }

  private calculateComposerState() {

    const playingLayers: {state: composerProtocol.PlayStateData, controller: ControllerState}[] = [];
    const pausedLayers: {state: composerProtocol.PlayStateData, controller: ControllerState}[] = [];

    for (const controller of this.controllers.values()) {
      if (controller.state) {
        console.log(controller.state);
        for (const layer of controller.state.layers) {
          if (layer.file.type === 'meta') {
            const state: composerProtocol.PlayStateData = {
              durationMillis: layer.file.lengthMillis,
              meta: {
                info: {
                  title: layer.file.title,
                  artist: layer.file.artist
                }
              },
              state: layer.state
            };
            (layer.state.type === 'playing' ? playingLayers : pausedLayers).push({state, controller});
          } else {
            console.error('file based not supported yet');
          }
        }
      }
    }

    // If we have a playing state, pick that (most recently updated first)
    playingLayers.sort((a, b) => a.controller.lastUpdated - b.controller.lastUpdated);
    for (const layer of playingLayers)
      return layer;

    // Next, ifIf we have a paused state, pick that (most recently updated first)
    pausedLayers.sort((a, b) => a.controller.lastUpdated - b.controller.lastUpdated);
    for (const layer of pausedLayers)
      return layer;

    return null;
  }


}

