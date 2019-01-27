
import { PlayStateData as ControllerPlayStateData, Layer } from '@synesthesia-project/core/protocols/control/messages';
import * as composerProtocol from '@synesthesia-project/composer/dist/integration/shared';
import { emptyFile } from '@synesthesia-project/core/file';

import { ComposerConnection } from '../connections/composer';
import { ControllerConnection } from '../connections/controller';

import {MetaIDs} from './meta-ids';
import { UnsavedChanges } from './unsaved-changes';

interface ControllerState {
  controller: ControllerConnection;
  state: ControllerPlayStateData | null;
  lastUpdated: number;
}

type MainSongAndLayer = {state: composerProtocol.PlayStateData, controller: ControllerState};

/**
 * Manage play state
 */
export class ServerState {

  private readonly metaIDs = new MetaIDs();
  private readonly unsavedChanges = new UnsavedChanges();

  private readonly composers = new Set<ComposerConnection>();
  private readonly controllers = new Set<ControllerState>();

  public constructor() {
    this.handleComposerRequest = this.handleComposerRequest.bind(this);
    this.handleComposerNotification = this.handleComposerNotification.bind(this);
  }

  public addComposer(composer: ComposerConnection) {
    this.composers.add(composer);
    const songAndControler = this.calculateMainSongAndController();
    if (songAndControler) {
      composer.sendPlayState(songAndControler.state);
      const mainSongAndController = this.calculateMainSongAndController();
      if (mainSongAndController) {
        composer.sendPlayState(mainSongAndController.state);
        const trackState = this.getTrackState(mainSongAndController.state);
        composer.sendNotification({
          type: 'cue-file-modified',
          file: trackState,
          id: mainSongAndController.state.meta.id
        });
      }
    }
    composer.setRequestHandler(this.handleComposerRequest);
    composer.addListener('close', () => this.composers.delete(composer));
    composer.addListener('notification', this.handleComposerNotification(composer));
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
    const mainSongAndController = this.calculateMainSongAndController();
    if (!mainSongAndController) {
      console.log ('no active controllers');
      return Promise.resolve({success: false});
    }
    switch (request.request) {
      case 'toggle':
      case 'pause':
      case 'go-to-time':
        return mainSongAndController.controller.controller.sendRequest(request);
      case 'file-action':
        return this.handleFileAction(request);
    }
  }

  private handleFileAction(request: composerProtocol.FileActionRequest): Promise<composerProtocol.Response> {
    let success = false;
    switch (request.action) {
      case 'undo':
      success = this.unsavedChanges.undo(request.id);
      break;
      case 'redo':
      success = this.unsavedChanges.redo(request.id);
      break;
    }
    if (success) {
      this.sendStateToComposers();
    }
    return Promise.resolve({success});
  }

  private handleComposerNotification(composer: ComposerConnection) {
    return (notification: composerProtocol.Notification) => {
      switch (notification.type) {
        case 'cue-file-modified': {
          // Store the change
          this.unsavedChanges.update(notification.id, notification.file);

          // If it's the current song, send the notification to the all other composers
          const mainSongAndController = this.calculateMainSongAndController();
          if (mainSongAndController && mainSongAndController.state.meta.id === notification.id) {
            for (const c of this.composers) {
              if (composer !== c)
                c.sendNotification(notification);
            }
          }
        }
      }
      console.log('got notif', notification);
    };
  }

  private sendStateToComposers() {
    const mainSongAndController = this.calculateMainSongAndController();
    console.log(`play State Updated`);
    if (mainSongAndController) {
      console.log(`sending state to ${this.composers.size} composers`, mainSongAndController);
      this.composers.forEach(composer => composer.sendPlayState(mainSongAndController.state));
      const trackState = this.getTrackState(mainSongAndController.state);
      this.composers.forEach(composer => composer.sendNotification({
        type: 'cue-file-modified',
        file: trackState,
        id: mainSongAndController.state.meta.id
      }));
    }
    // TODO: handle no play state (i.e. no controller or no layers)
  }

  private calculateMainSongAndController() {

    const playingLayers: MainSongAndLayer[] = [];
    const pausedLayers: MainSongAndLayer[] = [];

    for (const controller of this.controllers.values()) {
      if (controller.state) {
        console.log(controller.state);
        for (const layer of controller.state.layers) {
          if (layer.file.type === 'meta') {
            const state: composerProtocol.PlayStateData = {
              durationMillis: layer.file.lengthMillis,
              meta: {
                id: this.metaIDs.getId(layer.file),
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

  private getTrackState(state: composerProtocol.PlayStateData) {
    const trackState = this.unsavedChanges.getCurrentRevision(state.meta.id);
    if (trackState) {
      return trackState;
    } else {
      return emptyFile(state.durationMillis);
    }
  }


}

