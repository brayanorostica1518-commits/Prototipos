import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatInterface from "@/pages/ChatInterface";
import Dashboard from "@/pages/Dashboard";
import ReportGenerator from "@/pages/ReportGenerator";
import Login from "@/pages/Login";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * Main App Component with Security Features:
 * - Error boundary for graceful error handling
 * - Secure routing
 * - Toast notifications
 */
function App() {
  useEffect(() => {
    // Security: Disable right-click in production (optional)
    if (process.env.NODE_ENV === 'production') {
      // Uncomment if you want to disable right-click
      // document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Security: Clear any sensitive data on unload
    const handleUnload = () => {
      // Clear sensitive session data if any
      sessionStorage.removeItem('temp_data');
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ChatInterface />} />
            <Route path="/dashboard/:sessionId" element={<Dashboard />} />
            <Route path="/reports" element={<ReportGenerator />} />
            {/* 404 fallback */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>404</h1>
                  <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
                  <a href="/" className="text-blue-600 hover:underline">Volver al inicio</a>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

export default App;
