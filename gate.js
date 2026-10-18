// Passwortschutz der Testfassung: entschlüsselt die App im Browser (PBKDF2 → AES-256-CBC + HMAC-SHA256).
// Der abgeleitete Schlüssel wird auf dem Gerät gemerkt, damit die App danach sofort aufgeht – auch offline.
(() => {
  const STORE = 'notfall-key';
  const payload = JSON.parse(document.getElementById('gate-payload').textContent);
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-pw');
  const error = document.getElementById('gate-error');
  const button = form.querySelector('button');

  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const store = {
    get() { try { return localStorage.getItem(STORE); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(STORE, v); } catch (e) { /* privater Modus: dann eben jedes Mal */ } },
    clear() { try { localStorage.removeItem(STORE); } catch (e) { /* ignorieren */ } },
  };

  const derive = async (password) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: fromB64(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
      base,
      512
    );
  };

  const unlock = async (bits) => {
    const key = new Uint8Array(bits);
    const aesKey = await crypto.subtle.importKey('raw', key.slice(0, 32), { name: 'AES-CBC' }, false, ['decrypt']);
    const macKey = await crypto.subtle.importKey('raw', key.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const iv = fromB64(payload.iv);
    const ct = fromB64(payload.ct);
    const signed = new Uint8Array(iv.length + ct.length);
    signed.set(iv);
    signed.set(ct, iv.length);
    if (!(await crypto.subtle.verify('HMAC', macKey, fromB64(payload.mac), signed))) return false;

    const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, aesKey, ct));
    store.set(toB64(bits));

    // Solange der Browser die Passwortseite noch aufbaut, würde document.open()
    // ignoriert und der Inhalt nur angehängt. Deshalb erst nach dem Laden ersetzen.
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => addEventListener('load', resolve, { once: true }));
    }
    document.open();
    document.write(html);
    document.close();
    return true;
  };

  const showForm = () => {
    document.documentElement.classList.remove('gate-auto');
    input.focus();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Wird geöffnet …';
    try {
      if (await unlock(await derive(input.value))) return;
    } catch (e) { /* falscher Schlüssel oder beschädigte Daten */ }
    button.disabled = false;
    button.textContent = 'App öffnen';
    error.hidden = false;
    input.select();
  });

  const stored = store.get();
  if (stored) {
    unlock(fromB64(stored).buffer).then((ok) => {
      if (!ok) { store.clear(); showForm(); }
    }, () => { store.clear(); showForm(); });
  } else {
    showForm();
  }
})();
