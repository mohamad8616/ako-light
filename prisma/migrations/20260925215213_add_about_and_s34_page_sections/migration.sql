-- CreateTable
CREATE TABLE "about_page_section" (
    "id" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_page_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "s34_page_section" (
    "id" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "s34_page_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "about_page_section_sectionKey_key" ON "about_page_section"("sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "s34_page_section_sectionKey_key" ON "s34_page_section"("sectionKey");
