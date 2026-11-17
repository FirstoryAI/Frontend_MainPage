import { getHome } from '../../services/homeApi';

export async function getFreeStoryRemaining() {
  const home = await getHome();
  const credits = home?.credits;
  return credits?.beta && !credits.unlimited ? credits.remaining : null;
}
