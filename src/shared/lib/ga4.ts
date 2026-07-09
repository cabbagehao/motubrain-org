'use client';

import type { PricingItem } from '@/shared/types/blocks/pricing';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GaEventParams = Record<string, unknown>;

type TrackExceptionParams = {
  description: string;
  fatal?: boolean;
  context?: string;
  errorCode?: string;
};

type SelectContentParams = {
  contentId: string;
  contentType?: string;
  section?: string;
  entryPoint?: string;
  destination?: string;
};

type MotubrainProofEventParams = {
  pageType?: string;
  sourcePage?: string;
  section?: string;
  entryPoint?: string;
  resourceId?: string;
  destinationType?: string;
  destinationHost?: string;
  linkText?: string;
};

type McpConfigEventParams = {
  action: 'load_example' | 'validate_json' | 'copy_example';
  status?: 'valid' | 'warning' | 'invalid';
  issueCount?: number;
  section?: string;
};

type DocumentToolEventParams = {
  action:
    | 'load_example'
    | 'text_loaded'
    | 'convert_text'
    | 'copy_markdown'
    | 'download_markdown';
  inputChars?: number;
  outputChars?: number;
  section?: string;
};

type PricingItemListParams = {
  item: PricingItem;
  itemListName?: string;
  section?: string;
};

type AiGenerationBaseParams = {
  generationType?: string;
  model?: string;
  mode?: string;
  provider?: string;
  taskId?: string;
  creditsCost?: number;
};

type AiGenerationStartedParams = AiGenerationBaseParams & {
  templateId?: string;
  hasReferenceAsset?: boolean;
};

type AiGenerationSucceededParams = AiGenerationBaseParams & {
  durationMs?: number;
  outputCount?: number;
};

type AiGenerationFailedParams = AiGenerationBaseParams & {
  errorCode?: string;
  stage?: string;
};

type AiCreditsExhaustedParams = AiGenerationBaseParams & {
  requiredCredits?: number;
  remainingCredits?: number;
};

function normalizeText(value?: string | null) {
  return value?.trim() || undefined;
}

function getReadyGtag() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.gtag === 'function' ? window.gtag : null;
}

export function convertMinorUnitsToValue(amount?: number | null) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return undefined;
  }

  return amount / 100;
}

export function trackGaEvent(
  eventName: string,
  params: GaEventParams = {},
  options: { retryCount?: number; retryDelayMs?: number } = {}
) {
  if (typeof window === 'undefined') {
    return;
  }

  const { retryCount = 8, retryDelayMs = 250 } = options;
  let attempts = 0;

  const emit = () => {
    const gtag = getReadyGtag();
    if (gtag) {
      gtag('event', eventName, params);
      return;
    }

    attempts += 1;
    if (attempts > retryCount) {
      return;
    }

    window.setTimeout(emit, retryDelayMs);
  };

  emit();
}

export function trackException({
  description,
  fatal = false,
  context,
  errorCode,
}: TrackExceptionParams) {
  trackGaEvent('exception', {
    description: normalizeText(description),
    fatal,
    context: normalizeText(context),
    error_code: normalizeText(errorCode),
  });
}

export function buildPricingItems(item: PricingItem) {
  return [
    {
      item_id: item.product_id,
      item_name:
        item.product_name || item.title || item.plan_name || item.product_id,
      item_category: item.interval || 'one-time',
      item_variant: item.currency?.toUpperCase(),
      price: convertMinorUnitsToValue(item.amount),
      quantity: 1,
    },
  ];
}

export function trackSelectContent({
  contentId,
  contentType = 'cta_button',
  section,
  entryPoint,
  destination,
}: SelectContentParams) {
  trackGaEvent('select_content', {
    content_type: contentType,
    content_id: contentId,
    section: normalizeText(section),
    entry_point: normalizeText(entryPoint),
    destination: normalizeText(destination),
  });
}

function buildMotubrainProofParams({
  pageType,
  sourcePage,
  section,
  entryPoint,
  resourceId,
  destinationType,
  destinationHost,
  linkText,
}: MotubrainProofEventParams) {
  return {
    page_type: normalizeText(pageType),
    source_page: normalizeText(sourcePage),
    section: normalizeText(section),
    entry_point: normalizeText(entryPoint),
    resource_id: normalizeText(resourceId),
    destination_type: normalizeText(destinationType),
    destination_host: normalizeText(destinationHost),
    link_text: normalizeText(linkText),
  };
}

export function trackSourceLinkClick(params: MotubrainProofEventParams) {
  trackGaEvent('source_link_click', buildMotubrainProofParams(params));
}

