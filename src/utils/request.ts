import axios from 'axios';

const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000
});

// Request interceptor
request.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor
request.interceptors.response.use(
    response => {
        // Check if the response matches the standard API structure
        if (response.data && typeof response.data.code !== 'undefined') {
            const { code, info, data } = response.data;

            if (code === '0401') {
                localStorage.removeItem('token');
                // Optional: redirect to login if not already there
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
                return Promise.reject(new Error('Unauthorized'));
            }

            if (code !== '0000') {
                return Promise.reject(new Error(info || 'Error'));
            }

            return data; // Return the actual data
        }

        return response.data;
    },
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default request;
