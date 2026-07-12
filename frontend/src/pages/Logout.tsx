import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Logout = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        logout();
    }, [logout]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-darkbg text-white">
            <div className="bg-panelbg sketch-border p-10 text-center max-w-md">
                <div className="text-amber-500 text-5xl mb-4">👋</div>
                <h1 className="text-2xl font-bold sketch-font mb-2">Logged Out</h1>
                <p className="text-gray-400 text-sm mb-8">You have been successfully signed out of TransitOps.</p>
                <button 
                    onClick={() => navigate('/login')} 
                    className="w-full bg-amber-600 text-black font-bold sketch-font py-2 rounded hover:bg-amber-500"
                >
                    Return to Login
                </button>
            </div>
        </div>
    );
};
