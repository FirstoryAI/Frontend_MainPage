// 생년월일로 '만 나이'를 계산해요. 아직 생일이 안 지났으면 한 살 덜해요.
export function calcAge(year, month, now = new Date()) {
  const birthYear = Number(year);
  const birthMonth = Number(month);
  if (!birthYear || !birthMonth) {
    return null;
  }
  const age = now.getFullYear() - birthYear - (now.getMonth() + 1 < birthMonth ? 1 : 0);
  return Math.max(age, 0);
}

// 같은 태어난 달을 유지한 채 원하는 만 나이가 되는 출생 연도를 구해요.
export function birthYearForAge(age, month, now = new Date()) {
  return now.getFullYear() - age - (now.getMonth() + 1 < Number(month) ? 1 : 0);
}

export function parseLikes(text) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinLikes(list) {
  return list.join(', ');
}
