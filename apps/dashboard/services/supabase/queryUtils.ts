const isBooleanString = (value: string) => value === "true" || value === "false";
const isNumericString = (value: string) => /^-?\d+(\.\d+)?$/.test(value);
const isDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeQueryString = (queryInput?: string | URLSearchParams) => {
  if (!queryInput) {
    return new URLSearchParams();
  }

  if (queryInput instanceof URLSearchParams) {
    return queryInput;
  }

  const trimmed = queryInput.startsWith("?")
    ? queryInput.slice(1)
    : queryInput;
  return new URLSearchParams(trimmed);
};

const castValue = (value: string) => {
  if (isBooleanString(value)) {
    return value === "true";
  }
  if (isNumericString(value)) {
    return Number(value);
  }
  return value;
};

const applyQueryFilters = (query: any, queryInput?: string | URLSearchParams) => {
  const params = normalizeQueryString(queryInput);

  params.forEach((rawValue, rawKey) => {
    const key = rawKey.trim();
    const value = rawValue.trim();

    if (!key || value === "") {
      return;
    }

    if (value === "null") {
      query = query.is(key, null);
      return;
    }

    if (value === "not_null") {
      query = query.not(key, "is", null);
      return;
    }

    if (key.endsWith("_id") || key === "id") {
      query = query.eq(key, castValue(value));
      return;
    }

    if (isBooleanString(value)) {
      query = query.eq(key, castValue(value));
      return;
    }

    if (isDateString(value)) {
      query = query.eq(key, value);
      return;
    }

    query = query.ilike(key, `%${value}%`);
  });

  return query;
};

export { normalizeQueryString, applyQueryFilters };
