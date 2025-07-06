import React, { useState, useEffect } from 'react';
import { healthcareAPI } from '../../services/api';

const PreventionTipManagement = () => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'prevention',
    priority: 1,
    disease: 'malaria',
  });
  const [editingTip, setEditingTip] = useState(null);

  useEffect(() => {
    const loadTips = async () => {
      try {
        const data = await healthcareAPI.preventionTips.list();
        console.log('API Response:', data);

        if (Array.isArray(data)) {
          setTips(data);
        } else if (data.results && Array.isArray(data.results)) {
          setTips(data.results);
        } else {
          console.error('Expected an array but got:', data);
          setTips([]);
        }
      } catch (err) {
        console.error('Failed to load prevention tips:', err);
        setTips([]);
      } finally {
        setLoading(false);
      }
    };

    loadTips();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTip) {
        await healthcareAPI.preventionTips.update(editingTip.id, formData);
        setSuccess('Prevention tip updated successfully!');
      } else {
        await healthcareAPI.preventionTips.create(formData);
        setSuccess('Prevention tip created successfully!');
      }
      const data = await healthcareAPI.preventionTips.list();
      if (Array.isArray(data)) {
        setTips(data);
      } else if (data.results && Array.isArray(data.results)) {
        setTips(data.results);
      } else {
        setTips([]);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (tip) => {
    setFormData({
      title: tip.title,
      description: tip.description,
      category: tip.category,
      priority: tip.priority,
      disease: tip.disease,
    });
    setEditingTip(tip);
  };

  const handleDelete = async (id) => {
    try {
      await healthcareAPI.preventionTips.delete(id);
      setSuccess('Prevention tip deleted successfully!');
      const data = await healthcareAPI.preventionTips.list();
      if (Array.isArray(data)) {
        setTips(data);
      } else if (data.results && Array.isArray(data.results)) {
        setTips(data.results);
      } else {
        setTips([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'prevention',
      priority: 1,
      disease: 'malaria',
    });
    setEditingTip(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Prevention Tips Management</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">{editingTip ? 'Edit Prevention Tip' : 'Create New Prevention Tip'}</h2>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
            Title
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
            Category
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="prevention">Prevention</option>
            <option value="self_care">Self Care</option>
            <option value="when_to_seek_help">When to Seek Help</option>
            <option value="emergency_signs">Emergency Signs</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="priority">
            Priority
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="priority"
            name="priority"
            type="number"
            value={formData.priority}
            onChange={handleInputChange}
            min="1"
            max="10"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="disease">
            Disease
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="disease"
            name="disease"
            value={formData.disease}
            onChange={handleInputChange}
          >
            <option value="malaria">Malaria</option>
            <option value="pneumonia">Pneumonia</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            {editingTip ? 'Update Tip' : 'Create Tip'}
          </button>
          {editingTip && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/4 text-left py-3 px-4 uppercase font-semibold text-sm">Title</th>
              <th className="w-1/4 text-left py-3 px-4 uppercase font-semibold text-sm">Description</th>
              <th className="w-1/6 text-left py-3 px-4 uppercase font-semibold text-sm">Category</th>
              <th className="w-1/6 text-left py-3 px-4 uppercase font-semibold text-sm">Priority</th>
              <th className="w-1/6 text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {Array.isArray(tips) && tips.map((tip) => (
              <tr key={tip.id}>
                <td className="text-left py-3 px-4">{tip.title}</td>
                <td className="text-left py-3 px-4">{tip.description}</td>
                <td className="text-left py-3 px-4">{tip.category}</td>
                <td className="text-left py-3 px-4">{tip.priority}</td>
                <td className="text-left py-3 px-4">
                  <button
                    onClick={() => handleEdit(tip)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tip.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreventionTipManagement;
