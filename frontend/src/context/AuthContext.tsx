import React, { createContext, useState, useEffect } from 'react';
import { api } from '../api';

export const AuthContext = createContext<any>(null);

const currencySymbols: any = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹' };

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            Promise.all([
                api.get('/auth/me'),
                api.get('/settings')
            ]).then(([authRes, setRes]) => {
                setUser(authRes.data);
                setSettings(setRes.data);
            }).catch(() => {
                localStorage.removeItem('token');
            }).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        setUser(res.data.user);
        const setRes = await api.get('/settings');
        setSettings(setRes.data);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setSettings(null);
    };

    const sym = currencySymbols[settings?.currency || 'USD'] || '$';

    if (loading) return <div className="p-8 sketch-font">Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout, settings, sym }}>
            {children}
        </AuthContext.Provider>
    );
};
