package com.qidk.lamainpaint.core.graphics

import android.graphics.Bitmap
import kotlin.math.ceil
import kotlin.math.floor

/**
 * Bicubic image resampler for high-quality upscaling.
 */
object BicubicResampler {
    
    /**
     * Resample bitmap using bicubic interpolation.
     * 
     * @param source Source bitmap
     * @param targetWidth Target width in pixels
     * @param targetHeight Target height in pixels
     * @return Resampled bitmap
     */
    fun resample(source: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
        if (source.width == targetWidth && source.height == targetHeight) {
            return source.copy(source.config ?: Bitmap.Config.ARGB_8888, false)
        }
        
        val result = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        
        val scaleX = source.width.toFloat() / targetWidth
        val scaleY = source.height.toFloat() / targetHeight
        
        val pixels = IntArray(source.width * source.height)
        source.getPixels(pixels, 0, source.width, 0, 0, source.width, source.height)
        
        val resultPixels = IntArray(targetWidth * targetHeight)
        
        for (y in 0 until targetHeight) {
            for (x in 0 until targetWidth) {
                val srcX = x * scaleX
                val srcY = y * scaleY
                
                resultPixels[y * targetWidth + x] = bicubicInterpolate(
                    pixels,
                    source.width,
                    source.height,
                    srcX,
                    srcY
                )
            }
        }
        
        result.setPixels(resultPixels, 0, targetWidth, 0, 0, targetWidth, targetHeight)
        return result
    }
    
    private fun bicubicInterpolate(
        pixels: IntArray,
        width: Int,
        height: Int,
        x: Float,
        y: Float
    ): Int {
        val x0 = floor(x).toInt()
        val y0 = floor(y).toInt()
        
        val dx = x - x0
        val dy = y - y0
        
        var r = 0f
        var g = 0f
        var b = 0f
        var a = 0f
        
        // 4x4 bicubic kernel
        for (j in -1..2) {
            for (i in -1..2) {
                val px = (x0 + i).coerceIn(0, width - 1)
                val py = (y0 + j).coerceIn(0, height - 1)
                
                val pixel = pixels[py * width + px]
                val weight = cubicWeight(i - dx) * cubicWeight(j - dy)
                
                a += ((pixel shr 24) and 0xFF) * weight
                r += ((pixel shr 16) and 0xFF) * weight
                g += ((pixel shr 8) and 0xFF) * weight
                b += (pixel and 0xFF) * weight
            }
        }
        
        return (a.toInt().coerceIn(0, 255) shl 24) or
               (r.toInt().coerceIn(0, 255) shl 16) or
               (g.toInt().coerceIn(0, 255) shl 8) or
               b.toInt().coerceIn(0, 255)
    }
    
    private fun cubicWeight(x: Float): Float {
        val ax = kotlin.math.abs(x)
        return when {
            ax <= 1 -> (1.5f * ax - 2.5f) * ax * ax + 1f
            ax < 2 -> ((-0.5f * ax + 2.5f) * ax - 4f) * ax + 2f
            else -> 0f
        }
    }
}
