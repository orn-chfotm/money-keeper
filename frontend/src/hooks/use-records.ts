import { useCallback, useEffect, useState } from "react";
import { listRecords, type RecordDto } from "@/lib/records-api";

type Result = {
  key: string;
  from: string;
  to: string;
  records: RecordDto[];
  error: string | null;
};

export function useRecords(from: string, to: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${from}|${to}|${version}`;

  useEffect(() => {
    // Responses for an outdated range or reload are discarded.
    let cancelled = false;
    listRecords(from, to)
      .then((records) => {
        if (!cancelled) setResult({ key, from, to, records, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setResult({ key, from, to, records: [], error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [key, from, to]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // While reloading the same range, keep showing the previous records.
  const sameRange = result !== null && result.from === from && result.to === to;
  return {
    records: sameRange ? result.records : [],
    error: sameRange ? result.error : null,
    isLoading: result?.key !== key,
    reload,
  };
}
