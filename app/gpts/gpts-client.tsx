"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteGpt, listGpts, saveGpt, type GptItem } from "@/lib/gpts-store";

const emptyForm = { title: "", category: "", description: "", link: "" };

export function GptsClient() {
  const [items, setItems] = useState<GptItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"supabase" | "local">("supabase");

  async function loadItems() {
    setLoading(true);
    const result = await listGpts();
    setItems(result.data);
    setSource(result.source);
    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await saveGpt(
      {
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        link: form.link.trim()
      },
      editingId
    );
    setItems(result.data);
    setSource(result.source);
    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
  }

  async function remove(id: string) {
    const result = await deleteGpt(id);
    setItems(result.data);
    setSource(result.source);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar GPT" : "Novo GPT"}</CardTitle>
          {source === "local" ? (
            <p className="mt-1 text-xs text-slate-500">Salvando localmente até conectar o Supabase.</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Link</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required /></div>
            <Button disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar GPT"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {loading ? (
          <Card>
            <CardContent className="text-sm text-slate-500">Carregando GPTs...</CardContent>
          </Card>
        ) : null}
        {!loading && items.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500">Nenhum GPT cadastrado.</CardContent>
          </Card>
        ) : null}
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.category}</p>
                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => window.open(item.link, "_blank")} aria-label="Abrir link"><ExternalLink className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => { setEditingId(item.id); setForm({ title: item.title, category: item.category, description: item.description, link: item.link }); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button variant="danger" size="icon" onClick={() => remove(item.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
