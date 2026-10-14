//! phonograph-audio: the music's spectrum for the phonograph (the Spotify skin), live from PipeWire.
//!
//! Spotify retired its audio-analysis API, and the page can't hear Spotify's native playback, so the spectrum comes
//! from the system: `cava` reads what PipeWire plays and prints raw bar frames; this relay serves them over a WebSocket on
//! 127.0.0.1:47862 (WebSockets aren't subject to the page's CORS). cava only runs while at least one page is
//! connected - no visualizer cost when the phonograph is closed.
//!
//! Frame on the wire: BARS bytes, each bar 0..255 (cava's 16-bit values scaled down).

use std::io::{BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Context, Result};
use tungstenite::{Message, WebSocket};

const ADDR: &str = "127.0.0.1:47862";
const BARS: usize = 48;

/// cava, told to print BARS 16-bit little-endian values per frame to stdout. Input is cava's pulse method (served by
/// pipewire-pulse): its "auto" source is the default output's monitor = what you hear. (cava's pipewire method
/// with "auto" listens to the default input - the microphone.)
fn cava_config() -> Result<std::path::PathBuf> {
    let dir = std::env::var_os("XDG_RUNTIME_DIR").context("XDG_RUNTIME_DIR is not set")?;
    let path = std::path::Path::new(&dir).join("phonograph-cava.conf");
    let mut f = std::fs::File::create(&path)?;
    write!(
        f,
        "[general]\nbars = {BARS}\nframerate = 60\nautosens = 1\n\
         [input]\nmethod = pulse\nsource = auto\n\
         [output]\nmethod = raw\nraw_target = /dev/stdout\ndata_format = binary\nbit_format = 16bit\nchannels = mono\n\
         [smoothing]\nnoise_reduction = 55\n"
    )?;
    Ok(path)
}

type Clients = Arc<Mutex<Vec<WebSocket<TcpStream>>>>;

/// Runs cava while there are clients; broadcasts each frame, drops clients that went away.
fn pump(clients: &Clients) -> Result<()> {
    let conf = cava_config()?;
    loop {
        if clients.lock().expect("clients lock").is_empty() {
            std::thread::sleep(Duration::from_millis(200));
            continue;
        }
        let mut cava: Child = Command::new("cava")
            .arg("-p")
            .arg(&conf)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .context("starting cava")?;
        let mut out = BufReader::new(cava.stdout.take().context("cava stdout")?);
        let mut raw = [0u8; BARS * 2];
        while out.read_exact(&mut raw).is_ok() {
            let frame: Vec<u8> = raw.as_chunks::<2>().0.iter().map(|b| (u16::from_le_bytes(*b) >> 8) as u8).collect();
            let mut list = clients.lock().expect("clients lock");
            list.retain_mut(|ws| ws.send(Message::Binary(frame.clone().into())).is_ok());
            if list.is_empty() {
                break; // nobody listening: stop cava until someone connects again
            }
        }
        let _ = cava.kill();
        let _ = cava.wait();
    }
}

fn main() -> Result<()> {
    let listener = TcpListener::bind(ADDR).with_context(|| format!("binding {ADDR}"))?;
    let clients: Clients = Arc::default();
    {
        let clients = clients.clone();
        std::thread::spawn(move || {
            if let Err(e) = pump(&clients) {
                eprintln!("phonograph-audio: {e:#}");
                std::process::exit(1);
            }
        });
    }
    for stream in listener.incoming().flatten() {
        // a stuck client must not stall the broadcast
        let _ = stream.set_write_timeout(Some(Duration::from_millis(50)));
        match tungstenite::accept(stream) {
            Ok(ws) => clients.lock().expect("clients lock").push(ws),
            Err(e) => eprintln!("phonograph-audio: handshake: {e}"),
        }
    }
    Ok(())
}
