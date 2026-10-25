import { birthYearForAge } from '../story/utils';

// '만 5세'처럼 적은 나이로 출생 연도를 구해요. 태어난 달은 그대로 두거나, 없으면 이번 달로 해요.
export function childFromAge(ageText, currentChild) {
  const ageValue = String(ageText).trim();
  if (!ageValue) {
    return { ...currentChild, birthYear: '', birthMonth: '' };
  }

  const age = Number.parseInt(ageValue.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(age) || age < 0 || age > 12) return currentChild;

  const month = Number(currentChild?.birthMonth) || new Date().getMonth() + 1;
  return {
    ...currentChild,
    birthYear: birthYearForAge(age, month),
    birthMonth: month,
  };
}
