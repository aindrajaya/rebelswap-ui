import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for material icons
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
document.head.appendChild(linkElement);

createRoot(document.getElementById("root")!).render(<App />);
