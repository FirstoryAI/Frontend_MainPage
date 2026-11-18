import savingMascot from '../../assets/images/story-summary-mascot.png';
import savedMascot from '../../assets/images/story-save-wink.webp';

export { savingMascot, savedMascot };

// 저장하는 중·저장 완료 유령 그림이에요. 오버레이(MascotTravel)가 뜰 때 받기 시작하면 첫 저장 때 그림 없이 글자만 먼저 보여서,
// 동화 만들기 화면에 들어오자마자 미리 받아 풀어(decode) 두고 버리지 않게 붙잡아 둬요.
let preloaded = null;
export function preloadMascotTravel() {
  preloaded ??= [savingMascot, savedMascot].map((src) => {
    const image = new Image();
    image.src = src;
    image.decode?.().catch(() => {});
    return image;
  });
}
