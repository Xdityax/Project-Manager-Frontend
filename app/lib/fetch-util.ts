import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api-v1";
const TOKEN_KEY = "token";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

const getStoredToken = () => {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string) => {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, token);
    }
};

const clearStoredToken = () => {
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOKEN_KEY);
    }
};

api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearStoredToken();
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("logout"));
            }
        }

        return Promise.reject(error);
    }
);

const postData = async <TResponse = unknown, TPayload = unknown>(path: string, data: TPayload) => {
    const response = await api.post<TResponse>(path, data);
    return response.data;
};

const postFormData = async <TResponse = unknown>(path: string, data: FormData) => {
    const response = await api.post<TResponse>(path, data, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};

const getData = async <TResponse = unknown>(path: string): Promise<TResponse> => {
    const response = await api.get<TResponse>(path);
    return response.data;
};

const putData = async <TResponse = unknown, TPayload = unknown>(path: string, data: TPayload): Promise<TResponse> => {
    const response = await api.put<TResponse>(path, data);
    return response.data;
};

const deleteData = async <TResponse = unknown>(path: string): Promise<TResponse> => {
    const response = await api.delete<TResponse>(path);
    return response.data;
};

const fetchCurrentUser = async <TUser>() => getData<{ user: TUser }>("/auth/me");

export { clearStoredToken, deleteData, fetchCurrentUser, getData, getStoredToken, postData, postFormData, putData, setStoredToken };