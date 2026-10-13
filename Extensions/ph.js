// clockmost: open the phonograph page at startup and whenever Spotify navigates to its own home
(function home() {
  if (!Spicetify?.Platform?.History) return setTimeout(home, 200);
  const H = Spicetify.Platform.History;
  if (H.location.pathname !== "/phonograph") H.push("/phonograph");
  H.listen((loc) => { if (loc.pathname === "/") H.push("/phonograph"); });
})();
