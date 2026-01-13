import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Polyfill for crypto.randomUUID in non-secure contexts (e.g. HTTP)
if (typeof crypto === 'undefined') {
  // @ts-expect-error crypto may be missing in insecure contexts
  window.crypto = {};
}
if (typeof crypto.randomUUID === 'undefined') {
  // @ts-expect-error randomUUID may be missing in some environments
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

createRoot(document.getElementById("root")!).render(<App />);
