// 1. Enhanced UserForm.jsx with better debugging and validation
import { useState, useEffect, memo } from 'react';
import { Save, Building, AlertTriangle } from 'lucide-react';

const UserForm = memo(({ 
  initialData = {}, 
  roles = [], 
  clinics = [],
  onSubmit, 
  onCancel, 
  loading = false, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: '',
    is_active: true,
    is_staff: false,
    clinic_ids: [],
    ...initialData
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Debug: Log initial data and form state
  console.log('UserForm Debug:', {
    initialData,
    formData,
    roles,
    clinics: clinics.length,
    isEdit
  });

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const newFormData = {
        email: initialData.email || '',
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        password: '',
        role: (initialData.role?.id || initialData.role || '').toString(),
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        is_staff: initialData.is_staff || false,
        clinic_ids: initialData.clinics?.map(clinic => clinic.id) || initialData.clinic_ids || [],
      };
      
      console.log('Setting form data from initialData:', newFormData);
      setFormData(newFormData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    console.log(`Field ${name} changed to:`, newValue);
  };

  const handleClinicChange = (e) => {
    const clinicId = parseInt(e.target.value);
    const isChecked = e.target.checked;
    
    setFormData(prev => {
      const newClinicIds = isChecked 
        ? [...prev.clinic_ids, clinicId]
        : prev.clinic_ids.filter(id => id !== clinicId);
      
      console.log('Clinic selection changed:', {
        clinicId,
        isChecked,
        oldClinicIds: prev.clinic_ids,
        newClinicIds
      });
      
      return {
        ...prev,
        clinic_ids: newClinicIds
      };
    });

    // Clear clinic validation error
    if (validationErrors.clinic_ids) {
      setValidationErrors(prev => ({
        ...prev,
        clinic_ids: undefined
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Basic validation
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    if (!formData.role) errors.role = 'Role is required';
    if (!isEdit && !formData.password) errors.password = 'Password is required';

    // Check if selected role is medical staff
    const selectedRole = roles.find(role => role.id.toString() === formData.role);
    const isMedicalStaff = selectedRole && ['Doctor', 'Nurse'].includes(selectedRole.name);
    
    console.log('Validation check:', {
      selectedRole,
      isMedicalStaff,
      clinicIds: formData.clinic_ids,
      clinicsLength: formData.clinic_ids.length
    });

    // Clinic validation for medical staff
    if (isMedicalStaff && (!formData.clinic_ids || formData.clinic_ids.length === 0)) {
      errors.clinic_ids = `${selectedRole.name} must be assigned to at least one clinic`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('Form submission attempt:', formData);
    
    if (validateForm()) {
      onSubmit(formData);
    } else {
      console.log('Form validation failed:', validationErrors);
    }
  };

  // Check if selected role is medical staff
  const selectedRole = roles.find(role => role.id.toString() === formData.role);
  const isMedicalStaff = selectedRole && ['Doctor', 'Nurse'].includes(selectedRole.name);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              validationErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="user@example.com"
          />
          {validationErrors.email && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <select
            name="role"
            required
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              validationErrors.role ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          {validationErrors.role && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.role}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            required
            value={formData.first_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              validationErrors.first_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {validationErrors.first_name && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.first_name}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            required
            value={formData.last_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              validationErrors.last_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Doe"
          />
          {validationErrors.last_name && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isEdit ? 'New Password' : 'Password *'}
        </label>
        <input
          type="password"
          name="password"
          required={!isEdit}
          minLength={8}
          value={formData.password}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            validationErrors.password ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 8 characters"}
        />
        {validationErrors.password && (
          <p className="text-xs text-red-500 mt-1">{validationErrors.password}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {isEdit ? 'Only fill this if you want to change the password' : 'Password must be at least 8 characters long'}
        </p>
      </div>

      {/* Debug info for clinic selection */}
      {isMedicalStaff && (
        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
          <strong>Debug Info:</strong> Role "{selectedRole?.name}" requires clinic assignment. 
          Currently selected: {formData.clinic_ids.length} clinic(s)
        </div>
      )}

      {/* Clinic Assignment for Medical Staff */}
      {isMedicalStaff && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Building className="h-4 w-4 inline mr-2" />
            Assign to Clinics *
          </label>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-3 ${
            validationErrors.clinic_ids ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}>
            {clinics.length > 0 ? (
              clinics.map(clinic => (
                <label key={clinic.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    value={clinic.id}
                    checked={formData.clinic_ids.includes(clinic.id)}
                    onChange={handleClinicChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block truncate">
                      {clinic.name}
                    </span>
                    <span className="text-xs text-gray-500 block truncate">
                      {clinic.address}
                    </span>
                  </div>
                </label>
              ))
            ) : (
              <div className="col-span-2 text-center py-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No clinics available. Please add clinics first.
                </p>
              </div>
            )}
          </div>
          {validationErrors.clinic_ids && (
            <p className="text-xs text-red-500 mt-1 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {validationErrors.clinic_ids}
            </p>
          )}
          {isMedicalStaff && formData.clinic_ids.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              ✓ {formData.clinic_ids.length} clinic(s) selected
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
          />
          <span className="ml-2 text-sm text-gray-700">Active User</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_staff"
            checked={formData.is_staff}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
          />
          <span className="ml-2 text-sm text-gray-700">Staff Member (Django Admin Access)</span>
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update User' : 'Create User')}
        </button>
      </div>
    </form>
  );
});

UserForm.displayName = 'UserForm';

export default UserForm;