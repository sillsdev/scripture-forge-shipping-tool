import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { renderToString } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getPage } from "./page.tsx";

export function startServer() {
  serve(async () => {
    const html = await renderToString(await getPage());
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    });
  });
}
