/**
 * PDF Pie Chart Component
 * @module components/pdf/PDFPieChart
 * 
 * Creates a donut/pie chart using SVG for React-PDF
 * Includes legend with labels and percentages
 */

import React from 'react'
import { View, Text, Svg, Path, StyleSheet } from '@react-pdf/renderer'

interface PieChartDataItem {
  label: string
  value: number
  color: string
}

interface PDFPieChartProps {
  data: PieChartDataItem[]
  size?: number
  innerRadius?: number
  showLegend?: boolean
  title?: string
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  chartContainer: {
    marginBottom: 12,
  },
  legend: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 8,
    color: '#374151',
    flex: 1,
  },
  legendValue: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
    marginLeft: 4,
  },
})

export const PDFPieChart = React.memo(function PDFPieChart({
  data,
  size = 120,
  innerRadius = 0,
  showLegend = true,
  title,
}: PDFPieChartProps) {
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  if (total === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={{ fontSize: 9, color: '#6b7280' }}>Nessun dato disponibile</Text>
      </View>
    )
  }

  // Calculate angles and paths
  const center = size / 2
  const radius = size / 2

  let currentAngle = -90 // Start from top

  const slices = data.map((item) => {
    const percentage = item.value / total
    const sliceAngle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    // Calculate outer arc points
    const startX = center + radius * Math.cos(startRad)
    const startY = center + radius * Math.sin(startRad)
    const endX = center + radius * Math.cos(endRad)
    const endY = center + radius * Math.sin(endRad)

    let path: string

    if (innerRadius > 0) {
      // Donut chart
      const innerStartX = center + innerRadius * Math.cos(startRad)
      const innerStartY = center + innerRadius * Math.sin(startRad)
      const innerEndX = center + innerRadius * Math.cos(endRad)
      const innerEndY = center + innerRadius * Math.sin(endRad)

      const largeArcFlag = sliceAngle > 180 ? 1 : 0

      path = [
        `M ${startX} ${startY}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L ${innerEndX} ${innerEndY}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
        'Z',
      ].join(' ')
    } else {
      // Pie chart
      const largeArcFlag = sliceAngle > 180 ? 1 : 0

      path = [
        `M ${center} ${center}`,
        `L ${startX} ${startY}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        'Z',
      ].join(' ')
    }

    currentAngle = endAngle

    return {
      path,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: Math.round(percentage * 100),
    }
  })

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {slices.map((slice, index) => (
            <Path key={index} d={slice.path} fill={slice.color} />
          ))}
        </Svg>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {slices.map((slice, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel}>{slice.label}</Text>
              <Text style={styles.legendValue}>
                {slice.percentage}% ({slice.value})
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}, (prev, next) => {
  // Custom comparison - only re-render if these props changed
  // For data, use shallow comparison (referential equality)
  return prev.data === next.data &&
         prev.size === next.size &&
         prev.innerRadius === next.innerRadius &&
         prev.showLegend === next.showLegend &&
         prev.title === next.title
})
