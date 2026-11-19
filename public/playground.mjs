// Make the examples editable and runnable. main.js loads this module only in a
// browser that can run the compiler. Without it, each example keeps the output
// that scripts/run-examples.sh recorded.
import { escape, highlight } from "./highlight.mjs";

// The AIHC web kit of one release. To move to a new release, change the version.
const KIT = "https://assets.aihc.app/play/releases/0.2.1/";
// A program that prints more than this is stopped.
const OUTPUT_LIMIT = 64 * 1024;

// The kit fetches only its manifest here. The first check downloads the front
// end, and the first run downloads the assembler and the linker.
let kit;
const compiler = () =>
  (kit ??= import(KIT + "aihc.js")
    .then(({ createCompiler }) => createCompiler(KIT + "manifest.json"))
    .catch((error) => {
      kit = undefined;
      throw error;
    }));

// The first build in a new worker is slow, because the engine optimizes the compiler while it runs.
let warm = false;

const megabytes = (bytes) => `${Math.round(bytes / 1e6)} MB`;
const prompt = '<span class="t-prompt">%</span> ';

// Underline the ranges of the diagnostics. The result lies over the source.
function marks(source, diagnostics) {
  const starts = [0];
  for (let i = source.indexOf("\n"); i >= 0; i = source.indexOf("\n", i + 1)) starts.push(i + 1);
  const offset = (line, col) => Math.min(source.length, (starts[Math.min(line, starts.length) - 1] ?? 0) + col - 1);
  const ranges = diagnostics
    .filter((d) => d.line)
    .map((d) => {
      const from = offset(d.line, d.col);
      return [from, Math.max(from + 1, offset(d.endLine ?? d.line, d.endCol ?? d.col + 1))];
    })
    .sort((a, b) => a[0] - b[0]);
  let html = "";
  let at = 0;
  for (const [from, to] of ranges) {
    if (from < at) continue;
    html += `${escape(source.slice(at, from))}<mark>${escape(source.slice(from, to))}</mark>`;
    at = to;
  }
  return html + escape(source.slice(at));
}

const hints = [];
async function showDownload() {
  let text = "Runs in your browser.";
  try {
    const { missing } = await (await compiler()).downloadSize();
    if (missing > 1e6) text += ` The first run downloads ${megabytes(missing)}.`;
  } catch {}
  for (const hint of hints) hint.textContent = text;
}

