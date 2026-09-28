import { apiClient } from "./client";

export type AccountType = "Ahorros" | "Corriente";

export interface BankAccount {
  bank_name: string;
  account_type: AccountType;
  account_number: string;
  holder_name: string;
  /** Cédula (10 dígitos) o RUC (13) del titular. */
  holder_id: string;
}

export interface SettingsValues {
  /** Con código de país, solo dígitos (ej. 593991234567). */
  whatsapp_number: string | null;
  bank_account: BankAccount | null;
}

export type SettingKey = keyof SettingsValues;

export interface SettingsResponse {
  values: SettingsValues;
  /** Último cambio de cada parámetro guardado. */
  meta: Partial<Record<SettingKey, { updated_at: string; updated_by: string | null }>>;
}

const BASE = "/settings";

export const getSettings = () =>
  apiClient.get<SettingsResponse>(BASE).then((r) => r.data);

/** Actualización parcial: solo se envían los parámetros que cambian; `null` los borra. */
export const updateSettings = (data: Partial<SettingsValues>) =>
  apiClient.put<SettingsResponse>(BASE, data).then((r) => r.data);
