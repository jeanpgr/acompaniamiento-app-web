import { useQueries } from "@tanstack/react-query";
import {
  getSchedulesAcompan,
  getSchedulesTourism,
  getSchedulesTraining,
  getSchedulesDaycare,
} from "@/api/schedules";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import { combineSchedules } from "./schedules";

/**
 * Los 4 tipos de agendamiento en paralelo, unidos en una sola lista ordenada
 * por fecha. Distribución y su página de servicios comparten la caché.
 * Las reservas nuevas llegan desde la app sin que el panel haga nada.
 */
export function useDistributionSchedules() {
  return useQueries({
    queries: [
      {
        queryKey: ["schedules-acompan"],
        queryFn: getSchedulesAcompan,
        refetchInterval: LIVE_REFETCH_MS,
      },
      {
        queryKey: ["schedules-tourism"],
        queryFn: getSchedulesTourism,
        refetchInterval: LIVE_REFETCH_MS,
      },
      {
        queryKey: ["schedules-training"],
        queryFn: getSchedulesTraining,
        refetchInterval: LIVE_REFETCH_MS,
      },
      {
        queryKey: ["schedules-daycare"],
        queryFn: getSchedulesDaycare,
        refetchInterval: LIVE_REFETCH_MS,
      },
    ],
    combine: combineSchedules,
  });
}
