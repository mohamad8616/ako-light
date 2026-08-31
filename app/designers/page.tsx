import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";

export default function DesignersPage() {
  return (
    <main className=" bg-background">
      <DesignersHeader />
      <DesignersList />
    </main>
  );
}
