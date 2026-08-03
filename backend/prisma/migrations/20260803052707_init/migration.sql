-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "AlbumVisibility" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('spring', 'summer', 'autumn', 'winter');

-- CreateEnum
CREATE TYPE "AlbumCategory" AS ENUM ('school', 'festival', 'study', 'travel', 'graduation');

-- CreateEnum
CREATE TYPE "MediaOrientation" AS ENUM ('landscape', 'portrait');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('queued', 'uploading', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "avatar" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "period" JSONB NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "cover" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "category" "AlbumCategory" NOT NULL,
    "visibility" "AlbumVisibility" NOT NULL DEFAULT 'published',
    "ownerId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Album_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "albumSlug" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "src" TEXT NOT NULL,
    "caption" JSONB NOT NULL,
    "ago" JSONB NOT NULL,
    "tags" TEXT[],
    "likes" INTEGER NOT NULL DEFAULT 0,
    "orientation" "MediaOrientation" NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumDraft" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "visibility" "AlbumVisibility" NOT NULL DEFAULT 'draft',
    "coverMediaId" TEXT,
    "photoIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "albumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AlbumDraft_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "nameJa" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "role" JSONB NOT NULL,
    "avatar" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEntry" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "albumId" TEXT,
    "categoryTag" TEXT,
    "photo" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadRecord" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "UploadRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Album_ownerId_idx" ON "Album"("ownerId");

-- CreateIndex
CREATE INDEX "Album_date_idx" ON "Album"("date");

-- CreateIndex
CREATE INDEX "Album_visibility_idx" ON "Album"("visibility");

-- CreateIndex
CREATE INDEX "Album_category_idx" ON "Album"("category");

-- CreateIndex
CREATE INDEX "Photo_albumSlug_idx_idx" ON "Photo"("albumSlug", "idx");

-- CreateIndex
CREATE INDEX "Photo_date_idx" ON "Photo"("date");

-- CreateIndex
CREATE INDEX "Photo_albumSlug_date_idx" ON "Photo"("albumSlug", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_albumSlug_idx_key" ON "Photo"("albumSlug", "idx");

-- CreateIndex
CREATE INDEX "AlbumDraft_updatedAt_idx" ON "AlbumDraft"("updatedAt");

-- CreateIndex
CREATE INDEX "AlbumDraft_albumId_idx" ON "AlbumDraft"("albumId");

-- CreateIndex
CREATE INDEX "Member_nameJa_idx" ON "Member"("nameJa");

-- CreateIndex
CREATE INDEX "TimelineEntry_date_idx" ON "TimelineEntry"("date");

-- CreateIndex
CREATE INDEX "TimelineEntry_albumId_idx" ON "TimelineEntry"("albumId");

-- CreateIndex
CREATE INDEX "UploadRecord_createdAt_idx" ON "UploadRecord"("createdAt");

-- CreateIndex
CREATE INDEX "UploadRecord_status_idx" ON "UploadRecord"("status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumSlug_fkey" FOREIGN KEY ("albumSlug") REFERENCES "Album"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumDraft" ADD CONSTRAINT "AlbumDraft_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEntry" ADD CONSTRAINT "TimelineEntry_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
