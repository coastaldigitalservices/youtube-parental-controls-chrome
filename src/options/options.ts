import { StateStore } from "../shared/storage.js";

const store = new StateStore(chrome.storage.local);
void store.read().then((state) => {
  const status = document.querySelector("#status");
  if (status) status.textContent = state.settings.setupComplete ? "Setup complete" : "Parent setup arrives in phase 2.";
});
