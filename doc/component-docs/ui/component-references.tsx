/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {
  decodeComponentReferencesDescriptor,
  type ComponentReferencesDescriptor,
} from "../core/reference-descriptor.ts";
import { FootprintPreview } from "./footprint-preview.tsx";
import { PackageModelViewer } from "./package-model-viewer.tsx";

export type ComponentReferencesProps = { readonly descriptor: string };

/**
 * The compact, server-rendered reference shortcut for a component detail page.
 * Its source data is an encoded, validated descriptor rather than prose parsed
 * from the MDX file, keeping PDF labels and asset paths faithful to the model.
 *
 * Each of the three cards renders either its resolved content or an explicit
 * unresolved state naming the reason. A card is never dropped: the section's
 * job is to tell a reader what this project knows AND what it does not, and a
 * silently missing card reads as "there is nothing to know".
 */
export function ComponentReferences({ descriptor: encoded }: ComponentReferencesProps) {
  const descriptor = decodeComponentReferencesDescriptor(encoded);
  return (
    <section className="zld-component-references" aria-labelledby="component-references-heading">
      <h2 id="component-references-heading" className="zld-component-references__heading">Component references</h2>
      <div className="zld-component-references__grid">
        <DocumentCard document={descriptor.document} />
        <FootprintCard footprint={descriptor.footprint} />
        <ModelCard model={descriptor.model} />
      </div>
    </section>
  );
}

function DocumentCard({ document }: { readonly document: ComponentReferencesDescriptor["document"] }) {
  return (
    <article className="zld-component-references__card">
      <h3 className="zld-component-references__card-heading">Selected document</h3>
      {document.resolved
        ? (
          <>
            <p className="zld-component-references__document-label">{document.label}</p>
            <p className="zld-component-references__document-title">
              <a href={document.url}>{document.title}</a>
            </p>
            <dl className="zld-component-references__metadata">
              <div><dt>Authority</dt><dd>{document.authority}</dd></div>
              <div><dt>Availability</dt><dd>{document.availability}</dd></div>
            </dl>
          </>
        )
        : <Unresolved reason={document.reason} />}
    </article>
  );
}

function FootprintCard({ footprint }: { readonly footprint: ComponentReferencesDescriptor["footprint"] }) {
  return (
    <article className="zld-component-references__card">
      <h3 className="zld-component-references__card-heading">Footprint preview</h3>
      {footprint.resolved
        ? (
          <FootprintPreview
            assetUrl={footprint.assetUrl}
            footprintName={footprint.name}
            footprintPath={footprint.path}
          />
        )
        : (
          <>
            {/* Its own class, not the document card's: the built-output check
                reads `__document-label` to find the reviewed PDF label, and
                reusing it here would put a package name in that lookup. */}
            <p className="zld-component-references__footprint-name">{footprint.name}</p>
            <Unresolved reason={footprint.reason} />
          </>
        )}
    </article>
  );
}

function ModelCard({ model }: { readonly model: ComponentReferencesDescriptor["model"] }) {
  return (
    <article className="zld-component-references__card zld-component-references__model-card">
      <h3 className="zld-component-references__card-heading">Package model</h3>
      {model.resolved
        ? <PackageModelViewer descriptor={model.descriptor} />
        : <Unresolved reason={model.reason} />}
    </article>
  );
}

/**
 * The shared unresolved state. `data-reference-unresolved` is the hook the
 * built-output check reads, so an unresolved card cannot be mistaken for a
 * resolved one that merely rendered empty.
 */
function Unresolved({ reason }: { readonly reason: string }) {
  return (
    <p className="zld-component-references__unresolved" data-reference-unresolved="true">
      <strong>Unresolved.</strong> {reason}
    </p>
  );
}
