const { useState, useEffect } = React;
const { api, Card } = window.AppComponents;
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = window.Recharts;

const Reports = () => {
    const [data, setData] = useState(null);
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
            revenue_data.map(e => `${e.month},${e.rev}`).join("\n");
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <Card title="Fuel Efficiency (km/l)" value={kpis.fuel_efficiency} colorClass="border-blue-500" />
                <Card title="Fleet Utilization (%)" value={`${kpis.fleet_utilization}%`} colorClass="border-green-500" />
                <Card title="Operational Cost" value={`$${kpis.operational_cost}`} colorClass="border-amber-500" />
                <Card title="Vehicle ROI (%)" value={`${kpis.vehicle_roi}%`} colorClass="border-purple-500" />
            </div>
            <p className="italic text-xs text-gray-500 mb-8 font-mono">ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</p>

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
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={costliest_vehicles} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" stroke="#999" />
                                <YAxis dataKey="reg_no" type="category" stroke="#999" />
                                <Tooltip cursor={{fill: '#333'}} contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                                <Bar dataKey="cost" fill="#f87171" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents.Reports = Reports;
