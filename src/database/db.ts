/**
 * Tooling entry for `import './db'`. Metro resolves platform builds to:
 * - `db.web.ts` on web (no expo-sqlite)
 * - `db.native.ts` on iOS/Android
 * This re-export keeps TypeScript and editors working when they resolve `db.ts` first.
 */
export { getDB, initDatabase, dbService } from './db.native';
