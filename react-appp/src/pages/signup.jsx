import { Link } from 'react-router-dom';
import './signup.css';

export default function Signup() {
    return (
        <>
            <div className="signup-container">
                <div className="signup-header">
                    <img
                        src="/logo.svg"
                        alt="logo"
                        className="signup-logo"
                    />
                    <h4 className="signup-title">Sign up into your account</h4>
                </div>

                <form className="signup-form">
                    <div className="signup-form-grid">
                        <div>
                            <label className="signup-label">First Name</label>
                            <input
                                name="name"
                                type="text"
                                className="signup-input"
                                placeholder="Enter name"
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
                            <label className="signup-label">Email Id</label>
                            <input
                                name="email"
                                type="text"
                                className="signup-input"
                                placeholder="Enter email"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Mobile No.</label>
                            <input
                                name="number"
                                type="number"
                                className="signup-input"
                                placeholder="Enter mobile number"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Password</label>
                            <input
                                name="password"
                                type="password"
                                className="signup-input"
                                placeholder="Enter password"
                            />
                        </div>
                        <div>
                            <label className="signup-label">Confirm Password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                className="signup-input"
                                placeholder="Enter confirm password"
                            />
                        </div>
                    </div>

                    <div className="signup-button-wrapper">
                        <button type="submit" className="signup-button">
                            Sign up
                        </button>
                    </div>
                </form>

                <p className="signup-login-prompt">
                    Already have an account?{' '}
                    <Link to="/login" className="signup-login-link">
                        Log in
                    </Link>
                </p>
            </div>
        </>
    );
}

