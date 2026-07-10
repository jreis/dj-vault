import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"

// One-time rename: reis-dj-vault-v1 → dj-vault-v1
try {
  const legacy = localStorage.getItem("reis-dj-vault-v1")
  if (legacy && !localStorage.getItem("dj-vault-v1")) {
    localStorage.setItem("dj-vault-v1", legacy)
    localStorage.removeItem("reis-dj-vault-v1")
  }
} catch {
  // private mode / blocked storage
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
