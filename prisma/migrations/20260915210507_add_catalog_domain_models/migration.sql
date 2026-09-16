-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('stone', 'metal', 'glass', 'wood', 'fabric', 'leather', 'marble', 'stone-composite');

-- CreateTable
CREATE TABLE "product_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "i18nKey" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "image" TEXT NOT NULL,
    "website" TEXT,
    "bio" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "images" TEXT[],
    "hoverImage" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "existsInStore" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "heroImage" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "moreInfo" JSONB,
    "downloads" JSONB NOT NULL,
    "related" JSONB NOT NULL,
    "categoryId" TEXT NOT NULL,
    "designerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "year" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "image" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flagship" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "city" JSONB NOT NULL,
    "image" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flagship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "i18nKey" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "location" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "paragraph" JSONB NOT NULL,
    "moreDescription" JSONB NOT NULL,
    "credits" JSONB NOT NULL,
    "portfolioImages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_product" (
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_product_pkey" PRIMARY KEY ("projectId","productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_category_slug_key" ON "product_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "designer_slug_key" ON "designer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "product_designerId_idx" ON "product"("designerId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_slug_key" ON "collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "material_slug_key" ON "material"("slug");

-- CreateIndex
CREATE INDEX "material_category_idx" ON "material"("category");

-- CreateIndex
CREATE UNIQUE INDEX "flagship_slug_key" ON "flagship"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_slug_key" ON "project"("slug");

-- CreateIndex
CREATE INDEX "project_product_productId_idx" ON "project_product"("productId");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "designer"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_product" ADD CONSTRAINT "project_product_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_product" ADD CONSTRAINT "project_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
