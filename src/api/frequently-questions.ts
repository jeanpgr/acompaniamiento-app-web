import { apiClient } from "./client";

export interface FrequentlyQuestion {
  id: string;
  question: string;
  response: string | Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFrequentlyQuestionInput {
  question: string;
  response: string;
}

const BASE = "/frequently-questions";

export const getFrequentlyQuestions = () =>
  apiClient
    .get<{ data: FrequentlyQuestion[] }>(BASE)
    .then((r) => r.data.data ?? r.data);

export const getFrequentlyQuestion = (id: string) =>
  apiClient
    .get<{ data: FrequentlyQuestion }>(`${BASE}/${id}`)
    .then((r) => r.data.data ?? r.data);

export const createFrequentlyQuestion = (data: CreateFrequentlyQuestionInput) =>
  apiClient
    .post<{ data: FrequentlyQuestion }>(BASE, data)
    .then((r) => r.data.data ?? r.data);

export const updateFrequentlyQuestion = (
  id: string,
  data: Partial<CreateFrequentlyQuestionInput>,
) =>
  apiClient
    .put<{ data: FrequentlyQuestion }>(`${BASE}/${id}`, data)
    .then((r) => r.data.data ?? r.data);

export const deleteFrequentlyQuestion = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
