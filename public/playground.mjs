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

// The first build in a new worker is slow: the code generator of the compiler
// takes some seconds to start. prewarm pays this before the visitor presses
// Run. It sends a program to the code generator only, which needs the front
// end but not the assembler and the linker.
let warm = false;
let warming = false;
let sample = "";
function prewarm() {
  if (warming || !sample) return;
  warming = true;
  compiler()
    .then((aihc) => aihc.request("compile", sample))
    .then(() => {
      warm = true;
    })
    .catch(() => {
      warming = false;
    });
}

// The last programs that were built, by source. A second run does not build again.
const built = new Map();
const BUILT_LIMIT = 12;

// A spinner that keeps its angle when the markup around it is written again.
const spinner = () => `<span class="example-spin" style="animation-delay:-${Math.round(performance.now() % 900)}ms"></span>`;

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
    // This browser has the compiler already, so starting it downloads nothing.
    else prewarm();
  } catch {}
  for (const hint of hints) hint.textContent = text;
}

function setup(panel) {
  const id = panel.dataset.example;
  const view = panel.querySelector(".example-code");
  const out = panel.querySelector(".example-out code");
  const original = view.textContent.trimEnd();
  sample ||= original + "\n";
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
  let checking = false;
  let since = 0;
  let clock;
  const elapsed = () => `${Math.floor((performance.now() - since) / 1000)} s`;

  const render = () => {
    const source = input.value;
    const busy = state.phase === "building" || abort;
    // A pre does not show a last empty line, but a text area does.
    const last = source.endsWith("\n") || !source ? " " : "";
    view.firstElementChild.innerHTML = highlight(source) + last;
    under.innerHTML = marks(source, state.phase === "building" ? [] : state.diagnostics) + last;
    let html = "";
    if (state.phase === "edited") {
      html = `<span class="t-dim">${checking ? spinner() + "Check the program." : "The program changed. Press Run to build it."}</span>`;
    } else {
      html = `${prompt}aihc build ${id}.hs\n`;
      if (state.phase === "errors") {
        const text = state.diagnostics.map((d) => (d.line ? `${id}.hs:${d.line}:${d.col}: ` : "") + d.message.trimEnd()).join("\n\n");
        html += `<span class="example-err">${escape(text)}</span>`;
        if (checking) html += `\n\n<span class="t-dim">${spinner()}Check the program.</span>`;
      } else if (state.phase === "recorded" || state.phase === "ran") {
        html += `${prompt}./${id}\n<span class="example-stdout">${escape(state.output)}</span>`;
        if (abort) html += `<span class="t-dim example-running">${spinner()}</span>`;
        if (state.tail) html += `<span class="t-dim">${state.output && !state.output.endsWith("\n") ? "\n" : ""}${escape(state.tail)}</span>`;
      } else {
        const building = state.phase === "building";
        html += `<span class="${building ? "t-dim" : "example-err"}">${building ? spinner() : ""}${escape(state.status)}`;
        if (building) html += ` <span class="example-elapsed">${elapsed()}</span>`;
        html += "</span>";
      }
    }
    out.innerHTML = html;
    run.textContent = abort ? "Stop" : state.phase === "building" ? "Building" : "Run";
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
      checking = false;
      state.diagnostics = result.ok ? [] : result.diagnostics;
      state.phase = result.ok ? "edited" : "errors";
      render();
      // The front end is here now. Start the code generator after the first answer.
      prewarm();
    } catch {
      // The Run button reports a kit that does not load.
      if (mine === turn) {
        checking = false;
        render();
      }
    }
  };

  input.addEventListener("input", () => {
    turn++;
    clearTimeout(timer);
    state.tail = "";
    checking = input.value !== original;
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
    checking = false;
    input.value = original;
    Object.assign(state, { phase: "recorded", diagnostics: [], output: recorded, tail: "" });
    render();
  });

  run.addEventListener("click", async () => {
    if (abort) return abort.abort();
    turn++;
    clearTimeout(timer);
    const source = input.value + "\n";
    checking = false;
    since = performance.now();
    // The seconds count up while the build runs, so a slow step does not look stuck.
    clock = setInterval(() => {
      const seconds = out.querySelector(".example-elapsed");
      if (seconds) seconds.textContent = elapsed();
    }, 250);
    Object.assign(state, { phase: "building", status: "Start the compiler.", tail: "" });
    render();
    try {
      const aihc = await compiler();
      let program = built.get(source);
      if (!program) {
        const { missing } = await aihc.downloadSize();
        const first = missing > 1e6 ? `The first run downloads ${megabytes(missing)}. ` : "";
        const result = await aihc.compile(source, {
          onStatus: (status) => {
            state.status = first + status + (warm ? "" : " The first build takes some seconds.");
            render();
          },
        });
        warm = warming = true;
        if (!result.ok) {
          Object.assign(state, { phase: "errors", diagnostics: result.diagnostics });
          return;
        }
        program = result.program;
        if (built.size >= BUILT_LIMIT) built.delete(built.keys().next().value);
        built.set(source, program);
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
      const { exitCode } = await aihc.run(program, { onStdout: print, onStderr: print, signal: abort.signal });
      if (exitCode) state.tail = `[exit code ${exitCode}]`;
    } catch (error) {
      if (error?.name === "AbortError" && state.phase === "ran") state.tail ||= "[stopped]";
      else Object.assign(state, { phase: "failed", status: `The compiler did not run in this browser. ${error?.message ?? error}` });
    } finally {
      clearInterval(clock);
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
