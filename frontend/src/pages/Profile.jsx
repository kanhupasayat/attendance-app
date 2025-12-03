import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import PhotoCropper from '../components/PhotoCropper';

const Profile = () => {
  const { isAdmin, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [rawPhotoFile, setRawPhotoFile] = useState(null);

  // File inputs refs
  const photoInputRef = useRef(null);
  const aadhaarPhotoInputRef = useRef(null);
  const panPhotoInputRef = useRef(null);

  // Form data for editing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    father_name: '',
    father_phone: '',
    aadhaar_number: '',
    pan_number: '',
    bank_account_number: '',
    bank_holder_name: '',
    bank_name: '',
    bank_ifsc: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // File previews
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aadhaarPhotoPreview, setAadhaarPhotoPreview] = useState(null);
  const [panPhotoPreview, setPanPhotoPreview] = useState(null);

  // Files to upload
  const [photoFile, setPhotoFile] = useState(null);
  const [aadhaarPhotoFile, setAadhaarPhotoFile] = useState(null);
  const [panPhotoFile, setPanPhotoFile] = useState(null);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        father_name: response.data.father_name || '',
        father_phone: response.data.father_phone || '',
        aadhaar_number: response.data.aadhaar_number || '',
        pan_number: response.data.pan_number || '',
        bank_account_number: response.data.bank_account_number || '',
        bank_holder_name: response.data.bank_holder_name || '',
        bank_name: response.data.bank_name || '',
        bank_ifsc: response.data.bank_ifsc || '',
        address: response.data.address || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!isAdmin) {
      try {
        const response = await authAPI.getMyProfileRequests();
        setAllRequests(response.data);
        setPendingRequests(response.data.filter(r => r.status === 'pending'));
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPendingRequests();
  }, []);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'photo') {
        // Show cropper for profile photo
        setRawPhotoFile(file);
        setShowCropper(true);
        // Reset input so same file can be selected again
        if (photoInputRef.current) {
          photoInputRef.current.value = '';
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === 'aadhaar') {
            setAadhaarPhotoPreview(reader.result);
            setAadhaarPhotoFile(file);
          } else if (type === 'pan') {
            setPanPhotoPreview(reader.result);
            setPanPhotoFile(file);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const handleCropSave = (croppedFile, croppedPreview, descriptor) => {
    setPhotoFile(croppedFile);
    setPhotoPreview(croppedPreview);
    setFaceDescriptor(descriptor);
    setShowCropper(false);
    setRawPhotoFile(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setRawPhotoFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();

      // Add text fields if changed
      Object.keys(formData).forEach(key => {
        if (formData[key] !== (profile[key] || '')) {
          data.append(key, formData[key]);
        }
      });

      // Add files if selected
      if (photoFile) data.append('photo', photoFile);
      if (aadhaarPhotoFile) data.append('aadhaar_photo', aadhaarPhotoFile);
      if (panPhotoFile) data.append('pan_photo', panPhotoFile);

      // Add face descriptor if available
      if (faceDescriptor) data.append('face_descriptor', faceDescriptor);

      if (isAdmin) {
        // Admin can directly update
        await authAPI.updateProfile(data);
        toast.success('Profile updated successfully!');
        fetchProfile();
        await refreshUser();
      } else {
        // Employee submits update request
        await authAPI.submitProfileUpdateRequest(data);
        toast.success('Profile update request submitted! Waiting for admin approval.');
        fetchPendingRequests();
      }

      setEditMode(false);
      resetFiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.old_password?.[0] || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetFiles = () => {
    setPhotoFile(null);
    setAadhaarPhotoFile(null);
    setPanPhotoFile(null);
    setPhotoPreview(null);
    setAadhaarPhotoPreview(null);
    setPanPhotoPreview(null);
    setFaceDescriptor(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    resetFiles();
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      father_name: profile?.father_name || '',
      father_phone: profile?.father_phone || '',
      aadhaar_number: profile?.aadhaar_number || '',
      pan_number: profile?.pan_number || '',
      bank_account_number: profile?.bank_account_number || '',
      bank_holder_name: profile?.bank_holder_name || '',
      bank_name: profile?.bank_name || '',
      bank_ifsc: profile?.bank_ifsc || '',
      address: profile?.address || '',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Pending Request Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-800">
                You have a pending profile update request. Please wait for admin approval.
              </p>
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center mb-4 md:mb-0 w-full md:w-auto">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 overflow-hidden border-4 border-blue-100">
                  {photoPreview || profile?.photo_url ? (
                    <img
                      src={photoPreview || profile?.photo_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-3xl font-bold">
                      {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                {editMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'photo')}
                    />
                  </>
                )}
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{profile?.name}</h1>
                <p className="text-gray-600">{profile?.designation || 'Employee'}</p>
                <p className="text-sm text-gray-500">{profile?.department}</p>
              </div>
            </div>
            {!editMode && pendingRequests.length === 0 && (
              <button
                onClick={() => setEditMode(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mobile</label>
                <p className="text-gray-800 py-2">{profile?.mobile || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                {editMode ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.email || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Weekly Off</label>
                <p className="text-gray-800 py-2">{profile?.weekly_off_display || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Date Joined</label>
                <p className="text-gray-800 py-2">{profile?.date_joined ? formatDate(profile.date_joined) : '-'}</p>
              </div>
            </div>
          </div>

          {/* Father's Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Father's Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Father's Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.father_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Father's Phone</label>
                {editMode ? (
                  <input
                    type="tel"
                    value={formData.father_phone}
                    onChange={(e) => setFormData({ ...formData, father_phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter father's phone number"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.father_phone || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Aadhaar Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Aadhaar Card Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Aadhaar Number</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.aadhaar_number}
                    onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter 12-digit Aadhaar number"
                    maxLength={12}
                  />
                ) : (
                  <p className="text-gray-800 py-2">
                    {profile?.aadhaar_number ? `XXXX XXXX ${profile.aadhaar_number.slice(-4)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Aadhaar Photo</label>
                {editMode ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => aadhaarPhotoInputRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-4 w-full text-center"
                    >
                      {aadhaarPhotoPreview || profile?.aadhaar_photo_url ? (
                        <img
                          src={aadhaarPhotoPreview || profile?.aadhaar_photo_url}
                          alt="Aadhaar"
                          className="max-h-32 mx-auto"
                        />
                      ) : (
                        <span className="text-gray-500">Click to upload Aadhaar photo</span>
                      )}
                    </button>
                    <input
                      ref={aadhaarPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'aadhaar')}
                    />
                  </div>
                ) : profile?.aadhaar_photo_url ? (
                  <img src={profile.aadhaar_photo_url} alt="Aadhaar" className="max-h-32 rounded border" />
                ) : (
                  <p className="text-gray-500 py-2">Not uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* PAN Card Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">PAN Card Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">PAN Number</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase().slice(0, 10) })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter PAN number (e.g., ABCDE1234F)"
                    maxLength={10}
                  />
                ) : (
                  <p className="text-gray-800 py-2">
                    {profile?.pan_number ? `${profile.pan_number.slice(0, 2)}XXXXX${profile.pan_number.slice(-3)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">PAN Photo</label>
                {editMode ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => panPhotoInputRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-4 w-full text-center"
                    >
                      {panPhotoPreview || profile?.pan_photo_url ? (
                        <img src={panPhotoPreview || profile?.pan_photo_url} alt="PAN" className="max-h-32 mx-auto" />
                      ) : (
                        <span className="text-gray-500">Click to upload PAN photo</span>
                      )}
                    </button>
                    <input
                      ref={panPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'pan')}
                    />
                  </div>
                ) : profile?.pan_photo_url ? (
                  <img src={profile.pan_photo_url} alt="PAN" className="max-h-32 rounded border" />
                ) : (
                  <p className="text-gray-500 py-2">Not uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Bank Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Account Number</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter bank account number"
                  />
                ) : (
                  <p className="text-gray-800 py-2">
                    {profile?.bank_account_number ? `XXXXXX${profile.bank_account_number.slice(-4)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Account Holder Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.bank_holder_name}
                    onChange={(e) => setFormData({ ...formData, bank_holder_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter account holder name"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.bank_holder_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter bank name"
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.bank_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">IFSC Code</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.bank_ifsc}
                    onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase().slice(0, 11) })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter IFSC code"
                    maxLength={11}
                  />
                ) : (
                  <p className="text-gray-800 py-2">{profile?.bank_ifsc || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Address</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full Address</label>
              {editMode ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter your full address"
                />
              ) : (
                <p className="text-gray-800 py-2">{profile?.address || '-'}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {editMode && (
            <div className="flex justify-end space-x-4 mb-6">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : isAdmin ? 'Save Changes' : 'Submit for Approval'}
              </button>
            </div>
          )}
        </form>

        {/* Security Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Security</h2>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Password</p>
              <p className="text-sm text-gray-500">Change your account password</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Profile Update Request History for Employees */}
        {!isAdmin && allRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Profile Update History</h2>
            <div className="space-y-3">
              {allRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border ${
                    request.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                    request.status === 'approved' ? 'bg-green-50 border-green-200' :
                    request.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Requested changes:</span>{' '}
                        {request.changed_fields?.split(',').map(f => {
                          const fieldNames = {
                            name: 'Name', email: 'Email', father_name: "Father's Name",
                            father_phone: "Father's Phone", aadhaar_number: 'Aadhaar',
                            aadhaar_photo: 'Aadhaar Photo', pan_number: 'PAN',
                            pan_photo: 'PAN Photo', bank_account_number: 'Bank Account',
                            bank_holder_name: 'Account Holder', bank_name: 'Bank Name', bank_ifsc: 'IFSC', address: 'Address',
                            photo: 'Profile Photo'
                          };
                          return fieldNames[f.trim()] || f.trim();
                        }).join(', ')}
                      </p>
                      {request.reason && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      )}
                      {request.review_remarks && (
                        <p className={`text-xs mt-1 ${
                          request.status === 'approved' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <span className="font-medium">Admin remarks:</span> {request.review_remarks}
                        </p>
                      )}
                      {request.reviewer_name && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed by: {request.reviewer_name} on{' '}
                          {new Date(request.reviewed_on).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text for Employees */}
        {!isAdmin && !editMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Any changes you make to your profile will be sent to the admin for approval.
                  Once approved, the changes will be reflected in your profile.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Cropper Modal */}
      {showCropper && rawPhotoFile && (
        <PhotoCropper
          imageFile={rawPhotoFile}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </Layout>
  );
};

export default Profile;
