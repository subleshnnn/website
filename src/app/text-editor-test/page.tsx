'use client'

import { useState, useRef, useEffect } from 'react'
import { useDrag } from '@use-gesture/react'
import { useFont } from '@/contexts/FontContext'
import { FONT_SIZES } from '@/lib/constants'
import { useSearchParams } from 'next/navigation'

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  hasShadow: boolean
  hasBackground: boolean
  backgroundColor: string
  maxWidth?: number
  textAlign?: 'left' | 'center' | 'right'
}

interface ImageElement {
  id: string
  url: string
  x: number
  y: number
  width: number
  height: number
  aspectRatio: number
}

interface DrawingStroke {
  points: { x: number; y: number }[]
  color: string
  width: number
}

interface DrawingElement {
  id: string
  strokes: DrawingStroke[]
  x: number
  y: number
  scale: number
}

export default function TextEditorTest() {
  const { fontFamily } = useFont()
  const searchParams = useSearchParams()
  const isEmbedMode = searchParams.get('mode') === 'embed'
  const [imageElements, setImageElements] = useState<ImageElement[]>([])
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff')
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'text' | 'image' | 'drawing' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingElement, setEditingElement] = useState<string | null>(null)
  const [showGuides, setShowGuides] = useState<{ vertical: boolean; horizontal: boolean; verticalPos?: number; horizontalPos?: number }>({ vertical: false, horizontal: false })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [drawingMode, setDrawingMode] = useState(false)
  const [pencilColor, setPencilColor] = useState<string>('#000000')
  const [pencilWidth, setPencilWidth] = useState<number>(3)
  const [currentDrawingGroupId, setCurrentDrawingGroupId] = useState<string | null>(null)
  const [history, setHistory] = useState<{
    textElements: TextElement[]
    imageElements: ImageElement[]
    drawingElements: DrawingElement[]
  }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const textMeasureCanvas = useRef<HTMLCanvasElement | null>(null)

  // Initialize canvas for text measurement
  if (typeof window !== 'undefined' && !textMeasureCanvas.current) {
    textMeasureCanvas.current = document.createElement('canvas')
  }

  // Save to history
  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      textElements: JSON.parse(JSON.stringify(textElements)),
      imageElements: JSON.parse(JSON.stringify(imageElements)),
      drawingElements: JSON.parse(JSON.stringify(drawingElements))
    })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const state = history[newIndex]
      setTextElements(JSON.parse(JSON.stringify(state.textElements)))
      setImageElements(JSON.parse(JSON.stringify(state.imageElements)))
      setDrawingElements(JSON.parse(JSON.stringify(state.drawingElements)))
    }
  }

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const state = history[newIndex]
      setTextElements(JSON.parse(JSON.stringify(state.textElements)))
      setImageElements(JSON.parse(JSON.stringify(state.imageElements)))
      setDrawingElements(JSON.parse(JSON.stringify(state.drawingElements)))
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when editing text
      if (editingElement) return

      // Cmd+Z (Mac) or Ctrl+Z (Windows) for Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows) or Cmd+R for Redo
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || (e.metaKey && e.key === 'r')) {
        e.preventDefault()
        redo()
      }

      // Backspace or Delete to delete selected element
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedElement && selectedType) {
        e.preventDefault()
        if (selectedType === 'text') {
          deleteElement(selectedElement)
        } else if (selectedType === 'image') {
          deleteImageElement(selectedElement)
        } else if (selectedType === 'drawing') {
          deleteDrawingElement(selectedElement)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingElement, selectedElement, selectedType, historyIndex, history])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // End drawing session
    setDrawingMode(false)
    setCurrentDrawingGroupId(null)
    setSelectedElement(null)
    setSelectedType(null)

    if (imageElements.length >= 4) {
      alert('Maximum 4 images allowed')
      return
    }

    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height

        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const canvasSize = rect.width
        let width, height

        // Fill canvas on the longest dimension
        if (aspectRatio >= 1) {
          width = canvasSize
          height = canvasSize / aspectRatio
        } else {
          height = canvasSize
          width = canvasSize * aspectRatio
        }

        const newImage: ImageElement = {
          id: Date.now().toString(),
          url,
          x: (canvasSize - width) / 2,
          y: (canvasSize - height) / 2,
          width,
          height,
          aspectRatio
        }

        setImageElements([...imageElements, newImage])
        setSelectedType('image')
        setSelectedElement(newImage.id)
        setTimeout(saveToHistory, 0)
      }
      img.src = url
      e.target.value = '' // Reset input
    }
  }

  const addText = () => {
    // End drawing session
    setDrawingMode(false)
    setCurrentDrawingGroupId(null)
    setSelectedElement(null)
    setSelectedType(null)

    const newText: TextElement = {
      id: Date.now().toString(),
      text: 'New Text',
      x: 50,
      y: 50,
      fontSize: 48,
      color: '#ffffff',
      fontFamily: fontFamily,
      hasShadow: true,
      hasBackground: false,
      backgroundColor: '#000000',
      maxWidth: containerRef.current ? containerRef.current.getBoundingClientRect().width - 70 : undefined,
      textAlign: 'left'
    }
    setTextElements([...textElements, newText])
    setTimeout(saveToHistory, 0)
  }

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const updateImageElement = (id: string, updates: Partial<ImageElement>) => {
    setImageElements(imageElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const deleteElement = (id: string) => {
    setTextElements(textElements.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
    setTimeout(saveToHistory, 0)
  }

  const deleteImageElement = (id: string) => {
    setImageElements(imageElements.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
      setSelectedType(null)
    }
    setTimeout(saveToHistory, 0)
  }

  const updateDrawingElement = (id: string, updates: Partial<DrawingElement>) => {
    setDrawingElements(drawingElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const deleteDrawingElement = (id: string) => {
    setDrawingElements(drawingElements.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
      setSelectedType(null)
    }
    setTimeout(saveToHistory, 0)
  }

  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const element = textElements.find(el => el.id === id)
    if (!element || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setIsDragging(true)
    setSelectedType('text')
    setSelectedElement(id)
    setDragOffset({
      x: mouseX - element.x,
      y: mouseY - element.y
    })
  }

  const handleTextClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedType('text')
    setSelectedElement(id)
  }

  const handleImageMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const imageElement = imageElements.find(el => el.id === id)
    if (!imageElement || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setIsDragging(true)
    setSelectedType('image')
    setSelectedElement(id)
    setDragOffset({
      x: mouseX - imageElement.x,
      y: mouseY - imageElement.y
    })
  }

  const handleImageClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedType('image')
    setSelectedElement(id)
  }

  const handleDrawingMouseDown = (e: React.MouseEvent, id: string) => {
    if (drawingMode) return
    e.stopPropagation()
    const drawing = drawingElements.find(el => el.id === id)
    if (!drawing || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setIsDragging(true)
    setSelectedType('drawing')
    setSelectedElement(id)
    setDragOffset({
      x: mouseX - drawing.x,
      y: mouseY - drawing.y
    })
  }

  const handleDrawingClick = (e: React.MouseEvent, id: string) => {
    if (drawingMode) return
    e.stopPropagation()
    setSelectedType('drawing')
    setSelectedElement(id)
  }

  const handleCanvasClick = () => {
    if (!drawingMode) {
      setSelectedType(null)
      setSelectedElement(null)
    }
  }

  const handleDrawingStart = (e: React.MouseEvent) => {
    if (!drawingMode || !containerRef.current) return
    e.stopPropagation()

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setCurrentPath([{ x, y }])
  }

  const handleDrawingMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawingMode || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPath(prev => [...prev, { x, y }])
  }

  const handleDrawingEnd = () => {
    if (!isDrawing || !drawingMode || !containerRef.current) return

    if (currentPath.length > 1) {
      const newStroke: DrawingStroke = {
        points: currentPath,
        color: pencilColor,
        width: pencilWidth
      }

      if (currentDrawingGroupId) {
        // Add stroke to existing group
        setDrawingElements(prev => prev.map(el => {
          if (el.id === currentDrawingGroupId) {
            // Convert existing strokes back to absolute coordinates
            const existingAbsolutePoints = el.strokes.flatMap(s =>
              s.points.map(p => ({ x: el.x + p.x, y: el.y + p.y }))
            )

            // Add new stroke absolute coordinates
            const allAbsolutePoints = [...existingAbsolutePoints, ...currentPath]
            const xs = allAbsolutePoints.map(p => p.x)
            const ys = allAbsolutePoints.map(p => p.y)
            const minX = Math.min(...xs)
            const minY = Math.min(...ys)

            // Normalize existing strokes relative to new bounding box
            const normalizedExistingStrokes = el.strokes.map(stroke => ({
              ...stroke,
              points: stroke.points.map(p => ({
                x: el.x + p.x - minX,
                y: el.y + p.y - minY
              }))
            }))

            // Normalize new stroke
            const normalizedNewStroke = {
              ...newStroke,
              points: newStroke.points.map(p => ({
                x: p.x - minX,
                y: p.y - minY
              }))
            }

            return {
              ...el,
              strokes: [...normalizedExistingStrokes, normalizedNewStroke],
              x: minX,
              y: minY
            }
          }
          return el
        }))
      } else {
        // Create new group
        const xs = currentPath.map(p => p.x)
        const ys = currentPath.map(p => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)

        const normalizedPoints = currentPath.map(p => ({
          x: p.x - minX,
          y: p.y - minY
        }))

        const newDrawingGroup: DrawingElement = {
          id: Date.now().toString(),
          strokes: [{
            points: normalizedPoints,
            color: pencilColor,
            width: pencilWidth
          }],
          x: minX,
          y: minY,
          scale: 1
        }

        setDrawingElements(prev => [...prev, newDrawingGroup])
        setCurrentDrawingGroupId(newDrawingGroup.id)
        setSelectedType('drawing')
        setSelectedElement(newDrawingGroup.id)
      }
    }

    setIsDrawing(false)
    setCurrentPath([])
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingMode) {
      handleDrawingMove(e)
      return
    }

    // Check if dragging and over trash zone
    if ((isDragging || isResizing) && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const trashZoneWidth = 80
      const trashZoneHeight = 80
      const trashZoneX = (rect.width - trashZoneWidth) / 2
      const trashZoneY = rect.height - trashZoneHeight
      const overTrash = mouseX >= trashZoneX && mouseX <= trashZoneX + trashZoneWidth &&
                        mouseY >= trashZoneY && mouseY <= rect.height
      setIsOverTrash(overTrash)
    }

    if (isResizing && selectedElement && containerRef.current && selectedType === 'image') {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const imageElement = imageElements.find(el => el.id === selectedElement)
      if (!imageElement) return

      let newWidth = imageElement.width
      let newHeight = imageElement.height
      let newX = imageElement.x
      let newY = imageElement.y

      const snapThreshold = 10

      if (resizeCorner === 'br') {
        // Bottom-right: anchor top-left (x,y stay fixed)
        newWidth = mouseX - imageElement.x
        newHeight = newWidth / imageElement.aspectRatio
      } else if (resizeCorner === 'tr') {
        // Top-right: anchor bottom-left (x stays fixed, bottom y is fixed)
        const bottomY = imageElement.y + imageElement.height
        newWidth = mouseX - imageElement.x
        newHeight = newWidth / imageElement.aspectRatio
        newY = bottomY - newHeight
      } else if (resizeCorner === 'bl') {
        // Bottom-left: anchor top-right (right x is fixed, top y stays fixed)
        const rightX = imageElement.x + imageElement.width
        newWidth = rightX - mouseX
        newHeight = newWidth / imageElement.aspectRatio
        newX = rightX - newWidth
      } else if (resizeCorner === 'tl') {
        // Top-left: anchor bottom-right (right x and bottom y are fixed)
        const rightX = imageElement.x + imageElement.width
        const bottomY = imageElement.y + imageElement.height
        newWidth = rightX - mouseX
        newHeight = newWidth / imageElement.aspectRatio
        newX = rightX - newWidth
        newY = bottomY - newHeight
      }

      // Constrain minimum size
      if (newWidth > 20 && newHeight > 20) {
        updateImageElement(selectedElement, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        })
      }
      return
    }

    if (isResizing && selectedElement && containerRef.current && selectedType === 'drawing') {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const drawing = drawingElements.find(el => el.id === selectedElement)
      if (!drawing) return

      // Get current bounding box across all strokes
      const allPoints = drawing.strokes.flatMap(stroke =>
        stroke.points.map(p => ({ x: p.x * drawing.scale, y: p.y * drawing.scale }))
      )
      const xs = allPoints.map(p => p.x)
      const ys = allPoints.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const currentWidth = maxX - minX
      const currentHeight = maxY - minY

      let newScale = drawing.scale

      if (resizeCorner === 'br') {
        // Bottom-right: calculate scale based on mouse distance from top-left
        const desiredWidth = mouseX - drawing.x
        newScale = desiredWidth / currentWidth
      } else if (resizeCorner === 'tr') {
        // Top-right: scale from bottom-left
        const desiredWidth = mouseX - drawing.x
        newScale = desiredWidth / currentWidth
        // Adjust y position to keep bottom anchored
        const newHeight = currentHeight * newScale
        const newY = (drawing.y + currentHeight * drawing.scale) - newHeight
        updateDrawingElement(selectedElement, { scale: newScale, y: newY })
        return
      } else if (resizeCorner === 'bl') {
        // Bottom-left: scale from top-right
        const rightX = drawing.x + currentWidth * drawing.scale
        const desiredWidth = rightX - mouseX
        newScale = desiredWidth / currentWidth
        // Adjust x position to keep right anchored
        const newWidth = currentWidth * newScale
        const newX = rightX - newWidth
        updateDrawingElement(selectedElement, { scale: newScale, x: newX })
        return
      } else if (resizeCorner === 'tl') {
        // Top-left: scale from bottom-right
        const rightX = drawing.x + currentWidth * drawing.scale
        const bottomY = drawing.y + currentHeight * drawing.scale
        const desiredWidth = rightX - mouseX
        newScale = desiredWidth / currentWidth
        // Adjust both x and y
        const newWidth = currentWidth * newScale
        const newHeight = currentHeight * newScale
        const newX = rightX - newWidth
        const newY = bottomY - newHeight
        updateDrawingElement(selectedElement, { scale: newScale, x: newX, y: newY })
        return
      }

      if (newScale > 0.1) {
        updateDrawingElement(selectedElement, { scale: newScale })
      }
      return
    }

    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    let newX = mouseX - dragOffset.x
    let newY = mouseY - dragOffset.y

    const snapThreshold = 10
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    if (selectedType === 'text' && selectedElement) {
      const element = textElements.find(el => el.id === selectedElement)
      if (element && textMeasureCanvas.current) {
        // Measure text dimensions
        const ctx = textMeasureCanvas.current.getContext('2d')
        if (ctx) {
          ctx.font = `${element.fontSize}px ${element.fontFamily}`

          // Calculate wrapped text dimensions
          const maxWidth = element.maxWidth || rect.width - element.x - 20
          const wrappedLines = wrapText(ctx, element.text, maxWidth)
          const measuredWidth = Math.max(...wrappedLines.map(line => ctx.measureText(line).width))
          const textHeight = element.fontSize * 1.2 * wrappedLines.length

          // Account for padding (4px on each side = 8px total)
          const padding = 8
          const boundingBoxWidth = measuredWidth + padding
          const boundingBoxHeight = textHeight + padding

          // Calculate text center (including padding)
          const textCenterX = newX + boundingBoxWidth / 2
          const textCenterY = newY + boundingBoxHeight / 2

          // Check alignment with canvas center
          let showVertical = Math.abs(textCenterX - centerX) < snapThreshold
          let showHorizontal = Math.abs(textCenterY - centerY) < snapThreshold
          let verticalPos = centerX
          let horizontalPos = centerY

          if (showVertical) {
            newX = centerX - boundingBoxWidth / 2
          }
          if (showHorizontal) {
            newY = centerY - boundingBoxHeight / 2
          }

          // Check alignment with other text elements
          textElements.forEach(otherElement => {
            if (otherElement.id === selectedElement) return

            ctx.font = `${otherElement.fontSize}px ${otherElement.fontFamily}`
            const otherMaxWidthLimit = otherElement.maxWidth || rect.width - otherElement.x - 20
            const otherWrappedLines = wrapText(ctx, otherElement.text, otherMaxWidthLimit)
            const otherMaxWidth = Math.max(...otherWrappedLines.map(line => ctx.measureText(line).width))
            const otherHeight = otherElement.fontSize * 1.2 * otherWrappedLines.length
            const otherBBoxWidth = otherMaxWidth + 8
            const otherBBoxHeight = otherHeight + 8
            const otherCenterX = otherElement.x + otherBBoxWidth / 2
            const otherCenterY = otherElement.y + otherBBoxHeight / 2

            // Center alignment
            if (Math.abs(textCenterX - otherCenterX) < snapThreshold) {
              newX = otherCenterX - boundingBoxWidth / 2
              showVertical = true
              verticalPos = otherCenterX
            }
            if (Math.abs(textCenterY - otherCenterY) < snapThreshold) {
              newY = otherCenterY - boundingBoxHeight / 2
              showHorizontal = true
              horizontalPos = otherCenterY
            }

            // Edge-to-edge snapping
            // Left edge to right edge
            if (Math.abs(newX - (otherElement.x + otherBBoxWidth)) < snapThreshold) {
              newX = otherElement.x + otherBBoxWidth
              showVertical = true
              verticalPos = newX
            }
            // Right edge to left edge
            if (Math.abs((newX + boundingBoxWidth) - otherElement.x) < snapThreshold) {
              newX = otherElement.x - boundingBoxWidth
              showVertical = true
              verticalPos = otherElement.x
            }
            // Top edge to bottom edge
            if (Math.abs(newY - (otherElement.y + otherBBoxHeight)) < snapThreshold) {
              newY = otherElement.y + otherBBoxHeight
              showHorizontal = true
              horizontalPos = newY
            }
            // Bottom edge to top edge
            if (Math.abs((newY + boundingBoxHeight) - otherElement.y) < snapThreshold) {
              newY = otherElement.y - boundingBoxHeight
              showHorizontal = true
              horizontalPos = otherElement.y
            }
          })

          // Check alignment with all images
          imageElements.forEach(imageElement => {
            const imageCenterX = imageElement.x + imageElement.width / 2
            const imageCenterY = imageElement.y + imageElement.height / 2

            // Center alignment
            if (Math.abs(textCenterX - imageCenterX) < snapThreshold) {
              newX = imageCenterX - boundingBoxWidth / 2
              showVertical = true
              verticalPos = imageCenterX
            }
            if (Math.abs(textCenterY - imageCenterY) < snapThreshold) {
              newY = imageCenterY - boundingBoxHeight / 2
              showHorizontal = true
              horizontalPos = imageCenterY
            }

            // Edge-to-edge snapping with image
            // Left edge to right edge of image
            if (Math.abs(newX - (imageElement.x + imageElement.width)) < snapThreshold) {
              newX = imageElement.x + imageElement.width
              showVertical = true
              verticalPos = newX
            }
            // Right edge to left edge of image
            if (Math.abs((newX + boundingBoxWidth) - imageElement.x) < snapThreshold) {
              newX = imageElement.x - boundingBoxWidth
              showVertical = true
              verticalPos = imageElement.x
            }
            // Top edge to bottom edge of image
            if (Math.abs(newY - (imageElement.y + imageElement.height)) < snapThreshold) {
              newY = imageElement.y + imageElement.height
              showHorizontal = true
              horizontalPos = newY
            }
            // Bottom edge to top edge of image
            if (Math.abs((newY + boundingBoxHeight) - imageElement.y) < snapThreshold) {
              newY = imageElement.y - boundingBoxHeight
              showHorizontal = true
              horizontalPos = imageElement.y
            }
          })

          setShowGuides({ vertical: showVertical, horizontal: showHorizontal, verticalPos, horizontalPos })

          const constrainedX = Math.max(0, Math.min(rect.width - boundingBoxWidth, newX))
          const constrainedY = Math.max(0, Math.min(rect.height - boundingBoxHeight, newY))
          updateElement(selectedElement, { x: constrainedX, y: constrainedY })
        }
      }
    } else if (selectedType === 'image' && selectedElement) {
      const imageElement = imageElements.find(el => el.id === selectedElement)
      if (!imageElement) return

      const elementCenterX = newX + imageElement.width / 2
      const elementCenterY = newY + imageElement.height / 2

      // Check alignment with canvas center
      let showVertical = Math.abs(elementCenterX - centerX) < snapThreshold
      let showHorizontal = Math.abs(elementCenterY - centerY) < snapThreshold
      let verticalPos = centerX
      let horizontalPos = centerY

      if (showVertical) {
        newX = centerX - imageElement.width / 2
      }
      if (showHorizontal) {
        newY = centerY - imageElement.height / 2
      }

      // Check alignment with text elements
      if (textMeasureCanvas.current) {
        const ctx = textMeasureCanvas.current.getContext('2d')
        if (ctx) {
          textElements.forEach(textElement => {
            ctx.font = `${textElement.fontSize}px ${textElement.fontFamily}`
            const maxWidthLimit = textElement.maxWidth || rect.width - textElement.x - 20
            const wrappedLines = wrapText(ctx, textElement.text, maxWidthLimit)
            const maxWidth = Math.max(...wrappedLines.map(line => ctx.measureText(line).width))
            const height = textElement.fontSize * 1.2 * wrappedLines.length
            const bboxWidth = maxWidth + 8
            const bboxHeight = height + 8
            const textCenterX = textElement.x + bboxWidth / 2
            const textCenterY = textElement.y + bboxHeight / 2

            // Center alignment
            if (Math.abs(elementCenterX - textCenterX) < snapThreshold) {
              newX = textCenterX - imageElement.width / 2
              showVertical = true
              verticalPos = textCenterX
            }
            if (Math.abs(elementCenterY - textCenterY) < snapThreshold) {
              newY = textCenterY - imageElement.height / 2
              showHorizontal = true
              horizontalPos = textCenterY
            }

            // Edge-to-edge snapping with text
            // Left edge to right edge of text
            if (Math.abs(newX - (textElement.x + bboxWidth)) < snapThreshold) {
              newX = textElement.x + bboxWidth
              showVertical = true
              verticalPos = newX
            }
            // Right edge to left edge of text
            if (Math.abs((newX + imageElement.width) - textElement.x) < snapThreshold) {
              newX = textElement.x - imageElement.width
              showVertical = true
              verticalPos = textElement.x
            }
            // Top edge to bottom edge of text
            if (Math.abs(newY - (textElement.y + bboxHeight)) < snapThreshold) {
              newY = textElement.y + bboxHeight
              showHorizontal = true
              horizontalPos = newY
            }
            // Bottom edge to top edge of text
            if (Math.abs((newY + imageElement.height) - textElement.y) < snapThreshold) {
              newY = textElement.y - imageElement.height
              showHorizontal = true
              horizontalPos = textElement.y
            }
          })
        }
      }

      // Check alignment with other images
      imageElements.forEach(otherImage => {
        if (otherImage.id === selectedElement) return

        const otherCenterX = otherImage.x + otherImage.width / 2
        const otherCenterY = otherImage.y + otherImage.height / 2

        // Center alignment
        if (Math.abs(elementCenterX - otherCenterX) < snapThreshold) {
          newX = otherCenterX - imageElement.width / 2
          showVertical = true
          verticalPos = otherCenterX
        }
        if (Math.abs(elementCenterY - otherCenterY) < snapThreshold) {
          newY = otherCenterY - imageElement.height / 2
          showHorizontal = true
          horizontalPos = otherCenterY
        }

        // Left edge to left edge alignment
        if (Math.abs(newX - otherImage.x) < snapThreshold) {
          newX = otherImage.x
          showVertical = true
          verticalPos = otherImage.x
        }
        // Right edge to right edge alignment
        if (Math.abs((newX + imageElement.width) - (otherImage.x + otherImage.width)) < snapThreshold) {
          newX = otherImage.x + otherImage.width - imageElement.width
          showVertical = true
          verticalPos = otherImage.x + otherImage.width
        }

        // Top edge to top edge alignment
        if (Math.abs(newY - otherImage.y) < snapThreshold) {
          newY = otherImage.y
          showHorizontal = true
          horizontalPos = otherImage.y
        }
        // Bottom edge to bottom edge alignment
        if (Math.abs((newY + imageElement.height) - (otherImage.y + otherImage.height)) < snapThreshold) {
          newY = otherImage.y + otherImage.height - imageElement.height
          showHorizontal = true
          horizontalPos = otherImage.y + otherImage.height
        }

        // Edge-to-edge snapping
        // Left edge to right edge
        if (Math.abs(newX - (otherImage.x + otherImage.width)) < snapThreshold) {
          newX = otherImage.x + otherImage.width
          showVertical = true
          verticalPos = newX
        }
        // Right edge to left edge
        if (Math.abs((newX + imageElement.width) - otherImage.x) < snapThreshold) {
          newX = otherImage.x - imageElement.width
          showVertical = true
          verticalPos = otherImage.x
        }
        // Top edge to bottom edge
        if (Math.abs(newY - (otherImage.y + otherImage.height)) < snapThreshold) {
          newY = otherImage.y + otherImage.height
          showHorizontal = true
          horizontalPos = newY
        }
        // Bottom edge to top edge
        if (Math.abs((newY + imageElement.height) - otherImage.y) < snapThreshold) {
          newY = otherImage.y - imageElement.height
          showHorizontal = true
          horizontalPos = otherImage.y
        }
      })

      setShowGuides({ vertical: showVertical, horizontal: showHorizontal, verticalPos, horizontalPos })

      const constrainedX = Math.max(0, Math.min(rect.width - imageElement.width, newX))
      const constrainedY = Math.max(0, Math.min(rect.height - imageElement.height, newY))
      updateImageElement(selectedElement, { x: constrainedX, y: constrainedY })
    } else if (selectedType === 'drawing' && selectedElement) {
      const drawing = drawingElements.find(el => el.id === selectedElement)
      if (!drawing) return

      updateDrawingElement(selectedElement, { x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    if (drawingMode) {
      handleDrawingEnd()
      return
    }

    // Delete element if dropped on trash
    if ((isDragging || isResizing) && isOverTrash && selectedElement && selectedType) {
      if (selectedType === 'text') {
        deleteElement(selectedElement)
      } else if (selectedType === 'image') {
        deleteImageElement(selectedElement)
      } else if (selectedType === 'drawing') {
        deleteDrawingElement(selectedElement)
      }
    } else if (isDragging || isResizing) {
      // Save to history only if not deleted
      setTimeout(saveToHistory, 0)
    }

    setIsDragging(false)
    setIsResizing(false)
    setResizeCorner(null)
    setShowGuides({ vertical: false, horizontal: false })
    setIsOverTrash(false)
  }

  const handleResize = (percent: number) => {
    if (!containerRef.current || !selectedElement) return
    const rect = containerRef.current.getBoundingClientRect()

    const imageElement = imageElements.find(el => el.id === selectedElement)
    if (!imageElement) return

    // Calculate new dimensions
    let newWidth = (percent / 100) * rect.width
    let newHeight = newWidth / imageElement.aspectRatio

    const snapThreshold = 5

    // Check if dimensions match other images
    imageElements.forEach(otherImage => {
      if (otherImage.id === selectedElement) return

      // Snap to same height
      if (Math.abs(newHeight - otherImage.height) < snapThreshold) {
        newHeight = otherImage.height
        newWidth = newHeight * imageElement.aspectRatio
        setShowGuides({ ...showGuides, horizontal: true, horizontalPos: imageElement.y + newHeight })
      }
      // Snap to same width
      if (Math.abs(newWidth - otherImage.width) < snapThreshold) {
        newWidth = otherImage.width
        newHeight = newWidth / imageElement.aspectRatio
        setShowGuides({ ...showGuides, vertical: true, verticalPos: imageElement.x + newWidth })
      }
    })

    // Keep top-left corner fixed (resize from bottom-right)
    updateImageElement(selectedElement, {
      x: imageElement.x,
      y: imageElement.y,
      width: newWidth,
      height: newHeight
    })
  }

  const handleTextResize = (elementId: string, newFontSize: number) => {
    const element = textElements.find(el => el.id === elementId)
    if (!element || !textMeasureCanvas.current || !containerRef.current) return

    const ctx = textMeasureCanvas.current.getContext('2d')
    if (!ctx) return

    const rect = containerRef.current.getBoundingClientRect()

    // Simple approach: scale proportionally from center
    const scaleFactor = newFontSize / element.fontSize

    // Calculate current dimensions
    const maxWidth = element.maxWidth || rect.width - element.x - 20
    ctx.font = `${element.fontSize}px ${element.fontFamily}`
    const wrappedLines = wrapText(ctx, element.text, maxWidth)
    const currentHeight = element.fontSize * 1.2 * wrappedLines.length
    const currentBBoxWidth = Math.min(maxWidth, Math.max(...wrappedLines.map(line => ctx.measureText(line).width))) + 8
    const currentBBoxHeight = currentHeight + 8

    // Calculate center point
    const centerX = element.x + currentBBoxWidth / 2
    const centerY = element.y + currentBBoxHeight / 2

    // Scale dimensions
    const newBBoxWidth = currentBBoxWidth * scaleFactor
    const newBBoxHeight = currentBBoxHeight * scaleFactor

    // Calculate new position to keep center
    let newX = centerX - newBBoxWidth / 2
    let newY = centerY - newBBoxHeight / 2

    // Constrain to canvas bounds
    newX = Math.max(0, Math.min(rect.width - newBBoxWidth, newX))
    newY = Math.max(0, Math.min(rect.height - newBBoxHeight, newY))

    updateElement(elementId, {
      fontSize: newFontSize,
      x: newX,
      y: newY
    })
  }

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  const saveImage = () => {
    // End drawing session
    setDrawingMode(false)
    setCurrentDrawingGroupId(null)
    setSelectedElement(null)
    setSelectedType(null)

    if (!containerRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = 2000
    canvas.height = 2000
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate scale from screen to 2000px
    const rect = containerRef.current.getBoundingClientRect()
    const scale = 2000 / rect.width

    // Draw background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, 2000, 2000)

    // Load all images and draw
    if (imageElements.length > 0) {
      let loadedImages = 0
      const totalImages = imageElements.length

      imageElements.forEach(imageElement => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, imageElement.x * scale, imageElement.y * scale, imageElement.width * scale, imageElement.height * scale)
          loadedImages++

          // Once all images are loaded, draw text and download
          if (loadedImages === totalImages) {
            // Draw text elements
            textElements.forEach(element => {
              const scaledFontSize = element.fontSize * scale
              ctx.font = `${scaledFontSize}px ${element.fontFamily}`

              // Use maxWidth if set, otherwise use remaining canvas width
              const maxWidth = element.maxWidth ? element.maxWidth * scale : (2000 - (element.x * scale) - 20)
              const wrappedLines = wrapText(ctx, element.text, maxWidth)
              const lineHeight = scaledFontSize * 1.2

              // Clear any previous shadow settings
              ctx.shadowColor = 'transparent'
              ctx.shadowBlur = 0
              ctx.shadowOffsetX = 0
              ctx.shadowOffsetY = 0

              // Draw background if enabled (no shadow on background)
              if (element.hasBackground) {
                ctx.fillStyle = element.backgroundColor
                const bgMaxWidth = Math.max(...wrappedLines.map(line => ctx.measureText(line).width))
                ctx.fillRect(element.x * scale, element.y * scale, bgMaxWidth + 8, wrappedLines.length * lineHeight + 8)
              }

              // Set shadow only for text if enabled
              if (element.hasShadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.5)'
                ctx.shadowBlur = 4 * scale
                ctx.shadowOffsetX = 2 * scale
                ctx.shadowOffsetY = 2 * scale
              }

              // Draw text
              ctx.fillStyle = element.color
              const textAlign = element.textAlign || 'left'
              wrappedLines.forEach((line, i) => {
                let xPos = (element.x * scale) + 4
                const lineWidth = ctx.measureText(line).width
                const containerWidth = element.maxWidth ? element.maxWidth * scale : (2000 - (element.x * scale) - 20)

                if (textAlign === 'center') {
                  xPos = (element.x * scale) + (containerWidth / 2) - (lineWidth / 2)
                } else if (textAlign === 'right') {
                  xPos = (element.x * scale) + containerWidth - lineWidth - 4
                }

                ctx.fillText(line, xPos, (element.y * scale) + scaledFontSize + (i * lineHeight))
              })

              // Clear shadow after drawing text
              ctx.shadowColor = 'transparent'
              ctx.shadowBlur = 0
              ctx.shadowOffsetX = 0
              ctx.shadowOffsetY = 0
            })

            // Draw drawing elements
            drawingElements.forEach(drawing => {
              drawing.strokes.forEach(stroke => {
                ctx.strokeStyle = stroke.color
                ctx.lineWidth = stroke.width * drawing.scale * scale
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                ctx.beginPath()
                const firstPoint = stroke.points[0]
                ctx.moveTo((drawing.x + firstPoint.x * drawing.scale) * scale, (drawing.y + firstPoint.y * drawing.scale) * scale)
                for (let i = 1; i < stroke.points.length; i++) {
                  const point = stroke.points[i]
                  ctx.lineTo((drawing.x + point.x * drawing.scale) * scale, (drawing.y + point.y * drawing.scale) * scale)
                }
                ctx.stroke()
              })
            })

            // Download or send to parent
            canvas.toBlob((blob) => {
              if (blob) {
                if (isEmbedMode && window.parent) {
                  // Send blob to parent window
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    window.parent.postMessage({
                      type: 'IMAGE_CREATED',
                      imageData: reader.result
                    }, '*')
                  }
                  reader.readAsDataURL(blob)
                } else {
                  // Download
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `design-${Date.now()}.png`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              }
            })
          }
        }
        img.src = imageElement.url
      })
    } else {
      // No images, just draw text and drawings
      textElements.forEach(element => {
        const scaledFontSize = element.fontSize * scale
        ctx.font = `${scaledFontSize}px ${element.fontFamily}`
        const maxWidth = element.maxWidth ? element.maxWidth * scale : (2000 - (element.x * scale) - 20)
        const wrappedLines = wrapText(ctx, element.text, maxWidth)
        const lineHeight = scaledFontSize * 1.2

        // Clear any previous shadow settings
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        if (element.hasBackground) {
          ctx.fillStyle = element.backgroundColor
          const bgMaxWidth = Math.max(...wrappedLines.map(line => ctx.measureText(line).width))
          ctx.fillRect(element.x * scale, element.y * scale, bgMaxWidth + 8, wrappedLines.length * lineHeight + 8)
        }

        if (element.hasShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 4 * scale
          ctx.shadowOffsetX = 2 * scale
          ctx.shadowOffsetY = 2 * scale
        }

        ctx.fillStyle = element.color
        const textAlign = element.textAlign || 'left'
        wrappedLines.forEach((line, i) => {
          let xPos = (element.x * scale) + 4
          const lineWidth = ctx.measureText(line).width
          const containerWidth = element.maxWidth ? element.maxWidth * scale : (2000 - (element.x * scale) - 20)

          if (textAlign === 'center') {
            xPos = (element.x * scale) + (containerWidth / 2) - (lineWidth / 2)
          } else if (textAlign === 'right') {
            xPos = (element.x * scale) + containerWidth - lineWidth - 4
          }

          ctx.fillText(line, xPos, (element.y * scale) + scaledFontSize + (i * lineHeight))
        })

        // Clear shadow after drawing text
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      })

      // Draw drawing elements
      drawingElements.forEach(drawing => {
        drawing.strokes.forEach(stroke => {
          ctx.strokeStyle = stroke.color
          ctx.lineWidth = stroke.width * drawing.scale * scale
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          const firstPoint = stroke.points[0]
          ctx.moveTo((drawing.x + firstPoint.x * drawing.scale) * scale, (drawing.y + firstPoint.y * drawing.scale) * scale)
          for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i]
            ctx.lineTo((drawing.x + point.x * drawing.scale) * scale, (drawing.y + point.y * drawing.scale) * scale)
          }
          ctx.stroke()
        })
      })

      canvas.toBlob((blob) => {
        if (blob) {
          if (isEmbedMode && window.parent) {
            // Send blob to parent window
            const reader = new FileReader()
            reader.onloadend = () => {
              window.parent.postMessage({
                type: 'IMAGE_CREATED',
                imageData: reader.result
              }, '*')
            }
            reader.readAsDataURL(blob)
          } else {
            // Download
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `design-${Date.now()}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        }
      })
    }
  }

  const selectedTextElement = textElements.find(el => el.id === selectedElement)
  const selectedImageElement = imageElements.find(el => el.id === selectedElement)

  // Create custom cursor for pencil tool
  const createPencilCursor = () => {
    const size = Math.max(pencilWidth, 8)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size + 4}" height="${size + 4}">
        <circle cx="${(size + 4) / 2}" cy="${(size + 4) / 2}" r="${size / 2}"
                fill="${pencilColor}" stroke="white" stroke-width="1"/>
        <circle cx="${(size + 4) / 2}" cy="${(size + 4) / 2}" r="${size / 2}"
                fill="none" stroke="black" stroke-width="1"/>
      </svg>
    `
    return `url('data:image/svg+xml;base64,${btoa(svg)}') ${(size + 4) / 2} ${(size + 4) / 2}, crosshair`
  }

  return (
    <>
      <style jsx>{`
        .slider {
          height: 1px;
          background: #000;
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          border: 1px solid black;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          border: 1px solid black;
          cursor: pointer;
        }
        .slider::-moz-range-track {
          height: 1px;
        }

        .pencil-slider {
          height: 1px;
          background: #000;
          outline: none;
        }
        .pencil-slider::-webkit-slider-thumb {
          appearance: none;
          width: ${Math.max(pencilWidth, 8)}px;
          height: ${Math.max(pencilWidth, 8)}px;
          border-radius: 50%;
          background: ${pencilColor};
          border: 1px solid black;
          cursor: pointer;
        }
        .pencil-slider::-moz-range-thumb {
          width: ${Math.max(pencilWidth, 8)}px;
          height: ${Math.max(pencilWidth, 8)}px;
          border-radius: 50%;
          background: ${pencilColor};
          border: 1px solid black;
          cursor: pointer;
        }
        .pencil-slider::-moz-range-track {
          height: 1px;
          background: #000;
        }
      `}</style>
      <div className="min-h-screen bg-white p-2 md:p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Canvas */}
          <div
            ref={containerRef}
            className="relative bg-gray-50 border border-gray-300 flex-shrink-0 overflow-hidden touch-none w-full md:w-auto"
            style={{
              height: 'min(calc(100vw - 16px), calc(100vh - 100px))',
              aspectRatio: '1/1',
              backgroundColor: backgroundColor,
              maxWidth: 'calc(100vh - 100px)',
              cursor: drawingMode ? createPencilCursor() : 'default'
            }}
            onPointerDown={drawingMode ? handleDrawingStart : undefined}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerLeave={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {/* Undo/Redo Buttons */}
            <div className="absolute top-2 left-2 flex gap-2 z-50">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="bg-white border border-black rounded px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: fontFamily }}
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="bg-white border border-black rounded px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: fontFamily }}
              >
                Redo
              </button>
            </div>

            {/* Pencil and Text Toggle Buttons */}
            <div className="absolute top-2 right-2 z-50 flex flex-col gap-2">
              <button
                onClick={() => {
                  const newMode = !drawingMode
                  setDrawingMode(newMode)
                  if (!newMode) {
                    setCurrentDrawingGroupId(null)
                    if (currentDrawingGroupId) {
                      setTimeout(saveToHistory, 0)
                    }
                    setSelectedType(null)
                    setSelectedElement(null)
                  }
                }}
                className={`w-10 h-10 rounded-full border border-black flex items-center justify-center ${drawingMode ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                title={drawingMode ? 'Exit Pencil Mode' : 'Enter Pencil Mode'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  <line x1="2" y1="22" x2="4" y2="20" stroke="currentColor" strokeWidth="2"></line>
                </svg>
              </button>

              <button
                onClick={addText}
                className="w-10 h-10 rounded-full border border-black flex items-center justify-center bg-white text-black hover:bg-black hover:text-white"
                title="Add Text"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                  <polyline points="9 20 9 20 15 20 15 20"></polyline>
                </svg>
              </button>

              <label className="w-10 h-10 rounded-full border border-black flex items-center justify-center bg-white text-black hover:bg-black hover:text-white cursor-pointer" title="Add Image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={saveImage}
                className="w-10 h-10 rounded-full border border-black flex items-center justify-center bg-white text-black hover:bg-black hover:text-white"
                title="Download Image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>

            {/* Background Color Button - Bottom Right */}
            <div className="absolute bottom-2 right-2 z-50">
              <label className="w-10 h-10 rounded-full border border-black flex items-center justify-center cursor-pointer" title="Change Background Color" style={{ backgroundColor: backgroundColor }}>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value)
                    // End drawing session
                    setDrawingMode(false)
                    setCurrentDrawingGroupId(null)
                    setSelectedElement(null)
                    setSelectedType(null)
                  }}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
              </label>
            </div>

            {/* Trash Zone - Shows when dragging */}
            {(isDragging || isResizing) && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-40 transition-all duration-200 flex items-center justify-center"
                style={{
                  bottom: '4px',
                  width: isOverTrash ? '60px' : '50px',
                  height: '50px'
                }}
              >
                <svg
                  width={isOverTrash ? "48" : "40"}
                  height={isOverTrash ? "48" : "40"}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-200"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
            )}

            {/* Images */}
            {imageElements.map((imageElement) => (
              <div key={imageElement.id}>
                <img
                  src={imageElement.url}
                  alt="Uploaded"
                  className="absolute touch-none"
                  style={{
                    left: `${imageElement.x}px`,
                    top: `${imageElement.y}px`,
                    width: `${imageElement.width}px`,
                    height: `${imageElement.height}px`,
                    cursor: isDragging && selectedType === 'image' && selectedElement === imageElement.id ? 'grabbing' : 'grab',
                    pointerEvents: drawingMode ? 'none' : 'auto'
                  }}
                  onPointerDown={(e) => handleImageMouseDown(e, imageElement.id)}
                  onClick={(e) => handleImageClick(e, imageElement.id)}
                  onDragStart={(e) => e.preventDefault()}
                  draggable={false}
                />
                {selectedType === 'image' && selectedElement === imageElement.id && (
                  <>
                    <div
                      className="absolute pointer-events-none border border-black"
                      style={{
                        left: `${imageElement.x}px`,
                        top: `${imageElement.y}px`,
                        width: `${imageElement.width}px`,
                        height: `${imageElement.height}px`,
                      }}
                    />
                    {/* Image number indicator */}
                    <div
                      className="absolute pointer-events-none text-white"
                      style={{
                        left: `${imageElement.x + imageElement.width / 2}px`,
                        top: `${imageElement.y + imageElement.height / 2}px`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${FONT_SIZES.base}px`,
                        mixBlendMode: 'difference',
                        fontFamily: fontFamily,
                      }}
                    >
                      {imageElements.findIndex(img => img.id === imageElement.id) + 1}
                    </div>
                    {/* Resize Handles */}
                    {/* Bottom Right */}
                    <div
                      className="absolute cursor-nwse-resize"
                      style={{
                        left: `${imageElement.x + imageElement.width - 10}px`,
                        top: `${imageElement.y + imageElement.height - 10}px`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        border: '1px solid black',
                        pointerEvents: 'auto',
                        zIndex: 9999
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setIsResizing(true)
                        setResizeCorner('br')
                        setSelectedElement(imageElement.id)
                        setSelectedType('image')
                      }}
                    />
                    {/* Top Right */}
                    <div
                      className="absolute cursor-nesw-resize"
                      style={{
                        left: `${imageElement.x + imageElement.width - 10}px`,
                        top: `${imageElement.y - 10}px`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        border: '1px solid black',
                        pointerEvents: 'auto',
                        zIndex: 9999
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setIsResizing(true)
                        setResizeCorner('tr')
                        setSelectedElement(imageElement.id)
                        setSelectedType('image')
                      }}
                    />
                    {/* Bottom Left */}
                    <div
                      className="absolute cursor-nesw-resize"
                      style={{
                        left: `${imageElement.x - 10}px`,
                        top: `${imageElement.y + imageElement.height - 10}px`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        border: '1px solid black',
                        pointerEvents: 'auto',
                        zIndex: 9999
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setIsResizing(true)
                        setResizeCorner('bl')
                        setSelectedElement(imageElement.id)
                        setSelectedType('image')
                      }}
                    />
                    {/* Top Left */}
                    <div
                      className="absolute cursor-nwse-resize"
                      style={{
                        left: `${imageElement.x - 10}px`,
                        top: `${imageElement.y - 10}px`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        border: '1px solid black',
                        pointerEvents: 'auto',
                        zIndex: 9999
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setIsResizing(true)
                        setResizeCorner('tl')
                        setSelectedElement(imageElement.id)
                        setSelectedType('image')
                      }}
                    />
                  </>
                )}
              </div>
            ))}

            {/* Drawing Elements */}
            <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {drawingElements.map((drawing) => {
                // Skip if drawing doesn't have strokes (old format)
                if (!drawing.strokes || drawing.strokes.length === 0) return null

                // Calculate bounding box across all strokes
                const allPoints = drawing.strokes.flatMap(stroke =>
                  stroke.points.map(p => ({ x: drawing.x + p.x * drawing.scale, y: drawing.y + p.y * drawing.scale }))
                )
                const xs = allPoints.map(p => p.x)
                const ys = allPoints.map(p => p.y)
                const minX = Math.min(...xs)
                const maxX = Math.max(...xs)
                const minY = Math.min(...ys)
                const maxY = Math.max(...ys)
                const width = maxX - minX
                const height = maxY - minY

                return (
                  <g key={drawing.id}>
                    {/* Invisible clickable area for easier selection */}
                    <rect
                      x={minX}
                      y={minY}
                      width={width}
                      height={height}
                      fill="transparent"
                      style={{ cursor: drawingMode ? 'default' : 'move', pointerEvents: 'auto' }}
                      onPointerDown={(e) => handleDrawingMouseDown(e as any, drawing.id)}
                      onClick={(e) => handleDrawingClick(e as any, drawing.id)}
                    />
                    {/* Render all strokes in the group */}
                    {drawing.strokes.map((stroke, idx) => (
                      <polyline
                        key={idx}
                        points={stroke.points.map(p => `${drawing.x + p.x * drawing.scale},${drawing.y + p.y * drawing.scale}`).join(' ')}
                        fill="none"
                        stroke={stroke.color}
                        strokeWidth={stroke.width * drawing.scale}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pointerEvents="none"
                      />
                    ))}
                    {/* Selection box and resize handles */}
                    {selectedType === 'drawing' && selectedElement === drawing.id && !drawingMode && (
                      <>
                        <rect
                          x={minX}
                          y={minY}
                          width={width}
                          height={height}
                          fill="none"
                          stroke="black"
                          strokeWidth="1"
                          pointerEvents="none"
                        />
                        {/* Bottom Right Handle */}
                        <rect
                          x={maxX - 10}
                          y={maxY - 10}
                          width="20"
                          height="20"
                          fill="white"
                          stroke="black"
                          strokeWidth="1"
                          style={{ cursor: 'nwse-resize' }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setIsResizing(true)
                            setResizeCorner('br')
                            setSelectedElement(drawing.id)
                            setSelectedType('drawing')
                          }}
                        />
                        {/* Top Right Handle */}
                        <rect
                          x={maxX - 10}
                          y={minY - 10}
                          width="20"
                          height="20"
                          fill="white"
                          stroke="black"
                          strokeWidth="1"
                          style={{ cursor: 'nesw-resize' }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setIsResizing(true)
                            setResizeCorner('tr')
                            setSelectedElement(drawing.id)
                            setSelectedType('drawing')
                          }}
                        />
                        {/* Bottom Left Handle */}
                        <rect
                          x={minX - 10}
                          y={maxY - 10}
                          width="20"
                          height="20"
                          fill="white"
                          stroke="black"
                          strokeWidth="1"
                          style={{ cursor: 'nesw-resize' }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setIsResizing(true)
                            setResizeCorner('bl')
                            setSelectedElement(drawing.id)
                            setSelectedType('drawing')
                          }}
                        />
                        {/* Top Left Handle */}
                        <rect
                          x={minX - 10}
                          y={minY - 10}
                          width="20"
                          height="20"
                          fill="white"
                          stroke="black"
                          strokeWidth="1"
                          style={{ cursor: 'nwse-resize' }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setIsResizing(true)
                            setResizeCorner('tl')
                            setSelectedElement(drawing.id)
                            setSelectedType('drawing')
                          }}
                        />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Current Drawing Path Preview */}
            {isDrawing && currentPath.length > 1 && (
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 9999 }}>
                <polyline
                  points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={pencilColor}
                  strokeWidth={pencilWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* Smart Guides */}
            {showGuides.vertical && (
              <div
                className="absolute w-px bg-white pointer-events-none"
                style={{
                  left: `${showGuides.verticalPos || (containerRef.current ? containerRef.current.getBoundingClientRect().width / 2 : 0)}px`,
                  top: 0,
                  height: '100%',
                  mixBlendMode: 'difference',
                }}
              />
            )}
            {showGuides.horizontal && (
              <div
                className="absolute h-px bg-white pointer-events-none"
                style={{
                  top: `${showGuides.horizontalPos || (containerRef.current ? containerRef.current.getBoundingClientRect().height / 2 : 0)}px`,
                  left: 0,
                  width: '100%',
                  mixBlendMode: 'difference',
                }}
              />
            )}

            {/* Text Elements */}
            {textElements.map((element) => (
              <div key={element.id}>
                {editingElement === element.id ? (
                  <textarea
                    value={element.text}
                    onChange={(e) => {
                      updateElement(element.id, { text: e.target.value })
                      // Auto-resize textarea
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = `${target.scrollHeight}px`
                      target.style.width = 'auto'
                      target.style.width = `${Math.max(target.scrollWidth, 200)}px`
                    }}
                    onBlur={() => {
                      setEditingElement(null)
                      setTimeout(saveToHistory, 0)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingElement(null)
                        setTimeout(saveToHistory, 0)
                      }
                    }}
                    autoFocus
                    className="absolute bg-transparent outline-none border-none resize-none overflow-hidden"
                    style={{
                      caretColor: '#000000',
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      fontSize: `${element.fontSize}px`,
                      color: element.color,
                      fontFamily: element.fontFamily,
                      padding: '4px',
                      textShadow: element.hasShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                      backgroundColor: element.hasBackground ? element.backgroundColor : 'transparent',
                      lineHeight: '1.2',
                      whiteSpace: 'pre',
                      textAlign: element.textAlign || 'left',
                    }}
                    ref={(textarea) => {
                      if (textarea) {
                        textarea.style.height = 'auto'
                        textarea.style.height = `${textarea.scrollHeight}px`
                        textarea.style.width = 'auto'
                        textarea.style.width = `${Math.max(textarea.scrollWidth, 200)}px`
                      }
                    }}
                  />
                ) : (
                  <>
                    <div
                      className="absolute cursor-move select-none touch-none"
                      style={{
                        left: `${element.x}px`,
                        top: `${element.y}px`,
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontFamily: element.fontFamily,
                        padding: '4px',
                        textShadow: element.hasShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                        backgroundColor: element.hasBackground ? element.backgroundColor : 'transparent',
                        lineHeight: '1.2',
                        whiteSpace: 'pre-wrap',
                        textAlign: element.textAlign || 'left',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                      }}
                      onPointerDown={(e) => handleTextMouseDown(e, element.id)}
                      onClick={(e) => handleTextClick(e, element.id)}
                      onDoubleClick={() => setEditingElement(element.id)}
                    >
                      {element.text}
                    </div>
                    {selectedElement === element.id && selectedType === 'text' && containerRef.current && textMeasureCanvas.current && (() => {
                      const ctx = textMeasureCanvas.current!.getContext('2d')!
                      ctx.font = `${element.fontSize}px ${element.fontFamily}`

                      // Split text by line breaks and measure each line
                      const lines = element.text.split('\n')
                      const lineHeight = element.fontSize * 1.2
                      const lineWidths = lines.map(line => ctx.measureText(line || ' ').width)
                      const maxWidth = Math.max(...lineWidths, 10)

                      const boundingBoxWidth = maxWidth + 8
                      // Account for: first line (fontSize) + remaining lines (lineHeight each) + padding
                      const boundingBoxHeight = element.fontSize + ((lines.length - 1) * lineHeight) + 12

                      return (
                        <>
                          <div
                            className="absolute pointer-events-none border border-black"
                            style={{
                              left: `${element.x}px`,
                              top: `${element.y}px`,
                              width: `${boundingBoxWidth}px`,
                              height: `${boundingBoxHeight}px`,
                            }}
                          />
                        </>
                      )
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="w-full md:w-64 flex flex-col" style={{ height: 'min(calc(100vw - 16px), calc(100vh - 100px))' }}>
            <div className="space-y-4 flex-grow overflow-y-auto">

            {/* Text Element Controls - show when text is selected or being edited */}
            {((selectedTextElement && selectedType === 'text') || (editingElement && textElements.find(el => el.id === editingElement))) && (() => {
              const element = selectedTextElement || textElements.find(el => el.id === editingElement)
              if (!element) return null
              return (
              <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Text Size</div>
                {/* Font Size Slider */}
                <div>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={element.fontSize}
                    onChange={(e) => handleTextResize(element.id, parseInt(e.target.value))}
                    onMouseUp={() => setTimeout(saveToHistory, 0)}
                    onTouchEnd={() => setTimeout(saveToHistory, 0)}
                    className="w-full appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Text Color */}
                <div className="flex items-center justify-between">
                  <div className="text-black text-sm" style={{ fontFamily: fontFamily }}>Text Color</div>
                  <label className="cursor-pointer relative">
                    <input
                      type="color"
                      value={element.color}
                      onChange={(e) => updateElement(element.id, { color: e.target.value })}
                      onBlur={() => setTimeout(saveToHistory, 0)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-6 h-6 rounded-full border border-black" style={{ backgroundColor: element.color }}></div>
                  </label>
                </div>

                {/* Text Alignment */}
                <div>
                  <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Text Align</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateElement(element.id, { textAlign: 'left' })
                        setTimeout(saveToHistory, 0)
                      }}
                      className={`flex-1 p-2 rounded border border-black text-sm ${
                        element.textAlign === 'left' ? 'bg-gray-300 text-black' : 'text-black hover:bg-black hover:text-white'
                      }`}
                      style={{ fontFamily: fontFamily }}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => {
                        updateElement(element.id, { textAlign: 'center' })
                        setTimeout(saveToHistory, 0)
                      }}
                      className={`flex-1 p-2 rounded border border-black text-sm ${
                        element.textAlign === 'center' ? 'bg-gray-300 text-black' : 'text-black hover:bg-black hover:text-white'
                      }`}
                      style={{ fontFamily: fontFamily }}
                    >
                      Center
                    </button>
                    <button
                      onClick={() => {
                        updateElement(element.id, { textAlign: 'right' })
                        setTimeout(saveToHistory, 0)
                      }}
                      className={`flex-1 p-2 rounded border border-black text-sm ${
                        element.textAlign === 'right' ? 'bg-gray-300 text-black' : 'text-black hover:bg-black hover:text-white'
                      }`}
                      style={{ fontFamily: fontFamily }}
                    >
                      Right
                    </button>
                  </div>
                </div>

                {/* Effects */}
                <div>
                  <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Effects</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateElement(element.id, { hasShadow: !element.hasShadow })
                        setTimeout(saveToHistory, 0)
                      }}
                      className={`flex-1 p-2 rounded border border-black text-sm ${
                        element.hasShadow ? 'bg-gray-300 text-black' : 'text-black hover:bg-black hover:text-white'
                      }`}
                      style={{ fontFamily: fontFamily }}
                    >
                      Shadow
                    </button>
                    <button
                      onClick={() => {
                        updateElement(element.id, { hasBackground: !element.hasBackground })
                        setTimeout(saveToHistory, 0)
                      }}
                      className={`flex-1 p-2 rounded border border-black text-sm ${
                        element.hasBackground ? 'bg-gray-300 text-black' : 'text-black hover:bg-black hover:text-white'
                      }`}
                      style={{ fontFamily: fontFamily }}
                    >
                      BG
                    </button>
                  </div>
                </div>

                {/* Background Color (only if background is enabled) */}
                {element.hasBackground && (
                  <div>
                    <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Text BG Color</div>
                    <label className="border border-black rounded-lg cursor-pointer relative p-3 text-center block">
                      <input
                        type="color"
                        value={element.backgroundColor}
                        onChange={(e) => updateElement(element.id, { backgroundColor: e.target.value })}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      />
                      <div className="relative flex items-center justify-center gap-2">
                        <span style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>BG Color</span>
                        <div className="w-6 h-6 rounded-full border border-black" style={{ backgroundColor: element.backgroundColor }}></div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
              )
            })()}

            {/* Image Controls - only show when image is selected */}
            {selectedImageElement && selectedType === 'image' && (
              <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Image Size</div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={containerRef.current ? (selectedImageElement.width / containerRef.current.getBoundingClientRect().width) * 100 : 100}
                  onChange={(e) => handleResize(parseInt(e.target.value))}
                  className="w-full appearance-none cursor-pointer slider"
                />

                {/* Match Size Buttons - show only if there are other images */}
                {imageElements.length > 1 && (
                  <div>
                    <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Match Size (images numbered top to bottom)</div>
                    <div className="flex gap-2">
                      {imageElements
                        .filter(img => img.id !== selectedElement)
                        .map((otherImage) => {
                          const imgIndex = imageElements.findIndex(img => img.id === otherImage.id)
                          return (
                            <button
                              key={otherImage.id}
                              onClick={() => {
                                const newHeight = otherImage.height
                                const newWidth = newHeight * selectedImageElement.aspectRatio
                                updateImageElement(selectedElement!, {
                                  width: newWidth,
                                  height: newHeight,
                                })
                              }}
                              className="flex-1 border border-black text-black px-2 py-1 rounded hover:bg-black hover:text-white text-xs"
                              style={{ fontFamily: fontFamily }}
                            >
                              #{imgIndex + 1}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pencil Tool Panel - show when in drawing mode */}
            {drawingMode && (
              <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                {/* Stroke Width */}
                <div>
                  <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Stroke Width</div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={pencilWidth}
                    onChange={(e) => setPencilWidth(parseInt(e.target.value))}
                    className="w-full appearance-none cursor-pointer pencil-slider"
                  />
                </div>

                {/* Stroke Color */}
                <div className="flex items-center justify-between">
                  <div className="text-black text-sm" style={{ fontFamily: fontFamily }}>Stroke Color</div>
                  <label className="cursor-pointer relative">
                    <input
                      type="color"
                      value={pencilColor}
                      onChange={(e) => setPencilColor(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-6 h-6 rounded-full border border-black" style={{ backgroundColor: pencilColor }}></div>
                  </label>
                </div>
              </div>
            )}

            {/* Drawing Controls - only show when drawing is selected */}
            {selectedType === 'drawing' && selectedElement && !drawingMode && (() => {
              const drawing = drawingElements.find(el => el.id === selectedElement)
              if (!drawing) return null
              return (
                <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                  <div className="text-black text-sm mb-2" style={{ fontFamily: fontFamily }}>Drawing Scale</div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={drawing.scale * 100}
                    onChange={(e) => updateDrawingElement(selectedElement, { scale: parseInt(e.target.value) / 100 })}
                    className="w-full appearance-none cursor-pointer slider"
                  />
                </div>
              )
            })()}

          </div>
        </div>
      </div>
      </div>
      </div>
    </>
  )
}
