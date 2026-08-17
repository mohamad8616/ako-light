import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";

export default function DesignersPage() {
  return (
    <main className="w-full bg-background">
      <DesignersHeader />
      <DesignersList />
    </main>
  );
}
