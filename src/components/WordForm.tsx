"use client";

import { useState } from "react";

export type DefinitionRow = { source: string; definitionText: string };

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light";

let rowKeySeed = 0;
const nextRowKey = () => `row-${rowKeySeed++}`;

export function WordForm({
  action,
  initialTerm = "",
  initialDefinitions = [],
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialTerm?: string;
  initialDefinitions?: DefinitionRow[];
  submitLabel: string;
}) {
  const [rows, setRows] = useState(() =>
    (initialDefinitions.length > 0
      ? initialDefinitions
      : [{ source: "", definitionText: "" }]
    ).map((row) => ({ ...row, key: nextRowKey() })),
  );

  const addRow = () =>
    setRows((current) => [...current, { source: "", definitionText: "", key: nextRowKey() }]);

  const removeRow = (key: string) =>
    setRows((current) => current.filter((row) => row.key !== key));

  /**
   * `required` alone accepts a field containing only spaces, which the server
   * then trims to empty and rejects with an opaque error. Trimming first lets
   * the browser catch it with its own message, in place, before submitting.
   */
  const trimThenValidate = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    form
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]")
      .forEach((field) => {
        field.value = field.value.trim();
      });

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
    }
  };

  return (
    <form action={action} onSubmit={trimThenValidate} className="flex flex-col gap-8">
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Төвөд үг
        <input
          type="text"
          name="termTibetan"
          defaultValue={initialTerm}
          required
          autoFocus={!initialTerm}
          className={`tibetan text-xl ${inputClass}`}
        />
      </label>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-brown">Тодорхойлолтууд</h2>

        <div className="mt-3 flex flex-col gap-4">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm text-primary">{index + 1}.</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Хасах
                  </button>
                )}
              </div>

              <label className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                Эх сурвалж
                <input
                  type="text"
                  name="source"
                  defaultValue={row.source}
                  required
                  className={inputClass}
                />
              </label>

              <label className="mt-3 flex flex-col gap-1 text-sm text-foreground">
                Тодорхойлолт
                <textarea
                  name="definitionText"
                  defaultValue={row.definitionText}
                  rows={3}
                  required
                  className={inputClass}
                />
              </label>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-4 rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light/10"
        >
          + Тодорхойлолт нэмэх
        </button>
      </section>

      <button
        type="submit"
        className="self-start rounded-md bg-primary px-5 py-2 font-medium text-white hover:bg-primary-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
