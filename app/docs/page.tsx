import Link from "next/link";
import Script from "next/script";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">MediaForge API</h1>
        <Link href="/" className="text-xs text-muted underline underline-offset-2 hover:text-fg">
          返回首页
        </Link>
      </div>
      <p className="text-sm text-muted">
        <a className="underline underline-offset-2 hover:text-fg" href="/api/openapi.json" target="_blank" rel="noreferrer">
          /api/openapi.json
        </a>{" "}
        serves the raw spec. Stoplight Elements renders it below.
      </p>
      <div id="docs-root" className="min-h-[60vh] rounded-[var(--radius-card)] border border-line bg-card p-2" />
      <Script src="https://unpkg.com/@stoplight/elements/web-components.min.js" strategy="afterInteractive" />
      <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
      <script
        // inline bootstrap — see /api/openapi.json for the live spec
        dangerouslySetInnerHTML={{
          __html: `
            (async () => {
              const els = window.customElements;
              if (!els?.get('elements-api')) {
                await customElements.whenDefined('elements-api');
              }
              const root = document.getElementById('docs-root');
              const apiEl = document.createElement('elements-api');
              apiEl.apiDescriptionUrl = '/api/openapi.json';
              apiEl.router = 'hash';
              apiEl.layout = 'sidebar';
              root.appendChild(apiEl);
            })();
          `,
        }}
      />
    </div>
  );
}
