/** A promise a test settles by hand, e.g. to hold a CPU reply in flight. */
export function deferred<T>() {
  let settle = { resolve: (_value: T) => {}, reject: (_reason: unknown) => {} }
  // The executor runs synchronously, so settle holds the real functions before it is spread.
  const promise = new Promise<T>((resolve, reject) => {
    settle = { resolve, reject }
  })
  return { promise, ...settle }
}
