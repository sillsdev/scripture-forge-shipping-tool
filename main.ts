import { renderToString } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getPage } from "./page.tsx";

function getContentType(path: string): string {
  if (path.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (path.endsWith(".gif")) {
    return "image/gif";
  }
  return "application/octet-stream";
}

export default Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;

  if (path === "/favicon.ico") {
    try {
      const file = await Deno.readFile("./images/favicon-steamboat.ico");
      return new Response(file, {
        headers: {
          "content-type": "image/x-icon",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  if (path.startsWith("/images/")) {
    const filePath = `.${path}`;
    try {
      const file = await Deno.readFile(filePath);
      return new Response(file, {
        headers: {
          "content-type": getContentType(path),
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  let page;

  if (path === "/") {
    page = await getPage("sf-live", "sf-qa");
  } else {
    const match = path.match(/^\/compare\/([-\w.]+)\/([-\w.]+)$/);
    if (match) {
      const base = match[1];
      const head = match[2];
      const html = await renderToString(await getPage(base, head));
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    }
  }

  if (page) {
    const html = await renderToString(page);
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    });
  } else {
    return new Response("Not found", { status: 404 });
  }
});
