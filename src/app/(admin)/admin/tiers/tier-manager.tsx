"use client";

import { useState, useTransition } from "react";
import {
  createPricingTier,
  updatePricingTier,
  setTierActive,
  setDefaultTier,
  deletePricingTier,
} from "@/app/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export interface TierRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  propertyLimit: number | null;
  pricePerPropertyCents: number;
  active: boolean;
  isDefault: boolean;
  displayOrder: number;
  subscriberCount: number;
}

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

export function TierManager({ tiers }: { tiers: TierRow[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<TierRow | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function submitForm(formData: FormData) {
    const wasEditing = editing;
    run(async () => {
      if (wasEditing) {
        await updatePricingTier(wasEditing.id, formData);
        setEditing(null);
      } else {
        await createPricingTier(formData);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="animate-page-in overflow-hidden">
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Property limit</TableHead>
                <TableHead className="text-right">Price / property / mo</TableHead>
                <TableHead className="text-right">Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={t.id} className={editing?.id === t.id ? "bg-surface-alt" : undefined}>
                  <TableCell>
                    <div className="font-semibold">
                      {t.name}
                      {t.isDefault && (
                        <Badge variant="ok" className="ml-2">
                          signup default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-subtle-foreground">
                      <span className="font-mono">{t.code}</span>
                      {t.description ? ` — ${t.description}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {t.propertyLimit === null ? "unlimited" : t.propertyLimit}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtMoney(t.pricePerPropertyCents)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{t.subscriberCount}</TableCell>
                  <TableCell>
                    <Badge variant={t.active ? "ok" : "neutral"}>{t.active ? "Active" : "Deactivated"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setEditing(editing?.id === t.id ? null : t);
                        }}
                      >
                        {editing?.id === t.id ? "Cancel" : "Edit"}
                      </Button>
                      {!t.isDefault && t.active && (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDefaultTier(t.id))}>
                          Make default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || (t.isDefault && t.active)}
                        onClick={() => run(() => setTierActive(t.id, !t.active))}
                      >
                        {t.active ? "Deactivate" : "Activate"}
                      </Button>
                      {t.subscriberCount === 0 && !t.isDefault && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Delete the "${t.name}" tier? This can't be undone.`)) {
                              run(() => deletePricingTier(t.id));
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="h-fit animate-page-in stagger-2">
        <CardHeader>
          <CardTitle>{editing ? `Edit "${editing.name}"` : "Create tier"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {/* key remounts the form so defaultValues refresh when switching tiers */}
          <form key={editing?.id ?? "new"} action={submitForm} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-code">Code</Label>
              <Input
                id="tier-code"
                name="code"
                required
                placeholder="starter"
                defaultValue={editing?.code ?? ""}
                pattern="[a-z0-9][a-z0-9_-]*"
                title="Lowercase letters, numbers, dashes"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-name">Name</Label>
              <Input id="tier-name" name="name" required placeholder="Starter" defaultValue={editing?.name ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-description">Description</Label>
              <Input
                id="tier-description"
                name="description"
                placeholder="For hosts with a handful of listings."
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-limit">Property limit (blank = unlimited)</Label>
              <Input
                id="tier-limit"
                name="propertyLimit"
                type="number"
                min={1}
                step={1}
                placeholder="unlimited"
                defaultValue={editing?.propertyLimit ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-price">Price per property per month (CAD)</Label>
              <Input
                id="tier-price"
                name="pricePerProperty"
                type="number"
                min={0}
                step={0.01}
                required
                placeholder="5.00"
                defaultValue={editing ? (editing.pricePerPropertyCents / 100).toFixed(2) : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tier-order">Display order</Label>
              <Input
                id="tier-order"
                name="displayOrder"
                type="number"
                min={0}
                step={1}
                defaultValue={editing?.displayOrder ?? tiers.length}
              />
            </div>
            {error && <p className="text-sm font-semibold text-status-risk">{error}</p>}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create tier"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
