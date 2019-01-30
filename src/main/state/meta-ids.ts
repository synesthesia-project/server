import {isEqual} from 'lodash';
import {createHash} from 'crypto';

import { File } from '@synesthesia-project/core/protocols/control/messages';

export declare type FileByPath = {
  type: 'path';
  path: string;
};
export declare type FileByMeta = {
  type: 'meta';
  title: string;
  artist?: string;
  album?: string;
  lengthMillis: number;
};
export declare type File = FileByPath | FileByMeta;

/**
 * This class assigns unique (predictable) IDs based on song metadata
 */
export class MetaIDs {

  private readonly mappings: { meta: File; id: string; }[] = [];

  public getId(meta: File) {
    for (const mapping of this.mappings) {
      if (isEqual(mapping.meta, meta))
        return mapping.id;
    }

    const data = meta.type === 'path' ? null : {
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      lengthMillis: meta.lengthMillis
    };

    if (!data) {
      throw new Error('TODO');
    }
    return createHash('sha1').update(JSON.stringify(data), 'utf8').digest('hex');
  }

}
