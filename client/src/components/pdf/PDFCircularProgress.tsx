/**
 * PDF Circular Progress Component
 * @module components/pdf/PDFCircularProgress
 * 
 * Creates a circular progress indicator using SVG for React-PDF
 * Displays percentage value in the center
 */

import React from 'react'
import { View, Text, Svg, Circle, Path, StyleSheet } from '@react-pdf/renderer'

interface PDFCircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  showLabel?: boolean
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sublabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
})

export const PDFCircularProgress = React.memo(function PDFCircularProgress({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = '#2563eb',
  backgroundColor = '#e5e7eb',
  showLabel = true,
}: PDFCircularProgressProps) {
  // Calculate circle parameters
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  // Calculate arc path for progress
  const normalizedPercentage = Math.min(100, Math.max(0, percentage)) / 100
  const angle = normalizedPercentage * 360
  const angleRad = (angle - 90) * (Math.PI / 180)
  
  // Start from top (12 o'clock position)
  const startX = center
  const startY = center - radius
  
  // Calculate end point
  const endX = center + radius * Math.cos(angleRad)
  const endY = center + radius * Math.sin(angleRad)
  
  // Large arc flag (1 if angle > 180)
  const largeArcFlag = angle > 180 ? 1 : 0
  
  // Create arc path (clockwise from top)
  const arcPath = normalizedPercentage > 0
    ? `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    : ''

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress arc */}
        {normalizedPercentage > 0 && (
          <Path
            d={arcPath}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{Math.round(percentage)}%</Text>
        </View>
      )}
    </View>
  )
}, (prev, next) => {
  // Custom comparison - only re-render if these props changed
  return prev.percentage === next.percentage &&
         prev.size === next.size &&
         prev.strokeWidth === next.strokeWidth &&
         prev.color === next.color &&
         prev.backgroundColor === next.backgroundColor &&
         prev.showLabel === next.showLabel
})
