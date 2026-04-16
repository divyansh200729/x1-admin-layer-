import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

export function useApi(url) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(url)
      setData(res.data)
    } catch (err) {
      console.error('useApi error:', err)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, setData, loading, refetch: fetchData }
}
