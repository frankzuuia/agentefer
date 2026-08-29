import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import { waitForPollInterval } from "./meta-inbound-processor.js";
import {
  FacebookPageError,
  type FacebookPageClient,
  type FacebookPagePublishRequest,
} from "./facebook-page.js";
import {
  FacebookPublicationRpcError,
  type ClaimedFacebookPublicationJob,
  type FacebookPublicationRpcClient,
} from "./facebook-publication-rpc.js";

const CATALOG_PUBLIC_BUCKET = "agentefer-catalog-public";

export type FacebookPublicationProcessorConfiguration = Readonly<{
  workerId: string;
  supabaseUrl: string;
  pollIntervalMilliseconds: number;
  leaseSeconds: number;
  retryDelaySeconds: number;
  batchSize: number;
}>;

export type FacebookPublicationCycleResult = Readonly<{
  recoveredCount: number;
  uncertainRecoveryCount: number;
  publicationCount: number;
  reconciledBatchCount: number;
  readyNotificationCount: number;
}>;

export type FacebookPublicationProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
}>;

export type CreateFacebookPublicationProcessorInput = Readonly<{
  configuration: FacebookPublicationProcessorConfiguration;
  rpcClient: FacebookPublicationRpcClient;
  pageClient: FacebookPageClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const recordFailure = (
  input: CreateFacebookPublicationProcessorInput,
  operation: string,
  startedAt: number,
  error: unknown,
): void => {
  input.metrics.recordCompleted({
    operation,
    outcome: "failed",
    errorCategory:
      error instanceof FacebookPageError || error instanceof FacebookPublicationRpcError
        ? error.category
        : "internal",
    durationMilliseconds: elapsedMilliseconds(startedAt),
  });
};

const objectPathSegments = (objectPath: string): readonly string[] => {
  const segments = objectPath.split("/");
  if (
    segments.length < 2 ||
    segments.some(
      (segment) =>
        segment.length < 1 ||
        segment.length > 255 ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new FacebookPageError("invalid", { effectCertainty: "confirmed_not_applied" });
  }
  return segments;
};

export const createCatalogPublicMediaUrl = (
  supabaseUrl: string,
  media: ClaimedFacebookPublicationJob["media"][number],
): URL => {
  if (media.bucketId !== CATALOG_PUBLIC_BUCKET) {
    throw new FacebookPageError("invalid", { effectCertainty: "confirmed_not_applied" });
  }
  const origin = new URL(supabaseUrl);
  if (origin.protocol !== "https:") {
    throw new FacebookPageError("invalid", { effectCertainty: "confirmed_not_applied" });
  }
  origin.search = "";
  origin.hash = "";
  origin.pathname = `/storage/v1/object/public/${encodeURIComponent(media.bucketId)}/${objectPathSegments(
    media.objectPath,
  )
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
  return origin;
};

const publicationMessage = (claim: ClaimedFacebookPublicationJob): string =>
  [claim.headline, claim.body, claim.callToAction]
    .filter((part): part is string => part !== undefined && part.trim().length > 0)
    .join("\n\n")
    .trim();

const buildPublishRequest = (
  input: CreateFacebookPublicationProcessorInput,
  claim: ClaimedFacebookPublicationJob,
): FacebookPagePublishRequest | undefined => {
  if (
    claim.pageId === undefined ||
    claim.apiVersion === undefined ||
    claim.accessToken === undefined
  ) {
    return undefined;
  }
  const primaryMedia = claim.media.find((media) => media.mediaRole === "primary");
  if (claim.media.length > 0 && primaryMedia === undefined) {
    return undefined;
  }
  const primaryImageUrl =
    primaryMedia === undefined
      ? undefined
      : createCatalogPublicMediaUrl(input.configuration.supabaseUrl, primaryMedia);
  const message = publicationMessage(claim);
  if (message.length < 1) {
    return undefined;
  }
  return Object.freeze({
    pageId: claim.pageId,
    apiVersion: claim.apiVersion,
    accessToken: claim.accessToken,
    message,
    ...(primaryImageUrl === undefined ? {} : { primaryImageUrl }),
  });
};

const reconcileClaimBatch = async (
  input: CreateFacebookPublicationProcessorInput,
  claim: ClaimedFacebookPublicationJob,
  signal: AbortSignal,
): Promise<void> => {
  if (claim.publicationBatchId === undefined) {
    return;
  }
  await input.rpcClient.reconcileBatch({
    organizationId: claim.organizationId,
    publicationBatchId: claim.publicationBatchId,
    signal,
  });
};

const recordUsageBestEffort = async (
  input: CreateFacebookPublicationProcessorInput,
  claim: ClaimedFacebookPublicationJob,
  source: "provider_headers" | "provider_error",
  usageSnapshot: Readonly<Record<string, unknown>>,
  providerRequestId: string | undefined,
  retryAfterAt: string | undefined,
  signal: AbortSignal,
): Promise<void> => {
  if (Object.keys(usageSnapshot).length === 0 && retryAfterAt === undefined) {
    return;
  }
  try {
    await input.rpcClient.recordRateLimitObservation({
      claim,
      source,
      ...(providerRequestId === undefined ? {} : { providerRequestId }),
      ...(retryAfterAt === undefined
        ? {}
        : { retryAfterAt, blockedUntil: retryAfterAt }),
      usageSnapshot,
      signal,
    });
  } catch (error) {
    input.logger.error("worker.facebook.publication.usage_observation_failed", error, {
      organization_id: claim.organizationId,
      publication_job_id: claim.publicationJobId,
    });
  }
};

const settleGraphFailure = async (
  input: CreateFacebookPublicationProcessorInput,
  claim: ClaimedFacebookPublicationJob,
  error: FacebookPageError,
  signal: AbortSignal,
): Promise<void> => {
  await recordUsageBestEffort(
    input,
    claim,
    error.kind === "rate_limited" ? "provider_error" : "provider_headers",
    error.usageSnapshot,
    error.providerRequestId,
    error.retryAfterAt,
    signal,
  );

  if (error.effectCertainty === "unknown") {
    await input.rpcClient.recordJobResult({
      claim,
      outcome: "uncertain",
      effectCertainty: "unknown",
      ...(error.providerRequestId === undefined
        ? {}
        : { providerRequestId: error.providerRequestId }),
      errorClass: "unknown",
      errorCode: error.code,
      errorSummary: { failure_kind: error.kind },
      signal,
    });
    return;
  }

  const attemptsRemain = claim.attemptCount < claim.maxAttempts;
  if (error.kind === "rate_limited" && attemptsRemain) {
    const fallbackDelayMilliseconds = Math.max(1, input.configuration.retryDelaySeconds) * 1_000;
    const retryAt =
      error.retryAfterAt ?? new Date(Date.now() + fallbackDelayMilliseconds).toISOString();
    await input.rpcClient.recordJobResult({
      claim,
      outcome: "retryable",
      effectCertainty: "confirmed_not_applied",
      ...(error.providerRequestId === undefined
        ? {}
        : { providerRequestId: error.providerRequestId }),
      errorClass: "rate_limit",
      errorCode: error.code,
      errorSummary: { failure_kind: error.kind },
      retryAt,
      signal,
    });
    return;
  }

  await input.rpcClient.recordJobResult({
    claim,
    outcome: error.kind === "rejected" ? "blocked" : "failed",
    effectCertainty: "confirmed_not_applied",
    ...(error.providerRequestId === undefined
      ? {}
      : { providerRequestId: error.providerRequestId }),
    errorClass: error.kind === "rejected" ? "authorization" : "provider",
    errorCode: error.code,
    errorSummary: { failure_kind: error.kind },
    signal,
  });
};

const processClaim = async (
  input: CreateFacebookPublicationProcessorInput,
  claim: ClaimedFacebookPublicationJob,
  signal: AbortSignal,
): Promise<void> => {
  const authorization = await input.rpcClient.authorizeJob({ claim, signal });
  if (authorization.status === "blocked") {
    await reconcileClaimBatch(input, claim, signal);
    return;
  }

  const publishRequest = buildPublishRequest(input, claim);
  if (publishRequest === undefined) {
    await input.rpcClient.recordJobResult({
      claim,
      outcome: "blocked",
      effectCertainty: "not_started",
      errorClass: "configuration",
      errorCode: "facebook_publication_payload_incomplete",
      errorSummary: {
        page_id_present: claim.pageId !== undefined,
        api_version_present: claim.apiVersion !== undefined,
        access_token_present: claim.accessToken !== undefined,
        media_count: claim.media.length,
      },
      signal,
    });
    await reconcileClaimBatch(input, claim, signal);
    return;
  }

  await input.rpcClient.markEffectStarted({ claim, signal });
  try {
    const result = await input.pageClient.publish(publishRequest, signal);
    await recordUsageBestEffort(
      input,
      claim,
      "provider_headers",
      result.usageSnapshot,
      result.providerRequestId,
      undefined,
      signal,
    );
    await input.rpcClient.recordJobResult({
      claim,
      outcome: "succeeded",
      effectCertainty: "confirmed_applied",
      ...(result.providerRequestId === undefined
        ? {}
        : { providerRequestId: result.providerRequestId }),
      externalPublicationId: result.externalPublicationId,
      instanceStatus: "published",
      responseSummary: {
        ...result.responseSummary,
        approved_media_count: claim.media.length,
        published_media_count: publishRequest.primaryImageUrl === undefined ? 0 : 1,
      },
      signal,
    });
  } catch (error) {
    if (!(error instanceof FacebookPageError)) {
      throw error;
    }
    await settleGraphFailure(input, claim, error, signal);
  }
  await reconcileClaimBatch(input, claim, signal);
};

export async function drainFacebookPublicationsOnce(
  input: CreateFacebookPublicationProcessorInput,
  signal: AbortSignal,
): Promise<FacebookPublicationCycleResult> {
  const recovery = await input.rpcClient.recoverExpiredJobs({
    limit: input.configuration.batchSize,
    signal,
  });
  let publicationCount = 0;
  while (publicationCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claimJob({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      signal,
    });
    if (claim === undefined) {
      break;
    }
    await processClaim(input, claim, signal);
    publicationCount += 1;
  }
  const reconciliation = await input.rpcClient.reconcileDueBatches({
    limit: input.configuration.batchSize,
    signal,
  });
  return Object.freeze({
    recoveredCount: recovery.scannedCount,
    uncertainRecoveryCount: recovery.uncertainCount,
    publicationCount,
    reconciledBatchCount: reconciliation.terminalCount,
    readyNotificationCount: reconciliation.notificationsReady,
  });
}

export function createFacebookPublicationProcessor(
  input: CreateFacebookPublicationProcessorInput,
): FacebookPublicationProcessor {
  const controller = new AbortController();
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const operation = "facebook.publication.cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      const result = await drainFacebookPublicationsOnce(input, controller.signal);
      input.metrics.recordCompleted({
        operation,
        outcome: controller.signal.aborted ? "cancelled" : "succeeded",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (!controller.signal.aborted) {
        input.logger.debug("worker.facebook.publication.cycle_completed", "succeeded", {
          recovered_count: result.recoveredCount,
          uncertain_recovery_count: result.uncertainRecoveryCount,
          publication_count: result.publicationCount,
          reconciled_batch_count: result.reconciledBatchCount,
          ready_notification_count: result.readyNotificationCount,
        });
      }
      return !controller.signal.aborted;
    } catch (error) {
      if (controller.signal.aborted) {
        input.metrics.recordCompleted({
          operation,
          outcome: "cancelled",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
        return false;
      }
      recordFailure(input, operation, startedAt, error);
      input.logger.error("worker.facebook.publication.cycle_failed", error);
      return false;
    }
  };

  const runLoop = async (): Promise<void> => {
    while (!controller.signal.aborted) {
      const intervalCompleted = await waitForPollInterval(
        input.configuration.pollIntervalMilliseconds,
        controller.signal,
      );
      if (!intervalCompleted) {
        break;
      }
      input.onOperationalStateChange(await executeCycle());
    }
  };

  return Object.freeze({
    async start() {
      if (started) {
        throw new TypeError("Facebook publication processor cannot be started twice");
      }
      started = true;
      const operational = await executeCycle();
      input.onOperationalStateChange(operational);
      loopPromise = runLoop();
      return operational;
    },
    async stop() {
      controller.abort();
      await loopPromise;
    },
  });
}
