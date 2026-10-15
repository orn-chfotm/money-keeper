"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type HealthState = "checking" | "ok" | "db-error" | "unreachable";

const LABELS: Record<HealthState, string> = {
  checking: "확인 중",
  ok: "정상",
  "db-error": "DB 오류",
  unreachable: "연결 실패",
};

export function HealthStatus() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/health/ready")
      .then((res) => {
        if (!cancelled) setState(res.ok ? "ok" : "db-error");
      })
      .catch(() => {
        if (!cancelled) setState("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <p>서버 상태: {LABELS[state]}</p>;
}
