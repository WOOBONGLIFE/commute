const CACHE_NAME =
  "employee-pwa-v59";

const CACHE_PREFIX =
  "employee-pwa-";

const APP_SHELL = [
  "./login.html",
  "./pending.html",
  "./index.html",
  "./request.html",
  "./my-submissions.html",
  "./cleaning-checklist.html",
  "./request-supply.html",
  "./request-general.html",
  "./request-leave.html",
  "./notices.html",
  "./mypage.html",
  "./attendancesheet.html",

  "./manifest.json",
  "./icons/app-icon.svg",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",

  "../public/css/common.css",
  "../public/css/mobile.css?v=44",
  "../public/css/login.css",
  "../public/css/index.css?v=48",
  "../public/css/request.css?v=30",
  "../public/css/cleaning-checklist.css?v=30",
  "../public/css/notices.css",
  "../public/css/mypage.css?v=31",
  "../public/css/attendancesheet.css?v=43",

  "../public/js/supabase.js",
  "../public/js/employeeAuth.js",
  "../public/js/common.js",
  "../public/js/mobile.js?v=44",
  "../public/js/my-submissions.js?v=38",
  "../public/js/login.js?v=37",
  "../public/js/index.js?v=55",
  "../public/js/request-menu.js?v=31",
  "../public/js/request.js?v=30",
  "../public/js/cleaning-checklist.js?v=30",
  "../public/js/request-simple.js?v=38",
  "../public/js/request-leave.js",
  "../public/js/notices.js?v=52",
  "../public/js/mypage.js?v=38",
  "../public/js/attendancesheet.js?v=43",
  "../public/js/photo-upload.js",
  "../public/js/pwa-register.js?v=44",
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      (async () => {
        const cache =
          await caches.open(
            CACHE_NAME
          );

        await Promise.allSettled(
          APP_SHELL.map(
            (url) =>
              cache.add(url)
          )
        );

        await self.skipWaiting();
      })()
    );
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      (async () => {
        const cacheNames =
          await caches.keys();

        await Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(
                  CACHE_PREFIX
                ) &&
                cacheName !==
                  CACHE_NAME
            )
            .map(
              (cacheName) =>
                caches.delete(
                  cacheName
                )
            )
        );

        await self.clients.claim();
      })()
    );
  }
);

function createOfflineResponse() {
  const html = `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >
        <meta
          name="theme-color"
          content="#171717"
        >

        <title>인터넷 연결 필요</title>

        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            min-height: 100dvh;
            padding: 24px;
            background: #f5f5f5;
            color: #171717;
            display: grid;
            place-items: center;
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          section {
            width: min(100%, 380px);
            padding: 32px 24px;
            border: 1px solid #e5e5e5;
            border-radius: 20px;
            background: #ffffff;
            text-align: center;
          }

          .icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            border-radius: 18px;
            background: #171717;
            color: #ffffff;
            display: grid;
            place-items: center;
            font-size: 28px;
          }

          h1 {
            font-size: 21px;
            line-height: 30px;
          }

          p {
            margin-top: 10px;
            color: #737373;
            font-size: 14px;
            line-height: 22px;
          }

          button {
            width: 100%;
            min-height: 50px;
            margin-top: 24px;
            border: 0;
            border-radius: 12px;
            background: #171717;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
          }
        </style>
      </head>

      <body>
        <section>
          <div class="icon">!</div>

          <h1>
            인터넷 연결을 확인해 주세요
          </h1>

          <p>
            출퇴근 기록과 직원 정보를 안전하게 확인하려면
            인터넷 연결이 필요합니다.
          </p>

          <button
            type="button"
            onclick="location.reload()"
          >
            다시 연결하기
          </button>
        </section>
      </body>
    </html>
  `;

  return new Response(
    html,
    {
      status: 503,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-store",
      },
    }
  );
}

async function handleNavigation(
  request
) {
  try {
    const response =
      await fetch(request);

    if (response.ok) {
      const cache =
        await caches.open(
          CACHE_NAME
        );

      await cache.put(
        request,
        response.clone()
      );
    }

    return response;
  } catch {
    return createOfflineResponse();
  }
}

async function handleStaticFile(
  request
) {
  try {
    const response =
      await fetch(request);

    if (
      response.ok &&
      response.type === "basic"
    ) {
      const cache =
        await caches.open(
          CACHE_NAME
        );

      await cache.put(
        request,
        response.clone()
      );
    }

    return response;
  } catch {
    const cachedResponse =
      await caches.match(
        request
      );

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      "Network unavailable",
      {
        status: 503,
        statusText:
          "Network unavailable",
      }
    );
  }
}

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const requestUrl =
      new URL(
        request.url
      );

    /*
      Supabase, esm.sh 등 외부 요청은
      서비스 워커에서 캐시하지 않습니다.
    */
    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }

    if (
      request.cache ===
        "only-if-cached" &&
      request.mode !==
        "same-origin"
    ) {
      return;
    }

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        handleNavigation(
          request
        )
      );

      return;
    }

    event.respondWith(
      handleStaticFile(
        request
      )
    );
  }
);

self.addEventListener(
  "message",
  (event) => {
    if (
      event.data?.type ===
      "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }
  }
);