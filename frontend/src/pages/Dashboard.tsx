import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Card, StatusPill } from '../components/Shared';

export const Dashboard = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard').then(res => {
            setData(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading...</div>;

    const { kpis, vehicle_status, recent_trips } = data;

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">1. Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card title="Total Fleet" value={kpis.total_vehicles} colorClass="border-blue-500" />
                <Card title="Active Trips" value={kpis.active_trips} colorClass="border-green-500" />
                <Card title="Available Drivers" value={kpis.total_drivers} colorClass="border-amber-500" />
                <Card title="Alerts (Maint/Fuel)" value={kpis.alerts} colorClass="border-red-500" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-2/3">
                    <h2 className="sketch-font text-xl mb-4">Recent Trips (Live)</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                            <tr>
                                <th className="py-2">Trip Code</th>
                                <th>Route</th>
                                <th>Driver ID</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent_trips.map((t: any) => (
                                <tr key={t.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 font-bold">{t.trip_code}</td>
                                    <td>{t.source} &rarr; {t.destination}</td>
                                    <td>{t.driver_id}</td>
                                    <td><StatusPill status={t.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="w-full lg:w-1/3 sketch-border bg-panelbg p-6">
                    <h2 className="sketch-font text-xl mb-4">Fleet Status</h2>
                    <div className="space-y-4">
                        {Object.entries(vehicle_status).map(([status, count]: [string, any]) => (
                            <div key={status} className="flex justify-between items-center">
                                <span className="text-sm font-bold"><StatusPill status={status} /></span>
                                <span className="sketch-font text-lg">{count}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-[#333]">
                        <div className="h-4 w-full flex rounded overflow-hidden">
                            <div style={{width: '60%'}} className="bg-green-500"></div>
                            <div style={{width: '30%'}} className="bg-blue-500"></div>
                            <div style={{width: '10%'}} className="bg-amber-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
