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

const root = createRoot(document.getElementById("root")!)

async function boot() {
  const variant = new URLSearchParams(window.location.search).get("variant")
  if (import.meta.env.DEV && variant) {
    const { ListeningRoomPrototype } = await import(
      "./prototype/ListeningRoomPrototype.tsx"
    )
    root.render(
      <StrictMode>
        <ListeningRoomPrototype />
      </StrictMode>,
    )
    return
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
