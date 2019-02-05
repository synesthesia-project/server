import {isEqual} from 'lodash';

import { PlayStateData as ControllerPlayStateData } from '@synesthesia-project/core/protocols/control/messages';
import * as composerProtocol from '@synesthesia-project/composer/dist/integration/shared';
import { CueFile, emptyFile } from '@synesthesia-project/core/file';

import { ComposerConnection } from '../connections/composer';
import { ControllerConnection } from '../connections/controller';

import {MetaIDs} from './meta-ids';
import { UnsavedChanges } from './unsaved-changes';
import { Storage } from '../storage/storage';

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
  private readonly storage: Storage;

  private readonly composers = new Set<ComposerConnection>();
  private readonly controllers = new Set<ControllerState>();

  private lastFileSentToAllComposers: composerProtocol.ServerCueFileModifiedNotification | null = null;

  public constructor(dataDir: string) {
    this.storage = new Storage(dataDir);
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
        this.getTrackState(mainSongAndController.state).then(trackState =>
          composer.sendNotification({
            type: 'cue-file-modified',
            file: trackState.state,
            id: mainSongAndController.state.meta.id,
            fileState: trackState.fileState
          })
        );
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

  private async handleFileAction(request: composerProtocol.FileActionRequest): Promise<composerProtocol.Response> {
    let success = false;
    switch (request.action) {
      case 'undo':
      success = this.unsavedChanges.undo(request.id);
      break;
      case 'redo':
      success = this.unsavedChanges.redo(request.id);
      break;
      case 'save':
      success = await this.unsavedChanges.save(this.storage, request.id).catch(err => {
        console.error(err);
        return false;
      });
      break;
    }
    if (success) {
      this.sendStateToComposers();
    }
    return Promise.resolve({success});
  }

  private handleComposerNotification(_composer: ComposerConnection) {
    return (notification: composerProtocol.Notification) => {
      switch (notification.type) {
        case 'cue-file-modified': {
          // Only update unsavedChanges if the file has actually changed
          if (!this.lastFileSentToAllComposers || !isEqual(this.lastFileSentToAllComposers.file, notification.file)) {
            this.unsavedChanges.update(notification.id, notification.file);
            // Send to ALL composers, because notification includes updated FileState
            this.sendStateToComposers();
          }
        }
      }
      console.log('got notif', notification);
    };
  }

  private async sendStateToComposers() {
    const mainSongAndController = this.calculateMainSongAndController();
    console.log(`play State Updated`);
    if (mainSongAndController) {
      console.log(`sending state to ${this.composers.size} composers`, mainSongAndController);
      this.composers.forEach(composer => composer.sendPlayState(mainSongAndController.state));
      const trackState = await this.getTrackState(mainSongAndController.state);
      const notification = this.lastFileSentToAllComposers = {
        type: 'cue-file-modified',
        file: trackState.state,
        id: mainSongAndController.state.meta.id,
        fileState: trackState.fileState
      };
      this.composers.forEach(composer => composer.sendNotification(notification));
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

  private async getTrackState(state: composerProtocol.PlayStateData): Promise<{state: CueFile, fileState: composerProtocol.FileState}> {
    let fileState: composerProtocol.FileState = {
      canRedo: false,
      canSave: false,
      canUndo: false
    };
    const unsavedState = this.unsavedChanges.getCurrentRevision(state.meta.id);
    if (unsavedState) {
      fileState = unsavedState.fileState;
      if (unsavedState.state)
        return {state: unsavedState.state, fileState};
    }
    // Nothing in-memory, check disk
    const savedState = await this.storage.getFile(state.meta.id).catch(() => null);
    if (savedState) return {state: savedState, fileState};
    // Nothing in-memory or on disk
    return {state: emptyFile(state.durationMillis), fileState};
  }


}

