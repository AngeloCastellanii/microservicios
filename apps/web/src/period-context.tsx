import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Period } from "./api";

const STORAGE_KEY = "studyy.periodId";

type PeriodContextValue = {
  periods: Period[];
  current: Period | null;
  loading: boolean;
  error: string;
  setCurrentId: (id: string) => void;
  refresh: () => Promise<void>;
  createPeriod: (input: {
    name: string;
    kind: "TRIMESTER" | "SEMESTER";
    year: number;
  }) => Promise<void>;
  removePeriod: (id: string) => Promise<void>;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentId, setCurrentIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const list = await api.listPeriods();
    setPeriods(list);
    const stored = localStorage.getItem(STORAGE_KEY);
    const preferred =
      list.find((p) => p.id === stored) ||
      list.find((p) => p.isActive) ||
      list[0] ||
      null;
    if (preferred) {
      setCurrentIdState(preferred.id);
      localStorage.setItem(STORAGE_KEY, preferred.id);
    } else {
      setCurrentIdState("");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  const setCurrentId = (id: string) => {
    setCurrentIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const createPeriod = async (input: {
    name: string;
    kind: "TRIMESTER" | "SEMESTER";
    year: number;
  }) => {
    const created = await api.createPeriod({ ...input, setActive: true });
    await api.activatePeriod(created.id).catch(() => undefined);
    await refresh();
    setCurrentId(created.id);
  };

  const removePeriod = async (id: string) => {
    await api.deletePeriod(id);
    await refresh();
  };

  const current = useMemo(
    () => periods.find((p) => p.id === currentId) || null,
    [periods, currentId],
  );

  const value: PeriodContextValue = {
    periods,
    current,
    loading,
    error,
    setCurrentId,
    refresh,
    createPeriod,
    removePeriod,
  };

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}
