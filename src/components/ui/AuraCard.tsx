'use client'

import { useMotionTemplate, useMotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AuraCardProps {
    children: React.ReactNode
    className?: string
}

export function AuraCard({ children, className }: AuraCardProps) {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect()
        mouseX.set(clientX - left)
        mouseY.set(clientY - top)
    }

    return (
        <div
            onMouseMove={handleMouseMove}
            className={cn(
                "group relative card card-aura h-full",
                className
            )}
            style={{
                // @ts-expect-error - CSS variables are not yet in React style types
                '--x': useMotionTemplate`${mouseX}px`,
                '--y': useMotionTemplate`${mouseY}px`,
            }}
        >
            {children}
        </div>
    )
}
