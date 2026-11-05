import { useEffect, useRef, useState } from 'react';

// 서버는 "지금 몇 번째 단계인지"만 알려 줘요. (이야기 짜기 → 글 쓰기 → 그림 그리기)
// 그래서 게이지는 하나의 위치(0~3)로 나타내요. 정수 부분이 단계, 소수 부분이 그 단계에서 찬 정도예요.
//  - 목표 위치: 단계 안에서는 걸린 시간으로 어림하고, 끝에 가까울수록 천천히 차서 다음 단계를 넘지 않아요.
//  - 앞 단계가 예상보다 빨리/늦게 끝났으면, 그 속도를 다음 단계 예상에 반영해요. (AI 제작 속도에 맞춰요)
//  - 화면의 위치: 목표를 부드럽게 따라가요. 서버가 다음 단계로 넘어갔다고 알려 줘도 건너뛰지 않고,
//    게이지가 다음 단계에 실제로 닿았을 때 화면의 단계가 바뀌어요.

// 단계별로 보통 걸리는 시간이에요. (전체 3~4분)
export const STAGE_EXPECTED_MS = [50_000, 50_000, 110_000];
// 그림만 다시 만들 때는 1분 안쪽이에요.
const IMAGES_ONLY_EXPECTED_MS = 45_000;

const MAX_FILL = 0.97;
const SPEED_MIN = 0.4;
const SPEED_MAX = 3;
const TICK_MS = 100;
// 목표가 앞서갔을 때 따라잡는 속도예요. 1초에 한 단계의 30%까지만 움직여서 휙 넘어가지 않아요.
const MAX_CATCH_UP_PER_SECOND = 0.3;
const FOLLOW_TIME_MS = 500;

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

// 지금 게이지가 가 있어야 할 위치(0~3)예요.
export function targetPosition(job, now) {
  if (job?.status === 'done') return 3;
  const stage = job?.stage ?? 0;
  const elapsed = now - (job?.stageSince ?? now);
  return stage + stageFill(elapsed, expectedStageMs(stage, job?.scope), job?.speed ?? 1);
}

// 화면 위치를 목표 쪽으로 한 걸음 옮겨요. 앞으로만 가고, 멀리 있어도 정해진 속도를 넘지 않아요.
export function stepPosition(position, target, elapsedMs) {
  const gap = target - position;
  if (gap <= 0) return position;
  const follow = gap * (1 - Math.exp(-elapsedMs / FOLLOW_TIME_MS));
  return position + Math.min(follow, (MAX_CATCH_UP_PER_SECOND * elapsedMs) / 1000);
}

// 화면에 보여 줄 게이지 위치(0~3)예요. 시간이 흐르는 만큼 끊김 없이 차오르고 줄어들지 않아요.
export function useGenerationPosition(job) {
  const [position, setPosition] = useState(() => targetPosition(job, Date.now()));
  const latest = useRef({ job, position });

  useEffect(() => {
    latest.current.job = job;
  }, [job]);

  useEffect(() => {
    const tick = () => {
      const state = latest.current;
      const now = Date.now();
      const target = targetPosition(state.job, now);
      const switched = state.storyId !== state.job?.storyId;
      // 다른 동화로 바뀌었거나 새로고침 뒤 이어 보는 중이면, 처음부터 차오르지 않고 제자리로 바로 가요.
      const restored = state.wasResumed && !state.job?.resumed;
      const next =
        switched || restored || state.job?.resumed ? target : stepPosition(state.position, target, now - state.tickedAt);

      state.storyId = state.job?.storyId;
      state.wasResumed = Boolean(state.job?.resumed);
      state.tickedAt = now;
      state.position = next;
      setPosition(next);
    };

    latest.current.storyId = latest.current.job?.storyId;
    latest.current.wasResumed = Boolean(latest.current.job?.resumed);
    latest.current.tickedAt = Date.now();

    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return position;
}
