"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CalendarCheck,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_CS_NAMES,
  MENTORSHIP_OPTIONS,
  normalizeMentorship
} from "@/lib/options";
import {
  listUsers,
  type User
} from "@/lib/users-store";

type Student = {
  id: string;
  mentorship: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  cs_responsible: string | null;
  last_meeting_at: string | null;
  meetings_count: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

type StudentForm = {
  mentorship: string;
  name: string;
  phone: string;
  email: string;
  cs_responsible: string;
  is_active: boolean;
};

type StudentApiResult = {
  data: Student[];
  source: "supabase" | "local";
};

type ImportTarget =
  | "skip"
  | "mentorship"
  | "name"
  | "phone"
  | "email"
  | "cs_responsible"
  | "status";

type ImportMapping = Record<string, ImportTarget>;

const localStorageKey = "cs_students";

const emptyForm: StudentForm = {
  mentorship: "",
  name: "",
  phone: "",
  email: "",
  cs_responsible: "",
  is_active: true
};

function normalizeStudent(
  student: Partial<Student>
): Student {
  return {
    id: student.id ?? crypto.randomUUID(),
    mentorship: student.mentorship ?? "",
    name: student.name ?? "",
    phone: student.phone ?? "",
    email: student.email ?? "",
    cs_responsible:
      student.cs_responsible ?? "",
    last_meeting_at:
      student.last_meeting_at ?? null,
    meetings_count:
      Number(student.meetings_count ?? 0),
    is_active:
      student.is_active ?? true,
    created_at:
      student.created_at ??
      new Date().toISOString(),
    updated_at:
      student.updated_at ??
      student.created_at ??
      new Date().toISOString()
  };
}

function readLocalStudents() {
  try {
    const raw =
      window.localStorage.getItem(
        localStorageKey
      );

    return raw
      ? (JSON.parse(raw) as Student[]).map(
          normalizeStudent
        )
      : [];
  } catch {
    return [];
  }
}

function writeLocalStudents(
  students: Student[]
) {
  window.localStorage.setItem(
    localStorageKey,
    JSON.stringify(students)
  );
}

function sortStudents(students: Student[]) {
  return [...students].sort(
    (a, b) =>
      new Date(
        b.updated_at ?? b.created_at
      ).getTime() -
      new Date(
        a.updated_at ?? a.created_at
      ).getTime()
  );
}

async function requestStudentsApi(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const response = await fetch(input, init);

  if (!response.ok) {
    let message = `Students API ${response.status}`;

    try {
      const text = await response.text();

      if (text.trim()) {
        try {
          const payload = JSON.parse(text) as {
            error?: string;
          };

          if (payload?.error) {
            message = payload.error;
          } else {
            message = text.trim();
          }
        } catch {
          message = text.trim();
        }
      }
    } catch {
      // keep default message
    }

    throw new Error(message);
  }

  return (await response.json()) as StudentApiResult;
}

function normalizeImportText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function makeUniqueHeaders(rawHeaders: string[]) {
  const counts = new Map<string, number>();

  return rawHeaders.map((header, index) => {
    const base =
      header.trim() || `Coluna ${index + 1}`;
    const nextCount = (counts.get(base) ?? 0) + 1;
    counts.set(base, nextCount);

    return nextCount === 1
      ? base
      : `${base} (${nextCount})`;
  });
}

function headerMatches(
  header: string,
  candidates: string[]
) {
  const normalizedHeader = normalizeImportText(
    header
  );

  return candidates.some((candidate) =>
    normalizedHeader.includes(
      normalizeImportText(candidate)
    )
  );
}

function inferImportTarget(header: string) {
  if (
    headerMatches(header, [
      "nome",
      "aluno",
      "student"
    ])
  ) {
    return "name" as const;
  }

  if (
    headerMatches(header, [
      "mentoria",
      "mentorship",
      "turma",
      "grupo"
    ])
  ) {
    return "mentorship" as const;
  }

  if (
    headerMatches(header, [
      "telefone",
      "celular",
      "fone",
      "phone",
      "whatsapp"
    ])
  ) {
    return "phone" as const;
  }

  if (
    headerMatches(header, [
      "email",
      "e-mail",
      "mail"
    ])
  ) {
    return "email" as const;
  }

  if (
    headerMatches(header, [
      "cs responsavel",
      "cs",
      "responsavel",
      "responsável",
      "consultor",
      "owner"
    ])
  ) {
    return "cs_responsible" as const;
  }

  if (
    headerMatches(header, [
      "status",
      "situacao",
      "situação",
      "estado"
    ])
  ) {
    return "status" as const;
  }

  return "skip" as const;
}

function inferImportMapping(headers: string[]) {
  return headers.reduce<ImportMapping>(
    (acc, header) => {
      acc[header] = inferImportTarget(header);
      return acc;
    },
    {}
  );
}

function parseImportedStatus(value: string) {
  const normalized = normalizeImportText(value);

  if (!normalized) return true;

  if (
    [
      "nao responde o cs",
      "nao responde",
      "nao responder",
      "inativo",
      "inactive",
      "false",
      "0",
      "nao",
      "não"
    ].some((term) =>
      normalized.includes(normalizeImportText(term))
    )
  ) {
    return false;
  }

  return true;
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(new Date(date));
}

function formFromStudent(
  item: Student
): StudentForm {
  return {
    mentorship: item.mentorship ?? "",
    name: item.name,
    phone: item.phone ?? "",
    email: item.email ?? "",
    cs_responsible:
      item.cs_responsible ?? "",
    is_active: item.is_active ?? true
  };
}

function studentPayload(form: StudentForm) {
  return {
    mentorship: form.mentorship.trim(),
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    cs_responsible:
      form.cs_responsible.trim(),
    is_active: form.is_active
  };
}

export function AlunosClient() {
  const fileRef =
    useRef<HTMLInputElement>(null);
  const [items, setItems] =
    useState<Student[]>([]);
  const [form, setForm] =
    useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [storeSource, setStoreSource] =
    useState<"supabase" | "local">(
      "supabase"
    );
  const [message, setMessage] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [selectedMentorship, setSelectedMentorship] =
    useState("Todos");
  const [searchQuery, setSearchQuery] =
    useState("");
  const [users, setUsers] =
    useState<User[]>([]);
  const [importModalOpen, setImportModalOpen] =
    useState(false);
  const [importBusy, setImportBusy] =
    useState(false);
  const [importFile, setImportFile] =
    useState<File | null>(null);
  const [importFileName, setImportFileName] =
    useState("");
  const [importHeaders, setImportHeaders] =
    useState<string[]>([]);
  const [importPreviewRows, setImportPreviewRows] =
    useState<string[][]>([]);
  const [importMapping, setImportMapping] =
    useState<ImportMapping>({});
  const [importMessage, setImportMessage] =
    useState("");

  const csOptions = useMemo(() => {
    const userCs = users
      .filter((user) => user.is_cs)
      .map((user) => user.name);

    return Array.from(
      new Set([
        ...DEFAULT_CS_NAMES,
        ...userCs,
        form.cs_responsible
      ].filter(Boolean))
    );
  }, [form.cs_responsible, users]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeImportText(
      searchQuery
    );

    return items.filter((item) => {
      const mentorshipMatch =
        selectedMentorship === "Todos" ||
        (item.mentorship ?? "") ===
          selectedMentorship;

      if (!mentorshipMatch) return false;
      if (!normalizedQuery) return true;

      const haystack = normalizeImportText(
        [
          item.name,
          item.mentorship ?? "",
          item.phone ?? "",
          item.email ?? "",
          item.cs_responsible ?? ""
        ]
          .filter(Boolean)
          .join(" ")
      );

      return haystack.includes(normalizedQuery);
    });
  }, [items, searchQuery, selectedMentorship]);

  const importUsedCount = useMemo(
    () =>
      Object.values(importMapping).filter(
        (value) => value !== "skip"
      ).length,
    [importMapping]
  );

  function showMessage(next: string) {
    setMessage(next);
    window.setTimeout(
      () => setMessage(""),
      2600
    );
  }

  function closeImportModal() {
    setImportModalOpen(false);
    setImportBusy(false);
    setImportFile(null);
    setImportFileName("");
    setImportHeaders([]);
    setImportPreviewRows([]);
    setImportMapping({});
    setImportMessage("");
  }

  function openImportModal(
    file: File,
    headers: string[],
    rows: string[][]
  ) {
    setImportFile(file);
    setImportFileName(file.name);
    setImportHeaders(headers);
    setImportPreviewRows(rows);
    setImportMapping(inferImportMapping(headers));
    setImportMessage("");
    setImportModalOpen(true);
  }

  async function loadImportPreview(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<
      Array<string | number | boolean>
    >(worksheet, {
      header: 1,
      defval: ""
    }) as Array<Array<string | number | boolean>>;

    const rawHeaders = (matrix[0] ?? []).map((cell, index) =>
      String(cell ?? "").trim() || `Coluna ${index + 1}`
    );
    const headers = makeUniqueHeaders(rawHeaders);
    const rows = matrix.slice(1, 6).map((row) =>
      headers.map((_, index) =>
        String(row?.[index] ?? "").trim()
      )
    );

    return {
      headers,
      rows
    };
  }

  async function importStudentsFromFile(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<
      Array<string | number | boolean>
    >(worksheet, {
      header: 1,
      defval: ""
    }) as Array<Array<string | number | boolean>>;

    const rawHeaders = (matrix[0] ?? []).map((cell, index) =>
      String(cell ?? "").trim() || `Coluna ${index + 1}`
    );
    const headers = makeUniqueHeaders(rawHeaders);
    const dataRows = matrix.slice(1);
    const payload = dataRows
      .map((row) => {
        const values = headers.reduce<
          Record<string, string>
        >((acc, header, index) => {
          acc[header] = String(row?.[index] ?? "").trim();
          return acc;
        }, {});

        const mapped = {
          mentorship: "",
          name: "",
          phone: "",
          email: "",
          cs_responsible: "",
          status: ""
        };

        headers.forEach((header) => {
          const target = importMapping[header] ?? "skip";
          const value = values[header] ?? "";

          if (target === "skip") return;

          if (target === "status") {
            mapped.status = value;
            return;
          }

          mapped[target] = value;
        });

        return {
          mentorship: normalizeMentorship(
            mapped.mentorship
          ),
          name: mapped.name,
          phone: mapped.phone,
          email: mapped.email,
          cs_responsible: mapped.cs_responsible,
          is_active: parseImportedStatus(mapped.status)
        };
      })
      .filter((row) => row.name);

    await requestStudentsApi("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    await loadItems();
    showMessage("Planilha importada e salva no banco.");
  }

  async function startImportFromFile(file: File) {
    setImportBusy(true);

    try {
      const preview = await loadImportPreview(file);

      if (!preview.headers.length) {
        showMessage("Essa planilha não tem colunas legíveis.");
        return;
      }

      openImportModal(file, preview.headers, preview.rows);
    } catch {
      showMessage("Não consegui ler essa planilha.");
    } finally {
      setImportBusy(false);
    }
  }

  async function confirmImport() {
    if (!importFile) return;

    if (
      !Object.values(importMapping).includes("name")
    ) {
      setImportMessage(
        "Mapeie pelo menos uma coluna como Nome."
      );
      return;
    }

    setImportBusy(true);
    setImportMessage("");

    try {
      await importStudentsFromFile(importFile);
      closeImportModal();
    } catch (error) {
      setImportMessage(
        error instanceof Error
          ? error.message
          : "Não consegui importar essa planilha."
      );
    } finally {
      setImportBusy(false);
    }
  }

  async function loadItems() {
    setLoading(true);

    try {
      const result =
        await requestStudentsApi(
          "/api/students"
        );
      const students = result.data.map(
        normalizeStudent
      );

      setItems(sortStudents(students));
      setStoreSource(result.source);
      writeLocalStudents(sortStudents(students));
    } catch {
      const students =
        sortStudents(readLocalStudents());

      setItems(students);
      setStoreSource("local");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    void listUsers().then(setUsers);
  }, []);

  async function save(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const payload = studentPayload(form);

    try {
      const result = editingId
        ? await requestStudentsApi(
            `/api/students/${editingId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify(payload)
            }
          )
        : await requestStudentsApi(
            "/api/students",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify(payload)
            }
          );

      const students = result.data.map(
        normalizeStudent
      );

      setItems(sortStudents(students));
      setStoreSource(result.source);
      writeLocalStudents(sortStudents(students));
    } catch {
      const current = readLocalStudents();
      const now = new Date().toISOString();
      const next = editingId
        ? current.map((student) =>
            student.id === editingId
              ? {
                  ...student,
                  ...payload,
                  updated_at: now
                }
              : student
          )
        : [
            normalizeStudent({
              ...payload,
              created_at: now,
              updated_at: now
            }),
            ...current
          ];

      setItems(sortStudents(next));
      setStoreSource("local");
      writeLocalStudents(next);
    }

    setForm(emptyForm);
    setEditingId(null);
    if (
      payload.mentorship &&
      selectedMentorship !== "Todos" &&
      payload.mentorship !== selectedMentorship
    ) {
      setSelectedMentorship(payload.mentorship);
    }
    showMessage("Aluno salvo.");
  }

  async function remove(id: string) {
    const confirmed =
      window.confirm(
        "Excluir este aluno da base?"
      );

    if (!confirmed) return;

    try {
      const result =
        await requestStudentsApi(
          `/api/students/${id}`,
          {
            method: "DELETE"
          }
        );
      const students = result.data.map(
        normalizeStudent
      );

      setItems(sortStudents(students));
      writeLocalStudents(sortStudents(students));
      setStoreSource(result.source);
    } catch {
      const next = readLocalStudents().filter(
        (student) => student.id !== id
      );

      setItems(sortStudents(next));
      writeLocalStudents(next);
      setStoreSource("local");
    }

    showMessage("Aluno excluído.");
  }

  async function registerMeeting(
    item: Student
  ) {
    try {
      const result =
        await requestStudentsApi(
          `/api/students/${item.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              action: "register_meeting"
            })
          }
        );
      const students = result.data.map(
        normalizeStudent
      );
      const sortedStudents = sortStudents(
        students
      );

      setItems(sortedStudents);
      writeLocalStudents(sortedStudents);
      setStoreSource(result.source);
    } catch {
      const now = new Date().toISOString();
      const next = readLocalStudents().map(
        (student) =>
          student.id === item.id
            ? {
                ...student,
                last_meeting_at: now,
                meetings_count:
                  Number(
                    student.meetings_count ?? 0
                  ) + 1,
                updated_at: now
              }
            : student
      );

      const sortedNext = sortStudents(next);

      setItems(sortedNext);
      writeLocalStudents(sortedNext);
      setStoreSource("local");
    }

    showMessage(
      "Reunião registrada com a data de hoje."
    );
  }

  async function toggleActive(item: Student) {
    const nextActive = !(item.is_active ?? true);

    try {
      const result =
        await requestStudentsApi(
          `/api/students/${item.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              is_active: nextActive
            })
          }
        );
      const students = result.data.map(
        normalizeStudent
      );

      setItems(students);
      writeLocalStudents(students);
      setStoreSource(result.source);
    } catch {
      const now = new Date().toISOString();
      const next = readLocalStudents().map(
        (student) =>
          student.id === item.id
            ? {
                ...student,
                is_active: nextActive,
                updated_at: now
              }
            : student
      );

      setItems(sortStudents(next));
      writeLocalStudents(next);
      setStoreSource("local");
    }

    showMessage(
      nextActive
        ? "Aluno marcado como ativo."
        : "Aluno marcado como não responde o CS."
    );
  }

  function edit(item: Student) {
    setEditingId(item.id);
    setForm(formFromStudent(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const rows = filteredItems.map((item) => ({
      mentoria: item.mentorship ?? "",
      nome: item.name,
      telefone: item.phone ?? "",
      email: item.email ?? "",
      cs_responsavel:
        item.cs_responsible ?? "",
      ultima_reuniao: formatDate(
        item.last_meeting_at
      ),
      total_reunioes:
        item.meetings_count ?? 0,
      status: item.is_active
        ? "Ativo"
        : "NAO RESPONDE O CS"
    }));
    const worksheet =
      XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Alunos"
    );
    XLSX.writeFile(workbook, "alunos.xlsx");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId
              ? "Editar aluno"
              : "Novo aluno"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Mentoria</Label>
              <Select
                value={form.mentorship}
                onChange={(event) =>
                  setForm({
                    ...form,
                    mentorship:
                      event.target.value
                  })
                }
                required
              >
                <option value="">
                  Selecione a mentoria
                </option>
                {MENTORSHIP_OPTIONS.map(
                  (mentorship) => (
                    <option
                      key={mentorship}
                      value={mentorship}
                    >
                      {mentorship}
                    </option>
                  )
                )}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone:
                      event.target.value
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email:
                      event.target.value
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>CS responsável</Label>
              <Select
                value={form.cs_responsible}
                onChange={(event) =>
                  setForm({
                    ...form,
                    cs_responsible:
                      event.target.value
                  })
                }
              >
                <option value="">
                  Selecione o CS
                </option>
                {csOptions.map((csName) => (
                  <option
                    key={csName}
                    value={csName}
                  >
                    {csName}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-3 rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({
                    ...form,
                    is_active:
                      event.target.checked
                  })
                }
              />
              Aluno ativo no acompanhamento
            </label>

            <div className="flex flex-wrap gap-2">
              <Button>
                {editingId
                  ? "Salvar alterações"
                  : "Criar aluno"}
              </Button>

              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>

            {message ? (
              <p className="text-sm text-emerald-600">
                {message}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...MENTORSHIP_OPTIONS].map(
            (mentorship) => {
              const active =
                selectedMentorship ===
                mentorship;
              const count =
                mentorship === "Todos"
                  ? items.length
                  : items.filter(
                      (item) =>
                        (item.mentorship ??
                          "") === mentorship
                    ).length;

              return (
                <Button
                  key={mentorship}
                  type="button"
                  variant={
                    active
                      ? "default"
                      : "outline"
                  }
                  className="min-w-32"
                  onClick={() =>
                    setSelectedMentorship(
                      mentorship
                    )
                  }
                >
                  {mentorship} ({count})
                </Button>
              );
            }
          )}
        </div>

        <div className="space-y-2">
          <Label>Buscar aluno</Label>
          <Input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Nome, telefone, e-mail ou CS"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={exportXlsx}
          >
            <Download className="h-4 w-4" />
            Exportar XLSX
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              fileRef.current?.click()
            }
            disabled={importBusy}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar XLSX
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0];
              if (file) void startImportFromFile(file);
              event.target.value = "";
            }}
          />

          <span className="text-xs text-slate-500">
            {storeSource === "local"
              ? "Salvando localmente até conectar o banco."
              : "Dados sincronizados."}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3">Mentoria</th>
                <th className="p-3">CS</th>
                <th className="p-3">Contato</th>
                <th className="p-3">Última reunião</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="p-4 text-sm text-slate-500"
                    colSpan={8}
                  >
                    Carregando alunos...
                  </td>
                </tr>
              ) : null}

              {!loading &&
              filteredItems.length === 0 ? (
                <tr>
                  <td
                    className="p-4 text-sm text-slate-500"
                    colSpan={8}
                  >
                    Nenhum aluno nesta mentoria.
                  </td>
                </tr>
              ) : null}

              {filteredItems.map((item) => {
                const isActive =
                  item.is_active ?? true;

                return (
                  <tr
                    key={item.id}
                    className={
                      isActive
                        ? "border-t"
                        : "border-t bg-red-50/50"
                    }
                  >
                    <td className="p-3">
                      <p className="font-medium text-slate-950">
                        {item.name}
                      </p>
                    </td>

                    <td className="p-3">
                      {item.mentorship || "-"}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {item.cs_responsible ||
                          "Sem CS"}
                      </span>
                    </td>

                    <td className="p-3">
                      <p>{item.phone || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {item.email || "-"}
                      </p>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">
                          {formatDate(
                            item.last_meeting_at
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.last_meeting_at
                            ? "Última reunião registrada"
                            : "Sem reunião registrada"}
                        </p>
                      </div>
                    </td>

                    <td className="p-3">
                      {item.meetings_count ?? 0}
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          isActive
                            ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                        }
                      >
                        {isActive
                          ? "Ativo"
                          : "NAO RESPONDE O CS"}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            registerMeeting(item)
                          }
                          aria-label="Registrar reunião"
                        >
                          <CalendarCheck className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            toggleActive(item)
                          }
                          aria-label={
                            isActive
                              ? "Marcar como não responde"
                              : "Marcar como ativo"
                          }
                        >
                          {isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            edit(item)
                          }
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="danger"
                          size="icon"
                          onClick={() =>
                            remove(item.id)
                          }
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {importModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Mapear colunas da planilha
                </h2>
                <p className="text-sm text-slate-500">
                  {importFileName
                    ? `Arquivo: ${importFileName}`
                    : "Escolha o destino de cada coluna antes de importar."}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeImportModal}
                aria-label="Fechar importação"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {importHeaders.length} colunas encontradas
                  {" · "}
                  {importUsedCount} mapeadas para o sistema
                </p>
                <p className="text-xs text-slate-500">
                  A coluna Nome precisa estar mapeada para a importação funcionar.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3">Coluna da planilha</th>
                      <th className="p-3">Exemplo</th>
                      <th className="p-3">Destino no sistema</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importHeaders.map((header, index) => {
                      const sampleValues = importPreviewRows
                        .map((row) => row[index] ?? "")
                        .filter(Boolean)
                        .slice(0, 3);

                      return (
                        <tr key={header} className="border-t align-top">
                          <td className="p-3 font-medium text-slate-950">
                            {header}
                          </td>
                          <td className="p-3 text-slate-600">
                            {sampleValues.length
                              ? sampleValues.join(" · ")
                              : "-"}
                          </td>
                          <td className="p-3">
                            <Select
                              value={importMapping[header] ?? "skip"}
                              onChange={(event) =>
                                setImportMapping((current) => ({
                                  ...current,
                                  [header]:
                                    event.target.value as ImportTarget
                                }))
                              }
                            >
                              <option value="skip">
                                Ignorar
                              </option>
                              <option value="name">
                                Nome
                              </option>
                              <option value="mentorship">
                                Mentoria
                              </option>
                              <option value="phone">
                                Telefone
                              </option>
                              <option value="email">
                                E-mail
                              </option>
                              <option value="cs_responsible">
                                CS responsável
                              </option>
                              <option value="status">
                                Status do aluno
                              </option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importMessage ? (
                <p className="mt-4 text-sm text-red-600">
                  {importMessage}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-slate-50 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeImportModal}
                disabled={importBusy}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={confirmImport}
                disabled={importBusy}
              >
                Importar alunos
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