export function trackBenchmarkView(params: MotubrainProofEventParams) {
  trackGaEvent('benchmark_view', buildMotubrainProofParams(params));
}

export function trackBenchmarkTableView(params: MotubrainProofEventParams) {
  trackGaEvent('benchmark_table_view', buildMotubrainProofParams(params));
}

export function trackAccessStatusClick(params: MotubrainProofEventParams) {
  trackGaEvent('access_status_click', buildMotubrainProofParams(params));
}

export function trackResourceOutboundClick(params: MotubrainProofEventParams) {
  trackGaEvent('resource_outbound_click', buildMotubrainProofParams(params));
}

export function trackMcpConfigEvent({
  action,
  status,
  issueCount,
  section,
}: McpConfigEventParams) {
  trackGaEvent('mcp_config_tool_action', {
    action: normalizeText(action),
    status: normalizeText(status),
    issue_count: issueCount,
    section: normalizeText(section),
  });
}

export function trackDocumentToolEvent({
  action,
  inputChars,
  outputChars,
  section,
}: DocumentToolEventParams) {
  const eventName =
    action === 'download_markdown'
      ? 'document_tool_download'
      : action === 'load_example' || action === 'text_loaded'
        ? 'file_loaded'
        : 'document_tool_success';

  trackGaEvent(eventName, {
    action: normalizeText(action),
    input_chars: inputChars,
    output_chars: outputChars,
    section: normalizeText(section),
  });
}

export function trackSelectItem({
  item,
  itemListName = 'pricing',
  section,
}: PricingItemListParams) {
  trackGaEvent('select_item', {
    item_list_name: itemListName,
    section: normalizeText(section),
    currency: item.currency?.toUpperCase(),
    value: convertMinorUnitsToValue(item.amount),
    items: buildPricingItems(item),
  });
}

export function trackBeginCheckout({
  item,
  provider,
  section,
}: PricingItemListParams & { provider?: string }) {
  trackGaEvent('begin_checkout', {
    currency: item.currency?.toUpperCase(),
    value: convertMinorUnitsToValue(item.amount),
    plan_id: item.product_id,
    plan_name: item.plan_name || item.product_name || item.title,
    provider: normalizeText(provider),
    section: normalizeText(section),
    items: buildPricingItems(item),
  });
}

export function trackAiGenerationStarted({
  generationType,
  model,
  mode,
  provider,
  taskId,
  templateId,
  hasReferenceAsset,
  creditsCost,
}: AiGenerationStartedParams) {
  trackGaEvent('ai_generation_started', {
    generation_type: normalizeText(generationType),
    model: normalizeText(model),
    mode: normalizeText(mode),
    provider: normalizeText(provider),
    task_id: normalizeText(taskId),
    template_id: normalizeText(templateId),
    has_reference_asset: hasReferenceAsset,
    credits_cost: creditsCost,
  });
}

export function trackAiGenerationSucceeded({
  generationType,
  model,
  mode,
  provider,
  taskId,
  creditsCost,
  durationMs,
  outputCount,
}: AiGenerationSucceededParams) {
  trackGaEvent('ai_generation_succeeded', {
    generation_type: normalizeText(generationType),
    model: normalizeText(model),
    mode: normalizeText(mode),
    provider: normalizeText(provider),
    task_id: normalizeText(taskId),
    credits_cost: creditsCost,
    duration_ms: durationMs,
    output_count: outputCount,
  });
}

export function trackAiGenerationFailed({
  generationType,
  model,
  mode,
  provider,
  taskId,
  creditsCost,
  errorCode,
  stage,
}: AiGenerationFailedParams) {
  trackGaEvent('ai_generation_failed', {
    generation_type: normalizeText(generationType),
    model: normalizeText(model),
    mode: normalizeText(mode),
    provider: normalizeText(provider),
    task_id: normalizeText(taskId),
    credits_cost: creditsCost,
    error_code: normalizeText(errorCode),
    stage: normalizeText(stage),
  });
}

export function trackAiCreditsExhausted({
  generationType,
  model,
  mode,
  provider,
  taskId,
  creditsCost,
  requiredCredits,
  remainingCredits,
}: AiCreditsExhaustedParams) {
  trackGaEvent('ai_credits_exhausted', {
    generation_type: normalizeText(generationType),
    model: normalizeText(model),
    mode: normalizeText(mode),
    provider: normalizeText(provider),
    task_id: normalizeText(taskId),
    credits_cost: creditsCost,
    required_credits: requiredCredits,
    remaining_credits: remainingCredits,
  });
}

export function markGaSessionEvent(key: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(key)) {
      return false;
    }

    window.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}
