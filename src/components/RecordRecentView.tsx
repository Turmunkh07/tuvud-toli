"use client";

import { useEffect } from "react";
import { pushRecent } from "@/lib/recent";

/** Renders nothing; its only job is to note the visit in the reader's browser. */
export function RecordRecentView({
  id,
  termTibetan,
}: {
  id: number;
  termTibetan: string;
}) {
  useEffect(() => {
    pushRecent({ id, termTibetan });
  }, [id, termTibetan]);

  return null;
}
