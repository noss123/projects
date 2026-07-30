package com.qidk.lamainpaint

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import com.qidk.lamainpaint.ui.editor.Tool

class DrawingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {
    
    interface OnMaskChangedListener {
        fun onMaskChanged(maskBitmap: Bitmap)
    }
    
    interface OnBeforeStrokeListener {
        fun onBeforeStroke(currentMask: Bitmap)
    }

    private var imageBitmap: Bitmap? = null
    private var maskBitmap: Bitmap? = null
    private var currentTool: Tool = Tool.BRUSH
    private var brushSize: Float = 20f
    private var maskVisible: Boolean = true
    private var onMaskChangedListener: OnMaskChangedListener? = null
    private var onBeforeStrokeListener: OnBeforeStrokeListener? = null
    
    private val paint = Paint().apply {
        color = Color.BLACK
        strokeWidth = brushSize
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val canvasPaint = Paint(Paint.DITHER_FLAG)
    private var canvas: Canvas? = null
    private val path = Path()
    
    // Pan and zoom support
    private val matrix = Matrix()
    private val savedMatrix = Matrix()
    private var mode = NONE
    private val startPoint = PointF()
    private val midPoint = PointF()
    private var oldDist = 1f
    private var scaleFactor = 1f
    private var translateX = 0f
    private var translateY = 0f
    
    private val scaleGestureDetector = ScaleGestureDetector(context, ScaleListener())
    
    companion object {
        private const val NONE = 0
        private const val DRAG = 1
        private const val ZOOM = 2
    }

    fun setImage(bmp: Bitmap) {
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels

        val aspectRatio = bmp.height.toFloat() / bmp.width.toFloat()
        val newHeight = (screenWidth * aspectRatio).toInt()

        imageBitmap = Bitmap.createScaledBitmap(bmp, screenWidth, newHeight, true)
        maskBitmap = Bitmap.createBitmap(screenWidth, newHeight, Bitmap.Config.ARGB_8888).apply {
            eraseColor(Color.WHITE) // White background for mask (keep)
        }
        canvas = Canvas(maskBitmap!!)
        requestLayout()
        invalidate()
    }
    
    fun setBrushSize(size: Float) {
        brushSize = size
        paint.strokeWidth = size
    }
    
    fun setTool(tool: Tool) {
        currentTool = tool
        when (tool) {
            Tool.BRUSH -> {
                paint.color = Color.BLACK
                paint.xfermode = null
            }
            Tool.ERASER -> {
                paint.color = Color.WHITE
                paint.xfermode = null
            }
            Tool.HAND, Tool.TRANSFORM -> {
                // Pan/zoom mode - handled in touch events
            }
        }
    }
    
    fun setMaskVisible(visible: Boolean) {
        maskVisible = visible
        invalidate()
    }
    
    fun setOnMaskChangedListener(listener: OnMaskChangedListener?) {
        onMaskChangedListener = listener
    }
    
    fun setOnBeforeStrokeListener(listener: OnBeforeStrokeListener?) {
        onBeforeStrokeListener = listener
    }

    fun getMaskBitmap(): Bitmap? = maskBitmap
    
    fun setMaskBitmap(bitmap: Bitmap) {
        // Ensure the bitmap matches the expected dimensions
        val expectedWidth = imageBitmap?.width ?: bitmap.width
        val expectedHeight = imageBitmap?.height ?: bitmap.height
        
        val restoredBitmap = if (bitmap.width != expectedWidth || bitmap.height != expectedHeight) {
            // Scale bitmap to match expected size
            android.util.Log.w("DrawingView", "Scaling restored mask from ${bitmap.width}x${bitmap.height} to ${expectedWidth}x${expectedHeight}")
            Bitmap.createScaledBitmap(bitmap, expectedWidth, expectedHeight, true)
        } else {
            bitmap.copy(Bitmap.Config.ARGB_8888, true)
        }
        
        maskBitmap = restoredBitmap
        canvas = Canvas(maskBitmap!!)
        invalidate()
    }

    val bitmap: Bitmap? get() = imageBitmap

    fun clearMask() {
        maskBitmap?.eraseColor(Color.WHITE)
        onMaskChangedListener?.onMaskChanged(maskBitmap!!)
        invalidate()
    }
    
    private inner class ScaleListener : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            scaleFactor *= detector.scaleFactor
            scaleFactor = scaleFactor.coerceIn(0.5f, 3.0f)
            invalidate()
            return true
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        canvas.save()
        canvas.translate(translateX, translateY)
        canvas.scale(scaleFactor, scaleFactor)
        
        imageBitmap?.let { bmp ->
            // Draw the original image
            canvas.drawBitmap(bmp, 0f, 0f, null)
            
            // Draw the mask with transparency for preview
            if (maskVisible) {
                maskBitmap?.let { mask ->
                    val maskPaint = Paint().apply {
                        alpha = 128 // Semi-transparent
                    }
                    canvas.drawBitmap(mask, 0f, 0f, maskPaint)
                }
            }
        }
        
        canvas.restore()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (imageBitmap == null) return false
        
        // Handle scale gestures for HAND tool
        if (currentTool == Tool.HAND) {
            scaleGestureDetector.onTouchEvent(event)
        }

        when (event.action and MotionEvent.ACTION_MASK) {
            MotionEvent.ACTION_DOWN -> {
                parent?.requestDisallowInterceptTouchEvent(true)
                
                when (currentTool) {
                    Tool.BRUSH, Tool.ERASER -> {
                        // Notify before stroke starts (for undo/redo)
                        maskBitmap?.let { mask ->
                            onBeforeStrokeListener?.onBeforeStroke(mask)
                        }
                        
                        // Transform screen coordinates to bitmap coordinates
                        val transformedX = (event.x - translateX) / scaleFactor
                        val transformedY = (event.y - translateY) / scaleFactor
                        path.moveTo(transformedX, transformedY)
                    }
                    Tool.HAND -> {
                        savedMatrix.set(matrix)
                        startPoint.set(event.x, event.y)
                        mode = DRAG
                    }
                    Tool.TRANSFORM -> {
                        // Transform mode - not implemented yet
                    }
                }
                return true
            }
            
            MotionEvent.ACTION_POINTER_DOWN -> {
                if (currentTool == Tool.HAND) {
                    oldDist = spacing(event)
                    if (oldDist > 10f) {
                        savedMatrix.set(matrix)
                        midPoint(midPoint, event)
                        mode = ZOOM
                    }
                }
            }
            
            MotionEvent.ACTION_MOVE -> {
                when (currentTool) {
                    Tool.BRUSH, Tool.ERASER -> {
                        val transformedX = (event.x - translateX) / scaleFactor
                        val transformedY = (event.y - translateY) / scaleFactor
                        path.lineTo(transformedX, transformedY)
                        canvas?.drawPath(path, paint)
                        invalidate()
                    }
                    Tool.HAND -> {
                        if (mode == DRAG) {
                            translateX = event.x - startPoint.x
                            translateY = event.y - startPoint.y
                            invalidate()
                        } else if (mode == ZOOM && event.pointerCount >= 2) {
                            val newDist = spacing(event)
                            if (newDist > 10f) {
                                val scale = newDist / oldDist
                                scaleFactor *= scale
                                scaleFactor = scaleFactor.coerceIn(0.5f, 3.0f)
                                invalidate()
                            }
                        }
                    }
                    Tool.TRANSFORM -> {
                        // Not implemented
                    }
                }
            }
            
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                when (currentTool) {
                    Tool.BRUSH, Tool.ERASER -> {
                        canvas?.drawPath(path, paint)
                        path.reset()
                        invalidate()
                        // Notify that mask has changed
                        maskBitmap?.let { onMaskChangedListener?.onMaskChanged(it) }
                    }
                    Tool.HAND -> {
                        mode = NONE
                    }
                    Tool.TRANSFORM -> {
                        // Not implemented
                    }
                }
            }
        }
        return true
    }
    
    private fun spacing(event: MotionEvent): Float {
        if (event.pointerCount < 2) return 0f
        val x = event.getX(0) - event.getX(1)
        val y = event.getY(0) - event.getY(1)
        return kotlin.math.sqrt(x * x + y * y)
    }
    
    private fun midPoint(point: PointF, event: MotionEvent) {
        if (event.pointerCount < 2) return
        val x = event.getX(0) + event.getX(1)
        val y = event.getY(0) + event.getY(1)
        point.set(x / 2f, y / 2f)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = imageBitmap?.width ?: MeasureSpec.getSize(widthMeasureSpec)
        val height = imageBitmap?.height ?: MeasureSpec.getSize(heightMeasureSpec)
        setMeasuredDimension(width, height)
    }
}
