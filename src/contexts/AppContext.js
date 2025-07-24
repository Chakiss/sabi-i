'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTherapists, getServices, getConfig } from '@/lib/firestore';
import { toast } from 'react-hot-toast';

// สร้าง Context
const AppContext = createContext();

// Custom hook สำหรับใช้ Context
export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};

// Cache duration (in minutes)
const CACHE_DURATION = {
  therapists: 30,    // 30 นาที
  services: 60,      // 1 ชั่วโมง
  config: 24 * 60,   // 24 ชั่วโมง
};

// Helper function สำหรับ localStorage cache
const getCachedData = (key, duration) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = new Date().getTime();
    const cacheAge = (now - timestamp) / (1000 * 60); // minutes
    
    if (cacheAge < duration) {
      console.log(`📦 Using cached ${key} (${Math.round(cacheAge)} minutes old)`);
      return data;
    } else {
      console.log(`🗑️ Cache expired for ${key} (${Math.round(cacheAge)} minutes old)`);
      localStorage.removeItem(key);
      return null;
    }
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`💾 Cached ${key}`);
  } catch (error) {
    console.error(`Error caching ${key}:`, error);
  }
};

// Provider Component
export const AppProvider = ({ children }) => {
  const [data, setData] = useState({
    therapists: [],
    services: [],
    config: null,
  });
  
  const [loading, setLoading] = useState({
    therapists: false,
    services: false,
    config: false,
  });
  
  const [lastFetch, setLastFetch] = useState({
    therapists: null,
    services: null,
    config: null,
  });

  // Helper function สำหรับอัพเดท loading state
  const setDataLoading = useCallback((key, isLoading) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  // Helper function สำหรับอัพเดทข้อมูล
  const setDataItem = useCallback((key, newData) => {
    setData(prev => ({ ...prev, [key]: newData }));
    setLastFetch(prev => ({ ...prev, [key]: new Date() }));
    setCachedData(key, newData);
  }, []);

  // Fetch Therapists
  const fetchTherapists = useCallback(async (forceRefresh = false) => {
    // เช็ค cache ก่อน (ถ้าไม่ใช่ force refresh)
    if (!forceRefresh) {
      const cached = getCachedData('therapists', CACHE_DURATION.therapists);
      if (cached) {
        setDataItem('therapists', cached);
        return cached;
      }
    }

    setDataLoading('therapists', true);
    try {
      console.log('🔄 Fetching therapists from API...');
      const therapistsData = await getTherapists();
      setDataItem('therapists', therapistsData);
      return therapistsData;
    } catch (error) {
      console.error('Error fetching therapists:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลหมอนวด');
      return [];
    } finally {
      setDataLoading('therapists', false);
    }
  }, [setDataLoading, setDataItem]);

  // Fetch Services
  const fetchServices = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedData('services', CACHE_DURATION.services);
      if (cached) {
        setDataItem('services', cached);
        return cached;
      }
    }

    setDataLoading('services', true);
    try {
      console.log('🔄 Fetching services from API...');
      const servicesData = await getServices();
      setDataItem('services', servicesData);
      return servicesData;
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส');
      return [];
    } finally {
      setDataLoading('services', false);
    }
  }, [setDataLoading, setDataItem]);

  // Fetch Config
  const fetchConfig = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedData('config', CACHE_DURATION.config);
      if (cached) {
        setDataItem('config', cached);
        return cached;
      }
    }

    setDataLoading('config', true);
    try {
      console.log('🔄 Fetching config from API...');
      const configData = await getConfig();
      setDataItem('config', configData);
      return configData;
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่า');
      return null;
    } finally {
      setDataLoading('config', false);
    }
  }, [setDataLoading, setDataItem]);

  // Fetch all initial data
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    console.log('🚀 Fetching all initial data...', { forceRefresh });
    
    const promises = [
      fetchTherapists(forceRefresh),
      fetchServices(forceRefresh),
      fetchConfig(forceRefresh)
    ];

    try {
      const [therapistsData, servicesData, configData] = await Promise.all(promises);
      console.log('✅ All initial data loaded successfully');
      return { therapistsData, servicesData, configData };
    } catch (error) {
      console.error('Error fetching initial data:', error);
      throw error;
    }
  }, [fetchTherapists, fetchServices, fetchConfig]);

  // Refresh specific data type
  const refreshData = useCallback(async (dataType) => {
    switch (dataType) {
      case 'therapists':
        return await fetchTherapists(true);
      case 'services':
        return await fetchServices(true);
      case 'config':
        return await fetchConfig(true);
      case 'all':
        return await fetchAllData(true);
      default:
        console.warn(`Unknown data type: ${dataType}`);
        return null;
    }
  }, [fetchTherapists, fetchServices, fetchConfig, fetchAllData]);

  // Initialize data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Context value
  const contextValue = {
    // Data
    therapists: data.therapists,
    services: data.services,
    config: data.config,
    
    // Loading states
    loading,
    
    // Last fetch timestamps
    lastFetch,
    
    // Functions
    fetchTherapists,
    fetchServices,
    fetchConfig,
    fetchAllData,
    refreshData,
    
    // Utility functions
    isDataStale: (dataType, maxAge = 30) => {
      const lastFetchTime = lastFetch[dataType];
      if (!lastFetchTime) return true;
      
      const now = new Date();
      const ageInMinutes = (now - lastFetchTime) / (1000 * 60);
      return ageInMinutes > maxAge;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
