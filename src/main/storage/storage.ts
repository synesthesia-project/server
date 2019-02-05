import { promises as fs} from 'fs';
import * as path from 'path';

import { CueFile } from '@synesthesia-project/core/file/index';

const CUE_FILES_PATH = 'cue_files';

const filePath = (dataDir: string, id: string) => path.join(dataDir, CUE_FILES_PATH, id, 'current.scue');

/**
 * Class to manage storing CueFiles to persistent storage
 */
export class Storage {

  private readonly dataDir: string;

  public constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  public async getFile(trackId: string): Promise<CueFile> {
    const file = await fs.readFile(filePath(this.dataDir, trackId))
      .catch((err: Error) => {
        if (err.message.startsWith('ENOENT'))
          throw new Error('file not found');
        throw err;
      });
    return JSON.parse(file.toString());
  }

  public async saveFile(trackId: string, file: CueFile): Promise<void> {
    const pathname = filePath(this.dataDir, trackId);
    await fs.mkdir(path.dirname(pathname), {recursive: true});
    return fs.writeFile(pathname, JSON.stringify(file));
  }

  /**
   * Get a list of all revisions that have been stored for a particular song id
   */
  public async getRevisions(_trackId: string): Promise<string[]> {
    throw new Error('not implemented');
  }

  /**
   * Get a specific revision of a track.
   */
  public async getRevision(_trackId: string, _revisionName: string): Promise<CueFile> {
    throw new Error('not implemented');
  }

}
