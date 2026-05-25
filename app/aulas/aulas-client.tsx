"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  deleteCourseLesson,
  listCourseLessons,
  saveCourseLesson,
  type CourseLesson
} from "@/lib/course-lessons-store";

const emptyForm = { title: "", ai_tool: "", category: "", link: "", tags: "" };

export function AulasClient() {
  const [items, setItems] = useState<CourseLesson[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"supabase" | "local">("supabase");

  async function loadItems() {
    setLoading(true);
    const result = await listCourseLessons();
    setItems(result.data);
    setSource(result.source);
    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))), [items]);
  const filtered = items.filter((item) => {
    const text = `${item.title} ${item.ai_tool} ${item.category} ${item.tags}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!category || item.category === category);
  });

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await saveCourseLesson(
      {
        title: form.title.trim(),
        ai_tool: form.ai_tool.trim(),
        category: form.category.trim(),
        link: form.link.trim(),
        tags: form.tags.trim()
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
    const result = await deleteCourseLesson(id);
    setItems(result.data);
    setSource(result.source);
  }

  async function copyMessage(link: string) {
    await navigator.clipboard.writeText(`Doutor(a), segue abaixo a aula solicitada 😊\n\n${link}`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar aula" : "Nova aula"}</CardTitle>
          {source === "local" ? (
            <p className="mt-1 text-xs text-slate-500">Salvando localmente até conectar o Supabase.</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Ferramenta IA</Label><Input value={form.ai_tool} onChange={(e) => setForm({ ...form, ai_tool: e.target.value })} /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2"><Label>Link</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <Button disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar aula"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Buscar aula..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </div>
        {loading ? (
          <Card>
            <CardContent className="text-sm text-slate-500">Carregando aulas...</CardContent>
          </Card>
        ) : null}
        {!loading && filtered.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500">Nenhuma aula encontrada.</CardContent>
          </Card>
        ) : null}
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.ai_tool} · {item.category}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.tags}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="icon" onClick={() => copyMessage(item.link)} aria-label="Copiar mensagem"><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(item.link, "_blank")} aria-label="Abrir link"><ExternalLink className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => { setEditingId(item.id); setForm({ title: item.title, ai_tool: item.ai_tool, category: item.category, link: item.link, tags: item.tags }); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="danger" size="icon" onClick={() => remove(item.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