function setup(panel) {
  const id = panel.dataset.example;
  const view = panel.querySelector(".example-code");
  const out = panel.querySelector(".example-out code");
  const original = view.textContent.trimEnd();
  const recorded = panel.querySelector(".example-stdout").textContent;

  // The text area lies over the colored source and has transparent text.
  const editor = document.createElement("div");
  editor.className = "editor";
  view.replaceWith(editor);
  const under = document.createElement("pre");
  under.className = "ed-marks";
  under.setAttribute("aria-hidden", "true");
  const input = document.createElement("textarea");
  input.value = original;
  input.spellcheck = false;
  input.wrap = "off";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  input.setAttribute("autocorrect", "off");
  input.setAttribute("aria-label", `Source of ${id}.hs`);
  const layers = document.createElement("div");
  layers.className = "ed-layers";
  layers.append(view, under, input);
  editor.append(layers);

  const actions = document.createElement("div");
  actions.className = "example-actions";
  const run = document.createElement("button");
  run.type = "button";
  run.className = "example-go";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "example-reset";
  reset.textContent = "Reset";
  const hint = document.createElement("span");
  hint.className = "example-hint";
  hint.textContent = "Runs in your browser.";
  hints.push(hint);
  actions.append(run, reset, hint);
  panel.querySelector(".example-note").after(actions);
  out.parentElement.setAttribute("aria-live", "polite");

  // phase: recorded | edited | building | errors | ran | failed
  const state = { phase: "recorded", diagnostics: [], output: recorded, status: "", tail: "" };
  let turn = 0;
  let timer;
  let abort;

  const render = () => {
    const source = input.value;
    const busy = state.phase === "building" || abort;
    // A pre does not show a last empty line, but a text area does.
    const last = source.endsWith("\n") || !source ? " " : "";
    view.firstElementChild.innerHTML = highlight(source) + last;
    under.innerHTML = marks(source, state.phase === "building" ? [] : state.diagnostics) + last;
    let html = "";
    if (state.phase === "edited") {
      html = '<span class="t-dim">The program changed. Press Run to build it.</span>';
    } else {
      html = `${prompt}aihc build ${id}.hs\n`;
      if (state.phase === "errors") {
        const text = state.diagnostics.map((d) => (d.line ? `${id}.hs:${d.line}:${d.col}: ` : "") + d.message.trimEnd()).join("\n\n");
        html += `<span class="example-err">${escape(text)}</span>`;
      } else if (state.phase === "recorded" || state.phase === "ran") {
        html += `${prompt}./${id}\n<span class="example-stdout">${escape(state.output)}</span>`;
        if (state.tail) html += `<span class="t-dim">${state.output && !state.output.endsWith("\n") ? "\n" : ""}${escape(state.tail)}</span>`;
      } else {
        html += `<span class="${state.phase === "failed" ? "example-err" : "t-dim"}">${escape(state.status)}</span>`;
      }
    }
    out.innerHTML = html;
    run.textContent = abort ? "Stop" : "Run";
    run.disabled = state.phase === "building";
    input.readOnly = Boolean(busy);
    reset.hidden = source === original && state.phase === "recorded";
    reset.disabled = Boolean(busy);
  };

  // Type-check a short time after the last key.
  const check = async () => {
    const mine = ++turn;
    const source = input.value;
    try {
      const result = await (await compiler()).check(source + "\n");
      if (mine !== turn) return;
      state.diagnostics = result.ok ? [] : result.diagnostics;
      state.phase = result.ok ? "edited" : "errors";
      render();
    } catch {
      // The Run button reports a kit that does not load.
    }
  };

  input.addEventListener("input", () => {
    turn++;
    clearTimeout(timer);
    state.tail = "";
    if (input.value === original) {
      Object.assign(state, { phase: "recorded", diagnostics: [], output: recorded });
    } else {
      if (state.phase !== "errors") state.phase = "edited";
      timer = setTimeout(check, 350);
    }
    render();
  });

  reset.addEventListener("click", () => {
    turn++;
    clearTimeout(timer);
    input.value = original;
    Object.assign(state, { phase: "recorded", diagnostics: [], output: recorded, tail: "" });
    render();
  });

  run.addEventListener("click", async () => {
    if (abort) return abort.abort();
    turn++;
    clearTimeout(timer);
    const source = input.value + "\n";
    Object.assign(state, { phase: "building", status: "Start the compiler.", tail: "" });
    render();
    try {
      const aihc = await compiler();
      const { missing } = await aihc.downloadSize();
      const first = missing > 1e6 ? `The first run downloads ${megabytes(missing)}. ` : "";
      const built = await aihc.compile(source, {
        onStatus: (status) => {
          state.status = first + status + (warm ? "" : " The first build takes some seconds.");
          render();
        },
      });
      warm = true;
      if (!built.ok) {
        Object.assign(state, { phase: "errors", diagnostics: built.diagnostics });
        return;
      }
      Object.assign(state, { phase: "ran", diagnostics: [], output: "" });
      abort = new AbortController();
      const print = (text) => {
        if (abort.signal.aborted) return;
        state.output += text;
        if (state.output.length > OUTPUT_LIMIT) {
          state.output = state.output.slice(0, OUTPUT_LIMIT);
          state.tail = "[stopped: too much output]";
          abort.abort();
          return;
        }
        // Add to the output in place. A program can print many small pieces.
        out.querySelector(".example-stdout").append(text);
      };
      render();
      const { exitCode } = await aihc.run(built.program, { onStdout: print, onStderr: print, signal: abort.signal });
      if (exitCode) state.tail = `[exit code ${exitCode}]`;
    } catch (error) {
      if (error?.name === "AbortError" && state.phase === "ran") state.tail ||= "[stopped]";
      else Object.assign(state, { phase: "failed", status: `The compiler did not run in this browser. ${error?.message ?? error}` });
    } finally {
      abort = undefined;
      render();
      showDownload();
    }
  });

  render();
}

const panels = document.querySelectorAll("[data-example]");
panels.forEach(setup);

// Learn the size of the download when the examples come near.
const box = document.querySelector(".examples");
if (box && "IntersectionObserver" in window) {
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      showDownload();
    },
    { rootMargin: "400px" },
  );
  near.observe(box);
}
