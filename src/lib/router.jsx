import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);

export function readPath() {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '');
  return hash === '' ? '/' : hash;
}

function normalize(path) {
  if (!path) return '/';
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
}

/** Split "#/privacy#data" into a route path and an optional in-page anchor. */
function parseLocation() {
  const raw = readPath();
  const [pathPart, anchor = ''] = raw.split('#');
  return { path: normalize(pathPart), anchor };
}

/**
 * Minimal hash router. Hash routing keeps deep links working on any static host
 * (including GitHub Pages) without server rewrites.
 */
export function RouterProvider({ children }) {
  const [location, setLocation] = useState(parseLocation);
  const path = location.path;

  useEffect(() => {
    const onChange = () => setLocation(parseLocation());
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/');
      setLocation(parseLocation());
    }
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to, { replace = false, scroll = true } = {}) => {
    const target = normalize(to);
    if (readPath() === target) {
      setLocation(parseLocation());
      return;
    }
    if (replace) {
      window.history.replaceState(null, '', `#${target}`);
      setLocation(parseLocation());
    } else {
      window.location.hash = target;
      setLocation(parseLocation());
    }
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (location.anchor) {
      const target = document.getElementById(location.anchor);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location]);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used inside <RouterProvider>');
  return context;
}

export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  return (      <a
      href={`#${normalize(to)}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export { normalize as normalizePath };
