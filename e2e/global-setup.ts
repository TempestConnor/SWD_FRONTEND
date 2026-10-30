const BACKEND_URL = 'http://localhost:8080/api/hello'

/** Fails fast with a clear message instead of every test timing out when the backend is down. */
export default async function globalSetup() {
  try {
    const response = await fetch(BACKEND_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (cause) {
    throw new Error(
      `The backend is not reachable at ${BACKEND_URL}. Start it before running the end-to-end tests ` +
        `(see e2e/README.md).`,
      { cause },
    )
  }
}
