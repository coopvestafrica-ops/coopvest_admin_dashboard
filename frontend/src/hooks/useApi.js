import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Custom hook for making API calls with automatic polling support
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Configuration options
 * @param {number} options.pollInterval - Polling interval in milliseconds (0 = no polling)
 * @param {boolean} options.skip - Skip initial fetch
 * @returns {object} - { data, loading, error, refetch }
 */
export const useApi = (endpoint, options = {}) => {
  const { pollInterval = 0, skip = false } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_BASE_URL}${endpoint}`)
      setData(response.data)
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
      console.error(`API Error (${endpoint}):`, err)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (skip) return

    // Initial fetch
    fetchData()

    // Set up polling if interval is specified
    if (pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval)
      return () => clearInterval(interval)
    }
  }, [endpoint, pollInterval, skip, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

/**
 * Custom hook for making mutations (POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint path
 * @returns {object} - { mutate, loading, error, data }
 */
export const useMutation = (endpoint) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mutate = useCallback(
    async (method = 'POST', payload = null) => {
      try {
        setLoading(true)
        setError(null)
        const config = {
          method,
          url: `${API_BASE_URL}${endpoint}`,
          data: payload
        }
        const response = await axios(config)
        setData(response.data)
        return response.data
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to perform action'
        setError(errorMessage)
        console.error(`Mutation Error (${method} ${endpoint}):`, err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  return {
    mutate,
    loading,
    error,
    data
  }
}

export default useApi
