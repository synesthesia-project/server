import { CueFile } from '@synesthesia-project/core/file/index';

/**
 * This class will evenually store its files, but for now we'll just keep them in memory
 */
export class Storage {

  private readonly files = new Map<string, CueFile>();

  public async getFile(id: string): Promise<CueFile> {
    const f = this.files.get(id);
    if (f) return f;
    throw new Error('file not found');
  }

  public async saveFile(id: string, file: CueFile): Promise<void> {
    this.files.set(id, file);
  }

}
