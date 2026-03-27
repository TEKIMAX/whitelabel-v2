import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

const LOCATIONS = [
    { location: [37.7595, -122.4367], size: 0.03 }, // San Francisco
    { location: [40.7128, -74.0060], size: 0.03 }, // New York
    { location: [51.5074, -0.1278], size: 0.03 }, // London
    { location: [35.6762, 139.6503], size: 0.03 }, // Tokyo
    { location: [1.3521, 103.8198], size: 0.03 }, // Singapore
    { location: [-33.8688, 151.2093], size: 0.03 }, // Sydney
    { location: [48.8566, 2.3522], size: 0.03 }, // Paris
    { location: [25.2048, 55.2708], size: 0.03 }, // Dubai
    { location: [-23.5505, -46.6333], size: 0.03 }, // Sao Paulo
    { location: [19.0760, 72.8777], size: 0.03 }, // Mumbai
];

export const GlobeViz: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef<number>(0);

    // We use refs to hold mutable animation state without causing re-renders
    const packets = useRef<{
        start: number[];
        end: number[];
        progress: number;
        speed: number;
    }[]>([]);

    useEffect(() => {
        let globe: ReturnType<typeof createGlobe> | null = null;
        let phi = 0;

        if (!canvasRef.current) return;

        const onResize = (width: number, height: number) => {
            if (width === 0 || height === 0) return;

            if (!globe) {
                globe = createGlobe(canvasRef.current!, {
                    devicePixelRatio: 2,
                    width: width * 2,
                    height: width * 2,
                    phi: 0,
                    theta: 0.3,
                    dark: 0,
                    scale: 0.8,
                    diffuse: 1.2,
                    mapSamples: 16000,
                    mapBrightness: 6,
                    baseColor: [0.97, 0.97, 0.95],
                    markerColor: [0.77, 0.62, 0.35],
                    glowColor: [0.95, 0.95, 0.95],
                    opacity: 0.8,
                    markers: [],
                    onRender: (state) => {
                        // 1. Rotation
                        if (!pointerInteracting.current) {
                            phi += 0.003;
                        }
                        state.phi = phi + pointerInteractionMovement.current;

                        // 2. Spawn new packets randomly
                        if (Math.random() < 0.02) { // 2% chance per frame
                            const startIdx = Math.floor(Math.random() * LOCATIONS.length);
                            let endIdx = Math.floor(Math.random() * LOCATIONS.length);
                            while (endIdx === startIdx) {
                                endIdx = Math.floor(Math.random() * LOCATIONS.length);
                            }
                            packets.current.push({
                                start: LOCATIONS[startIdx].location,
                                end: LOCATIONS[endIdx].location,
                                progress: 0,
                                speed: 0.01 + Math.random() * 0.01 // Random speed
                            });
                        }

                        // 3. Update packets
                        // Filter out finished packets
                        packets.current = packets.current.filter(p => p.progress < 1);

                        const dynamicMarkers = packets.current.map(p => {
                            p.progress += p.speed;

                            // Simple linear interpolation
                            const lat = p.start[0] + (p.end[0] - p.start[0]) * p.progress;
                            const lon = p.start[1] + (p.end[1] - p.start[1]) * p.progress;

                            // Size grows in the middle of the arc to simulate "jumping" height
                            const arcHeight = Math.sin(p.progress * Math.PI);
                            const size = 0.02 + (arcHeight * 0.04);

                            return {
                                location: [lat, lon],
                                size: size
                            };
                        });

                        // 4. Combine static cities and moving packets
                        state.markers = [
                            ...LOCATIONS,
                            ...dynamicMarkers
                        ];
                    },
                });
            }
        };

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    onResize(width, height);
                }
            }
        });

        resizeObserver.observe(canvasRef.current);

        return () => {
            if (globe) globe.destroy();
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div
            className="w-full h-full flex items-center justify-center opacity-80 mix-blend-multiply grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
            style={{
                maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta * 0.004;
                    }
                }}
                onTouchMove={(e) => {
                    if (pointerInteracting.current !== null && e.touches[0]) {
                        const delta = e.touches[0].clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta * 0.004;
                    }
                }}
            />
        </div>
    );
};