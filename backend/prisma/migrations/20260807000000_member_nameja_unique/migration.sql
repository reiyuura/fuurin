-- Member.nameJa: enforce uniqueness at the database level.
-- The application layer already rejects duplicate member names, but the
-- check ran outside the transaction (TOCTOU) — concurrent creates could
-- produce duplicates. This constraint is the real guard.
--
-- NOTE: a unique constraint creates its own index, so the previous
-- @@index([nameJa]) is dropped here to avoid a redundant index.
DROP INDEX IF EXISTS "Member_nameJa_idx";
ALTER TABLE "Member" ADD CONSTRAINT "Member_nameJa_key" UNIQUE ("nameJa");
