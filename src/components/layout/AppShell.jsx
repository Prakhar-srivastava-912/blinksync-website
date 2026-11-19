import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ComfortOverlay from './ComfortOverlay.jsx';
import BreakOverlay from './BreakOverlay.jsx';
import Toaster from '../ui/Toaster.jsx';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="app-main">
        {children}
      </main>
      <Footer />
      <ComfortOverlay />
      <BreakOverlay />
      <Toaster />
    </div>
  );
}
