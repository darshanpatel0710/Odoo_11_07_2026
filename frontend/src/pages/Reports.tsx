import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Card = ({ title, value, colorClass }: any) => (
    <div className={`p-4 bg-[#1a1a1a] border-l-4 ${colorClass}`}>
        <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
        <p className="text-2xl font-bold font-mono sketch-font">{value}</p>
    </div>
);

export const Reports = () => {
    const { sym } = useContext(AuthContext);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports').then(res => {
            setData(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading...</div>;

    const { kpis, revenue_data, costliest_vehicles } = data;

    const exportCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,Month,Revenue\n" + 
            revenue_data.map((e: any) => `${e.month},${e.rev}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transitops_report.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sketch-font font-bold">7. Reports & Analytics</h1>
                <button onClick={exportCSV} className="bg-[#1a1a1a] sketch-border text-white px-4 py-2 hover:bg-[#333]">Export CSV</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card title="Total Revenue" value={`${sym}${kpis.total_revenue}`} colorClass="border-green-400" />
                <Card title="Operational Cost" value={`${sym}${kpis.operational_cost}`} colorClass="border-amber-500" />
                <Card title="Net Profit" value={`${sym}${kpis.net_profit}`} colorClass="border-teal-400" />
                <Card title="Fuel Efficiency (km/L)" value={kpis.fuel_efficiency} colorClass="border-blue-500" />
                <Card title="Fleet Utilization (%)" value={`${kpis.fleet_utilization}%`} colorClass="border-green-500" />
                <Card title="Vehicle ROI (%)" value={`${kpis.vehicle_roi}%`} colorClass="border-purple-500" />
            </div>
            <p className="italic text-xs text-gray-500 mb-8 font-mono">Net Profit = Total Revenue − Operational Cost | ROI = Net Profit / Acquisition Cost</p>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-1/2 sketch-border bg-panelbg p-6">
                    <h2 className="sketch-font text-xl mb-4">Monthly Revenue</h2>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={revenue_data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="month" stroke="#999" />
                                <Tooltip cursor={{fill: '#333'}} contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                                <Bar dataKey="rev" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 sketch-border bg-panelbg p-6">
                    <h2 className="sketch-font text-xl mb-4">Top Costliest Vehicles</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                            <tr>
                                <th className="py-2">Vehicle</th>
                                <th>Operational Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costliest_vehicles.map((v: any, i: number) => (
                                <tr key={i} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-2">{v.reg_no}</td>
                                    <td className="text-amber-500 font-bold">{sym}{v.cost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
