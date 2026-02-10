
// Add missing React import to fix the 'Cannot find namespace React' error for React.FC
import React, { useEffect, useRef, useState } from 'react';
import { TripPlan, DayActivity } from '../types';

interface TripMapProps {
  plan: TripPlan;
  activeDayIndex: number;
}

const LeafletCSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LeafletJS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

export const TripMap: React.FC<TripMapProps> = ({ plan, activeDayIndex }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    
    if (!document.querySelector(`link[href="${LeafletCSS}"]`)) {
      const link = document.createElement('link'); 
      link.rel = 'stylesheet'; 
      link.href = LeafletCSS;
      document.head.appendChild(link);
    }
    
    const initLeaflet = () => {
      const L = (window as any).L;
      if (L) {
        if (!isUnmountedRef.current) setIsLoaded(true);
      } else {
        if (!document.querySelector(`script[src="${LeafletJS}"]`)) {
          const script = document.createElement('script'); 
          script.src = LeafletJS; 
          script.async = true;
          script.onload = () => {
            if (!isUnmountedRef.current) setIsLoaded(true);
          };
          script.onerror = (e) => console.error("Failed to load Leaflet script:", e);
          document.body.appendChild(script);
        } else {
          const checkL = setInterval(() => {
            if ((window as any).L) {
              if (!isUnmountedRef.current) setIsLoaded(true);
              clearInterval(checkL);
            }
          }, 100);
        }
      }
    };

    initLeaflet();

    return () => { 
      isUnmountedRef.current = true;
      if (mapInstanceRef.current) { 
        try {
          mapInstanceRef.current.remove(); 
        } catch (e) {
          console.warn("Error cleaning up map instance:", e);
        }
        mapInstanceRef.current = null; 
      } 
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;

    try {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, { 
          zoomControl: false,
          scrollWheelZoom: true 
        }).setView([0, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      }

      // Ensure the map container is properly sized
      mapInstanceRef.current.invalidateSize();

      mapInstanceRef.current.eachLayer((layer: any) => { 
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          layer.remove();
        }
      });

      let activitiesWithCoords: { act: DayActivity; dayIdx: number }[] = [];

      if (activeDayIndex === -1) {
        // Show all days
        plan.days.forEach((day, dIdx) => {
           day.activities.forEach(act => {
             if (act.lat != null && act.lng != null) {
               activitiesWithCoords.push({ act, dayIdx: dIdx });
             }
           });
        });
      } else {
        // Show specific day
        const currentDay = plan.days[activeDayIndex];
        if (currentDay) {
          currentDay.activities.forEach(act => {
             if (act.lat != null && act.lng != null) {
               activitiesWithCoords.push({ act, dayIdx: activeDayIndex });
             }
          });
        }
      }

      const coordinates: [number, number][] = [];

      activitiesWithCoords.forEach(({ act, dayIdx }, idx) => {
        const pos: [number, number] = [act.lat!, act.lng!];
        
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: '', // Prevents default Leaflet white square background
            html: `<div class="w-8 h-8 ${activeDayIndex === -1 ? 'bg-indigo-600' : 'bg-stone-900'} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs transform hover:scale-110 transition-transform">${idx + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(mapInstanceRef.current);
        
        marker.bindPopup(`
          <div class="p-2 font-sans">
            <b class="block mb-1">${act.title}</b>
            <span class="text-[10px] text-stone-500 block mb-1">${act.location}</span>
            ${activeDayIndex === -1 ? `<span class="text-[9px] font-bold bg-stone-100 px-1 py-0.5 rounded text-stone-500">Day ${dayIdx + 1}</span>` : ''}
          </div>
        `);
        coordinates.push(pos);
      });

      if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        if (coordinates.length > 1) {
          L.polyline(coordinates, { 
            color: activeDayIndex === -1 ? '#4f46e5' : '#0ea5e9', 
            weight: 4, 
            dashArray: '8, 8',
            opacity: 0.6
          }).addTo(mapInstanceRef.current);
        }
      }
    } catch (err) {
      console.error("Map rendering error:", err);
    }
  }, [isLoaded, plan, activeDayIndex]);

  return (
    <div className="w-full h-[500px] bg-stone-100 rounded-[2rem] overflow-hidden border border-stone-200 relative shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-50 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Loading Map Engine...</p>
          </div>
        </div>
      )}
    </div>
  );
};
