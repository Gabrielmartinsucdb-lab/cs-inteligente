"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CalendarCheck,
  Download,
  Pencil,
  Trash2,
  Upload,
  UserCheck,
  UserX
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
    throw new Error(
      `Students API ${response.status}`
    );
  }

  return (await response.json()) as StudentApiResult;
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
  const [users, setUsers] =
    useState<User[]>([]);

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
    if (selectedMentorship === "Todos")
      return items;

    return items.filter(
      (item) =>
        (item.mentorship ?? "") ===
        selectedMentorship
    );
  }, [items, selectedMentorship]);

  function showMessage(next: string) {
    setMessage(next);
    window.setTimeout(
      () => setMessage(""),
      2600
    );
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

      setItems(sortStudents(students));
      writeLocalStudents(sortStudents(students));
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

      setItems(sortStudents(next));
      writeLocalStudents(next);
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

  async function importXlsx(file: File) {
    const XLSX = await import("xlsx");
    const buffer =
      await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];
    const rows =
      XLSX.utils.sheet_to_json<
        Record<string, string | number>
      >(worksheet);
    const payload = rows
      .map((row) => ({
        mentorship: String(
          normalizeMentorship(
            String(
              row.mentorship ??
                row.mentoria ??
                ""
            )
          )
        ),
        name: String(
          row.name ?? row.nome ?? ""
        ),
        phone: String(
          row.phone ??
            row.telefone ??
            ""
        ),
        email: String(row.email ?? ""),
        cs_responsible: String(
          row.cs_responsible ??
            row.cs_responsavel ??
            row.cs ??
            ""
        ),
        is_active:
          String(
            row.status ?? ""
          ).toUpperCase() !==
          "NAO RESPONDE O CS"
      }))
      .filter((row) => row.name);

    let apiSucceeded = true;

    for (const student of payload) {
      try {
        await requestStudentsApi(
          "/api/students",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(student)
          }
        );
      } catch {
        apiSucceeded = false;
      }
    }

    if (!apiSucceeded) {
      const current = readLocalStudents();
      const imported = payload.map((student) =>
        normalizeStudent({
          ...student,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      );
      const next = sortStudents([
        ...imported,
        ...current
      ]);

      writeLocalStudents(next);
      setItems(next);
      setStoreSource("local");
      showMessage(
        "Planilha importada e salva localmente."
      );
      return;
    }

    await loadItems();
    showMessage("Planilha importada.");
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
          >
            <Upload className="h-4 w-4" />
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
              if (file) void importXlsx(file);
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
                      {formatDate(
                        item.last_meeting_at
                      )}
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
    </div>
  );
}
