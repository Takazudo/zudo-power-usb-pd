/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {
  decodeComponentReferencesDescriptor,
  type ComponentReferencesDescriptor,
} from "../core/reference-descriptor.ts";

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
          <figure className="zld-component-references__footprint">
            <div className="zld-component-references__footprint-frame">
              <a href={footprint.assetUrl}>
                <img src={footprint.assetUrl} alt={`Footprint preview for ${footprint.name}`} />
              </a>
            </div>
            <figcaption>{footprint.name}</figcaption>
          </figure>
        )
        : (
          <>
            <p className="zld-component-references__document-label">{footprint.name}</p>
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
        // A static handle on the reviewed asset, not a viewer: the interactive
        // WebGL island is a separate port and needs assets that do not exist
        // here yet. A reader with a resolved model can still fetch it.
        ? <p data-model-descriptor={model.descriptor}>The reviewed 3D model for this package is available.</p>
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
