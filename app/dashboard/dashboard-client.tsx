"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  PieChart,
  Users
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MENTORSHIP_OPTIONS } from "@/lib/options";
import { listCourseLessons, type CourseLesson } from "@/lib/course-lessons-store";

type Student = {
  id: string;
  mentorship: string | null;
  name: string;
  cs_responsible: string | null;
  meetings_count: number | null;
};

type StudentsResult = {
  data: Student[];
};

const chartColors = [
  "#0f172a",
  "#2563eb",
  "#10b981"
];

function percent(value: number, total: number) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

function countByMentorship<T extends { mentorship?: string | null }>(
  items: T[]
) {
  return MENTORSHIP_OPTIONS.map((mentorship) => ({
    mentorship,
    count: items.filter(
      (item) => item.mentorship === mentorship
    ).length
  }));
}

function buildPieGradient(
  rows: { count: number }[],
  total: number
) {
  if (!total) return "#e2e8f0";

  let current = 0;

  return rows
    .map((row, index) => {
      const start = current;
      const size = (row.count / total) * 100;
      const end = start + size;
      current = end;

      return `${chartColors[index]} ${start}% ${end}%`;
    })
    .join(", ");
}

export function DashboardClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const [studentsResponse, lessonsResult] =
        await Promise.all([
          fetch("/api/students")
            .then((response) =>
              response.ok
                ? response.json()
                : { data: [] }
            )
            .catch(() => ({ data: [] })),
          listCourseLessons()
        ]);

      setStudents(
        (studentsResponse as StudentsResult).data ?? []
      );
      setLessons(lessonsResult.data);
      setLoading(false);
    }

    void loadDashboard();
  }, []);

  const totalStudents = students.length;
  const studentsByMentorship = useMemo(
    () => countByMentorship(students),
    [students]
  );
  const lessonsByMentorship = useMemo(
    () => countByMentorship(lessons),
    [lessons]
  );
  const topStudents = useMemo(
    () =>
      [...students]
        .sort(
          (a, b) =>
            Number(b.meetings_count ?? 0) -
            Number(a.meetings_count ?? 0)
        )
        .slice(0, 10),
    [students]
  );
  const meetingsByCs = useMemo(() => {
    const totals = new Map<string, number>();

    students.forEach((student) => {
      const cs = student.cs_responsible || "Sem CS";
      totals.set(
        cs,
        (totals.get(cs) ?? 0) +
          Number(student.meetings_count ?? 0)
      );
    });

    return Array.from(totals.entries())
      .map(([cs, count]) => ({ cs, count }))
      .sort((a, b) => b.count - a.count);
  }, [students]);
  const pieGradient = buildPieGradient(
    studentsByMentorship,
    totalStudents
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total de alunos</p>
              <p className="mt-2 text-3xl font-semibold">{totalStudents}</p>
            </div>
            <Users className="h-8 w-8 text-slate-700" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Aulas registradas</p>
              <p className="mt-2 text-3xl font-semibold">{lessons.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-slate-700" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Reuniões feitas</p>
              <p className="mt-2 text-3xl font-semibold">
                {students.reduce(
                  (sum, student) =>
                    sum + Number(student.meetings_count ?? 0),
                  0
                )}
              </p>
            </div>
            <CalendarCheck className="h-8 w-8 text-slate-700" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">CS com reuniões</p>
              <p className="mt-2 text-3xl font-semibold">{meetingsByCs.length}</p>
            </div>
            <PieChart className="h-8 w-8 text-slate-700" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Alunos por mentoria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {studentsByMentorship.map((row, index) => (
              <div key={row.mentorship} className="rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: chartColors[index] }}
                  />
                  <p className="text-sm font-medium">{row.mentorship}</p>
                </div>
                <p className="mt-3 text-2xl font-semibold">{row.count}</p>
                <p className="text-sm text-slate-500">
                  {percent(row.count, totalStudents)}% do total
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participação das mentorias</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className="h-48 w-48 rounded-full"
              style={{
                background: `conic-gradient(${pieGradient})`
              }}
            />
            <div className="w-full space-y-2">
              {studentsByMentorship.map((row, index) => (
                <div key={row.mentorship} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: chartColors[index] }}
                    />
                    {row.mentorship}
                  </span>
                  <strong>{percent(row.count, totalStudents)}%</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 alunos por reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.id} className="grid grid-cols-[32px_1fr_80px] items-center gap-3 rounded-md border p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.mentorship || "-"}</p>
                  </div>
                  <p className="text-right font-semibold">{student.meetings_count ?? 0}</p>
                </div>
              ))}
              {!loading && topStudents.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum aluno cadastrado.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reuniões feitas por CS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meetingsByCs.map((row) => (
                <div key={row.cs} className="flex items-center justify-between rounded-md border p-3">
                  <span className="font-medium">{row.cs}</span>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                    {row.count}
                  </span>
                </div>
              ))}
              {!loading && meetingsByCs.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma reunião registrada.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Aulas registradas por mentoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {lessonsByMentorship.map((row) => (
            <div key={row.mentorship} className="rounded-md border p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-medium">{row.mentorship}</p>
              </div>
              <p className="mt-3 text-2xl font-semibold">{row.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
