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

      
    </div>
  );
};

export default DashboardUI;
