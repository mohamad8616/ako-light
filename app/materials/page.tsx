"use client";

import MaterialsHeader from "@/components/materials/MaterialsHeader";
import MaterialsList from "@/components/materials/MaterialsList";

export default function MaterialsPage() {

  return (
      <main className="w-full bg-background">
        <MaterialsHeader />
        <MaterialsList />
      </main>
  );
}