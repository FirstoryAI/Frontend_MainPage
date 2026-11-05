import { useEffect, useRef, useState } from 'react';

// 서버는 "지금 몇 번째 단계인지"만 알려 줘요. (이야기 짜기 → 글 쓰기 → 그림 그리기)
// 그래서 단계 안에서 얼마나 찼는지는 걸린 시간으로 어림해요.
//  - 단계가 바뀌는 순간은 서버가 알려 주는 대로 따라가요. (게이지가 그 단계 몫까지 꽉 차요)
//  - 단계 안에서는 예상 시간에 맞춰 차오르다가, 끝에 가까울수록 천천히 차서 100%를 넘지 않아요.
//  - 앞 단계가 예상보다 빨리/늦게 끝났으면, 그 속도를 다음 단계 예상에 반영해요. (AI 제작 속도에 맞춰요)

// 단계별로 보통 걸리는 시간이에요. (전체 3~4분)
export const STAGE_EXPECTED_MS = [50_000, 50_000, 110_000];
// 그림만 다시 만들 때는 1분 안쪽이에요.
const IMAGES_ONLY_EXPECTED_MS = 45_000;

const MAX_FILL = 0.97;
const SPEED_MIN = 0.4;
const SPEED_MAX = 3;
const TICK_MS = 250;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function expectedStageMs(stage, scope) {
  return scope === 'IMAGES' && stage === 2 ? IMAGES_ONLY_EXPECTED_MS : STAGE_EXPECTED_MS[stage] ?? STAGE_EXPECTED_MS[2];
}

// 끝난 단계가 예상보다 얼마나 걸렸는지를 반영해 다음 단계의 속도 배율을 새로 구해요. (1이면 예상대로)
export function nextSpeed(speed, observedMs, stage, scope) {
  const ratio = observedMs / expectedStageMs(stage, scope);
  return clamp(speed * 0.4 + ratio * 0.6, SPEED_MIN, SPEED_MAX);
}

// 새로고침해서 단계가 언제 시작됐는지 모를 때, 서버가 알려 준 제작 시작 시각으로 어림해요.
export function estimateStageSince(startedAt, stage, scope, now = Date.now()) {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return now;

  const before = scope === 'IMAGES' ? 0 : STAGE_EXPECTED_MS.slice(0, stage).reduce((sum, ms) => sum + ms, 0);
  const elapsedInStage = clamp(now - started - before, 0, expectedStageMs(stage, scope) * 1.2);
  return now - elapsedInStage;
}

// 한 단계 안에서 찬 비율(0~0.97). 처음엔 빠르게, 끝에 가까울수록 천천히 차요.
export function stageFill(elapsedMs, expectedMs, speed = 1) {
  const tau = (expectedMs * speed) / 1.6;
  return Math.min(MAX_FILL, 1 - Math.exp(-Math.max(elapsedMs, 0) / tau));
}

// 세 단계 각각이 찬 비율이에요. 지난 단계는 1, 앞으로 올 단계는 0이에요.
export function computeFills(job, now) {
  const stage = job?.stage ?? 0;
  if (job?.status === 'done') return [1, 1, 1];

  return [0, 1, 2].map((index) => {
    if (index < stage) return 1;
    if (index > stage) return 0;
    const elapsed = now - (job?.stageSince ?? now);
    return stageFill(elapsed, expectedStageMs(stage, job?.scope), job?.speed ?? 1);
  });
}

// 화면에 보여 줄 게이지 값이에요. 시간이 흐르는 만큼 조금씩 차오르고, 한 번 찬 게이지는 줄어들지 않아요.
export function useGenerationFills(job) {
  const [fills, setFills] = useState(() => computeFills(job, Date.now()));
  const floor = useRef({ storyId: null, values: [0, 0, 0] });

  const storyId = job?.storyId ?? null;
  const stage = job?.stage ?? 0;
  const scope = job?.scope ?? null;
  const status = job?.status ?? null;
  const stageSince = job?.stageSince ?? null;
  const speed = job?.speed ?? 1;

  useEffect(() => {
    const tick = () => {
      if (floor.current.storyId !== storyId) {
        floor.current = { storyId, values: [0, 0, 0] };
      }
      const next = computeFills({ stage, scope, status, stageSince, speed }, Date.now()).map((value, index) =>
        Math.max(value, floor.current.values[index]),
      );
      floor.current.values = next;
      setFills((current) => (current.every((value, index) => Math.abs(value - next[index]) < 0.002) ? current : next));
    };

    const timer = setInterval(tick, TICK_MS);
    // 단계가 바뀐 순간에도 바로 반영해요.
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [storyId, stage, scope, status, stageSince, speed]);

  return fills;
}
