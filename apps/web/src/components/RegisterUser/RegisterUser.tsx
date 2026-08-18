// @ts-nocheck
import React, { useState } from 'react';
import styles from './RegisterUser.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Link, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import apiService from '../../services/apiService';

const RegisterUser = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    const validateFields = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.username.trim()) errors.username = 'Username is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (!formData.password.trim()) errors.password = 'Password is required';
        if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateFields()) return;

        try {
            const response = await apiService.registerUser(formData);
            
            if (response.success) {
                toast.success('Registration successful!');
                setTimeout(()=>{window.location.href = '/login';},1000); // Redirect to login page after successful registration
            } else {
                toast.error(response.message || 'Registration failed');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className={styles.registerContainer}>
            <div className={styles.logoSection}>
                <img src="/logo.png" alt="Logo" className={styles.logo} />
                <h2 className={styles.title}>Contact Management System</h2>
            </div>
            <div className={styles.registerBox}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.title}>Registration Form</div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="firstName" className={styles.label}>First Name</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            className={styles.input}
                            placeholder="Enter your first name"
                            value={formData.firstName}
                            onChange={handleChange}
                        />
                        {fieldErrors.firstName && <p className={styles.fieldError}>{fieldErrors.firstName}</p>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="lastName" className={styles.label}>Last Name</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            className={styles.input}
                            placeholder="Enter your last name (optional)"
                            value={formData.lastName}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className={styles.input}
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                        />
                        {fieldErrors.username && <p className={styles.fieldError}>{fieldErrors.username}</p>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>Phone</label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            className={styles.input}
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            maxLength={10}
                        />
                        {fieldErrors.phone && <p className={styles.fieldError}>{fieldErrors.phone}</p>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className={styles.input}
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                className={styles.input}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className={styles.showPassword}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        {fieldErrors.password && <p className={styles.fieldError}>{fieldErrors.password}</p>}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                className={styles.input}
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className={styles.showPassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label="Toggle confirm password visibility"
                            >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && <p className={styles.fieldError}>{fieldErrors.confirmPassword}</p>}
                    </div>
                    <button type="submit" className={styles.submitButton}>Register</button>
                    <p className={styles.registerText}>Have an account? <Link to="/login" className={styles.registerLink}>Login</Link></p>
                </form>
            </div>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                closeOnClick
                pauseOnHover
                draggable
            />
        </div>
    );
};

export default RegisterUser;