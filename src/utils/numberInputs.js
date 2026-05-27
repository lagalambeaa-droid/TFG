export const sanitizeIntegerInput = (value) => {
  const digits = String(value || "").replace(/[^0-9]/g, "");

  if (!digits) {
    return "";
  }

  return digits.replace(/^0+(?!$)/, "");
};

export const sanitizeDecimalInput = (value) => {
  const normalized = String(value || "")
    .replace(/\./g, ",")
    .replace(/[^0-9,]/g, "");

  if (!normalized) {
    return "";
  }

  const startsWithSeparator = normalized.startsWith(",");
  const parts = normalized.split(",");
  const integerPart = sanitizeIntegerInput(parts[0]);
  const decimalPart = parts.slice(1).join("");
  const safeIntegerPart = startsWithSeparator ? "0" : integerPart;

  if (parts.length === 1) {
    return safeIntegerPart;
  }

  if (!decimalPart && normalized.endsWith(",")) {
    return `${safeIntegerPart},`;
  }

  return `${safeIntegerPart},${decimalPart}`;
};

export const parseDecimalInput = (value) => {
  const normalized = String(value || "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDecimalDisplay = (
  value,
  { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}
) =>
  parseDecimalInput(value).toLocaleString("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
