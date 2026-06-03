"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  deleteUser,
  listUsers,
  saveUser,
  type User
} from "@/lib/users-store";

const emptyForm = {
  name: "",
  login: "",
  password: "",
  is_admin: false,
  can_create_templates: false
};

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

export function UsuariosClient() {
  const [items, setItems] = useState<User[]>([]);

  const [form, setForm] = useState(
    emptyForm
  );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      console.log("CARREGANDO USERS...");

      const users = await listUsers();

      console.log(
        "USERS CARREGADOS:",
        users
      );

      setItems(users);
    } catch (error) {
      console.error(
        "ERRO LOAD USERS:",
        error
      );
    }
  }

  async function save(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      console.log(
        "SALVANDO USER:",
        form
      );

      const nextItems =
        await saveUser({
          ...form,
          id: editingId
        });

      setItems(nextItems);

      setForm(emptyForm);

      setEditingId(null);

      setMessage(
        editingId
          ? "Permissões atualizadas."
          : "Usuário salvo."
      );

      await fetch(
        "/api/admin/users",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(form)
        }
      ).catch(() => null);
    } catch (error) {
      console.error(
        "ERRO SAVE USER:",
        error
      );

      setMessage(
        "Erro ao salvar usuário."
      );
    } finally {
      setSaving(false);

      window.setTimeout(() => {
        setMessage("");
      }, 2500);
    }
  }

  async function remove(id: string) {
    try {
      console.log(
        "REMOVENDO USER:",
        id
      );

      const nextItems =
        await deleteUser(id);

      setItems(nextItems);

      setMessage(
        "Usuário excluído."
      );
    } catch (error) {
      console.error(
        "ERRO DELETE USER:",
        error
      );

      setMessage(
        "Erro ao excluir usuário."
      );
    } finally {
      window.setTimeout(() => {
        setMessage("");
      }, 2500);
    }
  }

  function edit(item: User) {
    setEditingId(item.id);

    setForm({
      name: item.name,
      login: item.login,
      password: item.password,
      is_admin: Boolean(item.is_admin),
      can_create_templates: Boolean(
        item.can_create_templates
      )
    });
  }

  function cancelEdit() {
    setEditingId(null);

    setForm(emptyForm);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId
              ? "Editar usuário"
              : "Novo usuário"}
          </CardTitle>

          <p className="mt-1 text-xs text-slate-500">
            Área disponível apenas
            para ADM.
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>
                Nome
              </Label>

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
              <Label>
                Login
              </Label>

              <Input
                value={form.login}
                onChange={(event) =>
                  setForm({
                    ...form,
                    login:
                      event.target.value
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Senha
              </Label>

              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target.value
                  })
                }
                required
              />
            </div>

            <div className="rounded-md border bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                Permissões
              </p>

              <label className="mt-3 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={
                    form.is_admin
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_admin:
                        event.target
                          .checked
                    })
                  }
                />

                <span>
                  Administrador
                </span>
              </label>

              <label className="mt-3 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={
                    form.can_create_templates
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      can_create_templates:
                        event.target
                          .checked
                    })
                  }
                />

                <span>
                  Pode criar templates
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={saving}>
                <UserPlus className="h-4 w-4" />

                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Criar usuário"}
              </Button>

              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
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

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500">
              Nenhum usuário
              cadastrado.
            </CardContent>
          </Card>
        ) : null}

        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">
                  {item.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Login:{" "}
                  {item.login}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.is_admin ? (
                    <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                      Administrador
                    </span>
                  ) : null}

                  {item.can_create_templates ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Cria templates
                    </span>
                  ) : null}

                  {!item.is_admin &&
                  !item.can_create_templates ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                      Acesso básico
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Criado em{" "}
                  {formatDate(
                    item.created_at
                  )}
                </p>
              </div>

              <div className="flex gap-2">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
