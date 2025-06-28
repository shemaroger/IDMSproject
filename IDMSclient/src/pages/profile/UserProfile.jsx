// src/pages/profile/UserProfile.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Camera, 
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  Briefcase
} from 'lucide-react';

const UserProfile = () => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
    
    // Healthcare Information
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    
    // Professional Information (for healthcare workers)
    license_number: '',
    specialization: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Get user profile data
      const profileResponse = await healthcareAPI.profiles.list({ user: currentUser?.id });
      const profileData = profileResponse.data?.results?.[0] || profileResponse.data?.[0];

      if (profileData) {
        setProfile(profileData);
        setFormData({
          first_name: currentUser?.first_name || '',
          last_name: currentUser?.last_name || '',
          email: currentUser?.email || '',
          phone_number: profileData.phone_number || '',
          address: profileData.address || '',
          date_of_birth: profileData.date_of_birth || '',
          gender: profileData.gender || '',
          blood_group: profileData.blood_group || '',
          allergies: profileData.allergies || '',
          chronic_conditions: profileData.chronic_conditions || '',
          license_number: profileData.license_number || '',
          specialization: profileData.specialization || '',
        });
      } else {
        // Create a new profile if none exists
        const newProfile = await healthcareAPI.profiles.create({
          user: currentUser?.id,
          phone_number: '',
          address: '',
          date_of_birth: null,
          gender: '',
          blood_group: '',
          allergies: '',
          chronic_conditions: '',
          license_number: '',
          specialization: '',
        });
        setProfile(newProfile.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Update user basic info
      await healthcareAPI.users.update(currentUser?.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
      });

      // Update profile
      if (profile?.id) {
        await healthcareAPI.profiles.update(profile.id, {
          phone_number: formData.phone_number,
          address: formData.address,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          blood_group: formData.blood_group,
          allergies: formData.allergies,
          chronic_conditions: formData.chronic_conditions,
          license_number: formData.license_number,
          specialization: formData.specialization,
        });
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await loadProfile(); // Reload to get fresh data
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    // Reset form data to original values
    if (profile) {
      setFormData({
        first_name: currentUser?.first_name || '',
        last_name: currentUser?.last_name || '',
        email: currentUser?.email || '',
        phone_number: profile.phone_number || '',
        address: profile.address || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
        allergies: profile.allergies || '',
        chronic_conditions: profile.chronic_conditions || '',
        license_number: profile.license_number || '',
        specialization: profile.specialization || '',
      });
    }
  };

  const isHealthcareWorker = currentUser?.role?.name === 'Doctor' || currentUser?.role?.name === 'Nurse';
  const isPatient = currentUser?.role?.name === 'Patient';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentUser?.first_name} {currentUser?.last_name}
                </h1>
                <p className="text-gray-600">{currentUser?.email}</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                  currentUser?.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                  currentUser?.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                  currentUser?.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                  currentUser?.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentUser?.role?.name || 'No Role'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-3">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-700">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 ml-3">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'personal' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Personal Info
              </button>
              
              {isPatient && (
                <button
                  onClick={() => setActiveTab('health')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'health' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Heart className="h-4 w-4 inline mr-2" />
                  Health Info
                </button>
              )}
              
              {isHealthcareWorker && (
                <button
                  onClick={() => setActiveTab('professional')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'professional' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Briefcase className="h-4 w-4 inline mr-2" />
                  Professional
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.first_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.last_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.email || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="+250 XXX XXX XXX"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.phone_number || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">
                        {formData.date_of_birth 
                          ? new Date(formData.date_of_birth).toLocaleDateString() 
                          : 'Not provided'
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    {isEditing ? (
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                        <option value="U">Prefer not to say</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 py-2">
                        {formData.gender === 'M' ? 'Male' :
                         formData.gender === 'F' ? 'Female' :
                         formData.gender === 'O' ? 'Other' :
                         formData.gender === 'U' ? 'Prefer not to say' :
                         'Not provided'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your full address"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.address || 'Not provided'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Health Information Tab (for Patients) */}
            {activeTab === 'health' && isPatient && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Health Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Heart className="h-4 w-4 inline mr-2" />
                      Blood Group
                    </label>
                    {isEditing ? (
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 py-2">{formData.blood_group || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="h-4 w-4 inline mr-2" />
                    Allergies
                  </label>
                  {isEditing ? (
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="List any known allergies..."
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.allergies || 'None reported'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Chronic Conditions
                  </label>
                  {isEditing ? (
                    <textarea
                      name="chronic_conditions"
                      value={formData.chronic_conditions}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="List any chronic conditions or ongoing health issues..."
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.chronic_conditions || 'None reported'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Professional Information Tab (for Healthcare Workers) */}
            {activeTab === 'professional' && isHealthcareWorker && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Shield className="h-4 w-4 inline mr-2" />
                      License Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Professional license number"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.license_number || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="h-4 w-4 inline mr-2" />
                      Specialization
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Medical specialization or area of expertise"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{formData.specialization || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="font-medium text-gray-600">Account Status:</span>
              <p className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                currentUser?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentUser?.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Account Type:</span>
              <p className="text-gray-900 mt-1">{currentUser?.is_staff ? 'Staff' : 'Regular User'}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Member Since:</span>
              <p className="text-gray-900 mt-1">
                {currentUser?.date_joined 
                  ? new Date(currentUser.date_joined).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Unknown'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;