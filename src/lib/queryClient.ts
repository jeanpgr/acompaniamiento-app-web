import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/api/client";
import { invalidateResource, type Resource } from "./invalidate";

/**
 * Lo que cada mutación declara en `meta` para que la caché global haga el
 * trabajo repetido: refrescar las vistas afectadas y avisar con un toast.
 * https://tanstack.com/query/latest/docs/framework/react/typescript#registering-global-meta
 */
export interface AppMutationMeta extends Record<string, unknown> {
  /** Recursos a refrescar cuando la mutación sale bien (ver lib/invalidate). */
  invalidates?: Resource | readonly Resource[];
  /** Toast de éxito. */
  successMessage?: string;
  /**
   * Texto del toast de error si el servidor no envía mensaje. Sin él no se
   * muestra toast (la pantalla maneja el error por su cuenta).
   */
  errorMessage?: string;
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: AppMutationMeta;
  }
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
  // Callbacks globales: corren para toda mutación, antes de los callbacks
  // propios de cada useMutation (p. ej. cerrar el modal).
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _result, mutation) => {
      const { invalidates, successMessage } = mutation.meta ?? {};
      if (successMessage) toast.success(successMessage);
      if (!invalidates) return;
      // Se devuelve la promesa: la mutación sigue "pendiente" hasta que las
      // vistas tienen los datos nuevos (sin parpadeo de datos viejos).
      const resources = ([] as Resource[]).concat(invalidates);
      return Promise.all(resources.map((r) => invalidateResource(queryClient, r)));
    },
    onError: (error, _variables, _result, mutation) => {
      const fallback = mutation.meta?.errorMessage;
      if (fallback) toast.error(getErrorMessage(error, fallback));
    },
  }),
});
