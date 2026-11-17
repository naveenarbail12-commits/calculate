import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface CalculationOutcome {
  success: boolean;
  operation?: 'add' | 'subtract';
  operation_label?: string;
  numbers?: string[];
  expression?: string;
  result?: string;
  error?: string;
}

/**
 * Exact decimal addition/subtraction helper (mirrors Python's Decimal logic in calculator/app.py)
 * so floating point inputs like 0.1 + 0.2 yield 0.3 instead of 0.30000000000000004.
 */
function parseDecimalParts(raw: string): { coeff: bigint; scale: number } | null {
  const trimmed = raw.trim();
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
    return null;
  }
  const negative = trimmed.startsWith('-');
  const unsigned = trimmed.replace(/^[+-]/, '');
  const [intPart = '0', fracPart = ''] = unsigned.split('.');
  const scale = fracPart.length;
  const digits = `${intPart}${fracPart}`.replace(/^0+/, '') || '0';
  let coeff = BigInt(digits);
  if (negative && coeff !== 0n) {
    coeff = -coeff;
  }
  return { coeff, scale };
}

function formatBigDecimal(coeff: bigint, scale: number): string {
  if (coeff === 0n) return '0';
  const negative = coeff < 0n;
  const absStr = (negative ? -coeff : coeff).toString();
  if (scale === 0) {
    return `${negative ? '-' : ''}${absStr}`;
  }
  const padded = absStr.padStart(scale + 1, '0');
  const intPart = padded.slice(0, padded.length - scale);
  const fracPart = padded.slice(padded.length - scale).replace(/0+$/, '');
  const formatted = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  return `${negative ? '-' : ''}${formatted}`;
}

function performCalculation(rawNumbers: unknown[], operation: unknown): CalculationOutcome {
  const parsed: Array<{ coeff: bigint; scale: number; formatted: string }> = [];

  for (let i = 0; i < rawNumbers.length; i++) {
    const text = String(rawNumbers[i] ?? '').trim();
    if (text === '') continue;

    const dec = parseDecimalParts(text);
    if (!dec) {
      return {
        success: false,
        error: `Number ${i + 1} ('${text}') is not a valid number.`,
      };
    }
    parsed.push({
      ...dec,
      formatted: formatBigDecimal(dec.coeff, dec.scale),
    });
  }

  if (parsed.length < 2) {
    return {
      success: false,
      error: 'Please enter at least 2 valid numbers to calculate.',
    };
  }

  if (operation !== 'add' && operation !== 'subtract') {
    return {
      success: false,
      error: 'Invalid operation selected. Please choose Add or Subtract.',
    };
  }

  const maxScale = parsed.reduce((max, item) => Math.max(max, item.scale), 0);
  const scaledValues = parsed.map((item) => item.coeff * 10n ** BigInt(maxScale - item.scale));

  let resultCoeff = scaledValues[0];
  for (let i = 1; i < scaledValues.length; i++) {
    if (operation === 'add') {
      resultCoeff += scaledValues[i];
    } else {
      resultCoeff -= scaledValues[i];
    }
  }

  const symbol = operation === 'add' ? '+' : '-';
  const formattedInputs = parsed.map((item) => item.formatted);

  return {
    success: true,
    operation,
    operation_label: operation === 'add' ? 'Addition' : 'Subtraction',
    numbers: formattedInputs,
    expression: formattedInputs.join(` ${symbol} `),
    result: formatBigDecimal(resultCoeff, maxScale),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/calculate', (req, res) => {
    const { numbers, operation } = req.body ?? {};
    if (!Array.isArray(numbers)) {
      res.status(400).json({ success: false, error: 'Invalid input format.' });
      return;
    }

    const outcome = performCalculation(numbers, operation);
    res.status(outcome.success ? 200 : 400).json(outcome);
  });

  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
