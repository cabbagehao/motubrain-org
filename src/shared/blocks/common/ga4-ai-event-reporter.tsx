'use client';

import { useEffect } from 'react';

import {
  markGaSessionEvent,
  trackAiCreditsExhausted,
  trackAiGenerationFailed,
  trackAiGenerationStarted,
  trackAiGenerationSucceeded,
  trackException,
} from '@/shared/lib/ga4';

declare global {
  interface Window {
    __ga4AiEventReporterInstalled?: boolean;
  }
}

type GenerateRequestBody = {
  mediaType?: string;
  scene?: string;
  provider?: string;
  model?: string;
  options?: unknown;
};

type StoredAiTaskEvent = {
  startedAt: number;
  generationType?: string;
  mode?: string;
  provider?: string;
  model?: string;
  creditsCost?: number;
};

const AI_TASK_STORAGE_PREFIX = 'ga4:ai_task:';
const TERMINAL_SUCCESS = 'success';
const TERMINAL_FAILURES = new Set(['failed', 'canceled']);

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function isApiPath(url: string, pathname: string) {
  try {
    return new URL(url, window.location.origin).pathname === pathname;
  } catch {
    return false;
  }
}

function readJsonBody(init?: RequestInit) {
  if (typeof init?.body !== 'string') {
    return null;
  }

  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function resolveCreditsCost(body: GenerateRequestBody) {
  if (body.mediaType === 'image') {
    return body.scene === 'image-to-image' ? 6 : 4;
  }

  if (body.mediaType === 'video') {
    if (body.scene === 'image-to-video') return 8;
    if (body.scene === 'video-to-video') return 10;
    return 6;
  }

  if (body.mediaType === 'music') {
    return 10;
  }

  return undefined;
}

function hasReferenceAsset(options: unknown): boolean | undefined {
  if (!options || typeof options !== 'object') {
    return undefined;
  }

  const values = Object.values(options as Record<string, unknown>);
  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => typeof item === 'string' && item.length > 0);
    }

    return typeof value === 'string' && /^https?:\/\//.test(value);
  });
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function countOutputs(data: any) {
  const taskInfo = parseMaybeJson(data?.taskInfo);
  const taskResult = parseMaybeJson(data?.taskResult);
  const candidates = [taskInfo, taskResult];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['images', 'videos', 'songs']) {
      const value = (candidate as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value.length;
      }
    }
  }

  return undefined;
}

function getStoredTask(taskId?: string | null) {
  if (!taskId) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      `${AI_TASK_STORAGE_PREFIX}${taskId}`
    );
    return raw ? (JSON.parse(raw) as StoredAiTaskEvent) : null;
  } catch {
    return null;
  }
}

function storeTask(taskId: string, event: StoredAiTaskEvent) {
  try {
    window.sessionStorage.setItem(
      `${AI_TASK_STORAGE_PREFIX}${taskId}`,
      JSON.stringify(event)
    );
  } catch {}
}

function normalizeErrorCode(message?: string) {
  if (!message) {
    return 'unknown';
  }

  const normalized = message.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return normalized.replace(/^_+|_+$/g, '') || 'unknown';
}

function handleGenerateResponse(body: GenerateRequestBody, payload: any) {
  const creditsCost = resolveCreditsCost(body);
  const base = {
    generationType: body.mediaType,
    mode: body.scene,
    provider: body.provider,
    model: body.model,
    creditsCost,
  };

  if (payload?.code !== 0) {
    const errorCode = normalizeErrorCode(payload?.message);

    if (errorCode === 'insufficient_credits') {
      const errorData = payload?.data || {};
      trackAiCreditsExhausted({
        ...base,
        requiredCredits: errorData.requiredCredits || creditsCost,
        remainingCredits: errorData.remainingCredits,
      });
      return;
    }

    trackAiGenerationFailed({
      ...base,
      errorCode,
      stage: 'submit',
    });
    return;
  }

  const data = payload?.data;
  const taskId = data?.id;
  if (!taskId) {
    return;
  }

  const taskEvent = {
    ...base,
    startedAt: Date.now(),
  };
  storeTask(taskId, taskEvent);

  if (markGaSessionEvent(`ga4:ai_generation_started:${taskId}`)) {
    trackAiGenerationStarted({
      ...base,
      taskId,
      hasReferenceAsset: hasReferenceAsset(body.options),
    });
  }

  if (data?.status === TERMINAL_SUCCESS) {
    reportTerminalTask(taskId, data, taskEvent);
  } else if (TERMINAL_FAILURES.has(data?.status)) {
    reportFailedTask(taskId, data, taskEvent);
  }
}

