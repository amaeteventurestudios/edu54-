import { useQuery } from "@tanstack/react-query";
import { get, type AssignedItem, type Badge, type Course, type Level, type LessonRef } from "./api";

export const useProgress = () => useQuery({ queryKey: ["progress"], queryFn: () => get<{
  level: Level; streak: number; badges: Badge[];
  courses: { id: string; title: string; percent: number; lessons_done: number; lessons_total: number; status: string }[];
  projects: { id: number; title: string; status: string; updated_at: string }[];
  practice?: { node_id: string; title: string; mastered: boolean; correct: number; attempts: number; updated_at: string }[];
  ai_build?: { done: number; total: number; name: string; tracks: { n: number; slug: string; title: string; group: string; size: number; live: number; done: number; certified: boolean; completed_on: string | null }[] };
}>("/api/progress/me") });

export const useCourses = () => useQuery({ queryKey: ["courses"], queryFn: () => get<{ courses: Course[] }>("/api/courses") });

export const useContinue = () => useQuery({ queryKey: ["continue"], queryFn: () => get<{
  lesson: (LessonRef & { course_id: string; course: string; percent: number }) | null; assigned: AssignedItem[];
}>("/api/learn/continue") });

export const useStatus = () => useQuery({ queryKey: ["status"], queryFn: () => get<{ items: { id: string; label: string; state: string; text: string }[]; internet_connected: boolean | null }>("/api/system/status"), refetchInterval: 20000 });
