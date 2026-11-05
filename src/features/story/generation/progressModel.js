import { useEffect, useRef, useState } from 'react';

// 서버는 "지금 몇 번째 단계인지"만 알려 줘요. (이야기 짜기 → 글 쓰기 → 그림 그리기)
// 그래서 게이지는 하나의 위치(0~3)로 나타내요. 정수 부분이 단계, 소수 부분이 그 단계에서 찬 정도예요.
//  - 한 단계의 줄·고리는 처음부터 끝까지 일정한 속도로 차요. 단계를 시작할 때 걸릴 시간을 정하고 끝까지 바꾸지 않아요.
//  - 서버가 먼저 다음 단계로 넘어가도 빨라지지 않아요. 게이지가 끝까지 찬 뒤에 화면의 단계가 바뀌어요.
//  - 게이지가 먼저 끝까지 차면, 서버가 다음 단계로 넘어갈 때까지 그 자리에서 기다려요.
//  - AI 제작 속도는 다음 단계의 걸릴 시간에 반영해요. 앞 단계가 빨랐으면 다음 단계 게이지가 처음부터 조금 빠르게 차요.

// 단계별로 보통 걸리는 시간이에요. (전체 3~4분)
export const STAGE_EXPECTED_MS = [50_000, 50_000, 110_000];
// 그림만 다시 만들 때는 1분 안쪽이에요.
const IMAGES_ONLY_EXPECTED_MS = 45_000;

const SPEED_MIN = 0.4;
const SPEED_MAX = 3;
const TICK_MS = 100;
// 밀려 있어도 예상 시간의 절반보다 빨리 차지는 않아요.
const SHORTEST_RATIO = 0.5;
// 끝까지 찬 채로 기다리는 동안 다음 단계로 넘어가 보이지 않게, 경계 바로 앞에서 멈춰요.
const FULL_FILL = 0.9995;

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

// 이 단계의 게이지를 처음부터 끝까지 채우는 데 쓸 시간이에요. 단계를 시작할 때 한 번만 정해요.
export function segmentDuration(job, segment, now) {
  const expected = expectedStageMs(segment, job?.scope) * (job?.speed ?? 1);
  const shortest = expected * SHORTEST_RATIO;
  // 서버는 이미 이 단계를 끝냈어요. 밀린 만큼 줄이되 너무 빨라지지 않게 해요.
  if ((job?.stage ?? 0) > segment) return shortest;
  // 서버가 이 단계를 끝낼 것으로 보이는 시각에 맞춰요.
  return Math.max((job?.stageSince ?? now) + expected - now, shortest);
}

// 화면을 처음 열거나 새로고침했을 때의 상태예요. 서버의 진행에 맞는 자리에서 시작해요.
export function restoreGauge(job, now) {
  const segment = job?.stage ?? 0;
  const expected = expectedStageMs(segment, job?.scope) * (job?.speed ?? 1);
  const fill = clamp((now - (job?.stageSince ?? now)) / expected, 0, FULL_FILL);
  return { segment, fill, duration: expected };
}

// 게이지를 일정한 속도로 앞으로 옮겨요. 끝까지 찼을 때 서버가 앞서 있으면 다음 단계를 시작하고, 아니면 기다려요.
export function advanceGauge(gauge, job, elapsedMs, now) {
  let { segment, duration } = gauge;
  let fill = gauge.fill + elapsedMs / duration;

  if (fill >= 1 && (job?.stage ?? 0) > segment) {
    const leftover = fill - 1;
    segment += 1;
    duration = segmentDuration(job, segment, now);
    fill = leftover;
  }

  return { segment, duration, fill: Math.min(fill, FULL_FILL) };
}

export function gaugePosition(gauge, job) {
  return job?.status === 'done' ? 3 : gauge.segment + gauge.fill;
}

// 화면에 보여 줄 게이지 위치(0~3)예요.
export function useGenerationPosition(job) {
  const [position, setPosition] = useState(() => {
    const now = Date.now();
    return gaugePosition(restoreGauge(job, now), job);
  });
  const latest = useRef({ job });

  useEffect(() => {
    latest.current.job = job;
  }, [job]);

  useEffect(() => {
    const state = latest.current;
    const begin = () => {
      state.gauge = restoreGauge(state.job, Date.now());
      state.storyId = state.job?.storyId;
      state.wasResumed = Boolean(state.job?.resumed);
    };

    begin();
    state.tickedAt = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      // 다른 동화로 바뀌었거나 새로고침 뒤 서버 진행을 처음 읽었으면, 그 자리에서 다시 시작해요.
      const restored = state.wasResumed && !state.job?.resumed;
      if (state.storyId !== state.job?.storyId || state.job?.resumed || restored) {
        begin();
      } else {
        state.gauge = advanceGauge(state.gauge, state.job, now - state.tickedAt, now);
      }
      state.tickedAt = now;
      setPosition(gaugePosition(state.gauge, state.job));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return position;
}
