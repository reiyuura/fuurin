/**
 * Vitest setup file — pins every spec process to fuurin_test before
 * any app code (and thus any getPrisma()) is evaluated.
 */

import { pinTestDatabaseEnv } from './helpers/setup-db'

pinTestDatabaseEnv()
