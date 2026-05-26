"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  Copy,
  Files,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
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

import { Textarea } from "@/components/ui/textarea";

import {
  deleteMessageTemplate,
  duplicateMessageTemplate,
  listMessageTemplates,
  saveMessageTemplate,
  type MessageTemplate
} from "@/lib/message-templates-store";

type Toast = {
  type: "success" | "error";
  message: string;
};

type SessionUser = {
  id: string;
  name: string;
  login: string;
  is_admin: boolean;
  can_create_templates: boolean;
};

const emptyForm = {
  title: "",
  content: ""
};

const variables = [
  "{{nome}}",
  "{{data}}",
  "{{horario}}",
  "{{link}}"
];

const templatesUpdatedKey =
  "cs_templates_updated_at";

function previewContent(
  content: string
) {
  const clean = content
    .replace(/\s+/g, " ")
    .trim();

  return clean.length > 150
    ? `${clean.slice(0, 150)}...`
    : clean;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(new Date(date));
}

function notifyTemplatesUpdated() {
  localStorage.setItem(
    templatesUpdatedKey,
    String(Date.now())
  );

  window.dispatchEvent(
    new Event("templates-updated")
  );
}

function getSessionUser():
  | SessionUser
  | null {
  if (typeof document === "undefined")
    return null;

  const cookie =
    document.cookie
      .split("; ")
      .find((row) =>
        row.startsWith(
          "cs_user_session="
        )
      );

  if (!cookie) return null;

  try {
    const value =
      decodeURIComponent(
        cookie.split("=")[1]
      );

    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function TemplatesClient() {
  const [items, setItems] =
    useState<MessageTemplate[]>(
      []
    );

  const [form, setForm] =
    useState(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [toast, setToast] =
    useState<Toast | null>(null);

  const [storeSource, setStoreSource] =
    useState<
      "supabase" | "local"
    >("supabase");

  const [sessionUser] =
    useState<SessionUser | null>(
      getSessionUser()
    );

  const isAdmin =
    sessionUser?.is_admin ??
    false;

  const canCreateTemplates =
    sessionUser?.can_create_templates ??
    false;

  const filteredItems =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase();

      if (!term) return items;

      return items.filter((item) =>
        `${item.title} ${item.content}`
          .toLowerCase()
          .includes(term)
      );
    }, [items, search]);

  function showToast(
    nextToast: Toast
  ) {
    setToast(nextToast);

    window.setTimeout(() => {
      setToast(null);
    }, 2600);
  }

  async function loadItems() {
    setLoading(true);

    const result =
      await listMessageTemplates();

    setItems(result.data);

    setStoreSource(
      result.source
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function openCreateModal() {
    if (
      !isAdmin &&
      !canCreateTemplates
    ) {
      showToast({
        type: "error",
        message:
          "Você não possui permissão para criar templates."
      });

      return;
    }

    setEditingId(null);

    setForm(emptyForm);

    setModalOpen(true);
  }

  function openEditModal(
    item: MessageTemplate
  ) {
    if (
      !isAdmin &&
      !canCreateTemplates
    ) {
      showToast({
        type: "error",
        message:
          "Você não possui permissão para editar templates."
      });

      return;
    }

    setEditingId(item.id);

    setForm({
      title: item.title,
      content: item.content
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);

    setEditingId(null);

    setForm(emptyForm);
  }

  async function save(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !isAdmin &&
      !canCreateTemplates
    ) {
      showToast({
        type: "error",
        message:
          "Você não possui permissão para salvar templates."
      });

      return;
    }

    setSaving(true);

    const wasEditing =
      Boolean(editingId);

    const payload = {
      title:
        form.title.trim(),

      content:
        form.content.trim()
    };

    const result =
      await saveMessageTemplate(
        payload,
        editingId
      );

    setItems(result.data);

    setStoreSource(
      result.source
    );

    notifyTemplatesUpdated();

    setSaving(false);

    closeModal();

    showToast({
      type: "success",
      message: wasEditing
        ? "Template atualizado."
        : "Template criado."
    });
  }

  async function duplicate(
    item: MessageTemplate
  ) {
    const result =
      await duplicateMessageTemplate(
        item
      );

    setItems(result.data);

    setStoreSource(
      result.source
    );

    notifyTemplatesUpdated();

    showToast({
      type: "success",
      message:
        "Template duplicado."
    });
  }

  async function remove(
    item: MessageTemplate
  ) {
    if (!isAdmin) {
      showToast({
        type: "error",
        message:
          "Apenas administradores podem excluir templates."
      });

      return;
    }

    const confirmed =
      window.confirm(
        `Excluir o template "${item.title}"?`
      );

    if (!confirmed) return;

    const result =
      await deleteMessageTemplate(
        item.id
      );

    setItems(result.data);

    setStoreSource(
      result.source
    );

    notifyTemplatesUpdated();

    showToast({
      type: "success",
      message:
        "Template excluído."
    });
  }

  async function copyVariable(
    variable: string
  ) {
    await navigator.clipboard.writeText(
      variable
    );

    showToast({
      type: "success",
      message: `Variável ${variable} copiada.`
    });
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border bg-white px-4 py-3 text-sm shadow-lg">
          <CheckCircle2
            className={
              toast.type ===
              "success"
                ? "h-4 w-4 text-emerald-600"
                : "h-4 w-4 text-red-600"
            }
          />

          <span>
            {toast.message}
          </span>
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Central de
              templates
            </h2>

            <p className="text-sm text-slate-500">
              Crie, edite e
              organize mensagens
              usadas no
              Formatador.
              {storeSource ===
              "local"
                ? " Salvando localmente até conectar o Supabase."
                : ""}
            </p>
          </div>

          {(isAdmin ||
            canCreateTemplates) && (
            <Button
              onClick={
                openCreateModal
              }
            >
              <Plus className="h-4 w-4" />
              Novo template
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <Input
              className="pl-9"
              placeholder="Buscar por nome ou conteúdo..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
            />
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando
                templates...
              </CardContent>
            </Card>
          ) : null}

          {!loading &&
          filteredItems.length ===
            0 ? (
            <Card>
              <CardContent className="text-sm text-slate-500">
                Nenhum template
                encontrado.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3">
            {filteredItems.map(
              (item) => (
                <Card
                  key={item.id}
                  className="transition hover:border-slate-300 hover:shadow-md"
                >
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {
                            item.title
                          }
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                          {formatDate(
                            item.created_at
                          )}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {previewContent(
                          item.content
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {(isAdmin ||
                        canCreateTemplates) && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              openEditModal(
                                item
                              )
                            }
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              duplicate(
                                item
                              )
                            }
                            aria-label="Duplicar"
                          >
                            <Files className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="icon"
                          onClick={() =>
                            remove(
                              item
                            )
                          }
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Variáveis
              disponíveis
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {variables.map(
              (variable) => (
                <div
                  key={variable}
                  className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2"
                >
                  <code className="text-sm font-semibold text-slate-800">
                    {variable}
                  </code>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyVariable(
                        variable
                      )
                    }
                    aria-label={`Copiar ${variable}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  {editingId
                    ? "Editar template"
                    : "Novo template"}
                </h2>

                <p className="text-sm text-slate-500">
                  Altere título e
                  conteúdo da
                  mensagem.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={
                  closeModal
                }
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form
              onSubmit={save}
              className="space-y-5 p-5"
            >
              <div className="space-y-2">
                <Label>
                  Título
                </Label>

                <Input
                  value={
                    form.title
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      title:
                        event
                          .target
                          .value
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Conteúdo
                </Label>

                <Textarea
                  className="min-h-64"
                  value={
                    form.content
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      content:
                        event
                          .target
                          .value
                    })
                  }
                  placeholder="Olá {{nome}}, sua reunião será em {{data}} às {{horario}}. Link: {{link}}"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {variables.map(
                  (
                    variable
                  ) => (
                    <Button
                      key={
                        variable
                      }
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        copyVariable(
                          variable
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                      {
                        variable
                      }
                    </Button>
                  )
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  Cancelar
                </Button>

                <Button
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}

                  {saving
                    ? "Salvando..."
                    : "Salvar template"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}