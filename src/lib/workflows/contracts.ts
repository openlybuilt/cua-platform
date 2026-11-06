export type Step =
  | { type: "navigate"; url: string }
  | { type: "ai"; instruction: string }
  | { type: "type"; text: string; target?: string; region?: string }
  | { type: "wait"; seconds: number }
  | { type: "scroll"; direction: "up" | "down" | "left" | "right"; pixels: number }
  | { type: "scroll"; direction: "up" | "down"; wheelTicks: number }
  | { type: "press_keys"; keys: string[] }
  | { type: "click"; target: string }
  | { type: "click"; x: number; y: number };
export type Definition = { name: string; description: string; executionTarget?: "browser" | "windows"; provider?: string; inputs: string[]; steps: Step[] };
export type Workflow = { id: string; version: number; definition: Definition; createdAt: string };
export type Run = { id: string; status: string; example?: boolean; exampleWorkflow?: Workflow; workflowId?: string; workflowName?: string; workflowVersion?: number; createdAt?: string; result?: unknown; liveViewUrl?: string; recordingStatus?: "pending" | "saved" | "failed" | "unavailable" | "deleted"; steps?: { status: string; message?: string }[] };
export class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export async function request<T>(path: string, options?: { body?: unknown; version?: number }): Promise<T> {
  try {
    const response = await fetch(`/api/${path}`, {
      method: options?.body === undefined ? "GET" : "POST",
      headers: options?.body === undefined ? undefined : { "content-type": "application/json", ...(options.version === undefined ? {} : { "if-match": String(options.version) }) },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body), cache: "no-store",
    });
    if (response.status >= 500) window.dispatchEvent(new Event("openly:service-unavailable"));
    const data: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw new RequestError(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Something went wrong.", response.status);
    return data as T;
  } catch (error) {
    if (!(error instanceof RequestError)) window.dispatchEvent(new Event("openly:service-unavailable"));
    throw error;
  }
}
