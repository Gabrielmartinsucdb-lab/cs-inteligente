"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase-browser";

type Student = {
  id: string;
  mentorship: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
};

const emptyForm = { mentorship: "", name: "", phone: "", email: "" };

export function AlunosClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadItems() {
    const supabase = createClient();
    const { data } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Student[]);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (editingId) await supabase.from("students").update(form).eq("id", editingId);
    else await supabase.from("students").insert(form);
    setForm(emptyForm);
    setEditingId(null);
    await loadItems();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("students").delete().eq("id", id);
    await loadItems();
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const rows = items.map(({ mentorship, name, phone, email }) => ({ mentorship, name, phone, email }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, "alunos.xlsx");
  }

  async function importXlsx(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
    const payload = rows.map((row) => ({
      mentorship: row.mentorship ?? row.mentoria ?? "",
      name: row.name ?? row.nome ?? "",
      phone: row.phone ?? row.telefone ?? "",
      email: row.email ?? ""
    }));

    const supabase = createClient();
    if (payload.length) await supabase.from("students").insert(payload);
    await loadItems();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader><CardTitle>{editingId ? "Editar aluno" : "Novo aluno"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Mentoria</Label><Input value={form.mentorship} onChange={(e) => setForm({ ...form, mentorship: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <Button>{editingId ? "Salvar alterações" : "Criar aluno"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportXlsx}><Download className="h-4 w-4" /> Exportar XLSX</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Importar XLSX</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importXlsx(file);
              event.target.value = "";
            }}
          />
        </div>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3">Mentoria</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">E-mail</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.mentorship}</td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.phone}</td>
                  <td className="p-3">{item.email}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => { setEditingId(item.id); setForm({ mentorship: item.mentorship, name: item.name, phone: item.phone, email: item.email }); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="danger" size="icon" onClick={() => remove(item.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
