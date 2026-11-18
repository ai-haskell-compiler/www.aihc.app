// Serves the static site. Sends www.aihc.app and plain HTTP to https://aihc.app.
const HOSTS = new Set(['aihc.app', 'www.aihc.app']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Other hostnames (local previews, workers.dev) are served as they are.
    if (HOSTS.has(url.hostname) && (url.hostname !== 'aihc.app' || url.protocol !== 'https:')) {
      url.hostname = 'aihc.app';
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
