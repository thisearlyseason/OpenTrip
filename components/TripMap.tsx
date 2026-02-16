import React, { useEffect, useRef, useState } from 'react';
import { TripPlan, DayActivity } from '../types';

declare var google: any;

interface TripMapProps {
  plan: TripPlan;
  activeDayIndex: number;
}

export const TripMap: React.FC<TripMapProps> = ({ plan, activeDayIndex }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Fix: use any to avoid "Cannot find namespace 'google'" when types are not available
  const mapInstanceRef = useRef<any>(null);
  // Fix: use any[] to avoid "Cannot find namespace 'google'" when types are not available
  const markersRef = useRef<any[]>([]);
  // Fix: use any to avoid "Cannot find namespace 'google'" when types are not available
  const polylineRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).google) {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#616161" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#e9e9e9" }]
          }
        ]
      });
    }

    // Clear previous elements
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const bounds = new google.maps.LatLngBounds();
    const activitiesWithCoords: { act: DayActivity; dayIdx: number; seq: number }[] = [];

    if (activeDayIndex === -1) {
      plan.days.forEach((day, dIdx) => {
        day.activities.forEach((act, aIdx) => {
          if (act.lat != null && act.lng != null) {
            activitiesWithCoords.push({ act, dayIdx: dIdx, seq: aIdx + 1 });
          }
        });
      });
    } else {
      const currentDay = plan.days[activeDayIndex];
      if (currentDay) {
        currentDay.activities.forEach((act, aIdx) => {
          if (act.lat != null && act.lng != null) {
            activitiesWithCoords.push({ act, dayIdx: activeDayIndex, seq: aIdx + 1 });
          }
        });
      }
    }

    // Fix: use any[] to avoid "Cannot find namespace 'google'" when types are not available
    const path: any[] = [];
    activitiesWithCoords.forEach(({ act, dayIdx, seq }) => {
      const position = { lat: act.lat!, lng: act.lng! };
      path.push(position);
      bounds.extend(position);

      const markerColor = activeDayIndex === -1 ? '#4f46e5' : '#1c1917';
      const label = activeDayIndex === -1 ? `D${dayIdx + 1}.${seq}` : `${seq}`;

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: act.title,
        label: {
          text: label,
          color: 'white',
          fontWeight: 'bold',
          fontSize: '10px' // Adjusted font size for marker label
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3, // Adjusted stroke weight
          scale: 14 // Adjusted scale
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 5px; font-family: sans-serif; color: #333; max-width: 200px;">
            <p style="margin: 0 0 3px; font-size: 9px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px;">
              Day ${dayIdx + 1} • Stop ${seq}
            </p>
            <h4 style="margin: 0 0 3px; font-size: 13px;">${act.title}</h4>
            <p style="margin: 0; font-size: 11px; color: #666;">${act.location}</p>
            <p style="margin: 3px 0 0; font-size: 11px; font-weight: bold;">${act.time}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    if (path.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: activeDayIndex === -1 ? '#4f46e5' : '#1c1917',
        strokeOpacity: 0.8,
        strokeWeight: 4, // Adjusted stroke weight
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: '100%',
          repeat: '100px'
        }]
      });
      polylineRef.current.setMap(mapInstanceRef.current);
    }

    if (!bounds.isEmpty()) {
      mapInstanceRef.current?.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 }); // Adjusted padding
    } else {
      mapInstanceRef.current?.setCenter({ lat: 0, lng: 0 });
      mapInstanceRef.current?.setZoom(2);
    }

  }, [isLoaded, plan, activeDayIndex]);

  return (
    <div className="w-full h-[400px] sm:h-[500px] md:h-[650px] bg-stone-50 rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-stone-200 relative shadow-inner group/map">
      <div ref={mapContainerRef} className="w-full h-full z-[1]" style={{ minHeight: '400px' }} />
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-50/95 backdrop-blur-md flex items-center justify-center z-[10]">
          <div className="flex flex-col items-center gap-4 sm:gap-5">
             <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-stone-400 animate-pulse">Initializing Global Navigation...</p>
          </div>
        </div>
      )}
    </div>
  );
};