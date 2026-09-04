import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";

export const metadata = {
  title: "Fabrics — Materials | Henge",
  description:
    "Explore Henge's fabric library, hand-selected for our upholstered collections.",
};

export default function MaterialPage({
  params,
}: {
  params: { material: string };
}) {
  return <MaterialCategoryView slug={params.material} />;
}
