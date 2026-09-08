import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createP1Api } from '../app/p1/p1Api';
import { CAMPAIGN_CHAPTERS, CAMPAIGN_LEVELS } from '../content/campaign';
import {
  LevelProgressSummaryStatusEnum,
  LevelResultsResponseCompletionKindEnum,
  NextAction,
  RouteSubmissionResponseResultEnum3,
} from '../infra/api/generated/data-contracts';
import { p1Handlers, resetP1FakeDb } from './p1Handlers';
import { server } from './server';

const CHAPTER_BOUNDARIES = new Set([9, 17, 24, 31, 38, 44, 50]);

function routeFor(path: string[], reverse: boolean) {
  const route = path.map((cellId) => {
    const [row, col] = cellId.split(':').map(Number);
    return { row: row - 1, col: col - 1 };
  });
  return reverse ? route.reverse() : route;
}

describe('full campaign mock lifecycle', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    server.resetHandlers(...p1Handlers);
    resetP1FakeDb();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('plays L1→L50 without reload or destructive reset and separates level/chapter rewards', async () => {
    const api = createP1Api();
    let state = await api.loadState();
    let offerCount = 0;

    for (let levelNumber = 1; levelNumber <= 50; levelNumber += 1) {
      const campaignChapter = CAMPAIGN_CHAPTERS.find(
        (chapter) => levelNumber >= chapter.levelStart && levelNumber <= chapter.levelEnd,
      );
      expect(campaignChapter).toBeDefined();
      if (!campaignChapter) throw new Error(`Missing chapter for Level ${levelNumber}`);

      const chapterState = state.clientState.chapters.find(
        (chapter) => chapter.number === campaignChapter.number,
      );
      expect(chapterState).toBeDefined();
      if (!chapterState) throw new Error(`Missing chapter state for Level ${levelNumber}`);
      if (!chapterState.isNarrativeShown) {
        const narrative = await api.confirmNarrativeShown(chapterState.chapterId, state);
        expect(narrative.nextAction).toBe(NextAction.StartLevel);
      }

      const level = await api.enterLevel(state);
      const config = CAMPAIGN_LEVELS[levelNumber];
      expect(level.levelNumber).toBe(levelNumber);
      expect(level.board.size).toBe(config.grid.length);
      expect(level.targetsRemaining).toBe(config.targets.length);

      const offers = config.targets.filter((target) => target.offer);
      expect(offers).toHaveLength(levelNumber % 2 === 0 ? 1 : 0);
      offerCount += offers.length;
      for (const offered of offers) {
        expect(offered.offer?.id).toBe(`offer-${String(levelNumber).padStart(2, '0')}`);
        expect(offered.offer?.destination).toMatch(
          new RegExp(`^mock://(product|course)/offer-${String(levelNumber).padStart(2, '0')}$`),
        );
      }

      for (const [index, target] of config.targets.entries()) {
        const result = await api.submitRoute(
          level.levelId,
          routeFor(target.path, index % 2 === 1),
        );
        expect(result.result).toBe(RouteSubmissionResponseResultEnum3.Found);
        expect(result.isTarget).toBe(true);
        expect(result.word).toBe(target.word);
      }

      const isBoundary = CHAPTER_BOUNDARIES.has(levelNumber);
      const results = await api.getLevelResults(level.levelId);
      expect(results.completionKind).toBe(
        isBoundary
          ? LevelResultsResponseCompletionKindEnum.Chapter
          : LevelResultsResponseCompletionKindEnum.Level,
      );
      expect(results.summary.targets).toEqual({
        foundCount: config.targets.length,
        totalCount: config.targets.length,
      });

      const acknowledgement = await api.acknowledgeLevelResults(level.levelId);
      if (!isBoundary) {
        expect(acknowledgement.nextAction).toBe(NextAction.StartLevel);
        expect(acknowledgement.pendingReward).toBeUndefined();
        state = await api.resyncState();
        expect(state.clientState.pendingReward).toBeUndefined();
        expect(state.clientState.rewards.some((reward) => reward.status === 'available')).toBe(false);
        expect(state.clientState.levels[levelNumber]?.status)
          .toBe(LevelProgressSummaryStatusEnum.Available);
        continue;
      }

      expect(acknowledgement.nextAction).toBe(NextAction.ClaimReward);
      expect(acknowledgement.pendingReward).toBeDefined();
      if (!acknowledgement.pendingReward) {
        throw new Error(`Missing Golden reward after Level ${levelNumber}`);
      }
      const claim = await api.claimReward(acknowledgement.pendingReward.rewardId, {
        rewardType: 'hint',
      });
      expect(claim.rewardType).toBe('chapter_golden');
      expect(claim.selectedOption).toEqual({ selectedOptionType: 'hint' });
      expect(claim.claimResult.balance.hintBalance)
        .toBe(state.clientState.clientView.balance.hintBalance + 3);
      expect(claim.nextAction).toBe(NextAction.OpenFeedback);

      const dismiss = await api.dismissFeedback(chapterState.chapterId);
      expect(dismiss.nextAction).toBe(
        levelNumber === 50 ? NextAction.CampaignComplete : NextAction.NextChapter,
      );
      state = await api.resyncState();
      expect(state.clientState.chapters.find((chapter) => chapter.number === campaignChapter.number))
        .toMatchObject({ status: 'completed', completedLevels: campaignChapter.levelEnd - campaignChapter.levelStart + 1 });
    }

    expect(offerCount).toBe(25);
    expect(state.clientState.levels.filter((level) => level.status === 'completed')).toHaveLength(50);
    expect(state.clientState.chapters.filter((chapter) => chapter.status === 'completed')).toHaveLength(7);
    expect(state.clientState.clientView.campaignProgress).toEqual({
      isCompleted: true,
      isCompletionShown: false,
    });
    expect(state.clientState.nextAction).toBe(NextAction.CampaignComplete);

    const rewardCount = state.clientState.rewards.length;
    const beforeConfirmation = await fetch('http://localhost/api/v1/clients/me/state');
    const beforeEtag = beforeConfirmation.headers.get('etag') ?? '';
    const key = 'c0a80121-7ac0-4bd2-84a2-08a767981015';
    const confirm = (idempotencyKey: string, ifMatch: string) => fetch(
      'http://localhost/api/v1/campaigns/current/completion-shown',
      {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey, 'if-match': ifMatch },
      },
    );
    const processed = await confirm(key, beforeEtag);
    expect(processed.status).toBe(200);
    expect(processed.headers.get('idempotency-key-status')).toBe('processed');
    const processedEtag = processed.headers.get('etag') ?? '';
    await expect(processed.json()).resolves.toEqual({
      isCompletionShown: true,
      nextAction: NextAction.None,
    });

    const replayed = await confirm(key, beforeEtag);
    expect(replayed.status).toBe(200);
    expect(replayed.headers.get('idempotency-key-status')).toBe('replayed');
    expect(replayed.headers.get('etag')).toBe(processedEtag);

    const noOp = await confirm(crypto.randomUUID(), processedEtag);
    expect(noOp.status).toBe(200);
    expect(noOp.headers.get('idempotency-key-status')).toBe('processed');
    expect(noOp.headers.get('etag')).toBe(processedEtag);

    const confirmed = await api.resyncState();
    expect(confirmed.clientState.clientView.campaignProgress).toEqual({
      isCompleted: true,
      isCompletionShown: true,
    });
    expect(confirmed.clientState.nextAction).toBe(NextAction.None);
    expect(confirmed.clientState.rewards).toHaveLength(rewardCount);
  }, 30_000);
});
