/**
 * Migration registry
 * Add new migrations here in order
 */

import type { Migration } from '../utils/migrations'
import migration001 from './001-add-schema-version'
import migration002 from './002-add-password-changed-at'
import migration003 from './003-add-indexes'
import migration004 from './004-add-audit-logs'

const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
]

export default migrations







