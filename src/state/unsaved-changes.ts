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
    state.revisions.push(file);
    while (state.revisions.length > MAX_REVISIONS_PER_FILE) {
      state.revisions.shift();
    }
    state.undone = [];
  }

  public getCurrentRevision(id: string) {
    const state = this.map.get(id);
    if (state)
      return state.revisions[state.revisions.length - 1];
    return null;
  }

}
