
import { PlayStateData as ControllerPlayStateData } from '@synesthesia-project/core/protocols/control/messages';
import { Notification, PlayStateData as ComposerPlayStateData } from '@synesthesia-project/composer/dist/integration/shared';

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

  public addComposer(composer: ComposerConnection) {
    this.composers.add(composer);
    // TODO: add listeners
    const playState = this.calculateComposerState();
    if (playState)
      composer.sendPlayState(playState);
  }

  public addController(controller: ControllerConnection) {
    const controllerState: ControllerState = {
      controller,
      state: null,
      lastUpdated: new Date().getTime()
    };
    this.controllers.add(controllerState);
    // TODO: add listeners
    controller.addListener({
      closed: () => this.controllers.delete(controllerState),
      playStateUpdated: state => {
        controllerState.state = state;
        controllerState.lastUpdated = new Date().getTime();
        this.sendStateToComposers();
      }
    });
  }

  private sendStateToComposers() {
    const playState = this.calculateComposerState();
    console.log(`playState:`, playState);
    if (playState) {
      console.log(`sending state to ${this.composers.size} composers`, playState);
      this.composers.forEach(composer => composer.sendPlayState(playState));
    }
    // TODO: handle no play state (i.e. no controller or no layers)
  }

  private calculateComposerState(): ComposerPlayStateData | null {

    const playingLayers: {state: ComposerPlayStateData, controller: ControllerState}[] = [];
    const pausedLayers: {state: ComposerPlayStateData, controller: ControllerState}[] = [];

    for (const controller of this.controllers.values()) {
      if (controller.state) {
        console.log(controller.state);
        for (const layer of controller.state.layers) {
          if (layer.file.type === 'meta') {
            const state: ComposerPlayStateData = {
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
      return layer.state;

    // Next, ifIf we have a paused state, pick that (most recently updated first)
    pausedLayers.sort((a, b) => a.controller.lastUpdated - b.controller.lastUpdated)
    for (const layer of pausedLayers)
      return layer.state;

    return null;
  }


}

