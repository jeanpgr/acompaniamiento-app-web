import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

/**
 * Vuelve a pedir al servidor los datos que la pantalla tiene abiertos (solo
 * las consultas activas: no toca las de páginas que no se están viendo).
 * Solo icono; gira mientras llegan los datos nuevos.
 */
export default function RefreshButton({
  className = "",
}: {
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      aria-label="Actualizar datos"
      title="Actualizar datos"
      aria-busy={refreshing || undefined}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-line-strong bg-surface text-primary transition-colors hover:bg-primary-soft disabled:cursor-wait outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
    >
      <RefreshCw
        size={16}
        aria-hidden="true"
        className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
      />
    </button>
  );
}
