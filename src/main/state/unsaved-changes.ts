import {isEqual} from 'lodash';

import { Storage } from '../storage/storage';

import { CueFile } from '@synesthesia-project/core/file';

const MAX_REVISIONS_PER_FILE = 30;

interface TrackState {
  /** All the stored versions of the file */
  revisions: CueFile[];
  /** Versions of the file that have been undone, most recently undone at the end. */
  undone: CueFile[];
}

export class UnsavedChanges {

  /** Mapping from track ID to its state */
  private readonly map = new Map<string, TrackState>();

  public update(id: string, file: CueFile) {
    let state = this.map.get(id);
    if (!state) {
      state = {
        revisions: [],
        undone: []
      };
      this.map.set(id, state);
    }
    if (state.revisions.length > 0 && isEqual(state.revisions[state.revisions.length - 1], file)) {
      // No change to file
      return;
    }
    state.revisions.push(file);
    while (state.revisions.length > MAX_REVISIONS_PER_FILE) {
      state.revisions.shift();
    }
    state.undone = [];
  }

  public getCurrentRevision(id: string) {
    console.log('getCurrentRevision', id);
    const state = this.map.get(id);
    if (state)
      return state.revisions[state.revisions.length - 1];
    return null;
  }

  /** Undo a modification, return true if successful and false otherwise */
  public undo(id: string) {
    console.log('undo', id);
    const state = this.map.get(id);
    if (state && state.revisions.length > 1) {
      const revision = state.revisions.pop();
      if (revision) state.undone.push(revision);
      return true;
    }
    return false;
  }

  /** Redo a modification, return true if successful and false otherwise */
  public redo(id: string) {
    console.log('redo', id);
    const state = this.map.get(id);
    if (state) {
      const revision = state.undone.pop();
      if (revision) {
        state.revisions.push(revision);
        return true;
      }
    }
    return false;
  }

  /** Redo a modification, return true if successful and false otherwise */
  public async save(storage: Storage, id: string) {
    console.log('save', id);
    const state = this.map.get(id);
    if (state) {
      const current = state.revisions[state.revisions.length - 1];
      await storage.saveFile(id, current);
      this.map.delete(id);
      return true;
    }
    return false;
  }

}
