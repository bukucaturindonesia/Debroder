import { buildPublicShellPageModel, buildUnavailablePublicShellPageModel } from "./domain";
import type { PublicShellPageModel } from "./model";
import type { PublicShellSource } from "./source";

export type ReadPublicShellSource = () => Promise<PublicShellSource>;

/**
 * Pure page use case. Server/runtime concerns are injected so domain behavior
 * can be verified without loading Next.js-only modules in the test runner.
 */
export async function loadPublicShellPageModel(
  readSource: ReadPublicShellSource
): Promise<PublicShellPageModel> {
  try {
    const source = await readSource();
    return buildPublicShellPageModel(source);
  } catch {
    return buildUnavailablePublicShellPageModel();
  }
}
