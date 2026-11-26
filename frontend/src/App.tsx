import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { warmUpBackend } from './config/api';
import { SandboxProvider } from './context/SandboxContext';
import { ArchitectureExplorer } from './pages/ArchitectureExplorer';
import { ElderSetup } from './pages/ElderSetup';
import { HardwareLab } from './pages/HardwareLab';
import { KioskSandbox } from './pages/KioskSandbox';
import { OverviewTour } from './pages/OverviewTour';

export function App() {
  useEffect(() => {
    void warmUpBackend().catch(() => {
      // Non-blocking background wake-up; BackendStatus exposes status & manual retry.
    });
  }, []);

  return (
    <SandboxProvider>
      <BrowserRouter>
        <div className="app-shell">
          <div className="hover-focus-backdrop" aria-hidden="true" />
          <Navbar />
          <main className="page-container">
            <Routes>
              <Route path="/" element={<OverviewTour />} />
              <Route path="/sandbox" element={<KioskSandbox />} />
              <Route path="/setup" element={<ElderSetup />} />
              <Route path="/hardware" element={<HardwareLab />} />
              <Route path="/architecture" element={<ArchitectureExplorer />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SandboxProvider>
  );
}

export default App;
