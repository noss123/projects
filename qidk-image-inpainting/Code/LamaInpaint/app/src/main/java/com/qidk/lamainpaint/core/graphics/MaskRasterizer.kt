package com.qidk.lamainpaint.core.graphics

import android.graphics.*
import com.qidk.lamainpaint.domain.model.Constants
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Utilities for rasterizing binary masks with optional feathering.
 */
object MaskRasterizer {
    
    /**
     * Create an empty binary mask (all zeros/white).
     * 
     * @return Empty 512×512 bitmap for mask
     */
    fun createEmptyMask(): Bitmap {
        val size = Constants.WORKSPACE_SIZE
        return Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).apply {
            eraseColor(Color.WHITE)  // White = keep original (0 in binary)
        }
    }
    
    /**
     * Apply a stroke to the mask with feathering.
     * 
     * @param mask Current mask bitmap to modify
     * @param points List of points defining the stroke
     * @param brushSize Brush size in pixels
     * @param feather Feathering amount in pixels
     * @param erasing True if erasing (set to white), false if drawing (set to black)
     */
    fun applyStroke(
        mask: Bitmap,
        points: List<PointF>,
        brushSize: Float,
        feather: Float,
        erasing: Boolean
    ) {
        if (points.isEmpty()) return
        
        val canvas = Canvas(mask)
        val paint = Paint().apply {
            isAntiAlias = true
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            strokeWidth = brushSize
            color = if (erasing) Color.WHITE else Color.BLACK
            
            // Apply feathering if specified
            if (feather > 0) {
                maskFilter = BlurMaskFilter(feather, BlurMaskFilter.Blur.NORMAL)
            }
        }
        
        val path = Path()
        path.moveTo(points.first().x, points.first().y)
        
        for (i in 1 until points.size) {
            path.lineTo(points[i].x, points[i].y)
        }
        
        canvas.drawPath(path, paint)
    }
    
    /**
     * Convert mask bitmap to binary array.
     * Black pixels (drawn mask) = 1.0 (hole to inpaint)
     * White pixels (background) = 0.0 (keep original)
     * 
     * @param mask Mask bitmap (may have anti-aliasing/feathering)
     * @return Binary float array suitable for model input
     */
    fun toBinaryArray(mask: Bitmap): FloatArray {
        val size = Constants.WORKSPACE_SIZE
        val pixels = IntArray(size * size)
        mask.getPixels(pixels, 0, size, 0, 0, size, size)
        
        val binary = FloatArray(size * size)
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8) and 0xFF
            val b = pixel and 0xFF
            
            // Convert to grayscale
            val gray = (0.299f * r + 0.587f * g + 0.114f * b)
            
            // Threshold to binary: black (< 128) = 1.0 (inpaint), white (>= 128) = 0.0 (keep)
            binary[i] = if (gray < 128f) 1.0f else 0.0f
        }
        
        return binary
    }
    
    /**
     * Check if mask has any non-zero pixels.
     * 
     * @param mask Mask bitmap
     * @return true if mask has at least one black pixel
     */
    fun hasMaskPixels(mask: Bitmap): Boolean {
        val size = Constants.WORKSPACE_SIZE
        val pixels = IntArray(size * size)
        mask.getPixels(pixels, 0, size, 0, 0, size, size)
        
        for (pixel in pixels) {
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8) and 0xFF
            val b = pixel and 0xFF
            val gray = (0.299f * r + 0.587f * g + 0.114f * b)
            
            if (gray < 128f) return true  // Found a black pixel
        }
        
        return false
    }
    
    /**
     * Clear mask (set all to white/keep).
     * 
     * @param mask Mask bitmap to clear
     */
    fun clearMask(mask: Bitmap) {
        mask.eraseColor(Color.WHITE)
    }
}
