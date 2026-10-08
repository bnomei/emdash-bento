import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { fields } from "../../dist/admin.mjs";
import "@emdash-cms/admin/styles.css";

document.documentElement.dataset.mode = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

const populated = [
  {
    id: "hero",
    layout: "1/1, 2/3, 1/3",
    columns: [
      {
        id: "intro",
        span: "1/1",
        blocks: [{ id: "heading", type: "heading", props: { text: "Welcome to Bento" } }],
      },
      { id: "wide", span: "2/3", blocks: [] },
      { id: "aside", span: "1/3", blocks: [] },
    ],
  },
];
const options = {
  blockDefinitions: [
    { type: "heading", label: "Heading", props: [{ key: "text", label: "Text", type: "text" }] },
  ],
  helpText: { en: "Compose rows and nested blocks.", de: "Zeilen und Blöcke gestalten." },
  i18n: { messages: { de: { addLayout: "Layout hinzufügen", addColumn: "Spalte hinzufügen" } } },
};

function Fixture() {
  const [value, setValue] = useState<unknown>(
    new URLSearchParams(location.search).has("populated") ? populated : [],
  );
  const [changes, setChanges] = useState(0);
  const Field = fields.layouts;
  return (
    <main style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Bento · EmDash 1.2</h1>
      <Field
        id="field-layouts"
        value={value}
        options={options}
        onChange={(next) => {
          setValue(next);
          setChanges((count) => count + 1);
        }}
      />
      <output data-testid="changes" hidden>
        {changes}
      </output>
      <output data-testid="value" hidden>
        {JSON.stringify(value)}
      </output>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
