declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_API_URL?: string;
      NEXT_PUBLIC_STREAM_URL?: string;
    };
  }
}

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.NEXT_PUBLIC_API_URL) {
    return window.__ENV__.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

export function getStreamUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.NEXT_PUBLIC_STREAM_URL) {
    return window.__ENV__.NEXT_PUBLIC_STREAM_URL;
  }
  return process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost:8000/radio";
}

export {};
