import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { StatusPill } from '../components/Shared';

export const DriverPortal = () => {
    const { logout, user } = useContext(AuthContext);
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ type: 'Fuel', amount: '' });

    const fetchTrip = () => {
        api.get('/driver/active_trip').then(res => {
            setTrip(res.data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchTrip();
    }, []);

    const submitExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || !trip) return;
        try {
            await api.post('/driver/expense', {
                trip_id: trip.id,
                vehicle_id: trip.vehicle_id,
                type: form.type,
                amount: form.amount,
                liters: form.liters
            });
            alert('Expense logged successfully!');
            setForm({ type: 'Fuel', amount: '', liters: '' });
        } catch (err: any) {
            alert('Failed to log expense');
        }
    };

    if (loading) return <div className="text-white p-8">Loading your assignment...</div>;

    return (
        <div className="min-h-screen bg-darkbg text-white">
            <div className="bg-panelbg border-b border-[#333] p-4 flex justify-between items-center">
                <h1 className="text-xl sketch-font font-bold text-amber-500">TransitOps Driver</h1>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Logout</button>
            </div>
            
            <div className="p-4 max-w-md mx-auto">
                <h2 className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">Current Assignment</h2>
                
                {trip ? (
                    <div className="bg-panelbg sketch-border p-5 mb-8 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs text-amber-500 font-mono">{trip.trip_code}</span>
                                <h3 className="text-2xl font-bold mt-1">{trip.destination}</h3>
                            </div>
                            <StatusPill status={trip.status} />
                        </div>
                        
                        <div className="space-y-3 text-sm text-gray-300 mt-6">
                            <div className="flex justify-between border-b border-[#333] pb-2">
                                <span className="text-gray-500">Origin</span>
                                <span>{trip.source}</span>
                            </div>
                            <div className="flex justify-between border-b border-[#333] pb-2">
                                <span className="text-gray-500">Cargo</span>
                                <span>{trip.cargo_weight_kg} kg</span>
                            </div>
                            <div className="flex justify-between border-b border-[#333] pb-2">
                                <span className="text-gray-500">Vehicle ID</span>
                                <span className="font-mono">{trip.vehicles?.reg_no || 'Assigned Vehicle'}</span>
                            </div>
                            <div className="flex justify-between pb-2 text-red-400 font-bold">
                                <span className="text-red-400/70">STRICT DEADLINE</span>
                                <span>{trip.deadline ? new Date(trip.deadline).toLocaleString() : 'Not Set'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-panelbg p-8 text-center text-gray-400 sketch-border mb-8">
                        No active trips assigned.
                    </div>
                )}

                <h2 className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold mt-8">Log On-Road Expense</h2>
                <div className="bg-panelbg sketch-border p-5">
                    <form onSubmit={submitExpense} className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Expense Type</label>
                            <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="w-full bg-darkbg border border-[#333] p-3 rounded outline-none focus:border-amber-600">
                                <option>Fuel</option>
                                <option>Toll</option>
                                <option>Repair</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                            <input type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="w-full bg-darkbg border border-[#333] p-3 rounded outline-none focus:border-amber-600 font-mono text-lg" placeholder="0.00" />
                        </div>
                        {form.type === 'Fuel' && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Liters Added (L)</label>
                                <input type="number" step="0.01" value={form.liters} onChange={e=>setForm({...form, liters: e.target.value})} className="w-full bg-darkbg border border-[#333] p-3 rounded outline-none focus:border-amber-600 font-mono text-lg" placeholder="0.00" />
                            </div>
                        )}
                        <button type="submit" className="w-full bg-amber-600 text-black sketch-font font-bold py-3 rounded disabled:bg-gray-700 disabled:text-gray-500 mt-2" disabled={!trip || !form.amount || (form.type === 'Fuel' && !form.liters)}>Submit Receipt</button>
                    </form>
                </div>
            </div>
        </div>
    );
};
