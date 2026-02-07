import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 0) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    return data
  },
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
      return Promise.reject(error)
    }
    message.error(error.response?.data?.message || error.message || '网络错误')
    return Promise.reject(error)
  }
)

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export default api
