// Deno Deploy에서 HTTP 요청을 처리하기 위한 기본 라이브러리를 가져옵니다.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Gemini API의 기본 URL입니다.
const GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com";

// 메인 함수: 들어오는 모든 요청(req)을 처리합니다.
async function handler(req: Request): Promise<Response> {
  // 1. Deno Deploy 환경 변수에서 API 키 목록 가져오기
  // 환경 변수에 'API_KEYS'라는 이름으로 "키1,키2,키3" 처럼 콤마로 구분된 키들을 저장해야 합니다.
  const apiKeysEnv = Deno.env.get("API_KEYS");
  if (!apiKeysEnv) {
    return new Response(JSON.stringify({ error: "API_KEYS environment variable is not set." }), { status: 500 });
  }

  const keys = apiKeysEnv.split(',').map(key => key.trim()).filter(key => key.length > 0);
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: "No valid API keys found in API_KEYS env." }), { status: 500 });
  }

  // 2. API 키 로테이션: 현재 시간(초)을 기준으로 키 목록에서 하나를 무작위로 선택합니다.
  const currentSecond = Math.floor(Date.now() / 1000);
  const selectedKey = keys[currentSecond % keys.length];

  // 3. 클라이언트 요청 URL을 Gemini API URL로 재조립
  // 클라이언트가 "https://내Deno주소/v1beta/models/gemini-pro:generateContent"로 요청하면,
  // Deno는 이 요청의 경로("/v1beta/...") 부분을 가져옵니다.
  const url = new URL(req.url);
  const targetApiUrl = `${GEMINI_API_URL_BASE}${url.pathname}`;

  // 4. 새 URL에 API 키를 쿼리 파라미터로 추가
  const proxiedUrl = new URL(targetApiUrl);
  proxiedUrl.searchParams.set("key", selectedKey);

  // 5. 클라이언트의 원본 요청(메서드, 헤더, 본문)을 그대로 사용하여 Gemini API에 전달
  try {
    const geminiResponse = await fetch(proxiedUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    // 6. Gemini API의 응답을 다시 클라이언트(RikkaHub)에게 그대로 전달
    return new Response(geminiResponse.body, {
      status: geminiResponse.status,
      headers: geminiResponse.headers,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to proxy request to Gemini", details: err.message }), { status: 502 });
  }
}

// Deno Deploy 서버를 실행하고 요청(handler)을 기다립니다.
serve(handler);
