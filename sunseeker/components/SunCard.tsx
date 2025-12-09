interface DayInfo {
    date: string;
    sunrise: string;
    sunset: string;
    cloudcover?: number;
    daylightHours?: string; // opzionale
    sunHours: string;
  }
  
  export default function SunCard({ day }: { day: DayInfo }) {
    const sunRatio = Number(day.sunHours) / (day.daylightHours ? Number(day.daylightHours) : 24);
    const radius = 48; // px
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - sunRatio);
  
    return (
      <div className="w-80 md:w-96 p-6 rounded-3xl bg-gradient-to-br from-yellow-100 via-yellow-50 to-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
        
        {/* Date */}
        <h3 className="text-lg md:text-xl font-bold text-yellow-900 mb-4 text-center">
          {new Date(day.date).toLocaleDateString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          })}
        </h3>
  
        {/* Circular Sun Progress */}
        <div className="relative w-32 h-32 mx-auto my-4">
          <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-90deg]">
            {/* Cerchio di sfondo */}
            <circle
              cx={60} cy={60} r={radius}
              stroke="#fde68a"
              strokeWidth="8"
              fill="none"
              className="opacity-30"
            />
            {/* Cerchio progress */}
            <circle
              cx={60} cy={60} r={radius}
              stroke="#fcd34d"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl">☀️</span>
        </div>
  
        {/* Sunrise / Sunset */}
        <div className="flex justify-between items-center mb-4 text-yellow-800">
          <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-xl">
            <span className="text-2xl">🌅</span>
            <span className="font-semibold">
              {new Date(day.sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-xl">
            <span className="font-semibold">
              {new Date(day.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-2xl">🌇</span>
          </div>
        </div>
  
        {/* Divider */}
        <div className="h-px bg-yellow-200 mb-4"></div>
  
        {/* Main Info: Ore di sole */}
        <div className="flex justify-between mb-1 text-yellow-900 font-bold text-lg">
          <span>Ore di sole</span>
          <span>{day.sunHours} h</span>
        </div>
  
        {/* Optional: Ore di luce */}
        {day.daylightHours && (
          <div className="flex justify-between mb-4 text-yellow-900 font-medium">
            <span>Ore di luce</span>
            <span>{day.daylightHours} h</span>
          </div>
        )}
  
        {/* Optional Cloud Cover */}
        {day.cloudcover !== undefined && (
          <div className="mt-2 text-yellow-700 text-sm flex items-center justify-center space-x-1">
            <span>☁️</span>
            <span>{day.cloudcover}% nuvolosità</span>
          </div>
        )}
      </div>
    );
  }
  