function reportTerminalTask(
  taskId: string,
  data: any,
  stored: StoredAiTaskEvent | null
) {
  if (!markGaSessionEvent(`ga4:ai_generation_succeeded:${taskId}`)) {
    return;
  }

  trackAiGenerationSucceeded({
    generationType: data?.mediaType || stored?.generationType,
    mode: data?.scene || stored?.mode,
    provider: data?.provider || stored?.provider,
    model: data?.model || stored?.model,
    taskId,
    creditsCost: data?.costCredits || stored?.creditsCost,
    durationMs: stored?.startedAt ? Date.now() - stored.startedAt : undefined,
    outputCount: countOutputs(data),
  });
}

function reportFailedTask(
  taskId: string,
  data: any,
  stored: StoredAiTaskEvent | null
) {
  if (!markGaSessionEvent(`ga4:ai_generation_failed:${taskId}`)) {
    return;
  }

  const taskInfo = parseMaybeJson(data?.taskInfo) as Record<
    string,
    unknown
  > | null;
  const errorMessage =
    typeof taskInfo?.errorMessage === 'string' ? taskInfo.errorMessage : '';
  const errorCode =
    typeof taskInfo?.errorCode === 'string'
      ? taskInfo.errorCode
      : normalizeErrorCode(errorMessage || data?.status);

  trackAiGenerationFailed({
    generationType: data?.mediaType || stored?.generationType,
    mode: data?.scene || stored?.mode,
    provider: data?.provider || stored?.provider,
    model: data?.model || stored?.model,
    taskId,
    creditsCost: data?.costCredits || stored?.creditsCost,
    errorCode,
    stage: 'result',
  });
}

function handleQueryResponse(requestBody: any, payload: any) {
  if (payload?.code !== 0) {
    return;
  }

  const data = payload?.data;
  const taskId = data?.id || requestBody?.taskId;
  if (!taskId) {
    return;
  }

  const stored = getStoredTask(taskId);
  if (data?.status === TERMINAL_SUCCESS) {
    reportTerminalTask(taskId, data, stored);
  } else if (TERMINAL_FAILURES.has(data?.status)) {
    reportFailedTask(taskId, data, stored);
  }
}

export function Ga4AiEventReporter() {
  useEffect(() => {
    if (window.__ga4AiEventReporterInstalled) {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    const wrappedFetch: typeof window.fetch = async (input, init) => {
      const url = resolveUrl(input);
      const isGenerate = isApiPath(url, '/api/ai/generate');
      const isQuery = isApiPath(url, '/api/ai/query');
      const requestBody = isGenerate || isQuery ? readJsonBody(init) : null;

      try {
        const response = await originalFetch(input, init);

        if ((isGenerate || isQuery) && requestBody) {
          void response
            .clone()
            .json()
            .then((payload) => {
              if (isGenerate) {
                handleGenerateResponse(requestBody, payload);
              } else {
                handleQueryResponse(requestBody, payload);
              }
            })
            .catch(() => {});
        }

        return response;
      } catch (error: any) {
        if (isGenerate && requestBody) {
          const body = requestBody as GenerateRequestBody;
          trackAiGenerationFailed({
            generationType: body.mediaType,
            mode: body.scene,
            provider: body.provider,
            model: body.model,
            creditsCost: resolveCreditsCost(body),
            errorCode: normalizeErrorCode(error?.message),
            stage: 'network',
          });
        }

        throw error;
      }
    };

    window.fetch = wrappedFetch;
    window.__ga4AiEventReporterInstalled = true;

    return () => {
      if (window.fetch === wrappedFetch) {
        window.fetch = originalFetch;
        window.__ga4AiEventReporterInstalled = false;
      }
    };
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      trackException({
        description: event.message || 'window error',
        context: 'window_error',
        fatal: false,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      trackException({
        description:
          reason?.message ||
          (typeof reason === 'string' ? reason : 'unhandled rejection'),
        context: 'unhandled_rejection',
        fatal: false,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
