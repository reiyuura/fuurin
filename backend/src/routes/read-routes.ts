/**
 * Read routes — mounts all Sprint 18 READ endpoints under the API
 * base path. Registration order matters: static segments (`summaries`,
 * `timeline`) are registered BEFORE the `:slug` param route.
 *
 * Fastify matches in registration order for same-depth routes, so
 * `/albums/summaries` and `/albums/timeline` must precede
 * `/albums/:slug`.
 */

import type { FastifyInstance } from 'fastify'
import type { Services } from '../services'
import { createAlbumController } from '../controllers/album-controller'
import { createMediaController } from '../controllers/media-controller'
import { createMemberController } from '../controllers/member-controller'
import { createSearchController } from '../controllers/search-controller'

export async function registerReadRoutes(app: FastifyInstance, services: Services): Promise<void> {
  const albums = createAlbumController(services.albums)
  const media = createMediaController(services.media)
  const members = createMemberController(services.members)
  const search = createSearchController(services.search)

  /* ── Albums ──────────────────────────────────────────────── */
  app.get('/albums/summaries', albums.summaries)
  app.get('/albums/timeline', albums.timeline)
  app.get('/albums', albums.list)
  app.get('/albums/:slug/photos/:idx', albums.photo)
  app.get('/albums/:slug/photos', albums.photos)
  app.get('/albums/:slug', albums.get)

  /* ── Media ───────────────────────────────────────────────── */
  app.get('/media/:id', media.get)
  app.get('/media', media.list)

  /* ── Members ─────────────────────────────────────────────── */
  app.get('/members', members.list)

  /* ── Search ──────────────────────────────────────────────── */
  app.get('/search/albums', search.albums)
  app.get('/search/photos', search.photos)
  app.get('/search/members', search.members)
}