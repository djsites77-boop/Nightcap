"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { upsertComplianceRule, requestRuleSuggestion } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const RULE_TYPES = [
  "night_cap",
  "mat_rate",
  "registration_fee",
  "occupancy_limit",
  "record_retention_years",
  "partial_unit_bedroom_cap",
] as const;

export function RuleForm({ municipalityId }: { municipalityId: string }) {
  const [ruleType, setRuleType] = useState<(typeof RULE_TYPES)[number]>("night_cap");
  const [unitType, setUnitType] = useState<"entire_home" | "partial_unit" | "all">("entire_home");
  const [value, setValue] = useState('{\n  "nights": 180\n}');
  const [effectiveDate, setEffectiveDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [bylawText, setBylawText] = useState("");
  const [suggestion, setSuggestion] = useState<{ sourceQuote: string; confidence: string } | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-alt p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-accent" />
          Suggest from bylaw text
        </div>
        <p className="mb-3 text-xs text-subtle-foreground">
          Paste the relevant excerpt. This only proposes values into the form below for you to review and
          edit — nothing saves until you submit "Save rule" yourself, same as any [VERIFY] figure in the
          build spec.
        </p>
        <textarea
          value={bylawText}
          onChange={(e) => setBylawText(e.target.value)}
          rows={4}
          placeholder="Paste bylaw excerpt here…"
          className="mb-2 w-full rounded-md border border-border-strong bg-surface p-2 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={suggesting || bylawText.trim().length < 20}
          onClick={() => {
            setSuggestError(null);
            startSuggest(async () => {
              try {
                const result = await requestRuleSuggestion(bylawText, ruleType);
                setRuleType(result.ruleType as (typeof RULE_TYPES)[number]);
                setUnitType(result.unitType);
                setValue(JSON.stringify(result.value, null, 2));
                if (result.effectiveDate) setEffectiveDate(result.effectiveDate.slice(0, 10));
                setSuggestion({ sourceQuote: result.sourceQuote, confidence: result.confidence });
              } catch (e) {
                setSuggestError(e instanceof Error ? e.message : "Suggestion failed");
              }
            });
          }}
        >
          {suggesting ? "Reading…" : "Suggest values →"}
        </Button>
        {suggestion && (
          <p className="mt-2 text-xs text-muted-foreground">
            <b className="uppercase">{suggestion.confidence} confidence</b> — quoted: &ldquo;{suggestion.sourceQuote}&rdquo;
          </p>
        )}
        {suggestError && <p className="mt-2 text-xs text-status-risk">{suggestError}</p>}
      </div>

      <form
        className="flex flex-col gap-3"
        action={(formData) => {
          setSaveError(null);
          startSave(async () => {
            try {
              await upsertComplianceRule(formData);
              setSuggestion(null);
            } catch (e) {
              setSaveError(e instanceof Error ? e.message : "Save failed");
            }
          });
        }}
      >
        <input type="hidden" name="municipalityId" value={municipalityId} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Rule type</Label>
            <Select name="ruleType" value={ruleType} onValueChange={(v) => setRuleType(v as typeof ruleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Unit type</Label>
            <Select name="unitType" value={unitType} onValueChange={(v) => setUnitType(v as typeof unitType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entire_home">Entire home</SelectItem>
                <SelectItem value="partial_unit">Partial unit</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">Value (JSON)</Label>
          <textarea
            id="value"
            name="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border-strong bg-surface p-2 font-mono text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="effectiveDate">Effective date</Label>
            <Input
              id="effectiveDate"
              name="effectiveDate"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              name="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        {saveError && <p className="text-sm text-status-risk">{saveError}</p>}
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saving…" : "Save rule"}
        </Button>
      </form>
    </div>
  );
}
