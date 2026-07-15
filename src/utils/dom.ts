/**
 * Returns a required page element with its concrete DOM type. Throwing here turns
 * a missing selector into an immediate, descriptive startup error instead of a
 * later null-property failure.
 */
export function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
