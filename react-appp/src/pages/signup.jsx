import { useEffect, useState } from 'react';
import './signup.css';
import Button from '@mui/material/Button';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Signup() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const { data, error } = await supabase.auth.getUser();
            if (!error && data?.user) {
                navigate('/dashboard');
            }
        }
        checkAuth();
    }, [navigate]);

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError('');
        setFormSuccess('');

        const formData = new FormData(event.currentTarget);
        const email = formData.get('email')?.toString().trim();
        const password = formData.get('password')?.toString() || '';
        const confirmPassword = formData.get('confirmPassword')?.toString() || '';

        if (!email || !password || !confirmPassword) {
            setFormError('Please fill in email and password fields.');
            return;
        }

        if (password !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        const { error } = await supabase.auth.signUp({ email, password });
        setIsSubmitting(false);

        if (error) {
            setFormError(error.message);
            return;
        }

        setFormSuccess('Account created. Check your email to verify your account.');
        event.currentTarget.reset();
    }

    return (
        <>
            <div className="signup-container">
                <div className="productivity-button">
                    <Button
                        component={Link}
                        to="/"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <img
                            src="/logo.svg"
                            alt="descriptive text"
                            style={{ width: '90px', height: 'auto', display: 'block' }}
                        />
                    </Button>
                </div>
                <div className="signup-header">
                    <img
                        src="/logo.svg"
                        alt="logo"
                        className="signup-logo"
                    />
                    <h2 className="signup-title">Create an Account</h2>
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                    <div className="signup-form-grid">
                        <div>
                            <label className="signup-label">First Name</label>
                            <input
                                name="name"
                                type="text"
                                className="signup-input"
                                placeholder="Enter first name"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Last Name</label>
                            <input
                                name="lname"
                                type="text"
                                className="signup-input"
                                placeholder="Enter last name"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Email Address</label>
                            <input
                                name="email"
                                type="text"
                                className="signup-input"
                                placeholder="Enter email"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Phone Number</label>
                            <input
                                name="number"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                className="signup-input"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Password</label>
                            <div className="signup-input-wrapper password-input-wrapper">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="signup-input"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="password-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="password-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="signup-label">Confirm Password</label>
                            <div className="signup-input-wrapper password-input-wrapper">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="signup-input"
                                    placeholder="Enter confirm password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="password-toggle"
                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="password-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="password-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="signup-button-wrapper">
                        <button type="submit" className="signup-button" disabled={isSubmitting}>
                            Sign Up
                        </button>
                    </div>
                </form>

                {formError && <p className="signup-error">{formError}</p>}
                {formSuccess && <p className="signup-success">{formSuccess}</p>}

                <p className="signup-login-prompt">
                    Already have an account?{' '}
                    <Link to="/login" className="signup-login-link">
                        Log In
                    </Link>
                </p>
            </div>
        </>
    )
}

