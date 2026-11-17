/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Plus, Minus, X } from 'lucide-react';

interface NumberEntry {
  value: string;
  addedAt: string;
}

interface CalculationResult {
  success: boolean;
  operation?: 'add' | 'subtract';
  operation_label?: string;
  numbers?: string[];
  expression?: string;
  result?: string;
  error?: string;
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [entries, setEntries] = useState<NumberEntry[]>([]);
  const [outcome, setOutcome] = useState<CalculationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const handleAddNumberToList = (): NumberEntry[] | null => {
    const trimmed = currentInput.trim();
    if (trimmed === '') {
      setErrorMessage('Please type a number before adding.');
      inputRef.current?.focus();
      return null;
    }

    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
      setErrorMessage(`'${trimmed}' is not a valid number.`);
      inputRef.current?.focus();
      return null;
    }

    const updated = [
      ...entries,
      { value: trimmed, addedAt: formatTimestamp(new Date()) },
    ];
    setEntries(updated);
    setCurrentInput('');
    setErrorMessage('');
    inputRef.current?.focus();
    return updated;
  };

  const handleRemoveNumber = (indexToRemove: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setErrorMessage('');
  };

  const handleLoadExample = () => {
    const now = formatTimestamp(new Date());
    setEntries([
      { value: '100', addedAt: now },
      { value: '50', addedAt: now },
      { value: '25', addedAt: now },
    ]);
    setCurrentInput('');
    setErrorMessage('');
    setOutcome(null);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNumberToList();
    }
  };

  const handleCalculate = async (operation: 'add' | 'subtract') => {
    setErrorMessage('');

    let activeEntries = entries;
    const pending = currentInput.trim();

    if (pending !== '') {
      const updated = handleAddNumberToList();
      if (!updated) return;
      activeEntries = updated;
    }

    if (activeEntries.length < 2) {
      setErrorMessage('Please add at least 2 numbers before calculating.');
      inputRef.current?.focus();
      return;
    }

    setIsCalculating(true);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numbers: activeEntries.map((entry) => entry.value),
          operation,
        }),
      });

      const data: CalculationResult = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Unable to calculate result.');
        return;
      }

      setOutcome(data);
    } catch {
      setErrorMessage('Could not reach the server. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Multi-Number Calculator
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              Type numbers one by one to build your list, then add or subtract them.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadExample}
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Load Example (100, 50, 25)
          </button>
        </header>

        {/* Two-Column Responsive Calculator Workspace */}
        <section
          aria-label="Calculator Workspace"
          className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1.15fr_0.85fr]"
        >
          {/* Left Panel: Single Continuous Input & Sequence */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Enter Numbers One by One
              </h2>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCalculate('add');
              }}
              noValidate
            >
              {/* Single Number Input Field */}
              <div className="mb-5 flex flex-col gap-1.5">
                <label
                  htmlFor="single-number-input"
                  className="text-[13px] font-medium text-slate-600"
                >
                  Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    id="single-number-input"
                    type="text"
                    inputMode="decimal"
                    value={currentInput}
                    onChange={(e) => {
                      setCurrentInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Type a number (e.g. 666) and press Enter"
                    autoFocus
                    className="font-mono-tabular h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:outline-none focus:ring-3 focus:ring-blue-700/15"
                  />
                  <button
                    type="button"
                    onClick={handleAddNumberToList}
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Press <strong className="font-semibold text-slate-700">Enter</strong> or
                  click <strong className="font-semibold text-slate-700">+ Add</strong> after
                  each number.
                </p>
              </div>

              {/* Running List of Added Numbers with Date & Time */}
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-slate-600">
                    Added Numbers
                  </span>
                  <span className="text-[13px] text-slate-500">
                    {entries.length === 1 ? '1 number' : `${entries.length} numbers`}
                  </span>
                </div>

                {entries.length === 0 ? (
                  <div className="rounded-lg bg-slate-100 px-3.5 py-3 text-sm text-slate-500">
                    No numbers added yet. Type your first number above.
                  </div>
                ) : (
                  <ul
                    aria-label="Added numbers list"
                    className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200"
                  >
                    {entries.map((entry, idx) => (
                      <li
                        key={`${idx}-${entry.value}-${entry.addedAt}`}
                        className="flex items-center gap-2.5 bg-white px-3 py-2.5"
                      >
                        <span className="font-mono-tabular w-6 shrink-0 text-[13px] text-slate-400">
                          {idx + 1}.
                        </span>
                        <span className="font-mono-tabular min-w-0 flex-1 truncate text-[15px] font-medium text-slate-900">
                          {entry.value}
                        </span>
                        <span className="font-mono-tabular shrink-0 whitespace-nowrap text-xs text-slate-500">
                          {entry.addedAt}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNumber(idx)}
                          aria-label={`Remove ${entry.value}`}
                          title="Remove this number"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Operation Buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isCalculating}
                  onClick={() => void handleCalculate('add')}
                  className="inline-flex h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-blue-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add Numbers</span>
                </button>
                <button
                  type="button"
                  disabled={isCalculating}
                  onClick={() => void handleCalculate('subtract')}
                  className="inline-flex h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                  <span>Subtract Numbers</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Same-Page Result Display */}
          <div
            className="rounded-xl border border-slate-200 bg-white p-6"
            aria-live="polite"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Result</h2>
              <span className="whitespace-nowrap text-[13px] text-slate-500">
                {outcome?.success && outcome.numbers
                  ? `${outcome.operation_label} · ${outcome.numbers.length} numbers`
                  : 'Ready to calculate'}
              </span>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                <strong className="font-semibold">Check your inputs: </strong>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="py-1">
              <div
                className={`font-mono-tabular mb-4 break-words text-4xl font-bold leading-tight sm:text-5xl ${
                  outcome?.success ? 'text-slate-900' : 'text-slate-300'
                }`}
              >
                {outcome?.success ? outcome.result : '—'}
              </div>

              <div className="flex flex-col gap-1 rounded-lg bg-slate-100 px-3.5 py-3">
                <span className="text-xs font-semibold text-slate-500">
                  Calculation
                </span>
                <code className="font-mono-tabular break-words text-[15px] text-slate-900">
                  {outcome?.success
                    ? `${outcome.expression} = ${outcome.result}`
                    : 'Add numbers above, then choose Add or Subtract'}
                </code>
              </div>
            </div>

            <hr className="my-5 border-t border-slate-200" />

            <div className="flex flex-col gap-2 text-[13px] text-slate-600">
              <p>
                <strong className="font-semibold text-slate-800">Addition: </strong>
                Sums all entered values (<code>N1 + N2 + N3 …</code>).
              </p>
              <p>
                <strong className="font-semibold text-slate-800">Subtraction: </strong>
                Subtracts sequentially from the first number (<code>N1 - N2 - N3 …</code>).
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
