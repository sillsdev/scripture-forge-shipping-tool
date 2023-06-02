import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { renderToString } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getPage } from "./page.tsx";

export function startServer() {
  serve(async (req) => {
    const path = new URL(req.url).pathname;

    let page;

    if (path === "/") {
      page = await getPage("sf-live", "master");
    } else {
      const match = path.match(/^\/compare\/([-\w]+)\/([-\w]+)$/);
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
}
