import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import { HeroSectionDemo } from './components/blocks/hero-section-demo';

function App() {
  return (
    <Router basename="/host4u">
      <div className="min-h-screen bg-gray-950">
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1f2937',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1f2937',
              },
            },
          }}
        />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HeroSectionDemo />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;