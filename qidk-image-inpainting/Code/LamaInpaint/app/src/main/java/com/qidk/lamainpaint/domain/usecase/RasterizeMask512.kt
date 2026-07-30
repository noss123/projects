package com.qidk.lamainpaint.domain.usecase

import android.graphics.Bitmap
import com.qidk.lamainpaint.core.graphics.MaskRasterizer
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Use case to rasterize mask to 512×512 binary format for model input.
 */
class RasterizeMask512 {
    
    /**
     * Rasterize mask bitmap to binary format.
     * 
     * @param mask Mask bitmap (512×512)
     * @return ByteBuffer containing binary mask data for model
     */
    fun execute(mask: Bitmap): ByteBuffer {
        // Convert to binary array
        val binaryArray = MaskRasterizer.toBinaryArray(mask)
        
        // Create ByteBuffer for model input
        val buffer = ByteBuffer.allocateDirect(4 * binaryArray.size)
        buffer.order(ByteOrder.nativeOrder())
        
        val floatBuffer = buffer.asFloatBuffer()
        floatBuffer.put(binaryArray)
        buffer.rewind()
        
        return buffer
    }
    
    /**
     * Check if mask has any pixels.
     * 
     * @param mask Mask bitmap
     * @return true if mask has at least one pixel
     */
    fun hasMaskPixels(mask: Bitmap): Boolean {
        return MaskRasterizer.hasMaskPixels(mask)
    }
}
