import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  MessageCircle,
  Landmark,
  ExternalLink,
  Save,
  Smartphone,
} from "lucide-react";
import {
  getSettings,
  updateSettings,
  type SettingsResponse,
  type SettingKey,
} from "@/api/settings";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";

// Mismas reglas que el backend (features/settings/settings.registry.ts).
const whatsappSchema = z.object({
  whatsapp_number: z
    .string()
    .transform((v) => v.replace(/[\s+\-()]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^\d{8,15}$/,
          "Entre 8 y 15 dígitos, con código de país (ej. 593991234567)",
        ),
    ),
});

const bankSchema = z.object({
  bank_name: z.string().trim().min(2, "Escribe el nombre del banco").max(60),
  account_type: z.enum(["Ahorros", "Corriente"]),
  account_number: z
    .string()
    .trim()
    .regex(/^[\d-]{4,30}$/, "Solo dígitos y guiones (4 a 30)"),
  holder_name: z.string().trim().min(2, "Escribe el titular").max(100),
  holder_id: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{13})$/, "Cédula de 10 dígitos o RUC de 13"),
});

type WhatsappForm = z.input<typeof whatsappSchema>;
type BankForm = z.infer<typeof bankSchema>;

function LastChange({ data, k }: { data?: SettingsResponse; k: SettingKey }) {
  const m = data?.meta[k];
  if (!m) return <p className="text-xs text-ink-3">Aún no configurado</p>;
  return (
    <p className="text-xs text-ink-3">
      Último cambio:{" "}
      {new Date(m.updated_at).toLocaleString("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
      {m.updated_by ? ` · ${m.updated_by}` : ""}
    </p>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink mb-1">
        {label} <span className="text-danger-fg">*</span>
      </label>
      {children}
      {error ? (
        <p className="text-danger-fg text-xs mt-1" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const saveMut = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res, vars) => {
      qc.setQueryData(["settings"], res);
      toast.success(
        "whatsapp_number" in vars
          ? "Número de WhatsApp guardado. La app lo usa desde ahora."
          : "Cuenta bancaria guardada. La app la muestra desde ahora.",
      );
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "No se pudo guardar la configuración")),
  });

  const wa = useForm<WhatsappForm>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: { whatsapp_number: "" },
  });
  const bank = useForm<BankForm>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bank_name: "",
      account_type: "Ahorros",
      account_number: "",
      holder_name: "",
      holder_id: "",
    },
  });

  // Carga los valores guardados en los formularios.
  useEffect(() => {
    if (!data) return;
    wa.reset({ whatsapp_number: data.values.whatsapp_number ?? "" });
    if (data.values.bank_account) bank.reset(data.values.bank_account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const waNumber = (
    useWatch({ control: wa.control, name: "whatsapp_number" }) ?? ""
  ).replace(/\D/g, "");
  const preview = useWatch({ control: bank.control });

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Configuración</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          Parámetros del sistema que usa la app móvil. Los cambios se aplican
          sin publicar otra versión.
        </p>
      </div>

      {isError ? (
        <div className="bg-surface rounded-xl border border-line p-6 text-center">
          <p className="text-sm text-ink-2 mb-3">
            No se pudo cargar la configuración.
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <div role="status" className="space-y-4">
          <span className="sr-only">Cargando configuración…</span>
          <div className="skeleton h-48 rounded-xl" aria-hidden="true" />
          <div className="skeleton h-72 rounded-xl" aria-hidden="true" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── WhatsApp ── */}
          <section
            className="bg-surface rounded-xl shadow-sm border border-line p-5"
            aria-labelledby="set-wa"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-success-fg" />
                <div>
                  <h2 id="set-wa" className="font-semibold text-ink">
                    WhatsApp de atención
                  </h2>
                  <p className="text-xs text-ink-3">
                    Número al que llevan todos los botones de WhatsApp de la
                    app: pedidos de la tienda y comprobantes de pago de
                    reservas.
                  </p>
                </div>
              </div>
              <LastChange data={data} k="whatsapp_number" />
            </div>
            <form
              className="flex flex-wrap items-start gap-3"
              onSubmit={wa.handleSubmit((v) =>
                saveMut.mutate({
                  whatsapp_number: whatsappSchema.parse(v).whatsapp_number,
                }),
              )}
            >
              <div className="w-72">
                <Field
                  id="set-wa-number"
                  label="Número con código de país"
                  error={wa.formState.errors.whatsapp_number?.message}
                  hint="Ecuador: 593 + número sin el 0 inicial (ej. 593991234567)"
                >
                  <input
                    id="set-wa-number"
                    className="field"
                    inputMode="tel"
                    placeholder="593XXXXXXXXX"
                    aria-invalid={!!wa.formState.errors.whatsapp_number}
                    {...wa.register("whatsapp_number")}
                  />
                </Field>
              </div>
              <div className="flex gap-2 pt-6">
                <Button
                  type="submit"
                  loading={
                    saveMut.isPending &&
                    "whatsapp_number" in (saveMut.variables ?? {})
                  }
                >
                  <Save size={14} /> Guardar
                </Button>
                <a
                  href={
                    waNumber.length >= 8
                      ? `https://wa.me/${waNumber}`
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={waNumber.length < 8}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium border border-line ${
                    waNumber.length >= 8
                      ? "text-ink-2 hover:bg-surface-2"
                      : "text-ink-3 opacity-50 pointer-events-none"
                  }`}
                >
                  <ExternalLink size={14} /> Probar enlace
                </a>
              </div>
            </form>
          </section>

          {/* ── Cuenta bancaria ── */}
          <section
            className="bg-surface rounded-xl shadow-sm border border-line p-5"
            aria-labelledby="set-bank"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-info-fg" />
                <div>
                  <h2 id="set-bank" className="font-semibold text-ink">
                    Cuenta para transferencias
                  </h2>
                  <p className="text-xs text-ink-3">
                    Datos que la app muestra al cliente para pagar sus reservas.
                  </p>
                </div>
              </div>
              <LastChange data={data} k="bank_account" />
            </div>

            <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
              <form
                className="grid sm:grid-cols-2 gap-4 content-start"
                onSubmit={bank.handleSubmit((v) =>
                  saveMut.mutate({ bank_account: v }),
                )}
              >
                <Field
                  id="set-bank-name"
                  label="Banco"
                  error={bank.formState.errors.bank_name?.message}
                >
                  <input
                    id="set-bank-name"
                    className="field"
                    placeholder="Nombre del banco"
                    {...bank.register("bank_name")}
                  />
                </Field>
                <Field
                  id="set-bank-type"
                  label="Tipo de cuenta"
                  error={bank.formState.errors.account_type?.message}
                >
                  <select
                    id="set-bank-type"
                    className="field"
                    {...bank.register("account_type")}
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </Field>
                <Field
                  id="set-bank-number"
                  label="Número de cuenta"
                  error={bank.formState.errors.account_number?.message}
                >
                  <input
                    id="set-bank-number"
                    className="field"
                    inputMode="numeric"
                    placeholder="Solo dígitos"
                    {...bank.register("account_number")}
                  />
                </Field>
                <Field
                  id="set-bank-holder-id"
                  label="Cédula o RUC del titular"
                  error={bank.formState.errors.holder_id?.message}
                >
                  <input
                    id="set-bank-holder-id"
                    className="field"
                    inputMode="numeric"
                    placeholder="10 o 13 dígitos"
                    {...bank.register("holder_id")}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    id="set-bank-holder"
                    label="Titular de la cuenta"
                    error={bank.formState.errors.holder_name?.message}
                  >
                    <input
                      id="set-bank-holder"
                      className="field"
                      placeholder="Nombre o razón social"
                      {...bank.register("holder_name")}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    loading={
                      saveMut.isPending &&
                      "bank_account" in (saveMut.variables ?? {})
                    }
                  >
                    <Save size={14} /> Guardar cuenta
                  </Button>
                </div>
              </form>

              {/* Vista previa de lo que ve el cliente en la app */}
              <aside
                aria-label="Vista previa en la app"
                className="rounded-xl bg-surface-2 border border-line p-4 h-fit"
              >
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3 mb-3">
                  <Smartphone size={13} /> Así lo verá el cliente
                </p>
                <p className="font-semibold text-ink">
                  {preview.bank_name || "Banco"}
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {[
                    ["Titular", preview.holder_name],
                    [
                      "Tipo",
                      preview.account_type
                        ? `Cuenta de ${preview.account_type}`
                        : "",
                    ],
                    ["Número", preview.account_number],
                    ["C.I. / RUC", preview.holder_id],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-ink-3">{k}</dt>
                      <dd className="text-ink font-medium break-all">
                        {v || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
