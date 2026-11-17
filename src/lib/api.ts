export async function readJsonSafe<T = Record<string, unknown>>(
  res: Response
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}> {
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: 'Network connection interrupted. Please try again.',
    };
  }

  let parsed: (T & { error?: string }) | null = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as T & { error?: string };
    } catch {
      parsed = null;
    }
  }

  if (!res.ok || !parsed) {
    return {
      ok: false,
      status: res.status,
      data: parsed,
      error:
        parsed?.error ||
        (res.status >= 500
          ? 'The server is temporarily busy. Please try again.'
          : res.status === 404
            ? 'Requested service route was not found. Please refresh and try again.'
            : 'Unable to complete your request. Please check your details and try again.'),
    };
  }

  return {
    ok: true,
    status: res.status,
    data: parsed,
  };
}
