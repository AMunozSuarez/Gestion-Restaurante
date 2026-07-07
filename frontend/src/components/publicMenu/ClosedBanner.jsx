import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

const DAY_LABELS = {
  domingo: 'Domingo',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};

const ClosedBanner = ({ restaurantName, message, schedule }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
        <ClockIcon className="w-14 h-14 mx-auto text-gray-400 mb-4" />
        {restaurantName && (
          <h1 className="text-xl font-bold text-gray-800 mb-1">{restaurantName}</h1>
        )}
        <p className="text-gray-600 mb-4">
          {message || 'Actualmente nos encontramos cerrados.'}
        </p>

        {Array.isArray(schedule) && schedule.length > 0 && (
          <ul className="text-sm text-left divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {schedule.map((entry) => (
              <li key={entry.day} className="flex justify-between px-3 py-2">
                <span className="text-gray-700">{DAY_LABELS[entry.day] || entry.day}</span>
                <span className="text-gray-500">
                  {entry.closed ? 'Cerrado' : `${entry.open} - ${entry.close}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClosedBanner;
