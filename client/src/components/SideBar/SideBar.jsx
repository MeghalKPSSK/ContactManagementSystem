import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SideBar.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faHome,
  faAddressBook,
  faGear,
  faSignOut
} from '@fortawesome/free-solid-svg-icons';

export default function SideBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
  };
  let homepath;
  if (window.location.pathname === '/' ){
    homepath = '/'
  }else if (window.location.pathname === '/home'){
    homepath = '/home'
  }else{
    homepath = '/dashboard'
  };
  const menuItems = [
    { path: homepath, icon: faHome, label: 'Dashboard' },
    { path: '/contacts', icon: faAddressBook, label: 'Contacts' },
    { path: '/settings', icon: faGear, label: 'Settings' }
  ];

  return (
    <div className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <button className={styles.toggleButton} onClick={toggleSidebar}>
        <FontAwesomeIcon icon={isExpanded ? faTimes : faBars} />
      </button>
      <nav className={styles.navigation}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={`${styles.menuItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                <FontAwesomeIcon icon={item.icon} className={styles.icon} />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <ul className={styles.menuList}>
          <li>
            <button className={styles.menuItem} onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOut} className={styles.icon} />
              {isExpanded && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
