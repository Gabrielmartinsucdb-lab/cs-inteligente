"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteLocalUser,
  listLocalUsers,
  saveLocalUser,
  type LocalUser
} from "@/lib/local-users-store";

const emptyForm = { name: "", login: "", password: "" };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function UsuariosClient() {
  const [items, setItems] = useState<LocalUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setItems(listLocalUsers());
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const nextItems = saveLocalUser(form);
    setItems(nextItems);
    setForm(emptyForm);
    setMessage("Usuário salvo.");

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).catch(() => null);

    setSaving(false);
    window.setTimeout(() => setMessage(""), 2500);
  }

  function remove(id: string) {
    setItems(deleteLocalUser(id));
    setMessage("Usuário excluído.");
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Área disponível apenas para ADM.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Login</Label>
              <Input
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
            <Button disabled={saving}>
              <UserPlus className="h-4 w-4" />
              {saving ? "Salvando..." : "Criar usuário"}
            </Button>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500">Nenhum usuário cadastrado.</CardContent>
          </Card>
        ) : null}

        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-500">Login: {item.login}</p>
                <p className="mt-1 text-xs text-slate-400">Criado em {formatDate(item.created_at)}</p>
              </div>
              <Button variant="danger" size="icon" onClick={() => remove(item.id)} aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
