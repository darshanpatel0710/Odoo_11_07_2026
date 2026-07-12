import React, { useState, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Login = () => {
    const [email, setEmail] = useState('dispatcher@transitops.com');
    const [password, setPassword] = useState('password123');
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    if (user) return <Navigate to="/" />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            alert('Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-darkbg text-white">
            <div className="sketch-border bg-panelbg p-8 w-96">
                <h1 className="text-3xl sketch-font mb-6 text-center text-amber-500">TransitOps</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-amber-600 text-black font-bold sketch-font py-2 rounded">Login</button>
                </form>
                <div className="mt-4 text-xs text-gray-500">
                    <p className="mb-1 uppercase font-bold text-[10px]">Test Accounts (pw: password123)</p>
                    <ul className="space-y-1">
                        <li>• driver[ID]@transitops.com (e.g. driver1)</li>
                        <li>• dispatcher@transitops.com</li>
                        <li>• safetyofficer@transitops.com</li>
                        <li>• financialanalyst@transitops.com</li>
                        <li>• fleetmanager@transitops.com</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
