import FlagshipHeader from "@/components/flagship/FlagshipHeader";
import FlagshipList from "@/components/flagship/FlagshipList";


export default function Page() {
  return (
    <main className="w-full bg-background">
      <FlagshipHeader />
      <FlagshipList />
    </main>
  );
}
