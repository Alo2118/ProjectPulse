/**
 * PDF Progress Bar Component
 * @module components/pdf/PDFProgressBar
 * 
 * Creates a horizontal progress bar with label and percentage
 * Used for project progress, completion rates, etc.
 */

import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

interface PDFProgressBarProps {
  label: string
  value: number
  max: number
  color?: string
  backgroundColor?: string
  height?: number
  showPercentage?: boolean
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    color: '#374151',
    fontWeight: 'medium',
  },
  percentage: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  barBackground: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
})

export const PDFProgressBar = React.memo(function PDFProgressBar({
  label,
  value,
  max,
  color = '#2563eb',
  backgroundColor = '#e5e7eb',
  height = 8,
  showPercentage = true,
}: PDFProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const widthPercentage = Math.min(100, Math.max(0, percentage))

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showPercentage && (
          <Text style={styles.percentage}>
            {Math.round(percentage)}% ({value}/{max})
          </Text>
        )}
      </View>
      <View style={[styles.barBackground, { height, backgroundColor }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${widthPercentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  )
}, (prev, next) => {
  // Custom comparison - only re-render if these props changed
  return prev.label === next.label &&
         prev.value === next.value &&
         prev.max === next.max &&
         prev.color === next.color &&
         prev.backgroundColor === next.backgroundColor &&
         prev.height === next.height &&
         prev.showPercentage === next.showPercentage
})
