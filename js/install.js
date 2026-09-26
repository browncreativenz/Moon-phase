/* The offer to keep the app on the home screen.
 *
 * Two quite different platforms hide behind one banner. Chrome fires
 * beforeinstallprompt and hands over a real install dialog, so there is a
 * button to press. Safari fires nothing and has no API at all, so the only
 * honest thing is to name the two taps it takes. Anywhere already installed,
 * or once the offer has been turned down, it never appears again.
 */

const STORE = "moon.install";        // "no" once dismissed, or once installed

function readStore(){
  try { return localStorage.getItem(STORE); } catch { return null; }
}
function writeStore(v){
  try { localStorage.setItem(STORE, v); } catch { /* private mode */ }
}

/* Already on the home screen. iOS answers the old proprietary way. */
function installed(){
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || window.navigator.standalone === true;
}

/* iPadOS 13 and later report themselves as a Mac, so a Mac that takes touch
   is really an iPad. */
function isIOS(){
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

export function initInstall(){
  if (installed() || readStore() === "no") return;

  const bar = document.getElementById("install");
  const text = document.getElementById("install-text");
  const add = document.getElementById("install-add");
  const no = document.getElementById("install-no");
  if (!bar) return;

  let prompt = null;

  const show = () => { bar.hidden = false; };
  const hide = (remember) => {
    bar.hidden = true;
    if (remember) writeStore("no");
  };

  no.addEventListener("click", () => hide(true));

  add.addEventListener("click", async () => {
    if (!prompt) return;
    hide(true);
    prompt.prompt();
    prompt = null;
  });

  // Chrome: a real install is available, so offer the button.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    text.textContent = "Keep Moon on your home screen";
    add.hidden = false;
    setTimeout(show, 4000);          // let the moon arrive first
  });

  window.addEventListener("appinstalled", () => hide(true));

  // Safari: no API, so say what to tap.
  if (isIOS()){
    text.textContent = "Add Moon to your home screen: Share, then Add to Home Screen";
    add.hidden = true;
    setTimeout(show, 4000);
  }
}
