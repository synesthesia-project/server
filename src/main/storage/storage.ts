import { CueFile } from '@synesthesia-project/core/file/index';

/**
 * This class will evenually store its files, but for now we'll just keep them in memory
 */
export class Storage {

  public async getFile(_id: string): Promise<CueFile> {
    throw new Error('not implemented');
  }

  public async saveFile(_id: string, _file: CueFile): Promise<void> {
    throw new Error('not implemented');
  }

}
