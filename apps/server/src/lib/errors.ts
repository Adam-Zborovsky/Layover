export function describeError(err: unknown): { status?: number; message: string } {
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  const message = (err as any)?.message ?? String(err);
  return { status, message };
}

export function formatErrorForStorage(err: unknown): string {
  const { status, message } = describeError(err);
  const prefix = status ? `[${status}] ` : "";
  return `${prefix}${message}`.slice(0, 500);
}
