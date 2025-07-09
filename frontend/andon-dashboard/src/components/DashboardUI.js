import React from 'react';
import '../custom-styles.css'; // Ensure you have Tailwind or relevant styles configured
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardUI = ({
  stations,
  isConnected,
  summary,
  getStationColor,
  formatTime,
  formatDuration,
  chartData
}) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Andon System Dashboard
      </h1>

      {/* Connection Status */}
      <div className={`text-center mb-4 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
        {isConnected ? '🟢 Connected to Server' : '🔴 Disconnected from Server'}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-md p-4 rounded-lg text-center">
          <h3 className="text-gray-500">Total Faults</h3>
          <p className="text-2xl font-semibold text-red-600">{summary.totalFaults || 0}</p>
        </div>
        <div className="bg-white shadow-md p-4 rounded-lg text-center">
          <h3 className="text-gray-500">Active Faults</h3>
          <p className="text-2xl font-semibold text-yellow-500">{summary.activeFaults || 0}</p>
        </div>
        <div className="bg-white shadow-md p-4 rounded-lg text-center">
          <h3 className="text-gray-500">Resolved Faults</h3>
          <p className="text-2xl font-semibold text-green-600">{summary.resolvedFaults || 0}</p>
        </div>
        <div className="bg-white shadow-md p-4 rounded-lg text-center">
          <h3 className="text-gray-500">Total Downtime</h3>
          <p className="text-2xl font-semibold text-blue-600">
            {formatDuration(summary.totalDowntime || 0)}
          </p>
        </div>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {Object.values(stations).map((station) => (
          <div
            key={station.name}
            className={`rounded-lg p-3 text-white text-center shadow-md ${getStationColor(station)}`}
          >
            <h3 className="font-bold text-lg">{station.name}</h3>
            <p className="text-sm">Actual: {station.actualCount}</p>
            <p className="text-sm">Eff: {station.efficiency}%</p>
            <p className="text-sm">⏱ Downtime: {formatDuration(station.currentDowntime || 0)}</p>
            <p className="text-sm">Faults: {[...station.activeFaults].join(', ') || 'None'}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Station Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="actualCount" fill="#3182ce" name="Actual Count" />
            <Bar dataKey="efficiency" fill="#38a169" name="Efficiency" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardUI;
