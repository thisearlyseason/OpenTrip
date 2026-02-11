
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

      // Ensure map is reactive to size changes
      mapInstanceRef.current.invalidateSize();

      // Clear existing overlays
      mapInstanceRef.current.eachLayer((layer: any) => { 
        if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.DivIcon) {
          layer.remove();
        }
      });

      let activitiesWithCoords: { act: DayActivity; dayIdx: number; seq: number }[] = [];

      if (activeDayIndex === -1) {
        // Full Journey Mode
        plan.days.forEach((day, dIdx) => {
           day.activities.forEach((act, aIdx) => {
             if (act.lat != null && act.lng != null) {
               activitiesWithCoords.push({ act, dayIdx: dIdx, seq: aIdx + 1 });
             }
           });
        });
      } else {
        // Specific Day Mode
        const currentDay = plan.days[activeDayIndex];
        if (currentDay) {
          currentDay.activities.forEach((act, aIdx) => {
             if (act.lat != null && act.lng != null) {
               activitiesWithCoords.push({ act, dayIdx: activeDayIndex, seq: aIdx + 1 });
             }
          });
        }
      }

      const coordinates: [number, number][] = [];

      activitiesWithCoords.forEach(({ act, dayIdx, seq }, idx) => {
        const pos: [number, number] = [act.lat!, act.lng!];
        
        // Color coding: Specific day view uses black, full overview uses indigo
        const dayColorClass = activeDayIndex === -1 ? 'bg-indigo-600' : 'bg-stone-900';
        
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: '', 
            html: `<div class="w-10 h-10 ${dayColorClass} rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white font-black text-xs transform hover:scale-125 transition-all duration-300">
                     ${activeDayIndex === -1 ? `D${dayIdx + 1}.${seq}` : seq}
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(mapInstanceRef.current);
        
        marker.bindPopup(`
          <div class="p-4 font-sans min-w-[180px]">
            <p class="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">Day ${dayIdx + 1} • Stop ${seq}</p>
            <b class="text-sm block text-stone-900 mb-1 leading-tight">${act.title}</b>
            <p class="text-[10px] text-stone-500 leading-normal mb-3">${act.location}</p>
            <div class="flex items-center gap-2 pt-2 border-t border-stone-100">
               <span class="text-xs font-bold text-stone-800">${act.time}</span>
               <span class="text-[10px] text-stone-400 font-bold uppercase tracking-widest">• ${act.durationMinutes}m</span>
            </div>
          </div>
        `, { className: 'custom-map-popup' });
        
        coordinates.push(pos);
      });

      if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        mapInstanceRef.current.fitBounds(bounds, { 
          padding: [100, 100], 
          maxZoom: 16, 
          animate: true,
          duration: 1.5 
        });
        
        if (coordinates.length > 1) {
          // Draw the route line strictly for the active focus
          L.polyline(coordinates, { 
            color: activeDayIndex === -1 ? '#4f46e5' : '#1c1917', 
            weight: 6, 
            dashArray: '12, 12',
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(mapInstanceRef.current);
        }
      }
    } catch (err) {
      console.error("Map rendering sequence failed:", err);
    }
  }, [isLoaded, plan, activeDayIndex]);

  return (
    <div className="w-full h-[650px] bg-stone-50 rounded-[3rem] overflow-hidden border border-stone-200 relative shadow-inner group/map">
      <div ref={mapContainerRef} className="w-full h-full z-[1]" style={{ minHeight: '650px' }} />
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-50/95 backdrop-blur-md flex items-center justify-center z-[10]">
          <div className="flex flex-col items-center gap-5">
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 animate-pulse">Synchronizing Journey Map...</p>
          </div>
        </div>
      )}
    </div>
  );
};
