"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listMessageTemplates, type MessageTemplate } from "@/lib/message-templates-store";

const templatesUpdatedKey = "cs_templates_updated_at";

const months: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12"
};

function normalizeTime(value: string) {
  return value.replace(/\s*h\s*/i, ":").replace(/\s+/g, "").replace(/:$/, ":00");
}

function extractDate(text: string) {
  const numericDate =
    text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    text.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/)?.[0];

  if (numericDate) return numericDate;

  const longDate = text.match(
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/i
  );

  if (!longDate) return "";

  const day = longDate[1].padStart(2, "0");
  const month = months[longDate[2].toLowerCase()] ?? "";
  const year = longDate[3] ? `/${longDate[3]}` : "";

  return `${day}/${month}${year}`;
}

function extractTime(text: string) {
  const rangeMatch = text.match(
    /\b([01]?\d|2[0-3])(?::|h)([0-5]\d)?\s*(?:-|–|—|às|as|a)\s*([01]?\d|2[0-3])(?::|h)([0-5]\d)?\b/i
  );

  if (rangeMatch) {
    const hour = rangeMatch[1].padStart(2, "0");
    const minutes = rangeMatch[2] ?? "00";
    return `${hour}:${minutes}`;
  }

  const timeMatch = text.match(/\b([01]?\d|2[0-3])(?::|h)([0-5]\d)?\b/i);

  if (!timeMatch) return "";

  return normalizeTime(timeMatch[0]).replace(/^(\d):/, "0$1:");
}

function parseCalendarText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const link = text.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i)?.[0] ?? "";
  const dateLine =
    lines.find((line) =>
      /(\d{1,2}[/-]\d{1,2}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+de\s+\w+|(?:^|\s)([01]?\d|2[0-3])(?::|h)[0-5]?\d?)/i.test(
        line
      )
    ) ?? text;
  const time = extractTime(dateLine) || extractTime(text);
  const date = extractDate(dateLine) || extractDate(text);
  const name =
    lines.find((line) => {
      const lower = line.toLowerCase();
      return (
        !line.includes("http") &&
        !lower.includes("google meet") &&
        !lower.includes("meet.google.com") &&
        !extractDate(line) &&
        !extractTime(line)
      );
    }) ??
    "";

  return { nome: name, data: date, horario: time, link };
}

function applyTemplate(content: string, values: ReturnType<typeof parseCalendarText>) {
  return content
    .replaceAll("{{nome}}", values.nome)
    .replaceAll("{{data}}", values.data)
    .replaceAll("{{horario}}", values.horario)
    .replaceAll("{{link}}", values.link);
}

export function FormatadorClient() {
  const [rawText, setRawText] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");

  const loadTemplates = useCallback(async () => {
    const { data: rows } = await listMessageTemplates();

    setTemplates(rows);
    setTemplateId((currentId) => {
      if (rows.some((template) => template.id === currentId)) return currentId;
      return rows[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    void loadTemplates();

    function reloadTemplates() {
      void loadTemplates();
    }

    function reloadFromStorage(event: StorageEvent) {
      if (event.key === templatesUpdatedKey) void loadTemplates();
    }

    window.addEventListener("templates-updated", reloadTemplates);
    window.addEventListener("storage", reloadFromStorage);
    window.addEventListener("focus", reloadTemplates);

    return () => {
      window.removeEventListener("templates-updated", reloadTemplates);
      window.removeEventListener("storage", reloadFromStorage);
      window.removeEventListener("focus", reloadTemplates);
    };
  }, [loadTemplates]);

  const parsed = useMemo(() => parseCalendarText(rawText), [rawText]);
  const selectedTemplate = templates.find((template) => template.id === templateId);

  function generate() {
    const content =
      selectedTemplate?.content ??
      "Olá {{nome}}, sua reunião está agendada para {{data}} às {{horario}}.\nLink: {{link}}";
    setMessage(applyTemplate(content, parsed));
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Entrada do Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-80"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Cole aqui o texto do evento..."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {templates.length === 0 ? <option value="">Nenhum template cadastrado</option> : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={generate}>
                <Wand2 className="h-4 w-4" />
                Gerar mensagem
              </Button>
              <Button variant="outline" onClick={copy} disabled={!message}>
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados detectados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Nome:</strong> {parsed.nome || "-"}</p>
            <p><strong>Data:</strong> {parsed.data || "-"}</p>
            <p><strong>Horário:</strong> {parsed.horario || "-"}</p>
            <p className="break-all"><strong>Link:</strong> {parsed.link || "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="min-h-52 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm text-slate-800">
              {message || "A mensagem gerada aparecerá aqui."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
