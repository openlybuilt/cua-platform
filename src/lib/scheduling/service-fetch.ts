"use client";

export async function serviceFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);
    if ([502, 503, 504].includes(response.status)) {
      window.dispatchEvent(new Event("openly:service-unavailable"));
    }
    return response;
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError"))
      window.dispatchEvent(new Event("openly:service-unavailable"));
    throw error;
  }
}
