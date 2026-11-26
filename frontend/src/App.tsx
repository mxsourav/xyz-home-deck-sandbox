import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ElderSetup } from './pages/ElderSetup';
import { HardwareLab } from './pages/HardwareLab';
import { KioskSandbox } from './pages/KioskSandbox';
import { OverviewTour } from './pages/OverviewTour';

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<OverviewTour />} />
            <Route path="/sandbox" element={<KioskSandbox />} />
            <Route path="/setup" element={<ElderSetup />} />
            <Route path="/hardware" element={<HardwareLab />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
