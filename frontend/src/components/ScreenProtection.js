import { useEffect } from "react";

export default function ScreenProtection() {
  useEffect(() => {
    // Block keyboard shortcuts for screenshots/dev tools
    const handleKeyDown = (e) => {
      // PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        document.body.style.display = "none";
        setTimeout(() => { document.body.style.display = ""; }, 100);
        return false;
      }
      // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+U (View Source), F12
      if ((e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "S" || e.key === "s")) ||
          (e.ctrlKey && (e.key === "U" || e.key === "u")) ||
          e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+P (Print)
      if (e.ctrlKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        return false;
      }
      // Cmd+Shift+3/4/5 on Mac (screenshot)
      if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
        e.preventDefault();
        document.body.style.display = "none";
        setTimeout(() => { document.body.style.display = ""; }, 100);
        return false;
      }
    };

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Detect visibility change (screen recording indicator)
    const handleVisibilityChange = () => {
      // Optional: could add watermark on tab switch
    };

    // Block drag (prevents saving images)
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("dragstart", handleDragStart);

    // Inject CSS protection styles
    const style = document.createElement("style");
    style.id = "screen-protection-styles";
    style.textContent = `
      /* Disable text/image selection site-wide */
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      /* Allow selection only in input fields */
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      /* Prevent image saving */
      img, video {
        pointer-events: none !important;
        -webkit-user-drag: none !important;
        user-drag: none !important;
      }
      /* Re-enable pointer events for interactive elements */
      button img, a img, [role="button"] img {
        pointer-events: auto !important;
      }
      /* Hide content from print */
      @media print {
        body * { display: none !important; }
        body::after {
          content: "Conteudo protegido. Impressao nao permitida.";
          display: block !important;
          font-size: 24px;
          text-align: center;
          padding: 100px 20px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("dragstart", handleDragStart);
      const s = document.getElementById("screen-protection-styles");
      if (s) s.remove();
    };
  }, []);

  return null;
}
