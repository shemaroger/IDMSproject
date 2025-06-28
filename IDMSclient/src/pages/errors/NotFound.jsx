// src/pages/errors/NotFound.jsx
import { Link } from 'react-router-dom';
import { FileX, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gray-100 p-4 rounded-full">
              <FileX className="h-12 w-12 text-gray-600" />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Page Not Found
          </h2>
          
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
            >
              <Home className="h-5 w-5" />
              Go Back Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors w-full justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? <Link to="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;