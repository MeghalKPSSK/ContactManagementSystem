import React from 'react'
import styles from './Main.module.css'
import { useLocation } from 'react-router-dom'
import Contacts from '../Contacts/Contacts'

export default function Main() {
  const location = useLocation();

  const renderComponent = () => {
    switch (location.pathname) {
      // case '/contacts':
      //   return <Contacts />;
      case '/home':
      case '/':
      case '/dashboard':
        return <div className={styles.dashboard}>Welcome to Dashboard</div>;
      case '/settings':
        return <div className={styles.settings}>Settings Page</div>;
      default:
        return <div className={styles.defaultMessage}>Please select a menu item</div>;
    }
  };

  return (
    <div className={styles.container}>
      {renderComponent()}
    </div>
  );
}
