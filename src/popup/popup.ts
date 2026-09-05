import { formatDuration } from "../shared/format.js";
import { StateStore } from "../shared/storage.js";

const store = new StateStore(chrome.storage.local);
void store.read().then((state) => {
  const total = state.usage.regularSeconds + state.usage.shortsSeconds;
  const value = document.querySelector("#usage");
  if (value) value.textContent = `${formatDuration(total)} used today`;
});
