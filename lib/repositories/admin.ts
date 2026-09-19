import { prisma } from "@/lib/db/prisma";
import { cache } from "react";

export const getProductCount = cache(async () => prisma.product.count());
export const getDesignerCount = cache(async () => prisma.designer.count());
export const getCollectionCount = cache(async () => prisma.collection.count());
export const getMaterialCount = cache(async () => prisma.material.count());
export const getFlagshipCount = cache(async () => prisma.flagship.count());
export const getProjectCount = cache(async () => prisma.project.count());
