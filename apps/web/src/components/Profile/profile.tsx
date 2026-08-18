// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faKey, faSave, faTimes, faCamera, faUser, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import styles from './profile.module.css';
import CustomFields from './CustomFields';
import apiService from '../../services/apiService';
import { dispatchProfileUpdate } from '../../utils/eventUtils';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showCustomFields, setShowCustomFields] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        username: '',
        profileImage: null
    });

    // Add new state for image handling
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

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
            const data = await apiService.getUserById(userData.uid);

            if (data.success) {
                setUser(data.user);
                setFormData({
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    phone: data.user.phone,
                    email: data.user.email,
                    username: data.user.username,
                    profileImage: data.user.profileImage
                });
                
                // Set profile image preview if user has one
                if (data.user.profileImage) {
                    setProfileImagePreview(apiService.getImageUrl(data.user.profileImage));
                }
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

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                return;
            }
            
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }
            
            setSelectedFile(file);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove image
    const handleRemoveImage = () => {
        setSelectedFile(null);
        setProfileImagePreview(null);
        setFormData(prev => ({
            ...prev,
            profileImage: null
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Update handleSubmit to check for phone validation and handle file upload
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Test toast to verify it's working
        console.log('Form submitted, testing toast'); // Debug log
        
        // Check for valid phone number
        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        try {
            const userData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email,
                username: formData.username
            };
            
            // Add profile image if selected
            if (selectedFile) {
                userData.profileImage = selectedFile;
            }

            const data = await apiService.updateUser(user.uid, userData);
            
            console.log('Profile update response:', data); // Debug log
            
            if (data.success) {
                console.log('Profile update successful, showing toast'); // Debug log
                toast.success('Profile updated successfully');
                // Update local storage and state
                const localUserData = JSON.parse(localStorage.getItem('user'));
                const updatedUserData = { ...localUserData, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                
                // Update local state
                setUser(data.user);
                setFormData({
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    phone: data.user.phone,
                    email: data.user.email,
                    username: data.user.username,
                    profileImage: data.user.profileImage
                });
                
                // Update profile image preview
                if (data.user.profileImage) {
                    setProfileImagePreview(apiService.getImageUrl(data.user.profileImage));
                }
                
                // Clear selected file
                setSelectedFile(null);
                
                // Dispatch custom event to notify sidebar of profile update
                dispatchProfileUpdate(data.user);
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
            const data = await apiService.changePassword(user.uid, passwordData);
            
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
        return (
            <div className={styles.profileContainer}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faUser} spin />
                    <p>Loading profile...</p>
                </div>
            </div>
        );
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
                    {/* Plan Section */}
                    {user && (
                        <div className={styles.formGroup}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--accent-border)', borderRadius: 6, textTransform: 'capitalize' }}>
                                   Plan: {user.plan.toUpperCase() || 'FREE'}
                                </span>
                                <button
                                    type="button"
                                    className={`${styles.iconButton} ${styles.upgradeIcon}`}
                                    onClick={() => setShowPlanModal(true)}
                                    title="Upgrade Plan"
                                    aria-label="Upgrade Plan"
                                >
                                    <FontAwesomeIcon icon={faArrowUp} />
                                </button>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Upgrade your plan</span>
                            </div>
                        </div>
                    )}
                    {/* Profile Image Section */}
                    <div className={styles.profileImageSection}>
                        <div className={styles.imageUploadContainer}>
                            <div className={styles.imagePreview} onClick={() => document.getElementById('profileImageInput').click()}>
                                {profileImagePreview ? (
                                    <>
                                        <img 
                                            src={profileImagePreview} 
                                            alt="Profile" 
                                            className={styles.profileImage}
                                        />
                                        <div className={styles.imageOverlay}>
                                            <FontAwesomeIcon icon={faCamera} className={styles.overlayIcon} />
                                            <span className={styles.overlayText}>Change Photo</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.placeholderImage}>
                                        <FontAwesomeIcon icon={faCamera} className={styles.placeholderIcon} />
                                        <span className={styles.placeholderText}>Add Photo</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className={styles.fileInput}
                                    id="profileImageInput"
                                />
                            </div>
                            {profileImagePreview && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className={styles.removeButton}
                                >
                                    <FontAwesomeIcon icon={faTimes} className={styles.buttonIcon} />
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>
                    
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
                        <button
                            type="button"
                            className={styles.updateButton}
                            onClick={() => setShowCustomFields(true)}
                        >
                            Manage Custom Fields
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
            {showPlanModal && user && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Choose a Plan</h3>
                            <button 
                                className={styles.closeButton} 
                                onClick={() => setShowPlanModal(false)}
                                title="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = new FormData(e.currentTarget);
                            const plan = form.get('plan');
                            try {
                                const resp = await apiService.updateUserPlan(user.uid, plan);
                                if (resp.success) {
                                    toast.success('Plan updated successfully');
                                    setUser(resp.user);
                                    // Update localStorage copy
                                    const localUser = JSON.parse(localStorage.getItem('user')) || {};
                                    localStorage.setItem('user', JSON.stringify({ ...localUser, ...resp.user }));
                                    // Inform other parts of app (e.g., custom fields modal)
                                    dispatchProfileUpdate(resp.user);
                                    setShowPlanModal(false);
                                } else {
                                    toast.error(resp.message || 'Failed to update plan');
                                }
                            } catch (err) {
                                toast.error(err.message || 'Failed to update plan');
                            }
                        }}>
                            <div style={{ padding: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Select Plan</label>
                                    <div className={styles.textInput}>
                                        <select name="plan" defaultValue={(user.plan || 'free').toLowerCase()} required>
                                            <option value="free">Free (3 custom fields)</option>
                                            <option value="pro">Pro (5 custom fields)</option>
                                            <option value="enterprise">Enterprise (10 custom fields)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.buttonGroup}>
                                <button type="button" className={styles.cancelButton} onClick={() => setShowPlanModal(false)}>Cancel</button>
                                <button type="submit" className={styles.submitButton}>Save Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Custom Fields Management */}
            <CustomFields open={showCustomFields} onClose={() => setShowCustomFields(false)} plan={user?.plan} />
        </div>
    );
};

export default Profile;
