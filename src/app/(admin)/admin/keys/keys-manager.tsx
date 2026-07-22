"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import {
  clearPlatformApiKey,
  revealPlatformApiKey,
  savePlatformApiKey,
} from "@/app/actions/platform-keys";
import type { PlatformApiKeyName } from "@/lib/platform-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type KeyRow = {
  keyName: PlatformApiKeyName;
  label: string;
  description: string;
  configured: boolean;
  lastFour: string | null;
  updatedAt: string | null;
};

export function KeysManager({ keys }: { keys: KeyRow[] }) {
  return (
    <div className="grid gap-4">
      {keys.map((key) => (
        <KeyCard key={key.keyName} row={key} />
      ))}
    </div>
  );
}

function KeyCard({ row }: { row: KeyRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showRevealForm, setShowRevealForm] = useState(false);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("keyName", row.keyName);
    fd.set("value", newValue);
    run(async () => {
      await savePlatformApiKey(fd);
      setNewValue("");
      setRevealed(null);
      setShowRevealForm(false);
    });
  }

  function onReveal(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const { value } = await revealPlatformApiKey(row.keyName, password);
      setRevealed(value);
      setPassword("");
      setShowRevealForm(false);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-accent" strokeWidth={1.75} />
            {row.label}
          </CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">{row.description}</p>
        </div>
        {row.configured ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Configured · ···{row.lastFour}</Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200">Not set</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-xl border border-status-risk/30 bg-status-risk/10 px-3 py-2 text-sm text-status-risk">
            {error}
          </p>
        )}

        {revealed && (
          <div className="space-y-2 rounded-2xl border border-border bg-surface-alt p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Full key</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(null)}
              >
                <EyeOff className="size-3.5" />
                Hide
              </Button>
            </div>
            <code className="block break-all rounded-xl bg-surface px-3 py-2 text-xs sm:text-sm">
              {revealed}
            </code>
          </div>
        )}

        {row.configured && !revealed && (
          <div className="space-y-3">
            {!showRevealForm ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setShowRevealForm(true);
                  setError(null);
                }}
              >
                <Eye className="size-3.5" />
                View key
              </Button>
            ) : (
              <form onSubmit={onReveal} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`pw-${row.keyName}`}>Confirm your password</Label>
                  <Input
                    id={`pw-${row.keyName}`}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Account password"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={pending || !password}>
                    Reveal
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setShowRevealForm(false);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor={`val-${row.keyName}`}>
              {row.configured ? "Replace key" : "Paste API key"}
            </Label>
            <Input
              id={`val-${row.keyName}`}
              type="password"
              autoComplete="off"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="AIza…"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending || !newValue.trim()}>
              Save
            </Button>
            {row.configured && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await clearPlatformApiKey(row.keyName);
                    setRevealed(null);
                    setShowRevealForm(false);
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
          {row.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(row.updatedAt).toLocaleString()}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
