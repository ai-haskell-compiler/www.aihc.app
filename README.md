# aihc.app

The landing page for the [AI Haskell Compiler](https://github.com/ai-haskell-compiler/aihc).
It introduces AIHC and links to the manual, the journal, the benchmarks and the other project sites.

## Layout

| Path | Content |
| --- | --- |
| `public/` | The site: plain HTML, CSS and JavaScript. There is no build step. |
| `src/worker.js` | Serves `public/` and redirects `www.aihc.app` and plain HTTP to `https://aihc.app`. |
| `wrangler.jsonc` | The Cloudflare Worker configuration and its two custom domains. |

The colors and fonts match blog.aihc.app, perf.aihc.app and docs.aihc.app.

## Preview

Any static file server works:

```console
% python3 -m http.server 8788 --directory public
```

Use `npx wrangler dev` to run the Worker as well, including the redirect.

## Deployment

Every push to `main` deploys to Cloudflare through GitHub Actions.
Pull requests run `wrangler deploy --dry-run`.
The workflow needs two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Updating the numbers

The performance figures in `public/index.html` are a snapshot.
Copy new ones from the performance table in the AIHC README, and change the date and machine in the fine print below them.
