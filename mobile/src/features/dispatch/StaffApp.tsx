import { useState } from "react";

import { TabShell, type TabDef } from "@/components/TabShell";
import { BookingDetailScreen } from "@/features/dispatch/BookingDetailScreen";
import { CompletionScreen } from "@/features/dispatch/CompletionScreen";
import { DispatchScreen } from "@/features/dispatch/DispatchScreen";
import { StaffProfileScreen } from "@/features/dispatch/StaffProfileScreen";

const TABS: TabDef[] = [
  { key: "dispatch", label: "派工", icon: "▤" },
  { key: "me", label: "個人", icon: "◔" },
];

type Stack = { screen: "detail" | "completion"; bookingId: number } | null;

export function StaffApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState("dispatch");
  const [stack, setStack] = useState<Stack>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (stack?.screen === "detail") {
    return (
      <BookingDetailScreen
        bookingId={stack.bookingId}
        date={today}
        onBack={() => setStack(null)}
        onComplete={() => setStack({ screen: "completion", bookingId: stack.bookingId })}
      />
    );
  }
  if (stack?.screen === "completion") {
    return (
      <CompletionScreen
        bookingId={stack.bookingId}
        onBack={() => setStack({ screen: "detail", bookingId: stack.bookingId })}
        onDone={() => setStack(null)}
      />
    );
  }

  return (
    <TabShell title="寶傑業務" tabs={TABS} active={tab} onChange={setTab}>
      {tab === "dispatch" && (
        <DispatchScreen onOpen={(id) => setStack({ screen: "detail", bookingId: id })} />
      )}
      {tab === "me" && <StaffProfileScreen onLogout={onLogout} />}
    </TabShell>
  );
}
