import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable ALL console output in production for security
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.trace = () => {};
  console.table = () => {};
  console.dir = () => {};
  console.dirxml = () => {};
  console.group = () => {};
  console.groupCollapsed = () => {};
  console.groupEnd = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
  console.timeLog = () => {};
  console.assert = () => {};
  console.count = () => {};
  console.countReset = () => {};
  console.clear = () => {};
}

// Unregister any existing service workers that might be causing issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
