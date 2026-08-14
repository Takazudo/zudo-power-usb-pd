export type ViewerState = "no-js" | "loading" | "ready" | "error" | "unavailable";

type StateRoot = {
  dataset: DOMStringMap;
  querySelector(selectors: string): Element | null;
};

export function setViewerState(root: StateRoot, state: ViewerState, message: string): void {
  root.dataset.viewerState = state;
  setViewerMessage(root, message);
}

export function setViewerMessage(root: StateRoot, message: string): void {
  const status = root.querySelector("[data-model-viewer-status]");
  if (status !== null) status.textContent = message;
}
