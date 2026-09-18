import { useLayoutEffect, useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import {
  THEME_BOOT_SCRIPT,
  THEME_EVENT,
  THEME_LIGHT,
  currentTheme,
  syncSystemTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import appCss from "../styles.css?url";

const APP_NAME = "Jev Playground";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Give Jev a messy real-world input. It turns it into fast, typed judgments that application code can use.",
      },
      { name: "theme-color", content: THEME_LIGHT },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const sync = () => setDark(currentTheme() === "dark");
    sync();
    setReady(true);
    window.addEventListener(THEME_EVENT, sync);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => {
      syncSystemTheme();
      sync();
    };
    media.addEventListener("change", onMedia);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  return (
    <html
      lang="en"
      className={cn("antialiased", dark && "dark", ready && "theme-ready")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
