import { Settings, Shield, ShieldAlert } from "lucide-react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/common/EmptyState"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { TemplatesTab } from "./tabs/TemplatesTab"
import { CustomFieldsTab } from "./tabs/CustomFieldsTab"
import { WorkflowsTab } from "./tabs/WorkflowsTab"
import { AutomationsTab } from "./tabs/AutomationsTab"
import { ImportExportTab } from "./tabs/ImportExportTab"
import { AuditTab } from "./tabs/AuditTab"
import { PermissionsTab } from "./tabs/PermissionsTab"

function AdminConfigPage() {
  useSetPageContext({ domain: 'admin' })
  const { isPrivileged } = usePrivilegedRole()

  if (!isPrivileged) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Accesso non autorizzato"
        description="Non hai i permessi per accedere a questa pagina."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurazione</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci template, campi personalizzati, workflow e automazioni
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Template</TabsTrigger>
          <TabsTrigger value="custom-fields">Campi Custom</TabsTrigger>
          <TabsTrigger value="workflows">Workflow</TabsTrigger>
          <TabsTrigger value="automations">Automazioni</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Permessi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="custom-fields"><CustomFieldsTab /></TabsContent>
        <TabsContent value="workflows"><WorkflowsTab /></TabsContent>
        <TabsContent value="automations"><AutomationsTab /></TabsContent>
        <TabsContent value="import-export"><ImportExportTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminConfigPage
