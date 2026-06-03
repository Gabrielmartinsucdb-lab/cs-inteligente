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

const brasiliaOffsetMinutes = -3 * 60;

const timezoneOffsets: Record<string, number> = {
  BRT: -3 * 60,
  BRST: -2 * 60,
  EST: -5 * 60,
  EDT: -4 * 60,
  CST: -6 * 60,
  CDT: -5 * 60,
  MST: -7 * 60,
  MDT: -6 * 60,
  PST: -8 * 60,
  PDT: -7 * 60,
  ART: -3 * 60,
  CLT: -4 * 60,
  CEST: 2 * 60,
  CET: 60,
  WEST: 60,
  WET: 0
};

const ianaTimezoneOffsets: Record<string, number> = {
  "america/sao_paulo": -3 * 60,
  "america/campo_grande": -4 * 60,
  "america/cuiaba": -4 * 60,
  "america/manaus": -4 * 60,
  "america/rio_branco": -5 * 60,
  "america/new_york": -4 * 60,
  "america/chicago": -5 * 60,
  "america/denver": -6 * 60,
  "america/los_angeles": -7 * 60,
  "europe/london": 60,
  "europe/lisbon": 60
};

type DateParts = {
  day: number;
  month: number;
  year: number;
  hasYear: boolean;
};

type TimeParts = {
  hour: number;
  minute: number;
};

function formatTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function formatTime(parts: TimeParts) {
  return `${formatTwoDigits(parts.hour)}:${formatTwoDigits(parts.minute)}`;
}

function formatDateParts(parts: DateParts) {
  const date = `${formatTwoDigits(parts.day)}/${formatTwoDigits(parts.month)}`;

  return parts.hasYear ? `${date}/${parts.year}` : date;
}

function normalizeYear(value?: string) {
  if (!value) return new Date().getFullYear();

  const year = Number(value);

  return year < 100 ? 2000 + year : year;
}

function parseDateParts(text: string): DateParts | null {
  const isoDate = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  if (isoDate) {
    return {
      day: Number(isoDate[3]),
      month: Number(isoDate[2]),
      year: Number(isoDate[1]),
      hasYear: true
    };
  }

  const numericDate = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  if (numericDate) {
    return {
      day: Number(numericDate[1]),
      month: Number(numericDate[2]),
      year: normalizeYear(numericDate[3]),
      hasYear: Boolean(numericDate[3])
    };
  }

  const longDate = text.match(
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/i
  );

  if (!longDate) return null;

  return {
    day: Number(longDate[1]),
    month: Number(months[longDate[2].toLowerCase()] ?? "0"),
    year: normalizeYear(longDate[3]),
    hasYear: Boolean(longDate[3])
  };
}

function normalizeMeridiem(value?: string) {
  return value?.replaceAll(".", "").toLowerCase();
}

function stripTimezoneHints(value: string) {
  return value
    .replace(/\b(?:GMT|UTC)\s*[+-]\s*\d{1,2}(?::?[0-5]\d)?\b/gi, "")
    .replace(/\b[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?\b/g, "")
    .replace(/\b(BRT|BRST|EST|EDT|CST|CDT|MST|MDT|PST|PDT|ART|CLT|CEST|CET|WEST|WET)\b/gi, "");
}

function parseTimeParts(value: string): TimeParts | null {
  const cleanValue = stripTimezoneHints(value);
  const amPmMatch = cleanValue.match(/\b(\d{1,2})(?::|h)?([0-5]\d)?\s*(a\.?m\.?|p\.?m\.?)\b/i);

  if (amPmMatch) {
    const meridiem = normalizeMeridiem(amPmMatch[3]);
    let hour = Number(amPmMatch[1]);

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    return {
      hour,
      minute: Number(amPmMatch[2] ?? "00")
    };
  }

  const timeMatch = cleanValue.match(/\b([01]?\d|2[0-3])(?::|h)([0-5]\d)?\b/i);

  if (!timeMatch) return null;

  return {
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2] ?? "00")
  };
}

function detectTimezoneOffset(text: string) {
  if (/\b(?:hor[aá]rio\s+de\s+bras[ií]lia|bras[ií]lia|brt)\b/i.test(text)) {
    return brasiliaOffsetMinutes;
  }

  const explicitOffset = text.match(/\b(?:GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?([0-5]\d))?\b/i);

  if (explicitOffset) {
    const direction = explicitOffset[1] === "-" ? -1 : 1;
    const hours = Number(explicitOffset[2]);
    const minutes = Number(explicitOffset[3] ?? "00");

    return direction * (hours * 60 + minutes);
  }

  const ianaMatch = text.match(/\b[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?\b/);

  if (ianaMatch) {
    const offset = ianaTimezoneOffsets[ianaMatch[0].toLowerCase()];

    if (typeof offset === "number") return offset;
  }

  const abbreviationMatch = text.match(/\b(BRT|BRST|EST|EDT|CST|CDT|MST|MDT|PST|PDT|ART|CLT|CEST|CET|WEST|WET)\b/i);

  if (!abbreviationMatch) return null;

  return timezoneOffsets[abbreviationMatch[1].toUpperCase()] ?? null;
}

function convertToBrasilia(
  date: DateParts | null,
  time: TimeParts,
  sourceOffsetMinutes: number
) {
  const baseDate = date ?? {
    day: 1,
    month: 1,
    year: new Date().getFullYear(),
    hasYear: false
  };
  const utcTime =
    Date.UTC(
      baseDate.year,
      baseDate.month - 1,
      baseDate.day,
      time.hour,
      time.minute
    ) -
    sourceOffsetMinutes * 60 * 1000;
  const brasiliaTime = new Date(
    utcTime + brasiliaOffsetMinutes * 60 * 1000
  );

  return {
    date: {
      day: brasiliaTime.getUTCDate(),
      month: brasiliaTime.getUTCMonth() + 1,
      year: brasiliaTime.getUTCFullYear(),
      hasYear: baseDate.hasYear
    },
    time: {
      hour: brasiliaTime.getUTCHours(),
      minute: brasiliaTime.getUTCMinutes()
    }
  };
}

function extractDate(text: string) {
  const date = parseDateParts(text);

  return date ? formatDateParts(date) : "";
}

function extractTime(text: string) {
  const rangeMatch = text.match(
    /\b(\d{1,2})(?::|h)?([0-5]\d)?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|às|as|a)\s*(\d{1,2})(?::|h)?([0-5]\d)?\s*(a\.?m\.?|p\.?m\.?)?\b/i
  );

  if (rangeMatch) {
    const meridiem = rangeMatch[3] ?? rangeMatch[6] ?? "";
    const time = parseTimeParts(
      `${rangeMatch[1]}:${rangeMatch[2] ?? "00"} ${meridiem}`
    );

    return time ? formatTime(time) : "";
  }

  const time = parseTimeParts(text);

  return time ? formatTime(time) : "";
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
  const sourceOffset = detectTimezoneOffset(text);
  const parsedDateParts = parseDateParts(dateLine) || parseDateParts(text);
  const parsedTimeParts = parseTimeParts(dateLine) || parseTimeParts(text);
  const brasiliaDateTime =
    typeof sourceOffset === "number" && parsedTimeParts
      ? convertToBrasilia(parsedDateParts, parsedTimeParts, sourceOffset)
      : null;
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

  return {
    nome: name,
    data: brasiliaDateTime
      ? formatDateParts(brasiliaDateTime.date)
      : date,
    horario: brasiliaDateTime
      ? formatTime(brasiliaDateTime.time)
      : time,
    link
  };
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
