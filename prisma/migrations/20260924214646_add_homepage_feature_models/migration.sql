-- CreateEnum
CREATE TYPE "FeatureMode" AS ENUM ('reference', 'override');

-- CreateTable
CREATE TABLE "flagship_one_feature" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "FeatureMode" NOT NULL DEFAULT 'reference',
    "flagshipId" TEXT NOT NULL,
    "kicker" JSONB,
    "title" JSONB,
    "paragraphs" JSONB,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flagship_one_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_banner_feature" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "FeatureMode" NOT NULL DEFAULT 'reference',
    "projectId" TEXT NOT NULL,
    "kicker" JSONB,
    "title" JSONB,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_banner_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_dark_background_feature" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "FeatureMode" NOT NULL DEFAULT 'reference',
    "projectId" TEXT NOT NULL,
    "title" JSONB,
    "paragraphs" JSONB,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_dark_background_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_collection_feature" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "text" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_collection_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_feature" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "catalogueItemId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogue_feature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flagship_one_feature_flagshipId_idx" ON "flagship_one_feature"("flagshipId");

-- CreateIndex
CREATE INDEX "project_banner_feature_projectId_idx" ON "project_banner_feature"("projectId");

-- CreateIndex
CREATE INDEX "project_dark_background_feature_projectId_idx" ON "project_dark_background_feature"("projectId");

-- CreateIndex
CREATE INDEX "catalogue_feature_catalogueItemId_idx" ON "catalogue_feature"("catalogueItemId");

-- AddForeignKey
ALTER TABLE "flagship_one_feature" ADD CONSTRAINT "flagship_one_feature_flagshipId_fkey" FOREIGN KEY ("flagshipId") REFERENCES "flagship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_banner_feature" ADD CONSTRAINT "project_banner_feature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dark_background_feature" ADD CONSTRAINT "project_dark_background_feature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_feature" ADD CONSTRAINT "catalogue_feature_catalogueItemId_fkey" FOREIGN KEY ("catalogueItemId") REFERENCES "catalogue_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
