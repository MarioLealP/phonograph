# Maintainer: Benylin <lealmariop@gmail.com>
#
# Builds from $startdir (the pkgs/ CI checks out the tagged commit and runs makepkg in place).

pkgname=phonograph
pkgver=0.1.4
pkgrel=1
pkgdesc="The clockmost phonograph: an Endfield Spotify skin (Spicetify) with a live cava spectrum, kept applied across Spotify updates"
arch=('x86_64')
url="https://git.clockmost.com/pkgs/${pkgname}"
license=('MIT')
depends=(
  'gcc-libs' 'glibc'
  'spotify-launcher'        # the official client, user-writable install (Spicetify patches it)
  'cava'                    # phonograph-audio's spectrum source
  'noto-fonts-cjk'          # Japanese / Korean titles
  'ttf-jetbrains-mono' 'inter-font'
  'libnotify'               # spotify-refresh's "skin is off" note
)
makedepends=('rust' 'cargo' 'mold' 'python')
options=('!lto' '!debug')
install="${pkgname}.install"

prepare() {
  cd "$startdir"
  cargo fetch --locked --target "$(rustc -vV | sed -n 's/host: //p')"
}

build() {
  cd "$startdir"
  export RUSTFLAGS="-C link-arg=-fuse-ld=mold ${RUSTFLAGS:-}"
  export CARGO_TARGET_DIR=target
  cargo build --frozen --release
  python phonograph/build.py   # -> Extensions/phonograph.js (the mock + live code, assets inlined)
}

package() {
  cd "$startdir"
  install -Dm755 target/release/phonograph-audio "$pkgdir/usr/bin/phonograph-audio"
  install -Dm755 bin/spotify-refresh "$pkgdir/usr/bin/spotify-refresh"
  install -Dm644 install/phonograph-audio.service "$pkgdir/usr/lib/systemd/user/phonograph-audio.service"

  install -Dm644 Extensions/phonograph.js "$pkgdir/usr/share/phonograph/Extensions/phonograph.js"
  install -Dm644 -t "$pkgdir/usr/share/phonograph/Themes/clockmost" Themes/clockmost/*
  install -Dm644 spotify-launcher.desktop "$pkgdir/usr/share/phonograph/spotify-launcher.desktop"
  install -Dm644 install/setup.d/30-phonograph.sh "$pkgdir/usr/share/clockmost-desktop/setup.d/30-phonograph.sh"

  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -Dm644 README.md "$pkgdir/usr/share/doc/$pkgname/README.md"
}
