// mod.ts
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

// Google Gemini API의 기본 URL
const GEMINI_API_BASE_URL = Deno.env.get("GEMINI_API_BASE_URL") |

| "https://generativelanguage.googleapis.com";

// 환경 변수에서 API 키 목록을 가져옵니다. 쉼표로 구분된 문자열이나 JSON 배열 형식을 지원합니다.
let apiKeys: string =;
try {
  apiKeys = JSON.parse(Deno.env.get("API_KEYS") |

| "");
} catch {
  apiKeys = (Deno.env.get("API_KEYS") |

| "").split(',').map(k => k.trim()).filter(Boolean);
}

// 프록시 접근을 제어하기 위한 선택적 접근 토큰
const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN");

let currentKeyIndex = 0;

async function handler(req: Request): Promise<Response> {
  // 접근 토큰이 설정된 경우, 요청 헤더에서 토큰을 확인합니다.
  if (ACCESS_TOKEN && req.headers.get("X-Access-Token")!== ACCESS_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const targetUrl = `${GEMINI_API_BASE_URL}${url.pathname}${url.search}`;

  // 라운드 로빈 방식으로 API 키를 선택합니다.
  const apiKey = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;

  const headers = new Headers(req.headers);
  // Gemini API가 요구하는 'x-goog-api-key' 헤더에 선택된 키를 설정합니다.
  headers.set("x-goog-api-key", apiKey);
  // 호스트 헤더를 실제 API 호스트로 변경합니다.
  headers.set("host", new URL(GEMINI_API_BASE_URL).host);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
    });

    // 만약 429 (Too Many Requests) 에러가 발생하면 다음 키로 재시도하는 로직을 추가할 수 있습니다.
    // 본 예제에서는 단순성을 위해 재시도 로직은 생략합니다.
    // 실제 운영 환경에서는 재시도 및 키 상태 관리 로직을 추가하는 것이 좋습니다.

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    return new Response(error.toString(), { status: 500 });
  }
}

serve(handler);
