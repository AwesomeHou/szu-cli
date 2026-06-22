export function successEnvelope(data, meta) {
  return {
    ok: true,
    data,
    meta: withDefaults(meta)
  };
}

export function errorEnvelope(error, meta) {
  return {
    ok: false,
    error,
    meta: withDefaults(meta)
  };
}

export function writeJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function withDefaults(meta) {
  return {
    gateway: 'auto',
    backend: 'playwright',
    ...meta
  };
}
