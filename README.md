# aihc.app

The landing page for the [AI Haskell Compiler](https://github.com/ai-haskell-compiler/aihc).
It introduces AIHC and links to the manual, the journal, the benchmarks and the other project sites.

## Layout

| Path | Content |
| --- | --- |
| `public/` | The site: plain HTML, CSS and JavaScript. There is no build step. |
| `examples/` | The example programs of the page, each with the output it printed. |
| `scripts/` | The scripts that write the examples into the page and check their output. |
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

## Updating the examples

`examples/index.json` lists the example programs.
Each example has a program, `ID.hs`, and the output that it printed, `ID.out`.
After a change, run the programs and write them into the page:

```console
% AIHC=/path/to/aihc scripts/run-examples.sh --update
% node scripts/examples.mjs
```

The first command compiles and runs each program and saves its output.
The second colors the sources and writes the markup into `public/index.html`.
Do not edit that markup by hand.
The workflow fails when the page is out of date, or when the pinned release of aihc prints different output.
Use only the core libraries in an example, because the compiler in the browser has no other library.

## The live examples

A visitor can edit an example and run it in the browser.
`public/playground.mjs` does this with the [AIHC web kit](https://github.com/ai-haskell-compiler/aihc/blob/main/web-kit/README.md), which each release of aihc publishes at `https://assets.aihc.app/play/releases/<version>/`.
The page downloads nothing from the kit until the visitor edits or runs a program.
An edit downloads the type checker, about 6 MB.
A run downloads the full compiler, about 53 MB.
A browser without JavaScript Promise Integration shows the recorded output only.

To move to a new release of aihc, change the version in two places:

- `KIT` in `public/playground.mjs`.
- `AIHC_VERSION` and `AIHC_SHA256` in `.github/workflows/deploy.yml`.

## Updating the numbers

The performance figures in `public/index.html` are a snapshot.
Copy new ones from the performance table in the AIHC README, and change the date and machine in the fine print below them.
