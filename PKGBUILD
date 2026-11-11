# Maintainer: Benylin <lealmariop@gmail.com>
#
# Builds from $startdir (the pkgs/ CI checks out the tagged commit and runs makepkg in place).

pkgname=phonograph
pkgver=0.2.0
pkgrel=1
pkgdesc="phonograph-audio: the live cava spectrum (what you hear, 48 bars over a local WebSocket) behind clockmost-shell's MEDIA tab"
arch=('x86_64')
url="https://git.clockmost.com/pkgs/${pkgname}"
license=('MIT')
depends=(
  'gcc-libs' 'glibc'
  'cava'                    # phonograph-audio's spectrum source
)
makedepends=('rust' 'cargo' 'mold')
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
}

package() {
  cd "$startdir"
  install -Dm755 target/release/phonograph-audio "$pkgdir/usr/bin/phonograph-audio"
  install -Dm644 install/phonograph-audio.service "$pkgdir/usr/lib/systemd/user/phonograph-audio.service"

  install -Dm644 install/setup.d/30-phonograph.sh "$pkgdir/usr/share/clockmost-desktop/setup.d/30-phonograph.sh"

  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -Dm644 README.md "$pkgdir/usr/share/doc/$pkgname/README.md"
}
