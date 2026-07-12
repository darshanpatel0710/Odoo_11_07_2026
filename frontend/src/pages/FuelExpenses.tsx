import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { StatusPill } from '../components/Shared';
import { AuthContext } from '../context/AuthContext';

export const FuelExpenses = () => {
    const { sym } = useContext(AuthContext);
    const [fuelLogs, setFuelLogs] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [isFuelModalOpen, setFuelModalOpen] = useState(false);
    const [fuelForm, setFuelForm] = useState({ vehicle_id: '', liters: '', cost: '', date: '' });
    
    const [isExpModalOpen, setExpModalOpen] = useState(false);
    const [expForm, setExpForm] = useState({ trip_id: '', vehicle_id: '', toll: '', other: '' });

    const fetchAll = () => {
        api.get('/fuel').then(res => setFuelLogs(res.data));
        api.get('/expenses').then(res => setExpenses(res.data));
        api.get('/vehicles').then(res => setVehicles(res.data));
        api.get('/trips').then(res => setTrips(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const submitFuel = async () => {
        try {
            await api.post('/fuel', {
                vehicle_id: parseInt(fuelForm.vehicle_id),
                liters: parseFloat(fuelForm.liters),
                cost: parseFloat(fuelForm.cost),
                date: fuelForm.date
            });
            setFuelModalOpen(false);
            setFuelForm({ vehicle_id: '', liters: '', cost: '', date: '' });
            fetchAll();
        } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const submitExp = async () => {
        try {
            await api.post('/expenses', {
                trip_id: parseInt(expForm.trip_id),
                vehicle_id: parseInt(expForm.vehicle_id),
                toll: parseFloat(expForm.toll || '0'),
                other: parseFloat(expForm.other || '0'),
                total: parseFloat(expForm.toll || '0') + parseFloat(expForm.other || '0')
            });
            setExpModalOpen(false);
            setExpForm({ trip_id: '', vehicle_id: '', toll: '', other: '' });
            fetchAll();
        } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const totalFuel = fuelLogs.reduce((acc, f) => acc + (f.cost || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.total || 0), 0);
    const totalOpCost = totalFuel + totalExpenses;

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">6. Fuel & Expense Management</h1>
            
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="sketch-font text-xl">Fuel Logs</h2>
                    {(user?.role === 'Fleet Manager' || user?.role === 'Financial Analyst') && (
                        <div className="space-x-2">
                            <button onClick={() => setFuelModalOpen(true)} className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Log Fuel</button>
                        </div>
                    )}
                </div>
                <table className="w-full text-left text-sm bg-panelbg sketch-border">
                    <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                        <tr>
                            <th className="py-2 px-4">Vehicle</th>
                            <th>Date</th>
                            <th>Liters</th>
                            <th>Fuel Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fuelLogs.map(log => {
                            const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                            return (
                                <tr key={log.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 px-4 font-bold font-mono">{vehicle?.reg_no}</td>
                                    <td>{log.date?.split('T')[0]}</td>
                                    <td>{log.liters} L</td>
                                    <td>{sym}{log.cost?.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="sketch-font text-xl">Other Expenses (Toll/Misc)</h2>
                    {(user?.role === 'Fleet Manager' || user?.role === 'Financial Analyst') && (
                        <button onClick={() => setExpModalOpen(true)} className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Add Expense</button>
                    )}
                </div>
                <table className="w-full text-left text-sm bg-panelbg sketch-border">
                    <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                        <tr>
                            <th className="py-2 px-4">Trip</th>
                            <th>Vehicle</th>
                            <th>Toll</th>
                            <th>Other</th>
                            <th>Maint. (Linked)</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(exp => {
                            const trip = trips.find(t => t.id === exp.trip_id);
                            const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
                            return (
                                <tr key={exp.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 px-4 font-bold">{trip?.trip_code || '-'}</td>
                                    <td className="font-mono">{vehicle?.reg_no}</td>
                                    <td>{sym}{exp.toll}</td>
                                    <td>{sym}{exp.other}</td>
                                    <td>{sym}{exp.maintenance_linked_cost}</td>
                                    <td className="font-bold text-amber-500">{sym}{exp.total}</td>
                                    <td><StatusPill status={exp.status} /></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <hr className="border-[#333] mb-6" />
            <div className="flex justify-end text-xl">
                <span className="font-bold text-gray-300 mr-4">Total Operational Cost (auto) = Fuel + Maint. = </span>
                <span className="font-bold text-amber-500">{sym}{totalOpCost.toFixed(2)}</span>
            </div>
    
            {/* Fuel Modal */}
            {isFuelModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-panelbg border border-[#333] p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl sketch-font font-bold mb-4 text-amber-500">Log Fuel Manually</h2>
                        <div className="space-y-4">
                            <select value={fuelForm.vehicle_id} onChange={e=>setFuelForm({...fuelForm, vehicle_id:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white">
                                <option value="">Select Vehicle</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_no}</option>)}
                            </select>
                            <input type="number" placeholder="Liters" value={fuelForm.liters} onChange={e=>setFuelForm({...fuelForm, liters:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white" />
                            <input type="number" placeholder="Cost" value={fuelForm.cost} onChange={e=>setFuelForm({...fuelForm, cost:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white" />
                            <input type="date" value={fuelForm.date} onChange={e=>setFuelForm({...fuelForm, date:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white" />
                            <div className="flex space-x-2 pt-2">
                                <button onClick={() => setFuelModalOpen(false)} className="flex-1 py-2 text-gray-400 border border-[#333]">Cancel</button>
                                <button onClick={submitFuel} disabled={!fuelForm.vehicle_id || !fuelForm.cost} className="flex-1 py-2 bg-amber-600 text-black font-bold disabled:bg-gray-700 disabled:text-gray-500">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {isExpModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-panelbg border border-[#333] p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl sketch-font font-bold mb-4 text-amber-500">Add Expense Manually</h2>
                        <div className="space-y-4">
                            <select value={expForm.trip_id} onChange={e=>setExpForm({...expForm, trip_id:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white">
                                <option value="">Select Trip (Optional)</option>
                                {trips.map(t => <option key={t.id} value={t.id}>{t.trip_code}</option>)}
                            </select>
                            <select value={expForm.vehicle_id} onChange={e=>setExpForm({...expForm, vehicle_id:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white">
                                <option value="">Select Vehicle</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_no}</option>)}
                            </select>
                            <input type="number" placeholder="Toll Amount" value={expForm.toll} onChange={e=>setExpForm({...expForm, toll:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white" />
                            <input type="number" placeholder="Other Amount" value={expForm.other} onChange={e=>setExpForm({...expForm, other:e.target.value})} className="w-full bg-darkbg border border-[#333] p-2 outline-none text-white" />
                            <div className="flex space-x-2 pt-2">
                                <button onClick={() => setExpModalOpen(false)} className="flex-1 py-2 text-gray-400 border border-[#333]">Cancel</button>
                                <button onClick={submitExp} disabled={!expForm.vehicle_id} className="flex-1 py-2 bg-amber-600 text-black font-bold disabled:bg-gray-700 disabled:text-gray-500">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
