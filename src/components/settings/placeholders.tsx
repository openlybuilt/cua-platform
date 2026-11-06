"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { request } from "@/lib/workflows/contracts";
type Placeholder = { name: string; secret: boolean; value?: string };
export function Placeholders() {
  const [items, setItems] = useState<Placeholder[]>();
  const [editing, setEditing] = useState<Placeholder>();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string>();
  const refresh = useCallback(async () => { try { setItems(await request<Placeholder[]>("placeholders")); } catch { setError("Could not load saved values."); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  function edit(item?: Placeholder) { setEditing(item); setName(item?.name ?? ""); setValue(item?.secret ? "" : item?.value ?? ""); setSecret(item?.secret ?? true); setError(""); setOpen(true); }
  async function save(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await request("placeholders", { body: { name: name.trim(), value, secret, createOnly: !editing } }); setOpen(false); setValue(""); await refresh(); } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not save value."); } finally { setBusy(false); } }
  async function remove(name: string) { setBusy(true); setError(""); try { const response = await fetch(`/api/placeholders/${encodeURIComponent(name)}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setDeleting(undefined); await refresh(); } catch { setError("Could not delete value."); } finally { setBusy(false); } }
  return <section className="settings-values"><div className="settings-values-heading"><h2>Placeholders</h2><Button onClick={() => edit()}>Add placeholder</Button></div><p>Save values to use across workflows. Secret values are hidden after saving.</p>{error && !open && <p role="alert">{error}</p>}{!items ? <p>Loading placeholders…</p> : !items.length ? <p>No placeholders saved yet.</p> : items.map((item) => <div className="settings-value" key={item.name}><div><strong>{item.name}</strong><p>{item.secret ? "Secret" : "Text"}</p></div><div><Button variant="quiet" onClick={() => edit(item)}>Edit</Button>{deleting === item.name ? <><Button disabled={busy} onClick={() => void remove(item.name)}>Confirm delete</Button><Button variant="quiet" onClick={() => setDeleting(undefined)}>Cancel</Button></> : <Button variant="quiet" disabled={busy} onClick={() => setDeleting(item.name)}>Delete</Button>}</div></div>)}<Dialog open={open} onOpenChange={(next) => { if (!busy && !next) { setOpen(false); setValue(""); } }} title={editing ? "Edit placeholder" : "Add placeholder"} description="Save a value for use across workflows."><form className="workflow-fields" onSubmit={(event) => void save(event)}><label>Name<input value={name} disabled={!!editing} required pattern="[A-Za-z][A-Za-z0-9_]{0,49}" autoComplete="off" onChange={(event) => setName(event.target.value)} /></label><label>Value<input type={secret ? "password" : "text"} value={value} required autoComplete="off" onChange={(event) => setValue(event.target.value)} /></label><label className="run-secret"><input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} /> Treat this value as a secret</label><p>Secrets may appear on the website, live VM, screenshots, recordings, or in AI requests.</p>{error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy || !value}>Save</Button></form></Dialog></section>;
}
