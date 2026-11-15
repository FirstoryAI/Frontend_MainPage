const COLOR_ORDER = ['friend', 'kindergarten', 'emotion', 'tantrum', 'habit'];
const ROUND_COUNT = 8;

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

// 사용 가능한 색을 한 묶음으로 보여줘요. 잠긴 보라색 카드가 풀리면 다섯 색 묶음이 됩니다.
export function shuffleScenarioRounds(scenarios) {
  const groups = Object.fromEntries(COLOR_ORDER.map((color) => [
    color,
    scenarios.filter((scenario) => scenario.color === color),
  ]));
  const availableColors = COLOR_ORDER.filter((color) => groups[color].length > 0);
  if (availableColors.length < 3) return [...scenarios];

  const rounds = [];
  for (let roundIndex = 0; roundIndex < ROUND_COUNT; roundIndex += 1) {
    const previousColors = rounds[roundIndex - 1]?.map((scenario) => scenario.color);
    let colors;
    do {
      colors = roundIndex === 0 ? availableColors : shuffle(availableColors);
    } while (
      previousColors && (
        colors[0] === previousColors.at(-1)
        || colors.every((color, index) => color === previousColors[index])
        || (roundIndex === ROUND_COUNT - 1 && colors.at(-1) === availableColors[0])
      )
    );

    rounds.push(colors.map((color) => groups[color][roundIndex % groups[color].length]));
  }

  return rounds.flat();
}
