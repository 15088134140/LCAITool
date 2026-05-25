import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { ToastProvider, toast, useToast } from "./components/ui/Toast";
import "./index.css";

// 全局toast事件监听
const ToastListener = () => {
  const { toast: contextToast } = useToast();
  useEffect(() => {
    const handleToast = (event: any) => {
      const { type, message } = event.detail;
      contextToast(type, message);
    };
    window.addEventListener('toast', handleToast);
    return () => window.removeEventListener('toast', handleToast);
  }, [contextToast]);
  return null;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <ToastListener />
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
