import {
  Shield,
  ShieldAlert,
  Users,
  Lock,
  Activity,
  Wrench,
} from "lucide-react"
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
import { UsersTab } from "./tabs/UsersTab"
import { PermissionTable } from "@/components/domain/users/PermissionTable"
import { AuditLog } from "@/components/domain/users/AuditLog"

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
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users
            className="h-[18px] w-[18px] flex-shrink-0"
            style={{ color: "#a5b4fc" }}
          />
          <div>
            <h1
              className="font-bold leading-tight"
              style={{ fontSize: 22, letterSpacing: "-.3px", color: "var(--text-primary)" }}
            >
              Gestione Utenti
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Accesso riservato · Admin e Direzione
            </p>
          </div>
        </div>
      </div>

      {/* ── Main tabs: Utenti | Permessi | Log ─────────────────────────── */}
      <Tabs defaultValue="users" className="space-y-0">
        <TabsList
          className="h-auto p-0 gap-[2px] w-full justify-start bg-transparent rounded-none"
          style={{
            borderBottom: "1px solid var(--border)",
            paddingBottom: 0,
            marginBottom: 0,
          }}
        >
          <TabsTrigger
            value="users"
            className="flex items-center gap-[7px] px-[14px] py-[7px] rounded-[6px] text-[12px] font-semibold border border-transparent data-[state=active]:border-[rgba(99,102,241,.2)] data-[state=active]:bg-[rgba(99,102,241,.08)] data-[state=active]:text-[#a5b4fc] text-[var(--text-muted)] bg-transparent shadow-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <Users className="h-[13px] w-[13px]" />
            Utenti
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="flex items-center gap-[7px] px-[14px] py-[7px] rounded-[6px] text-[12px] font-semibold border border-transparent data-[state=active]:border-[rgba(99,102,241,.2)] data-[state=active]:bg-[rgba(99,102,241,.08)] data-[state=active]:text-[#a5b4fc] text-[var(--text-muted)] bg-transparent shadow-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <Lock className="h-[13px] w-[13px]" />
            Permessi per ruolo
          </TabsTrigger>
          <TabsTrigger
            value="audit-log"
            className="flex items-center gap-[7px] px-[14px] py-[7px] rounded-[6px] text-[12px] font-semibold border border-transparent data-[state=active]:border-[rgba(99,102,241,.2)] data-[state=active]:bg-[rgba(99,102,241,.08)] data-[state=active]:text-[#a5b4fc] text-[var(--text-muted)] bg-transparent shadow-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <Activity className="h-[13px] w-[13px]" />
            Log accessi
          </TabsTrigger>

          {/* Separator */}
          <div
            className="flex-shrink-0 self-center mx-2"
            style={{ width: 1, height: 22, background: "var(--border)" }}
          />

          {/* System configuration tabs (secondary, smaller) */}
          <TabsTrigger
            value="templates"
            className="flex items-center gap-[7px] px-[12px] py-[7px] rounded-[6px] text-[11px] font-semibold border border-transparent data-[state=active]:border-[rgba(99,102,241,.2)] data-[state=active]:bg-[rgba(99,102,241,.08)] data-[state=active]:text-[#a5b4fc] text-[var(--text-muted)] bg-transparent shadow-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <Wrench className="h-[12px] w-[12px]" />
            Configurazione
          </TabsTrigger>
          <TabsTrigger
            value="permissions-matrix"
            className="flex items-center gap-[7px] px-[12px] py-[7px] rounded-[6px] text-[11px] font-semibold border border-transparent data-[state=active]:border-[rgba(99,102,241,.2)] data-[state=active]:bg-[rgba(99,102,241,.08)] data-[state=active]:text-[#a5b4fc] text-[var(--text-muted)] bg-transparent shadow-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
          >
            <Shield className="h-[12px] w-[12px]" />
            Permessi avanzati
          </TabsTrigger>
        </TabsList>

        {/* ── Tab content ─── */}
        <TabsContent value="users" className="mt-0 pt-5">
          <UsersTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-0 pt-5">
          <PermissionTable />
        </TabsContent>

        <TabsContent value="audit-log" className="mt-0 pt-5">
          <AuditLog />
        </TabsContent>

        {/* System config sub-tabs */}
        <TabsContent value="templates" className="mt-0 pt-5">
          <div className="space-y-4">
            <Tabs defaultValue="templates-sub" className="space-y-4">
              <TabsList>
                <TabsTrigger value="templates-sub">Template</TabsTrigger>
                <TabsTrigger value="custom-fields">Campi Custom</TabsTrigger>
                <TabsTrigger value="workflows">Workflow</TabsTrigger>
                <TabsTrigger value="automations">Automazioni</TabsTrigger>
                <TabsTrigger value="import-export">Import/Export</TabsTrigger>
              </TabsList>
              <TabsContent value="templates-sub"><TemplatesTab /></TabsContent>
              <TabsContent value="custom-fields"><CustomFieldsTab /></TabsContent>
              <TabsContent value="workflows"><WorkflowsTab /></TabsContent>
              <TabsContent value="automations"><AutomationsTab /></TabsContent>
              <TabsContent value="import-export"><ImportExportTab /></TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="permissions-matrix" className="mt-0 pt-5">
          <div className="space-y-4">
            <Tabs defaultValue="permissions-adv" className="space-y-4">
              <TabsList>
                <TabsTrigger value="permissions-adv">Permessi ruoli</TabsTrigger>
                <TabsTrigger value="audit-adv">Audit log</TabsTrigger>
              </TabsList>
              <TabsContent value="permissions-adv"><PermissionsTab /></TabsContent>
              <TabsContent value="audit-adv"><AuditTab /></TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminConfigPage
