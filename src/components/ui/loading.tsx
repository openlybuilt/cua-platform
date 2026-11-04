export function Loading({ label = "Loading" }: { label?: string }) {
  return <span className="loading" role="status"><span className="loading-spinner" aria-hidden="true" />{label}</span>;
}
