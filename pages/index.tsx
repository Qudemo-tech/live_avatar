import { AIChatWidget } from '../AIChatWidget';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a', 
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            borderRadius: '50px',
            padding: '8px 16px',
            marginBottom: '2rem',
            fontSize: '14px',
            color: '#0ea5e9'
          }}>
            ⭐ Next-Gen AI Avatar Technology
          </div>
          
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            background: 'linear-gradient(to right, #ffffff, #0ea5e9, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Meet Your AI<br />
            <span style={{ color: '#0ea5e9' }}>LiveAvatar</span>
          </h1>
          
          <p style={{
            fontSize: '1.25rem',
            color: '#a3a3a3',
            marginBottom: '3rem',
            lineHeight: '1.6'
          }}>
            Experience the future of digital interaction with our revolutionary AI-powered avatars. 
            Real-time conversations, lifelike expressions, and intelligent responses.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{
              background: '#0ea5e9',
              color: '#0a0a0a',
              padding: '1rem 2rem',
              borderRadius: '50px',
              border: 'none',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 40px rgba(14, 165, 233, 0.3)'
            }}>
              ▶ Start Demo
            </button>
            
            <button style={{
              background: 'transparent',
              color: '#ffffff',
              padding: '1rem 2rem',
              borderRadius: '50px',
              border: '1px solid #404040',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '6rem 2rem', background: '#1a1a1a' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Powered by <span style={{ color: '#0ea5e9' }}>Advanced AI</span>
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#a3a3a3' }}>
              Our cutting-edge technology delivers unprecedented realism and intelligence in digital avatars
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              {
                icon: '⚡',
                title: 'Real-time Processing',
                description: 'Lightning-fast response times with advanced neural networks for seamless conversations'
              },
              {
                icon: '🛡️',
                title: 'Enterprise Security',
                description: 'Bank-level encryption and privacy protection for all your sensitive interactions'
              },
              {
                icon: '🌍',
                title: 'Global Accessibility',
                description: 'Multi-language support with cultural awareness for worldwide deployment'
              }
            ].map((feature, index) => (
              <div key={index} style={{
                padding: '2rem',
                background: '#0a0a0a',
                border: '1px solid #404040',
                borderRadius: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#a3a3a3', lineHeight: '1.6' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            See It In <span style={{ color: '#0ea5e9' }}>Action</span>
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#a3a3a3', marginBottom: '3rem' }}>
            Experience the power of our LiveAvatar technology with our interactive debug console
          </p>

          <div style={{
            background: '#1a1a1a',
            border: '1px solid #404040',
            borderRadius: '1.5rem',
            padding: '3rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: '50px',
              padding: '8px 16px',
              marginBottom: '1rem',
              fontSize: '14px',
              color: '#0ea5e9'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#0ea5e9',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              Live Demo Available
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Interactive Debug Console
            </h3>
            <p style={{ color: '#a3a3a3', marginBottom: '2rem' }}>
              Test all features with comprehensive logging, real-time communication, and full control over avatar interactions
            </p>
          </div>

          <a href="/liveavatar-debug" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0ea5e9',
            color: '#0a0a0a',
            padding: '1rem 2rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontSize: '1.125rem',
            fontWeight: '600',
            boxShadow: '0 0 40px rgba(14, 165, 233, 0.3)'
          }}>
            ▶ Launch Debug Console
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '3rem 2rem', 
        borderTop: '1px solid #404040', 
        background: '#1a1a1a',
        textAlign: 'center'
      }}>
        <p style={{ color: '#a3a3a3' }}>
          © 2024 LiveAvatar. Powered by cutting-edge AI technology.
        </p>
      </footer>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}