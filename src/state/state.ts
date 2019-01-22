
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

  public addComposer(composers: ComposerConnection) {
    this.composers.add(composers);
    // TODO: add listeners
    // consumer.
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
    console.log(`sending state to ${this.composers.size} composers`, playState);
    if (playState) {
      this.composers.forEach(composer => composer.sendPlayState(playState));
    }
    // TODO: handle no play state (i.e. no composer or no layers)
  }

  private calculateComposerState(): ComposerPlayStateData | null {
    // TODO: more intelligently pick a controller + layer to use
    let playState: ComposerPlayStateData | null = null;
    this.controllers.forEach(controllerState => {
      // Just set it to a layer!
      if (controllerState.state && controllerState.state.layers.length > 0) {
        for (const layer of controllerState.state.layers) {
          if (layer.file.type === 'meta') {
            playState = {
              durationMillis: layer.file.lengthMillis,
              meta: {
                // TODO implement ID
                id: '1'
              },
              state: {
                state: 'playing',
                effectiveStartTimeMillis: layer.effectiveStartTimeMillis,
                playSpeed: layer.playSpeed
              }
            };
          } else {
            console.error('file based not supported yet');
          }
        }
        const s = controllerState.state.layers[0];
      }
    });
    return playState;
  }


}

