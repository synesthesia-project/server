import {isEqual} from 'lodash';
import {createHash} from 'crypto';

import { File } from '@synesthesia-project/core/protocols/control/messages';

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

    const data = meta;
    return createHash('sha1').update(JSON.stringify(data), 'utf8').digest('hex');
  }

}
