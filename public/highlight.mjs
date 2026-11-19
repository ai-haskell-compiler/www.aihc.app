// Color a Haskell source. scripts/examples.mjs uses this for the markup of the
// page, and playground.mjs uses it while a visitor edits. Each class is in
// style.css.
const keywords = new Set("case class data default deriving do else forall foreign if import in infix infixl infixr instance let module newtype of qualified then type where".split(" "));
const token = /(\{-#[^]*?#-\})|(\{-[^]*?-\}|--[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')|(\b\d+(?:\.\d+)?\b)|([A-Z][\w']*)|([a-z_][\w']*)|([^])/y;

export const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlight(source) {
  let html = "";
  token.lastIndex = 0;
  for (let match; (match = token.exec(source)); ) {
    const [text, pragma, comment, string, number, upper, lower] = match;
    const kind = pragma ? "p" : comment ? "c" : string ? "s" : number ? "n" : upper ? "t" : lower && keywords.has(lower) ? "k" : null;
    html += kind ? `<span class="h-${kind}">${escape(text)}</span>` : escape(text);
  }
  return html;
}
