import { apiClient } from "./client";

export type DashboardDays = 7 | 30 | 90;
export type ScheduleKind = "acompan" | "tourism" | "training" | "daycare";

/** Valor del periodo y del periodo anterior de igual duración. */
export interface Metric {
  current: number;
  previous: number;
}

export interface TimelinePoint {
  /** Inicio del tramo (día o lunes de la semana), "YYYY-MM-DD" en hora de Ecuador. */
  date: string;
  requests: Record<ScheduleKind, number>;
  serviceRevenue: number;
  storeRevenue: number;
}

export interface ServicePerformance {
  kind: ScheduleKind;
  requests: number;
  /** Pagadas: confirmadas, completadas o canceladas después de pagar. */
  paid: number;
  cancelled: number;
  forgotten: number;
  /** % pagadas sobre las decididas; null sin datos. */
  confirmationRate: number | null;
  revenue: number;
  rating: number | null;
  ratingCount: number;
}

export interface DashboardData {
  range: { days: number; from: string; to: string; bucket: "day" | "week" };
  kpis: {
    requests: Metric;
    confirmationRate: { current: number | null; previous: number | null };
    cancellations: Metric;
    serviceRevenue: Metric;
    storeRevenue: Metric;
    storeOrders: Metric;
    newUsers: Metric;
    rating: { current: number | null; previous: number | null; count: number };
  };
  timeline: TimelinePoint[];
  byService: ServicePerformance[];
  /** Índice 0 = 1 estrella … 4 = 5 estrellas. */
  ratingDistribution: number[];
  attention: {
    pendingPayments: Record<ScheduleKind, number>;
    refundsPending: number;
    ordersToDeliver: number;
    acompanWithoutVehicle: number;
  };
  lowStock: { id: string; name: string; stock: number }[];
  /** `revenue` es el monto de lista (antes de cupones). */
  topProducts: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  recentReviews: {
    id: string;
    grade: number;
    comment: string;
    createdAt: string;
    serviceName: string | null;
    serviceType: string | null;
  }[];
}

export const getDashboard = (days: DashboardDays) =>
  apiClient
    .get<DashboardData>("/dashboard", { params: { days } })
    .then((r) => r.data);
