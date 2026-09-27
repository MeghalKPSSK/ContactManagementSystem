// @ts-nocheck
import React, { useState } from 'react';
import styles from './Login.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';

const Login = () => {
    const [loginUsername, setUsername] = useState('');
    const [loginPassword, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const validateFields = () => {
        const errors = {};
        if (!loginUsername.trim()) {
            errors.username = 'Username is required';
        }
        if (!loginPassword.trim()) {
            errors.password = 'Password is required';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateFields()) {
            return;
        }
        try {
            const response = await apiService.loginUser({ loginUsername, loginPassword });
            if (!response?.success || !response?.user) {
                throw new Error(response?.message || 'Invalid username or password');
            }

            localStorage.setItem('user', JSON.stringify(response.user));
            toast.success('Login successful!');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            toast.error(message);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.logoSection}>
                <img src="/logo.png" alt="Logo" className={styles.logo} />
                <h2 className={styles.title}>Contact Management System</h2>
            </div>
            <div className={styles.loginBox}>
                <form noValidate onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.title}>Login Form</div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className={styles.input}
                            placeholder="Enter your username"
                            value={loginUsername}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        {fieldErrors.username && <p className={styles.fieldError}>{fieldErrors.username}</p>}
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
                                value={loginPassword}
                                onChange={(e) => setPassword(e.target.value)}
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
                    <button type="submit" className={styles.loginButton}>Login</button>
                    <p className={styles.registerText}>Don't have an account? <Link to="/registerUser" className={styles.loginLink}>Register</Link></p>
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

export default Login;