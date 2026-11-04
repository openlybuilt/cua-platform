import { WorkflowWorkspace } from "@/components/workflows/workflow-workspace";
import { ServiceGate } from "@/components/service/service-gate";

export const dynamic = "force-dynamic";
export default function Home() {
  return <ServiceGate><WorkflowWorkspace /></ServiceGate>;
}
