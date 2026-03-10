"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

export function AnimatedBackground() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Spring physics for smooth mouse tracking
    const springX = useSpring(0, { stiffness: 50, damping: 20 });
    const springY = useSpring(0, { stiffness: 50, damping: 20 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position between -1 and 1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;

            setMousePosition({ x: e.clientX, y: e.clientY });

            // Move the orb slightly based on mouse position (parallax effect)
            springX.set(x * 100);
            springY.set(y * 100);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [springX, springY]);

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-background">

            {/* Dynamic Interactive Orb (Follows Mouse Slightly) */}
            <motion.div
                style={{ x: springX, y: springY }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-400/20 blur-[120px]"
            />

            {/* Static/Ambient Orbs */}
            <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/15 blur-[120px] animate-pulse duration-[10000ms]" />

            <div className="absolute bottom-[-20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-pink-400/10 blur-[100px]" />

            {/* Noise Texture Overlay */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Subtle Grid Overlay */}
            <div
                className="absolute inset-0 bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:24px_24px]"
                style={{ maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%)' }}
            />
        </div>
    );
}
