import { Link } from '../lib/router.jsx';
import Icon from '../components/ui/Icon.jsx';

export default function NotFoundPage() {
  return (
    <div className="container page notfound">
      <span className="notfound-icon">
        <Icon name="EyeOff" size={40} />
      </span>
      <p className="eyebrow">404</p>
      <h1>This page blinked out of view</h1>
      <p>The link you followed does not exist in BlinkSync. Your camera and saved statistics are untouched.</p>
      <div className="btn-row">
        <Link to="/dashboard" className="btn btn-primary">
          <Icon name="ArrowLeft" size={17} />
          <span>Back to dashboard</span>
        </Link>
        <Link to="/" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
