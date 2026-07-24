"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  customerOrderPollDelay,
  shouldPollCustomerOrder
} from "@/lib/customer-orders/polling";

type CustomerOrderReadModel = {
  revision: string;
  terminal: boolean;
};

type PollingError = {
  code: string;
  message: string;
  status: number;
};

export function useCustomerOrderPolling<T extends CustomerOrderReadModel>({
  enabled,
  load
}: {
  enabled: boolean;
  load: (signal: AbortSignal) => Promise<T>;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<PollingError | null>(null);
  const [staleWarning, setStaleWarning] = useState("");
  const dataRef = useRef<T | null>(null);
  const failuresRef = useRef(0);
  const runRef = useRef<((mode: "initial" | "poll" | "manual" | "resume") => Promise<void>) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let disposed = false;
    let timer: number | null = null;
    let controller: AbortController | null = null;
    let inFlight = false;

    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };

    const schedule = () => {
      clearTimer();
      const current = dataRef.current;
      if (!current || !shouldPollCustomerOrder({
        terminal: current.terminal,
        visible: document.visibilityState === "visible",
        online: navigator.onLine
      })) return;
      timer = window.setTimeout(
        () => void run("poll"),
        customerOrderPollDelay(failuresRef.current)
      );
    };

    const canResume = () => {
      const current = dataRef.current;
      return document.visibilityState === "visible"
        && navigator.onLine
        && !current?.terminal;
    };

    const run = async (mode: "initial" | "poll" | "manual" | "resume") => {
      if (disposed || inFlight) return;
      inFlight = true;
      clearTimer();
      controller = new AbortController();
      const hasData = Boolean(dataRef.current);
      if (!hasData) {
        setLoading(true);
        setError(null);
      }
      else if (mode !== "poll") setRefreshing(true);

      try {
        const next = await load(controller.signal);
        if (disposed) return;
        dataRef.current = next;
        setData(next);
        setError(null);
        setStaleWarning("");
        failuresRef.current = 0;
      } catch (reason) {
        if (disposed || controller.signal.aborted) return;
        const nextError = normalizePollingError(reason);
        if (dataRef.current) {
          failuresRef.current += 1;
          setStaleWarning(
            "Status terbaru belum dapat diambil. Informasi yang tampil adalah snapshot terakhir dan mungkin sudah berubah."
          );
        } else {
          setError(nextError);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
          setRefreshing(false);
          inFlight = false;
          schedule();
        }
      }
    };

    runRef.current = run;

    const resumeWhenEligible = () => {
      if (canResume()) void run("resume");
      else {
        clearTimer();
        controller?.abort();
      }
    };
    const handleOffline = () => {
      clearTimer();
      controller?.abort();
      if (dataRef.current) {
        setStaleWarning(
          "Koneksi terputus. Informasi yang tampil adalah snapshot terakhir dan akan diperbarui setelah tersambung."
        );
      } else {
        setLoading(false);
        setError({
          code: "CUSTOMER_ORDER_UNAVAILABLE",
          message: "Tidak ada koneksi. Sambungkan perangkat lalu coba lagi.",
          status: 503
        });
      }
    };

    document.addEventListener("visibilitychange", resumeWhenEligible);
    window.addEventListener("focus", resumeWhenEligible);
    window.addEventListener("online", resumeWhenEligible);
    window.addEventListener("offline", handleOffline);
    if (canResume()) void run("initial");
    else if (!navigator.onLine) handleOffline();

    return () => {
      disposed = true;
      clearTimer();
      controller?.abort();
      runRef.current = null;
      document.removeEventListener("visibilitychange", resumeWhenEligible);
      window.removeEventListener("focus", resumeWhenEligible);
      window.removeEventListener("online", resumeWhenEligible);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    await runRef.current?.("manual");
  }, []);

  return {
    data,
    loading,
    refreshing,
    error,
    staleWarning,
    refresh
  };
}

function normalizePollingError(value: unknown): PollingError {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = Object.fromEntries(Object.entries(value));
    return {
      code: typeof record.code === "string" ? record.code : "CUSTOMER_ORDER_UNAVAILABLE",
      message: typeof record.message === "string" ? record.message : "Status pesanan belum dapat dimuat.",
      status: typeof record.status === "number" ? record.status : 500
    };
  }
  return {
    code: "CUSTOMER_ORDER_UNAVAILABLE",
    message: "Status pesanan belum dapat dimuat.",
    status: 500
  };
}
