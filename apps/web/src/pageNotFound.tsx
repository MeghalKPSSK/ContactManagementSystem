import type { CSSProperties } from 'react';

const PageNotFound = () => {
    const styles: Record<string, CSSProperties> = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#f8f9fa',
            fontFamily: 'Arial, sans-serif'
        },
        logo: {
            width: '150px',
            marginBottom: '2rem'
        },
        heading: {
            fontSize: '6rem',
            color: '#dc3545',
            margin: '0',
            fontWeight: 'bold'
        },
        text: {
            fontSize: '1.5rem',
            color: '#6c757d',
            marginTop: '1rem'
        },
        link: {
            color: '#007bff',
            textDecoration: 'none',
            marginTop: '1rem',
            fontSize: '1.1rem'
        }
    };

    return (
        <div style={styles.container}>
            <img 
                src="/logo.png" 
                alt="404 Logo" 
                style={styles.logo}
            />
            <h1 style={styles.heading}>404</h1>
            <p style={styles.text}>Oops! Page not found.</p>
            <p style={styles.text}>The page you are looking for doesn't exist.</p>
            <a href="/" style={styles.link}>
                Return to Home Page
            </a>
        </div>
    );
};

export default PageNotFound;