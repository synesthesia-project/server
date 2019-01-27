import { expect } from 'chai';

import {MetaIDs} from '../../main/state/meta-ids';

describe('MetaIDs', function() {
  const m = new MetaIDs();

  describe('getId()', function() {

    it('basic title/author meta', function() {
      expect(m.getId({
        type: 'meta',
        title: 'some song',
        artist: 'some artist',
        lengthMillis: 1234
      })).to.equal('3ad75d2398587024a3b82216a1244e4f6bdecc5e');
    });

    it('basic title/author meta (reordered)', function() {
      expect(m.getId({
        artist: 'some artist',
        lengthMillis: 1234,
        type: 'meta',
        title: 'some song',
      })).to.equal('3ad75d2398587024a3b82216a1244e4f6bdecc5e');
    });

    it('basic title/author meta (extra data)', function() {
      expect(m.getId({
        artist: 'some artist',
        lengthMillis: 1234,
        type: 'meta',
        title: 'some song',
        foo: 'bar'
      } as any)).to.equal('3ad75d2398587024a3b82216a1244e4f6bdecc5e');
    });

  });
});
