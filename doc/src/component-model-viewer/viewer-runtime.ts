/**
 * The WebGL half of the package model viewer, loaded lazily by the island.
 *
 * Everything `three` is reached from here and nowhere else, so the library
 * lands in a dynamically imported chunk rather than in the page bundle: a
 * reader who never scrolls a record page's model card into view never
 * downloads it. It is a bundled dependency (`three@0.185.1`), not a CDN
 * script — no runtime origin other than this site is ever contacted.
 */

import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Sphere,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLLoader } from "three/addons/loaders/VRMLLoader.js";

import type { ModelVector, ModelViewerDescriptor } from "../../component-docs/core/model-descriptor.ts";
import { setViewerMessage, setViewerState } from "./viewer-state.ts";

export type MountedModelViewer = { readonly dispose: () => void };

export function applyModelTransform(
  object: Pick<Object3D, "position" | "rotation" | "scale">,
  offset: ModelVector,
  rotation: ModelVector,
  scale: ModelVector,
): void {
  object.position.set(offset.x, offset.y, offset.z);
  object.rotation.set(
    MathUtils.degToRad(rotation.x),
    MathUtils.degToRad(rotation.y),
    MathUtils.degToRad(rotation.z),
  );
  object.scale.set(scale.x, scale.y, scale.z);
}

export function createOnDemandInvalidator(render: () => void): {
  readonly invalidate: () => void;
  readonly cancel: () => void;
} {
  let frame: number | null = null;
  return {
    invalidate() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        render();
      });
    },
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}

export async function mountModelViewer(
  root: HTMLElement,
  descriptor: ModelViewerDescriptor,
  signal: AbortSignal,
): Promise<MountedModelViewer> {
  const viewport = root.querySelector<HTMLElement>("[data-model-viewer-viewport]");
  if (viewport === null) throw new Error("Model viewer viewport is missing");

  if (
    typeof WebGLRenderingContext === "undefined" ||
    new URLSearchParams(location.search).get("model-viewer-webgl") === "fail"
  ) {
    setViewerState(root, "unavailable", "WebGL is unavailable. The package identity and notice remain available.");
    return { dispose() {} };
  }

  let renderer: WebGLRenderer | undefined;
  let model: Object3D | undefined;
  let controls: OrbitControls | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let removeWindowResize: (() => void) | undefined;
  let themeObserver: MutationObserver | undefined;
  let disposed = false;

  try {
    if (signal.aborted) throw new DOMException("Viewer disposed", "AbortError");
    if (new URLSearchParams(location.search).get("model-viewer-model") === "fail") {
      throw new Error("Forced model load failure");
    }
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = "srgb";
    renderer.domElement.setAttribute("aria-hidden", "true");
    viewport.replaceChildren(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.01, 100000);
    scene.add(new AmbientLight(0xffffff, 2.2));
    const key = new DirectionalLight(0xffffff, 3.2);
    key.position.set(2, 3, 4);
    scene.add(key);
    const fill = new DirectionalLight(0xffffff, 1.2);
    fill.position.set(-3, -2, -2);
    scene.add(fill);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.screenSpacePanning = true;
    controls.listenToKeyEvents(viewport);

    const render = () => {
      if (disposed || renderer === undefined) return;
      const width = Math.max(1, viewport.clientWidth);
      const height = Math.max(1, viewport.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setClearColor(new Color(0x000000), 0);
      renderer.render(scene, camera);
      root.dataset.renderCount = String(Number(root.dataset.renderCount ?? "0") + 1);
    };
    const invalidator = createOnDemandInvalidator(render);
    controls.addEventListener("change", invalidator.invalidate);

    const response = await fetch(descriptor.modelUrl, {
      signal,
      credentials: "same-origin",
      cache: "force-cache",
    });
    if (!response.ok) throw new Error(`Model request failed with ${response.status}`);
    const source = await response.text();
    if (disposed || signal.aborted) throw new DOMException("Viewer disposed", "AbortError");
    model = new VRMLLoader().parse(source, descriptor.modelUrl);
    applyModelTransform(model, descriptor.offset, descriptor.rotation, descriptor.scale);
    scene.add(model);
    frameCamera(camera, controls, model);

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(invalidator.invalidate);
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", invalidator.invalidate, { passive: true });
      removeWindowResize = () => window.removeEventListener("resize", invalidator.invalidate);
    }
    themeObserver = new MutationObserver(invalidator.invalidate);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    // Update the layout-affecting live text before sizing, then publish ready
    // only after the first synchronous render is complete. Reordering these
    // three statements regresses the dialog viewer's initial sizing: the
    // status line's height changes the viewport box, so a render that runs
    // before the text is set measures a box the reader never sees.
    setViewerMessage(root, "Interactive package model ready. Drag to orbit; scroll to zoom; arrow keys pan.");
    invalidator.cancel();
    render();
    root.dataset.viewerState = "ready";

    return {
      dispose() {
        if (disposed) return;
        disposed = true;
        invalidator.cancel();
        resizeObserver?.disconnect();
        removeWindowResize?.();
        themeObserver?.disconnect();
        controls?.stopListenToKeyEvents();
        controls?.dispose();
        if (model !== undefined) disposeObject(model);
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
        root.dataset.viewerDisposed = "true";
      },
    };
  } catch (error) {
    controls?.stopListenToKeyEvents();
    controls?.dispose();
    if (model !== undefined) disposeObject(model);
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    if ((error as Error).name !== "AbortError") {
      setViewerState(root, "error", "The interactive package model could not be loaded. The package identity remains available.");
    }
    throw error;
  }
}

function frameCamera(camera: PerspectiveCamera, controls: OrbitControls, object: Object3D): void {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) throw new Error("Model has no displayable bounds");
  const sphere = bounds.getBoundingSphere(new Sphere());
  const radius = Math.max(sphere.radius, 0.001);
  const distance = radius / Math.sin(MathUtils.degToRad(camera.fov / 2));
  const direction = new Vector3(1, 0.8, 1).normalize();
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction, distance * 1.25);
  camera.near = Math.max(radius / 1000, 0.0001);
  camera.far = Math.max(radius * 1000, 100);
  camera.updateProjectionMatrix();
  controls.minDistance = radius * 0.15;
  controls.maxDistance = radius * 20;
  controls.update();
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
