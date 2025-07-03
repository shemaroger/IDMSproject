import axios from 'axios';

// Configure your API base URL - use your actual local IP
const BASE_URL = 'http://192.168.8.107:5000/api';
const TIMEOUT = 15000;

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true // Important for session cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url, config.data || config.params);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject({
      message: 'Request failed to send',
      details: error.message,
      isNetworkError: true
    });
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response from:', response.config.url, response.data);
    return response.data;
  },
  (error) => {
    const errorResponse = error.response || {};
    const errorMessage = errorResponse.data?.error || 
                        errorResponse.statusText || 
                        error.message || 
                        'Unknown error occurred';

    console.error('API Error:', {
      url: error.config?.url,
      status: errorResponse.status,
      message: errorMessage,
      data: errorResponse.data
    });

    // Enhance error object
    const enhancedError = {
      message: errorMessage,
      status: errorResponse.status,
      data: errorResponse.data,
      isNetworkError: !error.response
    };

    // Handle specific status codes
    if (errorResponse.status === 401) {
      // Handle unauthorized (you might want to redirect to login)
      enhancedError.isUnauthorized = true;
    }

    return Promise.reject(enhancedError);
  }
);

const ApiService = {
  // Auth endpoints
  login: async (credentials) => {
    try {
      const response = await api.post('/login', credentials);
      
      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/register', userData);
      
      if (response.success) {
        return response;
      } else {
        // Handle validation errors specifically
        if (response.missing_fields) {
          throw {
            ...response,
            isValidationError: true
          };
        }
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/logout');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },

  // Meter endpoints
  checkMeter: async (meterNumber) => {
    try {
      const response = await api.get('/check_meter', { 
        params: { meter_number: meterNumber },
        timeout: 5000
      });
      return response;
    } catch (error) {
      console.error('Check meter error:', error);
      throw error;
    }
  },

  // Power management endpoints
  getLatestReading: async (meterNumber) => {
    try {
      const response = await api.get(`/latest-reading/${meterNumber}`);
      return response;
    } catch (error) {
      console.error('Get reading error:', error);
      throw error;
    }
  },

  // Meter Report endpoint (now uses the logged-in user's meter)
getMeterReport: async () => {
  try {
    const response = await api.get('/api/port_report');
    
    if (!response.data.success) {
      return {
        success: false,
        error: response.data.error || 'Failed to fetch meter report',
        status: response.status
      };
    }

    // Transform response to consistent format
    return {
      success: true,
      data: {
        meterNumber: response.data.meter_number,
        latestPurchasedPower: response.data.latest_purchased_power,
        currentPower: response.data.current_power,
        consumedPower: response.data.consumed_power,
        purchasedDate: response.data.purchased_date,
        latestReadingDate: response.data.latest_date
      }
    };
  } catch (error) {
    console.error('Meter report error:', error);
    
    // Handle different error response formats
    const errorData = error.response?.data;
    return {
      success: false,
      error: errorData?.error || error.message || 'Failed to fetch meter report',
      status: error.response?.status
    };
  }
},

  buyElectricity: async (purchaseData) => {
    try {
      const response = await api.post('/buy-electricity', purchaseData);
      return response.data;
    } catch (error) {
      // Enhance error message
      if (error.response) {
        error.message = error.response.data?.error || error.message;
      }
      throw error;
    }
  },

  updateConsumption: async (meterData) => {
    try {
      const response = await api.post('/update_consumption', meterData);
      return response;
    } catch (error) {
      console.error('Update consumption error:', error);
      throw error;
    }
  },

 relayControl: async (state) => {
  try {
    const response = await api.post('/api/relay_control', { state });
    return response.data;
  } catch (error) {
    console.error('Relay control error:', error);
    // Extract server error message if available
    const errorMessage = error.response?.data?.error || 'Failed to control relay';
    throw new Error(errorMessage);
  }
},
  // =====================
  // TRANSACTION ENDPOINTS
  // =====================
  createTransaction: async (meterNumber, amount) => {
    try {
      const response = await api.post('/transactions', {
        meter_number: meterNumber,
        amount: parseFloat(amount)
      });
      return {
        success: true,
        transaction: response.transaction,
        message: response.message || 'Transaction completed successfully'
      };
    } catch (error) {
      throw {
        ...error,
        message: error.message || 'Failed to create transaction'
      };
    }
  },

  getTransactions: async (params = {}) => {
    try {
      const response = await api.get('/transactions', { params });
      return {
        success: true,
        transactions: response.transactions || [],
        pagination: response.pagination
      };
    } catch (error) {
      throw {
        ...error,
        message: error.message || 'Failed to fetch transactions'
      };
    }
  },

  getTransaction: async (transactionId) => {
    try {
      const response = await api.get(`/transactions/${transactionId}`);
      return {
        success: true,
        transaction: response.transaction
      };
    } catch (error) {
      throw {
        ...error,
        message: error.message || 'Failed to fetch transaction'
      };
    }
  },

  // =================
  // METER ENDPOINTS
  // =================
  checkMeter: async (meterNumber) => {
    try {
      const response = await api.get('/check_meter', { 
        params: { meter_number: meterNumber }
      });
      return {
        success: true,
        exists: response.exists,
        user: response.user || null
      };
    } catch (error) {
      throw {
        ...error,
        message: error.message || 'Failed to check meter number'
      };
    }
  },

  getMeterDetails: async (meterNumber) => {
    try {
      const response = await api.get(`/meter/${meterNumber}`);
      return {
        success: true,
        meter: response.meter,
        current_power: response.current_power,
        user: response.user || null
      };
    } catch (error) {
      throw {
        ...error,
        message: error.message || 'Failed to get meter details'
      };
    }
  },


  // Utility methods
  checkNetwork: async () => {
    try {
      await axios.get(BASE_URL, { timeout: 3000 });
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default ApiService;