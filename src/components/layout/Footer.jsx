import { Link } from '../../lib/router.jsx';
import { APP_VERSION } from '../../lib/constants.js';
import Icon from '../ui/Icon.jsx';
import Logo from '../ui/Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo size={32} tagline />
          <p className="footer-copy">
            A privacy-first eye-care awareness tool. Webcam frames are analysed on your device and never uploaded,
            stored or shared.
          </p>
          <p className="footer-badge">
            <Icon name="ShieldCheck" size={15} /> 100% local processing
          </p>
        </div>

        <div className="footer-columns">
          <div className="footer-column">
            <h3 className="footer-heading">Product</h3>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/monitor">Live monitoring</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/breaks">Break assistant</Link>
          </div>
          <div className="footer-column">
            <h3 className="footer-heading">Progress</h3>
            <Link to="/achievements">Achievements</Link>
            <Link to="/onboarding">Guided setup</Link>
            <Link to="/settings">Settings</Link>
          </div>
          <div className="footer-column">
            <h3 className="footer-heading">Trust</h3>
            <Link to="/privacy">Privacy &amp; About</Link>
            <Link to="/privacy#data">What is stored</Link>
            <Link to="/privacy#limitations">Limitations</Link>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          © {new Date().getFullYear()} BlinkSync · v{APP_VERSION}
        </p>
        <p className="footer-disclaimer">
          BlinkSync supports eye-care awareness only. It is not a medical device and does not diagnose, treat or
          prevent any condition.
        </p>
      </div>
    </footer>
  );
}
