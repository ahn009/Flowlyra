import { PageHeader } from "../components/AgentLayout";
import { Card, EmptyPanel, PageShell } from "../components/ui";
import { Users } from "lucide-react";

export function ContactsPage(): JSX.Element {
  return (
    <PageShell>
      <PageHeader title="Contacts" />
      <div className="p-4 sm:p-6">
        <Card>
          <EmptyPanel
            icon={<Users size={22} />}
            title="Contact workspace"
            description="Contact list, profiles, consent status, and GDPR deletion controls will live here."
          />
        </Card>
      </div>
    </PageShell>
  );
}
