import { Link } from 'react-router-dom';
import './log-in.css';

export default function Login() {
    return (
        <>
            <div className="login-container">
                <div className="login-header">
                    {/* Replace src with your logo */}
                    <img
                        alt="Oasis"
                        src="/logo.svg"
                        className="login-logo"
                    />
                    <h2 className="login-title">
                        Sign in to your account
                    </h2>
                </div>

                <div className="login-form-container">
                    <form action="#" method="POST" className="login-form">
                        <div>
                            <label htmlFor="email" className="login-label">
                                Email address
                            </label>
                            <div className="login-input-wrapper">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="login-input"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="password-header">
                                <label htmlFor="password" className="login-label">
                                    Password
                                </label>
                                <div className="forgot-password-wrapper">
                                    <a href="#" className="forgot-password-link">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="login-input"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="login-submit-button"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>

                    <p className="signup-prompt">
                        Not a member?{' '}
                        <Link to="/signup" className="signup-link">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </>
    )
}