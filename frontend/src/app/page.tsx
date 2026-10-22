import { Wallet } from "lucide-react";
import { HealthStatus } from "@/components/health-status";
import { Ledger } from "@/components/records/ledger";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Wallet aria-hidden className="size-5" />
        money-keeper
      </h1>
      <Ledger />
      <footer className="mt-auto text-xs text-muted-foreground">
        <HealthStatus />
      </footer>
    </main>
  );
}
