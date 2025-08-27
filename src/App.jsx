
import React, { useState, useEffect } from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    // Optionally log error
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, background: 'var(--bg, #fff)', borderRadius: 18, boxShadow: '0 4px 32px rgba(0,0,0,0.10)', color: 'var(--text, #222)', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>Sorry, the chatbot UI crashed. Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import Chatbot from './components/Chatbot';
import ThemeToggle from './components/ThemeToggle';
import './styles/Chatbot.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <main className="main-bg">
      
        <Chatbot theme={theme} setTheme={setTheme} />
      </main>
    </ErrorBoundary>
  );
}

export default App;
