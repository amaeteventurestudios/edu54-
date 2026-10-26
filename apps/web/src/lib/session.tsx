import { createContext, useContext } from "react";
import type { User } from "./api";

export const UserContext = createContext<User | null>(null);
export const useUser = () => {
  const u = useContext(UserContext);
  if (!u) throw new Error("No signed-in user");
  return u;
};

/** Where each role lands after sign-in and when a route doesn't exist. */
export const homePath = (u: User) =>
  u.role === "student" ? "/" : u.permissions.includes("teaching") && u.role === "teacher" ? "/teacher" : u.permissions.includes("admin.access") ? "/admin" : u.role === "counselor" ? "/safety" : "/teacher";
export const can = (u: User, perm: string) => u.permissions.includes(perm);
export const isAdminish = (u: User) => u.permissions.includes("admin.access");
