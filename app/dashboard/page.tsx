import { BookOpen, Bot, MessageSquareText, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";

const cards = [
  { title: "Formatador", text: "Gerar mensagens de aulas e reuniões.", icon: MessageSquareText },
  { title: "Aulas", text: "Consultar e copiar aulas solicitadas.", icon: BookOpen },
  { title: "GPTs", text: "Organizar links úteis por categoria.", icon: Bot },
  { title: "Alunos", text: "Base operacional de mentorias.", icon: Users }
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Acesso rápido às rotinas do CS.</p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardContent className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{card.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{card.text}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </DashboardShell>
  );
}
