import React, { useState } from 'react';
import { Flame, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  error?: string;
  isLoading?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});

  const validateForm = () => {
    const errors: {email?: string; password?: string} = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onLogin(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
              <Flame className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">Smoke and Fire

              </h1>
              <p className="text-sm text-gray-400">Detection System</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to access the Smoke and Fire detection system</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                  validationErrors.email
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-600 focus:ring-blue-500/50 focus:border-blue-500'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors pr-12 ${
                    validationErrors.password
                      ? 'border-red-500 focus:ring-red-500/50'
                      : 'border-gray-600 focus:ring-blue-500/50 focus:border-blue-500'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@safds.com');
                setPassword('admin123');
                setValidationErrors({});
              }}
              className="w-full bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 hover:bg-blue-900/50 transition-colors cursor-pointer text-left"
              disabled={isLoading}
            >
              <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                 <Shield className="w-4 h-4" />
                 Demo Credentials (Click to fill)
               </h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  <span className="text-gray-400">Email:</span> admin@safds.com
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-400">Password:</span> admin123
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Smoke and Fire Detection System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;