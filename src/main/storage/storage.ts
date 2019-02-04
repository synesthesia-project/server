import { promises as fs} from 'fs';
import * as path from 'path';

import { CueFile } from '@synesthesia-project/core/file/index';

const CUE_FILES_PATH = 'cue_files';

const filePath = (dataDir: string, id: string) => path.join(dataDir, CUE_FILES_PATH, id, 'current.scue');

/**
 * This class will evenually store its files, but for now we'll just keep them in memory
 */
export class Storage {

  private readonly dataDir: string;

  public constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  public async getFile(id: string): Promise<CueFile> {
    const file = await fs.readFile(filePath(this.dataDir, id))
      .catch((err: Error) => {
        if (err.message.startsWith('ENOENT'))
          throw new Error('file not found');
        throw err;
      });
    return JSON.parse(file.toString());
  }

  public async saveFile(id: string, file: CueFile): Promise<void> {
    const pathname = filePath(this.dataDir, id);
    await fs.mkdir(path.dirname(pathname), {recursive: true});
    return fs.writeFile(pathname, JSON.stringify(file));
  }

}
