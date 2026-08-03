/**
 * Repositories — barrel export.
 *
 * Sprint 16 ships the interfaces only. Sprint 17 adds Prisma-backed
 * implementations and wires them here. Services import from this barrel
 * and depend on the interface types — never on Prisma directly.
 */

export type { AlbumRepository, AlbumDraftInput } from './album-repository'
export type { MediaRepository } from './media-repository'
export type { UserRepository } from './user-repository'
export type { UploadRepository } from './upload-repository'