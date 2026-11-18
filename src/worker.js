// Serves the static site and sends www.aihc.app to aihc.app.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.aihc.app') {
      url.hostname = 'aihc.app';
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
