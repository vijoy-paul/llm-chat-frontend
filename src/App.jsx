
import React, { useState, useEffect } from 'react';
import Chatbot from './components/Chatbot';
import './styles/Chatbot.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="error-boundary"
          style={{ 
            maxWidth: 420, 
            margin: '80px auto', 
            padding: 24, 
            background: 'var(--bg, #fff)', 
            borderRadius: 18, 
            boxShadow: '0 4px 32px rgba(0,0,0,0.10)', 
            color: 'var(--text, #222)', 
            textAlign: 'center',
            border: '1px solid var(--border, #e0e0e0)'
          }}
          role="alert"
          aria-live="polite"
        >
          <h2 style={{ color: 'var(--error-color, #d32f2f)', marginBottom: 16 }}>
            Something went wrong
          </h2>
          <p style={{ marginBottom: 16 }}>
            Sorry, the chatbot UI crashed. Please refresh the page or try again later.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--primary, #007aff)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            aria-label="Reload the page"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    
    // Default to dark mode
    return 'dark';
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Apply theme to document immediately to prevent flickering
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1c1c1e' : '#007aff');
    }
    
    // Apple-style loading sequence
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    return () => {
      clearTimeout(initTimer);
      clearTimeout(loadTimer);
    };
  }, [theme]);

  return (
    <ErrorBoundary>
      <main className={`main-bg ${isInitialized ? 'initialized' : 'loading'}`} role="main">
        {!isLoaded && (
          <div className="loading-screen">
            <div className="apple-loader">
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
            </div>
          </div>
        )}
        <div className={`app-container ${isLoaded ? 'loaded' : 'loading'}`}>
          <Chatbot theme={theme} setTheme={setTheme} />
        </div>
      </main>
    </ErrorBoundary>
  );
}

export default App;
