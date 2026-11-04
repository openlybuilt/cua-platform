"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useServiceAvailable } from "@/components/service/service-gate";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { signOut } = useClerk();
  const available = useServiceAvailable();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { if (!available) setOpen(false); }, [available]);
  async function confirmSignOut() {
    setBusy(true);
    setError(false);
    try { await signOut({ redirectUrl: "/sign-in" }); }
    catch { setError(true); setBusy(false); }
  }
  if (!available) return null;
  return <>
    <Button variant="quiet" className="workspace-signout" aria-label="Sign out" onClick={() => { setError(false); setOpen(true); }}><LogOut size={17} aria-hidden="true" />{!compact && <span>Sign out</span>}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }} title="Sign out?" compact>
      {error && <p className="account-error" role="alert">Could not sign out. Please try again.</p>}
      <div className="account-actions"><Button variant="quiet" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={() => void confirmSignOut()}>Sign out</Button></div>
    </Dialog>
  </>;
}
