/**
 * Order reads — Prisma-backed for the admin dashboard.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { cache } from "react";
import { asLocalized } from "../casting";

const orderInclude = {
  user: true,
  items: {
    include: { product: { select: { name: true, slug: true } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export type OrderAdminRow = {
  id: string;
  slug: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  createdAt: string;
  itemCount: number;
};

export type OrderAdminDetail = {
  id: string;
  slug: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  zarinpalAuthority: string | null;
  zarinpalRefId: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    productId: string | null;
    productName: Localized | null;
    productSlug: string | null;
    quantity: number;
    unitPriceAtPurchase: number;
    name: Localized;
    image: string;
  }[];
};

export const getOrderAdminRows = cache(
  async (): Promise<OrderAdminRow[]> => {
    const rows = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.id,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      totalAmount: row.totalAmount.toNumber(),
      currency: row.currency,
      status: row.status,
      fulfillmentStatus: row.fulfillmentStatus,
      createdAt: row.createdAt.toISOString(),
      itemCount: row.items.length,
    }));
  },
);

export const getOrderAdminDetail = cache(
  async (id: string): Promise<OrderAdminDetail | null> => {
    const row = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!row) return null;

    return {
      id: row.id,
      slug: row.id,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      totalAmount: row.totalAmount.toNumber(),
      currency: row.currency,
      status: row.status,
      fulfillmentStatus: row.fulfillmentStatus,
      recipientName: row.recipientName,
      phone: row.phone,
      addressLine: row.addressLine,
      city: row.city,
      postalCode: row.postalCode,
      zarinpalAuthority: row.zarinpalAuthority,
      zarinpalRefId: row.zarinpalRefId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product ? asLocalized(item.product.name) : null,
        productSlug: item.product?.slug ?? null,
        quantity: item.quantity,
        unitPriceAtPurchase: item.unitPriceAtPurchase.toNumber(),
        name: asLocalized(item.name),
        image: item.image,
      })),
    };
  },
);
