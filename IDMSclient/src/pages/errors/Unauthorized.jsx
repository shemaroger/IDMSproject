// src/pages/errors/Unauthorized.jsx
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Unauthorized = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <ShieldX className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          
          {user ? (
            <p className="text-sm text-gray-500 mb-8">
              Your current role: <span className="font-medium">{user.role?.name || 'Unknown'}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-8">
              Please log in to access this resource.
            </p>
          )}
          
          <div className="space-y-3">
            {user ? (
              <>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
                >
                  <Home className="h-5 w-5" />
                  Go to Dashboard
                </Link>
                
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors w-full justify-center"
                >
                  Switch Account
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
                >
                  Sign In
                </Link>
                
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors w-full justify-center"
                >
                  Create Account
                </Link>
              </>
            )}
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors w-full justify-center py-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;