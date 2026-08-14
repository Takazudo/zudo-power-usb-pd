export type FootprintSelection = {
  readonly packageId: string;
  readonly footprintName: string;
  readonly footprintPath: string;
  readonly recordIds: readonly string[];
};

export type FootprintPreviewEntry = FootprintSelection & {
  readonly assetPath: string;
  readonly canonicalInputSha256: string;
  readonly generatedOutputSha256: string;
};

export type FootprintPreviewManifest = {
  readonly formatVersion: number;
  readonly renderer: {
    readonly image: string;
    readonly version: string;
  };
  readonly export: {
    readonly layers: readonly string[];
    readonly theme: string;
    readonly options: readonly string[];
    readonly textPolicy: "suppress-all-fp-text-in-temporary-library";
    readonly postprocessor: "repository-svg-normalizer-v1";
  };
  readonly canonicalInputSha256: string;
  readonly generatedOutputSha256: string;
  readonly packages: readonly FootprintPreviewEntry[];
};
