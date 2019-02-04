import { expect } from 'chai';
import { CueFile } from '@synesthesia-project/core/file/index';

import { Storage } from '../../main/storage/storage';

/**
 * Return a new promise that fails if the given promise does not fail in the correct manner
 * @param promise the promise that should fail
 * @param errorMsg the error message that should be given in the rejection
 */
function promiseError(promise: Promise<{}>, errorMsg: string): Promise<void> {
  return promise
        .then(() => { throw new Error('Not supposed to succeed'); })
        .catch((err: Error) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal(errorMsg);
        });
}

describe('Storage', () => {

  describe('getFile()', () => {

    it('Non-Existant', async () => {
      const s = new Storage();

      await promiseError(s.getFile('non-existent-id'), 'file not found');
    });

    it('Set And Get', async () => {
      const id = '3fjc94jst';
      const s = new Storage();
      const f: CueFile = {
        lengthMillis: 12345,
        layers: []
      };

      // Check file does not yet exist
      await promiseError(s.getFile(id), 'file not found');
      // Save the file
      await s.saveFile(id, f);
      // Check invalid ID does not return file
      await promiseError(s.getFile('non-existent-id'), 'file not found');
      // Check file is correctly returned
      expect(await s.getFile(id)).to.deep.equal(f);
    });

  });
});
