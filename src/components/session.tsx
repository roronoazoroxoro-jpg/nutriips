"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";

export type User = {
  id: string;
  name: string;
  email: string;
  license: string | null;
  phone: string | null;
  clinicName: string | null;
  address: string | null;
  mustChangePassword: boolean;
};

type Session = { user: User | null; setUser: (user: User) => void };

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => undefined);
  }, []);
  return <SessionContext.Provider value={{ user, setUser }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession fuera de SessionProvider");
  return context;
}
