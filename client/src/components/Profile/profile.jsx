import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faKey, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import styles from './profile.module.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        username: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Add new state for phone error
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            const config = await fetch('/config.json').then(res => res.json());
            const response = await fetch(`${config.apiUrl}/users/user/${userData.uid}`);
            const data = await response.json();

            if (data.success) {
                setUser(data.user);
                setFormData({
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    phone: data.user.phone,
                    email: data.user.email,
                    username: data.user.username
                });
            }
        } catch (error) {
            toast.error(`Error fetching user details: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Update handleChange function to include phone validation
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            // Remove any non-digit characters
            const numbersOnly = value.replace(/\D/g, '');
            
            // Only update if length is <= 10
            if (numbersOnly.length <= 10) {
                setFormData(prev => ({
                    ...prev,
                    [name]: numbersOnly
                }));
            }
            
            // Set error message if needed
            if (numbersOnly.length !== 0 && numbersOnly.length !== 10) {
                setPhoneError('Phone number must be 10 digits');
            } else {
                setPhoneError('');
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Update handleSubmit to check for phone validation
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check for valid phone number
        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        try {
            const config = await fetch('/config.json').then(res => res.json());
            const response = await fetch(`${config.apiUrl}/users/updateUser/${user.uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Profile updated successfully');
                // Update local storage
                const userData = JSON.parse(localStorage.getItem('user'));
                localStorage.setItem('user', JSON.stringify({ ...userData, ...formData }));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Error updating profile: ' + error.message);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        try {
            const config = await fetch('/config.json').then(res => res.json());
            const response = await fetch(`${config.apiUrl}/users/changePassword/${user.uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwordData)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Password changed successfully');
                setShowPasswordModal(false);
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Error changing password: ' + error.message);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.profileContainer}>
            <div className={styles.profileHeader}>
                <div className={styles.headerContent}>
                    <h1>Update Profile</h1>
                </div>
            </div>
            <div className={styles.profileCard}>
                <form onSubmit={handleSubmit} className={styles.profileForm}>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>First Name</label>
                            <div className={styles.textInput}>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Last Name</label>
                            <div className={styles.textInput}>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Username</label>
                            <div className={styles.textInput}>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Phone</label>
                            <div className={styles.textInput}>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter 10-digit number"
                                    required
                                />
                            </div>
                            {phoneError && <span className={styles.errorText}>{phoneError}</span>}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <div className={styles.textInput}>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.updateButton}>
                            <FontAwesomeIcon icon={faSave} className={styles.buttonIcon} />
                            Update Profile
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setShowPasswordModal(true)}
                            title="Change Password"
                        >
                            <FontAwesomeIcon icon={faKey} />
                        </button>
                    </div>
                </form>
            </div>

            {showPasswordModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Change Password</h3>
                            <button 
                                className={styles.closeButton} 
                                onClick={() => setShowPasswordModal(false)}
                                title="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordSubmit}>
                            <div className={styles.formGroup}>
                                <label>Current Password</label>
                                <div className={styles.passwordInput}>
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                    >
                                        <FontAwesomeIcon icon={showPasswords.current ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>New Password</label>
                                <div className={styles.passwordInput}>
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    >
                                        <FontAwesomeIcon icon={showPasswords.new ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Confirm New Password</label>
                                <div className={styles.passwordInput}>
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    >
                                        <FontAwesomeIcon icon={showPasswords.confirm ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.buttonGroup}>
                                <button type="submit" className={styles.submitButton}>
                                    <FontAwesomeIcon icon={faSave} className={styles.buttonIcon} />
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;