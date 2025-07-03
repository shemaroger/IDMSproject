// src/pages/profile/UserProfile.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import api from '../../services/api'; // Import the base api instance
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
  Briefcase,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

const UserProfile = () => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    license_number: '',
    specialization: '',
  });

  // Simple utility functions
  const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, and GIF images are allowed');
    }
    
    if (file.size > maxSize) {
      throw new Error('Image file size cannot exceed 5MB');
    }
    
    return true;
  };

  // State to track if image failed to load
  const [imageError, setImageError] = useState(false);

  // Memoized function to get profile image URL with debugging
  const getProfileImageUrl = useCallback(() => {
    if (imagePreview) {
      return imagePreview;
    }
    
    if (profile?.profile_picture_url) {
      // Convert relative path to full URL
      if (profile.profile_picture_url.startsWith('/media/')) {
        return `http://localhost:8000${profile.profile_picture_url}`;
      }
      // If it's already a full URL, return as-is
      if (profile.profile_picture_url.startsWith('http')) {
        return profile.profile_picture_url;
      }
      // If it doesn't start with /media/ or http, add the full base
      return `http://localhost:8000${profile.profile_picture_url}`;
    }
    
    if (profile?.profile_picture) {
      // If it's already a full URL, return as-is
      if (profile.profile_picture.startsWith('http')) {
        return profile.profile_picture;
      }
      // If it's a relative path, make it absolute
      if (profile.profile_picture.startsWith('/media/')) {
        return `http://localhost:8000${profile.profile_picture}`;
      }
      // If it doesn't start with /media/ or http, add the full base
      return `http://localhost:8000${profile.profile_picture}`;
    }
    
    return null;
  }, [imagePreview, profile?.profile_picture, profile?.profile_picture_url]);

  // Test if the image URL is accessible
  const testImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`Image test for ${url}:`, response.status);
      return response.ok;
    } catch (error) {
      console.log(`Image test failed for ${url}:`, error.message);
      return false;
    }
  };

  // Test the image when profile changes
  useEffect(() => {
    const imageUrl = getProfileImageUrl();
    if (imageUrl && !imageUrl.startsWith('blob:')) {
      console.log('Testing image URL:', imageUrl);
      testImageUrl(imageUrl);
    }
  }, [getProfileImageUrl]);

  // Reset image error when profile changes
  useEffect(() => {
    setImageError(false);
  }, [profile?.profile_picture, profile?.profile_picture_url]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      let profileData = null;
      try {
        const profileResponse = await healthcareAPI.profiles.getMyProfile();
        profileData = profileResponse.data;
      } catch (profileError) {
        const profileResponse = await healthcareAPI.profiles.list({ user: currentUser?.id });
        profileData = profileResponse.data?.results?.[0] || profileResponse.data?.[0];
      }

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateImageFile(file);
      
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setSelectedFile(file);
      setError('');
    } catch (error) {
      setError(error.message);
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedFile) return;

    try {
      setUploadingImage(true);
      setError('');

      const formData = new FormData();
      formData.append('profile_picture', selectedFile);
      
      let response;
      if (profile?.id) {
        response = await api.patch(`/profiles/${profile.id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Upload response:', response.data); // Debug log
      } else {
        formData.append('user', currentUser?.id);
        response = await api.post('/profiles/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Create response:', response.data); // Debug log
        setProfile(response.data);
      }
      
      setSuccess('Profile picture updated successfully!');
      setSelectedFile(null);
      
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      
      // Force reload to get updated data
      console.log('Reloading profile data...');
      await loadProfile();
      
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      console.error('Error response:', error.response?.data); // Debug log
      setError(error.response?.data?.detail || error.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!profile?.profile_picture) return;

    try {
      setUploadingImage(true);
      setError('');

      const formData = new FormData();
      formData.append('profile_picture', '');
      
      await api.patch(`/profiles/${profile.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Profile picture removed successfully!');
      await loadProfile();
      
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setError(error.response?.data?.detail || error.response?.data?.error || 'Failed to remove profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await healthcareAPI.users.update(currentUser?.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
      });

      const profileData = {
        phone_number: formData.phone_number,
        address: formData.address,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
        blood_group: formData.blood_group,
        allergies: formData.allergies,
        chronic_conditions: formData.chronic_conditions,
        license_number: formData.license_number,
        specialization: formData.specialization,
      };

      try {
        await healthcareAPI.profiles.updateMyProfile(profileData);
      } catch (updateError) {
        if (profile?.id) {
          await healthcareAPI.profiles.update(profile.id, profileData);
        }
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await loadProfile();
      
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
    setSelectedFile(null);
    
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    
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
        {/* Header with Profile Picture */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center space-x-6">
              {/* Profile Picture Section */}
              <div className="relative">
                <div className="relative h-24 w-24 rounded-full overflow-hidden bg-blue-100 border-4 border-white shadow-lg">
                  {/* Always show the default avatar as background */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-12 w-12 text-blue-600" />
                  </div>
                  
                  {/* Only show image if we have a URL and it hasn't failed */}
                  {getProfileImageUrl() && !imageError && (
                    <img
                      src={getProfileImageUrl()}
                      alt="Profile"
                      className="absolute inset-0 h-full w-full object-cover z-10"
                      onError={(e) => {
                        console.log('Image failed to load:', e.target.src);
                        console.log('Trying direct browser test...');
                        console.log('Open this URL in a new tab to test:', e.target.src);
                        setImageError(true);
                      }}
                      onLoad={(e) => {
                        console.log('Image loaded successfully:', e.target.src);
                        setImageError(false);
                      }}
                    />
                  )}
                </div>
                
                <div className="absolute -bottom-2 -right-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors"
                    title="Change profile picture"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              <div className="flex-1">
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

          {/* Profile Picture Upload Section */}
          {selectedFile && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">New profile picture selected</p>
                    <p className="text-xs text-blue-700">{selectedFile.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUploadProfilePicture}
                    disabled={uploadingImage}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center disabled:opacity-50 transition-colors"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                        setImagePreview(null);
                      }
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium flex items-center transition-colors"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Picture Option */}
          {profile?.profile_picture && !selectedFile && (
            <div className="mt-4">
              <button
                onClick={handleRemoveProfilePicture}
                disabled={uploadingImage}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {uploadingImage ? 'Removing...' : 'Remove profile picture'}
              </button>
            </div>
          )}
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

        {/* Simple Profile Form - Just Personal Info for now */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;