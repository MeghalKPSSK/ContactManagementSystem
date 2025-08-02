import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SideBar.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faHome,
  faAddressBook,
  faSignOut,
  faUser,
  faUsers,
  faDragon
} from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';
import { addProfileUpdateListener } from '../../utils/eventUtils';

export default function SideBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const location = useLocation();

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.uid) {
        // Update localStorage data first
        setUserData(user);
        
        // Check if localStorage has profile image
        if (user.profileImage) {
          const imageUrl = apiService.getImageUrl(user.profileImage);
          setProfileImageUrl(`${imageUrl}?t=${Date.now()}`);
        }
        
        // Then fetch fresh data from API
        const data = await apiService.fetch(`/users/user/${user.uid}`, {
          method: 'GET'
        });
        
        if (data.success) {
          setUserData(data.user);
          if (data.user.profileImage) {
            const imageUrl = apiService.getImageUrl(data.user.profileImage);
            // Add timestamp to force refresh if image changed
            const refreshedImageUrl = `${imageUrl}?t=${Date.now()}`;
            setProfileImageUrl(refreshedImageUrl);
          } else {
            setProfileImageUrl(null);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log('User from localStorage:', user); // Debug log
        if (user && user.uid) {
          // Set initial data from localStorage
          setUserData(user);
          console.log('Initial user from localStorage:', user); // Debug log
          
          // Check if localStorage has profile image
          if (user.profileImage) {
            console.log('Profile image from localStorage:', user.profileImage); // Debug log
            const imageUrl = apiService.getImageUrl(user.profileImage);
            setProfileImageUrl(`${imageUrl}?t=${Date.now()}`);
          }
          
          // Then fetch fresh data from API
          const data = await apiService.fetch(`/users/user/${user.uid}`, {
            method: 'GET'
          });
          
          console.log('API response:', data); // Debug log
          if (data.success) {
            setUserData(data.user);
            console.log('User data set:', data.user); // Debug log
            if (data.user.profileImage) {
              const imageUrl = apiService.getImageUrl(data.user.profileImage);
              console.log('Generated image URL:', imageUrl); // Debug log
              setProfileImageUrl(`${imageUrl}?t=${Date.now()}`);
            } else {
              console.log('No profile image found for user'); // Debug log
              setProfileImageUrl(null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to localStorage data if API fails
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          setUserData(user);
        }
      }
    };

    fetchUserData();

    // Listen for profile update events using utility function
    const removeListener = addProfileUpdateListener((detail) => {
      console.log('Profile update event received in sidebar:', detail);
      refreshUserData();
    });

    // Cleanup event listener
    return removeListener;
  }, []);

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
    { path: '/dragon', icon: faDragon, label: 'Dragon' },
    { path: homepath, icon: faHome, label: 'Dashboard' },
    { path: '/contacts', icon: faAddressBook, label: 'Contacts' },
    { path: '/profile', icon: faUser, label: 'Profile' },
    { path: '/groups', icon: faUsers, label: 'Groups' }
  ];

  return (
    <div className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <button className={styles.toggleButton} onClick={toggleSidebar}>
        <FontAwesomeIcon icon={isExpanded ? faTimes : faBars} />
      </button>
      
      {/* User Profile Section - Expanded */}
      {isExpanded && (
        <div className={styles.userProfile}>
          <div className={styles.userImageContainer}>
            {profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt="Profile" 
                className={styles.userImage}
                onError={(e) => {
                  console.log('Image load error:', e.target.src);
                  setProfileImageUrl(null);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', profileImageUrl);
                }}
              />
            ) : (
              <div className={styles.defaultUserImage}>
                <FontAwesomeIcon icon={faUser} />
              </div>
            )}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {userData ? `${userData.firstName} ${userData.lastName}` : 'Loading...'}
            </span>
          </div>
        </div>
      )}
      
      {/* User Profile Section - Collapsed */}
      {!isExpanded && (
        <div className={styles.collapsedProfile}>
          <div className={styles.collapsedImageContainer}>
            {profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt="Profile" 
                className={styles.collapsedUserImage}
                onError={(e) => {
                  console.log('Collapsed image load error:', e.target.src);
                  setProfileImageUrl(null);
                }}
              />
            ) : (
              <div className={styles.collapsedDefaultImage}>
                <FontAwesomeIcon icon={faUser} />
              </div>
            )}
          </div>
        </div>
      )}
      
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
